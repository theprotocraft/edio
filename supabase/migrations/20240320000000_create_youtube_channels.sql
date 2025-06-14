-- Create youtube_channels table
CREATE TABLE youtube_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_thumbnail TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- Add RLS policies
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own youtube channels"
    ON youtube_channels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own youtube channels"
    ON youtube_channels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own youtube channels"
    ON youtube_channels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube channels"
    ON youtube_channels FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_youtube_channels_updated_at
    BEFORE UPDATE ON youtube_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 