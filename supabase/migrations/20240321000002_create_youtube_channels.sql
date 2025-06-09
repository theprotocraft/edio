-- Create youtube_channels table
CREATE TABLE youtube_channels (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own channels"
    ON youtube_channels
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channels"
    ON youtube_channels
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels"
    ON youtube_channels
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels"
    ON youtube_channels
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE youtube_channels IS 'Stores YouTube channels associated with users'; 