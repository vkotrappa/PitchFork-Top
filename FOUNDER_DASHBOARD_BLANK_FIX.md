# Founder Dashboard Blank Issue - Diagnosis & Fix

## Issue

Both Scout and Jodie (new founder who just completed submission) see a blank dashboard.

## What We Know

- ✅ Scout user exists with correct user_id
- ✅ Desoi company exists with correct user_id
- ✅ Analysis entries exist
- ✅ Jodie just completed the full submission flow
- ❌ Dashboard is still blank for both

## Most Likely Cause

**RLS Policy Issue** - The companies table RLS policy is not allowing founders to read their own companies.

## Immediate Fix

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Check if policy exists
SELECT policyname FROM pg_policies WHERE tablename = 'companies';

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Founders can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Founders can read their companies" ON companies;

-- Create the correct policy
CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Verify
SELECT 
  policyname,
  pg_get_expr(qual, 'companies'::regclass) as using_clause
FROM pg_policies 
WHERE tablename = 'companies'
AND cmd = 'SELECT';
```

## Alternative: Temporarily Disable RLS for Testing

```sql
-- TEMPORARY - for testing only
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Test if dashboard loads now
-- If it does, the issue is definitely RLS

-- Re-enable after testing
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
```

## Check Console Logs

When Jodie logs in, check browser console (F12) for:

```
FounderDashboard: Loading company for user: <jodie-user-id> jodie@email.com
FounderDashboard: Company query result: { 
  found: false,  ← This is the problem!
  error: null,
  companyId: undefined,
  companyName: undefined
}
FounderDashboard: No company found for this user
```

If `found: false` and `error: null`, it means:
- Query executed successfully
- But returned no rows
- RLS is blocking the result

## Why This Happens

### Scenario: Missing or Wrong RLS Policy

**If no SELECT policy exists:**
```sql
-- No policy = No access (RLS enabled but no rules)
-- Result: Query returns empty
```

**If policy uses wrong field:**
```sql
-- Wrong: USING (email = auth.email())  ← auth.email() doesn't exist
-- Wrong: USING (owner_id = auth.uid()) ← wrong field name
-- Correct: USING (user_id = auth.uid()) ← matches our schema
```

## Complete Fix Script

```sql
-- 1. Check current state
SELECT 
  tablename,
  policyname,
  cmd,
  pg_get_expr(qual, tablename::regclass) as policy_definition
FROM pg_policies 
WHERE tablename = 'companies';

-- 2. Drop all existing SELECT policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'companies' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON companies', pol.policyname);
  END LOOP;
END $$;

-- 3. Create the correct policy
CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Verify it works
SELECT 
  id,
  name,
  user_id
FROM companies
WHERE user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- Should return Desoi company
```

## After Running the Fix

1. Refresh browser
2. Login as Scout or Jodie
3. Check console - should see:
   ```
   FounderDashboard: Company query result: { found: true, ... }
   ```
4. Dashboard should display company info and investor submissions

## If Still Blank After RLS Fix

Check these:

### 1. Company user_id is NULL

```sql
-- Check if user_id is set
SELECT id, name, user_id, email FROM companies WHERE name IN ('Desoi', 'Jodie Company');

-- If user_id is NULL, set it
UPDATE companies 
SET user_id = (SELECT id FROM auth.users WHERE email = companies.email)
WHERE user_id IS NULL AND email IS NOT NULL;
```

### 2. Wrong user_id in company

```sql
-- Verify user_id matches
SELECT 
  c.name,
  c.user_id as company_user_id,
  u.id as actual_user_id,
  u.email
FROM companies c
LEFT JOIN auth.users u ON u.email = c.email
WHERE c.name IN ('Desoi', 'Jodie Company');

-- If they don't match, fix it
UPDATE companies c
SET user_id = u.id
FROM auth.users u
WHERE c.email = u.email
AND c.user_id != u.id;
```

## Next Steps

1. ✅ Run the RLS fix SQL
2. ✅ Test dashboard
3. ✅ Check console logs
4. ✅ If still blank, run diagnostic queries
5. ✅ Share console output for further debugging

---

**Priority:** HIGH - Blocking all founders from using dashboard  
**Expected Fix Time:** 2 minutes (just run the SQL)  
**Status:** Awaiting SQL execution


























