-- Add editor_id column to projects table
ALTER TABLE projects
ADD COLUMN editor_id UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX idx_projects_editor_id ON projects(editor_id);

-- Add comment to explain the column
COMMENT ON COLUMN projects.editor_id IS 'The ID of the editor assigned to this project'; 