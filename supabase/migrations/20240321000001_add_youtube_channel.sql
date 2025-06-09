-- Add youtube_channel_id column to projects table
ALTER TABLE projects ADD COLUMN youtube_channel_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN projects.youtube_channel_id IS 'The YouTube channel ID where the video will be published'; 