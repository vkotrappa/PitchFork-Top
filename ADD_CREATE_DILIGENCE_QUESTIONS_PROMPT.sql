-- Insert or update the Create-Diligence-Questions prompt
-- This prompt generates comprehensive due diligence questions based on analysis reports

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Create-Diligence-Questions', 
  'Based on all the analysis reports and documents provided for this company, create a comprehensive list of Due Diligence Questions that need to be answered before making an investment decision.

Review all available reports (Score Card, Product Analysis, Market Analysis, Team Analysis, Financial Analysis) and company documents to identify:
- Information gaps that need clarification
- Risk areas requiring deeper investigation
- Claims or projections that need validation
- Concerns raised in the analyses
- Areas where additional documentation is needed

**IMPORTANT INSTRUCTIONS:**
- Create specific, targeted questions (not generic)
- Focus on areas of concern or uncertainty from the analyses
- Prioritize high-impact questions
- Make questions actionable and answerable
- Organize questions by category
- Include 8-15 questions per category
- Questions should be professional and direct

**QUESTION CATEGORIES:**

**PRODUCT DUE DILIGENCE**
Generate 8-15 specific questions about:
- Product development and roadmap
- Technology stack and architecture
- Intellectual property and patents
- Product-market fit validation
- Customer feedback and adoption
- Technical risks and dependencies
- Competitive differentiation
- Product scalability
- Security and compliance
- Integration capabilities

Examples:
- "What is the current technical debt and how do you plan to address it?"
- "Can you provide evidence of product-market fit (usage metrics, customer testimonials)?"
- "What patents or IP protections are in place for your core technology?"

**MARKET DUE DILIGENCE**
Generate 8-15 specific questions about:
- Market size validation (TAM/SAM/SOM)
- Customer acquisition strategy
- Competitive positioning
- Market trends and timing
- Customer segments and personas
- Go-to-market execution
- Sales pipeline and conversion
- Partnership strategy
- Market barriers and risks
- Regulatory environment

Examples:
- "Can you provide third-party validation of your TAM calculations?"
- "What is your current CAC and how does it trend over time?"
- "Who are your top 3 competitors and how do you differentiate?"

**TEAM DUE DILIGENCE**
Generate 8-15 specific questions about:
- Team experience and track record
- Key person dependencies
- Organizational structure
- Hiring plans and timeline
- Advisory board engagement
- Team gaps and recruiting
- Founder dynamics and equity
- Previous exits or failures
- Cultural alignment
- Retention and compensation

Examples:
- "What relevant industry experience does each co-founder bring?"
- "What is your vesting schedule and cliff for founders?"
- "Who are your key advisors and how actively are they involved?"

**FINANCIAL DUE DILIGENCE**
Generate 8-15 specific questions about:
- Revenue model validation
- Unit economics (CAC, LTV, payback)
- Historical financials accuracy
- Financial projections assumptions
- Burn rate and runway
- Funding history and cap table
- Revenue recognition policies
- Cost structure and scalability
- Path to profitability
- Exit scenarios and valuations

Examples:
- "What are your actual CAC and LTV metrics with supporting data?"
- "Can you provide detailed assumptions behind your 5-year projections?"
- "What is your current monthly burn rate and remaining runway?"

**LEGAL & COMPLIANCE**
Generate 5-10 specific questions about:
- Corporate structure and governance
- Regulatory compliance
- Existing contracts and obligations
- Litigation history
- Employment agreements
- Data privacy and security
- Insurance coverage

Examples:
- "Are there any pending or threatened legal actions against the company?"
- "What data privacy regulations apply to your business (GDPR, CCPA, etc.)?"

**OPERATIONAL DUE DILIGENCE**
Generate 5-10 specific questions about:
- Key processes and systems
- Infrastructure and tools
- Vendor relationships
- Customer contracts
- Quality control
- Operational metrics

Examples:
- "What are your key operational bottlenecks and how are you addressing them?"
- "Do you have any single points of failure in your operations?"

**FORMATTING:**
- Use clear section headers for each category
- Number questions within each category
- Make questions direct and specific
- Focus on questions raised by the analysis reports
- Include context where helpful
- Prioritize most critical questions first in each category

Create a comprehensive due diligence questionnaire that helps investors make an informed decision. Questions should be based on gaps, concerns, or areas needing validation identified in the analysis reports.',
  'GPT-4'
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    preferred_llm = EXCLUDED.preferred_llm,
    updated_at = now();

-- Verify the prompt was inserted
SELECT prompt_name, LEFT(prompt_detail, 100) as prompt_preview, preferred_llm, created_at
FROM prompts
WHERE prompt_name = 'Create-Diligence-Questions';
















