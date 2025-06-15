-- Enable Realtime Messaging for Chat Functionality
-- 
-- Purpose: This SQL script configures Supabase realtime and security policies 
-- to enable live chat messaging between youtubers and editors in project discussions.
--
-- Issue: Chat messages were not appearing in real-time. Users had to refresh 
-- the page to see new messages from other participants.
--
-- Root Cause: 
-- 1. Realtime was not enabled for the messages table
-- 2. Row Level Security (RLS) policies were missing or insufficient
-- 3. Realtime publication didn't include the messages table
--
-- Solution: This script enables realtime replication, sets up proper RLS policies,
-- and ensures users can send/receive messages in real-time for projects they have access to.
--
-- Created: 2025-06-15
-- Author: Claude Code Assistant

-- Enable Row Level Security on messages table
-- This ensures only authorized users can access messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime replication for messages table
-- This allows real-time updates when messages are inserted/updated/deleted
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read messages from their projects" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their projects" ON messages;

-- Policy 1: Allow users to read messages from projects they have access to
-- Users can read messages if they are either:
-- - The project owner (youtuber)
-- - An assigned editor on the project
CREATE POLICY "Users can read messages from their projects" ON messages
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR id IN (
      SELECT project_id FROM project_editors 
      WHERE editor_id = auth.uid()
    )
  )
);

-- Policy 2: Allow users to send messages to projects they have access to
-- Users can insert messages if they are authenticated and have access to the project
-- The sender_id must match the authenticated user's ID for security
CREATE POLICY "Users can send messages to their projects" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR id IN (
      SELECT project_id FROM project_editors 
      WHERE editor_id = auth.uid()
    )
  )
);

-- Verify the setup
-- You can run these queries to confirm everything is configured correctly:

-- Check if realtime is enabled for messages table
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'messages';

-- List all policies on messages table
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'messages';