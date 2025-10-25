# Diagnose: Report Storage "Object Not Found" Error

## Current Error
```
Error creating signed URL: StorageApiError: Object not found
File path: 4819f923-493f-40c9-9d8b-5679662acbdf/neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf
```

This means the `analysis_reports` database table has a record pointing to a file that doesn't exist in the `analysis-output-docs` storage bucket.

## Diagnostic Steps

### Step 1: Check Database Records
Run this SQL query in your Supabase SQL Editor to see what file paths are stored:

```sql
-- Check the team analysis reports in the database
SELECT 
  ar.id,
  ar.company_id,
  ar.report_type,
  ar.file_name,
  ar.file_path,
  ar.generated_at,
  ar.analysis_id,
  c.name as company_name
FROM analysis_reports ar
LEFT JOIN companies c ON c.id = ar.company_id
WHERE ar.report_type = 'team-analysis'
ORDER BY ar.generated_at DESC
LIMIT 10;
```

### Step 2: Check Supabase Storage
1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **analysis-output-docs** bucket
3. Look for the folder: `4819f923-493f-40c9-9d8b-5679662acbdf`
4. Check if the file `neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf` exists

### Step 3: Compare Results

#### Scenario A: File Exists in Storage but Path is Wrong
If the file exists but with a slightly different name (e.g., extra dash, different timestamp format):

**Solution:** Update the database record:
```sql
UPDATE analysis_reports
SET file_path = '4819f923-493f-40c9-9d8b-5679662acbdf/actual-filename-in-storage.pdf',
    file_name = 'actual-filename-in-storage.pdf'
WHERE id = 'the-report-id-from-step-1';
```

#### Scenario B: File Doesn't Exist in Storage
The upload likely failed during report generation but the database record was still created.

**Solution:** Delete the orphaned database record:
```sql
DELETE FROM analysis_reports
WHERE id = 'the-report-id-from-step-1'
AND file_path = '4819f923-493f-40c9-9d8b-5679662acbdf/neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf';
```

Then regenerate the report by clicking "Analyze-Team" again.

#### Scenario C: Folder Doesn't Exist
The entire company folder is missing from storage.

**Solution:** The file is truly lost. Delete the database records and regenerate:
```sql
DELETE FROM analysis_reports
WHERE company_id = '4819f923-493f-40c9-9d8b-5679662acbdf'
AND file_path LIKE '4819f923-493f-40c9-9d8b-5679662acbdf/%';
```

## Common Causes

### 1. Upload Failure During Report Generation
The `analyze-team` function creates the database record AFTER uploading the file (line 483-494), but if the upload fails silently, we might still create the record.

**Check the function logs:**
```bash
# In Supabase Dashboard → Edge Functions → analyze-team → Logs
# Look for "Error uploading PDF" messages
```

### 2. Filename Generation Mismatch
Different parts of the code might be generating filenames slightly differently.

**Example inconsistencies:**
- `company-name_team-analysis_timestamp.pdf` (correct)
- `company-name-_team-analysis_timestamp.pdf` (extra dash before underscore)
- `company-name_team-analysis-timestamp.pdf` (dash instead of underscore before timestamp)

### 3. Storage Bucket Permissions
The service role key has full access, but there might be issues with bucket creation or file uploads.

## Immediate Fix: Add File Existence Check

Add this verification function to check if files exist before showing download buttons:

```typescript
const verifyReportExists = async (report: AnalysisReport): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage
      .from('analysis-output-docs')
      .list(report.file_path.split('/')[0], {
        search: report.file_name
      });
    
    if (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error verifying report:', error);
    return false;
  }
};
```

## Prevention: Better Error Handling in analyze-team Function

The `analyze-team` function should verify the upload succeeded before creating the database record:

```typescript
// After uploading PDF (line 467-478)
const { error: uploadError, data: uploadData } = await supabaseAdmin.storage
  .from('analysis-output-docs')
  .upload(reportPath, pdfBlob, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: false
  });

if (uploadError) {
  console.error('Error uploading PDF:', uploadError);
  throw new Error(`Failed to upload PDF: ${uploadError.message}`);
}

// Verify the file was actually uploaded
const { data: fileCheck } = await supabaseAdmin.storage
  .from('analysis-output-docs')
  .list(companyId, {
    search: reportFileName
  });

if (!fileCheck || fileCheck.length === 0) {
  throw new Error('File upload verification failed - file not found in storage');
}

// Only NOW create the database record (line 483-494)
```

## Quick Action Items

1. ✅ Run Step 1 SQL query to see database records
2. ✅ Check Supabase Storage dashboard (Step 2)
3. ✅ Compare and apply the appropriate solution (Step 3)
4. ✅ Test by clicking the Analyze-Team button again
5. ✅ Verify the new report downloads successfully

## Need More Help?

Share the results from Steps 1 and 2:
- What does the SQL query return?
- What files do you see in the Storage bucket under that company folder?
- Any error messages in the Edge Function logs?







