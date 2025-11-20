# Deploy Analyze-Company Generic Function

## Overview
This guide explains how to deploy the new generic `analyze-company` edge function that handles Team, Product, Market, and Financial analysis.

## What Was Implemented

### 1. New Edge Function
- **Location**: `supabase/functions/analyze-company/index.ts`
- **Purpose**: Generic function that handles all analysis types
- **Features**:
  - Accepts `analysisType` parameter ('team', 'product', 'market', 'financials')
  - Dynamically fetches correct prompt from database
  - Generates properly-named PDF reports
  - Updates `analysis_reports` table with correct `report_type`
  - Updates `analysis` history with correct labels

### 2. Updated Frontend
- **Location**: `src/components/VentureDetail.tsx`
- **Changes**:
  - Added three new action buttons: Analyze-Product, Analyze-Market, Analyze-Financials
  - Created generic `handleAnalysis()` function
  - All four analysis buttons now use the same backend logic
  - Each button calls the function with different `analysisType` parameter

## Deployment Steps

### Step 1: Deploy the Edge Function

Run this command in your terminal:

```bash
supabase functions deploy analyze-company
```

This will deploy the new generic function to your Supabase project.

### Step 2: Create Required Prompts in Database

You need to add three new prompts to your `prompts` table. The `Team-Analysis` prompt should already exist.

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Product Analysis Prompt
INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm)
VALUES (
  'Product-Analysis',
  'Analyze the startup''s product based on the provided documents. Focus on:

1. Product Description & Value Proposition
   - What problem does it solve?
   - What is the unique value proposition?
   - How compelling is the solution?

2. Product-Market Fit
   - Does the product address a real market need?
   - Evidence of customer demand or validation
   - Quality of product-market fit

3. Innovation & Differentiation
   - How innovative is the product?
   - What makes it different from competitors?
   - Barriers to entry and defensibility

4. Technical Implementation
   - Technology stack and architecture
   - Scalability considerations
   - Quality of technical execution

5. Product Development Stage
   - Current stage (idea, MVP, launched, scaling)
   - Product roadmap and vision
   - Development timeline and milestones

6. User Experience
   - Design quality and usability
   - Customer feedback and satisfaction
   - Ease of adoption

Provide a comprehensive analysis with specific examples from the documents. Rate the overall product strength on a scale of 1-10 and provide clear recommendations.',
  'gpt-4-turbo-preview'
);

-- Market Analysis Prompt
INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm)
VALUES (
  'Market-Analysis',
  'Analyze the market opportunity for this startup based on the provided documents. Focus on:

1. Market Size & Growth
   - Total Addressable Market (TAM)
   - Serviceable Addressable Market (SAM)
   - Serviceable Obtainable Market (SOM)
   - Market growth rate and trends

2. Target Market & Customer Segments
   - Who are the target customers?
   - Customer demographics and psychographics
   - Market segmentation strategy
   - Beachhead market approach

3. Competitive Landscape
   - Direct competitors analysis
   - Indirect competitors and alternatives
   - Competitive advantages and disadvantages
   - Market positioning

4. Market Dynamics
   - Industry trends and drivers
   - Regulatory environment
   - Technological changes impacting the market
   - Economic factors

5. Go-to-Market Strategy
   - Customer acquisition channels
   - Marketing and sales approach
   - Distribution strategy
   - Partnerships and alliances

6. Market Timing
   - Is this the right time for this solution?
   - Market readiness and adoption barriers
   - Early adopter opportunities

Provide a comprehensive analysis with specific data points from the documents. Rate the overall market opportunity on a scale of 1-10 and provide clear investment recommendations.',
  'gpt-4-turbo-preview'
);

-- Financial Analysis Prompt
INSERT INTO prompts (prompt_name, prompt_detail, preferred_llm)
VALUES (
  'Financial-Analysis',
  'Analyze the financial aspects of this startup based on the provided documents. Focus on:

1. Revenue Model
   - How does the company make money?
   - Pricing strategy and structure
   - Revenue streams diversity
   - Monetization approach

2. Financial Performance
   - Current revenue (if any)
   - Revenue growth rate
   - Burn rate and runway
   - Path to profitability

3. Unit Economics
   - Customer Acquisition Cost (CAC)
   - Lifetime Value (LTV)
   - LTV:CAC ratio
   - Gross margins and contribution margins

4. Financial Projections
   - Revenue forecasts
   - Expense projections
   - Assumptions and their validity
   - Scenario analysis (base, best, worst case)

5. Capital Requirements
   - Funding sought and use of funds
   - Previous funding rounds
   - Current valuation (if provided)
   - Dilution and cap table considerations

6. Financial Health & Metrics
   - Cash position
   - Key financial metrics and KPIs
   - Financial discipline and controls
   - Risk factors

7. Return Potential
   - Potential exit scenarios
   - Expected returns for investors
   - Time horizon to exit
   - Valuation analysis

Provide a comprehensive analysis with specific numbers from the documents. Rate the overall financial attractiveness on a scale of 1-10 and provide clear investment recommendations.',
  'gpt-4-turbo-preview'
);
```

**Note**: You can customize the prompt_detail text to match your specific investment criteria and analysis framework.

### Step 3: Verify Prompts

Check that all four prompts exist:

```sql
SELECT prompt_name, preferred_llm 
FROM prompts 
WHERE prompt_name IN ('Team-Analysis', 'Product-Analysis', 'Market-Analysis', 'Financial-Analysis')
ORDER BY prompt_name;
```

You should see 4 rows returned.

## Testing

1. Navigate to the Venture Detail screen for any company
2. You should see four purple analysis buttons:
   - Analyze-Team
   - Analyze-Product
   - Analyze-Market
   - Analyze-Financials

3. Click any button to test:
   - Button should show "Analyzing..." while processing
   - A success message should appear when complete
   - The analysis history should be updated
   - A new PDF report should appear in the "Generated Analysis Reports" section
   - The PDF filename should match the pattern: `{company-name}_{type}-analysis_{timestamp}.pdf`

## Analysis Report Types

The function creates reports with these `report_type` values:
- `team-analysis` - for Team analysis
- `product-analysis` - for Product analysis
- `market-analysis` - for Market analysis
- `financials-analysis` - for Financial analysis

## History Updates

The function updates the `analysis.history` field with entries like:
- `Oct 17, 2025: Analyze-Team - Complete`
- `Oct 17, 2025: Analyze-Product - Complete`
- `Oct 17, 2025: Analyze-Market - Complete`
- `Oct 17, 2025: Analyze-Financials - Complete`

## Architecture Benefits

This generic approach provides:
- ✅ **Single edge function** for all analysis types (easier maintenance)
- ✅ **Consistent behavior** across all analysis types
- ✅ **Easy to extend** - just add new config to `analysisConfig`
- ✅ **Dynamic prompt loading** from database
- ✅ **Proper PDF naming** and report type tagging
- ✅ **Reusable frontend code** with generic handler

## Troubleshooting

### If the function fails to deploy:
```bash
# Check Supabase CLI version
supabase --version

# Login if needed
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Try deploying again
supabase functions deploy analyze-company
```

### If analysis fails:
1. Check that the prompt exists in the database with the correct `prompt_name`
2. Verify documents exist for the company
3. Check the browser console for detailed error messages
4. Check Supabase Edge Function logs in the dashboard

### If wrong report type appears:
The function creates report types as: `{analysisType}-analysis`
- team → team-analysis
- product → product-analysis
- market → market-analysis
- financials → financials-analysis

## Future Enhancements

You can easily add new analysis types by:
1. Adding a new entry to `analysisConfig` in the edge function
2. Creating a corresponding prompt in the database
3. Adding a new button to the frontend (no handler code needed!)

Example:
```typescript
// In analyze-company/index.ts
strategy: {
  promptName: 'Strategy-Analysis',
  reportTitle: 'Strategy Analysis Report',
  assistantName: 'Strategy Analyzer',
  assistantInstructions: '...',
  vectorStoreName: 'Strategy Analysis',
  historyLabel: 'Analyze-Strategy',
}
```

## Questions?

If you encounter any issues or need to modify the prompts, you can:
1. Update prompts directly in the database
2. Customize the PDF styling in `analyze-company/index.ts`
3. Adjust the frontend button display logic in `VentureDetail.tsx`

























