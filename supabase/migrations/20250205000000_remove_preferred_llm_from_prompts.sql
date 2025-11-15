/*
  # Remove preferred_llm column from prompts table
  
  This migration removes the preferred_llm column from the prompts table
  as it is no longer needed. LLM preferences are now stored in the 
  llm_preferences table per user.
*/

ALTER TABLE prompts DROP COLUMN IF EXISTS preferred_llm;












