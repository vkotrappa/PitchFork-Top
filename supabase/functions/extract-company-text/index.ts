import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  company_id?: string;
}

async function extractTextFromPDF(pdfBuffer: ArrayBuffer, filename: string): Promise<string> {
  try {
    console.log(`Extracting text from PDF: ${filename}, size: ${pdfBuffer.byteLength} bytes`);

    const firstBytes = new Uint8Array(pdfBuffer.slice(0, 4));
    const header = String.fromCharCode(...firstBytes);
    if (!header.startsWith('%PDF')) {
      console.warn(`File ${filename} does not appear to be a valid PDF (header: ${header})`);
      return `[Note: File "${filename}" does not appear to be a valid PDF file. Header: ${header}]`;
    }

    const pdfjsLib = await import('npm:pdfjs-dist@4.0.379');
    let pdf;

    try {
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        verbosity: 0,
      });
      pdf = await loadingTask.promise;
    } catch (error1) {
      console.warn('First PDF load attempt failed, retrying with ArrayBuffer:', error1);
      const loadingTask = pdfjsLib.getDocument({
        data: pdfBuffer,
        useSystemFonts: true,
        verbosity: 0,
      });
      pdf = await loadingTask.promise;
    }

    console.log(`PDF loaded: ${pdf.numPages} pages`);
    let fullText = '';

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

    const maxLength = 500000;
    if (fullText.length > maxLength) {
      console.warn(`PDF text exceeds ${maxLength} characters, truncating`);
      fullText = fullText.substring(0, maxLength) + '\n\n[Content truncated due to length limits]';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `[Note: Could not extract text from PDF file "${filename}". The PDF may be corrupted, encrypted, or in an unsupported format. Error: ${errorMessage}. The extraction will proceed without this document's content.]`;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    ...defaultCorsHeaders,
    'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: ExtractRequest = await req.json();
    const companyId = body.company_id;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('documents')
      .select('id, filename, path')
      .eq('company_id', companyId);

    if (documentsError) {
      throw new Error(`Failed to load documents: ${documentsError.message}`);
    }

    const pdfDocuments =
      documents?.filter((doc) => doc.path?.toLowerCase().endsWith('.pdf')) ?? [];

    if (pdfDocuments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          extracted_text: '',
          message: 'No PDF documents found for this company.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let combinedText = '';
    const errors: Array<{ path: string; error: string }> = [];

    for (const doc of pdfDocuments) {
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('company-documents')
          .createSignedUrl(doc.path, 60);

        if (signedUrlError || !signedUrlData) {
          throw new Error(signedUrlError?.message ?? 'Unknown signed URL error');
        }

        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error(`Failed to download PDF (${response.status} ${response.statusText})`);
        }

        const pdfArrayBuffer = await response.arrayBuffer();
        const text = await extractTextFromPDF(pdfArrayBuffer, doc.filename);

        if (text.trim().startsWith('[Note: Could not extract text')) {
          errors.push({ path: doc.path, error: text });
          continue;
        }

        combinedText += `\n\n===== ${doc.filename} =====\n${text}`;
      } catch (error) {
        console.error('Error processing document', doc.path, error);
        errors.push({
          path: doc.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    combinedText = combinedText.trim();

    if (combinedText.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('companies')
        .update({ extracted_text: combinedText })
        .eq('id', companyId);

      if (updateError) {
        throw new Error(`Failed to update company with extracted text: ${updateError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_text: combinedText,
        message: combinedText.length > 0
          ? 'Extraction complete.'
          : 'No text extracted from the available documents.',
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('extract-company-text error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

