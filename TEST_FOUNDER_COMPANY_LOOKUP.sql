-- Test Founder Company Lookup for Scout and Jodie
-- Run this in Supabase SQL Editor

-- 1. Find Scout's data
SELECT 
  'Scout' as founder,
  u.id as user_id,
  u.email,
  c.id as company_id,
  c.name as company_name,
  c.user_id as company_user_id
FROM auth.users u
LEFT JOIN companies c ON c.user_id = u.id
WHERE u.id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- 2. Find Jodie's data
SELECT 
  'Jodie' as founder,
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'first_name' as first_name,
  c.id as company_id,
  c.name as company_name,
  c.user_id as company_user_id
FROM auth.users u
LEFT JOIN companies c ON c.user_id = u.id
WHERE u.email ILIKE '%jodie%' OR u.raw_user_meta_data->>'first_name' ILIKE '%jodie%';

-- 3. Check if Desoi company has correct user_id
SELECT 
  id,
  name,
  user_id,
  email,
  date_submitted
FROM companies
WHERE name = 'Desoi';

-- 4. Check analysis entries for Desoi
SELECT 
  a.id,
  a.company_id,
  a.investor_user_id,
  a.status,
  a.history,
  c.name as company_name
FROM analysis a
LEFT JOIN companies c ON c.id = a.company_id
WHERE a.company_id = '643ad8a6-a36c-48c8-8d18-928067c7a489';

-- 5. Check RLS policies on companies table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- 6. Test if RLS is blocking (this uses service role, bypasses RLS)
SELECT 
  id,
  name,
  user_id,
  email
FROM companies
WHERE user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- Expected: Should return Desoi company





















