-- Add score fields to analysis_reports table
-- These fields store extracted scores in format: "Title - Score\ncategory, score\ncategory, score"

ALTER TABLE analysis_reports
  ADD COLUMN IF NOT EXISTS product_score TEXT,
  ADD COLUMN IF NOT EXISTS market_score TEXT,
  ADD COLUMN IF NOT EXISTS team_score TEXT,
  ADD COLUMN IF NOT EXISTS financials_score TEXT;

-- Add comments for documentation
COMMENT ON COLUMN analysis_reports.product_score IS 'Stores Product Analysis scores in format: "Product Analysis - 8.03\nProblem/Solution Fit, 8.5\n..."';
COMMENT ON COLUMN analysis_reports.market_score IS 'Stores Market Analysis scores in format: "Market Analysis - 7.5\nMarket Size, 8.0\n..."';
COMMENT ON COLUMN analysis_reports.team_score IS 'Stores Team Analysis scores in format: "Team Analysis - 8.5\nLeadership, 9.0\n..."';
COMMENT ON COLUMN analysis_reports.financials_score IS 'Stores Financials Analysis scores in format: "Financials Analysis - 7.8\nRevenue Model, 8.0\n..."';












