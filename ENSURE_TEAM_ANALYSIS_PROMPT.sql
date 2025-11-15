-- Ensure Team-Analysis prompt exists in the prompts table
-- Run this in your Supabase SQL Editor if the Team-Analysis function is failing

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Team-Analysis', 
  'Analyze the team composition and leadership structure in this document. Focus on:

1. Key team members and their roles
2. Relevant experience and expertise of each member
3. Team completeness - identify any critical gaps
4. Leadership structure and decision-making hierarchy
5. Advisory board or mentors mentioned
6. Team strengths and potential concerns
7. Overall team assessment score (1-10)
8. Recommendations for team improvement

Provide a comprehensive team analysis that helps investors evaluate the founding team''s capability to execute on their vision. Be specific, cite examples from the document, and provide actionable insights.',
  'GPT-4'
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    preferred_llm = EXCLUDED.preferred_llm,
    updated_at = now();

-- Verify the prompt was inserted
SELECT prompt_name, LEFT(prompt_detail, 100) as prompt_preview, preferred_llm, created_at
FROM prompts
WHERE prompt_name = 'Team-Analysis';


























