/*
  # Update Recommendation Based on Match Score

  ## Summary
  Updates the recommendation field in the analysis table based on match_score:
  - If match_score < 5: recommendation = 'Reject'
  - If match_score > 6: recommendation = 'Analyze'
  - Otherwise: recommendation remains as is (or null)

  ## Changes
  1. Update existing records to set recommendation based on match_score
  2. Create a trigger function to automatically update recommendation when match_score changes
  3. Create a trigger that fires on INSERT and UPDATE of match_score
*/

-- Function to update recommendation based on match_score
CREATE OR REPLACE FUNCTION update_recommendation_from_match_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if match_score is provided and is numeric
  IF NEW.match_score IS NOT NULL THEN
    -- Convert match_score to numeric if it's a string
    DECLARE
      score_value numeric;
    BEGIN
      -- Try to convert to numeric
      IF pg_typeof(NEW.match_score) = 'text'::regtype THEN
        score_value := NULLIF(NEW.match_score, '')::numeric;
      ELSE
        score_value := NEW.match_score::numeric;
      END IF;
      
      -- Update recommendation based on score
      IF score_value IS NOT NULL THEN
        IF score_value < 5 THEN
          NEW.recommendation := 'Reject';
        ELSIF score_value > 6 THEN
          NEW.recommendation := 'Analyze';
        END IF;
        -- If score is between 5 and 6 (inclusive), leave recommendation as is
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If conversion fails, leave recommendation unchanged
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update recommendation when match_score changes
DROP TRIGGER IF EXISTS trigger_update_recommendation_from_match_score ON analysis;
CREATE TRIGGER trigger_update_recommendation_from_match_score
  BEFORE INSERT OR UPDATE OF match_score ON analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_from_match_score();

-- Update existing records
UPDATE analysis
SET recommendation = CASE
  WHEN match_score IS NOT NULL THEN
    CASE
      WHEN (match_score::text::numeric) < 5 THEN 'Reject'
      WHEN (match_score::text::numeric) > 6 THEN 'Analyze'
      ELSE recommendation -- Keep existing recommendation if score is between 5 and 6
    END
  ELSE recommendation
END
WHERE match_score IS NOT NULL
  AND (
    (match_score::text::numeric < 5 AND (recommendation IS NULL OR recommendation != 'Reject'))
    OR
    (match_score::text::numeric > 6 AND (recommendation IS NULL OR recommendation != 'Analyze'))
  );

