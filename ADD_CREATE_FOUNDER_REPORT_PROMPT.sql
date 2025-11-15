-- Insert or update the Create-Founder-Report prompt
-- This prompt generates constructive feedback for founders including score card and pitch deck analysis

INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm) 
VALUES (
  'Create-Founder-Report', 
  'Based on all the analysis reports and pitch deck materials provided for this company, create a Constructive Founder Feedback Report that helps the founders improve their business, pitch, and fundraising approach.

Review all available reports (Score Card, Product Analysis, Market Analysis, Team Analysis, Financial Analysis) and the pitch deck to provide actionable, supportive feedback.

**TONE & APPROACH:**
- Be honest but supportive and constructive
- Focus on actionable improvements
- Acknowledge strengths before addressing weaknesses
- Provide specific examples and recommendations
- Maintain a mentor/advisor tone (not harsh critic)
- Frame feedback as opportunities for improvement
- End on an encouraging note

**REPORT STRUCTURE:**

**INTRODUCTION**
- Brief welcome message
- Purpose of this feedback report
- Overall impression (positive opening)

**EXECUTIVE SUMMARY**
- Current stage and progress
- Key strengths to build on
- Primary areas for improvement
- Overall investment potential with context

**YOUR INVESTMENT SCORE CARD**
Include the full scoring from the Score Card report:
- Team Score: X/10 with brief explanation
- Product Score: X/10 with brief explanation
- Market Score: X/10 with brief explanation
- Financial Score: X/10 with brief explanation
- Overall Investment Score: X/10

Add context: "Here is how we evaluate your company across key dimensions:"

**WHAT YOU ARE DOING WELL** (Strengths)
Based on all analyses, highlight 5-8 key strengths:
- Specific accomplishments
- Competitive advantages
- Strong team attributes
- Market opportunities you are capturing
- Financial metrics that are impressive
- Product innovations

For each strength:
- Be specific with examples
- Explain why it matters
- Encourage continued focus

**AREAS FOR IMPROVEMENT** (Constructive Feedback)

**1. PRODUCT FEEDBACK**
Based on Product Analysis, provide constructive feedback on:
- Product development priorities
- Feature gaps or opportunities
- Technology improvements
- Product-market fit enhancement
- Competitive positioning
- User experience considerations

Format: Issue → Impact → Recommendation
Example: "Your mobile app lacks offline functionality → This limits use cases in poor connectivity areas → Consider adding offline mode with sync capabilities"

**2. MARKET STRATEGY FEEDBACK**
Based on Market Analysis, provide feedback on:
- Go-to-market strategy refinement
- Target market focus
- Competitive positioning
- Customer acquisition approach
- Market messaging
- Partnership opportunities

Format: Current state → Opportunity → Action steps

**3. TEAM DEVELOPMENT FEEDBACK**
Based on Team Analysis, provide feedback on:
- Team gaps and hiring priorities
- Skill development needs
- Organizational structure
- Advisor/board enhancement
- Leadership development
- Team culture building

Be sensitive when discussing team - frame as "opportunities to strengthen"

**4. FINANCIAL STRATEGY FEEDBACK**
Based on Financial Analysis, provide feedback on:
- Unit economics improvement
- Pricing strategy optimization
- Cost structure efficiency
- Financial projections realism
- Fundraising strategy
- Path to profitability clarity

Provide specific, actionable financial advice

**PITCH DECK ANALYSIS**
Review the pitch deck (if included in documents) and provide detailed feedback on:

**Content Analysis:**
- Story flow and narrative structure
- Problem/solution clarity
- Market opportunity presentation
- Traction and metrics presentation
- Financial projections credibility
- Team slide effectiveness
- Ask and use of funds clarity
- Missing critical information

**Design & Style Analysis:**
- Visual appeal and professionalism
- Clarity and readability
- Chart and data visualization quality
- Consistency in formatting
- Slide density (too much/little content)
- Brand presentation

**Effectiveness Assessment:**
- Does it grab attention in first 30 seconds?
- Is the problem compelling?
- Is the solution clear and differentiated?
- Are metrics/traction impressive?
- Does it build confidence in the team?
- Is the ask clear and justified?

**Specific Recommendations for Deck:**
- Slides to add
- Slides to remove or consolidate
- Content to strengthen
- Design improvements
- Story flow changes

Example feedback:
"Your problem slide effectively uses statistics, but consider adding a real customer story to make it emotionally compelling. The solution slide is too text-heavy - break into 2-3 slides with more visuals showing your product in action."

**KEY RECOMMENDATIONS** (Priority Actions)
List 5-7 highest priority actions the founders should take:

1. **[Priority Item]**
   - Current situation
   - Why it is important
   - Specific action steps
   - Expected impact
   - Timeline suggestion

**FUNDRAISING ADVICE**
Based on the overall analysis:
- Readiness for current fundraising stage
- Valuation considerations
- Investor type recommendations
- Key metrics to improve before next raise
- Story/narrative suggestions
- Preparation checklist

**RESOURCES & SUPPORT**
Suggest helpful resources:
- Recommended reading/frameworks
- Relevant network connections
- Tools or platforms
- Industry organizations
- Educational programs

**CLOSING THOUGHTS**
- Acknowledge the hard work and progress
- Reinforce key strengths
- Express confidence in potential (if appropriate)
- Offer continued support
- Encouraging final message

**IMPORTANT GUIDELINES:**
- Be specific - use examples and data from the reports
- Be actionable - every piece of feedback should have a clear "what to do"
- Be balanced - acknowledge progress while pushing for improvement
- Be professional - this may be shared with the founders
- Be encouraging - entrepreneurship is hard, show support
- Focus on the 80/20 - highlight most impactful improvements

Create a report that founders will find valuable, motivating, and actionable. This should help them improve their business and increase their chances of fundraising success.',
  'GPT-4'
)
ON CONFLICT (prompt_name) DO UPDATE 
SET prompt_detail = EXCLUDED.prompt_detail,
    preferred_llm = EXCLUDED.preferred_llm,
    updated_at = now();

-- Verify the prompt was inserted
SELECT prompt_name, LEFT(prompt_detail, 100) as prompt_preview, preferred_llm, created_at
FROM prompts
WHERE prompt_name = 'Create-Founder-Report';






















