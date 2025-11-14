# Debug Download Workflow - Comprehensive Diagnostics

## What I Just Added

I've added **detailed step-by-step logging** throughout the entire download workflow to help us pinpoint exactly where the mismatch is occurring.

## The Enhanced Logging Will Show

### Step 1: What's in the Database
```
=== DOWNLOAD WORKFLOW STARTED ===
1. Report from database:
   - file_path: [path from database]
   - file_name: [filename from database]
   - report_type: team-analysis
   - report_id: [id]
```

### Step 2: Path Parsing
```
2. Parsed path:
   - folder: [company_id]
   - fileName from path: [extracted filename]
   - file_name field: [database filename]
   - Match? [true/false]
```

### Step 3-5: Storage Verification
```
3. Listing files in storage bucket analysis-output-docs...
4. List returned empty (file not found via search)
   Searching for: [database filename]
   In folder: [company_id]
   
5. Listing ALL files in folder for debugging...
   Files actually in storage:
   1. "[actual filename 1]" (id: xxx)
   2. "[actual filename 2]" (id: xxx)
   
   COMPARISON:
   Looking for: "[database filename]"
   Length: X chars
   Found match: "[actual filename]"
   Length: Y chars
   Exact match? false
   
   MISMATCH DETECTED!
   Database has: "[database filename]"
   Storage has:  "[actual filename]"
```

### Step 6-7: Edge Function Call
```
6. Creating signed URL via edge function...
   Edge function URL: /functions/v1/get-report-download-url
   Requesting signed URL for path: [full path]
   
7. Edge function response: 200 OK
   ✅ Edge function succeeded
   Response: {success: true, signed_url: "..."}
```

### Step 8: File Download
```
8. Downloading file from signed URL...
   Response status: 200 OK
   ✅ File downloaded successfully
   File size: 123456 bytes
   File type: application/pdf
```

### Step 9: Browser Trigger
```
9. Triggering browser download...
   Download as: [filename]
   
=== DOWNLOAD WORKFLOW COMPLETED SUCCESSFULLY ===
```

## What You Need to Do Now

### 1. Hard Refresh Your Browser
Clear the cache and load the new code:
- **Windows:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

### 2. Open Developer Console
Press `F12` or right-click → Inspect → Console tab

### 3. Click the Download Button
Click the download icon for the team analysis report

### 4. Copy ALL Console Output
Select everything in the console and copy it

### 5. Share the Output With Me
The logs will tell us EXACTLY:
- What filename the database thinks it is
- What filename is actually in storage
- If there's a mismatch (most likely scenario)
- Where in the workflow it fails (if it does)

## What We're Looking For

### Scenario A: Filename Mismatch (Most Likely)

**Database has:**
```
file_name: "neuralert_team-analysis_2025-10-11T14-56-23.pdf"
```

**Storage has:**
```
file_name: "neuralert-technologies-inc_team-analysis_2025-10-11T14-56-23.pdf"
```

**Solution:** Update the database to match storage, or vice versa

### Scenario B: Edge Function Fails

**Edge function returns:**
```
❌ Edge function failed!
Error: {error: "Object not found"}
```

**Solution:** The path in database doesn't exist in storage at all - need to regenerate

### Scenario C: Everything Works!

**You see:**
```
=== DOWNLOAD WORKFLOW COMPLETED SUCCESSFULLY ===
```

**And:** File downloads to your downloads folder  
**Result:** Problem solved! 🎉

## Commands for Quick Reference

### Deploy Edge Function (if not done yet)
```bash
npx supabase functions deploy get-report-download-url
```

### Check Supabase Status
```bash
npx supabase status
```

### View Edge Function Logs
Go to: Supabase Dashboard → Edge Functions → get-report-download-url → Logs

## Next Steps Based on Output

### If Mismatch Detected

1. **Check what file actually exists in storage:**
   - Go to Supabase Dashboard → Storage → analysis-output-docs
   - Navigate to the company folder
   - Note the EXACT filename (including underscores, dashes, etc.)

2. **Update the database record:**
   ```sql
   UPDATE analysis_reports
   SET file_name = 'actual-filename-from-storage.pdf',
       file_path = 'company-id/actual-filename-from-storage.pdf'
   WHERE id = 'report-id-from-logs';
   ```

3. **Try downloading again**

### If File Doesn't Exist in Storage

1. **Delete the orphaned database record:**
   ```sql
   DELETE FROM analysis_reports
   WHERE id = 'report-id-from-logs';
   ```

2. **Regenerate the report:**
   - Refresh the page
   - Click "Analyze-Team" button again
   - Wait for completion
   - New report should download successfully

### If Edge Function Fails

1. **Check edge function logs** in Supabase Dashboard
2. **Share the logs** with me
3. **Verify function is deployed:**
   ```bash
   npx supabase functions list
   ```

## The Complete Picture

With this diagnostic logging, we'll see:

```
Database says: "File is at path X with name Y"
        ↓
Storage check: "Actually found files: A, B, C"
        ↓
Comparison: "Looking for Y, but storage has A"
        ↓
Edge function: "Trying to create signed URL for path X"
        ↓
Result: "Success or failure with exact error"
```

This will definitively tell us if it's:
- ✅ A filename mismatch (database vs storage)
- ✅ A missing file (database record with no file)
- ✅ A path issue (wrong folder or structure)
- ✅ An RLS issue (even with edge function)
- ✅ Something else entirely

## Ready to Debug!

1. ✅ Enhanced logging added
2. ✅ Edge function deployed
3. ⏳ Waiting for you to:
   - Hard refresh browser
   - Click download button
   - Share console output

Let's find out exactly what's happening! 🔍






















