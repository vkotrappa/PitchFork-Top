# Debug Scout Dashboard - Specific Issue

## Data Verified

You've confirmed:
- ✅ Scout user exists: `2b35e5f3-5a45-4563-9820-b768dc4a7a5e`
- ✅ Desoi company exists with user_id: `2b35e5f3-5a45-4563-9820-b768dc4a7a5e`
- ✅ 2 analysis entries exist with company_id: `643ad8a6-a36c-48c8-8d18-928067c7a489`

## Potential Issues

### Issue 1: Company ID Mismatch

**Check:** Does the Desoi company ID match the analysis company_id?

```sql
-- Get Desoi's company ID
SELECT id, name, user_id FROM companies WHERE name = 'Desoi';

-- Should return:
-- id: 643ad8a6-a36c-48c8-8d18-928067c7a489 (to match analysis records)
```

**If IDs don't match:**
```sql
-- Find the correct company
SELECT id, name, user_id 
FROM companies 
WHERE user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- Check analysis for that company
SELECT * FROM analysis WHERE company_id = '<actual-company-id>';
```

---

### Issue 2: RLS Policy Blocking

**Check:** Can Scout read their company?

```sql
-- Test as Scout (run in SQL Editor with Scout's session)
SELECT * FROM companies WHERE user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- Should return Desoi company
```

**Check RLS policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'companies';
```

**Expected policy:**
```sql
CREATE POLICY "Users can view their own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

---

### Issue 3: investor_details Join Failing

**Previous Error:** "Could not find a relationship between analysis and investor_details"

**Fix Applied:** Changed to separate queries instead of join

**New Code:**
1. Fetch analysis records
2. Fetch investor_details separately
3. Merge in JavaScript

This should work even if join fails!

---

## What to Check Now

### Step 1: Check Browser Console

Login as Scout and check console for these logs:

```
FounderDashboard: Loading company for user: 2b35e5f3-5a45-4563-9820-b768dc4a7a5e scout@email.com
FounderDashboard: Company query result: { 
  found: true/false,
  error: ...,
  companyId: '643ad8a6-a36c-48c8-8d18-928067c7a489',
  companyName: 'Desoi',
  userId: '2b35e5f3-5a45-4563-9820-b768dc4a7a5e'
}
```

**If found: false** → Company lookup is failing (RLS or ID mismatch)
**If found: true** → Company loaded, check next step

```
FounderDashboard: Loading investor analyses for company: 643ad8a6-a36c-48c8-8d18-928067c7a489
FounderDashboard: Analysis records: { count: 2, error: null, data: [...] }
FounderDashboard: Loading details for investors: [investor-id-1, investor-id-2]
FounderDashboard: Investor details: { count: 2, error: null, data: [...] }
FounderDashboard: Final analyses with details: [...]
```

---

## SQL Verification Queries

### Query 1: Verify Scout's Company

```sql
SELECT 
  c.id as company_id,
  c.name as company_name,
  c.user_id,
  u.email as user_email
FROM companies c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';
```

**Expected:** Should return Desoi with company_id `643ad8a6-a36c-48c8-8d18-928067c7a489`

---

### Query 2: Verify Analysis Entries

```sql
SELECT 
  a.id,
  a.company_id,
  a.investor_user_id,
  a.status,
  a.recommendation,
  a.history,
  c.name as company_name
FROM analysis a
LEFT JOIN companies c ON c.id = a.company_id
WHERE a.company_id = '643ad8a6-a36c-48c8-8d18-928067c7a489';
```

**Expected:** Should return 2 analysis entries

---

### Query 3: Check Investor Details

```sql
SELECT 
  id.user_id,
  id.name,
  id.email,
  id.firm_name,
  u.email as user_email
FROM investor_details id
LEFT JOIN auth.users u ON u.id = id.user_id
WHERE id.user_id IN (
  SELECT investor_user_id 
  FROM analysis 
  WHERE company_id = '643ad8a6-a36c-48c8-8d18-928067c7a489'
);
```

**Expected:** Should return 2 investor detail records

---

### Query 4: Complete Join Test

```sql
-- This simulates what the dashboard should show
SELECT 
  c.name as company_name,
  a.status,
  a.recommendation,
  a.history,
  id.name as investor_name,
  id.firm_name
FROM companies c
JOIN analysis a ON a.company_id = c.id
LEFT JOIN investor_details id ON id.user_id = a.investor_user_id
WHERE c.user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';
```

**Expected:** Should return 2 rows (one per investor)

---

## Most Likely Issues

### 1. Company ID Mismatch

The Desoi company might have a different ID than `643ad8a6-a36c-48c8-8d18-928067c7a489`.

**Check:**
```sql
-- What company ID does Scout's company have?
SELECT id FROM companies WHERE user_id = '2b35e5f3-5a45-4563-9820-b768dc4a7a5e';

-- What company_id do the analysis entries have?
SELECT DISTINCT company_id FROM analysis WHERE company_id = '643ad8a6-a36c-48c8-8d18-928067c7a489';
```

**If they don't match:**
```sql
-- Update analysis to point to correct company
UPDATE analysis 
SET company_id = '<correct-desoi-company-id>'
WHERE company_id = '643ad8a6-a36c-48c8-8d18-928067c7a489';
```

---

### 2. RLS Policy Blocking Founder

The RLS policy might not allow founders to read their companies.

**Check:**
```sql
-- Check companies RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'companies';
```

**Should have:**
```sql
CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**If missing, add it:**
```sql
CREATE POLICY "Founders can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

---

### 3. Analysis RLS Blocking

Check if Scout can read analysis entries:

```sql
-- Check analysis RLS policies
SELECT * FROM pg_policies WHERE tablename = 'analysis';
```

**Should have:**
```sql
CREATE POLICY "Founders can view analysis for their companies"
  ON analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = analysis.company_id
      AND companies.user_id = auth.uid()
    )
  );
```

---

## Debugging Workflow

1. **Login as Scout**
2. **Open Console (F12)**
3. **Check logs:**
   - Does it find the user? ✓
   - Does it find the company? (check companyId)
   - Does it find analysis records? (check count)
   - Does it find investor details? (check count)

4. **Run SQL queries above**
5. **Compare IDs:**
   - Scout user_id: `2b35e5f3-5a45-4563-9820-b768dc4a7a5e`
   - Desoi company user_id: Should match ✓
   - Desoi company id: Should be `643ad8a6-a36c-48c8-8d18-928067c7a489`
   - Analysis company_id: Should match Desoi company id

6. **Apply fix based on findings**

---

## Quick Test SQL

Run this single query to see everything:

```sql
WITH scout_user AS (
  SELECT '2b35e5f3-5a45-4563-9820-b768dc4a7a5e'::uuid as user_id
)
SELECT 
  'Company' as type,
  c.id,
  c.name,
  c.user_id::text,
  NULL as status
FROM companies c, scout_user
WHERE c.user_id = scout_user.user_id

UNION ALL

SELECT 
  'Analysis' as type,
  a.id,
  c.name as company_name,
  a.investor_user_id::text,
  a.status
FROM analysis a, scout_user
JOIN companies c ON c.id = a.company_id
WHERE c.user_id = scout_user.user_id

UNION ALL

SELECT 
  'Investor' as type,
  id.id,
  id.name,
  id.user_id::text,
  NULL as status
FROM investor_details id
WHERE id.user_id IN (
  SELECT a.investor_user_id 
  FROM analysis a, scout_user
  JOIN companies c ON c.id = a.company_id
  WHERE c.user_id = scout_user.user_id
);
```

This will show:
- Scout's company
- Analysis entries for Scout's company
- Investor details for those analyses

---

**Next Step:** Please share the console log output when Scout logs in, and I can pinpoint the exact issue!














