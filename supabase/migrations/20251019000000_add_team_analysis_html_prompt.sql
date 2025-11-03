/*
  # Add Team-Analysis-HTML Prompt
  
  1. Changes
    - Insert Team-Analysis-HTML prompt into prompts table
    - Use ON CONFLICT to update if already exists
  
  2. Details
    - Prompt focuses on team composition, experience, and capability assessment
    - Uses GPT-4 as preferred LLM
    - Copy of Team-Analysis prompt for HTML/CSS PDF generation testing
*/

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Team-Analysis-HTML', 
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



