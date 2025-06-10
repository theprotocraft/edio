-- Fix final version tracking to use version_number instead of UUID
-- This script changes final_version_id to final_version_number

-- First, drop the existing constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_final_version_id_fkey;

-- Drop the old column if it exists
ALTER TABLE projects DROP COLUMN IF EXISTS final_version_id;

-- Add the new column for version numbers
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_version_number INT;

-- Verify the fix
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.columns c
WHERE c.table_name = 'projects' 
    AND c.column_name = 'final_version_number';