-- Add valuation_score column to analysis_reports table
-- This field stores extracted scores in format: "Title - Score\ncategory, score\ncategory, score"

ALTER TABLE analysis_reports
  ADD COLUMN IF NOT EXISTS valuation_score TEXT;

-- Add comment for documentation
COMMENT ON COLUMN analysis_reports.valuation_score IS 'Stores Valuation Analysis scores in format: "Valuation Analysis - 8.03\nValuation Reasonableness, 8.5\n..."';












