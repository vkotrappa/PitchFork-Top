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

// Helper function to extract field values using regex
function extractField(text: string, pattern: RegExp): string | null {
  // Try multiple patterns to extract field values
  const patterns = [
    // Pattern 1: "field: value" or "field value"
    new RegExp(`${pattern.source}[\\s:]+([^\\n,}]+)`, 'i'),
    // Pattern 2: "field" followed by any text until newline or comma
    new RegExp(`${pattern.source}[^\\n,]*?([^\\n,]+)`, 'i'),
    // Pattern 3: Look for quoted values
    new RegExp(`${pattern.source}[\\s:]*["']([^"']+)["']`, 'i')
  ];
  
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      let value = match[1].trim();
      
      // Clean up the value
      value = value
        .replace(/^[:;|•\-\s]+/, '') // Remove leading colons, semicolons, pipes, bullets, dashes, spaces
        .replace(/[:;|•\-\s]+$/, '') // Remove trailing colons, semicolons, pipes, bullets, dashes, spaces
        .replace(/['"]/g, '') // Remove quotes
        .trim();
      
      // Return only if we have meaningful content
      if (value && value.length > 0 && value !== 'null' && value !== 'undefined') {
        return value;
      }
    }
  }
  
  return null;
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
      console.error('PDF download failed:', pdfResponse.status, pdfResponse.statusText);
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF downloaded successfully, size:', pdfBuffer.byteLength, 'bytes');

    // Check if PDF is too small (might be empty)
    if (pdfBuffer.byteLength < 1000) {
      console.warn('WARNING: PDF file is very small, might be empty or corrupted');
    }

    // Extract filename from file_path
    const filename = file_path.split('/').pop() || 'document.pdf';
    console.log('Extracted filename:', filename);

    // Create a File object from the buffer
    const pdfFile = new File([pdfBuffer], filename, { type: 'application/pdf' });
    console.log('Created File object:', pdfFile.name, pdfFile.size, 'bytes');

    // Try to read first few bytes to check PDF header
    const firstBytes = new Uint8Array(pdfBuffer.slice(0, 10));
    const pdfHeader = String.fromCharCode(...firstBytes);
    console.log('PDF header (first 10 bytes):', pdfHeader);
    console.log('Is valid PDF header:', pdfHeader.startsWith('%PDF'));

    console.log('Uploading file to OpenAI...');
    const file = await openai.files.create({
      file: pdfFile,
      purpose: 'assistants',
    });
    console.log('File uploaded to OpenAI successfully:', file.id);

    console.log('Creating assistant...');
    const assistant = await openai.beta.assistants.create({
      name: 'PDF Analyzer',
      instructions: 'You are an expert at analyzing pitch deck PDFs and extracting key information about startups and companies.',
      model: 'gpt-4-turbo-preview',
      tools: [{ type: 'file_search' }],
    });
    console.log('Assistant created successfully:', assistant.id);

    console.log('Creating vector store...');
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'PDF Analysis',
      file_ids: [file.id],
    });
    console.log('Vector store created successfully:', vectorStore.id);

    console.log('Updating assistant with vector store...');
    await openai.beta.assistants.update(assistant.id, {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    });
    console.log('Assistant updated with vector store successfully');

    console.log('Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log('Thread created successfully:', thread.id);

    console.log('Adding message to thread...');
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `You are analyzing a pitch deck PDF for a startup company. Please carefully read through the entire document and extract the following information.

CRITICAL: This is a pitch deck document that should contain company information. Please read the entire document thoroughly.

Look for these specific elements:
- Company name (usually on the first few slides, title slide, or header)
- Industry/sector (what business they're in, market they serve)
- Team members (founders, executives, key personnel with titles)
- Website URL (contact info, footer, or social media links)
- Valuation (funding rounds, investment amounts, company worth)
- Revenue (current revenue, projections, financial metrics)
- Business description (what the company does, problem they solve, target market)
- Funding terms (investment structure, amount seeking, SAFE, equity)

IMPORTANT: If the document appears to be empty, corrupted, or unreadable, please try to extract ANY text you can find, even if it's just a few words.

Extract this information and return it as a JSON object with these exact fields:
{
  "company_name": "string or null",
  "industry": "string or null", 
  "key_team_members": "string or null",
  "url": "string or null",
  "valuation": "string or null",
  "revenue": "string or null",
  "description": "string or null",
  "funding_terms": "string or null"
}

CRITICAL REQUIREMENTS:
1. Return ONLY the JSON object - no other text
2. Use null for any field that cannot be determined
3. For URL: Must be fully formed with https:// protocol
4. For valuation: Look for explicit valuations or funding terms like "SAFE at $36M cap"
5. For team members: List as comma-separated string like "John Smith (CEO), Jane Doe (CTO)"
6. For description: 2-3 sentences about what the company does

If you cannot find ANY information in the document (even after trying to read it thoroughly), return:
{
  "company_name": null,
  "industry": null, 
  "key_team_members": null,
  "url": null,
  "valuation": null,
  "revenue": null,
  "description": null,
  "funding_terms": null
}

Your response must start with { and end with }. No additional text before or after the JSON.`
    });

    console.log('Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });
    console.log('Run created successfully:', run.id);

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('Initial run status:', runStatus.status);

    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      attempts++;
      console.log(`Run attempt ${attempts}/${maxAttempts}, status:`, runStatus.status);
      
      if (attempts >= maxAttempts) {
        throw new Error('Run timeout after 60 seconds');
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    console.log('Final run status:', runStatus.status);

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

    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || lastMessage.content[0].type !== 'text') {
      throw new Error('No text response from assistant');
    }

    const responseText = lastMessage.content[0].text.value;
    console.log('=== RAW AI RESPONSE ===');
    console.log('Response length:', responseText.length);
    console.log('Response content:', responseText);
    console.log('=== END RAW AI RESPONSE ===');

    let extractedInfo;
    try {
      console.log('Attempting to parse JSON from response...');
      
      // Try to find JSON in the response
      let jsonString = responseText.trim();
      
      // Remove any text before the first {
      const firstBrace = jsonString.indexOf('{');
      if (firstBrace > 0) {
        jsonString = jsonString.substring(firstBrace);
      }
      
      // Remove any text after the last }
      const lastBrace = jsonString.lastIndexOf('}');
      if (lastBrace > 0 && lastBrace < jsonString.length - 1) {
        jsonString = jsonString.substring(0, lastBrace + 1);
      }
      
      console.log('Cleaned JSON string:', jsonString);
      
      extractedInfo = JSON.parse(jsonString);
      
      // Clean up any field values that might have colons or other formatting issues
      for (const key in extractedInfo) {
        if (extractedInfo[key] && typeof extractedInfo[key] === 'string') {
          extractedInfo[key] = extractedInfo[key]
            .replace(/^[:;|•\-\s]+/, '') // Remove leading colons, semicolons, pipes, bullets, dashes, spaces
            .replace(/[:;|•\-\s]+$/, '') // Remove trailing colons, semicolons, pipes, bullets, dashes, spaces
            .trim();
        }
      }
      
      console.log('Successfully parsed JSON:', extractedInfo);
      
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Raw response text:', responseText);
      
      // Try to extract individual fields using regex as fallback
      const fallbackExtraction = {
        company_name: extractField(responseText, /company[_\s]*name/i) || null,
        industry: extractField(responseText, /industry/i) || null,
        key_team_members: extractField(responseText, /team[_\s]*members/i) || null,
        url: extractField(responseText, /url/i) || null,
        valuation: extractField(responseText, /valuation/i) || null,
        revenue: extractField(responseText, /revenue/i) || null,
        description: extractField(responseText, /description/i) || null,
        funding_terms: extractField(responseText, /funding[_\s]*terms/i) || null,
        raw_response: responseText,
        parse_error: 'Used fallback extraction method'
      };
      
      extractedInfo = fallbackExtraction;
      console.log('Using fallback extraction:', extractedInfo);
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
    console.log('Company ID:', companyId);
    console.log('Extracted info to update:', extractedInfo);
    
    const updateData: any = {};

    if (extractedInfo.company_name) {
      updateData.name = extractedInfo.company_name;
      console.log('Adding company_name to update:', extractedInfo.company_name);
    }
    if (extractedInfo.industry) {
      updateData.industry = extractedInfo.industry;
      console.log('Adding industry to update:', extractedInfo.industry);
    }
    if (extractedInfo.key_team_members) {
      // Convert array to string if needed
      updateData.key_team_members = Array.isArray(extractedInfo.key_team_members)
        ? extractedInfo.key_team_members.join(', ')
        : extractedInfo.key_team_members;
      console.log('Adding key_team_members to update:', updateData.key_team_members);
    }
    if (extractedInfo.url) {
      updateData.url = extractedInfo.url;
      console.log('Adding url to update:', extractedInfo.url);
    }
    if (extractedInfo.valuation) {
      updateData.valuation = extractedInfo.valuation;
      console.log('Adding valuation to update:', extractedInfo.valuation);
    }
    if (extractedInfo.revenue) {
      updateData.revenue = extractedInfo.revenue;
      console.log('Adding revenue to update:', extractedInfo.revenue);
    }
    if (extractedInfo.description) {
      updateData.description = extractedInfo.description;
      console.log('Adding description to update:', extractedInfo.description);
    }
    if (extractedInfo.funding_terms) {
      updateData.funding_terms = extractedInfo.funding_terms;
      console.log('Adding funding_terms to update:', extractedInfo.funding_terms);
    }

    console.log('Final update data:', updateData);
    console.log('Number of fields to update:', Object.keys(updateData).length);

    if (Object.keys(updateData).length > 0) {
      console.log('Executing companies table update...');
      const { error: updateError } = await supabaseAdmin
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating companies table:', updateError);
        console.error('Update data that failed:', updateData);
        console.error('Company ID used:', companyId);
        // Don't throw error here, just log it
      } else {
        console.log('Companies table updated successfully with data:', updateData);
      }
    } else {
      console.log('No data to update in companies table - all fields were null');
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