# Company Status Migration - From Companies Table to Analysis Table

## Overview

Status and recommendation are now stored in the `analysis` table (per investor-company relationship) instead of the `companies` table (global).

---

## Why This Change?

**Before (Incorrect):**
- `companies.status` = Single status for the entire company
- Problem: A company can have different statuses with different investors
- Example: Company X might be "Screened" for Investor A but "Analyzed" for Investor B

**After (Correct):**
- `analysis.status` = Status per investor-company relationship
- Each investor has their own status for each company
- Proper multi-investor support ✓

---

## Changes Made

### ✅ 1. Dashboard.tsx (Investor Dashboard)

**Updated to use analysis table:**

```typescript
// Get status from analysis record
const analysis = company.analysis?.[0];
const status = analysis?.status || 'Submitted';
const recommendation = analysis?.recommendation;

// Filter by analysis status
const analysisStatus = company.analysis?.[0]?.status;

// Display analysis status and recommendation
<span>{status}</span>
<p>{recommendation}</p>
```

**Stats updated:**
```typescript
{ 
  label: "In Review", 
  value: companies.filter(c => {
    const status = c.analysis?.[0]?.status;
    return status === 'Pending' || status === 'Analyzed' || status === 'Screened';
  }).length 
}
```

---

## Database Changes

### Remove Status from Companies Table

**SQL to run:**
```sql
ALTER TABLE companies DROP COLUMN IF EXISTS status;
```

**File:** `REMOVE_COMPANY_STATUS_FIELD.sql`

---

## Components Status

### ✅ Updated Components

1. **Dashboard.tsx** - Investor dashboard
   - Now uses `analysis.status` and `analysis.recommendation`
   - Filters work correctly per investor
   - Stats calculated from analysis records

### ⚠️ Components That Still Reference company.status

These components serve different purposes and may need different handling:

1. **VentureDetail.tsx** - Investor viewing a specific company
   - Uses: Status change buttons, status display
   - **Action Needed:** Update to use analysis.status for current investor

2. **FounderDashboard.tsx** - Founder viewing their company
   - Uses: Display overall status
   - **Action Needed:** Decide if founders see aggregated status or per-investor status

3. **CompanyList.tsx** - Admin/investor list view
   - Uses: Status column in table
   - **Action Needed:** Update to show analysis status or remove column

---

## Data Model

### Before
```
companies table:
┌────────┬─────────┬────────┬──────────────┐
│ id     │ name    │ status │ ...          │
├────────┼─────────┼────────┼──────────────┤
│ comp-1 │ TechCo  │ Screened│ ...         │
└────────┴─────────┴────────┴──────────────┘

Problem: Only one status for all investors!
```

### After
```
companies table:
┌────────┬─────────┬──────────────┐
│ id     │ name    │ ...          │
├────────┼─────────┼──────────────┤
│ comp-1 │ TechCo  │ ...          │
└────────┴─────────┴──────────────┘

analysis table:
┌────────┬────────┬──────────────┬──────────┬────────────────┐
│ id     │ comp_id│ investor_id  │ status   │ recommendation │
├────────┼────────┼──────────────┼──────────┼────────────────┤
│ ana-1  │ comp-1 │ investor-A   │ Screened │ Analyze        │
│ ana-2  │ comp-1 │ investor-B   │ Analyzed │ Invest         │
│ ana-3  │ comp-1 │ investor-C   │ Screened │ Reject         │
└────────┴────────┴──────────────┴──────────┴────────────────┘

✓ Each investor has their own status!
```

---

## Example Scenarios

### Scenario 1: Company Submitted to 3 Investors

**Company:** TechCo  
**Investors:** David Kim, Sarah Chen, Mike Johnson

**Analysis Table:**
```
TechCo + David Kim   → Status: Screened, Recommendation: Analyze
TechCo + Sarah Chen  → Status: Screened, Recommendation: Reject
TechCo + Mike Johnson→ Status: Analyzed, Recommendation: Invest
```

**Dashboard Views:**
- David sees: TechCo (Screened - Analyze) ✓
- Sarah sees: TechCo (Screened - Reject) ✓
- Mike sees: TechCo (Analyzed - Invest) ✓

---

### Scenario 2: Filtering by Status

**Investor Dashboard with "Screened" filter enabled:**

David Kim's view:
```
✓ TechCo (Screened - Analyze)
✓ GameFi (Screened - Reject)
✗ HealthApp (Analyzed) - filtered out
```

Sarah Chen's view (different companies):
```
✓ TechCo (Screened - Reject)
✓ FinTech (Screened - Analyze)
✗ EdTech (Submitted) - filtered out
```

---

## Migration Path

### Phase 1: ✅ Complete
- [x] Update Dashboard.tsx to use analysis.status
- [x] Remove company.status from Company interface
- [x] Update filtering logic
- [x] Update stats calculation
- [x] Create SQL to remove status column

### Phase 2: Pending
- [ ] Update VentureDetail.tsx
- [ ] Update FounderDashboard.tsx  
- [ ] Update CompanyList.tsx
- [ ] Run SQL to remove status column
- [ ] Test all views

### Phase 3: Cleanup
- [ ] Remove any remaining company.status references
- [ ] Update documentation
- [ ] Deploy to production

---

## VentureDetail.tsx Updates Needed

**Current:**
```typescript
company.status === 'Analyzed' // Wrong - uses company status
```

**Should be:**
```typescript
// Get current investor's analysis
const currentInvestorAnalysis = analysis.find(a => a.investor_user_id === currentUser.id);
const status = currentInvestorAnalysis?.status;

status === 'Analyzed' // Correct - uses analysis status
```

---

## FounderDashboard.tsx Considerations

**Option 1: Show Aggregated Status**
```typescript
// Show most advanced status across all investors
const statuses = company.analysis?.map(a => a.status) || [];
const aggregatedStatus = getMostAdvancedStatus(statuses);
```

**Option 2: Show Per-Investor Status**
```typescript
// Show status for each investor
company.analysis?.map(a => (
  <div>
    {a.investor_details.name}: {a.status}
  </div>
))
```

**Recommendation:** Option 2 - Founders should see status per investor

---

## Testing Checklist

### Dashboard (Investor View)
- [x] Status badge shows analysis.status
- [x] Recommendation shows analysis.recommendation
- [x] Filters work with analysis.status
- [x] Stats calculated from analysis records
- [x] "Analyze" button shows for submitted status
- [x] No linting errors

### Database
- [ ] Run SQL to remove companies.status column
- [ ] Verify no errors
- [ ] Check existing data migrated correctly

### Other Components
- [ ] VentureDetail shows correct status
- [ ] FounderDashboard shows per-investor status
- [ ] CompanyList works without company.status

---

## SQL Commands

### Remove Status Column
```sql
ALTER TABLE companies DROP COLUMN IF EXISTS status;
```

### Verify Removal
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'status';
-- Should return 0 rows
```

### Check Analysis Data
```sql
SELECT 
  c.name as company,
  id.name as investor,
  a.status,
  a.recommendation
FROM analysis a
JOIN companies c ON c.id = a.company_id
JOIN investor_details id ON id.user_id = a.investor_user_id
ORDER BY c.name, id.name;
```

---

## Benefits

1. **Correct Data Model**
   - Each investor-company relationship has its own status
   - No more single global status

2. **Better Privacy**
   - Investors can't see other investors' decisions
   - Each investor's workflow is independent

3. **Accurate Filtering**
   - Investor A's "Screened" filter shows their screened companies
   - Investor B's "Screened" filter shows their screened companies
   - No mixing of data

4. **Scalability**
   - Supports unlimited investors per company
   - Each relationship tracked independently

---

## Next Steps

1. **Deploy Dashboard Changes**
   ```bash
   git add src/components/Dashboard.tsx
   git commit -m "Update Dashboard to use analysis table for status"
   git push
   ```

2. **Remove Status Column**
   - Open Supabase SQL Editor
   - Run: `ALTER TABLE companies DROP COLUMN IF EXISTS status;`

3. **Update Remaining Components**
   - VentureDetail.tsx
   - FounderDashboard.tsx
   - CompanyList.tsx

4. **Test Thoroughly**
   - Test as different investors
   - Verify filtering works
   - Check stats are accurate

---

**Implementation Date:** October 10, 2025  
**Status:** Phase 1 Complete, Phase 2 Pending  
**Priority:** High - Core functionality fix





























