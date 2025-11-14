import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  companyId: string;
  companyName?: string;
  analysisId?: string;
  analysisType: 'team' | 'product' | 'market' | 'financial' | 'valuation' | 'detail-report' | 'scorecard';
  documents?: Array<{ id: string; name: string; path: string; }>;
  analysisReports?: Array<{ id: string; report_type: string; file_path: string; generated_at: string; }>;
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
      documents: requestDocuments,
      analysisReports: requestAnalysisReports
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

    if (!analysisType || !['team', 'product', 'market', 'financial', 'valuation', 'detail-report', 'diligence-questions', 'founder-report', 'scorecard'].includes(analysisType)) {
      return new Response(
        JSON.stringify({ error: 'Valid analysisType is required (team, product, market, financial, valuation, detail-report, diligence-questions, founder-report, scorecard)' }),
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
    
    // Step 2: Check LLM preference FIRST (before fetching prompts)
    console.log('Checking LLM preference for user:', userId);
    const { data: llmPreferenceData, error: llmError } = await supabaseAdmin
      .from('llm_preferences')
      .select('preferred_llm')
      .eq('user_id', userId)
      .maybeSingle();

    const preferredLlm = llmPreferenceData?.preferred_llm || 'OpenAI';
    console.log(`User LLM preference: ${preferredLlm}`);

    // Step 3: Fetch the prompt (check investor_prompts first, then system prompts)
    const config = {
      team: { promptName: 'Team-Analysis' },
      product: { promptName: 'Product-Analysis' },
      market: { promptName: 'Market-Analysis' },
      financial: { promptName: 'Financial-Analysis' },
      valuation: { promptName: 'Valuation-Analysis' },
      'detail-report': { promptName: 'Create-Detail-Report' },
      'diligence-questions': { promptName: 'Create-Diligence-Questions' },
      'founder-report': { promptName: 'Create-Founder-Report' },
      'scorecard': { promptName: 'Create-ScoreCard' }
    }[analysisType];
    
    let promptText: string | undefined;
    
    // Fetch prompt prefix once (will be applied to database prompts only)
    const promptPrefix = await getPromptPrefix(supabaseAdmin);
    
    // First, check if investor has custom prompt
    console.log(`Checking for custom prompt for ${config.promptName}...`);
    const { data: customPromptData } = await supabaseAdmin
      .from('investor_prompts')
      .select('custom_prompt')
      .eq('user_id', userId)
      .eq('report_name', config.promptName)
      .maybeSingle();
    
    if (customPromptData && customPromptData.custom_prompt) {
      promptText = customPromptData.custom_prompt;
      console.log(`Using custom prompt from investor_prompts table`);
      
      // Apply prefix to custom prompt from database
      if (promptPrefix && promptText) {
        promptText = promptPrefix + '\n\n' + promptText;
        console.log('Applied prompt prefix to custom prompt from database');
      }
    } else {
      // Fall back to system prompt
      console.log(`Fetching ${config.promptName} prompt from prompts table...`);
      const { data: promptData, error: promptError } = await supabaseAdmin
        .from('prompts')
        .select('prompt_detail')
        .eq('prompt_name', config.promptName)
        .maybeSingle();
      
      if (promptError) {
        console.error(`Error fetching prompt from database:`, promptError);
        // Don't fail here, let validation catch it below
      } else if (!promptData || !promptData.prompt_detail) {
        console.error(`Prompt ${config.promptName} not found in database`);
        // Don't fail here, let validation catch it below
      } else {
        promptText = promptData.prompt_detail;
        console.log('Using system prompt from database');
        
        // Apply prefix to system prompt from database
        if (promptPrefix && promptText) {
          promptText = promptPrefix + '\n\n' + promptText;
          console.log('Applied prompt prefix to system prompt from database');
        }
      }
    }
    
    console.log('Found prompt:', promptText ? 'Yes' : 'No');
    
    // Validate prompt before proceeding
    if (!promptText || promptText.trim().length === 0) {
      console.error('ERROR: No prompt found after all attempts');
      console.error('Config:', config);
      console.error('Custom prompt check:', customPromptData ? 'Found but empty' : 'Not found');
      
      // Update analysis status to failed
      await supabaseAdmin
        .from('analysis')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);
      
      return new Response(
        JSON.stringify({ 
          error: `No prompt found for ${config.promptName}. Please ensure the prompt exists in the database.`,
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log(`Prompt validated: length=${promptText.length} characters`);
    
    // Step 4: Determine which function to call based on preference (already checked above)
    const functionName = preferredLlm === 'Claude' ? 'analyze-company-claude' : 'analyze-company';
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`;
    console.log(`[LLM ROUTING] User preference: ${preferredLlm}, Routing to: ${functionName}`);
    console.log(`[LLM ROUTING] Function URL: ${functionUrl}`);
    console.log(`[LLM ROUTING] Prompt text length: ${promptText?.length || 0}, Custom prompt: ${customPromptData ? 'YES' : 'NO'}`);
    
    // Start the actual analysis in the background
    // We'll call the main analyze-company or analyze-company-claude function asynchronously
    console.log(`[BACKGROUND] Calling ${functionName} with prompt length: ${promptText.length}`);
    
    // Convert analysisReports to existingReports format if provided
    let existingReports = undefined;
    if (requestAnalysisReports && requestAnalysisReports.length > 0) {
      console.log(`Converting ${requestAnalysisReports.length} analysisReports to existingReports format...`);
      existingReports = requestAnalysisReports.map(report => ({
        type: report.report_type,
        path: report.file_path,
        generated_at: report.generated_at
      }));
      console.log('Converted existingReports:', JSON.stringify(existingReports, null, 2));
    } else {
      console.log('No analysisReports provided');
    }
    
    // Start the analysis in the background without blocking
    // Use setTimeout to ensure the function returns immediately
    setTimeout(async () => {
      try {
        const response = await fetch(functionUrl, {
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
            prompt: promptText, // Pass the prompt (custom or system, with prefix applied)
            documents: requestDocuments || [],
            existingReports: existingReports || []
          })
        });
        
        // Don't await the analysis - let it run in background
        response.text().then(async (responseText) => {
          try {
            console.log(`[BACKGROUND] Analysis response status: ${response.status}`);
            console.log(`[BACKGROUND] Analysis response text length: ${responseText.length}`);
            
            if (!response.ok) {
              const errorText = responseText.substring(0, 2000); // Increased from 500 to 2000
              console.error(`[BACKGROUND] Analysis failed with status ${response.status}:`, errorText);
              
              // Update analysis status to failed
              await supabaseAdmin
                .from('analysis')
                .update({ 
                  status: 'failed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', analysisId);
            } else {
              console.log('[BACKGROUND] Analysis completed successfully');
              
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
          console.error('[BACKGROUND] Error handling background analysis result:', error);
          console.error('[BACKGROUND] Error details:', error instanceof Error ? error.message : String(error));
          console.error('[BACKGROUND] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          
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
        console.error('[BACKGROUND] Error reading response:', error);
        console.error('[BACKGROUND] Error details:', error instanceof Error ? error.message : String(error));
        
        // Update analysis status to failed
        await supabaseAdmin
          .from('analysis')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);
      });
    } catch (error) {
      console.error('[BACKGROUND] Error starting background analysis:', error);
      console.error('[BACKGROUND] Error details:', error instanceof Error ? error.message : String(error));
      
      // Update analysis status to failed
      await supabaseAdmin
        .from('analysis')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);
    }
    }, 0); // Execute immediately but asynchronously

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
