import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  companyId: string;
  companyName?: string;
  analysisId?: string;
  analysisType: 'team' | 'product' | 'market' | 'financial';
  documents?: Array<{ id: string; name: string; path: string; }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== BACKGROUND ANALYSIS FUNCTION CALLED ===');
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header missing or invalid');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT token to get user info
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const userId = payload.sub;
    const userEmail = payload.email;

    if (!userId) {
      throw new Error('User ID not found in token');
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const requestBody: RequestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { 
      companyId,
      companyName: requestCompanyName,
      analysisId: requestAnalysisId,
      analysisType,
      documents: requestDocuments
    } = requestBody;

    // Validate required fields
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requestCompanyName) {
      return new Response(
        JSON.stringify({ error: 'companyName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!analysisType || !['team', 'product', 'market', 'financial'].includes(analysisType)) {
      return new Response(
        JSON.stringify({ error: 'Valid analysisType is required (team, product, market, financial)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company name
    let companyName = requestCompanyName;
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
    }

    // Get or create analysis entry
    let analysisId: string = requestAnalysisId || '';
    
    if (!analysisId) {
      const { data: existingAnalysis } = await supabaseAdmin
        .from('analysis')
        .select('id')
        .eq('company_id', companyId)
        .eq('investor_user_id', userId)
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
      } else {
        // Create new analysis entry
        const { data: newAnalysis, error: analysisError } = await supabaseAdmin
          .from('analysis')
          .insert({
            company_id: companyId,
            investor_user_id: userId,
            status: 'in_progress',
          })
          .select('id')
          .single();

        if (analysisError || !newAnalysis) {
          throw new Error('Failed to create analysis entry');
        }
        analysisId = newAnalysis.id;
      }
    }

    // Update analysis status to in_progress
    await supabaseAdmin
      .from('analysis')
      .update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    console.log(`Starting background analysis for ${analysisType} - Analysis ID: ${analysisId}`);

    console.log('Starting background analysis with documents:', requestDocuments?.length || 0);
    
    // Fetch the prompt from the database
    const config = {
      team: { promptName: 'Team-Analysis' },
      product: { promptName: 'Product-Analysis' },
      market: { promptName: 'Market-Analysis' },
      financial: { promptName: 'Financial-Analysis' }
    }[analysisType];
    
    const { data: promptData } = await supabaseAdmin
      .from('prompts')
      .select('prompt_detail')
      .eq('prompt_name', config.promptName)
      .single();
    
    console.log('Found prompt:', promptData?.prompt_detail ? 'Yes' : 'No');
    
    // Start the actual analysis in the background
    // We'll call the main analyze-company function asynchronously
    const analysisPromise = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        companyId,
        companyName,
        analysisId,
        analysisType,
        prompt: promptData?.prompt_detail,
        documents: requestDocuments || []
      })
    });

    // Don't await the analysis - let it run in background
    analysisPromise.then(async (response) => {
      try {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Background analysis failed:', errorText);
          
          // Update analysis status to failed
          await supabaseAdmin
            .from('analysis')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', analysisId);
        } else {
          console.log('Background analysis completed successfully');
          
          // Update analysis status to Analyzed
          await supabaseAdmin
            .from('analysis')
            .update({ 
              status: 'Analyzed',
              updated_at: new Date().toISOString()
            })
            .eq('id', analysisId);
        }
      } catch (error) {
        console.error('Error handling background analysis result:', error);
        
        // Update analysis status to failed
        await supabaseAdmin
          .from('analysis')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);
      }
    }).catch(async (error) => {
      console.error('Background analysis promise failed:', error);
      
      // Update analysis status to failed
      await supabaseAdmin
        .from('analysis')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);
    });

    // Return immediately with analysis ID
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analysis started in background',
        analysisId: analysisId,
        status: 'in_progress'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-company-background function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
