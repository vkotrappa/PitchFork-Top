import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { OpenAI } from 'npm:openai@4.73.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Helper function to convert markdown table to HTML
function convertMarkdownTableToHtml(tableRows: string[]): string {
  if (tableRows.length === 0) return '';
  
  let html = '<table>\n';
  
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    // Split by | and filter out empty strings from leading/trailing pipes
    const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0);
    
    if (cells.length === 0) continue;
    
    html += '  <tr>\n';
    for (const cell of cells) {
      // Process bold and italic in cells
      let cellContent = cell.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      cellContent = cellContent.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      // First row is header, rest are data
      if (i === 0) {
        html += `    <th>${cellContent}</th>\n`;
      } else {
        html += `    <td>${cellContent}</td>\n`;
      }
    }
    html += '  </tr>\n';
  }
  
  html += '</table>';
  return html;
}

// Helper function to convert markdown to HTML
function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  let html = markdown;
  
  // Process line by line to handle headers properly
  const lines = html.split('\n');
  let result: string[] = [];
  let inOrderedList = false;
  let inUnorderedList = false;
  let inTable = false;
  let tableRows: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmedLine = line.trim();
    
    // Detect markdown table rows (starts with | and contains multiple |)
    // More robust detection: must start with |, end with |, and have at least 2 columns
    const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|') && (trimmedLine.match(/\|/g) || []).length >= 3;
    // Table separator: lines with |, hyphens/dashes, and optional colons/alignment markers
    const isTableSeparator = trimmedLine.match(/^\|[\s\|\-:]+$/) && trimmedLine.includes('-');
    
    // Skip empty lines for now
    if (!trimmedLine && !isTableRow && !isTableSeparator) {
      // Close any open structures
      if (inTable && tableRows.length > 0) {
        // Convert accumulated table rows to HTML
        result.push(convertMarkdownTableToHtml(tableRows));
        tableRows = [];
        inTable = false;
      }
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      result.push('');
      continue;
    }
    
    // Handle table rows
    if (isTableRow || isTableSeparator) {
      if (!isTableSeparator) {
        // It's a data row
        if (!inTable) {
          // Close any open lists
          if (inOrderedList) {
            result.push('</ol>');
            inOrderedList = false;
          }
          if (inUnorderedList) {
            result.push('</ul>');
            inUnorderedList = false;
          }
          inTable = true;
        }
        tableRows.push(trimmedLine);
      }
      // Skip separator rows (they're just for markdown formatting)
      continue;
    }
    
    // If we hit a non-table line while in a table, close the table
    if (inTable && tableRows.length > 0) {
      result.push(convertMarkdownTableToHtml(tableRows));
      tableRows = [];
      inTable = false;
    }
    
    // Headers (must come first, handle leading spaces)
    if (trimmedLine.match(/^#{1,3}\s+/)) {
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      
      if (trimmedLine.match(/^###\s+/)) {
        trimmedLine = trimmedLine.replace(/^###\s+(.+)$/, '<h3>$1</h3>');
      } else if (trimmedLine.match(/^##\s+/)) {
        trimmedLine = trimmedLine.replace(/^##\s+(.+)$/, '<h2>$1</h2>');
      } else if (trimmedLine.match(/^#\s+/)) {
        trimmedLine = trimmedLine.replace(/^#\s+(.+)$/, '<h1>$1</h1>');
      }
      result.push(trimmedLine);
      continue;
    }
    
    // Numbered lists
    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        result.push('<ol>');
        inOrderedList = true;
      }
      result.push(`<li>${orderedMatch[1]}</li>`);
      continue;
    }
    
    // Bullet lists
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        result.push('<ul>');
        inUnorderedList = true;
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
      continue;
    }
    
    // Close lists if we hit regular text
    if (inOrderedList) {
      result.push('</ol>');
      inOrderedList = false;
    }
    if (inUnorderedList) {
      result.push('</ul>');
      inUnorderedList = false;
    }
    
    // Process bold and italic
    trimmedLine = trimmedLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    trimmedLine = trimmedLine.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    result.push(trimmedLine);
  }
  
  // Close any remaining structures
  if (inTable && tableRows.length > 0) {
    result.push(convertMarkdownTableToHtml(tableRows));
  }
  if (inOrderedList) {
    result.push('</ol>');
  }
  if (inUnorderedList) {
    result.push('</ul>');
  }
  
  html = result.join('\n');
  
  // Paragraphs (double newlines) - only wrap text that isn't already in HTML tags
  // Process line by line to preserve table structure
  const finalLines = html.split('\n');
  const finalResult: string[] = [];
  let inTableBlock = false;
  let tableBlock: string[] = [];
  
  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    const trimmed = line.trim();
    
    // Detect table start
    if (trimmed === '<table>' || trimmed.startsWith('<table>')) {
      inTableBlock = true;
      tableBlock = [line];
      continue;
    }
    
    // Collect table content
    if (inTableBlock) {
      tableBlock.push(line);
      if (trimmed === '</table>' || trimmed.endsWith('</table>')) {
        inTableBlock = false;
        finalResult.push(tableBlock.join('\n'));
        tableBlock = [];
      }
      continue;
    }
    
    // Handle non-table content
    if (trimmed === '') {
      finalResult.push('');
      continue;
    }
    
    // Skip if already HTML tag (headers, lists, etc.)
    if (trimmed.match(/^<[h|o|u|l|t]/)) {
      finalResult.push(line);
      continue;
    }
    
    // For regular text, wrap in paragraph if it's part of a paragraph block
    finalResult.push(line);
  }
  
  // Now handle paragraph wrapping for non-HTML content
  html = finalResult.join('\n');
  
  // Split by double newlines and wrap paragraphs
  html = html.split(/\n\n+/).map(block => {
    block = block.trim();
    if (!block) return '';
    
    // Skip if already HTML tag (headers, lists, tables)
    if (block.match(/^<[h|o|u|l|t]/) || block.includes('<table>')) {
      return block;
    }
    
    // Wrap in paragraph tag
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).filter(p => p).join('\n\n');
  
  return html;
}

// HTML template generator
function generateHtmlReport(
  reportTitle: string,
  companyName: string,
  analysisResult: string,
  dateStr: string,
  timeStr: string,
  isCustomPrompt: boolean = false,
  investorName: string | null = null,
  modelName: string = 'GPT-4 Turbo'
): string {
  const htmlContent = markdownToHtml(analysisResult);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: letter;
      margin-top: 0.75in;
      margin-right: 0.75in;
      margin-bottom: 1in;
      margin-left: 0.75in;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 0;
      margin: 0;
    }
    
    .header {
      border-bottom: 2px solid #d1d5db;
      padding-bottom: 20px;
      margin-bottom: 30px;
      position: relative;
    }
    
    .title {
      font-size: 24pt;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 16pt;
      color: #4b5563;
      margin-bottom: 8px;
    }
    
    .metadata {
      font-size: 10pt;
      color: #6b7280;
      margin-top: 10px;
    }
    
    .confidential {
      position: absolute;
      top: 0;
      right: 0;
      color: #dc2626;
      font-weight: bold;
      font-size: 10pt;
    }
    
    .content {
      margin-top: 30px;
    }
    
    .content h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    
    .content h2 {
      font-size: 16pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    
    .content h3 {
      font-size: 14pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    
    .content p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .content ul, .content ol {
      margin-left: 24px;
      margin-bottom: 12px;
    }
    
    .content li {
      margin-bottom: 6px;
    }
    
    .content strong {
      font-weight: bold;
      color: #1f2937;
    }
    
    .content em {
      font-style: italic;
    }
    
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    
    .content table th,
    .content table td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
    }
    
    .content table th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #1f2937;
    }
    
    .content table tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="confidential">CONFIDENTIAL</div>
    <div class="title">${reportTitle}</div>
    ${isCustomPrompt && investorName ? `
    <div class="metadata" style="color: #4b5563; font-weight: normal; margin-top: 8px; margin-bottom: 4px; font-size: 11pt;">
      Custom Analysis based on criteria by : ${investorName}
    </div>
    ` : ''}
    <div class="company-name">Company: ${companyName}</div>
    <div class="metadata">
      Generated: ${dateStr} at ${timeStr}<br>
      Model: ${modelName}
    </div>
  </div>
  
  <div class="content">
    ${htmlContent}
  </div>
  
</body>
</html>`;
}

interface RequestBody {
  companyId: string;
  companyName?: string;
  analysisId?: string;
  analysisType: 'team' | 'product' | 'market' | 'financial' | 'valuation' | 'scorecard' | 'detail-report' | 'diligence-questions' | 'founder-report';
  prompt?: string;
  documents: Array<{
    id: string;
    name: string;
    path: string;
  }>;
  existingReports?: Array<{
    type: string;
    path: string;
    generated_at: string;
  }>;
}

// Configuration for each analysis type
const analysisConfig = {
  team: {
    promptName: 'Team-Analysis',
    reportTitle: 'Team Analysis Report',
    assistantName: 'Team Analyzer',
    assistantInstructions: 'You are an expert at analyzing startup teams and evaluating their capability to execute on their vision. Provide detailed, actionable insights based on the documents provided.',
    vectorStoreName: 'Team Analysis',
    historyLabel: 'Analyze-Team',
  },
  product: {
    promptName: 'Product-Analysis',
    reportTitle: 'Product Analysis Report',
    assistantName: 'Product Analyzer',
    assistantInstructions: 'You are an expert at analyzing startup products and evaluating their market fit, innovation, and competitive advantages. Provide detailed, actionable insights based on the documents provided.',
    vectorStoreName: 'Product Analysis',
    historyLabel: 'Analyze-Product',
  },
  market: {
    promptName: 'Market-Analysis',
    reportTitle: 'Market Analysis Report',
    assistantName: 'Market Analyzer',
    assistantInstructions: 'You are an expert at analyzing market opportunities, competitive landscapes, and market positioning for startups. Provide detailed, actionable insights based on the documents provided.',
    vectorStoreName: 'Market Analysis',
    historyLabel: 'Analyze-Market',
  },
  financial: {
    promptName: 'Financial-Analysis',
    reportTitle: 'Financial Analysis Report',
    assistantName: 'Financial Analyzer',
    assistantInstructions: 'You are an expert at analyzing startup financials, including revenue models, unit economics, burn rate, and financial projections. Provide detailed, actionable insights based on the documents provided.',
    vectorStoreName: 'Financial Analysis',
    historyLabel: 'Analyze-Financials',
  },
  valuation: {
    promptName: 'Valuation-Analysis',
    reportTitle: 'Valuation Analysis Report',
    assistantName: 'Valuation Analyzer',
    assistantInstructions: 'You are an expert at analyzing startup valuations, including company valuation methodologies, comparable company analysis, market multiples, and investment terms. Provide detailed, actionable insights based on the documents provided.',
    vectorStoreName: 'Valuation Analysis',
    historyLabel: 'Analyze-Valuation',
  },
  scorecard: {
    promptName: 'Create-ScoreCard',
    reportTitle: 'Score-Card',
    assistantName: 'Investment Scorer',
    assistantInstructions: 'You are an expert at creating investment scorecards. Review all provided analysis reports and create a comprehensive scoring assessment. Provide clear scores and ratings based on the analysis.',
    vectorStoreName: 'Score Card Creation',
    historyLabel: 'Create-ScoreCard',
  },
  'detail-report': {
    promptName: 'Create-Detail-Report',
    reportTitle: 'Comprehensive Detail Report',
    assistantName: 'Report Assembler',
    assistantInstructions: 'You are a report assembler. Your task is simple: combine the provided analysis reports into one comprehensive document. Read each report in full and include ALL of its content. Do NOT summarize, condense, or synthesize. Do NOT create new analysis. Simply combine the reports in this order: 1) Product Analysis, 2) Market Analysis, 3) Team Analysis, 4) Financial Analysis, 5) Valuation Analysis. Preserve every detail from each report. Use clear section headers to separate each report type.',
    vectorStoreName: 'Detail Report Assembly',
    historyLabel: 'Create-DetailReport',
  },
  'diligence-questions': {
    promptName: 'Create-Diligence-Questions',
    reportTitle: 'Due Diligence Questions',
    assistantName: 'Diligence Question Generator',
    assistantInstructions: 'You are an expert at generating comprehensive due diligence questions. Review all provided analysis reports and documents to create targeted, specific questions organized by category (Product, Market, Team, Financials). Focus on gaps, risks, and areas requiring further investigation.',
    vectorStoreName: 'Diligence Questions Generation',
    historyLabel: 'Create-DiligenceQuestions',
  },
  'founder-report': {
    promptName: 'Create-Founder-Report',
    reportTitle: 'Founder Feedback Report',
    assistantName: 'Founder Advisor',
    assistantInstructions: 'You are an expert advisor providing constructive feedback to founders. Review all analysis reports and pitch deck materials to create helpful, actionable feedback. Be honest but supportive, focusing on how founders can improve their business, pitch, and fundraising approach.',
    vectorStoreName: 'Founder Feedback Generation',
    historyLabel: 'Create-FounderReport',
  },
};

// Helper function to extract scores from analysis result
function extractScoresFromAnalysis(analysisResult: string, analysisType: string): string | null {
  try {
    console.log(`[extractScores] Starting score extraction for ${analysisType}`);
    console.log(`[extractScores] Analysis result length: ${analysisResult.length}`);
    
    // Determine the analysis title based on type
    const analysisTitles: Record<string, string> = {
      'product': 'Product Analysis',
      'market': 'Market Analysis',
      'team': 'Team Analysis',
      'financial': 'Financials Analysis',
      'valuation': 'Valuation Analysis'
    };
    
    // Determine the short name for the scorecard header
    const analysisShortNames: Record<string, string> = {
      'product': 'Product',
      'market': 'Market',
      'team': 'Team',
      'financial': 'Financial',
      'valuation': 'Valuation'
    };
    
    const title = analysisTitles[analysisType] || `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis`;
    const shortName = analysisShortNames[analysisType] || analysisType.charAt(0).toUpperCase() + analysisType.slice(1);
    
    // Look for overall score patterns - expanded patterns
    // Patterns: "Overall Score: 8.03", "Score: 8.03", "Overall: 8.03", "Total Score: 8.03"
    // Also look for "8.03/10" or "8.03 out of 10", markdown bold, etc.
    const overallScorePatterns = [
      /(?:Overall\s+)?(?:Score|Rating|Assessment)[:\s]+(\d+\.?\d*)/i,
      /(?:Overall|Total)[:\s]+(\d+\.?\d*)/i,
      /Score[:\s]+(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*\/\s*10/i,
      /(\d+\.?\d*)\s+out\s+of\s+10/i,
      /Overall\s+(\d+\.?\d*)/i,
      /\*\*Overall\s+Score\*\*[:\s]*(\d+\.?\d*)/i,
      /\*\*Score\*\*[:\s]*(\d+\.?\d*)/i,
      /##\s*Overall\s+Score[:\s]*(\d+\.?\d*)/i
    ];
    
    let overallScore: string | null = null;
    for (const pattern of overallScorePatterns) {
      const match = analysisResult.match(pattern);
      if (match && match[1]) {
        const score = parseFloat(match[1]);
        if (score >= 0 && score <= 10) {
          overallScore = score.toFixed(2);
          console.log(`[extractScores] Found overall score: ${overallScore} using pattern: ${pattern}`);
          break;
        }
      }
    }
    
    // If no overall score found, try to find it in a summary section or header
    if (!overallScore) {
      // Look for patterns like "Product Analysis: 8.03" or "Product Score: 8.03"
      const titlePattern = new RegExp(`${title.replace(/\s+/g, '\\s+')}[\\s:]+(\\d+\\.?\\d*)`, 'i');
      const titleMatch = analysisResult.match(titlePattern);
      if (titleMatch && titleMatch[1]) {
        const score = parseFloat(titleMatch[1]);
        if (score >= 0 && score <= 10) {
          overallScore = score.toFixed(2);
          console.log(`[extractScores] Found overall score in title: ${overallScore}`);
        }
      }
    }
    
    // Try to find score in markdown tables
    if (!overallScore) {
      const tableMatch = analysisResult.match(/\|\s*(?:Overall|Total|Score).*?\|\s*(\d+\.?\d*)\s*\|/i);
      if (tableMatch && tableMatch[1]) {
        const score = parseFloat(tableMatch[1]);
        if (score >= 0 && score <= 10) {
          overallScore = score.toFixed(2);
          console.log(`[extractScores] Found overall score in table: ${overallScore}`);
        }
      }
    }
    
    // If still no overall score, log a sample of the text for debugging
    if (!overallScore) {
      const sample = analysisResult.substring(0, 1000);
      console.log(`[extractScores] No overall score found for ${analysisType}. Sample text:`, sample);
      // Still try to extract categories - sometimes categories have scores but no overall
    }
    
    // Extract sub-categories and their scores
    // Look for patterns like:
    // - "Problem/Solution Fit: 8.5"
    // - "Problem/Solution Fit - 8.5"
    // - "Problem/Solution Fit, 8.5"
    // - Table rows with scores
    const categoryPatterns = [
      /^[-*•]\s*(.+?)\s*[:–-]\s*(\d+\.?\d*)/gmi,
      /^(.+?)\s*[:–-]\s*(\d+\.?\d*)/gmi,
      /(.+?)\s*,\s*(\d+\.?\d*)/gmi
    ];
    
    const categories: Array<{ name: string; score: string }> = [];
    const seenCategories = new Set<string>();
    
    // Try to find category scores in the text
    for (const pattern of categoryPatterns) {
      let match;
      while ((match = pattern.exec(analysisResult)) !== null) {
        const categoryName = match[1].trim();
        const scoreStr = match[2].trim();
        const score = parseFloat(scoreStr);
        
        // Filter out invalid scores and duplicates
        if (score >= 0 && score <= 10 && !seenCategories.has(categoryName.toLowerCase())) {
          // Skip if it's the overall score line
          if (!categoryName.toLowerCase().includes('overall') && 
              !categoryName.toLowerCase().includes('total') &&
              categoryName.length > 3) {
            categories.push({ name: categoryName, score: score.toFixed(2) });
            seenCategories.add(categoryName.toLowerCase());
          }
        }
      }
    }
    
    // Also try to extract from markdown tables
    const tableRows = analysisResult.match(/^\|(.+?)\|$/gm);
    if (tableRows && tableRows.length > 1) {
      // Skip header row (usually second row with dashes)
      for (let i = 0; i < tableRows.length; i++) {
        const row = tableRows[i].trim();
        if (row.includes('---') || row.includes('===')) continue; // Skip separator row
        
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2) {
          const categoryName = cells[0].replace(/\*\*/g, '').trim();
          const scoreStr = cells[cells.length - 1].replace(/\*\*/g, '').trim();
          const score = parseFloat(scoreStr);
          
          if (!isNaN(score) && score >= 0 && score <= 10 && 
              !seenCategories.has(categoryName.toLowerCase()) &&
              !categoryName.toLowerCase().includes('overall') &&
              !categoryName.toLowerCase().includes('total') &&
              categoryName.length > 3) {
            categories.push({ name: categoryName, score: score.toFixed(2) });
            seenCategories.add(categoryName.toLowerCase());
            console.log(`[extractScores] Found category from table: ${categoryName} = ${score.toFixed(2)}`);
          }
        }
      }
    }
    
    console.log(`[extractScores] Found ${categories.length} categories`);
    
    // Build the formatted string in the requested format:
    // First line: "8.5/10: Product"
    // Subsequent lines: "8.1: Product-Market Fit", "9.1: IP/Defensibility"
    if (categories.length > 0) {
      if (overallScore) {
        // Format: "8.5/10: Product"
        const header = `${overallScore}/10: ${shortName}`;
        // Format: "8.1: Product-Market Fit" (score first, then colon, then category name)
        const categoryLines = categories.map(cat => `${cat.score}: ${cat.name}`).join('\n');
        const result = `${header}\n${categoryLines}`;
        console.log(`[extractScores] Returning score card with ${categories.length} categories`);
        return result;
      } else {
        // If no overall score but we have categories, just return categories
        const categoryLines = categories.map(cat => `${cat.score}: ${cat.name}`).join('\n');
        console.log(`[extractScores] Returning score card with ${categories.length} categories (no overall score)`);
        return categoryLines;
      }
    }
    
    // If no categories found but we have overall score, return just the header
    if (overallScore) {
      console.log(`[extractScores] Returning score card with overall score only: ${overallScore}`);
      return `${overallScore}/10: ${shortName}`;
    }
    
    console.log(`[extractScores] No scores found, returning null`);
    return null;
  } catch (error) {
    console.error('Error extracting scores:', error);
    return null;
  }
}

// Helper function to format company information into a profile document
function formatCompanyProfile(company: any): string {
  let profile = '=== COMPANY PROFILE (FROM DATABASE) ===\n\n';
  profile += '**CRITICAL: This information comes directly from the company database and takes PRIORITY over all other sources.**\n';
  profile += 'If you find conflicting information in documents or need to make assumptions, ALWAYS use the information from this profile.\n\n';
  
  const formatPriorityValue = (label: string, values: Array<string | null | undefined>) => {
    const cleaned = values
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    profile += `${label}: ${cleaned.length > 0 ? cleaned.join(' | ') : 'Not provided'}\n`;
  };

  const sectorStrings =
    Array.isArray(company.industry_sectors)
      ? company.industry_sectors
          .map((sector: any) => [sector?.sector, sector?.sub_sector].filter(Boolean).join(' - '))
          .filter((value: string) => value && value.trim().length > 0)
      : [];

  profile += '=== PRIORITY COMPANY DATA (OVERRIDE IF CONFLICT) ===\n\n';

  formatPriorityValue('Description', [company.description]);
  formatPriorityValue('Industry / Sector Focus', [
    company.industry,
    sectorStrings.length > 0 ? sectorStrings.join(', ') : null,
  ]);

  const revenueStructured = company.annual_revenue_value
    ? `${company.annual_revenue_value}${company.annual_revenue_units ? ` ${company.annual_revenue_units}` : ''}`
    : null;

  formatPriorityValue('Revenue', [
    company.revenue,
    revenueStructured,
    company.annual_revenue_period ? `Period: ${company.annual_revenue_period}` : null,
    company.annual_revenue_raw,
  ]);

  const fundingStructured = company.investment_amount_value
    ? `${company.investment_amount_value}${company.investment_amount_units ? ` ${company.investment_amount_units}` : ''}`
    : null;

  formatPriorityValue('Funding Terms', [
    company.funding_terms,
    fundingStructured,
    company.investment_instrument,
    company.investment_other_terms,
    company.investment_amount_raw,
    company.funding_sought,
  ]);

  const valuationStructured = company.valuation_value
    ? `${company.valuation_value}${company.valuation_units ? ` ${company.valuation_units}` : ''}`
    : null;

  formatPriorityValue('Valuation', [
    company.valuation,
    valuationStructured,
    company.valuation_type ? `Type: ${company.valuation_type}` : null,
    company.valuation_raw,
  ]);

  profile += '\n';

  // Basic Information
  profile += '## COMPANY INFORMATION\n\n';
  if (company.name) profile += `Company Name: ${company.name}\n`;
  if (company.industry) profile += `Industry: ${company.industry}\n`;
  if (company.address) profile += `Address: ${company.address}\n`;
  if (company.country) profile += `Country: ${company.country}\n`;
  if (company.description) profile += `Description: ${company.description}\n`;
  if (company.url) profile += `Website: ${company.url}\n`;
  profile += '\n';
  
  // Contact Information
  if (company.contact_name_1 || company.email_1 || company.phone_1) {
    profile += '## PRIMARY CONTACT\n\n';
    if (company.contact_name_1) profile += `Name: ${company.contact_name_1}\n`;
    if (company.title_1) profile += `Title: ${company.title_1}\n`;
    if (company.email_1) profile += `Email: ${company.email_1}\n`;
    if (company.phone_1) profile += `Phone: ${company.phone_1}\n`;
    profile += '\n';
  }
  
  if (company.contact_name_2 || company.email_2 || company.phone_2) {
    profile += '## SECONDARY CONTACT\n\n';
    if (company.contact_name_2) profile += `Name: ${company.contact_name_2}\n`;
    if (company.title_2) profile += `Title: ${company.title_2}\n`;
    if (company.email_2) profile += `Email: ${company.email_2}\n`;
    if (company.phone_2) profile += `Phone: ${company.phone_2}\n`;
    profile += '\n';
  }
  
  // Financial Information (Priority Data)
  profile += '## FINANCIAL INFORMATION (PRIORITY DATA)\n\n';
  profile += '**These values are provided by the company and take absolute precedence over any values found in documents.**\n\n';
  
  // Valuation
  if (company.valuation_value || company.valuation_raw) {
    profile += '### Valuation\n';
    if (company.valuation_value) profile += `Value: ${company.valuation_value}`;
    if (company.valuation_units) profile += ` ${company.valuation_units}`;
    profile += '\n';
    if (company.valuation_type) profile += `Type: ${company.valuation_type}\n`;
    if (company.valuation_raw) profile += `Raw Details: ${company.valuation_raw}\n`;
    profile += '\n';
  }
  
  // Investment Terms
  if (company.investment_amount_value || company.investment_amount_raw) {
    profile += '### Investment Terms\n';
    if (company.investment_amount_value) profile += `Amount: ${company.investment_amount_value}`;
    if (company.investment_amount_units) profile += ` ${company.investment_amount_units}`;
    profile += '\n';
    if (company.investment_instrument) profile += `Instrument: ${company.investment_instrument}\n`;
    if (company.investment_other_terms) profile += `Other Terms: ${company.investment_other_terms}\n`;
    if (company.investment_amount_raw) profile += `Raw Details: ${company.investment_amount_raw}\n`;
    profile += '\n';
  }
  
  // Annual Revenue
  if (company.annual_revenue_value || company.annual_revenue_raw) {
    profile += '### Annual Revenue\n';
    if (company.annual_revenue_value) profile += `Value: ${company.annual_revenue_value}`;
    if (company.annual_revenue_units) profile += ` ${company.annual_revenue_units}`;
    profile += '\n';
    if (company.annual_revenue_period) profile += `Period: ${company.annual_revenue_period}\n`;
    if (company.annual_revenue_raw) profile += `Raw Details: ${company.annual_revenue_raw}\n`;
    profile += '\n';
  }
  
  // Market Size
  if (company.serviceable_market_size_value || company.serviceable_market_size_raw) {
    profile += '### Serviceable Market Size\n';
    if (company.serviceable_market_size_value) profile += `Value: ${company.serviceable_market_size_value}`;
    if (company.serviceable_market_size_units) profile += ` ${company.serviceable_market_size_units}`;
    profile += '\n';
    if (company.serviceable_market_size_basis) profile += `Basis: ${company.serviceable_market_size_basis}\n`;
    if (company.serviceable_market_size_raw) profile += `Raw Details: ${company.serviceable_market_size_raw}\n`;
    profile += '\n';
  }
  
  // Funding Information
  if (company.funding_sought) {
    profile += '### Funding Sought\n';
    profile += `${company.funding_sought}\n\n`;
  }
  
  // Team Members
  if (company.key_team_members && Array.isArray(company.key_team_members) && company.key_team_members.length > 0) {
    profile += '## KEY TEAM MEMBERS\n\n';
    company.key_team_members.forEach((member: any, index: number) => {
      profile += `### Team Member ${index + 1}\n`;
      if (member.name) profile += `Name: ${member.name}\n`;
      if (member.title) profile += `Title: ${member.title}\n`;
      if (member.bio) profile += `Bio: ${member.bio}\n`;
      if (member.experience) profile += `Experience: ${member.experience}\n`;
      profile += '\n';
    });
  }
  
  profile += '=== END OF COMPANY PROFILE ===\n\n';
  
  return profile;
}

interface ScorecardSectionData {
  score?: number;
  summary?: string;
  details?: string[];
}

interface ScorecardSummaryData {
  summary?: string;
  sections?: Record<string, ScorecardSectionData>;
}

function extractScorecardJson(markdown: string): { cleanedText: string; summary: ScorecardSummaryData | null } {
  const startRegex = /===\s*SCORECARD_JSON\s*===/i;
  const endRegex = /===\s*END\s*SCORECARD_JSON\s*===/i;

  const startMatch = startRegex.exec(markdown);
  const endMatch = endRegex.exec(markdown);

  if (!startMatch || !endMatch || endMatch.index <= (startMatch.index + startMatch[0].length)) {
    console.log('[extractScorecardJson] SCORECARD markers not found in output.');
    return { cleanedText: markdown, summary: null };
  }

  let jsonText = markdown.slice(startMatch.index + startMatch[0].length, endMatch.index).trim();
  jsonText = jsonText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  const before = markdown.slice(0, startMatch.index).trimEnd();
  const after = markdown.slice(endMatch.index + endMatch[0].length).trimStart();
  const cleanedText = [before, after].filter(Boolean).join('\n\n').trim();

  try {
    const parsed = JSON.parse(jsonText);
    console.log('[extractScorecardJson] Parsed scorecard JSON successfully.');
    return { cleanedText: cleanedText || markdown.replace(startMatch[0], '').replace(endMatch[0], '').trim(), summary: parsed };
  } catch (error) {
    console.error('[extractScorecardJson] Failed to parse SCORECARD_JSON block:', error);
    console.error('[extractScorecardJson] Raw JSON text:', jsonText);
    return { cleanedText: markdown, summary: null };
  }
}

// Helper function to fetch prompt prefix from database
async function getPromptPrefix(supabaseAdmin: any): Promise<string | null> {
  try {
    const { data: prefixData, error: prefixError } = await supabaseAdmin
      .from('prompts')
      .select('prompt_detail')
      .eq('prompt_name', 'prompt-prefix')
      .maybeSingle();
    
    if (prefixError || !prefixData) {
      console.log('Prompt prefix not found, skipping prefix');
      return null;
    }
    
    console.log('Prompt prefix found, will be applied to database prompts');
    return prefixData.prompt_detail;
  } catch (error) {
    console.error('Error fetching prompt prefix:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const htmlToPdfApiKey = Deno.env.get('HTML_TO_PDF_API_KEY');
    const htmlToPdfEndpoint = Deno.env.get('HTML_TO_PDF_ENDPOINT') || 'https://api.html2pdf.app/v1/generate';

    if (!htmlToPdfApiKey) {
      return new Response(
        JSON.stringify({ error: 'HTML_TO_PDF_API_KEY environment variable is not set' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user's token to get their identity
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unable to authenticate user');
    }

    const investorUserId = user.id;

    // Get LLM preference for the user
    console.log('Fetching LLM preference for user:', investorUserId);
    const { data: llmPreferenceData, error: llmError } = await supabaseAdmin
      .from('llm_preferences')
      .select('preferred_llm')
      .eq('user_id', investorUserId)
      .maybeSingle();

    const preferredLlm = llmPreferenceData?.preferred_llm || 'OpenAI';
    console.log(`User LLM preference: ${preferredLlm}`);

    // Initialize LLM client based on preference
    // Note: Claude doesn't support Assistants API, so we'll use OpenAI for now with Assistants API
    // If user prefers Claude, we'll need to implement alternative approach (future enhancement)
    let openai: OpenAI;
    let useClaude = false;
    
    if (preferredLlm === 'Claude') {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (anthropicApiKey) {
        console.log('Claude preference detected, but Assistants API requires OpenAI. Using OpenAI with note.');
        // TODO: Implement Claude alternative for functions that don't require Assistants API
        useClaude = false; // For now, fall back to OpenAI for Assistants API functions
      }
    }
    
    // Initialize OpenAI client (required for Assistants API)
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY environment variable is not set' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    openai = new OpenAI({ apiKey: openaiApiKey });

    const requestBody: RequestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { 
      companyId,
      companyName: requestCompanyName,
      analysisId: requestAnalysisId,
      analysisType,
      prompt: requestPrompt,
      documents: requestDocuments,
      existingReports: requestExistingReports
    } = requestBody;
    
    console.log('Destructured values:', {
      companyId,
      requestCompanyName,
      analysisId: requestAnalysisId,
      analysisType,
      documentsCount: requestDocuments?.length,
      existingReportsCount: requestExistingReports?.length
    });

    // Validate required fields
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestCompanyName) {
      return new Response(
        JSON.stringify({ error: 'companyName is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!analysisType || !analysisConfig[analysisType]) {
      return new Response(
        JSON.stringify({ error: 'Valid analysisType is required (team, product, market, financial, valuation, scorecard, detail-report, diligence-questions, or founder-report)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For detail-report, diligence-questions, founder-report, scorecard, and valuation, existingReports can be used instead of documents
    if ((analysisType === 'detail-report' || analysisType === 'diligence-questions' || analysisType === 'founder-report' || analysisType === 'scorecard' || analysisType === 'valuation') && requestExistingReports && requestExistingReports.length > 0) {
      // Allow these analysis types to proceed with existing reports instead of documents
      console.log(`Using existing reports for ${analysisType} instead of documents`);
    } else if (!requestDocuments || requestDocuments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents provided for analysis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const config = analysisConfig[analysisType];
    console.log(`Processing ${analysisType} analysis for:`, { companyId, investorUserId });

    // Step 1: Get company details (including all company information for profile)
    console.log('Step 1: Getting company details, requestCompanyName:', requestCompanyName);
    let companyName = requestCompanyName;
    console.log('Step 1: companyName initialized to:', companyName);
    
    // Fetch full company information for company profile
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !companyData) {
      throw new Error('Company not found');
    }
    
    if (!companyName) {
      companyName = companyData.name;
      console.log('Step 1: companyName from database:', companyName);
    }
    
    // Format company profile for inclusion in prompt
    const companyProfile = formatCompanyProfile(companyData);
    console.log('Step 1: Company profile generated, length:', companyProfile.length, 'characters');
    console.log('Step 1: Company data keys:', Object.keys(companyData));
    console.log('Step 1: Valuation fields:', {
      valuation_value: companyData.valuation_value,
      valuation_units: companyData.valuation_units,
      valuation_raw: companyData.valuation_raw,
      funding_sought: companyData.funding_sought,
      annual_revenue_value: companyData.annual_revenue_value,
      annual_revenue_units: companyData.annual_revenue_units
    });
    console.log('Step 1: Company profile preview (first 500 chars):', companyProfile.substring(0, 500));

    // Step 2: Use provided analysis ID or find/create analysis entry
    let analysisId: string = requestAnalysisId || '';
    
    if (!analysisId) {
      const { data: existingAnalysis } = await supabaseAdmin
        .from('analysis')
        .select('id')
        .eq('company_id', companyId)
        .eq('investor_user_id', investorUserId)
        .maybeSingle();

      if (existingAnalysis) {
        analysisId = existingAnalysis.id;
        // Update status to in_progress
        await supabaseAdmin
          .from('analysis')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);
        console.log('Using existing analysis:', analysisId);
      } else {
        // Create new analysis entry
        const { data: newAnalysis, error: analysisError } = await supabaseAdmin
          .from('analysis')
          .insert({
            company_id: companyId,
            investor_user_id: investorUserId,
            status: 'in_progress',
          })
          .select('id')
          .single();

        if (analysisError || !newAnalysis) {
          console.error('Failed to create analysis:', analysisError);
          throw new Error('Failed to create analysis entry');
        }
        analysisId = newAnalysis.id;
        console.log('Created new analysis:', analysisId);
      }
    }

    // Step 3: Get the prompt (check investor_prompts first, then request, then system prompts)
    let promptText: string;
    let isCustomPrompt = false;
    let investorName: string | null = null;

    // Fetch prompt prefix once (will be applied to database prompts only)
    const promptPrefix = await getPromptPrefix(supabaseAdmin);

    // ALWAYS check for custom prompt first, regardless of requestPrompt
    console.log(`Checking for custom prompt for ${config.promptName}...`);
    const { data: customPromptData, error: customPromptError } = await supabaseAdmin
      .from('investor_prompts')
      .select('custom_prompt, user_id')
      .eq('user_id', investorUserId)
      .eq('report_name', config.promptName)
      .maybeSingle();

    if (!customPromptError && customPromptData && customPromptData.custom_prompt) {
      promptText = customPromptData.custom_prompt;
      isCustomPrompt = true;
      console.log(`Using custom prompt from investor_prompts table`);
      
      // Apply prefix to custom prompt from database
      if (promptPrefix && promptText) {
        promptText = promptPrefix + '\n\n' + promptText;
        console.log('Applied prompt prefix to custom prompt from database');
        console.log('Prompt prefix length:', promptPrefix.length, 'characters');
        console.log('Full prompt length after prefix:', promptText.length, 'characters');
      }
      
      // Get investor name for report header
      const { data: investorData } = await supabaseAdmin
        .from('investor_details')
        .select('name, firm_name')
        .eq('user_id', investorUserId)
        .maybeSingle();
      
      investorName = investorData?.name || investorData?.firm_name || 'Investor';
      console.log(`Custom prompt detected. Investor name: ${investorName}`);
    } else if (requestPrompt) {
      // If no custom prompt, use prompt from request
      // Note: requestPrompt is NOT prefixed (only database prompts are prefixed)
      promptText = requestPrompt;
      console.log('Using prompt from request (no custom prompt found)');
    } else {
      // Fall back to system prompt
      console.log(`Fetching ${config.promptName} prompt from prompts table...`);
      const { data: promptData, error: promptError } = await supabaseAdmin
        .from('prompts')
        .select('prompt_detail')
        .eq('prompt_name', config.promptName)
        .single();

      if (promptError || !promptData) {
        console.error('Error fetching prompt:', promptError);
        throw new Error(`${config.promptName} prompt not found in database. Please ensure the prompt exists in the prompts table.`);
      }
      promptText = promptData.prompt_detail;
      console.log('Using system prompt from database');
      
      // Apply prefix to system prompt from database
      if (promptPrefix && promptText) {
        promptText = promptPrefix + '\n\n' + promptText;
        console.log('Applied prompt prefix to system prompt from database');
        console.log('Prompt prefix length:', promptPrefix.length, 'characters');
        console.log('Full prompt length after prefix:', promptText.length, 'characters');
      }
    }

    // Step 4: Process documents or existing reports
    let fileIds: string[] = [];
    
    // For scorecard, diligence-questions, founder-report, detail-report, and valuation, use existing reports if available
    // detail-report now uses existing reports instead of documents to avoid timeouts
    if ((analysisType === 'scorecard' || analysisType === 'diligence-questions' || analysisType === 'founder-report' || analysisType === 'detail-report' || analysisType === 'valuation') && requestExistingReports && requestExistingReports.length > 0) {
      console.log(`Processing ${requestExistingReports.length} existing reports for ${analysisType} generation...`);
      console.log('Existing reports received:', JSON.stringify(requestExistingReports, null, 2));
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const report of requestExistingReports) {
        console.log('Processing existing report:', report.type, report.path);
        console.log('Report object:', JSON.stringify(report, null, 2));
        
        try {
          // Validate report path
          if (!report.path) {
            console.error('Report path is missing:', report);
            failureCount++;
            continue;
          }
          
          // Generate signed URL for the existing report
          console.log(`Generating signed URL for report: ${report.type} at path: ${report.path}`);
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('analysis-output-docs')
            .createSignedUrl(report.path, 3600);

          if (signedUrlError || !signedUrlData) {
            console.error('Error generating signed URL for existing report:', signedUrlError);
            console.error('Report path that failed:', report.path);
            failureCount++;
            continue;
          }

          const signedUrl = signedUrlData.signedUrl;
          console.log('Signed URL generated for existing report:', report.type);

          // Download the existing report PDF
          console.log('Downloading existing report PDF...');
          const pdfResponse = await fetch(signedUrl);
          if (!pdfResponse.ok) {
            console.error(`Failed to download PDF. Status: ${pdfResponse.status}, StatusText: ${pdfResponse.statusText}`);
            failureCount++;
            continue;
          }

          const pdfBuffer = await pdfResponse.arrayBuffer();
          console.log('Existing report PDF downloaded, size:', pdfBuffer.byteLength);
          
          if (pdfBuffer.byteLength === 0) {
            console.error('Downloaded PDF is empty');
            failureCount++;
            continue;
          }

          const filename = report.path.split('/').pop() || `${report.type}.pdf`;
          const pdfFile = new File([pdfBuffer], filename, { type: 'application/pdf' });

          // Upload to OpenAI
          console.log('Uploading existing report to OpenAI...');
          const file = await openai.files.create({
            file: pdfFile,
            purpose: 'assistants',
          });
          console.log('Existing report uploaded to OpenAI:', file.id);
          fileIds.push(file.id);
          successCount++;
        } catch (reportError) {
          console.error(`Error processing report ${report.type}:`, reportError);
          console.error('Error details:', reportError instanceof Error ? reportError.message : String(reportError));
          console.error('Error stack:', reportError instanceof Error ? reportError.stack : 'No stack trace');
          failureCount++;
          // Continue processing other reports instead of failing entirely
          continue;
        }
      }
      
      console.log(`Report processing summary: ${successCount} succeeded, ${failureCount} failed out of ${requestExistingReports.length} total`);
      
      // Validate that we have at least one file
      if (fileIds.length === 0) {
        const errorMsg = `No files were successfully processed from existing reports. ${failureCount} reports failed to process. Check logs for details.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      // For regular analysis or when no existing reports, process documents
      console.log(`Processing ${requestDocuments.length} documents...`);
      
      for (const doc of requestDocuments) {
        console.log('Generating signed URL for:', doc.path);
        console.log('Document object:', JSON.stringify(doc, null, 2));
        
        // Validate document path
        if (!doc.path) {
          console.error('Document path is missing:', doc);
          throw new Error(`Document path is missing for file: ${doc.name}`);
        }
        
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('company-documents')
          .createSignedUrl(doc.path, 3600);

      if (signedUrlError || !signedUrlData) {
        console.error('Error generating signed URL:', signedUrlError);
        throw new Error(`Failed to generate signed URL for file: ${doc.name}`);
      }

      const signedUrl = signedUrlData.signedUrl;
      console.log('Signed URL generated successfully');

      // Download the PDF
      console.log('Downloading PDF from signed URL...');
      const pdfResponse = await fetch(signedUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      console.log('PDF downloaded, size:', pdfBuffer.byteLength);

      const filename = doc.path.split('/').pop() || doc.name;
      const pdfFile = new File([pdfBuffer], filename, { type: 'application/pdf' });

      // Upload to OpenAI
      console.log('Uploading file to OpenAI...');
      const file = await openai.files.create({
        file: pdfFile,
        purpose: 'assistants',
      });
      console.log('File uploaded to OpenAI:', file.id);
      fileIds.push(file.id);
    }
    }

    // Step 5: Create vector store
    console.log('Creating vector store...');
    console.log('File IDs to upload:', fileIds);
    console.log('Number of files:', fileIds.length);
    
    // Validate we have files before creating vector store
    if (fileIds.length === 0) {
      throw new Error('Cannot create vector store: No files were successfully processed');
    }
    
    let vectorStore;
    try {
      vectorStore = await openai.beta.vectorStores.create({
        name: config.vectorStoreName,
        file_ids: fileIds,
      });
      console.log('Vector store created:', vectorStore.id);
      console.log('Vector store file count:', vectorStore.file_counts);
    } catch (vectorStoreError) {
      console.error('Error creating vector store:', vectorStoreError);
      throw new Error(`Failed to create vector store: ${vectorStoreError instanceof Error ? vectorStoreError.message : 'Unknown error'}`);
    }
    
    // Wait for vector store to index the files
    console.log('Waiting for vector store to index files...');
    let vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
    let attempts = 0;
    
    // Optimized timeout configuration:
    // - detail-report: 30 seconds (just combining reports, minimal indexing needed)
    // - team/product/market/financial: 60 seconds (reduced from 240 seconds)
    // - valuation: 60 seconds (uses existing reports)
    // - scorecard/diligence/founder: 60 seconds (uses existing reports)
    const maxAttempts = analysisType === 'detail-report' ? 30 : 60;
    const pollInterval = 1000; // Check every 1 second instead of 2 seconds (faster detection)
    const minRequiredCompleted = 1; // Proceed if at least 1 file is indexed (OpenAI can work with partial indexing)
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
      attempts++;
      
      console.log(`Vector store status check ${attempts}/${maxAttempts}:`, vectorStoreStatus.status);
      console.log(`File counts:`, vectorStoreStatus.file_counts);
      
      // Check if all files are completed (ideal case)
      if (vectorStoreStatus.file_counts && 
          vectorStoreStatus.file_counts.completed > 0 &&
          vectorStoreStatus.file_counts.completed === vectorStoreStatus.file_counts.total) {
        console.log('All files indexed successfully!');
        break;
      }
      
      // Optimized: Proceed if we have at least one file indexed (OpenAI can work with partial indexing)
      // This significantly reduces wait time for large document sets
      if (vectorStoreStatus.file_counts && 
          vectorStoreStatus.file_counts.completed >= minRequiredCompleted &&
          attempts >= 10) { // Wait at least 10 seconds before proceeding with partial indexing
        console.log(`Proceeding with partial indexing: ${vectorStoreStatus.file_counts.completed}/${vectorStoreStatus.file_counts.total} files indexed`);
        break;
      }
      
      // Check if indexing failed
      if (vectorStoreStatus.file_counts && vectorStoreStatus.file_counts.failed > 0) {
        // Only fail if ALL files failed, otherwise proceed with successful ones
        if (vectorStoreStatus.file_counts.failed === vectorStoreStatus.file_counts.total) {
          console.error('All file indexing failed!');
          throw new Error(`File indexing failed: ${vectorStoreStatus.file_counts.failed} file(s) failed to index`);
        } else {
          console.warn(`Some files failed to index (${vectorStoreStatus.file_counts.failed}), but proceeding with successful ones`);
          break;
        }
      }
      
      // If we've exhausted attempts and still not completed
      if (attempts >= maxAttempts) {
        // Proceed anyway if we have at least one file indexed
        if (vectorStoreStatus.file_counts && vectorStoreStatus.file_counts.completed >= minRequiredCompleted) {
          console.warn(`Vector store indexing timeout - proceeding with ${vectorStoreStatus.file_counts.completed} indexed files`);
          break;
        } else {
          console.warn('Vector store indexing timeout - no files indexed, proceeding anyway (may cause issues)');
          break;
        }
      }
    }
    
    console.log('Final vector store status:', vectorStoreStatus.status);
    console.log('Final file counts:', vectorStoreStatus.file_counts);

    // Step 6: Create assistant with GPT-4 Turbo
    console.log('Creating assistant...');
    const assistant = await openai.beta.assistants.create({
      name: config.assistantName,
      instructions: config.assistantInstructions,
      model: 'gpt-4-turbo-preview',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    });
    console.log('Assistant created:', assistant.id);

    // Step 7: Create thread and send prompt
    console.log('Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);

    console.log('Adding message to thread with custom prompt...');
    
    // For valuation analysis, add special emphasis on company database values
    let valuationSpecificInstructions = '';
    if (analysisType === 'valuation') {
      valuationSpecificInstructions = `

=== VALUATION ANALYSIS SPECIFIC INSTRUCTIONS ===

**CRITICAL: COMPANY DATABASE VALUES TAKE ABSOLUTE PRIORITY**

The Company Profile above contains authoritative financial data directly from the company database. For valuation analysis:

1. **VALUATION VALUES**: If the Company Profile contains valuation_value, valuation_type, or valuation_raw, use these EXACT values. These override any valuation found in analysis reports or documents.

2. **FUNDING SOUGHT**: If the Company Profile contains funding_sought, investment_amount_value, or investment_amount_raw, use these EXACT values. These represent what the company is actually seeking and override any conflicting information.

3. **REVENUE DATA**: If the Company Profile contains annual_revenue_value, annual_revenue_units, or annual_revenue_raw, use these EXACT values. These are the company's official revenue figures and override any revenue estimates in analysis reports.

4. **ANALYSIS REPORTS**: Use the provided analysis reports (Product, Market, Team, Financials) to understand the company's context, strengths, and market position, but when values conflict with Company Profile data, ALWAYS use Company Profile values.

5. **EXPLICIT OVERRIDES**: In your valuation analysis, explicitly state when you are using Company Profile values, especially if they differ from what might be found in the analysis reports. For example: "Based on the company database, the current valuation is [value] and funding sought is [amount], which takes precedence over any estimates found in the analysis reports."

6. **SYNTHESIS**: Combine the authoritative financial data from the Company Profile with the strategic insights from the analysis reports to provide a comprehensive valuation assessment.

`;
    }
    
    let scorecardJsonInstruction = '';
    if (analysisType === 'scorecard') {
      scorecardJsonInstruction = `
=== SCORECARD JSON OUTPUT REQUIREMENTS ===

At the very end of your response, after all narrative content, include a JSON object enclosed between the markers:
=== SCORECARD_JSON ===
{ ... }
=== END SCORECARD_JSON ===

JSON schema (all keys required):
{
  "summary": "<Overall summary paragraph>",
  "sections": {
    "Product": { "score": <number>, "summary": "<short paragraph>", "details": ["...", "..."] },
    "Market": { "score": <number>, "summary": "<short paragraph>", "details": ["...", "..."] },
    "Team": { "score": <number>, "summary": "<short paragraph>", "details": ["...", "..."] },
    "Financials": { "score": <number>, "summary": "<short paragraph>", "details": ["...", "..."] }
  }
}

Rules:
- Use numeric scores (decimals allowed).
- Ensure each section appears even if data is limited (note gaps explicitly).
- Provide 2-4 bullet strings in "details" highlighting key observations.
- The JSON must be valid (double quotes, no trailing commas) and not wrapped in markdown code fences.
`;
    }

    // For detail-report, use simplified instructions - just combine reports
    let enhancedPrompt: string;
    if (analysisType === 'detail-report' && requestExistingReports && requestExistingReports.length > 0) {
      // Simplified prompt for detail-report - just combine existing reports
      enhancedPrompt = `${companyProfile}

=== DETAIL REPORT ASSEMBLY INSTRUCTIONS ===

Your task is simple: combine the provided analysis reports into one comprehensive document.

STEPS:
1. Use the file_search tool to read each analysis report PDF
2. For each report, include ALL of its content - do NOT summarize or condense
3. Combine reports in this order:
   - Product Analysis Report
   - Market Analysis Report  
   - Team Analysis Report
   - Financial Analysis Report
   - Valuation Analysis Report
4. Use clear section headers (## Product Analysis, ## Market Analysis, etc.) to separate each report
5. Preserve every detail, score, assessment, and recommendation from each report
6. Do NOT create new analysis or synthesis
7. Do NOT create an executive summary unless one already exists in the reports
8. Simply combine the reports as-is, preserving all content

${promptText}

CRITICAL: Read each report in full using file_search and include its complete content. Do not summarize or synthesize.`;
    } else {
      // Standard prompt for other analysis types
      enhancedPrompt = `${companyProfile}

=== ANALYSIS INSTRUCTIONS ===

CRITICAL PRIORITY RULES:
1. **ALWAYS use information from the Company Profile section above** when it is available
2. The PRIORITY COMPANY DATA section (Description, Industry/Sector, Revenue, Funding Terms, Valuation) overrides any conflicting or missing information found in documents or prior analyses
3. Documents may contain outdated or conflicting information - the Company Profile takes precedence
4. Only use information from documents (via file_search) to fill gaps where Company Profile data is missing
5. If you find conflicting information, explicitly state in your analysis that you are using the Company Profile value and note the discrepancy
6. When you cite those priority fields, restate the exact Company Profile values so the reader knows which numbers are authoritative

${valuationSpecificInstructions}

IMPORTANT: You have access to uploaded documents via the file_search tool. You MUST use file_search to read and analyze the company's pitch deck and other uploaded materials, but remember to prioritize Company Profile information above.

${promptText}

${scorecardJsonInstruction}

CRITICAL: Before writing your analysis, you MUST:
1. First review the Company Profile section (this is the most authoritative source)
2. Use the file_search tool to search through the uploaded documents
3. Use Company Profile values when available, document values only as supplementary
4. Extract and synthesize information following the priority rules above
5. Use this synthesized information in your analysis

IMPORTANT OUTPUT FORMATTING RULES:
- Do NOT include model names (like "GPT-4o", "Claude", "GPT-4", etc.) anywhere in your output
- Do NOT include generation metadata (dates, times, model information) in your analysis content
- **Do NOT include report titles or headers (e.g., "Team Analysis Report", "Company Name - Analysis Report", "Company Name Leadership Team Analysis")**
- **Do NOT include report metadata lines (e.g., "Date:", "LLM Model:", "Generated:", "Custom Analysis:", "Company:")**
- **Do NOT include any secondary headers or sub-headers with company name and analysis type**
- **The report header with title, company name, date, and model information will be automatically added by the system**
- **Start your response directly with the analysis content - begin with section headers like "## Overall Team Assessment" or "## Product Analysis" etc.**
- **Do NOT include any introductory text, headers, or metadata before your first section header**
- Focus only on the analysis content itself
- Write your analysis as if it's a standalone report document

Do NOT provide generic placeholder analysis. You must analyze the actual uploaded documents, prioritizing Company Profile information.`;
    
    console.log('Step 7: Enhanced prompt length:', enhancedPrompt.length, 'characters');
    console.log('Step 7: Enhanced prompt preview (first 1000 chars):', enhancedPrompt.substring(0, 1000));
    console.log('Step 7: Enhanced prompt contains company profile:', enhancedPrompt.includes('=== COMPANY PROFILE (FROM DATABASE) ==='));
    
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: enhancedPrompt,
    });

    // Step 8: Run the assistant
    console.log('Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('Initial run status:', runStatus.status);

    // Wait for completion
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Run status:', runStatus.status);
    }

    if (runStatus.status !== 'completed') {
      console.error('Run failed. Full status object:', JSON.stringify(runStatus, null, 2));
      
      let errorDetails = `Run failed with status: ${runStatus.status}`;
      
      if (runStatus.last_error) {
        errorDetails += `\nError code: ${runStatus.last_error.code}`;
        errorDetails += `\nError message: ${runStatus.last_error.message}`;
        console.error('Last error:', runStatus.last_error);
      }
      
      if (runStatus.status === 'failed' && runStatus.incomplete_details) {
        console.error('Incomplete details:', runStatus.incomplete_details);
        errorDetails += `\nIncomplete reason: ${runStatus.incomplete_details.reason}`;
      }
      
      throw new Error(errorDetails);
    }

    // Step 9: Get the response
    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || lastMessage.content[0].type !== 'text') {
      throw new Error('No text response from assistant');
    }

    let analysisResult = lastMessage.content[0].text.value;
    let scorecardSummary: ScorecardSummaryData | null = null;
    console.log('Analysis completed, length:', analysisResult.length);

    // Strip duplicate headers from analysis result
    // Remove lines that look like report titles or headers
    const lines = analysisResult.split('\n');
    const filteredLines: string[] = [];
    let skipHeaderSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      // Skip lines that are report titles or headers
      if (
        // Skip report title patterns (any combination of company name + analysis type)
        (lowerLine.includes('analysis report') && 
         (lowerLine.includes(companyName.toLowerCase()) || lowerLine.includes('team') || lowerLine.includes('product') || lowerLine.includes('market') || lowerLine.includes('financial') || lowerLine.includes('leadership'))) ||
        // Skip lines that are just company name + analysis type (e.g., "DigitalAPI Corp. Leadership Team Analysis")
        (lowerLine.includes(companyName.toLowerCase()) && (lowerLine.includes('leadership') || lowerLine.includes('team') || lowerLine.includes('product') || lowerLine.includes('market') || lowerLine.includes('financial')) && (lowerLine.includes('analysis') || lowerLine.includes('report'))) ||
        // Skip metadata lines
        (lowerLine.startsWith('date:') || lowerLine.startsWith('llm model:') || lowerLine.startsWith('model:') || 
         lowerLine.startsWith('generated:') || lowerLine.startsWith('custom analysis:') || lowerLine.startsWith('company:') ||
         lowerLine.match(/^(date|llm|model|generated|custom|company):/i)) ||
        // Skip lines that are variations of report titles
        (lowerLine.match(/^.*\s+(analysis|report|assessment)$/i) && lowerLine.length < 100)
      ) {
        // Skip this line and any following blank lines
        skipHeaderSection = true;
        continue;
      }
      
      // Reset skip flag if we hit actual content (starts with ## or content)
      if (line.startsWith('##') || (line.length > 0 && !skipHeaderSection)) {
        skipHeaderSection = false;
      }
      
      // Only add line if we're not in header skip mode or if it's actual content
      if (!skipHeaderSection || line.startsWith('##') || (line.length > 0 && !lowerLine.match(/^(date|llm|model|generated|custom|company):/i))) {
        filteredLines.push(lines[i]);
      }
    }
    
    // Join back and clean up multiple blank lines
    let cleanedResult = filteredLines.join('\n').replace(/\n{3,}/g, '\n\n');
    
    // If we removed too much, fall back to original (safety check)
    if (cleanedResult.length < analysisResult.length * 0.5) {
      console.log('Warning: Too much content removed, using original result');
      cleanedResult = analysisResult;
    } else {
      console.log(`Cleaned result: removed ${analysisResult.length - cleanedResult.length} characters`);
    }
    
    analysisResult = cleanedResult;

    if (analysisType === 'scorecard') {
      const { cleanedText, summary } = extractScorecardJson(analysisResult);
      analysisResult = cleanedText;
      if (summary) {
        scorecardSummary = summary;
        console.log('[scorecard] JSON summary extracted and ready to store.');
      } else {
        console.log('[scorecard] No JSON summary detected in LLM output.');
      }
    }

    // Step 10: Generate PDF Report using HTML-to-PDF
    console.log('Generating HTML/CSS PDF report via external API...');
    console.log('isCustomPrompt:', isCustomPrompt);
    console.log('investorName:', investorName);
    
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const htmlContent = generateHtmlReport(
      config.reportTitle,
      companyName,
      analysisResult,
      dateStr,
      timeStr,
      isCustomPrompt,
      investorName,
      'GPT-4 Turbo'
    );

    // Call external HTML->PDF API
    console.log('Calling HTML->PDF API:', htmlToPdfEndpoint);
    console.log('HTML content length:', htmlContent.length);
    
    let convertResponse: Response;
    try {
      // Try html2pdf.app format first (Bearer token)
      convertResponse = await fetch(htmlToPdfEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${htmlToPdfApiKey}`
        },
        body: JSON.stringify({
          html: htmlContent,
          format: 'Letter',
          margin: {
            top: '0.75in',
            right: '0.75in',
            bottom: '0.75in',
            left: '0.75in'
          },
          landscape: false,
          printBackground: true
        })
      });
      
      // If that fails, try with apiKey in body
      if (!convertResponse.ok && convertResponse.status === 401) {
        console.log('Bearer auth failed, trying apiKey in body...');
        convertResponse = await fetch(htmlToPdfEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKey: htmlToPdfApiKey,
            html: htmlContent,
            format: 'Letter',
            margin: {
              top: '0.75in',
              right: '0.75in',
              bottom: '1in',
              left: '0.75in'
            },
            landscape: false,
            printBackground: true
          })
        });
      }
    } catch (fetchError) {
      console.error('Fetch error calling HTML->PDF API:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to call HTML->PDF conversion service',
          details: fetchError instanceof Error ? fetchError.message : String(fetchError)
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!convertResponse.ok) {
      let errorDetails: string | undefined;
      try {
        const err = await convertResponse.text();
        errorDetails = err;
        console.error('HTML->PDF API error response:', err);
      } catch {}
      console.error('HTML->PDF conversion failed:', {
        status: convertResponse.status,
        statusText: convertResponse.statusText,
        details: errorDetails
      });
      return new Response(
        JSON.stringify({ 
          error: 'HTML->PDF conversion failed', 
          status: convertResponse.status,
          statusText: convertResponse.statusText,
          details: errorDetails 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // html2pdf.app may return PDF directly or JSON with URL
    let pdfBuffer: ArrayBuffer;
    const contentType = convertResponse.headers.get('content-type') || '';
    
    if (contentType.includes('application/pdf')) {
      // PDF returned directly
      console.log('PDF returned directly from API');
      pdfBuffer = await convertResponse.arrayBuffer();
    } else {
      // JSON response with URL
      try {
        const result = await convertResponse.json();
        console.log('API response:', JSON.stringify(result));
        
        if (result.url) {
          // Download PDF from URL
          console.log('Downloading PDF from URL:', result.url);
          const pdfFetch = await fetch(result.url);
          if (!pdfFetch.ok) {
            return new Response(
              JSON.stringify({ 
                error: 'Failed to download converted PDF', 
                status: pdfFetch.status,
                url: result.url
              }),
              { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          pdfBuffer = await pdfFetch.arrayBuffer();
        } else if (result.pdf) {
          // PDF as base64
          console.log('PDF returned as base64');
          const base64Data = result.pdf.replace(/^data:application\/pdf;base64,/, '');
          pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
        } else {
          console.error('Unexpected API response format:', result);
          return new Response(
            JSON.stringify({ 
              error: 'Conversion API returned unexpected format',
              response: result
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('Error processing API response:', e);
        return new Response(
          JSON.stringify({ 
            error: 'Unable to process conversion API response',
            details: e instanceof Error ? e.message : String(e)
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    console.log('PDF generated, size:', pdfBuffer.byteLength);

    // Convert to blob for upload
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

    // Step 11: Upload PDF to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    console.log('Step 11: companyName before slug generation:', companyName);
    const companySlug = (companyName || 'unknown-company').toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    console.log('Step 11: companySlug generated:', companySlug);
    
    // Generate filename - use cleaner names for certain types
    let fileNameType: string = analysisType;
    if (analysisType === 'scorecard') {
      fileNameType = 'scorecard';
    } else if (analysisType === 'detail-report') {
      fileNameType = 'detail-report';
    } else if (analysisType === 'diligence-questions') {
      fileNameType = 'diligence-questions';
    } else if (analysisType === 'founder-report') {
      fileNameType = 'founder-report';
    } else {
      fileNameType = `${analysisType}-analysis`;
    }
    
    const reportFileName = `${companySlug}_${fileNameType}_${timestamp}.pdf`;
    const reportPath = `${companyId}/${reportFileName}`;

    console.log('Uploading PDF to storage:', reportPath);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .upload(reportPath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    if (!uploadData) {
      throw new Error('Upload completed but no data returned - upload may have failed');
    }

    console.log('PDF uploaded successfully, path:', uploadData.path);

    // Verify the file actually exists in storage
    console.log('Verifying file exists in storage...');
    const { data: fileCheck, error: verifyError } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .list(companyId, {
        search: reportFileName
      });

    if (verifyError) {
      console.error('Error verifying file upload:', verifyError);
      throw new Error(`File upload verification failed: ${verifyError.message}`);
    }

    if (!fileCheck || fileCheck.length === 0) {
      console.error('File not found in storage after upload. Expected:', reportFileName);
      throw new Error('File upload verification failed - file not found in storage after upload');
    }

    console.log('File verified in storage:', fileCheck[0].name);

    // Step 12: Create entry in analysis_reports table
    // Generate report_type - use same logic as filename
    let reportType = fileNameType;
    
    // Extract scores from analysis result before creating report record
    const extractedScores = extractScoresFromAnalysis(analysisResult, analysisType);
    console.log(`Extracted scores for ${analysisType}:`, extractedScores ? 'Found' : 'Not found');
    
    const reportData: any = {
      analysis_id: analysisId,
      company_id: companyId,
      report_type: reportType,
      file_name: reportFileName,
      file_path: reportPath,
      generated_by: investorUserId,
    };
    
    // Add score_card field if extracted (for all report types)
    if (extractedScores) {
      reportData.score_card = extractedScores;
      console.log(`[score_card] Setting score_card on new report:`, extractedScores.substring(0, 100) + '...');
      console.log(`[score_card] Full score_card length: ${extractedScores.length}`);
    } else {
      console.log(`[score_card] WARNING: No extractedScores found - score_card will NOT be set on new report`);
    }
    
    let reportRecord: any;
    
    // If we extracted scores, update the score_card field in the most recent existing report of this type
    // This overwrites the score_card field as requested
    if (extractedScores) {
      const { data: existingReport, error: findError } = await supabaseAdmin
        .from('analysis_reports')
        .select('id')
        .eq('analysis_id', analysisId)
        .eq('report_type', reportType)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (findError) {
        console.error(`[score_card] Error finding existing report:`, findError);
      }
      
      if (existingReport) {
        // Update existing report's score_card field (overwrite)
        // Only update score_card field - removed backward compatibility with individual score fields
        const updateData: any = { score_card: extractedScores };
        
        console.log(`[score_card] Updating existing report ${existingReport.id} with score_card`);
        const { error: updateError } = await supabaseAdmin
          .from('analysis_reports')
          .update(updateData)
          .eq('id', existingReport.id);
        
        if (updateError) {
          console.error(`[score_card] Error updating existing report score_card:`, updateError);
        } else {
          console.log(`[score_card] Successfully updated existing report ${existingReport.id} with score_card`);
        }
      } else {
        console.log(`[score_card] No existing report found to update - will create new one with score_card`);
      }
    }
    
    // Always create a new report record for the new PDF
    console.log(`[score_card] Creating new report record with score_card:`, reportData.score_card ? 'YES' : 'NO');
    const { data: newReport, error: reportError } = await supabaseAdmin
      .from('analysis_reports')
      .insert(reportData)
      .select()
      .single();

    if (reportError) {
      console.error(`[score_card] Error creating report record:`, reportError);
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    reportRecord = newReport;
    console.log(`[score_card] Report record created: ${reportRecord.id}`);
    console.log(`[score_card] New report score_card value:`, reportRecord.score_card ? reportRecord.score_card.substring(0, 100) + '...' : 'NULL');

    // Step 13: Update analysis status to Analyzed
    const analysisUpdate: Record<string, unknown> = {
      status: 'Analyzed',
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (analysisType === 'scorecard' && scorecardSummary) {
      analysisUpdate.scorecard_summary = scorecardSummary;
      console.log('[scorecard] Updating analysis row with scorecard_summary JSON.');
    }

    await supabaseAdmin
      .from('analysis')
      .update(analysisUpdate)
      .eq('id', analysisId);

    console.log('Analysis status updated to Analyzed');

    // Step 14: Store in extracted_data for display
    await supabaseAdmin
      .from('extracted_data')
      .insert({
        file_path: reportPath,
        extracted_info: {
          analysis_type: analysisType,
          analysis_result: analysisResult,
          prompt_used: promptText,
          model_used: 'gpt-4-turbo-preview',
          company_id: companyId,
          analysis_id: analysisId,
          report_id: reportRecord.id,
          documents_analyzed: requestDocuments?.map(d => d.name).join(', '),
        },
      });

    // Step 15: Cleanup OpenAI resources
    console.log('Cleaning up OpenAI resources...');
    try {
      await openai.beta.assistants.del(assistant.id);
      await openai.beta.vectorStores.del(vectorStore.id);
      for (const fileId of fileIds) {
        await openai.files.del(fileId);
      }
      console.log('Cleanup completed');
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Step 16: Generate signed URL for the PDF
    console.log('Step 16: Generating signed URL for reportPath:', reportPath);
    if (!reportPath) {
      throw new Error('Report path is undefined - cannot generate signed URL');
    }
    const { data: pdfSignedUrl } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .createSignedUrl(reportPath, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analysis_id: analysisId,
        analysis_type: analysisType,
        report: {
          id: reportRecord.id,
          file_name: reportFileName,
          file_path: reportPath,
          download_url: pdfSignedUrl?.signedUrl,
        },
        company: companyName,
        model_used: 'gpt-4-turbo-preview',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-company function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

