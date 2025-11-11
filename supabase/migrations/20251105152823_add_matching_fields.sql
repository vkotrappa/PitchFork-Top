/*
  # Add Matching Fields to Investor and Company Tables

  ## Summary
  Adds new fields to investor_details and companies tables to enable investor-founder matching based on:
  - Industry sector and sub-sector (multiple selections)
  - Geography
  - Valuation range (investors)
  - Typical check size (investors)
  - Ownership/Leadership (investors)
  - Minimum ARR (investors)
  - Business model (investors)
  - Investment round (companies)
  - Terms (companies)

  ## Changes

  ### investor_details table
  - industry_sectors (jsonb) - Array of sector/sub-sector objects
  - geography (text) - Default 'US', CHECK constraint for values
  - valuation_range (text) - Default '$3M to $30M'
  - typical_check_size (text) - Default '$50K to $500K'
  - ownership_leadership (jsonb) - Array of strings
  - minimum_arr (numeric) - Default 250000
  - business_model (text) - B2B or B2C

  ### companies table
  - industry_sectors (jsonb) - Array of sector/sub-sector objects
  - geography (text) - Default 'US', CHECK constraint for values
  - investment_round (numeric) - Investment round amount in dollars
  - terms (text) - Investment terms description

  ## Indexes
  - GIN indexes for JSONB arrays (efficient querying)
  - Regular indexes for filtering columns
*/

-- Add fields to investor_details table

-- Industry sectors (multiple selections via tree UI)
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS industry_sectors jsonb DEFAULT '[]'::jsonb;

-- Geography
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS geography text DEFAULT 'US';

-- Add CHECK constraint for geography after column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_details_geography_check'
  ) THEN
    ALTER TABLE investor_details
      ADD CONSTRAINT investor_details_geography_check 
      CHECK (geography IN ('US', 'Europe', 'India'));
  END IF;
END $$;

-- Valuation range
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS valuation_range text DEFAULT '$3M to $30M';

-- Typical check size
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS typical_check_size text DEFAULT '$50K to $500K';

-- Ownership/Leadership (multiple selections)
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS ownership_leadership jsonb DEFAULT '[]'::jsonb;

-- Minimum ARR
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS minimum_arr numeric DEFAULT 250000;

-- Business model
ALTER TABLE investor_details
  ADD COLUMN IF NOT EXISTS business_model text DEFAULT '';

-- Add fields to companies table

-- Industry sectors (multiple selections via tree UI)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS industry_sectors jsonb DEFAULT '[]'::jsonb;

-- Geography
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS geography text DEFAULT 'US';

-- Add CHECK constraint for geography after column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_geography_check'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_geography_check 
      CHECK (geography IN ('US', 'Europe', 'India'));
  END IF;
END $$;

-- Investment round amount (numeric)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS investment_round numeric;

-- Investment terms (text description)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS terms text DEFAULT '';

-- Add indexes for investor_details

-- GIN indexes for JSONB arrays (efficient querying)
CREATE INDEX IF NOT EXISTS idx_investor_details_industry_sectors 
  ON investor_details USING GIN (industry_sectors);

CREATE INDEX IF NOT EXISTS idx_investor_details_ownership_leadership 
  ON investor_details USING GIN (ownership_leadership);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS idx_investor_details_geography 
  ON investor_details (geography);

CREATE INDEX IF NOT EXISTS idx_investor_details_minimum_arr 
  ON investor_details (minimum_arr);

-- Add indexes for companies

-- GIN index for JSONB array (efficient querying)
CREATE INDEX IF NOT EXISTS idx_companies_industry_sectors 
  ON companies USING GIN (industry_sectors);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS idx_companies_geography 
  ON companies (geography);

CREATE INDEX IF NOT EXISTS idx_companies_investment_round 
  ON companies (investment_round);





