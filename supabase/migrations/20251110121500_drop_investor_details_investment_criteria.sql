/*
  # Remove investment_criteria_doc from investor_details

  1. Changes
    - Drop the obsolete investment_criteria_doc column from investor_details
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'investor_details'
      AND column_name = 'investment_criteria_doc'
  ) THEN
    ALTER TABLE public.investor_details
      DROP COLUMN investment_criteria_doc;
  END IF;
END $$;

