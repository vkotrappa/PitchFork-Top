-- Add analysis_id column to analysis_reports table
-- Run this in your Supabase SQL Editor

-- Add analysis_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_reports' AND column_name = 'analysis_id'
  ) THEN
    ALTER TABLE analysis_reports
      ADD COLUMN analysis_id uuid REFERENCES analysis(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS analysis_reports_analysis_id_idx ON analysis_reports(analysis_id);

-- Update the report_type constraint to include 'team-analysis'
ALTER TABLE analysis_reports DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;
ALTER TABLE analysis_reports 
  ADD CONSTRAINT analysis_reports_report_type_check 
  CHECK (report_type IN ('summary', 'detailed', 'feedback', 'team-analysis', 'financial-analysis', 'market-analysis'));

-- Add comment for documentation
COMMENT ON COLUMN analysis_reports.analysis_id IS 'Links report to specific analysis (investor-company pair)';
COMMENT ON COLUMN analysis_reports.company_id IS 'Kept for backward compatibility and easier queries';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'analysis_reports'
ORDER BY ordinal_position;























