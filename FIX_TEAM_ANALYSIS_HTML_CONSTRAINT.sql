-- Fix: Add team-analysis-html to analysis_reports constraint
-- Run this in Supabase SQL Editor

-- First, check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'analysis_reports_report_type_check';

-- Drop the existing constraint
ALTER TABLE analysis_reports DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;

-- Add the updated constraint with 'team-analysis-html'
ALTER TABLE analysis_reports
  ADD CONSTRAINT analysis_reports_report_type_check
  CHECK (report_type IN (
    'summary', 
    'detailed', 
    'feedback', 
    'team-analysis', 
    'product-analysis', 
    'market-analysis', 
    'financial-analysis', 
    'scorecard-analysis', 
    'detail-report-analysis', 
    'diligence-questions-analysis', 
    'founder-report-analysis', 
    'team-analysis-html'
  ));

-- Verify the constraint was updated
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'analysis_reports_report_type_check';

-- Test that team-analysis-html is now allowed (this should return no error)
-- SELECT 'team-analysis-html'::text WHERE 'team-analysis-html' IN (
--   'summary', 'detailed', 'feedback', 'team-analysis', 'product-analysis', 
--   'market-analysis', 'financial-analysis', 'scorecard-analysis', 
--   'detail-report-analysis', 'diligence-questions-analysis', 
--   'founder-report-analysis', 'team-analysis-html'
-- );


