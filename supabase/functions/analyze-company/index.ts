import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { OpenAI } from 'npm:openai@4.73.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Helper function to convert markdown to HTML
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Headers (must come before paragraphs)
  html = html.replace(/^### (.+?)$/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.+?)$/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.+?)$/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Numbered lists - wrap consecutive <li> items in <ol>
  const lines = html.split('\n');
  let inOrderedList = false;
  let result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    
    if (orderedMatch) {
      if (!inOrderedList) {
        result.push('<ol>');
        inOrderedList = true;
      }
      result.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      const bulletMatch = line.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        result.push(`<ul><li>${bulletMatch[1]}</li></ul>`);
      } else {
        result.push(line);
      }
    }
  }
  
  if (inOrderedList) {
    result.push('</ol>');
  }
  
  html = result.join('\n');
  
  // Paragraphs (double newlines)
  html = html.split('\n\n').map(para => {
    para = para.trim();
    if (para && !para.match(/^<[h|o|u]/) && !para.startsWith('<li>')) {
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }
    return para;
  }).join('\n');
  
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
  investorName: string | null = null
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
      Model: GPT-4 Turbo
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
  analysisType: 'team' | 'product' | 'market' | 'financial' | 'scorecard' | 'detail-report' | 'diligence-questions' | 'founder-report';
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
    const htmlToPdfApiKey = Deno.env.get('HTML_TO_PDF_API_KEY');
    const htmlToPdfEndpoint = Deno.env.get('HTML_TO_PDF_ENDPOINT') || 'https://api.html2pdf.app/v1/generate';

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY environment variable is not set' }),
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
    const openai = new OpenAI({ apiKey: openaiApiKey });

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

    const investorUserId = user.id;

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
        JSON.stringify({ error: 'Valid analysisType is required (team, product, market, financial, scorecard, detail-report, diligence-questions, or founder-report)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestDocuments || requestDocuments.length === 0) {
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

    // Step 1: Get company details
    console.log('Step 1: Getting company details, requestCompanyName:', requestCompanyName);
    let companyName = requestCompanyName;
    console.log('Step 1: companyName initialized to:', companyName);
    if (!companyName) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        throw new Error('Company not found');
      }
      companyName = company.name;
      console.log('Step 1: companyName from database:', companyName);
    }

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
      promptText = requestPrompt;
      console.log('Using prompt from request (no custom prompt found)');
    } else {
      // Fall back to system prompt
      console.log(`Fetching ${config.promptName} prompt from prompts table...`);
      const { data: promptData, error: promptError } = await supabaseAdmin
        .from('prompts')
        .select('prompt_detail, preferred_llm')
        .eq('prompt_name', config.promptName)
        .single();

      if (promptError || !promptData) {
        console.error('Error fetching prompt:', promptError);
        throw new Error(`${config.promptName} prompt not found in database. Please ensure the prompt exists in the prompts table.`);
      }
      promptText = promptData.prompt_detail;
      console.log('Using system prompt from database');
    }

    // Step 4: Process documents or existing reports
    let fileIds: string[] = [];
    
    // For scorecard, detail-report, diligence-questions, and founder-report, use existing reports if available
    if ((analysisType === 'scorecard' || analysisType === 'detail-report' || analysisType === 'diligence-questions' || analysisType === 'founder-report') && requestExistingReports && requestExistingReports.length > 0) {
      console.log(`Processing ${requestExistingReports.length} existing reports for ${analysisType} generation...`);
      
      for (const report of requestExistingReports) {
        console.log('Processing existing report:', report.type, report.path);
        console.log('Report object:', JSON.stringify(report, null, 2));
        
        // Validate report path
        if (!report.path) {
          console.error('Report path is missing:', report);
          throw new Error(`Report path is missing for report type: ${report.type}`);
        }
        
        // Generate signed URL for the existing report
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('analysis-output-docs')
          .createSignedUrl(report.path, 3600);

        if (signedUrlError || !signedUrlData) {
          console.error('Error generating signed URL for existing report:', signedUrlError);
          throw new Error(`Failed to generate signed URL for existing report: ${report.type}`);
        }

        const signedUrl = signedUrlData.signedUrl;
        console.log('Signed URL generated for existing report:', report.type);

        // Download the existing report PDF
        console.log('Downloading existing report PDF...');
        const pdfResponse = await fetch(signedUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download existing report PDF: ${pdfResponse.statusText}`);
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        console.log('Existing report PDF downloaded, size:', pdfBuffer.byteLength);

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
    
    const vectorStore = await openai.beta.vectorStores.create({
      name: config.vectorStoreName,
      file_ids: fileIds,
    });
    console.log('Vector store created:', vectorStore.id);
    console.log('Vector store file count:', vectorStore.file_counts);
    
    // Wait for vector store to index the files
    console.log('Waiting for vector store to index files...');
    let vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
    let attempts = 0;
    const maxAttempts = 120; // Wait up to 120 seconds for indexing
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Check every 2 seconds
      vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
      attempts++;
      
      console.log(`Vector store status check ${attempts}:`, vectorStoreStatus.status);
      console.log(`File counts:`, vectorStoreStatus.file_counts);
      
      // Check if all files are completed
      if (vectorStoreStatus.file_counts && 
          vectorStoreStatus.file_counts.completed > 0 &&
          vectorStoreStatus.file_counts.completed === vectorStoreStatus.file_counts.total) {
        console.log('All files indexed successfully!');
        break;
      }
      
      // Check if indexing failed
      if (vectorStoreStatus.file_counts && vectorStoreStatus.file_counts.failed > 0) {
        console.error('File indexing failed!');
        break;
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
    
    // Modify prompt to explicitly instruct using file_search
    const enhancedPrompt = `IMPORTANT: You have access to uploaded documents via the file_search tool. You MUST use file_search to read and analyze the company's pitch deck and other uploaded materials.

${promptText}

CRITICAL: Before writing your analysis, you MUST:
1. Use the file_search tool to search through the uploaded documents
2. Read the pitch deck and any other uploaded files
3. Extract information from these documents
4. Use this extracted information in your analysis

Do NOT provide generic placeholder analysis. You must analyze the actual uploaded documents.`;
    
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

    const analysisResult = lastMessage.content[0].text.value;
    console.log('Analysis completed, length:', analysisResult.length);

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
      investorName
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
            bottom: '1in',
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
    let fileNameType = analysisType;
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
    
    const { data: reportRecord, error: reportError } = await supabaseAdmin
      .from('analysis_reports')
      .insert({
        analysis_id: analysisId,
        company_id: companyId,
        report_type: reportType,
        file_name: reportFileName,
        file_path: reportPath,
        generated_by: investorUserId,
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report record:', reportError);
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    console.log('Report record created:', reportRecord.id);

    // Step 13: Update analysis status to Analyzed
    await supabaseAdmin
      .from('analysis')
      .update({
        status: 'Analyzed',
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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

