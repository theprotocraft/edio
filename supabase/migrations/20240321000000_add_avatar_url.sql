-- Add avatar_url column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN users.avatar_url IS 'URL to the user''s avatar image, typically from OAuth providers like Google'; 