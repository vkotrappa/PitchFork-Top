-- Add score_card column to analysis_reports table
-- This column stores a summary scorecard showing overall score and sub-category scores
-- Format: "Title - Score\ncategory, score\ncategory, score"

ALTER TABLE analysis_reports
  ADD COLUMN IF NOT EXISTS score_card TEXT;

-- Add comment for documentation
COMMENT ON COLUMN analysis_reports.score_card IS 'Stores summary scorecard data in format: "Title - Score\ncategory, score\ncategory, score" for the specific report type';






