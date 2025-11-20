-- Remove status field from companies table
-- Status is now stored in the analysis table (per investor-company relationship)
-- Run this in Supabase Dashboard → SQL Editor

-- Drop the status column from companies table
ALTER TABLE companies DROP COLUMN IF EXISTS status;

-- Verify it's removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'status';

-- Should return no rows if successfully removed





























