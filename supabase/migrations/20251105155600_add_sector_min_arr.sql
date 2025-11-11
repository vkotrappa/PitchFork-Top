/*
  # Add Sector-Specific Minimum ARR Support
  
  ## Summary
  Adds `sector_min_arr` column to `investor_details` table to allow investors to set different minimum ARR requirements for different sectors/sub-sectors.
  
  ## Changes
  
  ### investor_details table
  - sector_min_arr (jsonb) - Array of objects with sector, sub_sector, and min_arr
    Format: [{"sector": "Technology & Software", "sub_sector": "SaaS (Horizontal)", "min_arr": 250000}, ...]
  
  ## Indexes
  - GIN index for efficient JSONB queries
*/

-- Add sector_min_arr column to investor_details table
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS sector_min_arr jsonb DEFAULT '[]'::jsonb;

-- Add GIN index for efficient querying
CREATE INDEX IF NOT EXISTS idx_investor_details_sector_min_arr 
  ON investor_details USING GIN (sector_min_arr);

-- Add comment describing the column structure
COMMENT ON COLUMN investor_details.sector_min_arr IS 
  'Array of objects with sector, sub_sector, and min_arr fields. Example: [{"sector": "Technology & Software", "sub_sector": "SaaS (Horizontal)", "min_arr": 250000}]';





