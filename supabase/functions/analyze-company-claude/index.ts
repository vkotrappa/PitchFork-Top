import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import Anthropic from 'npm:@anthropic-ai/sdk@0.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Helper function to extract text from PDF using pdf.js
async function extractTextFromPDF(pdfBuffer: ArrayBuffer, filename: string): Promise<string> {
  try {
    console.log(`Extracting text from PDF: ${filename}, size: ${pdfBuffer.byteLength} bytes`);
    
    // Check if PDF buffer is valid (should start with %PDF)
    const firstBytes = new Uint8Array(pdfBuffer.slice(0, 4));
    const header = String.fromCharCode(...firstBytes);
    if (!header.startsWith('%PDF')) {
      console.warn(`File ${filename} does not appear to be a valid PDF (header: ${header})`);
      return `[Note: File "${filename}" does not appear to be a valid PDF file. Header: ${header}]`;
    }
    
    // Use pdf.js to extract text
    const pdfjsLib = await import('npm:pdfjs-dist@4.0.379');
    
    // Try different initialization options
    let pdf;
    try {
      // First try with Uint8Array
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({ 
        data: uint8Array,
        useSystemFonts: true,
        verbosity: 0, // Reduce logging
      });
      pdf = await loadingTask.promise;
    } catch (error1) {
      console.warn('First attempt failed, trying with ArrayBuffer directly:', error1);
      try {
        // Try with ArrayBuffer directly
        const loadingTask = pdfjsLib.getDocument({ 
          data: pdfBuffer,
          useSystemFonts: true,
          verbosity: 0,
        });
        pdf = await loadingTask.promise;
      } catch (error2) {
        console.error('Both PDF loading attempts failed:', error2);
        throw error2;
      }
    }
    
    console.log(`PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((str: string) => str.length > 0)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText) {
          fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
        }
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        fullText += `\n\n--- Page ${pageNum} ---\n[Could not extract text from this page]`;
      }
    }
    
    console.log(`Extracted ${fullText.length} characters from PDF`);
    
    if (fullText.trim().length === 0) {
      return `[Note: PDF file "${filename}" was loaded but no text could be extracted. The PDF may contain only images or be encrypted.]`;
    }
    
    // Limit text length to avoid token limits (Claude 3.5 Sonnet supports 200k tokens)
    // Roughly 1 token = 4 characters, so 200k tokens ≈ 800k characters
    // We'll limit to 500k characters to be safe
    const maxLength = 500000;
    if (fullText.length > maxLength) {
      console.warn(`PDF text exceeds ${maxLength} characters, truncating`);
      fullText = fullText.substring(0, maxLength) + '\n\n[Content truncated due to length limits]';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Return a note that extraction failed, but don't fail the entire analysis
    return `[Note: Could not extract text from PDF file "${filename}". The PDF may be corrupted, encrypted, or in an unsupported format. Error: ${errorMessage}. The analysis will proceed without this document's content.]`;
  }
}

// Helper function to convert markdown table to HTML
function convertMarkdownTableToHtml(tableRows: string[]): string {
  if (tableRows.length === 0) {
    console.log('convertMarkdownTableToHtml: No table rows provided');
    return '';
  }
  
  console.log(`convertMarkdownTableToHtml: Converting ${tableRows.length} rows to HTML`);
  
  let html = '<table>\n';
  
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    // Split by | and filter out empty strings from leading/trailing pipes
    const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0);
    
    if (cells.length === 0) {
      console.log(`convertMarkdownTableToHtml: Row ${i} has no cells, skipping`);
      continue;
    }
    
    console.log(`convertMarkdownTableToHtml: Row ${i} has ${cells.length} cells`);
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
  console.log(`convertMarkdownTableToHtml: Generated HTML table (${html.length} chars)`);
  return html;
}

// Helper function to convert markdown to HTML
function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  console.log('markdownToHtml: Starting conversion, input length:', markdown.length);
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
    // More robust detection: must start with |, end with |, and have at least 2 columns (3+ pipes)
    // Also handle cases where there might be leading/trailing spaces
    const hasPipeStart = trimmedLine.startsWith('|');
    const hasPipeEnd = trimmedLine.endsWith('|');
    const pipeCount = (trimmedLine.match(/\|/g) || []).length;
    const isTableRow = hasPipeStart && hasPipeEnd && pipeCount >= 3;
    
    // Table separator: lines with |, hyphens/dashes, and optional colons/alignment markers
    // Match lines that start/end with | and contain mostly hyphens, pipes, spaces, and colons
    const isTableSeparator = hasPipeStart && hasPipeEnd && 
      trimmedLine.match(/^[\|\s\-:]+$/) !== null &&
      pipeCount >= 2;
    
    // Skip empty lines - don't add them to result
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
      // Don't add empty lines - skip them entirely
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
          console.log('Table detected, starting table conversion at line', i);
          console.log('First table row:', trimmedLine);
        }
        tableRows.push(trimmedLine);
        console.log(`Table row ${tableRows.length} added: ${trimmedLine.substring(0, 80)}`);
      } else {
        console.log('Table separator row skipped (line', i, '):', trimmedLine.substring(0, 50));
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
    
    // Detect table start (check for <table> tag)
    if (trimmed.includes('<table>') || trimmed === '<table>') {
      inTableBlock = true;
      tableBlock = [line];
      continue;
    }
    
    // Collect table content (everything until </table>)
    if (inTableBlock) {
      tableBlock.push(line);
      if (trimmed.includes('</table>') || trimmed === '</table>') {
        inTableBlock = false;
        // Join table block and add as single entry
        finalResult.push(tableBlock.join('\n'));
        tableBlock = [];
      }
      continue;
    }
    
    // Handle non-table content
    if (trimmed === '') {
      // Skip empty lines entirely - don't add them
      continue;
    }
    
    // Skip if already HTML tag (headers, lists, etc.)
    if (trimmed.match(/^<[h|o|u|l|t]/)) {
      finalResult.push(line);
      continue;
    }
    
    // For regular text, add as-is (will be wrapped in paragraphs later)
    finalResult.push(line);
  }
  
  // Handle any remaining table block
  if (inTableBlock && tableBlock.length > 0) {
    finalResult.push(tableBlock.join('\n'));
  }
  
  // Now handle paragraph wrapping for non-HTML content
  html = finalResult.join('\n');
  
  // Split by double newlines and wrap paragraphs, but preserve table blocks
  // First, remove excessive blank lines
  html = html.replace(/\n{3,}/g, '\n\n');
  
  html = html.split(/\n\n+/).map(block => {
    block = block.trim();
    if (!block) return ''; // Filter out empty blocks
    
    // Skip if already HTML tag (headers, lists, tables)
    // Check if this block contains a complete table
    if (block.includes('<table>') && block.includes('</table>')) {
      return block; // Return table as-is
    }
    if (block.match(/^<[h|o|u|l]/)) {
      return block; // Return other HTML tags as-is
    }
    
    // Wrap in paragraph tag
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).filter(p => p).join('\n'); // Use single newline between elements, not double
  
  console.log('markdownToHtml: Conversion complete, output length:', html.length);
  if (html.includes('<table>')) {
    console.log('markdownToHtml: HTML contains table tags - conversion successful');
  } else {
    console.log('markdownToHtml: WARNING - No table tags found in output');
  }
  
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
  modelName: string = 'Claude 3.7 Sonnet'
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
      margin-bottom: 0.75in;
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
      margin-top: 20px;
    }
    
    .content h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    
    .content h2 {
      font-size: 16pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    
    .content h3 {
      font-size: 14pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 12px;
      margin-bottom: 4px;
      page-break-after: avoid;
    }
    
    .content p {
      margin-bottom: 8px;
      margin-top: 0;
      text-align: justify;
      orphans: 2;
      widows: 2;
    }
    
    .content h1:first-child,
    .content h2:first-child,
    .content h3:first-child {
      margin-top: 0;
    }
    
    .content > *:first-child {
      margin-top: 0 !important;
    }
    
    .content > *:last-child {
      margin-bottom: 0 !important;
      page-break-after: auto;
    }
    
    /* Prevent orphaned headers at page bottom */
    .content h1, .content h2, .content h3 {
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    .content ul, .content ol {
      margin-left: 24px;
      margin-bottom: 8px;
      margin-top: 0;
    }
    
    .content li {
      margin-bottom: 4px;
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
      margin: 12px 0;
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
    assistantInstructions: 'You are an expert at assembling comprehensive investment reports. Create a detailed executive summary with high-level scorecard first, then include the complete content of each analysis report as separate sections. Do NOT summarize or condense the individual reports - include their full content. Focus on creating a comprehensive executive summary that synthesizes key insights from all reports.',
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

function buildValuationPriorityBlock(company: any): string {
  const lines: string[] = [];

  const valuationStructured = company.valuation_value
    ? `${company.valuation_value}${company.valuation_units ? ` ${company.valuation_units}` : ''}`
    : null;
  const fundingStructured = company.investment_amount_value
    ? `${company.investment_amount_value}${company.investment_amount_units ? ` ${company.investment_amount_units}` : ''}`
    : null;
  const revenueStructured = company.annual_revenue_value
    ? `${company.annual_revenue_value}${company.annual_revenue_units ? ` ${company.annual_revenue_units}` : ''}`
    : null;

  lines.push(`• Valuation (companies table): ${company.valuation || valuationStructured || company.valuation_raw || 'Not provided'}`);
  if (company.valuation_type) lines.push(`  - Valuation Type: ${company.valuation_type}`);
  if (company.valuation_raw && company.valuation_raw !== company.valuation) {
    lines.push(`  - Valuation Notes: ${company.valuation_raw}`);
  }

  lines.push(`• Funding Terms (companies table): ${company.funding_terms || fundingStructured || company.investment_amount_raw || company.funding_sought || 'Not provided'}`);
  if (company.investment_instrument) lines.push(`  - Instrument: ${company.investment_instrument}`);
  if (company.investment_other_terms) lines.push(`  - Other Terms: ${company.investment_other_terms}`);

  lines.push(`• Revenue (companies table): ${company.revenue || revenueStructured || company.annual_revenue_raw || 'Not provided'}`);
  if (company.annual_revenue_period) lines.push(`  - Revenue Period: ${company.annual_revenue_period}`);

  return [
    '=== VALUATION PRIORITY DATA (ABSOLUTE SOURCE OF TRUTH) ===',
    ...lines,
    '=== END VALUATION PRIORITY DATA ===',
  ].join('\n');
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

  // Wrap the entire handler in a timeout to ensure we always return CORS headers
  const handlerPromise = (async () => {
    try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const htmlToPdfApiKey = Deno.env.get('HTML_TO_PDF_API_KEY');
    const htmlToPdfEndpoint = Deno.env.get('HTML_TO_PDF_ENDPOINT') || 'https://api.html2pdf.app/v1/generate';

    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable is not set' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

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

    // IMPORTANT: If requestPrompt is provided, it means analyze-company-background already fetched and prefixed it
    // In this case, use requestPrompt directly to avoid double-fetching and double-prefixing
    // The background function handles: custom prompt check -> prefix -> LLM routing
    if (requestPrompt && requestPrompt.trim().length > 0) {
      promptText = requestPrompt;
      console.log('Using prompt from request (already processed by background function - custom prompt + prefix applied)');
      
      // Check if it's a custom prompt for investor name display
      const { data: customPromptCheck } = await supabaseAdmin
        .from('investor_prompts')
        .select('custom_prompt, user_id')
        .eq('user_id', investorUserId)
        .eq('report_name', config.promptName)
        .maybeSingle();
      
      if (customPromptCheck && customPromptCheck.custom_prompt) {
        isCustomPrompt = true;
        // Get investor name for report header
        const { data: investorData } = await supabaseAdmin
          .from('investor_details')
          .select('name, firm_name')
          .eq('user_id', investorUserId)
          .maybeSingle();
        
        investorName = investorData?.name || investorData?.firm_name || 'Investor';
        console.log(`Custom prompt detected from request. Investor name: ${investorName}`);
      }
    } else {
      // No requestPrompt provided, fetch from database (direct call, not from background)
      console.log(`No prompt in request, fetching from database for ${config.promptName}...`);
      
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
    }

    // Validate that we have a prompt before proceeding
    if (!promptText || promptText.trim().length === 0) {
      console.error('ERROR: promptText is empty or undefined');
      console.error('requestPrompt:', requestPrompt ? `Present (length: ${requestPrompt.length})` : 'Not provided');
      console.error('config.promptName:', config.promptName);
      throw new Error(`No prompt found for ${config.promptName}. Please ensure the prompt exists in the database.`);
    }
    
    console.log(`Prompt validated: length=${promptText.length} characters`);
    
    // Step 4: Process documents - extract text from PDFs for Claude
    console.log(`Processing ${requestDocuments?.length || 0} documents for Claude...`);
    
    const extractedTexts: Array<{ name: string; text: string }> = [];

    // For scorecard, diligence-questions, founder-report, and valuation, use existing reports if available
    // detail-report now processes documents directly (not existing reports)
    if ((analysisType === 'scorecard' || analysisType === 'diligence-questions' || analysisType === 'founder-report' || analysisType === 'valuation') && requestExistingReports && requestExistingReports.length > 0) {
      console.log(`Processing ${requestExistingReports.length} existing reports for ${analysisType} generation...`);
      
      for (const report of requestExistingReports) {
        try {
          console.log('Processing existing report:', report.type, report.path);
          
          if (!report.path) {
            console.warn('Report path is missing, skipping:', report.type);
            continue;
          }
          
          // Extract companyId and filename from path (format: reports/companyId/filename.pdf or companyId/filename.pdf)
          let storagePath = report.path;
          if (!storagePath.startsWith('reports/')) {
            // If path doesn't start with reports/, it might be just companyId/filename.pdf
            storagePath = storagePath.includes('/') ? storagePath : `reports/${storagePath}`;
          }
          
          console.log(`Generating signed URL for path: ${storagePath}`);
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('analysis-output-docs')
            .createSignedUrl(storagePath, 3600);

          if (signedUrlError || !signedUrlData) {
            console.error('Error generating signed URL for existing report:', signedUrlError);
            console.warn(`Skipping report ${report.type} due to signed URL error`);
            continue; // Skip this report instead of failing entirely
          }

          const signedUrl = signedUrlData.signedUrl;
          console.log(`Downloading PDF from signed URL for ${report.type}...`);
          
          const pdfResponse = await fetch(signedUrl);
          if (!pdfResponse.ok) {
            console.error(`Failed to download PDF for ${report.type}: ${pdfResponse.status} ${pdfResponse.statusText}`);
            continue; // Skip this report instead of failing entirely
          }

          const pdfBuffer = await pdfResponse.arrayBuffer();
          const filename = storagePath.split('/').pop() || `${report.type}.pdf`;
          
          console.log(`Extracting text from PDF: ${filename} (${pdfBuffer.byteLength} bytes)`);
          // Extract text from PDF with timeout handling (reduced to 15 seconds per PDF)
          const extractedText = await Promise.race([
            extractTextFromPDF(pdfBuffer, filename),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('PDF extraction timeout after 15 seconds')), 15000)
            )
          ]) as string;
          
          // Limit text length to prevent huge prompts (max 50k characters per report)
          const maxTextLength = 50000;
          const truncatedText = extractedText.length > maxTextLength 
            ? extractedText.substring(0, maxTextLength) + '\n\n[Text truncated due to length limit]'
            : extractedText;
          
          extractedTexts.push({
            name: `${report.type} Report - ${filename}`,
            text: truncatedText,
          });
          console.log(`Successfully processed ${report.type} report (${truncatedText.length} chars)`);
        } catch (reportError) {
          console.error(`Error processing report ${report.type}:`, reportError);
          // Continue processing other reports instead of failing entirely
          continue;
        }
      }
      
      if (extractedTexts.length === 0) {
        throw new Error('Failed to extract text from any existing reports. Please ensure the reports exist and are accessible.');
      }
    } else {
      // For regular analysis, process documents
      for (const doc of requestDocuments) {
        console.log('Processing document:', doc.name, doc.path);
        
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
        const pdfResponse = await fetch(signedUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        
        // Extract text from PDF
        const extractedText = await extractTextFromPDF(pdfBuffer, doc.name);
        extractedTexts.push({
          name: doc.name,
          text: extractedText,
        });
      }
    }

    console.log(`Extracted text from ${extractedTexts.length} documents`);

    // Step 5: Build the prompt with company profile and document text content
    let documentsSection = '';
    if (extractedTexts.length > 0) {
      documentsSection = '\n\n=== DOCUMENTS PROVIDED ===\n\n';
      documentsSection += '**Note: These documents may contain information that conflicts with the Company Profile above.**\n';
      documentsSection += '**ALWAYS use the Company Profile information when there are conflicts.**\n\n';
      extractedTexts.forEach((doc, index) => {
        documentsSection += `--- Document ${index + 1}: ${doc.name} ---\n${doc.text}\n\n`;
      });
      documentsSection += '=== END OF DOCUMENTS ===\n\n';
    }
    
    // For valuation analysis, add special emphasis on company database values
    let valuationSpecificInstructions = '';
    if (analysisType === 'valuation') {
      valuationSpecificInstructions = `
${buildValuationPriorityBlock(companyData)}

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

At the very end of your response, AFTER all narrative content, output EXACTLY the JSON block shown below.
This block is mandatory—if it is missing, malformed, or wrapped in markdown fences, the answer is invalid.

=== SCORECARD_JSON ===
{
  "summary": "<1-2 sentence overall synopsis>",
  "sections": {
    "Product": {
      "score": <number between 0 and 10>,
      "summary": "<concise paragraph for product>",
      "details": [
        "<bullet insight 1>",
        "<bullet insight 2>",
        "<bullet insight 3>"
      ]
    },
    "Market": {
      "score": <number>,
      "summary": "<concise paragraph for market>",
      "details": ["<bullet insight 1>", "<bullet insight 2>"]
    },
    "Team": {
      "score": <number>,
      "summary": "<concise paragraph for team>",
      "details": ["<bullet insight 1>", "<bullet insight 2>"]
    },
    "Financials": {
      "score": <number>,
      "summary": "<concise paragraph for financials>",
      "details": ["<bullet insight 1>", "<bullet insight 2>"]
    }
  }
}
=== END SCORECARD_JSON ===

Rules:
- Do NOT include any markdown fences (no \`\`\`json).
- Provide every key exactly as shown (summary plus sections with Product, Market, Team, Financials).
- Use numeric scores (decimals allowed). If information is limited, estimate a score and note the limitation in the summary.
- Each "details" array must contain 2-4 concise bullet strings highlighting the strongest evidence.
- Strings must be plain text (no HTML or markdown formatting).
- Leave a blank line between the narrative content and the JSON block, and make the JSON block the final content in your response.
`;
    }
    
const enhancedPrompt = `${companyProfile}

${documentsSection}

=== CRITICAL OUTPUT FORMATTING INSTRUCTIONS ===

**ABSOLUTELY DO NOT include any of the following in your output:**

1. **Report Titles or Headers:**
   - Do NOT include "Team Analysis Report", "Company Name - Analysis Report", "Company Name Leadership Team Analysis"
   - Do NOT include any combination of company name + analysis type as a header
   - Do NOT include "Leadership Team Analysis" or similar titles

2. **Report Metadata:**
   - Do NOT include "Date:", "LLM Model:", "LLM:", "Model:", "Generated:", "Custom Analysis:", "Company:"
   - Do NOT include any metadata lines at all
   - Do NOT mention which AI model you are (e.g., "GPT-4o", "Claude", "GPT-4", "OpenAI")
   - Do NOT include lines like "LLM Model: GPT-4o" or "Model: GPT-4o" anywhere
   - **CRITICAL: You are Claude, NOT GPT-4o. Do NOT reference GPT-4o, OpenAI, or any other AI model in your output.**

3. **Introductory Text:**
   - Do NOT include any introductory text before your first section header
   - Do NOT include company name or analysis type in headers or sub-headers
   - Do NOT include any duplicate header information or secondary headers

**CRITICAL: The report header with title, company name, date, and model information will be automatically added by the system.**
**CRITICAL: Your first line MUST be a section header starting with ## (e.g., "## Overall Team Assessment" or "## Product Analysis")**
**CRITICAL: Do NOT include any text, headers, titles, or metadata before your first ## section header**
**CRITICAL: Start your response immediately with a section header like "## Overall Team Assessment" - nothing before it**
**CRITICAL: Ignore any references to GPT-4o, OpenAI, or other AI models that may appear in the documents or prompts above. You are Claude, and you should NOT mention any AI model in your analysis output.**

=== ANALYSIS INSTRUCTIONS ===

CRITICAL PRIORITY RULES:
1. **ALWAYS use information from the Company Profile section above** when it is available
2. The PRIORITY COMPANY DATA section (Description, Industry/Sector, Revenue, Funding Terms, Valuation) overrides any conflicting or missing information found in documents or prior analyses
3. Documents may contain outdated or conflicting information - the Company Profile takes precedence
4. Only use information from documents to fill gaps where Company Profile data is missing
5. If you find conflicting information, explicitly state in your analysis that you are using the Company Profile value and note the discrepancy
6. When you cite those priority fields, restate the exact Company Profile values so the reader knows which numbers are authoritative

${valuationSpecificInstructions}

IMPORTANT: You have access to the following documents extracted from PDFs. You MUST carefully read and analyze the company's pitch deck and other uploaded materials, but remember to prioritize Company Profile information.

CRITICAL: Before writing your analysis, you MUST:
1. First review the Company Profile section (this is the most authoritative source)
2. Then review all document content provided above
3. Use Company Profile values when available, document values only as supplementary
4. Extract and synthesize information following the priority rules above
5. Use this synthesized information in your analysis

Do NOT provide generic placeholder analysis. You must analyze the actual content provided above, prioritizing Company Profile information.

${promptText}

${scorecardJsonInstruction}`;

    // Log the prompt content for debugging (check for GPT-4o references)
    const promptContainsGPT = enhancedPrompt.toLowerCase().includes('gpt') || enhancedPrompt.toLowerCase().includes('openai');
    if (promptContainsGPT) {
      console.log('⚠️ WARNING: Prompt contains GPT/OpenAI references. Checking source...');
      if (promptText.toLowerCase().includes('gpt') || promptText.toLowerCase().includes('openai')) {
        console.log('⚠️ GPT/OpenAI reference found in promptText (custom prompt or prompt-prefix)');
        const gptMatch = promptText.match(/(gpt|openai).{0,50}/i);
        if (gptMatch) {
          console.log(`⚠️ GPT reference context: "${gptMatch[0]}"`);
        }
      }
      if (documentsSection.toLowerCase().includes('gpt') || documentsSection.toLowerCase().includes('openai')) {
        console.log('⚠️ GPT/OpenAI reference found in documents');
      }
    }
    
    console.log('Full prompt length:', enhancedPrompt.length, 'characters');
    console.log('Prompt text length:', promptText.length, 'characters');
    console.log('Documents section length:', documentsSection.length, 'characters');
    console.log('Enhanced prompt preview (first 1000 chars):', enhancedPrompt.substring(0, 1000));
    console.log('Enhanced prompt contains company profile:', enhancedPrompt.includes('=== COMPANY PROFILE (FROM DATABASE) ==='));

    // Step 6: Call Claude Messages API
    console.log('Calling Claude Messages API...');
    
    const messageContent = [
      {
        type: 'text' as const,
        text: enhancedPrompt,
      },
    ];

    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 16384, // Increased for comprehensive analysis
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    console.log('Claude API response received');

    // Extract the analysis result
    let analysisResult: string;
    let scorecardSummary: ScorecardSummaryData | null = null;
    let extractedScores: string | null = null; // Declare here so it's available later
    
    if (message.content[0].type === 'text') {
      analysisResult = message.content[0].text;
      
      // Extract scores from original analysis result BEFORE header stripping
      // This ensures scores aren't accidentally removed by header stripping logic
      console.log('Extracting scores from analysis result (before header stripping)...');
      extractedScores = extractScoresFromAnalysis(analysisResult, analysisType);
      console.log(`Extracted scores for ${analysisType}:`, extractedScores ? 'Found' : 'Not found');
      if (extractedScores) {
        console.log(`Score card content: ${extractedScores.substring(0, 100)}...`);
      } else {
        console.log('No scores extracted. Checking analysis result for score patterns...');
        // Log a sample to help debug
        const sample = analysisResult.substring(0, 500);
        console.log('Analysis result sample:', sample);
      }
      
      // Log a sample of the raw markdown to debug table issues
      const tableSample = analysisResult.split('\n').slice(0, 20).join('\n');
      console.log('Raw markdown sample (first 20 lines):');
      console.log(tableSample);
      // Check if table syntax exists
      const hasTableSyntax = analysisResult.includes('|') && analysisResult.match(/\|.*\|.*\|/);
      console.log('Has table syntax (| characters):', hasTableSyntax ? 'YES' : 'NO');
      if (hasTableSyntax) {
        const tableLines = analysisResult.split('\n').filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
        console.log(`Found ${tableLines.length} potential table rows`);
        if (tableLines.length > 0) {
          console.log('Sample table rows:', tableLines.slice(0, 3).join(' | '));
        }
      }
    } else {
      throw new Error('Unexpected response format from Claude');
    }

    console.log('Analysis completed, length:', analysisResult.length);

    // Strip duplicate headers from analysis result
    console.log('Post-processing analysis result to remove duplicate headers...');
    
    // Remove lines that look like report titles or headers
    const lines = analysisResult.split('\n');
    const filteredLines: string[] = [];
    let skipHeaderSection = false;
    let consecutiveHeaderLines = 0;
    
    // Normalize company name for matching (remove common suffixes)
    const normalizedCompanyName = companyName.toLowerCase()
      .replace(/\s+(corp|corp\.|inc|inc\.|llc|ltd|ltd\.|limited|company|co|co\.)$/i, '')
      .trim();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Strip markdown formatting (**, __, etc.) for pattern matching
      const lineWithoutMarkdown = line.replace(/\*\*|\*\s*|__|_/g, '').trim();
      const lowerLine = lineWithoutMarkdown.toLowerCase();
      
      // Check if this line looks like a header/metadata line
      const isHeaderLine = 
        // Skip report title patterns (any combination of company name + analysis type)
        (lowerLine.includes('analysis report') && 
         (lowerLine.includes(normalizedCompanyName) || lowerLine.includes(companyName.toLowerCase()) || lowerLine.includes('team') || lowerLine.includes('product') || lowerLine.includes('market') || lowerLine.includes('financial') || lowerLine.includes('leadership'))) ||
        // Skip lines that are just company name + analysis type (e.g., "DigitalAPI Corp. Leadership Team Analysis")
        ((lowerLine.includes(companyName.toLowerCase()) || lowerLine.includes(normalizedCompanyName)) && 
         (lowerLine.includes('leadership') || lowerLine.includes('team') || lowerLine.includes('product') || lowerLine.includes('market') || lowerLine.includes('financial')) && 
         (lowerLine.includes('analysis') || lowerLine.includes('report'))) ||
        // Skip metadata lines - be more aggressive with model/LLM references
        (lowerLine.startsWith('date:') || lowerLine.startsWith('llm model:') || lowerLine.startsWith('llm:') || lowerLine.startsWith('model:') || 
         lowerLine.startsWith('generated:') || lowerLine.startsWith('custom analysis:') || lowerLine.startsWith('company:') ||
         lowerLine.match(/^(date|llm|model|generated|custom|company):/i) ||
         // Catch variations like "LLM: GPT-4o" or "Model: GPT-4o" - even if not at start, strip markdown first
         lowerLine.match(/(llm|model):\s*(gpt|openai|claude)/i) ||
         // Catch "LLM Model: GPT-4o" specifically
         lowerLine.match(/llm\s+model:\s*(gpt|openai|claude)/i) ||
         // Catch date patterns like "September 27, 2023" or "Date: September 27, 2023"
         lowerLine.match(/^(date:\s*)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i)) ||
        // Skip lines that are variations of report titles
        (lowerLine.match(/^.*\s+(analysis|report|assessment)$/i) && lowerLine.length < 150 && 
         (lowerLine.includes('team') || lowerLine.includes('product') || lowerLine.includes('market') || lowerLine.includes('financial') || lowerLine.includes('leadership')));
      
      if (isHeaderLine) {
        // Skip this line and any following blank lines
        skipHeaderSection = true;
        consecutiveHeaderLines++;
        console.log(`Skipping header line ${i + 1}: "${line.substring(0, 100)}"`);
        continue;
      }
      
      // If we've been skipping headers and hit a blank line, continue skipping
      if (skipHeaderSection && (line.length === 0 || line.match(/^\s*$/))) {
        consecutiveHeaderLines++;
        continue;
      }
      
      // Reset skip flag if we hit actual content (starts with ## or content)
      if (line.startsWith('##') || (line.length > 0 && !skipHeaderSection)) {
        if (skipHeaderSection) {
          console.log(`Found content after ${consecutiveHeaderLines} header lines, resetting skip flag`);
        }
        skipHeaderSection = false;
        consecutiveHeaderLines = 0;
      }
      
      // Only add line if we're not in header skip mode or if it's actual content
      if (!skipHeaderSection) {
        filteredLines.push(lines[i]);
      } else if (line.startsWith('##')) {
        // Even if we're skipping, include section headers (##)
        skipHeaderSection = false;
        consecutiveHeaderLines = 0;
        filteredLines.push(lines[i]);
      }
    }
    
    // Join back and clean up multiple blank lines - be more aggressive
    let cleanedResult = filteredLines.join('\n')
      .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
      .replace(/\n\n\n+/g, '\n\n') // Catch any remaining 3+ newlines
      .replace(/^\n+/, '')         // Remove leading newlines
      .replace(/\n+$/, '')          // Remove trailing newlines
      .trim();
    
    // If we removed too much, fall back to original (safety check)
    if (cleanedResult.length < analysisResult.length * 0.5) {
      console.log('Warning: Too much content removed, using original result');
      cleanedResult = analysisResult;
    } else {
      const removedChars = analysisResult.length - cleanedResult.length;
      console.log(`Cleaned result: removed ${removedChars} characters (${((removedChars / analysisResult.length) * 100).toFixed(1)}%)`);
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

    // Step 7: Generate PDF Report using HTML-to-PDF
    console.log('Generating HTML/CSS PDF report via external API...');
    
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
      'Claude 3.7 Sonnet'
    );

    // Call external HTML->PDF API
    console.log('Calling HTML->PDF API:', htmlToPdfEndpoint);
    
    let convertResponse: Response;
    try {
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
              top: '0.5in',
              right: '0.5in',
              bottom: '0.5in',
              left: '0.5in'
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

    let pdfBuffer: ArrayBuffer;
    const contentType = convertResponse.headers.get('content-type') || '';
    
    if (contentType.includes('application/pdf')) {
      pdfBuffer = await convertResponse.arrayBuffer();
    } else {
      try {
        const result = await convertResponse.json();
        
        if (result.url) {
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
          const base64Data = result.pdf.replace(/^data:application\/pdf;base64,/, '');
          pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'Conversion API returned unexpected format',
              response: result
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
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

    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

    // Step 8: Upload PDF to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const companySlug = (companyName || 'unknown-company').toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
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
      throw new Error('Upload completed but no data returned');
    }

    console.log('PDF uploaded successfully, path:', uploadData.path);

    // Verify the file exists
    const { data: fileCheck, error: verifyError } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .list(companyId, {
        search: reportFileName
      });

    if (verifyError || !fileCheck || fileCheck.length === 0) {
      console.error('File upload verification failed');
      throw new Error('File upload verification failed');
    }

    // Step 10: Create entry in analysis_reports table
    // Generate report_type - use same logic as filename
    let reportType = fileNameType;
    
    // Use the extracted scores that were already extracted before header stripping
    // (extractedScores was already set in Step 7)
    console.log(`Using extracted scores for ${analysisType}:`, extractedScores ? 'Found' : 'Not found');
    
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

    // Step 10: Update analysis status
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

    // Step 11: Store in extracted_data
    await supabaseAdmin
      .from('extracted_data')
      .insert({
        file_path: reportPath,
        extracted_info: {
          analysis_type: analysisType,
          analysis_result: analysisResult,
          prompt_used: promptText,
              model_used: 'claude-3-7-sonnet-20250219',
          company_id: companyId,
          analysis_id: analysisId,
          report_id: reportRecord.id,
          documents_analyzed: requestDocuments?.map(d => d.name).join(', '),
        },
      });

    // Step 12: Generate signed URL for the PDF
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
              model_used: 'claude-3-7-sonnet-20250219',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

    } catch (error) {
      console.error('Error in analyze-company-claude function:', error);
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
  })();

  // Set a timeout of 55 seconds (Supabase has a 60 second limit)
  const timeoutPromise = new Promise<Response>((resolve) => {
    setTimeout(() => {
      console.error('Function execution timeout after 55 seconds');
      resolve(new Response(
        JSON.stringify({
          error: 'Request timeout: The analysis is taking too long. This may be due to processing many reports or large PDFs. Please try again or reduce the number of reports.',
        }),
        {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }, 55000); // 55 seconds
  });

  // Race between handler and timeout
  return Promise.race([handlerPromise, timeoutPromise]);
});

