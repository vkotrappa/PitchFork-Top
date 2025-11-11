-- Add RLS Policies for analysis-output-docs Storage Bucket
-- Run this in Supabase SQL Editor

-- ===================================================================
-- OPTION 1: Allow All Authenticated Users (Simple, Recommended)
-- ===================================================================
-- This allows any authenticated user to access files in the bucket
-- They still need to know the exact file path (can't browse)

-- Policy for SELECT (allows creating signed URLs and downloads)
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES (
  'analysis-output-docs',
  'Allow authenticated users to access analysis reports',
  'SELECT',
  '(bucket_id = ''analysis-output-docs''::text) AND (auth.role() = ''authenticated''::text)'::text
);

-- Optional: Policy for listing files (allows .list() operations)
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES (
  'analysis-output-docs',
  'Allow authenticated users to list analysis reports',
  'SELECT',
  '(bucket_id = ''analysis-output-docs''::text) AND (auth.role() = ''authenticated''::text)'::text
);

-- ===================================================================
-- OPTION 2: Restrict to Investors Who Own the Analysis (More Secure)
-- ===================================================================
-- This allows investors to only access reports for companies they've analyzed

-- First, enable RLS on the bucket if not already enabled
-- (This might already be done, but it's safe to run again)
UPDATE storage.buckets
SET public = false,
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'analysis-output-docs';

-- Policy for SELECT (allows creating signed URLs and downloads)
-- Only for files where the folder name matches a company_id the user has analyzed
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES (
  'analysis-output-docs',
  'Allow investors to access their own analysis reports',
  'SELECT',
  E'(bucket_id = ''analysis-output-docs''::text) AND (
    EXISTS (
      SELECT 1 
      FROM analysis 
      WHERE analysis.investor_user_id = auth.uid()
      AND (storage.foldername(name))[1] = analysis.company_id::text
    )
  )'::text
);

-- ===================================================================
-- TROUBLESHOOTING: Check Existing Policies
-- ===================================================================
-- Run this to see what policies already exist
SELECT 
  bucket_id,
  name,
  definition,
  check_expression
FROM storage.policies
WHERE bucket_id = 'analysis-output-docs';

-- ===================================================================
-- CLEANUP: Remove Old/Conflicting Policies (if needed)
-- ===================================================================
-- If you need to start fresh, uncomment and run this:
/*
DELETE FROM storage.policies
WHERE bucket_id = 'analysis-output-docs';
*/

-- ===================================================================
-- VERIFICATION: Test the Policy
-- ===================================================================
-- After adding the policy, test by running this as an authenticated user:
-- (Replace the path with an actual file path from your bucket)
/*
SELECT storage.get_signed_url(
  'analysis-output-docs',
  '08d8f876-00e2-4366-ae34-48ffd9edabf8/neuralert_team-analysis_2025-10-11T14-56-23.pdf',
  60
);
*/

-- ===================================================================
-- QUICK FIX: If Policies Don't Work
-- ===================================================================
-- As a temporary workaround, you can make the bucket "public"
-- (NOT recommended for production, but useful for testing)
/*
UPDATE storage.buckets
SET public = true
WHERE id = 'analysis-output-docs';
*/



















