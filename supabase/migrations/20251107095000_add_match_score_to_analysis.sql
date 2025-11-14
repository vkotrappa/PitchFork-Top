-- Add match_score column to analysis table for investor/company matching
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'analysis'
      AND column_name = 'match_score'
  ) THEN
    ALTER TABLE analysis
      ADD COLUMN match_score numeric;
  END IF;
END $$;






