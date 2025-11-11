import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import Anthropic from 'npm:@anthropic-ai/sdk@0.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DetailReportTextRequest {
  company_id?: string;
  companyId?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h3>${escapeHtml(line.replace(/^###\s+/, ''))}</h3>`;
    } else if (/^##\s+/.test(line)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h2>${escapeHtml(line.replace(/^##\s+/, ''))}</h2>`;
    } else if (/^#\s+/.test(line)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h1>${escapeHtml(line.replace(/^#\s+/, ''))}</h1>`;
    } else if (/^-\s+/.test(line)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${escapeHtml(line.replace(/^-\s+/, ''))}</li>`;
    } else if (line.trim() === '') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<br />';
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

function generateHtmlReport(title: string, companyName: string, reportText: string): string {
  const htmlContent = markdownToHtml(reportText);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 1.25in 1in;
      background: #f9fafb;
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24pt;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px;
    }
    .subtitle {
      font-size: 14pt;
      color: #4b5563;
      margin: 0 0 4px;
    }
    .meta {
      font-size: 10pt;
      color: #6b7280;
    }
    h1, h2, h3 {
      color: #1f2937;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    h1 { font-size: 18pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    p {
      margin-top: 0;
      margin-bottom: 12px;
      text-align: justify;
    }
    ul {
      margin: 12px 0 12px 24px;
      padding: 0;
    }
    li {
      margin-bottom: 6px;
    }
    br {
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="title">${escapeHtml(title)}</div>
    <div class="subtitle">${escapeHtml(companyName)}</div>
    <div class="meta">Generated on ${new Date().toLocaleString('en-US')}</div>
  </header>
  <main class="content">
    ${htmlContent}
  </main>
</body>
</html>`;
}

function buildCompanyProfile(company: any): string {
  const lines: string[] = [];

  lines.push('=== COMPANY PROFILE (DATABASE) ===');
  if (company.name) lines.push(`Company Name: ${company.name}`);
  if (company.industry) lines.push(`Industry: ${company.industry}`);
  if (company.description) lines.push(`Description: ${company.description}`);
  if (company.country) lines.push(`Country: ${company.country}`);
  if (company.url) lines.push(`Website: ${company.url}`);
  if (company.revenue) lines.push(`Revenue: ${company.revenue}`);
  if (company.valuation) lines.push(`Valuation: ${company.valuation}`);
  if (company.funding_terms) lines.push(`Funding Terms: ${company.funding_terms}`);
  if (company.terms) lines.push(`Additional Terms: ${company.terms}`);
  lines.push('');

  lines.push('Primary Contact:');
  if (company.contact_name) lines.push(`  Name: ${company.contact_name}`);
  if (company.title) lines.push(`  Title: ${company.title}`);
  if (company.email) lines.push(`  Email: ${company.email}`);
  if (company.phone) lines.push(`  Phone: ${company.phone}`);

  lines.push('\nMatching Attributes:');
  if (Array.isArray(company.industry_sectors) && company.industry_sectors.length > 0) {
    lines.push(
      `  Industry Sectors: ${company.industry_sectors
        .map((sector: any) =>
          [sector?.sector, sector?.sub_sector].filter(Boolean).join(' - ')
        )
        .join(', ')}`
    );
  }
  if (company.geography) lines.push(`  Geography: ${company.geography}`);
  if (company.business_model?.length) lines.push(`  Business Models: ${company.business_model.join(', ')}`);
  if (company.ownership_leadership?.length) lines.push(`  Ownership/Leadership: ${company.ownership_leadership.join(', ')}`);

  return lines.join('\n');
}

async function getPromptPrefix(supabaseAdmin: any): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('prompt_detail')
      .eq('prompt_name', 'prompt-prefix')
      .maybeSingle();
    if (error || !data) return null;
    return data.prompt_detail;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const htmlToPdfApiKey = Deno.env.get('HTML_TO_PDF_API_KEY');
    const htmlToPdfEndpoint = Deno.env.get('HTML_TO_PDF_ENDPOINT') || 'https://api.html2pdf.app/v1/generate';

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    if (!htmlToPdfApiKey) {
      throw new Error('HTML_TO_PDF_API_KEY environment variable is not set');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DetailReportTextRequest = await req.json();
    const companyId = body.company_id || body.companyId;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error('Unable to authenticate user');
    }
    const investorId = userData.user.id;

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    if (!company.extracted_text || typeof company.extracted_text !== 'string' || company.extracted_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No extracted_text available for this company. Please run Extract Text first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: customPromptData } = await supabaseAdmin
      .from('investor_prompts')
      .select('custom_prompt')
      .eq('user_id', investorId)
      .eq('report_name', 'Create-Detail-Report')
      .maybeSingle();

    const { data: defaultPromptData, error: promptError } = await supabaseAdmin
      .from('prompts')
      .select('prompt_detail')
      .eq('prompt_name', 'Create-Detail-Report')
      .maybeSingle();

    if (promptError || (!customPromptData?.custom_prompt && !defaultPromptData?.prompt_detail)) {
      throw new Error('Detail report prompt not found');
    }

    const promptPrefix = await getPromptPrefix(supabaseAdmin);
    let promptTemplate = customPromptData?.custom_prompt || defaultPromptData?.prompt_detail || '';
    if (promptPrefix) {
      promptTemplate = `${promptPrefix}\n\n${promptTemplate}`;
    }

    const companyProfile = buildCompanyProfile(company);
    const finalPrompt = `${promptTemplate.trim()}

The following company profile and extracted text are the ONLY sources you may use. Do NOT reference PDFs directly.

${companyProfile}

=== EXTRACTED COMPANY TEXT ===
${company.extracted_text}
`;

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
    });

    if (message.content[0].type !== 'text') {
      throw new Error('Unexpected response format from Anthropic');
    }

    const reportText = message.content[0].text.trim();

    const htmlContent = generateHtmlReport('Detail Report', company.name ?? 'Unknown Company', reportText);
    let convertResponse = await fetch(htmlToPdfEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${htmlToPdfApiKey}`,
      },
      body: JSON.stringify({
        html: htmlContent,
        format: 'Letter',
        margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
        printBackground: true,
      }),
    });

    if (!convertResponse.ok && convertResponse.status === 401) {
      convertResponse = await fetch(htmlToPdfEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: htmlToPdfApiKey,
          html: htmlContent,
          format: 'Letter',
          margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
          printBackground: true,
        }),
      });
    }

    if (!convertResponse.ok) {
      throw new Error(`HTML-to-PDF conversion failed: ${convertResponse.statusText}`);
    }

    let pdfBuffer: ArrayBuffer;
    const contentType = convertResponse.headers.get('content-type') || '';

    if (contentType.includes('application/pdf')) {
      pdfBuffer = await convertResponse.arrayBuffer();
    } else {
      const result = await convertResponse.json();
      if (result.url) {
        const pdfFetch = await fetch(result.url);
        if (!pdfFetch.ok) {
          throw new Error('Failed to download converted PDF');
        }
        pdfBuffer = await pdfFetch.arrayBuffer();
      } else if (result.pdf) {
        const base64Data = result.pdf.replace(/^data:application\/pdf;base64,/, '');
        pdfBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)).buffer;
      } else {
        throw new Error('Conversion API returned unexpected format');
      }
    }

    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

    const companySlug = (company.name || 'unknown-company')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const reportFileName = `${companySlug}_detail-report-text_${timestamp}.pdf`;
    const reportPath = `${companyId}/${reportFileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .upload(reportPath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('analysis-output-docs')
      .createSignedUrl(reportPath, 3600);

    let analysisId: string | null = null;
    const { data: existingAnalysis } = await supabaseAdmin
      .from('analysis')
      .select('id')
      .eq('company_id', companyId)
      .eq('investor_user_id', investorId)
      .maybeSingle();

    if (existingAnalysis) {
      analysisId = existingAnalysis.id;
    } else {
      const { data: newAnalysis, error: analysisError } = await supabaseAdmin
        .from('analysis')
        .insert({
          company_id: companyId,
          investor_user_id: investorId,
          status: 'Analyzed',
        })
        .select('id')
        .single();

      if (analysisError || !newAnalysis) {
        throw new Error('Failed to create analysis record');
      }
      analysisId = newAnalysis.id;
    }

    if (analysisId) {
      await supabaseAdmin
        .from('analysis_reports')
        .insert({
          analysis_id: analysisId,
          company_id: companyId,
          report_type: 'detail-report-text',
          file_name: reportFileName,
          file_path: reportPath,
          generated_by: investorId,
        });

      await supabaseAdmin
        .from('analysis')
        .update({
          status: 'Analyzed',
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_text: reportText,
        company_name: company.name,
        report: {
          file_name: reportFileName,
          file_path: reportPath,
          download_url: signedUrlData?.signedUrl ?? null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detail-report-text function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

