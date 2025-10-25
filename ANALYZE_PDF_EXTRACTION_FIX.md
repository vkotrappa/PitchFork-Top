# Analyze-PDF Extraction Fix

## Problem
The system was not extracting company information in the analyze-pdf function.

## Root Causes Identified

1. **Unclear AI Prompt**: The extraction prompt was too verbose and didn't provide clear step-by-step instructions
2. **Weak JSON Parsing**: The JSON extraction logic wasn't robust enough to handle various response formats
3. **Limited Timeout**: 60-second timeout was too short for complex PDFs
4. **Insufficient Logging**: Not enough debugging information to diagnose extraction failures
5. **Weak Error Recovery**: Fallback extraction was basic and didn't provide good error context

## Solutions Implemented

### 1. Improved Extraction Prompt
**File**: `supabase/functions/analyze-pdf/index.ts`

**Changes**:
- Rewrote the prompt to be more structured with numbered steps
- Made instructions clearer and more actionable
- Added explicit examples for each field type
- Emphasized JSON-only output more strongly

**Before**:
```
Look for these specific elements:
- Company name (usually on the first few slides...)
```

**After**:
```
STEP-BY-STEP INSTRUCTIONS:
1. Read through the ENTIRE document carefully
2. Look for the company name on title slides, headers, or throughout the deck
3. Identify the industry/sector (e.g., healthcare, fintech, SaaS, etc.)
...
```

### 2. Enhanced JSON Parsing
**File**: `supabase/functions/analyze-pdf/index.ts` (lines ~345-420)

**Improvements**:
- Added support for code fence blocks (```json)
- Better detection of JSON boundaries
- Improved value cleaning (handles extra quotes, whitespace)
- More robust handling of null/undefined values
- Added validation to detect all-null extractions

**New Features**:
- Handles JSON wrapped in markdown code blocks
- Removes quotes from quoted string values
- Converts string "null" to actual null
- Logs extraction quality metrics

### 3. Increased Timeout
**File**: `supabase/functions/analyze-pdf/index.ts` (line ~281)

**Change**:
- Increased timeout from 60 to 120 seconds
- Added time-based logging (every 5 seconds)
- Better timeout error messages

### 4. Better Logging
**File**: `supabase/functions/analyze-pdf/index.ts`

**Added Logging**:
- Response length
- JSON extraction method used
- Number of non-null fields extracted
- Parsing error details with context
- First/last 500 chars of response on error

### 5. Improved Error Recovery
**File**: `supabase/functions/analyze-pdf/index.ts` (lines ~400-425)

**Improvements**:
- Stores parse error message in fallback data
- Limits raw response storage (first 1000 chars)
- Better regex extraction as fallback
- More detailed error logging

## Testing the Fix

### Test Case 1: Standard Pitch Deck
1. Upload a pitch deck PDF with clear company information
2. Run analyze-pdf function
3. Verify all fields are extracted correctly

### Test Case 2: Complex/Unstructured PDF
1. Upload a pitch deck with complex formatting
2. Verify extraction still works or provides meaningful errors

### Test Case 3: Empty/Corrupted PDF
1. Upload an empty or corrupted PDF
2. Verify graceful error handling

### How to Test
```bash
# Deploy the function (already done)
npx supabase functions deploy analyze-pdf

# Check logs in Supabase Dashboard
# Navigate to: Functions > analyze-pdf > Logs

# Or use the frontend
# Go to Founder Submission page
# Upload a pitch deck
# Click "Analyze Deck with AI"
```

## Expected Behavior

### Successful Extraction
- All fields populated from PDF content
- JSON parsing succeeds on first try
- Company table updated with extracted data
- Success message shown to user

### Partial Extraction
- Some fields populated, others null
- User can fill in missing fields manually
- No errors thrown

### Failed Extraction
- Error message with context
- Fallback extraction attempted
- User prompted to fill form manually
- No data corruption

## Deployment

**Status**: ✅ Deployed

**Deployment Command**:
```bash
npx supabase functions deploy analyze-pdf
```

**Deployment Time**: Current session

**Function URL**: 
`https://nsimmsznrutwgtkkblgw.supabase.co/functions/v1/analyze-pdf`

## Monitoring

### Key Metrics to Watch
1. **Success Rate**: % of extractions that return non-null data
2. **Parse Errors**: % of responses requiring fallback parsing
3. **Timeout Rate**: % of runs exceeding 120 seconds
4. **Field Population**: Average number of non-null fields per extraction

### Where to Check Logs
1. Supabase Dashboard → Functions → analyze-pdf → Logs
2. Look for:
   - "Successfully parsed JSON with X non-null fields"
   - "WARNING: All extracted fields are null"
   - Parse error messages

## Next Steps

### If Issues Persist
1. Check OpenAI API quota/status
2. Verify PDF file is valid and readable
3. Check Supabase function logs for specific errors
4. Test with known-good PDFs to isolate issue

### Potential Future Improvements
1. Add retry logic for transient failures
2. Support for more document formats (Word, PowerPoint)
3. Multi-pass extraction for complex documents
4. Confidence scoring for extracted fields

## Related Files
- `supabase/functions/analyze-pdf/index.ts` - Main function code
- `src/components/FounderSubmission.tsx` - Frontend integration
- `src/components/TestFiles.tsx` - Testing interface
