-- Insert or update the Create-ScoreCard prompt
-- This prompt analyzes existing analysis reports to create an investment scorecard

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Create-ScoreCard', 
  'Based on the analysis reports provided for this company, create a comprehensive Investment Score Card. 

Review all available analysis reports (Team, Product, Market, Financial) and synthesize them into a structured scorecard with the following sections:

**EXECUTIVE SUMMARY**
- One paragraph overview of the investment opportunity
- Overall recommendation (Strong Buy / Buy / Hold / Pass)

**SCORING MATRIX** (Rate each 1-10 with brief justification)

1. **Team Score** (/10)
   - Leadership quality
   - Relevant experience  
   - Team completeness
   - Execution capability

2. **Product Score** (/10)
   - Product-market fit
   - Innovation/differentiation
   - Technical feasibility
   - Competitive advantages

3. **Market Score** (/10)
   - Market size (TAM/SAM/SOM)
   - Growth potential
   - Market timing
   - Competitive positioning

4. **Financial Score** (/10)
   - Revenue model viability
   - Unit economics
   - Financial projections
   - Burn rate/runway

5. **Overall Investment Score** (/10)
   - Weighted average with brief calculation

**KEY STRENGTHS**
- List 3-5 major strengths

**KEY RISKS/CONCERNS**
- List 3-5 major risks or concerns

**INVESTMENT RECOMMENDATION**
- Clear recommendation with rationale
- Suggested next steps
- Key due diligence questions

Format your response in clean, well-structured text with clear section headers. Be specific and cite examples from the analysis reports. Provide actionable insights for investment decision-making.',
  'GPT-4'
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    preferred_llm = EXCLUDED.preferred_llm,
    updated_at = now();

-- Verify the prompt was inserted
SELECT prompt_name, LEFT(prompt_detail, 100) as prompt_preview, preferred_llm, created_at
FROM prompts
WHERE prompt_name = 'Create-ScoreCard';




