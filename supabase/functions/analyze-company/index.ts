import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { OpenAI } from 'npm:openai@4.73.0';
import { jsPDF } from 'npm:jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
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

    // Step 3: Get the prompt (from request or database)
    let promptText: string;
    if (requestPrompt) {
      promptText = requestPrompt;
      console.log('Using prompt from request');
    } else {
      console.log(`Fetching ${config.promptName} prompt...`);
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
      console.log('Using prompt from database');
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
    const vectorStore = await openai.beta.vectorStores.create({
      name: config.vectorStoreName,
      file_ids: fileIds,
    });
    console.log('Vector store created:', vectorStore.id);

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
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: promptText,
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

    // Step 10: Generate PDF Report
    console.log('Generating PDF report...');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Add header with branding
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55); // Dark gray
    pdf.text(config.reportTitle, margin, margin);

    // Add company name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99); // Medium gray
    pdf.text(`Company: ${companyName}`, margin, margin + 12);

    // Add date and metadata
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128); // Light gray
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    pdf.text(`Generated: ${dateStr} at ${timeStr}`, margin, margin + 19);
    pdf.text(`Model: GPT-4 Turbo`, margin, margin + 24);

    // Add separator line
    pdf.setDrawColor(209, 213, 219); // Light gray border
    pdf.setLineWidth(0.5);
    pdf.line(margin, margin + 28, pageWidth - margin, margin + 28);

    // Add "CONFIDENTIAL" watermark
    pdf.setFontSize(10);
    pdf.setTextColor(220, 38, 38); // Red
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONFIDENTIAL', pageWidth - margin - 30, margin + 24);

    // Add analysis content
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55); // Dark gray for body text
    
    let yPosition = margin + 38;
    const lineHeight = 6;
    
    // Split text into lines
    const lines = pdf.splitTextToSize(analysisResult, maxWidth);
    
    for (const line of lines) {
      // Check if we need a new page
      if (yPosition > pageHeight - margin - 15) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Handle bold sections (assuming markdown-style **text**)
      if (line.includes('**')) {
        const parts = line.split('**');
        let xPos = margin;
        parts.forEach((part, index) => {
          if (index % 2 === 1) {
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setFont('helvetica', 'normal');
          }
          pdf.text(part, xPos, yPosition);
          xPos += pdf.getTextWidth(part);
        });
      } else {
        pdf.text(line, margin, yPosition);
      }
      
      yPosition += lineHeight;
    }

    // Add footer on all pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(156, 163, 175); // Gray
      
      // Page number
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // Confidential notice
      pdf.text(
        'Confidential - For Investment Decision Making Only',
        margin,
        pageHeight - 10
      );
    }

    // Convert PDF to buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

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

