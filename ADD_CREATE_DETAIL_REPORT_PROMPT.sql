-- Insert or update the Create-Detail-Report prompt
-- This prompt compiles all analysis reports into a comprehensive detail report

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Create-Detail-Report', 
  'Create a Comprehensive Detail Report by assembling the provided analysis reports into a single document. Do NOT summarize, condense, or synthesize the content - include each report in its entirety.

**CRITICAL INSTRUCTIONS:**
- Include each analysis report as a complete, separate section
- Do NOT edit, summarize, or modify the content of the individual reports
- Preserve every word, detail, and formatting from the original reports
- Simply organize them into a single document with clear section headers

**REPORT STRUCTURE:**

**EXECUTIVE SUMMARY & HIGH-LEVEL SCORECARD**
Create a comprehensive executive summary section (approximately 1 page) that includes:

1. **Investment Thesis**: A clear statement of the investment opportunity
2. **High-Level Scorecard**: A summary table with key metrics and scores from all analyses:
   - Team Score (from Team Analysis)
   - Product Score (from Product Analysis) 
   - Market Score (from Market Analysis)
   - Financial Score (from Financial Analysis)
   - Overall Recommendation
3. **Key Strengths**: Top 3-5 strengths identified across all analyses
4. **Key Concerns**: Top 3-5 risks or concerns identified across all analyses
5. **Critical Success Factors**: What needs to happen for this investment to succeed
6. **Investment Recommendation**: Clear go/no-go recommendation with rationale

**TEAM ANALYSIS REPORT**
Include the complete Team Analysis report exactly as it was generated. Do not modify any content.

**PRODUCT ANALYSIS REPORT**  
Include the complete Product Analysis report exactly as it was generated. Do not modify any content.

**MARKET ANALYSIS REPORT**
Include the complete Market Analysis report exactly as it was generated. Do not modify any content.

**FINANCIAL ANALYSIS REPORT**
Include the complete Financial Analysis report exactly as it was generated. Do not modify any content.

**INVESTMENT SCORECARD**
Include the complete Score Card report exactly as it was generated. Do not modify any content.

**FORMATTING:**
- Use clear section headers to separate each report
- Maintain the original formatting and structure of each report
- Do NOT add transitions or commentary between reports
- Simply present each report as a complete section

**REMINDER:** This is an assembly task, not a compilation task. Include the full content of each report without any modifications.'
  'GPT-4'
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    preferred_llm = EXCLUDED.preferred_llm,
    updated_at = now();

-- Verify the prompt was inserted
SELECT prompt_name, LEFT(prompt_detail, 100) as prompt_preview, preferred_llm, created_at
FROM prompts
WHERE prompt_name = 'Create-Detail-Report';



