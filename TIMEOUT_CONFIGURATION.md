# Edge Function Timeout Configuration

## Problem
The team analysis (and other analysis functions) are timing out in Supabase edge functions. The default timeout is 60 seconds, which may not be enough for complex AI analysis.

## Solutions

### Option 1: Increase Timeout in Supabase Dashboard (Recommended for Production)

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Find the timeout configuration for your edge functions
4. Increase the timeout to **300 seconds (5 minutes)** for Pro plans
   - Free tier: Maximum 60 seconds
   - Pro tier: Maximum 300 seconds (5 minutes)

### Option 2: Configure via Supabase CLI (Local Development)

Create or update `supabase/config.toml`:

```toml
[functions]
  [functions.analyze-company]
    timeout = 300  # 5 minutes in seconds
  
  [functions.analyze-company-claude]
    timeout = 300  # 5 minutes in seconds (for Claude-based analysis)
  
  [functions.analyze-company-background]
    timeout = 60  # Background function should return quickly
```

### Option 3: Optimize the Analysis Process

The background function has been updated to:
- Return immediately after queuing the work (using `setTimeout`)
- Not wait for the analysis to complete
- Handle errors asynchronously

### Option 4: Use Supabase Database Webhooks (Alternative)

Instead of calling edge functions directly, you could:
1. Insert a job record in the database
2. Use a database webhook to trigger the analysis
3. Process the analysis asynchronously

## Current Implementation

The `analyze-company-background` function now:
- Returns immediately (doesn't wait for analysis)
- Uses `setTimeout` to ensure non-blocking execution
- Handles all errors asynchronously
- Updates analysis status in the database

The actual `analyze-company` and `analyze-company-claude` functions that do the work may still timeout if they take longer than the configured limit. Make sure to increase the timeout for both functions specifically.

## Verification

To verify the timeout configuration:
1. Check Supabase Dashboard → Edge Functions → Logs
2. Look for timeout errors (usually "Function execution timeout" or similar)
3. Monitor the execution time in the logs
4. Adjust timeout accordingly

