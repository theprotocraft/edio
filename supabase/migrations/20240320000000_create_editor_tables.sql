-- Drop existing tables if they exist
DROP TABLE IF EXISTS project_editors;
DROP TABLE IF EXISTS notifications;

-- Create project_editors table
CREATE TABLE project_editors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    editor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(project_id, editor_id)
);

-- Create index for faster lookups
CREATE INDEX idx_project_editors_editor_id ON project_editors(editor_id);
CREATE INDEX idx_project_editors_project_id ON project_editors(project_id);

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('editor_invite', 'project_invite', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    invitation_status TEXT CHECK (invitation_status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for project_editors
CREATE TRIGGER update_project_editors_updated_at
    BEFORE UPDATE ON project_editors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE project_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own editors" ON project_editors;
DROP POLICY IF EXISTS "Users can add editors" ON project_editors;
DROP POLICY IF EXISTS "Users can update their editors" ON project_editors;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications for others" ON notifications;

-- Project editors policies
CREATE POLICY "Users can view their own editors"
    ON project_editors FOR SELECT
    USING (
        auth.uid() IN (
            SELECT owner_id FROM projects WHERE id = project_editors.project_id
        ) OR auth.uid() = editor_id
    );

CREATE POLICY "Users can add editors"
    ON project_editors FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT owner_id FROM projects WHERE id = project_editors.project_id
        )
    );

CREATE POLICY "Users can update their editors"
    ON project_editors FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT owner_id FROM projects WHERE id = project_editors.project_id
        ) OR auth.uid() = editor_id
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);  -- Allow any authenticated user to insert notifications 