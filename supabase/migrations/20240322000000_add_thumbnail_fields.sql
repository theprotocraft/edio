-- Add thumbnail_name and thumbnail_size columns to projects table
ALTER TABLE projects
ADD COLUMN thumbnail_name TEXT,
ADD COLUMN thumbnail_size BIGINT;

-- Add comments to explain the columns
COMMENT ON COLUMN projects.thumbnail_name IS 'The original filename of the thumbnail';
COMMENT ON COLUMN projects.thumbnail_size IS 'The size of the thumbnail file in bytes'; 