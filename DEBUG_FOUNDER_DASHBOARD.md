# Debug Founder Dashboard - Blank Screen Issue

## Issue

Founder (Scout) logged in but dashboard is blank - no company information or investor submissions showing.

## Debug Logging Added

The FounderDashboard now has comprehensive logging. Check the browser console (F12) for these messages:

### Expected Log Output

```
FounderDashboard: Loading company for user: <user-uuid> scout@email.com
FounderDashboard: Company query result: { 
  found: true, 
  error: null,
  companyName: "Scout Company" 
}
FounderDashboard: Company found: Scout Company
FounderDashboard: Loading investor analyses for company: <company-uuid>
FounderDashboard: Investor analyses result: { 
  count: 2, 
  error: null,
  data: [{...}, {...}]
}
```

---

## Common Issues

### Issue 1: No Company Found

**Console shows:**
```
FounderDashboard: Company query result: { found: false, error: null }
FounderDashboard: No company found for this user
```

**Cause:** The company record doesn't have the correct `user_id`

**Solution:**

Check the database:
```sql
-- Find Scout's user ID
SELECT id, email FROM auth.users WHERE email ILIKE '%scout%';

-- Check if company exists with that user_id
SELECT * FROM companies WHERE user_id = '<scout-user-id>';

-- If not found, check by email (old method)
SELECT * FROM companies WHERE email = '<scout-email>';
```

**Fix if needed:**
```sql
-- Update company to have correct user_id
UPDATE companies 
SET user_id = '<scout-user-id>'
WHERE email = '<scout-email>' OR name = 'Scout Company';
```

---

### Issue 2: Query Changed from Email to user_id

**What Changed:**

**Before:**
```typescript
.eq('email', currentUser.email)  // Looked up by email
```

**After:**
```typescript
.eq('user_id', currentUser.id)  // Looks up by user_id
```

**Why:** More reliable - email can change, user_id is permanent

**Impact:** If the company record doesn't have `user_id` set, it won't be found

---

### Issue 3: No Investor Analyses

**Console shows:**
```
FounderDashboard: Company found: Scout Company
FounderDashboard: Investor analyses result: { count: 0, error: null }
```

**Cause:** No entries in analysis table for this company

**Solution:**

Check the database:
```sql
-- Check analysis entries for Scout's company
SELECT 
  a.*,
  id.name as investor_name
FROM analysis a
LEFT JOIN investor_details id ON id.user_id = a.investor_user_id
WHERE a.company_id = '<scout-company-id>';
```

**If no results:**
- Scout needs to submit to investors first
- Or analysis entries were deleted
- Or company_id in analysis doesn't match

---

### Issue 4: RLS Policy Blocking

**Console shows:**
```
FounderDashboard: Company query result: { found: false, error: {...} }
```

**Cause:** Row Level Security policy preventing founder from seeing their company

**Solution:**

Check RLS policies:
```sql
-- Check companies table policies
SELECT * FROM pg_policies WHERE tablename = 'companies';

-- Check if policy allows user_id lookup
-- Should have a policy like:
-- USING (user_id = auth.uid())
```

---

## Quick Fix SQL

### Fix 1: Set user_id on Scout's Company

```sql
-- Find Scout's user ID
SELECT id, email, raw_user_meta_data->>'first_name' as first_name
FROM auth.users 
WHERE email ILIKE '%scout%' 
   OR raw_user_meta_data->>'first_name' ILIKE '%scout%';

-- Update company with correct user_id
UPDATE companies 
SET user_id = '<scout-user-id>'
WHERE name ILIKE '%scout%' 
   OR email = '<scout-email>';

-- Verify
SELECT id, name, user_id, email FROM companies WHERE user_id = '<scout-user-id>';
```

### Fix 2: Check Analysis Entries

```sql
-- Find Scout's company
SELECT id, name FROM companies WHERE user_id = '<scout-user-id>';

-- Check analysis entries
SELECT 
  a.id,
  a.company_id,
  a.investor_user_id,
  a.status,
  a.recommendation,
  a.history,
  id.name as investor_name
FROM analysis a
LEFT JOIN investor_details id ON id.user_id = a.investor_user_id
WHERE a.company_id = '<scout-company-id>';
```

---

## Testing Steps

### Step 1: Check Console Logs

1. Login as Scout
2. Open browser console (F12)
3. Look for log messages starting with "FounderDashboard:"
4. Share the output

### Step 2: Check Database

Run these queries in Supabase SQL Editor:

```sql
-- 1. Find Scout's user ID
SELECT id, email FROM auth.users WHERE email ILIKE '%scout%';

-- 2. Find Scout's company (replace <user-id>)
SELECT * FROM companies WHERE user_id = '<scout-user-id>';

-- 3. Check analysis entries (replace <company-id>)
SELECT * FROM analysis WHERE company_id = '<scout-company-id>';
```

### Step 3: Verify Data Exists

Expected results:
- Query 1: Returns Scout's user ID ✓
- Query 2: Returns Scout's company ✓
- Query 3: Returns 2 analysis entries ✓

---

## Most Likely Issue

The company record probably doesn't have `user_id` set. The old code used `email` to look up companies, but the new code uses `user_id`.

**Quick Fix:**

```sql
-- Update Scout's company with user_id
UPDATE companies 
SET user_id = (
  SELECT id FROM auth.users WHERE email = companies.email
)
WHERE user_id IS NULL AND email IS NOT NULL;
```

This will set `user_id` for all companies that are missing it.

---

## Alternative: Fallback to Email Lookup

If you prefer to keep email-based lookup as fallback:

```typescript
// Try user_id first, fallback to email
let companyData = await supabase
  .from('companies')
  .select('*')
  .eq('user_id', currentUser.id)
  .maybeSingle();

if (!companyData.data) {
  // Fallback to email
  companyData = await supabase
    .from('companies')
    .select('*')
    .eq('email', currentUser.email)
    .maybeSingle();
}
```

---

## Next Steps

1. **Check console logs** - See what the logs say
2. **Run SQL queries** - Verify data exists
3. **Apply fix** - Update user_id or add fallback
4. **Test again** - Dashboard should load

**Please share the console log output and I can provide the exact fix!**

---

**Status:** Awaiting console logs to diagnose exact issue




























