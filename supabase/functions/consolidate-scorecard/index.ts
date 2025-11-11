import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Helper function to parse scorecard text format
// Expected format: "8.5/10: Product\n8.1: Category1\n9.1: Category2"
function parseScoreCard(scoreText: string): { title: string; overallScore: string; categories: Array<{ name: string; score: string }> } | null {
  if (!scoreText || !scoreText.trim()) {
    return null;
  }
  
  try {
    const lines = scoreText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return null;
    }
    
    // First line should be "8.5/10: Product" format
    const firstLine = lines[0].trim();
    const headerMatch = firstLine.match(/^(\d+\.?\d*)\/10:\s*(.+)$/);
    
    if (!headerMatch) {
      // Try alternative format: "8.5: Product" (without /10)
      const altMatch = firstLine.match(/^(\d+\.?\d*):\s*(.+)$/);
      if (!altMatch) {
        return null;
      }
      
      const overallScore = altMatch[1].trim();
      const title = altMatch[2].trim();
      
      // Remaining lines should be "8.1: Category Name" format
      const categories: Array<{ name: string; score: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const categoryMatch = line.match(/^(\d+\.?\d*):\s*(.+)$/);
        if (categoryMatch) {
          categories.push({
            name: categoryMatch[2].trim(),
            score: categoryMatch[1].trim()
          });
        }
      }
      
      return {
        title: title,
        overallScore: overallScore,
        categories: categories
      };
    }
    
    const overallScore = headerMatch[1].trim();
    const title = headerMatch[2].trim();
    
    // Remaining lines should be "8.1: Category Name" format
    const categories: Array<{ name: string; score: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const categoryMatch = line.match(/^(\d+\.?\d*):\s*(.+)$/);
      if (categoryMatch) {
        categories.push({
          name: categoryMatch[2].trim(),
          score: categoryMatch[1].trim()
        });
      }
    }
    
    return {
      title: title,
      overallScore: overallScore,
      categories: categories
    };
  } catch (error) {
    console.error('Error parsing scorecard:', error);
    return null;
  }
}

// Generate consolidated scorecard HTML
function generateConsolidatedScorecardHtml(
  companyName: string,
  scoreCardData: Record<string, { score_card: string; generated_at: string } | null>,
  dateStr: string,
  timeStr: string
): string {
  const analysisTypes = [
    { key: 'product-analysis', label: 'Product Analysis' },
    { key: 'market-analysis', label: 'Market Analysis' },
    { key: 'team-analysis', label: 'Team Analysis' },
    { key: 'financial-analysis', label: 'Financial Analysis' }
  ];

  let scorecardSections = '';
  let overallScores: Array<{ label: string; score: number }> = [];
  let allCategories: Array<{ analysis: string; name: string; score: string }> = [];

  for (const analysisType of analysisTypes) {
    const data = scoreCardData[analysisType.key];
    if (data && data.score_card) {
      const parsed = parseScoreCard(data.score_card);
      if (parsed) {
        const scoreNum = parseFloat(parsed.overallScore);
        if (!isNaN(scoreNum)) {
          overallScores.push({ label: parsed.title, score: scoreNum });
        }

        scorecardSections += `
          <div class="scorecard-section">
            <h2>${parsed.title}</h2>
            <div class="overall-score">Overall Score: <strong>${parsed.overallScore}/10</strong></div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${parsed.categories.map(cat => `
                  <tr>
                    <td>${cat.name}</td>
                    <td><strong>${cat.score}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        // Add categories to consolidated list
        parsed.categories.forEach(cat => {
          allCategories.push({
            analysis: parsed.title,
            name: cat.name,
            score: cat.score
          });
        });
      }
    }
  }

  // Calculate overall weighted average
  let overallAverage = 0;
  if (overallScores.length > 0) {
    const sum = overallScores.reduce((acc, item) => acc + item.score, 0);
    overallAverage = sum / overallScores.length;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Investment Score Card</title>
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
    
    .overall-summary {
      background-color: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .overall-summary h2 {
      font-size: 20pt;
      margin-bottom: 15px;
      color: #1f2937;
    }
    
    .overall-score-value {
      font-size: 36pt;
      font-weight: bold;
      color: #2563eb;
      margin: 10px 0;
    }
    
    .scorecard-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .scorecard-section h2 {
      font-size: 18pt;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
      border-bottom: 2px solid #d1d5db;
      padding-bottom: 8px;
    }
    
    .overall-score {
      font-size: 14pt;
      margin-bottom: 15px;
      color: #4b5563;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    
    table th,
    table td {
      border: 1px solid #d1d5db;
      padding: 10px 12px;
      text-align: left;
    }
    
    table th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #1f2937;
    }
    
    table tr:nth-child(even) {
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
    <div class="title">Investment Score Card</div>
    <div class="company-name">${companyName}</div>
    <div class="metadata">
      Generated: ${dateStr} at ${timeStr}
    </div>
  </div>
  
  <div class="overall-summary">
    <h2>Overall Investment Score</h2>
    <div class="overall-score-value">${overallAverage.toFixed(2)}/10</div>
    <p>Based on ${overallScores.length} analysis categories</p>
  </div>
  
  <div class="content">
    ${scorecardSections}
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { companyId, companyName, analysisId, scoreCardData } = body;

    if (!companyId || !companyName || !analysisId || !scoreCardData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: companyId, companyName, analysisId, scoreCardData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Consolidating scorecard for company: ${companyName}`);

    // Generate HTML content
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const htmlContent = generateConsolidatedScorecardHtml(
      companyName,
      scoreCardData,
      dateStr,
      timeStr
    );

    // Convert HTML to PDF using external API
    const htmlToPdfApiKey = Deno.env.get('HTML_TO_PDF_API_KEY');
    const htmlToPdfEndpoint = Deno.env.get('HTML_TO_PDF_ENDPOINT') || 'https://api.html2pdf.app/v1/generate';

    if (!htmlToPdfApiKey) {
      throw new Error('HTML_TO_PDF_API_KEY environment variable is not set');
    }

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
              bottom: '0.75in',
              left: '0.75in'
            },
            landscape: false,
            printBackground: true
          })
        });
      }
    } catch (fetchError) {
      console.error('Fetch error calling HTML->PDF API:', fetchError);
      throw new Error(`Failed to call HTML->PDF conversion service: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
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
      throw new Error(`HTML->PDF conversion failed: ${convertResponse.status} ${convertResponse.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }

    // html2pdf.app may return PDF directly or JSON with URL
    let pdfArrayBuffer: ArrayBuffer;
    const contentType = convertResponse.headers.get('content-type') || '';
    
    console.log('Response content-type:', contentType);
    console.log('Response status:', convertResponse.status);
    console.log('Response headers:', Object.fromEntries(convertResponse.headers.entries()));
    
    if (contentType.includes('application/pdf')) {
      // PDF returned directly
      console.log('PDF returned directly from API');
      pdfArrayBuffer = await convertResponse.arrayBuffer();
    } else if (contentType.includes('application/json') || contentType.includes('text/json')) {
      // JSON response with URL or base64
      try {
        const result = await convertResponse.json();
        console.log('API response:', JSON.stringify(result));
        
        if (result.url) {
          // Download PDF from URL
          console.log('Downloading PDF from URL:', result.url);
          const pdfResponse = await fetch(result.url);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to download PDF from URL: ${pdfResponse.status} ${pdfResponse.statusText}`);
          }
          pdfArrayBuffer = await pdfResponse.arrayBuffer();
        } else if (result.pdf) {
          // Base64 encoded PDF
          console.log('PDF returned as base64 in response');
          const pdfBase64 = result.pdf;
          pdfArrayBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0)).buffer;
        } else {
          throw new Error('Unexpected API response format');
        }
      } catch (jsonError) {
        console.error('Error parsing API response:', jsonError);
        
        // Check if we got HTML instead of JSON
        const responseText = await convertResponse.text();
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          console.error('API returned HTML error page instead of JSON/PDF');
          throw new Error(`HTML-to-PDF API returned an HTML error page. This usually means the API endpoint is incorrect, the API key is invalid, or the service is unavailable. Status: ${convertResponse.status}. Please check your HTML_TO_PDF_API_KEY environment variable.`);
        }
        
        throw new Error(`Failed to parse PDF from API response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      }
    } else if (contentType.includes('text/html')) {
      // HTML error page returned
      const htmlResponse = await convertResponse.text();
      console.error('API returned HTML error page:', htmlResponse.substring(0, 500));
      throw new Error(`HTML-to-PDF API returned an HTML error page instead of PDF. Status: ${convertResponse.status}. This usually means the API endpoint is incorrect, the API key is invalid, or the service is unavailable. Please check your HTML_TO_PDF_API_KEY environment variable.`);
    } else {
      // Unknown content type - try to read as PDF anyway
      console.warn('Unexpected content-type:', contentType, '- attempting to read as PDF');
      try {
        pdfArrayBuffer = await convertResponse.arrayBuffer();
        // Check if it's actually HTML
        const textDecoder = new TextDecoder();
        const preview = textDecoder.decode(pdfArrayBuffer.slice(0, 100));
        if (preview.trim().startsWith('<!DOCTYPE') || preview.trim().startsWith('<html')) {
          throw new Error(`API returned HTML instead of PDF. Status: ${convertResponse.status}. Please check your HTML_TO_PDF_API_KEY environment variable.`);
        }
      } catch (readError) {
        const responseText = await convertResponse.text();
        throw new Error(`Failed to process API response. Content-Type: ${contentType}, Status: ${convertResponse.status}. Response preview: ${responseText.substring(0, 200)}`);
      }
    }

    const pdfBytes = new Uint8Array(pdfArrayBuffer);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedCompanyName}_scorecard_${timestamp}.pdf`;
    const filePath = `reports/${companyId}/${fileName}`;

    // Upload PDF to Supabase Storage
    console.log(`Uploading PDF to storage: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('analysis-output-docs')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('analysis-output-docs')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Get company_id from analysis record
    const { data: analysisData, error: analysisError } = await supabaseAdmin
      .from('analysis')
      .select('company_id')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysisData) {
      console.error('Error fetching analysis data:', analysisError);
      throw new Error(`Failed to fetch analysis data: ${analysisError?.message || 'Analysis not found'}`);
    }

    // Create report record
    const reportData = {
      analysis_id: analysisId,
      company_id: analysisData.company_id,
      report_type: 'scorecard-analysis',
      file_name: fileName,
      file_path: filePath,
      generated_by: user.id
    };

    console.log('Creating report record:', reportData);
    const { data: reportRecord, error: reportError } = await supabaseAdmin
      .from('analysis_reports')
      .insert(reportData)
      .select('id, analysis_id, company_id, report_type, file_name, file_path, generated_at, generated_by')
      .single();

    if (reportError) {
      console.error('Error creating report record:', reportError);
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    console.log('Scorecard consolidated successfully:', reportRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        reportId: reportRecord.id,
        filePath: filePath,
        reportUrl: publicUrl
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in consolidate-scorecard:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

