/*
  # Update Geography and Business Model to Support Multiple Selections
  
  ## Summary
  Changes geography and business_model columns from text to jsonb arrays to support multiple selections.
  
  ## Changes
  
  ### investor_details table
  - Convert `geography` from text to jsonb array
  - Convert `business_model` from text to jsonb array
  - Remove CHECK constraint on geography (no longer needed for jsonb)
  - Migrate existing data: convert single text values to arrays
*/

-- Convert geography from text to jsonb array
DO $$
BEGIN
  -- Check if geography column exists and is text type
  IF EXISTS (
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
  
  -- If column doesn't exist, create it as jsonb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'geography'
  ) THEN
    ALTER TABLE investor_details
      ADD COLUMN geography jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Convert business_model from text to jsonb array
DO $$
BEGIN
  -- Check if business_model column exists and is text type
  IF EXISTS (
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
  
  -- If column doesn't exist, create it as jsonb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_details' 
    AND column_name = 'business_model'
  ) THEN
    ALTER TABLE investor_details
      ADD COLUMN business_model jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Update indexes if needed
DROP INDEX IF EXISTS idx_investor_details_geography;
CREATE INDEX IF NOT EXISTS idx_investor_details_geography ON investor_details USING GIN (geography);
CREATE INDEX IF NOT EXISTS idx_investor_details_business_model ON investor_details USING GIN (business_model);













