-- Add additional matching columns to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND column_name = 'ownership_leadership'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN ownership_leadership jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND column_name = 'business_model'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN business_model jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;









