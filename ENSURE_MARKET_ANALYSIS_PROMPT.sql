-- Ensure Market-Analysis prompt exists and is comprehensive in the prompts table
-- Run this in your Supabase SQL Editor if the Market-Analysis function is producing small outputs

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Market-Analysis', 
  'Analyze the market opportunity for this startup based on the provided documents. Focus on:

1. Market Size & Growth
   - Total Addressable Market (TAM)
   - Serviceable Addressable Market (SAM)
   - Serviceable Obtainable Market (SOM)
   - Market growth rate and trends
   - Specific market data and projections from the documents

2. Target Market & Customer Segments
   - Who are the target customers?
   - Customer demographics and psychographics
   - Market segmentation strategy
   - Beachhead market approach
   - Customer pain points and needs

3. Competitive Landscape
   - Direct competitors analysis
   - Indirect competitors and alternatives
   - Competitive advantages and disadvantages
   - Market positioning
   - Competitive differentiation strategy

4. Market Dynamics
   - Industry trends and drivers
   - Regulatory environment
   - Technological changes impacting the market
   - Economic factors
   - Market barriers and opportunities

5. Go-to-Market Strategy
   - Customer acquisition channels
   - Marketing and sales approach
   - Distribution strategy
   - Partnerships and alliances
   - Pricing strategy and market penetration

6. Market Timing
   - Is this the right time for this solution?
   - Market readiness and adoption barriers
   - Early adopter opportunities
   - Market cycle and trends

7. Market Risk Assessment
   - Market risks and challenges
   - Competitive threats
   - Market saturation concerns
   - Regulatory or economic risks

Provide a comprehensive market analysis that helps investors evaluate the market opportunity and the company''s potential for market success. Be specific, cite examples and data points from the documents, and provide actionable insights. 

IMPORTANT: This is a complete analysis report. Do NOT ask follow-up questions or request additional information. Provide a thorough, detailed analysis covering all the areas above. Rate the overall market opportunity on a scale of 1-10 and provide clear investment recommendations based on your analysis.',
  'GPT-4'
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    preferred_llm = EXCLUDED.preferred_llm,
    updated_at = now();

-- Verify the prompt was inserted/updated
SELECT prompt_name, LEFT(prompt_detail, 200) as prompt_preview, preferred_llm, created_at, updated_at
FROM prompts
WHERE prompt_name = 'Market-Analysis';

