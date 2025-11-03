import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { OpenAI } from 'npm:openai@4.73.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  companyId: string;
  companyName?: string;
  analysisId?: string;
  analysisType: 'team';
  prompt?: string;
  documents: Array<{
    id: string;
    name: string;
    path: string;
  }>;
}

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
      margin: 0.75in;
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
    
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
      padding: 10px 0;
      border-top: 1px solid #e5e7eb;
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
  
  <div class="footer">
    <span style="float: left;">Confidential - For Investment Decision Making Only</span>
  </div>
</body>
</html>`;
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
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create client with user's token to get their identity
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unable to authenticate user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestBody: RequestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { 
      companyId,
      companyName: requestCompanyName,
      analysisId: requestAnalysisId,
      analysisType,
      prompt: requestPrompt,
      documents: requestDocuments
    } = requestBody;

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

    if (!requestDocuments || requestDocuments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents provided for analysis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing team analysis (HTML) for:`, { companyId, investorUserId });

    // Step 1: Get company details
    let companyName = requestCompanyName;

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
        await supabaseAdmin
          .from('analysis')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);
        console.log('Using existing analysis:', analysisId);
      } else {
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

    // Step 3: Get the prompt (check investor_prompts first for Team-Analysis, then fall back to Team-Analysis-HTML)
    let promptText: string;
    let isCustomPrompt = false;
    let investorName: string | null = null;

    if (requestPrompt) {
      promptText = requestPrompt;
      console.log('Using prompt from request');
    } else {
      // First, check if investor has custom prompt for Team-Analysis
      console.log(`Checking for custom prompt for Team-Analysis...`);
      const { data: customPromptData, error: customPromptError } = await supabaseAdmin
        .from('investor_prompts')
        .select('custom_prompt, user_id')
        .eq('user_id', investorUserId)
        .eq('report_name', 'Team-Analysis')
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
      } else {
        // Fall back to Team-Analysis-HTML system prompt
        console.log('Fetching Team-Analysis-HTML prompt...');
        const { data: promptData, error: promptError } = await supabaseAdmin
          .from('prompts')
          .select('prompt_detail, preferred_llm')
          .eq('prompt_name', 'Team-Analysis-HTML')
          .single();

        if (promptError || !promptData) {
          console.error('Error fetching prompt:', promptError);
          throw new Error('Team-Analysis-HTML prompt not found in database. Please ensure the prompt exists in the prompts table.');
        }
        promptText = promptData.prompt_detail;
        console.log('Using system prompt from database');
      }
    }

    // Step 4: Process documents
    console.log(`Processing ${requestDocuments.length} documents...`);
    let fileIds: string[] = [];
    
    for (const doc of requestDocuments) {
      if (!doc.path) {
        throw new Error(`Document path is missing for file: ${doc.name}`);
      }
      
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('company-documents')
        .createSignedUrl(doc.path, 3600);

      if (signedUrlError || !signedUrlData) {
        throw new Error(`Failed to generate signed URL for file: ${doc.name}`);
      }

      const signedUrl = signedUrlData.signedUrl;
      const pdfResponse = await fetch(signedUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const filename = doc.path.split('/').pop() || doc.name;
      const pdfFile = new File([pdfBuffer], filename, { type: 'application/pdf' });

      const file = await openai.files.create({
        file: pdfFile,
        purpose: 'assistants',
      });
      fileIds.push(file.id);
    }

    // Step 5: Create vector store
    console.log('Creating vector store...');
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'Team Analysis HTML',
      file_ids: fileIds,
    });
    
    // Wait for vector store to index
    let vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
    let attempts = 0;
    const maxAttempts = 120;
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
      attempts++;
      
      if (vectorStoreStatus.file_counts && 
          vectorStoreStatus.file_counts.completed > 0 &&
          vectorStoreStatus.file_counts.completed === vectorStoreStatus.file_counts.total) {
        break;
      }
      
      if (vectorStoreStatus.file_counts && vectorStoreStatus.file_counts.failed > 0) {
        break;
      }
    }

    // Step 6: Create assistant
    console.log('Creating assistant...');
    const assistant = await openai.beta.assistants.create({
      name: 'Team Analyzer HTML',
      instructions: 'You are an expert at analyzing startup teams and evaluating their capability to execute on their vision. Provide detailed, actionable insights based on the documents provided.',
      model: 'gpt-4-turbo-preview',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    });

    // Step 7: Create thread and send prompt
    const thread = await openai.beta.threads.create();
    
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
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status !== 'completed') {
      let errorDetails = `Run failed with status: ${runStatus.status}`;
      if (runStatus.last_error) {
        errorDetails += `\nError: ${runStatus.last_error.message}`;
      }
      throw new Error(errorDetails);
    }

    // Step 9: Get the response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || lastMessage.content[0].type !== 'text') {
      throw new Error('No text response from assistant');
    }

    const analysisResult = lastMessage.content[0].text.value;
    console.log('Analysis completed, length:', analysisResult.length);

    // Step 10: Generate PDF Report using HTML/CSS via external API (Edge-safe)
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
      'Team Analysis Report',
      companyName,
      analysisResult,
      dateStr,
      timeStr,
      isCustomPrompt,
      investorName
    );

    // Call external HTML->PDF API
    // Try multiple API formats for compatibility
    console.log('Calling HTML->PDF API:', htmlToPdfEndpoint);
    console.log('HTML content length:', htmlContent.length);
    
    let convertResponse: Response;
    try {
      // Try html2pdf.app format first
      convertResponse = await fetch(htmlToPdfEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${htmlToPdfApiKey}`  // Try Bearer token
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
            margin: '0.75in',
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

    // Step 11: Upload PDF to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const companySlug = companyName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const reportFileName = `${companySlug}_team-analysis-html_${timestamp}.pdf`;
    const reportPath = `${companyId}/${reportFileName}`;

    console.log('Uploading PDF to storage:', reportPath);
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    
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

    console.log('PDF uploaded successfully, path:', uploadData.path);

    // Step 12: Create entry in analysis_reports table
    const { data: reportRecord, error: reportError } = await supabaseAdmin
      .from('analysis_reports')
      .insert({
        analysis_id: analysisId,
        company_id: companyId,
        report_type: 'team-analysis-html',
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

    // Step 13: Update analysis status
    await supabaseAdmin
      .from('analysis')
      .update({
        status: 'Analyzed',
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    // Step 14: Store in extracted_data
    await supabaseAdmin
      .from('extracted_data')
      .insert({
        file_path: reportPath,
        extracted_info: {
          analysis_type: 'team',
          analysis_result: analysisResult,
          prompt_used: promptText,
          model_used: 'gpt-4-turbo-preview',
          company_id: companyId,
          analysis_id: analysisId,
          report_id: reportRecord.id,
          documents_analyzed: requestDocuments.map(d => d.name).join(', '),
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
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Step 16: Generate signed URL
    const { data: pdfSignedUrl } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .createSignedUrl(reportPath, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analysis_id: analysisId,
        analysis_type: 'team',
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
    console.error('Error in analyze-company-html function:', error);
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
