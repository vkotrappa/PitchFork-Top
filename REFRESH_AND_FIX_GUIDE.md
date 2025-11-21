# Quick Fix Guide: Refresh Code & Fix Download Error

## Current Situation
You're seeing the OLD error because your browser hasn't loaded the new code yet. The error at line 247 is from the previous version.

## Fix Steps (Follow in Order)

### Part 1: Get New Code Running (2 minutes)

#### Option A: If Dev Server is Running
1. **Check your terminal** where you ran `npm run dev` or `vite`
2. Look for a message like "✓ updated 1 file" or "page reload src/components/VentureDetail.tsx"
3. If you see that, the code is compiled

#### Option B: If Dev Server is NOT Running
1. Open a terminal in your project root
2. Run: `npm run dev`
3. Wait for "Local: http://localhost:5173/" (or similar)

#### Then: Hard Refresh Your Browser
Choose one:
- **Chrome/Edge (Windows):** `Ctrl + Shift + R` or `Ctrl + F5`
- **Chrome/Edge (Mac):** `Cmd + Shift + R`
- **Firefox (Windows):** `Ctrl + Shift + R` or `Ctrl + F5`
- **Firefox (Mac):** `Cmd + Shift + R`

**Or manually:**
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Part 2: Verify New Code is Running (30 seconds)

1. Open browser Developer Console (F12)
2. Click the download button for the report
3. **Look at the console output**

#### You should see NEW, detailed logs like:
```
Downloading report: 4819f923-493f-40c9-9d8b-5679662acbdf/neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf
Report details: {id: "...", file_name: "...", report_type: "team-analysis"}
Checking if file exists in folder: 4819f923-493f-40c9-9d8b-5679662acbdf
```

**And then one of these:**

✅ **If file exists:**
```
File exists in storage, creating signed URL...
Signed URL created successfully
Download successful, file size: 123456
```

❌ **If file is missing (expected):**
```
Error checking file existence: [error]
OR
File not found in storage. Database path: [path]
Searched for file: [filename] in folder: [folder]
Files found in folder: [list of actual files or "none"]
```

#### If you still see OLD error:
```
VentureDetail.tsx:247 Error creating signed URL
```
This means the browser cache wasn't cleared. Try:
1. Close ALL browser tabs for your app
2. Close the browser completely
3. Reopen browser and navigate to your app
4. Try again

---

### Part 3: Fix the Orphaned Database Record (3 minutes)

Once you have the new code running and can see the detailed logs, fix the root cause:

#### Step 3A: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

#### Step 3B: Find the Orphaned Record
```sql
-- Copy and paste this query
SELECT 
  id,
  file_name,
  file_path,
  generated_at
FROM analysis_reports
WHERE file_path = '4819f923-493f-40c9-9d8b-5679662acbdf/neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf';
```

Click "Run" - you should see 1 record with an ID like: `123e4567-e89b-12d3-a456-426614174000`

#### Step 3C: Verify File Doesn't Exist in Storage
1. In Supabase Dashboard, click "Storage" in left sidebar
2. Click the `analysis-output-docs` bucket
3. Navigate to folder: `4819f923-493f-40c9-9d8b-5679662acbdf`
4. Look for the file: `neuralert-technologies-inc_team-analysis_2025-10-11T09-46-20.pdf`

**Expected result:** File is NOT there (or folder doesn't exist)

#### Step 3D: Delete the Orphaned Record
```sql
-- Replace 'your-report-id-here' with the actual ID from Step 3B
DELETE FROM analysis_reports
WHERE id = 'your-report-id-here';
```

Click "Run" - you should see "Success. 1 rows affected."

---

### Part 4: Regenerate the Report (1 minute)

1. **Go back to your app** and refresh the page
2. **Navigate** to the company detail page (Neuralert Technologies Inc)
3. **Click the "Analyze-Team" button**
4. **Wait 30-60 seconds** for the analysis to complete
5. You should see:
   - Success message: "Team analysis completed successfully!"
   - A new report appears in the "Generated Analysis Reports" section
6. **Click the download button** on the NEW report
7. **It should download successfully!** 🎉

---

## What Changed in the Code

### Before (Old Code):
```typescript
// Directly tried to create signed URL
const { data, error } = await supabase.storage
  .from('analysis-output-docs')
  .createSignedUrl(report.file_path, 60);

if (error) {
  // Generic error message
  setMessageStatus({ type: 'error', text: 'Failed to create download link' });
}
```

**Problem:** If file doesn't exist, you get a confusing "Object not found" error

### After (New Code):
```typescript
// First, check if file exists
const { data: fileList } = await supabase.storage
  .from('analysis-output-docs')
  .list(folderPath, { search: report.file_name });

if (!fileList || fileList.length === 0) {
  // Helpful error message
  console.log('Files found in folder:', allFiles?.map(f => f.name));
  setMessageStatus({ 
    type: 'error', 
    text: 'Report file not found. Try regenerating by clicking "Analyze-Team" again.' 
  });
  return;
}

// Only then create signed URL
const { data, error } = await supabase.storage
  .from('analysis-output-docs')
  .createSignedUrl(report.file_path, 60);
```

**Benefits:**
- ✅ Detects missing files immediately
- ✅ Shows what files actually exist for debugging
- ✅ Clear, actionable error messages
- ✅ Prevents confusing storage errors

---

## Troubleshooting

### "I refreshed but still see the old error"
- Close ALL tabs of your app
- Close the browser completely
- Check that dev server is running
- Reopen browser and try again
- Look at the line number in the error - if it's still line 247 with "Error creating signed URL", the cache wasn't cleared

### "The new logs don't show any files in the folder"
- The folder might not exist yet
- This is expected for a new company
- Just regenerate the report and it will create the folder and file

### "Regenerating the report fails"
- Check Supabase Edge Function logs: Functions → analyze-team → Logs
- Look for upload errors
- Verify your OpenAI API key is set
- Check that the company has documents uploaded

### "Download still fails after regenerating"
- Check the browser console for the detailed logs
- Verify the new report's file_path in the database
- Check if the file exists in Storage
- Look at the Supabase function logs for upload errors

---

## Quick Checklist

- [ ] Dev server is running
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Console shows NEW detailed logs (not just line 247 error)
- [ ] Ran SQL to find orphaned record
- [ ] Checked Storage - confirmed file doesn't exist
- [ ] Deleted orphaned record
- [ ] Clicked "Analyze-Team" button
- [ ] Waited for completion message
- [ ] New report appears in list
- [ ] Downloaded successfully ✅

---

## Still Stuck?

Share:
1. **Browser console output** after clicking download (the full log)
2. **SQL query results** from Step 3B
3. **What you see** in Storage → analysis-output-docs → company folder
4. **Edge function logs** from the analyze-team function

The enhanced logging will help diagnose exactly what's happening!




























