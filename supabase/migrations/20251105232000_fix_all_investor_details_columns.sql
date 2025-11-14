/*
  # Fix All Investor Details Columns - Comprehensive Migration
  
  This migration ensures all required columns exist in investor_details table:
  - industry_sectors (jsonb)
  - geography (jsonb)
  - business_model (jsonb)
  - sector_min_arr (jsonb)
  - valuation_range (text)
  - typical_check_size (text)
  - ownership_leadership (jsonb)
  - minimum_arr (numeric)
  
  Run this in Supabase Dashboard SQL Editor to fix missing columns.
*/

-- Add industry_sectors column if it doesn't exist
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS industry_sectors jsonb DEFAULT '[]'::jsonb;

-- Add geography column (ensure it's jsonb)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'geography'
  ) THEN
    ALTER TABLE investor_details
      ADD COLUMN geography jsonb DEFAULT '[]'::jsonb;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'geography'
    AND data_type = 'text'
  ) THEN
    UPDATE investor_details
    SET geography = CASE
      WHEN geography IS NULL OR geography = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(geography)
    END;
    
    ALTER TABLE investor_details
      DROP CONSTRAINT IF EXISTS investor_details_geography_check;
    
    ALTER TABLE investor_details
      ALTER COLUMN geography TYPE jsonb USING geography::jsonb;
    
    ALTER TABLE investor_details
      ALTER COLUMN geography SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add business_model column (ensure it's jsonb)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'business_model'
  ) THEN
    ALTER TABLE investor_details
      ADD COLUMN business_model jsonb DEFAULT '[]'::jsonb;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'business_model'
    AND data_type = 'text'
  ) THEN
    UPDATE investor_details
    SET business_model = CASE
      WHEN business_model IS NULL OR business_model = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(business_model)
    END;
    
    ALTER TABLE investor_details
      ALTER COLUMN business_model TYPE jsonb USING business_model::jsonb;
    
    ALTER TABLE investor_details
      ALTER COLUMN business_model SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add sector_min_arr column if it doesn't exist
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS sector_min_arr jsonb DEFAULT '[]'::jsonb;

-- Add valuation_range column if it doesn't exist
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS valuation_range text DEFAULT '$3M to $30M';

-- Add typical_check_size column if it doesn't exist
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS typical_check_size text DEFAULT '$50K to $500K';

-- Add ownership_leadership column if it doesn't exist
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS ownership_leadership jsonb DEFAULT '[]'::jsonb;

-- Add minimum_arr column if it doesn't exist
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS minimum_arr numeric DEFAULT 250000;

-- Create/update indexes
CREATE INDEX IF NOT EXISTS idx_investor_details_industry_sectors 
  ON investor_details USING GIN (industry_sectors);
CREATE INDEX IF NOT EXISTS idx_investor_details_geography 
  ON investor_details USING GIN (geography);
CREATE INDEX IF NOT EXISTS idx_investor_details_business_model 
  ON investor_details USING GIN (business_model);
CREATE INDEX IF NOT EXISTS idx_investor_details_sector_min_arr 
  ON investor_details USING GIN (sector_min_arr);
CREATE INDEX IF NOT EXISTS idx_investor_details_ownership_leadership 
  ON investor_details USING GIN (ownership_leadership);
CREATE INDEX IF NOT EXISTS idx_investor_details_minimum_arr 
  ON investor_details (minimum_arr);

-- Verify all columns exist
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'investor_details' 
  AND column_name IN (
    'industry_sectors', 
    'geography', 
    'business_model', 
    'sector_min_arr',
    'valuation_range',
    'typical_check_size',
    'ownership_leadership',
    'minimum_arr'
  )
ORDER BY column_name;








