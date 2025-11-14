# Enhanced URL Extraction in analyze-pdf Function

## Problem

The analyze-pdf edge function was often extracting incorrect URLs from pitch decks because:
1. URLs in pitch decks can be outdated, typos, or formatted incorrectly
2. The AI was just grabbing whatever URL text it found
3. No validation or contextual reasoning was applied
4. Simple guessing (e.g., "companyname.com") wasn't sophisticated enough

## Solution

Enhanced the extraction prompt to use **contextual reasoning** based on company name and description to find the most likely correct URL.

### New URL Extraction Strategy (4-Step Process)

#### Step 1: Look for Explicit URLs
The AI first searches for URLs in common places:
- Contact slides, footers, headers
- "Learn More" sections
- Email addresses (domain after @)
- Social media links/handles

#### Step 2: Contextual Inference Based on Company Type
If no URL found, AI infers the correct URL based on business type:

| Business Type | Likely Domain Pattern | Example |
|--------------|----------------------|---------|
| Tech/SaaS | `.com` or `.io` | techflow.io |
| AI Companies | `.ai` | smarthealth.ai |
| Mobile Apps | `.app` or `.com` | quickmeet.app |
| Consumer Brands | `.com` | brandname.com |
| B2B Enterprise | `.io` or `.com` | datavault.io |

#### Step 3: Validation Using Description
The AI validates its inference by checking if it makes sense given the company's business description:

**Example:**
- Company: "NeuralTech"
- Description: "AI-powered analytics for healthcare"
- Inferred URL: `neuraltech.ai` ✅ (matches AI industry pattern)

#### Step 4: Proper Formatting
Ensures URL follows standardized format:
- ✅ All lowercase
- ✅ No "www" prefix
- ✅ No protocol (http://, https://)
- ✅ Just domain: `company.com`

## Example Improvements

### Before (Simple Guessing):
```
Company: "QuickMeet Inc"
Old logic: quickmeet.com or getquickmeet.com
Result: Could be wrong - might actually be quickmeet.app
```

### After (Contextual Reasoning):
```
Company: "QuickMeet Inc"
Description: "Mobile meeting scheduler app for teams"
Analysis:
  - Industry: Mobile app
  - Type: Scheduling tool
  - Likely pattern: .app or .com with "get" prefix
Inferred URL: quickmeet.app or getquickmeet.com
Result: More accurate based on context!
```

## Prompt Enhancement Details

### New Instructions Added:

```
CRITICAL INSTRUCTIONS FOR FINDING THE COMPANY URL:

**Step 1: Look for explicit URLs in the pitch deck**
- Check for URLs on contact slides, footer, header, or "Learn More" sections
- Look for email addresses - the domain after @ is often their website
- Check social media handles/links which may reference their domain

**Step 2: If URL is not found, INFER the correct website using the company name and description**

Based on the company name and what they do, determine the most likely website pattern:
- For tech/SaaS companies: Usually [companyname].com, [companyname].io, or get[companyname].com
- For AI companies: Often [companyname].ai
- For apps: May be [appname].app or [companyname].com
- For consumer brands: Usually [brandname].com
- For B2B software: Often [companyname].io or [companyname].com

**Step 3: Use business description to validate your inference**
[Examples provided in prompt]

**Step 4: Final URL should be:**
- All lowercase
- Include proper domain extension (.com, .io, .ai, .app, etc.)
- No "www" prefix (just the domain)
- No http:// or https:// (just the domain)
```

## Real-World Examples

### Example 1: Healthcare AI Company
```json
{
  "company_name": "MediCare AI",
  "description": "AI-powered diagnostic tool for hospitals",
  "url": "medicare.ai"
}
```
**Why:** Healthcare + AI → .ai domain is most appropriate

### Example 2: SaaS Platform
```json
{
  "company_name": "DataFlow Inc",
  "description": "Enterprise data integration platform",
  "url": "dataflow.io"
}
```
**Why:** Enterprise B2B SaaS → .io is common for tech companies

### Example 3: Consumer App
```json
{
  "company_name": "FitTrack",
  "description": "Mobile fitness tracking app",
  "url": "fittrack.app"
}
```
**Why:** Mobile app → .app domain is increasingly popular for apps

### Example 4: Traditional Brand
```json
{
  "company_name": "GreenLeaf Coffee",
  "description": "Sustainable coffee roasting company",
  "url": "greenleafcoffee.com"
}
```
**Why:** Consumer brand → .com is standard for traditional businesses

## Benefits

### 1. More Accurate URLs
- Uses contextual information (company name + description + industry)
- Follows industry-specific patterns
- Validates against business type

### 2. Better Inference
- Instead of: "companyname.com" (simple guess)
- Now: Intelligent inference based on business type and industry norms

### 3. Consistent Formatting
- All URLs standardized (lowercase, no www, no protocol)
- Easier to use programmatically
- Clickable in UI without modification

### 4. Handles Edge Cases
- Companies with "Inc", "LLC", etc. in name
- Apps with "Get" prefix (e.g., "GetSmartMeet" → getsmart meet.com)
- AI/tech companies with trendy TLDs (.ai, .io)

## Deployment

### 1. Deploy the Updated Function

```bash
npx supabase functions deploy analyze-pdf
```

### 2. Test with a Pitch Deck

Upload a pitch deck and check the extracted URL:

```sql
-- Check extracted URLs from recent analyses
SELECT 
  file_path,
  extracted_info->>'company_name' as company,
  extracted_info->>'description' as description,
  extracted_info->>'url' as extracted_url,
  created_at
FROM extracted_data
WHERE extracted_info->>'url' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Verify Accuracy

Compare extracted URLs with actual company websites to verify improvement.

## Testing Checklist

- [ ] Deploy updated function
- [ ] Upload pitch deck with NO URL → Verify AI infers correctly
- [ ] Upload pitch deck with URL → Verify AI finds it
- [ ] Check URL format is standardized (lowercase, no www)
- [ ] Verify different company types get appropriate TLDs
  - [ ] AI company gets .ai
  - [ ] SaaS gets .io or .com
  - [ ] App gets .app or .com
  - [ ] Traditional brand gets .com

## Monitoring

### Check Extraction Quality

```sql
-- Find URLs that might be incorrect (e.g., still have www or protocol)
SELECT 
  extracted_info->>'company_name' as company,
  extracted_info->>'url' as url
FROM extracted_data
WHERE 
  extracted_info->>'url' LIKE '%www%'
  OR extracted_info->>'url' LIKE 'http%'
ORDER BY created_at DESC;
```

### Compare Before/After

```sql
-- See URL extraction patterns
SELECT 
  SUBSTRING(extracted_info->>'url' FROM '[^.]+$') as tld,
  COUNT(*) as count
FROM extracted_data
WHERE extracted_info->>'url' IS NOT NULL
GROUP BY tld
ORDER BY count DESC;
```

## Future Enhancements

### Potential Improvements:
1. **URL Validation**: Actually check if inferred URL exists (HTTP request)
2. **Domain Variations**: Try multiple patterns and pick best match
3. **Learning**: Track which patterns are most accurate over time
4. **Fallback Sources**: Search LinkedIn, Crunchbase for company URL
5. **Confidence Score**: Return confidence level with inferred URLs

## Summary

✅ **Enhanced prompt with 4-step URL discovery process**  
✅ **Contextual reasoning based on company type and description**  
✅ **Industry-specific domain pattern recognition**  
✅ **Standardized URL formatting**  
✅ **Better accuracy for inferred URLs**  

The AI now acts like a researcher who cross-references information rather than just a text extractor!

## Files Modified

- ✅ `supabase/functions/analyze-pdf/index.ts` - Enhanced URL extraction prompt
- ✅ `ENHANCED_URL_EXTRACTION.md` - This documentation

## Deploy Now

```bash
# Deploy the enhanced function
npx supabase functions deploy analyze-pdf

# Test it with a pitch deck upload
# Check the extracted URL in the companies table
```

The next pitch deck analysis will use this enhanced URL extraction logic! 🚀






















