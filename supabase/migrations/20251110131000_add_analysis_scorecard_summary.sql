/*
  # Add scorecard_summary column to analysis

  1. Changes
    - Add a JSONB column `scorecard_summary` to store structured scorecard data.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'analysis'
      AND column_name = 'scorecard_summary'
  ) THEN
    ALTER TABLE public.analysis
      ADD COLUMN scorecard_summary jsonb;
  END IF;
END $$;

