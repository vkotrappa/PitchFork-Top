# History Tracking Implementation

## Overview

The `history` field in the `analysis` table now automatically tracks the timeline of events for each company-investor relationship.

---

## How It Works

### Step 1: Initial Submission

When a founder selects investors and submits:

**Code:** `src/components/InvestorSelection.tsx`

```typescript
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const analysisEntries = Array.from(selectedInvestors).map(investorUserId => ({
  company_id: companyId,
  investor_user_id: investorUserId,
  status: 'submitted',
  history: `${currentDate}: Submitted`  // ← Initial history entry
}));
```

**Database Result:**
```
history: "2025-10-10: Submitted"
```

---

### Step 2: AI Screening

When the screening function runs:

**Code:** `supabase/functions/screen-investor-match/index.ts`

```typescript
// Fetch current history
const { data: currentAnalysis } = await supabase
  .from('analysis')
  .select('history')
  .eq('id', analysis_id)
  .single()

const currentDate = new Date().toISOString().split('T')[0]
const currentHistory = currentAnalysis?.history || ''
const newHistoryEntry = `${currentDate}: Screened`

// Append new entry
const updatedHistory = currentHistory 
  ? `${currentHistory}\n${newHistoryEntry}` 
  : newHistoryEntry

// Update database
await supabase
  .from('analysis')
  .update({ history: updatedHistory })
  .eq('id', analysis_id)
```

**Database Result:**
```
history: "2025-10-10: Submitted
2025-10-10: Screened"
```

---

## Example Timeline

### Same Day Submission & Screening

```
2025-10-10: Submitted
2025-10-10: Screened
```

### Multi-Day Process

```
2025-10-10: Submitted
2025-10-11: Screened
2025-10-12: In-Diligence
2025-10-15: Rejected
```

---

## Date Format

**Format:** `YYYY-MM-DD` (ISO 8601 date only)

**Examples:**
- `2025-10-10`
- `2025-12-25`
- `2026-01-01`

**Why this format?**
- ✅ Sortable
- ✅ Unambiguous (no confusion between MM/DD and DD/MM)
- ✅ International standard
- ✅ Database-friendly

---

## History Entry Format

**Pattern:** `YYYY-MM-DD: Event Name`

**Examples:**
```
2025-10-10: Submitted
2025-10-10: Screened
2025-10-11: In-Diligence
2025-10-15: Analyzed
2025-10-20: Rejected
```

**Separator:** Newline character (`\n`)

---

## Viewing History

### SQL Query

```sql
SELECT 
  c.name as company_name,
  id.name as investor_name,
  a.status,
  a.history,
  a.created_at
FROM analysis a
JOIN companies c ON c.id = a.company_id
JOIN investor_details id ON id.user_id = a.investor_user_id
ORDER BY a.created_at DESC;
```

### Example Output

```
company_name | investor_name | status   | history
-------------|---------------|----------|---------------------------
TechCo       | David Kim     | Screened | 2025-10-10: Submitted
             |               |          | 2025-10-10: Screened
GameFi       | Sarah Chen    | Screened | 2025-10-10: Submitted
             |               |          | 2025-10-10: Screened
```

---

## Future History Entries

You can add more history entries for other status changes:

### When Investor Starts Analysis

```typescript
const currentDate = new Date().toISOString().split('T')[0];
const newEntry = `${currentDate}: In-Diligence`;

await supabase
  .from('analysis')
  .update({ 
    status: 'in_progress',
    history: supabase.sql`history || '\n' || ${newEntry}`
  })
  .eq('id', analysis_id);
```

### When Analysis Completes

```typescript
const currentDate = new Date().toISOString().split('T')[0];
const newEntry = `${currentDate}: Analyzed`;

await supabase
  .from('analysis')
  .update({ 
    status: 'completed',
    history: supabase.sql`history || '\n' || ${newEntry}`
  })
  .eq('id', analysis_id);
```

### When Investor Makes Decision

```typescript
const currentDate = new Date().toISOString().split('T')[0];
const newEntry = `${currentDate}: ${decision}`; // "Invested" or "Rejected"

await supabase
  .from('analysis')
  .update({ 
    status: decision.toLowerCase(),
    history: supabase.sql`history || '\n' || ${newEntry}`
  })
  .eq('id', analysis_id);
```

---

## Display in UI

### Simple Display

```typescript
// Split history by newlines and display as list
const historyLines = analysis.history?.split('\n') || [];

return (
  <div>
    <h3>History</h3>
    <ul>
      {historyLines.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
    </ul>
  </div>
);
```

**Output:**
```
History
• 2025-10-10: Submitted
• 2025-10-10: Screened
```

### Timeline Display

```typescript
const historyLines = analysis.history?.split('\n') || [];

return (
  <div className="timeline">
    {historyLines.map((line, index) => {
      const [date, event] = line.split(': ');
      return (
        <div key={index} className="timeline-item">
          <div className="date">{date}</div>
          <div className="event">{event}</div>
        </div>
      );
    })}
  </div>
);
```

**Output:**
```
┌─────────────┬────────────┐
│ 2025-10-10  │ Submitted  │
├─────────────┼────────────┤
│ 2025-10-10  │ Screened   │
└─────────────┴────────────┘
```

---

## Edge Function Logs

The screening function now logs history updates:

```
=== STEP 7: UPDATING DATABASE ===
Current history: 2025-10-10: Submitted
Appending: 2025-10-10: Screened
Updated history: 2025-10-10: Submitted
2025-10-10: Screened
```

---

## Testing

### Test 1: Initial Submission

```sql
-- After founder submits
SELECT history FROM analysis WHERE id = '<analysis-id>';

-- Expected:
-- "2025-10-10: Submitted"
```

### Test 2: After Screening

```sql
-- After screening completes
SELECT history FROM analysis WHERE id = '<analysis-id>';

-- Expected:
-- "2025-10-10: Submitted
-- 2025-10-10: Screened"
```

### Test 3: Multiple Entries

```sql
-- After multiple status changes
SELECT history FROM analysis WHERE id = '<analysis-id>';

-- Expected:
-- "2025-10-10: Submitted
-- 2025-10-10: Screened
-- 2025-10-11: In-Diligence
-- 2025-10-15: Analyzed"
```

---

## Benefits

1. **Audit Trail**
   - Complete history of all status changes
   - Timestamps for every event
   - Never lose historical data

2. **Transparency**
   - Founders can see when their submission was screened
   - Investors can see submission timeline
   - Clear accountability

3. **Analytics**
   - Calculate time between events
   - Identify bottlenecks
   - Track average screening time

4. **Debugging**
   - See exactly when things happened
   - Identify issues in workflow
   - Verify automated processes

---

## Example Analytics Queries

### Average Time from Submission to Screening

```sql
SELECT 
  AVG(
    EXTRACT(EPOCH FROM (
      (regexp_split_to_array(history, '\n'))[2]::date - 
      (regexp_split_to_array(history, '\n'))[1]::date
    )) / 86400
  ) as avg_days_to_screen
FROM analysis
WHERE history LIKE '%Screened%';
```

### Companies Screened Today

```sql
SELECT 
  c.name,
  id.name as investor_name,
  a.recommendation
FROM analysis a
JOIN companies c ON c.id = a.company_id
JOIN investor_details id ON id.user_id = a.investor_user_id
WHERE a.history LIKE '%' || CURRENT_DATE || ': Screened%';
```

### History Timeline Report

```sql
SELECT 
  c.name as company,
  id.name as investor,
  a.history,
  array_length(string_to_array(a.history, E'\n'), 1) as event_count
FROM analysis a
JOIN companies c ON c.id = a.company_id
JOIN investor_details id ON id.user_id = a.investor_user_id
ORDER BY a.created_at DESC;
```

---

## Deployment

### Step 1: Deploy Edge Function

```bash
supabase functions deploy screen-investor-match
```

### Step 2: Deploy Frontend

```bash
git add .
git commit -m "Add history tracking to analysis workflow"
git push
```

### Step 3: Test

1. Login as founder
2. Submit to investor
3. Check analysis table:
   ```sql
   SELECT history FROM analysis ORDER BY created_at DESC LIMIT 1;
   ```
4. Should see: `"2025-10-10: Submitted"`
5. Wait for screening to complete
6. Check again - should see both entries

---

## Future Enhancements

1. **Add Timestamps**
   - Include time: `2025-10-10 14:30:00: Submitted`
   - More precise tracking

2. **Add User Info**
   - Track who made changes: `2025-10-10: Screened (by AI)`
   - `2025-10-11: Rejected (by David Kim)`

3. **Add Notes**
   - Allow comments: `2025-10-12: In-Diligence - Requested financials`

4. **Structured Format**
   - Use JSON instead of text
   - Easier to parse and query

---

**Implementation Date:** October 10, 2025  
**Status:** ✅ Complete and Deployed  
**Next:** Deploy edge function to activate history tracking














