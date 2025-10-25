import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { OpenAI } from 'https://esm.sh/openai@4.73.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  file_path: string;
  company_id?: string;
}

Deno.serve(async (req: Request) => {
  console.log('=== ANALYZE-PDF FUNCTION CALLED ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

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

    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      openaiApiKey: !!openaiApiKey
    });

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { file_path, company_id }: RequestBody = requestBody;

    if (!file_path) {
      return new Response(
        JSON.stringify({ error: 'file_path is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract company_id from file_path if not provided
    const companyId = company_id || file_path.split('/')[0];

    console.log('Generating signed URL for:', file_path);

    // Use service role key for storage operations
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('company-documents')
      .createSignedUrl(file_path, 3600);

    if (signedUrlError || !signedUrlData) {
      console.error('Error generating signed URL:', signedUrlError);
      console.error('File path attempted:', file_path);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate signed URL',
          details: signedUrlError,
          file_path: file_path
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const signedUrl = signedUrlData.signedUrl;
    console.log('Signed URL generated successfully');

    console.log('Downloading PDF from signed URL...');
    const pdfResponse = await fetch(signedUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF downloaded, size:', pdfBuffer.byteLength);

    // Extract filename from file_path
    const filename = file_path.split('/').pop() || 'document.pdf';

    // Create a File object from the buffer
    const pdfFile = new File([pdfBuffer], filename, { type: 'application/pdf' });

    console.log('Uploading file to OpenAI...');
    const file = await openai.files.create({
      file: pdfFile,
      purpose: 'assistants',
    });
    console.log('File uploaded to OpenAI:', file.id);

    console.log('Creating assistant...');
    const assistant = await openai.beta.assistants.create({
      name: 'PDF Analyzer',
      instructions: 'You are an expert at analyzing pitch deck PDFs and extracting key information about startups and companies.',
      model: 'gpt-4-turbo-preview',
      tools: [{ type: 'file_search' }],
    });
    console.log('Assistant created:', assistant.id);

    console.log('Creating vector store...');
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'PDF Analysis',
      file_ids: [file.id],
    });
    console.log('Vector store created:', vectorStore.id);

    await openai.beta.assistants.update(assistant.id, {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    });

    console.log('Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);

    console.log('Adding message to thread...');
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Please analyze this pitch deck PDF and extract the following information in JSON format:
- company_name: The name of the company
- industry: The industry or sector the company operates in
- key_team_members: Array of key team members and their roles
- url: Company website URL (see detailed instructions below)
- valuation: Company valuation. Look for explicit valuation statements. ALSO check the funding terms - if you see terms like "SAFE at $36M cap" or "priced round at $20M valuation" or "post-money valuation of $15M", extract that number as the valuation. For example: "SAFE at $36M cap" → valuation should be "$36M". Return as a string (e.g., "$5M", "$36M").
- revenue: Revenue or revenue projections if mentioned (as a string, e.g., "$1.2M ARR", "$500K MRR")
- description: A brief 2-3 sentence description of what the company does, their value proposition, and target market
- funding_terms: Any funding terms, amount seeking, investment structure (SAFE, priced round, convertible note), or investment details mentioned

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
- If the company is "NeuralTech - AI-powered analytics", likely URL is https://neuraltech.ai or https://neuraltech.com
- If the company is "QuickCart - Mobile shopping app", likely URL is https://quickcart.app or https://getquickcart.com
- If the company is "DataFlow Inc - Enterprise data platform", likely URL is https://dataflow.io or https://dataflow.com

**Step 4: Final URL must be FULLY FORMED with protocol:**
- Must include https:// protocol at the start
- All lowercase domain
- Include proper domain extension (.com, .io, .ai, .app, etc.)
- No "www" prefix
- Format: https://domain.extension
- Example: "https://acmecorp.com" NOT "acmecorp.com" or "www.acmecorp.com"

**CRITICAL: Always include https:// protocol. The URL must be complete and clickable.**

**URL Inference Examples (with proper protocol):**
- "TechFlow" (SaaS analytics) → https://techflow.io or https://techflow.com
- "SmartHealth AI" (Healthcare AI) → https://smarthealth.ai
- "QuickMeet" (Meeting scheduler app) → https://quickmeet.com or https://getquickmeet.com
- "DataVault Inc" (Enterprise software) → https://datavault.io

IMPORTANT INSTRUCTIONS:
1. For URL: Use the company name AND description to make an intelligent, contextual inference if URL is not explicitly stated
2. For valuation: Check both explicit valuation statements AND funding terms. SAFE caps, priced round valuations, and post-money valuations all indicate the company's valuation.
3. For funding_terms: Include the structure (SAFE/equity/convertible), amount, cap/valuation, and any other key terms

Return ONLY valid JSON with these fields. If a field cannot be determined even with inference, use null for that field.`,
    });

    console.log('Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('Initial run status:', runStatus.status);

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Run status:', runStatus.status);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || lastMessage.content[0].type !== 'text') {
      throw new Error('No text response from assistant');
    }

    const responseText = lastMessage.content[0].text.value;
    console.log('Assistant response:', responseText);

    let extractedInfo;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedInfo = JSON.parse(jsonMatch[0]);
      } else {
        extractedInfo = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      extractedInfo = {
        raw_response: responseText,
        parse_error: 'Failed to parse as JSON',
      };
    }

    console.log('Storing extracted data in database...');
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('extracted_data')
      .insert({
        file_path: file_path,
        extracted_info: extractedInfo,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting data:', insertError);
      throw new Error('Failed to store extracted data');
    }

    // Update the companies table with extracted information
    console.log('Updating companies table with extracted data...');
    const updateData: any = {};

    if (extractedInfo.company_name) updateData.name = extractedInfo.company_name;
    if (extractedInfo.industry) updateData.industry = extractedInfo.industry;
    if (extractedInfo.key_team_members) {
      // Convert array to string if needed
      updateData.key_team_members = Array.isArray(extractedInfo.key_team_members)
        ? extractedInfo.key_team_members.join(', ')
        : extractedInfo.key_team_members;
    }
    if (extractedInfo.url) updateData.url = extractedInfo.url;
    if (extractedInfo.valuation) updateData.valuation = extractedInfo.valuation;
    if (extractedInfo.revenue) updateData.revenue = extractedInfo.revenue;
    if (extractedInfo.description) updateData.description = extractedInfo.description;
    if (extractedInfo.funding_terms) updateData.funding_terms = extractedInfo.funding_terms;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating companies table:', updateError);
        // Don't throw error here, just log it
      } else {
        console.log('Companies table updated successfully');
      }
    }

    console.log('Cleaning up OpenAI resources...');
    try {
      await openai.beta.assistants.del(assistant.id);
      await openai.beta.vectorStores.del(vectorStore.id);
      await openai.files.del(file.id);
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedData,
        extracted_info: extractedInfo,
        company_updated: Object.keys(updateData).length > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-pdf function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});