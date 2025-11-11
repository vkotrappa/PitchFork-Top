-- Insert or update the Valuation-Analysis prompt
-- This prompt analyzes company valuations and investment terms

INSERT INTO prompts (prompt_name, prompt_detail) 
VALUES (
  'Valuation-Analysis', 
  'Analyze the company valuation and investment terms in this document. Focus on:

1. **Current Valuation**
   - Stated valuation amount and currency
   - Valuation methodology (pre-money, post-money, etc.)
   - Valuation basis (revenue multiple, comparable companies, discounted cash flow, etc.)
   - Any valuation benchmarks or comparables mentioned

2. **Investment Terms**
   - Investment amount being sought
   - Equity percentage or ownership stake
   - Investment instrument (SAFE, convertible note, equity, etc.)
   - Valuation cap (if applicable)
   - Discount rate (if applicable)
   - Other key terms (liquidation preferences, anti-dilution, board seats, etc.)

3. **Valuation Justification**
   - Company''s justification for the valuation
   - Revenue, growth metrics, or other valuation drivers
   - Market comparables or benchmarks cited
   - Projected financials that support the valuation

4. **Valuation Assessment**
   - Overall valuation assessment score (1-10)
   - Is the valuation reasonable given the company stage, traction, and market?
   - Comparison to industry standards and comparable companies
   - Assessment of investment terms and structure
   - Key risks or concerns with the valuation or terms

5. **Recommendations**
   - Suggested valuation adjustments (if any)
   - Recommended changes to investment terms
   - Key negotiation points
   - Due diligence questions related to valuation

Provide a comprehensive valuation analysis that helps investors evaluate the fairness and reasonableness of the proposed valuation and investment terms. Be specific, cite examples from the document, and provide actionable insights.',
  NULL
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    updated_at = now();

-- Verify the prompt was inserted
SELECT prompt_name, LEFT(prompt_detail, 100) as prompt_preview, created_at
FROM prompts
WHERE prompt_name = 'Valuation-Analysis';






