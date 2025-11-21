/*
  # Add valuation-analysis to Report Types
  
  1. Changes
    - Update analysis_reports_report_type_check constraint to include 'valuation-analysis'
    - This allows the analyze-company function to create valuation analysis reports
  
  2. Allowed Report Types After This Migration
    - summary
    - detailed
    - feedback
    - team-analysis
    - product-analysis
    - market-analysis
    - financial-analysis
    - valuation-analysis (NEW!)
*/

-- Drop the existing constraint
ALTER TABLE analysis_reports DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;

-- Add the updated constraint with 'valuation-analysis'
ALTER TABLE analysis_reports 
  ADD CONSTRAINT analysis_reports_report_type_check 
  CHECK (report_type IN ('summary', 'detailed', 'feedback', 'team-analysis', 'product-analysis', 'market-analysis', 'financial-analysis', 'valuation-analysis'));

-- Add comment for documentation
COMMENT ON COLUMN analysis_reports.report_type IS 'Type of analysis report: summary, detailed, feedback, team-analysis, product-analysis, market-analysis, financial-analysis, valuation-analysis';















