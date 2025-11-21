# Clean Report Names Fix - COMPLETE ✅

## Issues Fixed

### 1. **Filename Issue**
**Before**: `digitalapi-corp_scorecard-analysis_2025-10-18T09-15-23.pdf`
**After**: `digitalapi-corp_scorecard_2025-10-18T09-15-23.pdf`
❌ Removed redundant "-analysis" suffix

### 2. **Display Name Issue**
**Before**: "Detail Report Analysis" (from report_type: 'detail-report-analysis')
**After**: "Detail-Report" (from report_type: 'detail-report')
❌ Removed redundant "Analysis" word

## What Was Changed

### **Edge Function** (`supabase/functions/analyze-company/index.ts`)

**File Name Generation Logic:**
```typescript
// Generate filename - use cleaner names for certain types
let fileNameType = analysisType;
if (analysisType === 'scorecard') {
  fileNameType = 'scorecard';  // Clean!
} else if (analysisType === 'detail-report') {
  fileNameType = 'detail-report';  // Clean!
} else if (analysisType === 'diligence-questions') {
  fileNameType = 'diligence-questions';  // Clean!
} else if (analysisType === 'founder-report') {
  fileNameType = 'founder-report';  // Clean!
} else {
  fileNameType = `${analysisType}-analysis`;  // Legacy format for team/product/market/financial
}

const reportFileName = `${companySlug}_${fileNameType}_${timestamp}.pdf`;
```

**Database report_type:**
```typescript
report_type: reportType  // Uses same clean name as filename
```

### **Results**

| Analysis Type | Old Filename | New Filename |
|---------------|-------------|--------------|
| **scorecard** | `company_scorecard-analysis_date.pdf` | `company_scorecard_date.pdf` ✅ |
| **detail-report** | `company_detail-report-analysis_date.pdf` | `company_detail-report_date.pdf` ✅ |
| **diligence-questions** | `company_diligence-questions-analysis_date.pdf` | `company_diligence-questions_date.pdf` ✅ |
| **founder-report** | `company_founder-report-analysis_date.pdf` | `company_founder-report_date.pdf` ✅ |
| team | `company_team-analysis_date.pdf` | `company_team-analysis_date.pdf` (unchanged) |
| product | `company_product-analysis_date.pdf` | `company_product-analysis_date.pdf` (unchanged) |
| market | `company_market-analysis_date.pdf` | `company_market-analysis_date.pdf` (unchanged) |
| financial | `company_financial-analysis_date.pdf` | `company_financial-analysis_date.pdf` (unchanged) |

| Report Type | Old DB Value | New DB Value | Display Name |
|-------------|-------------|--------------|--------------|
| **scorecard** | `scorecard-analysis` | `scorecard` ✅ | "Scorecard" |
| **detail-report** | `detail-report-analysis` | `detail-report` ✅ | "Detail-Report" |
| **diligence-questions** | `diligence-questions-analysis` | `diligence-questions` ✅ | "Diligence-Questions" |
| **founder-report** | `founder-report-analysis` | `founder-report` ✅ | "Founder-Report" |

## Database Update Required

**Run this SQL in Supabase SQL Editor:**

```sql
-- Update constraint to allow cleaner report type names
ALTER TABLE analysis_reports DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;

ALTER TABLE analysis_reports
  ADD CONSTRAINT analysis_reports_report_type_check
  CHECK (report_type IN (
    'summary', 'detailed', 'feedback',
    'team-analysis', 'product-analysis', 'market-analysis', 'financial-analysis',
    'scorecard', 'detail-report', 'diligence-questions', 'founder-report'
  ));
```

## Why Some Keep "-analysis"

The four original analysis types (team, product, market, financial) keep the "-analysis" suffix for:
- ✅ Backward compatibility with existing reports
- ✅ Clear distinction (these analyze raw docs, not synthesize reports)
- ✅ Consistency with existing naming convention

The four new "Create" types use clean names because:
- ✅ They create new report types (not direct analysis)
- ✅ Cleaner, more professional naming
- ✅ No redundancy (scorecard is already a scorecard, not a "scorecard analysis")

## Testing

After running the SQL:

1. Click **"Create Score Card"**
   - ✅ File: `company_scorecard_date.pdf`
   - ✅ Display: "Scorecard"

2. Click **"Create Detail Report"**
   - ✅ File: `company_detail-report_date.pdf`
   - ✅ Display: "Detail-Report"

3. Click **"Create Diligence Questions"**
   - ✅ File: `company_diligence-questions_date.pdf`
   - ✅ Display: "Diligence-Questions"

4. Click **"Create Founder Report"**
   - ✅ File: `company_founder-report_date.pdf`
   - ✅ Display: "Founder-Report"

## Summary

✅ Edge function updated with cleaner naming logic
✅ Filenames no longer have redundant "-analysis" suffix for Create buttons
✅ Database report_type uses cleaner names
✅ Display names will be cleaner (no "Analysis" redundancy)
✅ Edge function deployed
✅ SQL script created for database constraint update

**Next Step**: Run the SQL script `UPDATE_REPORT_TYPE_NAMES.sql` in your Supabase SQL Editor, then test the Create buttons! 🎉

























