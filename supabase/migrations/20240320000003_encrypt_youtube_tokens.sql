-- Update youtube_channels table to handle encrypted tokens
ALTER TABLE youtube_channels
  ALTER COLUMN access_token TYPE TEXT,
  ALTER COLUMN refresh_token TYPE TEXT;

-- Add comment to indicate encrypted columns
COMMENT ON COLUMN youtube_channels.access_token IS 'Encrypted access token';
COMMENT ON COLUMN youtube_channels.refresh_token IS 'Encrypted refresh token'; 