-- Add publishing_status column to projects table
ALTER TABLE projects
ADD COLUMN publishing_status TEXT DEFAULT 'idle' CHECK (publishing_status IN ('idle', 'publishing', 'completed', 'failed'));

-- Add index for faster status lookups
CREATE INDEX idx_projects_publishing_status ON projects(publishing_status); 