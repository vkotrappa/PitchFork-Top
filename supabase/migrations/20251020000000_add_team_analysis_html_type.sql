-- Add team-analysis-html to analysis_reports table constraint
-- This allows the analyze-company-html function to create HTML-based team analysis reports

-- Drop the existing constraint
ALTER TABLE analysis_reports DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;

-- Add the updated constraint with 'team-analysis-html'
ALTER TABLE analysis_reports
  ADD CONSTRAINT analysis_reports_report_type_check
  CHECK (report_type IN ('summary', 'detailed', 'feedback', 'team-analysis', 'product-analysis', 'market-analysis', 'financial-analysis', 'scorecard-analysis', 'detail-report-analysis', 'diligence-questions-analysis', 'founder-report-analysis', 'team-analysis-html'));

-- Add comment for documentation
COMMENT ON COLUMN analysis_reports.report_type IS 'Type of analysis report: summary, detailed, feedback, team-analysis, product-analysis, market-analysis, financial-analysis, scorecard-analysis, detail-report-analysis, diligence-questions-analysis, founder-report-analysis, team-analysis-html';


