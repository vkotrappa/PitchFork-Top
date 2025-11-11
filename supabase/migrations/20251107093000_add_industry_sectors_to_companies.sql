-- Add industry_sectors column to companies for founder matching form
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND column_name = 'industry_sectors'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN industry_sectors jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Convert geography to jsonb so we can store arrays
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND column_name = 'geography'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE companies
      ALTER COLUMN geography TYPE jsonb USING
        CASE
          WHEN geography IS NULL OR geography = '' THEN '[]'::jsonb
          WHEN geography::text LIKE '%%[%%' THEN geography::jsonb
          ELSE jsonb_build_array(geography)
        END,
      ALTER COLUMN geography SET DEFAULT '[]'::jsonb;
  ELSE
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS geography jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Ensure investment_round column exists with numeric type
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS investment_round numeric;

-- Ensure terms column exists for investment terms text
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS terms text;

-- Add ownership_leadership jsonb column
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS ownership_leadership jsonb DEFAULT '[]'::jsonb;

-- Add business_model jsonb column
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS business_model jsonb DEFAULT '[]'::jsonb;


