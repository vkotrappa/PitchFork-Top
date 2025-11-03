-- Add history column to analysis table
-- This will track the timeline of analysis actions

ALTER TABLE analysis 
ADD COLUMN IF NOT EXISTS history TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN analysis.history IS 'Newline-separated history of analysis actions with timestamps';

-- Example history format:
-- Oct 11, 2025: Screened - Complete
-- Oct 12, 2025: Analyze-Team - Complete
-- Oct 15, 2025: Status changed to In-Diligence













