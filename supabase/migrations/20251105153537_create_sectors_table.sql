/*
  # Create Sectors Table
  
  ## Summary
  Creates a hierarchical sectors table to store sectors and sub-sectors for industry classification.
  Allows structured selection of industry sectors and sub-sectors for investor and company matching.
  
  ## New Table
  
  ### `sectors`
  Stores sectors (level 1) and sub-sectors (level 2) in a hierarchical structure.
  - `id` (uuid, primary key)
  - `name` (text) - Sector or sub-sector name
  - `parent_id` (uuid, nullable) - NULL for sectors, references parent sector for sub-sectors
  - `level` (integer) - 1 for sectors, 2 for sub-sectors
  - `display_order` (integer) - Order for display
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Seed Data
  Includes 8 main sectors with 69 sub-sectors total:
  1. Technology & Software (11 sub-sectors)
  2. Fintech & Financial Services (10 sub-sectors)
  3. Healthcare & Life Sciences (10 sub-sectors)
  4. Consumer & Commerce (10 sub-sectors)
  5. Climate, Energy & Sustainability (8 sub-sectors)
  6. Transportation, Mobility & Logistics (7 sub-sectors)
  7. Industrial, Manufacturing & Deep Tech (8 sub-sectors)
  8. Education & Work (5 sub-sectors)
*/

-- Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid,
  level integer NOT NULL CHECK (level IN (1, 2)),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sectors_parent_id_fkey'
  ) THEN
    ALTER TABLE sectors
      ADD CONSTRAINT sectors_parent_id_fkey 
      FOREIGN KEY (parent_id) 
      REFERENCES sectors(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sectors_parent_id ON sectors(parent_id);
CREATE INDEX IF NOT EXISTS idx_sectors_level ON sectors(level);
CREATE INDEX IF NOT EXISTS idx_sectors_display_order ON sectors(display_order);

-- Enable RLS (all authenticated users can read)
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate
DROP POLICY IF EXISTS "Anyone can read sectors" ON sectors;
CREATE POLICY "Anyone can read sectors"
  ON sectors FOR SELECT
  TO authenticated
  USING (true);

-- Insert sectors (level 1)
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Technology & Software', NULL, 1, 1),
  ('00000000-0000-0000-0000-000000000002', 'Fintech & Financial Services', NULL, 1, 2),
  ('00000000-0000-0000-0000-000000000003', 'Healthcare & Life Sciences', NULL, 1, 3),
  ('00000000-0000-0000-0000-000000000004', 'Consumer & Commerce', NULL, 1, 4),
  ('00000000-0000-0000-0000-000000000005', 'Climate, Energy & Sustainability', NULL, 1, 5),
  ('00000000-0000-0000-0000-000000000006', 'Transportation, Mobility & Logistics', NULL, 1, 6),
  ('00000000-0000-0000-0000-000000000007', 'Industrial, Manufacturing & Deep Tech', NULL, 1, 7),
  ('00000000-0000-0000-0000-000000000008', 'Education & Work', NULL, 1, 8)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Technology & Software
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Artificial Intelligence / Machine Learning', '00000000-0000-0000-0000-000000000001', 2, 1),
  ('10000000-0000-0000-0000-000000000002', 'Generative AI', '00000000-0000-0000-0000-000000000001', 2, 2),
  ('10000000-0000-0000-0000-000000000003', 'Developer Tools / DevOps', '00000000-0000-0000-0000-000000000001', 2, 3),
  ('10000000-0000-0000-0000-000000000004', 'Cybersecurity', '00000000-0000-0000-0000-000000000001', 2, 4),
  ('10000000-0000-0000-0000-000000000005', 'SaaS (Horizontal)', '00000000-0000-0000-0000-000000000001', 2, 5),
  ('10000000-0000-0000-0000-000000000006', 'SaaS (Vertical / Industry-Specific)', '00000000-0000-0000-0000-000000000001', 2, 6),
  ('10000000-0000-0000-0000-000000000007', 'Data Infrastructure / Data Analytics', '00000000-0000-0000-0000-000000000001', 2, 7),
  ('10000000-0000-0000-0000-000000000008', 'Cloud Computing & Infrastructure', '00000000-0000-0000-0000-000000000001', 2, 8),
  ('10000000-0000-0000-0000-000000000009', 'Productivity & Collaboration Tools', '00000000-0000-0000-0000-000000000001', 2, 9),
  ('10000000-0000-0000-0000-000000000010', 'Enterprise IT / Digital Transformation', '00000000-0000-0000-0000-000000000001', 2, 10),
  ('10000000-0000-0000-0000-000000000011', 'Edge Computing / IoT Platforms', '00000000-0000-0000-0000-000000000001', 2, 11)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Fintech & Financial Services
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Payments & Money Movement', '00000000-0000-0000-0000-000000000002', 2, 1),
  ('20000000-0000-0000-0000-000000000002', 'Banking & Neobanks', '00000000-0000-0000-0000-000000000002', 2, 2),
  ('20000000-0000-0000-0000-000000000003', 'Lending & Credit Platforms', '00000000-0000-0000-0000-000000000002', 2, 3),
  ('20000000-0000-0000-0000-000000000004', 'Personal Finance & Wealth Management', '00000000-0000-0000-0000-000000000002', 2, 4),
  ('20000000-0000-0000-0000-000000000005', 'Institutional / Asset Management Tech', '00000000-0000-0000-0000-000000000002', 2, 5),
  ('20000000-0000-0000-0000-000000000006', 'Accounting / ERP / Financial Operations', '00000000-0000-0000-0000-000000000002', 2, 6),
  ('20000000-0000-0000-0000-000000000007', 'Insurance Tech (InsurTech)', '00000000-0000-0000-0000-000000000002', 2, 7),
  ('20000000-0000-0000-0000-000000000008', 'Web3 / Crypto Finance', '00000000-0000-0000-0000-000000000002', 2, 8),
  ('20000000-0000-0000-0000-000000000009', 'Blockchain Infrastructure', '00000000-0000-0000-0000-000000000002', 2, 9),
  ('20000000-0000-0000-0000-000000000010', 'Capital Markets & Trading Platforms', '00000000-0000-0000-0000-000000000002', 2, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Healthcare & Life Sciences
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Digital Health / Health IT', '00000000-0000-0000-0000-000000000003', 2, 1),
  ('30000000-0000-0000-0000-000000000002', 'Telehealth / Remote Care', '00000000-0000-0000-0000-000000000003', 2, 2),
  ('30000000-0000-0000-0000-000000000003', 'Healthcare Services / Delivery Innovation', '00000000-0000-0000-0000-000000000003', 2, 3),
  ('30000000-0000-0000-0000-000000000004', 'Medical Devices / Diagnostics', '00000000-0000-0000-0000-000000000003', 2, 4),
  ('30000000-0000-0000-0000-000000000005', 'Therapeutics / Drug Development', '00000000-0000-0000-0000-000000000003', 2, 5),
  ('30000000-0000-0000-0000-000000000006', 'Genomics / Precision Medicine', '00000000-0000-0000-0000-000000000003', 2, 6),
  ('30000000-0000-0000-0000-000000000007', 'Biomanufacturing / Bioengineering Tools', '00000000-0000-0000-0000-000000000003', 2, 7),
  ('30000000-0000-0000-0000-000000000008', 'Mental Health & Wellness Platforms', '00000000-0000-0000-0000-000000000003', 2, 8),
  ('30000000-0000-0000-0000-000000000009', 'Health Insurance & Benefits Tech', '00000000-0000-0000-0000-000000000003', 2, 9),
  ('30000000-0000-0000-0000-000000000010', 'Senior Care / Aging Tech', '00000000-0000-0000-0000-000000000003', 2, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Consumer & Commerce
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Consumer Packaged Goods (CPG)', '00000000-0000-0000-0000-000000000004', 2, 1),
  ('40000000-0000-0000-0000-000000000002', 'Food & Beverage (incl. Non-Alcoholic Innovators)', '00000000-0000-0000-0000-000000000004', 2, 2),
  ('40000000-0000-0000-0000-000000000003', 'Beauty & Personal Care', '00000000-0000-0000-0000-000000000004', 2, 3),
  ('40000000-0000-0000-0000-000000000004', 'Apparel & Accessories', '00000000-0000-0000-0000-000000000004', 2, 4),
  ('40000000-0000-0000-0000-000000000005', 'Home & Lifestyle Goods', '00000000-0000-0000-0000-000000000004', 2, 5),
  ('40000000-0000-0000-0000-000000000006', 'Consumer Health & Wellness', '00000000-0000-0000-0000-000000000004', 2, 6),
  ('40000000-0000-0000-0000-000000000007', 'E-Commerce Platforms & Marketplaces', '00000000-0000-0000-0000-000000000004', 2, 7),
  ('40000000-0000-0000-0000-000000000008', 'D2C Brand Innovation', '00000000-0000-0000-0000-000000000004', 2, 8),
  ('40000000-0000-0000-0000-000000000009', 'Creator Economy & Influencer Tools', '00000000-0000-0000-0000-000000000004', 2, 9),
  ('40000000-0000-0000-0000-000000000010', 'Social Apps & Communities', '00000000-0000-0000-0000-000000000004', 2, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Climate, Energy & Sustainability
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('50000000-0000-0000-0000-000000000001', 'Renewable Energy Systems', '00000000-0000-0000-0000-000000000005', 2, 1),
  ('50000000-0000-0000-0000-000000000002', 'Energy Storage & Battery Tech', '00000000-0000-0000-0000-000000000005', 2, 2),
  ('50000000-0000-0000-0000-000000000003', 'Carbon Capture / Industrial Decarbonization', '00000000-0000-0000-0000-000000000005', 2, 3),
  ('50000000-0000-0000-0000-000000000004', 'Circular Economy & Materials Innovation', '00000000-0000-0000-0000-000000000005', 2, 4),
  ('50000000-0000-0000-0000-000000000005', 'Sustainable Food & Agriculture Tech', '00000000-0000-0000-0000-000000000005', 2, 5),
  ('50000000-0000-0000-0000-000000000006', 'Water & Waste Management', '00000000-0000-0000-0000-000000000005', 2, 6),
  ('50000000-0000-0000-0000-000000000007', 'Smart Grid & Energy Efficiency Solutions', '00000000-0000-0000-0000-000000000005', 2, 7),
  ('50000000-0000-0000-0000-000000000008', 'Electric Mobility / Charging Infrastructure', '00000000-0000-0000-0000-000000000005', 2, 8)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Transportation, Mobility & Logistics
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('60000000-0000-0000-0000-000000000001', 'Autonomous Vehicles & Robotics', '00000000-0000-0000-0000-000000000006', 2, 1),
  ('60000000-0000-0000-0000-000000000002', 'Electric Vehicles (EV) & Powertrain', '00000000-0000-0000-0000-000000000006', 2, 2),
  ('60000000-0000-0000-0000-000000000003', 'Delivery / Last-Mile Logistics Platforms', '00000000-0000-0000-0000-000000000006', 2, 3),
  ('60000000-0000-0000-0000-000000000004', 'Fleet Management & Telematics', '00000000-0000-0000-0000-000000000006', 2, 4),
  ('60000000-0000-0000-0000-000000000005', 'Supply Chain Optimization', '00000000-0000-0000-0000-000000000006', 2, 5),
  ('60000000-0000-0000-0000-000000000006', 'Drones / Aerial Systems', '00000000-0000-0000-0000-000000000006', 2, 6),
  ('60000000-0000-0000-0000-000000000007', 'Maritime / Aerospace Tech', '00000000-0000-0000-0000-000000000006', 2, 7)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Industrial, Manufacturing & Deep Tech
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('70000000-0000-0000-0000-000000000001', 'Robotics & Industrial Automation', '00000000-0000-0000-0000-000000000007', 2, 1),
  ('70000000-0000-0000-0000-000000000002', 'Advanced Manufacturing / 3D Printing', '00000000-0000-0000-0000-000000000007', 2, 2),
  ('70000000-0000-0000-0000-000000000003', 'Semiconductor & Microelectronics', '00000000-0000-0000-0000-000000000007', 2, 3),
  ('70000000-0000-0000-0000-000000000004', 'Materials Science / Nanomaterials', '00000000-0000-0000-0000-000000000007', 2, 4),
  ('70000000-0000-0000-0000-000000000005', 'Quantum Computing', '00000000-0000-0000-0000-000000000007', 2, 5),
  ('70000000-0000-0000-0000-000000000006', 'Space Tech', '00000000-0000-0000-0000-000000000007', 2, 6),
  ('70000000-0000-0000-0000-000000000007', 'Defense & National Security Systems', '00000000-0000-0000-0000-000000000007', 2, 7),
  ('70000000-0000-0000-0000-000000000008', 'Sensor Networks / Industrial IoT', '00000000-0000-0000-0000-000000000007', 2, 8)
ON CONFLICT (id) DO NOTHING;

-- Insert sub-sectors for Education & Work
INSERT INTO sectors (id, name, parent_id, level, display_order) VALUES
  ('80000000-0000-0000-0000-000000000001', 'EdTech Platforms & Learning Systems', '00000000-0000-0000-0000-000000000008', 2, 1),
  ('80000000-0000-0000-0000-000000000002', 'Credentials & Workforce Training', '00000000-0000-0000-0000-000000000008', 2, 2),
  ('80000000-0000-0000-0000-000000000003', 'Talent / Recruiting / HR Tech', '00000000-0000-0000-0000-000000000008', 2, 3),
  ('80000000-0000-0000-0000-000000000004', 'Future of Work Productivity Tools', '00000000-0000-0000-0000-000000000008', 2, 4),
  ('80000000-0000-0000-0000-000000000005', 'Creator & Upskilling Marketplaces', '00000000-0000-0000-0000-000000000008', 2, 5)
ON CONFLICT (id) DO NOTHING;

