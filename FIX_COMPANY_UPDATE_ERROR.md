# Fix "Failed to update company information" Error

## Issue

When founder completes the submission flow and clicks "Submit", they get:
```
Failed to update company information
```

## Root Cause

RLS (Row Level Security) policy on the `companies` table is not allowing founders to UPDATE their own companies.

## The Fix

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- 1. Check existing UPDATE policies
SELECT 
  policyname,
  cmd,
  pg_get_expr(qual, 'companies'::regclass) as using_clause,
  pg_get_expr(with_check, 'companies'::regclass) as with_check_clause
FROM pg_policies 
WHERE tablename = 'companies'
AND cmd = 'UPDATE';

-- 2. Drop any existing UPDATE policies
DROP POLICY IF EXISTS "Founders can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;

-- 3. Create correct UPDATE policy
CREATE POLICY "Founders can update own companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Also ensure SELECT policy exists (for reading)
DROP POLICY IF EXISTS "Founders can view own companies" ON companies;

CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Verify both policies exist
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'companies'
AND policyname LIKE '%Founders%'
ORDER BY cmd, policyname;

-- Should show:
-- Founders can view own companies   | SELECT
-- Founders can update own companies | UPDATE
```

## Why This Happens

### RLS Policy Requirements

For founders to complete the submission flow, they need:

1. **SELECT policy** - To read their company
2. **UPDATE policy** - To update their company ← **This is missing!**

**Current state:**
```
✓ SELECT policy exists (maybe)
✗ UPDATE policy missing
```

**Result:** Founder can read but not update → "Failed to update company information"

## Debug Information Added

The FounderSubmission now logs detailed error information. Check browser console (F12):

```
FounderSubmission: Updating company: <company-uuid>
FounderSubmission: Update data: { name: '...', industry: '...', email: '...' }
FounderSubmission: Error updating company: { ... }
FounderSubmission: Error details: {
  code: '42501',  ← Permission denied
  message: 'new row violates row-level security policy',
  details: '...',
  hint: '...'
}
```

**Error code 42501** = Permission denied = RLS blocking the update

## Complete RLS Setup for Companies Table

```sql
-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy 1: Founders can view their own companies
CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Founders can update their own companies
CREATE POLICY "Founders can update own companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Founders can insert their own companies (during registration)
CREATE POLICY "Founders can insert own companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Verify all policies
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY cmd, policyname;
```

## Expected Policies

```
policyname                          | cmd    | permissive
------------------------------------|--------|------------
Founders can insert own companies   | INSERT | PERMISSIVE
Founders can view own companies     | SELECT | PERMISSIVE
Founders can update own companies   | UPDATE | PERMISSIVE
```

## Test After Fix

1. Login as new founder
2. Upload pitch deck
3. Run AI analysis
4. Fill out fields
5. Click "Submit"
6. Should see: "Company information saved successfully!"
7. Should navigate to investor selection

## If Still Failing

Check console for the exact error:

### Error: "new row violates row-level security policy"
- **Cause:** UPDATE policy missing or incorrect
- **Fix:** Run the UPDATE policy SQL above

### Error: "permission denied for table companies"
- **Cause:** RLS enabled but no policies
- **Fix:** Run all 3 policies (SELECT, UPDATE, INSERT)

### Error: "column does not exist"
- **Cause:** Trying to update a column that was removed
- **Fix:** Check which column and remove from update statement

## Quick Test Query

```sql
-- Test if current user can update their company
-- (Run this while logged in as founder in SQL Editor)
UPDATE companies 
SET description = description || ' (test)'
WHERE user_id = auth.uid()
RETURNING id, name;

-- If this works, RLS is configured correctly
-- If this fails, RLS is blocking updates
```

---

**Priority:** CRITICAL - Blocks all new founder registrations  
**Fix Time:** 2 minutes (run the SQL)  
**Status:** Awaiting SQL execution

**Run the SQL above and try the registration flow again!**





























