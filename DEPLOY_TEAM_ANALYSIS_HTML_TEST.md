# Deployment Guide: Team-Analysis-Test Feature

## Overview
This guide covers deploying the new HTML/CSS-based PDF generation test feature for team analysis.

## Step 1: Add the Prompt to Database

You have two options:

### Option A: Via Supabase Dashboard (Recommended for quick testing)
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20251019000000_add_team_analysis_html_prompt.sql`
4. Click **Run**
5. Verify: Go to **Table Editor** → `prompts` table → Look for `Team-Analysis-HTML`

### Option B: Via CLI Migration
```bash
# Push all pending migrations (including the new one)
npx supabase db push
```

## Step 2: Deploy the Edge Function

```bash
# Make sure you're in the project root directory
cd C:\Users\vkotr\PitchFork-Top

# Login to Supabase (if not already logged in)
npx supabase login

# Link your project (if not already linked - replace YOUR_PROJECT_REF)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the new analyze-company-html function
npx supabase functions deploy analyze-company-html
```

You should see output like:
```
Deploying analyze-company-html (project ref: your-project)
Deployed to: https://your-project.supabase.co/functions/v1/analyze-company-html
```

## Step 3: Verify Deployment

### Verify the Prompt Exists:
```sql
-- Run this in Supabase SQL Editor
SELECT prompt_name, LEFT(prompt_detail, 50) as preview
FROM prompts
WHERE prompt_name = 'Team-Analysis-HTML';
```

### Verify the Edge Function:
```bash
# List all deployed functions
npx supabase functions list

# You should see 'analyze-company-html' in the list
```

### Verify in Supabase Dashboard:
1. Go to **Edge Functions** in your Supabase Dashboard
2. You should see `analyze-company-html` in the list of functions

## Step 4: Test the Feature

1. Start your development server:
```bash
npm run dev
```

2. Navigate to a company's venture detail page
3. Look for the **orange "Team-Analysis-Test"** button in Row 1 (with other Analyze buttons)
4. Click the button and wait for the analysis to complete
5. Check the "Generated Reports" section for a report with type `team-analysis-html-test`

## Troubleshooting

### Issue: Migration doesn't run
**Solution:**
- Check mailbox that you're in the project root
- Verify the migration file exists: `supabase/migrations/20251019000000_add_team_analysis_html_prompt.sql`
- Try running it manually in SQL Editor

### Issue: Function deployment fails
**Check:**
```bash
# Verify you're logged in
npx supabase login

# Verify project is linked
npx supabase projects list

# Check function syntax (should show no errors)
npx supabase functions serve analyze-company-html
```

### Issue: Button doesn't appear
**Check:**
- Refresh the page
- Check browser console for errors
- Verify the button is in `row1Buttons` array in `VentureDetail.tsx`

### Issue: Function returns error about missing prompt
**Solution:**
- Double-check the prompt was inserted correctly (Step 1)
- Verify prompt name is exactly `Team-Analysis-HTML` (case-sensitive)

## What Was Created

1. **Migration File:** `supabase/migrations/20251019000000_add_team_analysis_html_prompt.sql`
   - Adds `Team-Analysis-HTML` prompt to database

2. **Edge Function:** `supabase/functions/analyze-company-html/index.ts`
   - Handles HTML/CSS-based PDF generation
   - Uses Puppeteer to convert HTML to PDF
   - Saves reports with type `team-analysis-html-test`

3. **Frontend Changes:** `src/components/VentureDetail.tsx`
   - Added "Team-Analysis-Test" button
   - Added handler function
   - Orange styling to distinguish from regular buttons

## Next Steps

After successful deployment:
- Test the button functionality
- Compare PDF quality between jsPDF and HTML/CSS versions
- Use the test results to decide which approach to use going forward



