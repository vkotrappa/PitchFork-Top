# Screening Function - Prioritize Founder-Corrected Data

## Problem

The screening function (`screen-investor-match`) was analyzing companies against investor criteria using BOTH:
1. Company data from the companies table (founder corrections)
2. Pitch deck PDF content

**However**, the AI wasn't told which source to trust when they disagreed, often preferring the **outdated pitch deck data** over the **founder's corrections**.

### Example of the Problem:

**Founder uploads pitch deck:**
- Pitch deck says: "Revenue: $800K ARR"
- Pitch deck says: "Valuation: $36M SAFE cap"

**Founder corrects the information:**
- Updates revenue to: "$1.2M ARR" (current, accurate)
- Updates valuation to: "$50M" (latest valuation)

**Screening happens:**
- ❌ AI sees both sources
- ❌ AI uses pitch deck data ($800K, $36M) 
- ❌ Company gets rejected incorrectly based on old data

## Solution

Updated the screening prompt to **explicitly prioritize founder-corrected data** from the companies table over pitch deck content.

### Key Changes to the Prompt:

#### 1. Label Company Data as "Official"
```
OFFICIAL COMPANY INFORMATION (Verified and Corrected by Founder):
```

#### 2. Explicit Priority Instructions
```
CRITICAL INSTRUCTIONS:
- The "Official Company Information" above has been VERIFIED AND CORRECTED by the founder
- This information is MORE ACCURATE than what may be in the pitch deck
- USE the official company information as your PRIMARY SOURCE for screening
- The pitch deck is SUPPLEMENTARY - use it for additional context, team info, vision, etc.
```

#### 3. Handle Discrepancies
```
- If there are ANY DISCREPANCIES between the official information and the pitch deck, 
  ALWAYS use the official information
```

#### 4. Concrete Examples
```
For example:
  * If official info says "Revenue: $1.2M ARR" but pitch deck shows "$800K", use $1.2M
  * If official info says "Industry: Healthcare AI" but pitch deck says "Healthcare", use Healthcare AI  
  * If official info says "Valuation: $50M" but pitch deck shows "$36M SAFE cap", use $50M
```

#### 5. Reinforce in Task Instructions
```
TASK:
Based on the investor's criteria and the OFFICIAL COMPANY INFORMATION (not the pitch deck)...
Base your decision on the official company information provided above.
```

## How the Data Flows

### Step 1: Initial Upload
```
Founder uploads pitch deck
  ↓
analyze-pdf extracts data
  ↓
Data saved to companies table
  ↓
Founder reviews and corrects:
  - Revenue: $800K → $1.2M ✓
  - Valuation: $36M → $50M ✓
  - Industry: Healthcare → Healthcare AI ✓
```

### Step 2: Screening (OLD BEHAVIOR ❌)
```
Screening function runs
  ↓
Fetches companies table data (corrected)
Fetches pitch deck PDF (original)
  ↓
Sends both to AI
  ↓
AI sees conflicting data
  ↓
❌ AI trusts pitch deck → Uses old data
  ↓
❌ Incorrect screening result
```

### Step 3: Screening (NEW BEHAVIOR ✅)
```
Screening function runs
  ↓
Fetches companies table data (corrected)
Fetches pitch deck PDF (original)
  ↓
Sends both to AI with priority instructions
  ↓
AI sees conflicting data
  ↓
✅ AI prioritizes official company info
  ↓
✅ Uses founder's corrected data:
    Revenue: $1.2M ARR
    Valuation: $50M
    Industry: Healthcare AI
  ↓
✅ Accurate screening result!
```

## What This Means for Screening

### Official Company Information (PRIMARY SOURCE)
From `companies` table - **Always trusted**:
- Company Name
- Industry
- Description
- Revenue
- Valuation
- Funding Stage
- Location
- Website
- Contact Info

### Pitch Deck (SUPPLEMENTARY CONTEXT)
PDF attachment - **Secondary source**:
- Team backgrounds and bios
- Product screenshots and demos
- Vision and mission details
- Market analysis
- Go-to-market strategy
- Additional context not in structured data

## Benefits

### 1. Accurate Screening
✅ Uses the most current, founder-verified data
✅ Screening decisions based on accurate information
✅ Fewer incorrect rejections

### 2. Founder Control
✅ Founders can correct any extraction errors
✅ Updates immediately affect screening
✅ No need to re-upload pitch deck

### 3. Better Matches
✅ Investors see companies that truly match their criteria
✅ Based on current data, not outdated pitch deck
✅ More relevant investment opportunities

### 4. Clear Data Hierarchy
✅ Structured data (companies table) > Unstructured data (PDF)
✅ Verified data (founder corrections) > Extracted data (AI extraction)
✅ Current data (updated) > Historical data (original pitch deck)

## Example Scenarios

### Scenario 1: Revenue Update

**Companies Table (Founder Corrected):**
```
Revenue: $1.5M ARR
```

**Pitch Deck (Original):**
```
"We've reached $900K in annual recurring revenue"
```

**Investor Criteria:**
```
"Looking for companies with at least $1M in ARR"
```

**OLD Behavior:** ❌ Reject (uses $900K from pitch deck)  
**NEW Behavior:** ✅ Accept (uses $1.5M from companies table)

---

### Scenario 2: Industry Refinement

**Companies Table (Founder Corrected):**
```
Industry: AI-powered Healthcare Analytics
```

**Pitch Deck (Original):**
```
"Healthcare Technology Company"
```

**Investor Criteria:**
```
"Focused on AI companies in healthcare"
```

**OLD Behavior:** ❌ Maybe reject (unclear if it's AI-focused)  
**NEW Behavior:** ✅ Accept (clearly AI-powered healthcare)

---

### Scenario 3: Valuation Update

**Companies Table (Founder Corrected):**
```
Valuation: $75M (latest priced round)
```

**Pitch Deck (Original):**
```
"Raising on a $50M SAFE cap"
```

**Investor Criteria:**
```
"Investing at valuations between $60M-$100M"
```

**OLD Behavior:** ❌ Reject (SAFE cap of $50M is below $60M threshold)  
**NEW Behavior:** ✅ Accept ($75M valuation is in range)

## Testing

### Test the Updated Screening:

1. **Create a test company** with pitch deck data
2. **Founder corrects key information** in companies table
3. **Run screening** for an investor
4. **Verify** that screening uses corrected data

### SQL to Verify Data Sources:

```sql
-- Check what data is in companies table
SELECT 
  name,
  industry,
  revenue,
  valuation,
  description
FROM companies
WHERE id = 'your-company-id';

-- Check what was originally extracted from pitch deck
SELECT 
  file_path,
  extracted_info->>'revenue' as pitch_deck_revenue,
  extracted_info->>'valuation' as pitch_deck_valuation,
  extracted_info->>'industry' as pitch_deck_industry
FROM extracted_data
WHERE file_path LIKE 'your-company-id%'
ORDER BY created_at DESC
LIMIT 1;

-- Check screening result
SELECT 
  recommendation,
  recommendation_reason,
  status,
  created_at
FROM analysis
WHERE company_id = 'your-company-id'
ORDER BY created_at DESC
LIMIT 1;
```

## Monitoring

### Check for Discrepancies:

```sql
-- Find companies where extracted data differs from current data
SELECT 
  c.id,
  c.name,
  c.revenue as current_revenue,
  ed.extracted_info->>'revenue' as extracted_revenue,
  c.valuation as current_valuation,
  ed.extracted_info->>'valuation' as extracted_valuation
FROM companies c
JOIN extracted_data ed ON ed.file_path LIKE c.id || '%'
WHERE 
  c.revenue != ed.extracted_info->>'revenue'
  OR c.valuation != ed.extracted_info->>'valuation'
ORDER BY c.updated_at DESC;
```

## Implementation Details

### Location of Changes:
- **File:** `supabase/functions/screen-investor-match/index.ts`
- **Lines:** 178-214 (screening prompt)
- **Type:** Prompt engineering enhancement

### No Database Changes:
- ✅ No schema changes needed
- ✅ No migration required
- ✅ Existing data works immediately

### Backward Compatible:
- ✅ Works for companies with pitch decks
- ✅ Works for companies without pitch decks
- ✅ Works for companies with/without corrections

## Deployment Status

✅ **Function deployed:** screen-investor-match  
✅ **Enhancement:** Prioritizes founder-corrected data  
✅ **Status:** Live and active  
✅ **Dashboard:** [View in Supabase](https://supabase.com/dashboard/project/nsimmsznrutwgtkkblgw/functions)

## Summary

✅ **Screening now prioritizes founder-corrected data**  
✅ **Companies table is the authoritative source**  
✅ **Pitch deck is supplementary context only**  
✅ **More accurate screening decisions**  
✅ **Fewer incorrect rejections**  
✅ **Founders have control over their data**  

## Next Screening

The next time a founder submits for screening, the function will:
1. ✅ Use their corrected company information as primary source
2. ✅ Use pitch deck as supplementary context only
3. ✅ Make decisions based on accurate, current data

Founders can now be confident that their corrections will be respected during screening! 🎯




























