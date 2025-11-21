# Fix: Analysis Report Type Constraint Error

## Problem
When clicking the "Analyze-Product" or "Analyze-Financials" buttons, you received this error:
```
Analysis failed: Failed to create report record: new row for relation "analysis_reports" violates check constraint "analysis_reports_report_type_check"
```

## Root Cause
The `analysis_reports` table had a check constraint that only allowed specific report types:
- `summary`, `detailed`, `feedback`
- `team-analysis` ✅
- `market-analysis` ✅
- `financial-analysis` (singular)

But our edge function was trying to create:
- `product-analysis` ❌ (not in the allowed list)
- `financials-analysis` ❌ (plural, but constraint expected singular "financial")

## What Was Fixed

### 1. ✅ Updated Edge Function
**File**: `supabase/functions/analyze-company/index.ts`

Changed the analysis type from `financials` to `financial` to match the database constraint:
- Interface: `'team' | 'product' | 'market' | 'financial'`
- Config key: `financial` (instead of `financials`)
- Now generates: `financial-analysis` (matches database)

### 2. ✅ Updated Frontend
**File**: `src/components/VentureDetail.tsx`

Updated the type definitions and function calls to use `financial` instead of `financials`:
- Type parameter: `'team' | 'product' | 'market' | 'financial'`
- Config key: `financial`
- Function call: `handleAnalysis('financial')`

### 3. ✅ Deployed Edge Function
Successfully deployed the updated `analyze-company` function to Supabase.

### 4. 🔄 Database Constraint Update Needed
You need to run this SQL in your Supabase SQL Editor to add `product-analysis` to the allowed types:

```sql
-- Drop the existing constraint
ALTER TABLE analysis_reports DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;

-- Add the updated constraint with 'product-analysis'
ALTER TABLE analysis_reports 
  ADD CONSTRAINT analysis_reports_report_type_check 
  CHECK (report_type IN ('summary', 'detailed', 'feedback', 'team-analysis', 'product-analysis', 'market-analysis', 'financial-analysis'));

-- Add comment for documentation
COMMENT ON COLUMN analysis_reports.report_type IS 'Type of analysis report: summary, detailed, feedback, team-analysis, product-analysis, market-analysis, financial-analysis';
```

## Final Allowed Report Types

After running the SQL above, these report types will be allowed:
- ✅ `summary`
- ✅ `detailed`
- ✅ `feedback`
- ✅ `team-analysis`
- ✅ `product-analysis` (NEW!)
- ✅ `market-analysis`
- ✅ `financial-analysis`

## How to Complete the Fix

### Step 1: Update Database Constraint
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL above
4. Run the query

### Step 2: Test All Analysis Buttons
After running the SQL, test each button on the Venture Detail screen:
- ✅ **Analyze-Team** → creates `team-analysis` report
- ✅ **Analyze-Product** → creates `product-analysis` report
- ✅ **Analyze-Market** → creates `market-analysis` report
- ✅ **Analyze-Financials** → creates `financial-analysis` report

## Verification

To verify the fix worked, after running the SQL:

```sql
-- Check the constraint
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'analysis_reports'
  AND con.conname = 'analysis_reports_report_type_check';
```

You should see `product-analysis` in the CHECK constraint definition.

## Summary

The issue was a mismatch between:
1. What the edge function tried to create (`product-analysis`, `financials-analysis`)
2. What the database constraint allowed (missing `product-analysis`, expected `financial-analysis`)

The fix:
1. ✅ Changed code to use `financial` (singular) instead of `financials` (plural)
2. ✅ Deployed updated edge function
3. 🔄 Need to add `product-analysis` to database constraint (run the SQL above)

After running the SQL, all four analysis buttons will work correctly!


























