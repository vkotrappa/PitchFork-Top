/*
  # Create Investor Prompts Table
  
  Run this SQL in your Supabase SQL Editor to create the investor_prompts table.
  
  This allows investors to create custom prompts for the 4 main analysis types:
  - Product-Analysis
  - Market-Analysis
  - Team-Analysis
  - Financial-Analysis
*/

CREATE TABLE IF NOT EXISTS investor_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_name text NOT NULL CHECK (report_name IN ('Product-Analysis', 'Market-Analysis', 'Team-Analysis', 'Financial-Analysis')),
  custom_prompt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT investor_prompts_user_report_unique UNIQUE (user_id, report_name)
);

-- Enable RLS
ALTER TABLE investor_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Investors can view their own prompts
CREATE POLICY "Investors can view own prompts"
  ON investor_prompts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Investors can insert their own prompts
CREATE POLICY "Investors can insert own prompts"
  ON investor_prompts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Investors can update their own prompts
CREATE POLICY "Investors can update own prompts"
  ON investor_prompts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Investors can delete their own prompts
CREATE POLICY "Investors can delete own prompts"
  ON investor_prompts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investor_prompts_user_id ON investor_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_prompts_report_name ON investor_prompts(report_name);
CREATE INDEX IF NOT EXISTS idx_investor_prompts_user_report ON investor_prompts(user_id, report_name);

