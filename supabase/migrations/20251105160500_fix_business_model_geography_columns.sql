/*
  # Fix Business Model and Geography Columns - Combined Migration
  
  This migration ensures business_model and geography columns exist as jsonb arrays.
  Run this in Supabase Dashboard SQL Editor if the columns are missing or need conversion.
*/

-- Ensure business_model column exists as jsonb
DO $$
BEGIN
  -- If column doesn't exist at all, create it as jsonb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'business_model'
  ) THEN
    ALTER TABLE investor_details
      ADD COLUMN business_model jsonb DEFAULT '[]'::jsonb;
  -- If column exists as text, convert it to jsonb
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'business_model'
    AND data_type = 'text'
  ) THEN
    -- Migrate existing data: convert single values to arrays
    UPDATE investor_details
    SET business_model = CASE
      WHEN business_model IS NULL OR business_model = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(business_model)
    END;
    
    -- Change column type to jsonb
    ALTER TABLE investor_details
      ALTER COLUMN business_model TYPE jsonb USING business_model::jsonb;
    
    -- Set default to empty array
    ALTER TABLE investor_details
      ALTER COLUMN business_model SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Ensure geography column exists as jsonb
DO $$
BEGIN
  -- If column doesn't exist at all, create it as jsonb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'geography'
  ) THEN
    ALTER TABLE investor_details
      ADD COLUMN geography jsonb DEFAULT '[]'::jsonb;
  -- If column exists as text, convert it to jsonb
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'geography'
    AND data_type = 'text'
  ) THEN
    -- Migrate existing data: convert single values to arrays
    UPDATE investor_details
    SET geography = CASE
      WHEN geography IS NULL OR geography = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(geography)
    END;
    
    -- Drop the CHECK constraint if it exists
    ALTER TABLE investor_details
      DROP CONSTRAINT IF EXISTS investor_details_geography_check;
    
    -- Change column type to jsonb
    ALTER TABLE investor_details
      ALTER COLUMN geography TYPE jsonb USING geography::jsonb;
    
    -- Set default to empty array
    ALTER TABLE investor_details
      ALTER COLUMN geography SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create/update indexes
DROP INDEX IF EXISTS idx_investor_details_geography;
CREATE INDEX IF NOT EXISTS idx_investor_details_geography ON investor_details USING GIN (geography);
CREATE INDEX IF NOT EXISTS idx_investor_details_business_model ON investor_details USING GIN (business_model);

-- Verify columns exist and are correct type
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'investor_details' 
  AND column_name IN ('business_model', 'geography')
ORDER BY column_name;

