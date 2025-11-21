# Run LLM Preferences Migration

## Important: The database table needs to be created first!

The error you're seeing is likely because the `llm_preferences` table doesn't exist yet.

## Steps to Fix:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Copy the contents of `supabase/migrations/20250123000000_create_llm_preferences_table.sql`
   - Paste it into the SQL Editor
   - Click **Run**

   OR

   - If you're using Supabase CLI locally:
   ```bash
   supabase db reset
   # or
   supabase migration up
   ```

3. **Verify the Table Exists**
   - Go to **Table Editor** in Supabase Dashboard
   - You should see `llm_preferences` table with columns:
     - id (uuid)
     - user_id (uuid)
     - preferred_llm (text)
     - created_at (timestamptz)
     - updated_at (timestamptz)

4. **Test Again**
   - Go back to Edit Prompts page
   - Try selecting an LLM preference
   - It should now save successfully

## If Still Getting Errors:

Check the browser console (F12) for the full error message. The updated code will now show more detailed error messages that should help diagnose the issue.















