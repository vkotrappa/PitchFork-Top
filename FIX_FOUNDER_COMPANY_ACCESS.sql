-- Fix Founder Dashboard - Company Access Issue
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies on companies table
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- 2. Ensure founders can read their own companies
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Founders can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;

-- Create the correct policy
CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Verify the policy was created
SELECT 
  policyname,
  cmd,
  pg_get_expr(qual, 'companies'::regclass) as using_expression
FROM pg_policies 
WHERE tablename = 'companies'
AND policyname = 'Founders can view own companies';

-- Should show: USING (user_id = auth.uid())

-- 4. Test the query as if you were Scout
-- This simulates what the dashboard does
SELECT 
  id,
  name,
  user_id,
  industry,
  description
FROM companies
WHERE user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- Should return Desoi company















