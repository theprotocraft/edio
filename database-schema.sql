-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS video_versions CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS project_editors CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('youtuber', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL,
  video_title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'needs_changes', 'approved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_editors mapping table
CREATE TABLE project_editors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, editor_id)
);

-- Create video_versions table
CREATE TABLE video_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_url TEXT NOT NULL,
  preview_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, version_number)
);

-- Create uploads table (for thumbnails, raw videos, etc)
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'thumbnail', 'audio', 'document', 'other')),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create editor invites table
CREATE TABLE editor_invites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  editor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  editor_email  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','declined','revoked')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ
);
CREATE INDEX ON editor_invites (creator_id);
CREATE INDEX ON editor_invites (editor_email);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'system', 'feedback')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'action', 'warning', 'success')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Users can read all users but only edit their own profile
CREATE POLICY "Anyone can read users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Projects - owners can CRUD their own projects
CREATE POLICY "Owners can CRUD their projects" ON projects
  FOR ALL USING (auth.uid() = owner_id);

-- Projects - editors can read projects they are assigned to
CREATE POLICY "Editors can read their assigned projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_editors
      WHERE project_id = projects.id AND editor_id = auth.uid()
    )
  );

-- Project editors mapping - owners can manage
CREATE POLICY "Project owners can manage project editors" ON project_editors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_editors.project_id AND projects.owner_id = auth.uid()
    )
  );

-- Video versions - project members can view
CREATE POLICY "Project members can view video versions" ON video_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = video_versions.project_id AND 
      (
        projects.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_editors
          WHERE project_editors.project_id = video_versions.project_id
          AND project_editors.editor_id = auth.uid()
        )
      )
    )
  );

-- Video versions - uploaders can CRUD their uploads
CREATE POLICY "Uploaders can CRUD their video versions" ON video_versions
  FOR ALL USING (auth.uid() = uploader_id);

-- Uploads - project members can view
CREATE POLICY "Project members can view uploads" ON uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = uploads.project_id AND 
      (
        projects.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_editors
          WHERE project_editors.project_id = uploads.project_id
          AND project_editors.editor_id = auth.uid()
        )
      )
    )
  );

-- Uploads - users can CRUD their own uploads
CREATE POLICY "Users can CRUD their own uploads" ON uploads
  FOR ALL USING (auth.uid() = user_id);

-- Messages - project members can view
CREATE POLICY "Project members can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id AND 
      (
        projects.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_editors
          WHERE project_editors.project_id = messages.project_id
          AND project_editors.editor_id = auth.uid()
        )
      )
    )
  );

-- Messages - users can create messages for projects they belong to
CREATE POLICY "Project members can create messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id AND 
      (
        projects.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_editors
          WHERE project_editors.project_id = messages.project_id
          AND project_editors.editor_id = auth.uid()
        )
      )
    )
  );

-- Notifications - users can only see their own notifications
CREATE POLICY "Users can read their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their notifications as read
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add trigger for projects table
CREATE TRIGGER update_projects_modtime
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE POLICY "Creator manages own invites"
  ON editor_invites FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Editor reads own invites"
  ON editor_invites FOR SELECT USING (
    editor_id = auth.uid()
    OR (editor_id IS NULL AND lower(editor_email) = lower(auth.jwt() ->> 'email'))
);
