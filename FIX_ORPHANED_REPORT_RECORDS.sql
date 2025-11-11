-- Fix Orphaned Report Records (Files Missing from Storage)
-- Run this in Supabase SQL Editor

-- Step 1: View all team analysis reports with their details
SELECT 
  ar.id,
  ar.company_id,
  c.name as company_name,
  ar.report_type,
  ar.file_name,
  ar.file_path,
  ar.generated_at,
  ar.analysis_id
FROM analysis_reports ar
LEFT JOIN companies c ON c.id = ar.company_id
WHERE ar.report_type = 'team-analysis'
ORDER BY ar.generated_at DESC;

-- Step 2: Check for specific problematic record
SELECT 
  id,
  file_name,
  file_path,
  generated_at
FROM analysis_reports
WHERE file_path LIKE '4819f923-493f-40c9-9d8b-5679662acbdf/%'
ORDER BY generated_at DESC;

-- Step 3: DELETE orphaned records (ONLY IF FILE DOESN'T EXIST IN STORAGE)
-- ⚠️ BEFORE RUNNING THIS: Verify in Supabase Storage Dashboard that the file is truly missing
-- Navigate to: Storage → analysis-output-docs → [company_id folder]

-- Delete specific orphaned record:
/*
DELETE FROM analysis_reports
WHERE id = 'your-report-id-here'
AND file_path = '4819f923-493f-40c9-9d8b-5679662acbdf/neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf';
*/

-- OR delete all orphaned team-analysis reports for this company (use with caution):
/*
DELETE FROM analysis_reports
WHERE company_id = '4819f923-493f-40c9-9d8b-5679662acbdf'
AND report_type = 'team-analysis';
*/

-- Step 4: Verify deletion
SELECT 
  ar.id,
  ar.file_name,
  ar.generated_at
FROM analysis_reports ar
WHERE ar.company_id = '4819f923-493f-40c9-9d8b-5679662acbdf'
AND ar.report_type = 'team-analysis';

-- Step 5: Check if there are other orphaned records across all companies
-- This query helps identify potential systemic issues
SELECT 
  ar.company_id,
  c.name as company_name,
  COUNT(*) as report_count,
  STRING_AGG(ar.file_name, ', ') as file_names
FROM analysis_reports ar
LEFT JOIN companies c ON c.id = ar.company_id
WHERE ar.report_type = 'team-analysis'
GROUP BY ar.company_id, c.name
ORDER BY report_count DESC;

-- Additional Diagnostic: Check analysis records for this company
SELECT 
  a.id as analysis_id,
  a.status,
  a.analyzed_at,
  a.investor_user_id,
  u.email as investor_email,
  COUNT(ar.id) as report_count
FROM analysis a
LEFT JOIN auth.users u ON u.id = a.investor_user_id
LEFT JOIN analysis_reports ar ON ar.analysis_id = a.id
WHERE a.company_id = '4819f923-493f-40c9-9d8b-5679662acbdf'
GROUP BY a.id, a.status, a.analyzed_at, a.investor_user_id, u.email;



















