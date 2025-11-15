/*
  # Create LLM Preferences Table
  
  Allows users to select their preferred LLM provider (OpenAI or Claude)
  Default is 'OpenAI'
  
  1. New Table
    - llm_preferences
      - id (uuid, primary key)
      - user_id (uuid, foreign key to auth.users, unique)
      - preferred_llm (text, constrained to 'OpenAI' or 'Claude')
      - created_at (timestamptz)
      - updated_at (timestamptz)
  
  2. Security
    - Enable RLS
    - Users can only view/manage their own preference
*/

CREATE TABLE IF NOT EXISTS llm_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_llm text NOT NULL DEFAULT 'OpenAI' CHECK (preferred_llm IN ('OpenAI', 'Claude')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT llm_preferences_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE llm_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preference
CREATE POLICY "Users can view own llm preference"
  ON llm_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preference
CREATE POLICY "Users can insert own llm preference"
  ON llm_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preference
CREATE POLICY "Users can update own llm preference"
  ON llm_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preference
CREATE POLICY "Users can delete own llm preference"
  ON llm_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_llm_preferences_user_id ON llm_preferences(user_id);












