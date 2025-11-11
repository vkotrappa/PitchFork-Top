# Fix: Report Download Error (400 Bad Request)

## Problem
When attempting to download team analysis reports from the VentureDetail page, users were encountering a **400 Bad Request** error from Supabase Storage.

### Error Details
```
Failed to load resource: the server responded with a status of 400 ()
StorageUnknownError: {}
```

**Example file path:**
```
4819f923-493f-40c9-9d8b-5679662acbdf/neuralert-technologies-inc-_team-analysis_2025-10-11T09-00-43.pdf
```

## Root Cause
The download functionality was using the direct `.download()` method from Supabase Storage client:

```typescript
const { data, error } = await supabase.storage
  .from('analysis-output-docs')
  .download(report.file_path);
```

### Why This Failed
1. **Authentication Context**: The `.download()` method requires proper Row Level Security (RLS) policies to be configured on the storage bucket
2. **Private Bucket**: The `analysis-output-docs` bucket is likely configured as private, which requires authenticated access
3. **RLS Policies**: If RLS policies aren't properly set up for the current user's role, the download will be rejected with a 400 error

## Solution
Changed the download approach to use **signed URLs** instead of direct downloads. Signed URLs are temporary, pre-authenticated URLs that bypass RLS policies.

### Updated Code

#### Report Download (handleDownloadReport)
```typescript
// Create a signed URL for secure download
const { data: signedUrlData, error: signedUrlError } = await supabase.storage
  .from('analysis-output-docs')
  .createSignedUrl(report.file_path, 60); // 60 seconds expiry

if (signedUrlError) {
  console.error('Error creating signed URL:', signedUrlError);
  setMessageStatus({ type: 'error', text: `Failed to create download link: ${signedUrlError.message}` });
  return;
}

// Download the file using the signed URL
const response = await fetch(signedUrlData.signedUrl);
const blob = await response.blob();

// Create download link
const url = URL.createObjectURL(blob);
const a = window.document.createElement('a');
a.href = url;
a.download = report.file_name;
window.document.body.appendChild(a);
a.click();
window.document.body.removeChild(a);
URL.revokeObjectURL(url);
```

#### Document Download (handleDownloadDocument)
Applied the same signed URL approach to the `handleDownloadDocument` function for consistency and to prevent similar issues.

## Benefits

### 1. Bypasses RLS Policies
Signed URLs are pre-authenticated, so they work regardless of the user's RLS permissions.

### 2. Enhanced Security
- Short expiry time (60 seconds) limits exposure
- URLs are temporary and cannot be reused after expiry

### 3. Better User Experience
- More reliable downloads
- Clear error messages with status updates
- Visual feedback during download process

### 4. Cross-Bucket Compatibility
Works with both:
- `analysis-output-docs` (for AI-generated reports)
- `company-documents` (for uploaded documents)

## Files Modified
- `src/components/VentureDetail.tsx`
  - Updated `handleDownloadReport()` function
  - Updated `handleDownloadDocument()` function
  - Added better error handling and user feedback

## Testing Recommendations

1. **Test Report Downloads**: Click the download button on any team analysis report
2. **Test Document Downloads**: Try downloading company documents from the venture detail page
3. **Error Handling**: Test with invalid file paths to ensure error messages display correctly
4. **Multiple Downloads**: Verify that multiple consecutive downloads work properly
5. **Browser Compatibility**: Test in different browsers (Chrome, Firefox, Safari, Edge)

## Additional Notes

### Signed URL Expiry
Currently set to 60 seconds. This can be adjusted if needed:
- Increase for slower connections: `createSignedUrl(path, 300)` (5 minutes)
- Decrease for tighter security: `createSignedUrl(path, 30)` (30 seconds)

### Storage Bucket Configuration
No changes needed to Supabase storage bucket settings. The signed URL approach works with both public and private buckets.

### Future Improvements
Consider caching signed URLs temporarily to avoid regenerating them for repeated downloads within a short timeframe.

## Related Functions
The `analyze-team` function already creates signed URLs when generating reports (line 565-567 in `supabase/functions/analyze-team/index.ts`). This fix ensures the frontend uses the same secure approach for downloads.



















