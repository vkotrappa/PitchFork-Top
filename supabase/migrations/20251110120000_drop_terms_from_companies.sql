/*
  # Remove redundant terms column from companies

  1. Changes
    - Drop the legacy terms column in favor of funding_terms
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'terms'
  ) THEN
    ALTER TABLE public.companies
      DROP COLUMN terms;
  END IF;
END $$;

