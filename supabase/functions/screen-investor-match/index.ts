// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScreeningRequest {
  company_id: string
  investor_user_id: string
  analysis_id: string
}

interface ScreeningResult {
  recommendation: 'Accept' | 'Reject'
  reason: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== SCREENING STARTED ===')
    console.log('Timestamp:', new Date().toISOString())
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✓ Supabase client initialized')

    // Initialize Supabase admin client (needed to fetch user preferences)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Parse request body to get user_id first
    const { company_id, investor_user_id, analysis_id }: ScreeningRequest = await req.json()

    // Get LLM preference for the user
    console.log('Fetching LLM preference for user:', investor_user_id)
    const { data: llmPreferenceData, error: llmError } = await supabaseAdmin
      .from('llm_preferences')
      .select('preferred_llm')
      .eq('user_id', investor_user_id)
      .maybeSingle()

    const preferredLlm = llmPreferenceData?.preferred_llm || 'OpenAI'
    console.log(`✓ User LLM preference: ${preferredLlm}`)

    // Initialize LLM client based on preference
    let openai: OpenAI | null = null
    let anthropic: any = null
    const useClaude = preferredLlm === 'Claude'
    
    if (useClaude) {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
      if (!anthropicApiKey) {
        console.log('⚠️  ANTHROPIC_API_KEY not set, falling back to OpenAI')
      } else {
        try {
          const Anthropic = (await import('npm:@anthropic-ai/sdk@0.31.0')).default
          anthropic = new Anthropic({ apiKey: anthropicApiKey })
          console.log('✓ Anthropic client initialized')
        } catch (error) {
          console.error('Error initializing Anthropic:', error)
          console.log('⚠️  Falling back to OpenAI')
        }
      }
    }
    
    // Initialize OpenAI client (used as fallback or when preference is OpenAI)
    if (!useClaude || !anthropic) {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not set (required as fallback)')
      }
      openai = new OpenAI({ apiKey: openaiApiKey })
      console.log('✓ OpenAI client initialized')
    }

    // Request body already parsed above

    console.log('=== REQUEST PARAMETERS ===')
    console.log('Company ID:', company_id)
    console.log('Investor User ID:', investor_user_id)
    console.log('Analysis ID:', analysis_id)

    // 1. Fetch investor criteria from investor_details table
    console.log('=== STEP 1: FETCHING INVESTOR CRITERIA ===')
    const { data: investorDetails, error: investorError } = await supabase
      .from('investor_details')
      .select('investment_criteria_doc, name, email')
      .eq('user_id', investor_user_id)
      .single()

    if (investorError || !investorDetails) {
      console.error('❌ Error fetching investor details:', investorError)
      throw new Error(`Could not find investor details for user ${investor_user_id}`)
    }

    console.log('✓ Investor found:', investorDetails.name, '(' + investorDetails.email + ')')
    const investmentCriteria = investorDetails.investment_criteria_doc || 'No specific criteria provided'
    console.log('✓ Investment criteria length:', investmentCriteria.length, 'characters')
    console.log('Investment criteria preview:', investmentCriteria.substring(0, 200) + '...')

    // 2. Fetch company information
    console.log('=== STEP 2: FETCHING COMPANY INFORMATION ===')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      console.error('❌ Error fetching company:', companyError)
      throw new Error(`Could not find company ${company_id}`)
    }

    console.log('✓ Company found:', company.name)
    console.log('  Industry:', company.industry || 'N/A')
    console.log('  Revenue:', company.revenue || 'N/A')
    console.log('  Valuation:', company.valuation || 'N/A')
    console.log('  Funding Stage:', company.funding_stage || 'N/A')

    // 3. Fetch the pitch deck from company-documents storage
    console.log('=== STEP 3: FETCHING PITCH DECK ===')
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', company_id)
      .order('date_added', { ascending: false })
      .limit(1)

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
      throw new Error('Could not fetch company documents')
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️  No pitch deck found, will use company text data only')
    }

    let pitchDeckPath = null
    if (documents && documents.length > 0) {
      pitchDeckPath = documents[0].file_path
      console.log('✓ Found pitch deck:')
      console.log('  File name:', documents[0].document_name)
      console.log('  File path:', pitchDeckPath)
      console.log('  Date added:', documents[0].date_added)
    }

    // 4. Download the pitch deck if available
    console.log('=== STEP 4: DOWNLOADING & UPLOADING PITCH DECK ===')
    let fileId = null
    if (pitchDeckPath) {
      console.log('Downloading from storage bucket: company-documents')
      console.log('Path:', pitchDeckPath)
      
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('company-documents')
        .download(pitchDeckPath)

      if (downloadError) {
        console.error('❌ Error downloading pitch deck:', downloadError)
        console.log('Will proceed without pitch deck')
      } else {
        console.log('✓ Downloaded pitch deck')
        console.log('  File size:', fileData.size, 'bytes')
        console.log('  File type:', fileData.type)

        // Upload to OpenAI
        console.log('Uploading to OpenAI...')
        const fileBlob = new Blob([fileData], { type: 'application/pdf' })
        const file = new File([fileBlob], 'pitch-deck.pdf', { type: 'application/pdf' })

        const uploadedFile = await openai.files.create({
          file: file,
          purpose: 'assistants',
        })

        fileId = uploadedFile.id
        console.log('✓ Uploaded to OpenAI')
        console.log('  OpenAI File ID:', fileId)
        console.log('  File name:', uploadedFile.filename)
        console.log('  File bytes:', uploadedFile.bytes)
      }
    } else {
      console.log('⚠️  No pitch deck path, skipping file upload')
    }

    // 5. Create company summary text
    console.log('=== STEP 5: PREPARING SCREENING PROMPT ===')
    const companySummary = `
Company Name: ${company.name || 'N/A'}
Industry: ${company.industry || 'N/A'}
Description: ${company.description || 'N/A'}
Funding Stage: ${company.funding_stage || 'N/A'}
Revenue: ${company.revenue || 'N/A'}
Valuation: ${company.valuation || 'N/A'}
Location: ${company.address || 'N/A'}, ${company.country || 'N/A'}
Website: ${company.url || 'N/A'}
Contact: ${company.contact_name || 'N/A'} (${company.email || 'N/A'})
`.trim()

    console.log('Company summary prepared:')
    console.log(companySummary)

    // 6. Create the screening prompt
    const screeningPrompt = `You are an investment screening assistant. Your job is to evaluate if a company matches an investor's investment criteria.

INVESTOR'S INVESTMENT CRITERIA:
${investmentCriteria}

OFFICIAL COMPANY INFORMATION (Verified and Corrected by Founder):
${companySummary}

${fileId ? `ATTACHED PITCH DECK:
A pitch deck PDF is attached for additional context and background information.

CRITICAL INSTRUCTIONS:
- The "Official Company Information" above has been VERIFIED AND CORRECTED by the founder
- This information is MORE ACCURATE than what may be in the pitch deck
- USE the official company information as your PRIMARY SOURCE for screening
- The pitch deck is SUPPLEMENTARY - use it for additional context, team info, vision, etc.
- If there are ANY DISCREPANCIES between the official information and the pitch deck, ALWAYS use the official information
- For example:
  * If official info says "Revenue: $1.2M ARR" but pitch deck shows "$800K", use $1.2M
  * If official info says "Industry: Healthcare AI" but pitch deck says "Healthcare", use Healthcare AI
  * If official info says "Valuation: $50M" but pitch deck shows "$36M SAFE cap", use $50M

The founder has updated this information to be current and accurate.` : 'No pitch deck is available, evaluate based on the official company information provided.'}

TASK:
Based on the investor's criteria and the OFFICIAL COMPANY INFORMATION (not the pitch deck), determine if this company should be:
- "Accept": The company matches the investor's criteria and should proceed to detailed analysis
- "Reject": The company does not match the investor's criteria and should be screened out

Provide your response in the following JSON format:
{
  "recommendation": "Accept" or "Reject",
  "reason": "A brief 2-3 sentence explanation of why you made this recommendation, specifically referencing the investor's criteria and the official company information"
}

Be strict but fair. Only recommend "Accept" if there's a clear match with the investor's stated criteria. Base your decision on the official company information provided above.`

    console.log(`=== STEP 6: SENDING TO ${useClaude && anthropic ? 'ANTHROPIC' : 'OPENAI'} ===`)
    console.log('Prompt length:', screeningPrompt.length, 'characters')
    console.log('Has pitch deck:', !!fileId)
    console.log('Will use:', fileId ? 'Assistants API with file_search' : 'Chat Completions API')

    // 7. Call OpenAI for screening
    let screeningResult: ScreeningResult

    if (fileId) {
      // Use Assistants API with file search if we have a pitch deck
      // Note: Assistants API is only available with OpenAI, so we use OpenAI even if Claude is preferred
      if (!openai) {
        throw new Error('OpenAI client required for Assistants API (pitch deck attachment)')
      }
      console.log('Creating OpenAI Assistant...')
      const assistant = await openai.beta.assistants.create({
        name: 'Investment Screening Assistant',
        instructions: 'You are an expert investment screening assistant. Analyze companies against investor criteria and provide recommendations.',
        model: 'gpt-4-turbo-preview',
        tools: [{ type: 'file_search' }],
      })
      console.log('✓ Assistant created:', assistant.id)

      console.log('Creating thread with pitch deck attachment...')
      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: 'user',
            content: screeningPrompt,
            attachments: [
              {
                file_id: fileId,
                tools: [{ type: 'file_search' }],
              },
            ],
          },
        ],
      })
      console.log('✓ Thread created:', thread.id)

      console.log('Running analysis (this may take 30-60 seconds)...')
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id,
      })
      console.log('✓ Run completed with status:', run.status)

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id)
        const lastMessage = messages.data[0]
        
        if (lastMessage.content[0].type === 'text') {
          const responseText = lastMessage.content[0].text.value
          console.log('=== OPENAI RESPONSE ===')
          console.log(responseText)
          console.log('======================')
          
          // Parse JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            screeningResult = JSON.parse(jsonMatch[0])
            console.log('✓ Parsed JSON successfully')
          } else {
            console.error('❌ Could not find JSON in response')
            throw new Error('Could not parse JSON from OpenAI response')
          }
        } else {
          console.error('❌ Unexpected content type:', lastMessage.content[0].type)
          throw new Error('Unexpected response format from OpenAI')
        }
      } else {
        console.error('❌ Run failed with status:', run.status)
        throw new Error(`OpenAI run failed with status: ${run.status}`)
      }

      // Cleanup
      console.log('Cleaning up OpenAI resources...')
      await openai.beta.assistants.del(assistant.id)
      if (fileId) {
        await openai.files.del(fileId)
      }
      console.log('✓ Cleanup complete')
    } else {
      // Use Chat Completions API without file
      console.log(`Using ${useClaude && anthropic ? 'Anthropic' : 'OpenAI'} Chat Completions API (no pitch deck)...`)
      
      if (useClaude && anthropic) {
        // Use Claude
        const message = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `You are an expert investment screening assistant. Always respond with valid JSON.

${screeningPrompt}

Provide your response in valid JSON format only.`,
            },
          ],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'
        console.log('=== ANTHROPIC RESPONSE ===')
        console.log(responseText)
        console.log('======================')
        
        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          screeningResult = JSON.parse(jsonMatch[0])
          console.log('✓ Parsed JSON successfully')
        } else {
          console.error('❌ Could not find JSON in response')
          throw new Error('Could not parse JSON from Anthropic response')
        }
      } else {
        // Use OpenAI
        if (!openai) {
          throw new Error('OpenAI client not initialized')
        }
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert investment screening assistant. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: screeningPrompt,
            },
          ],
          response_format: { type: 'json_object' },
        })

        const responseText = completion.choices[0].message.content || '{}'
        console.log('=== OPENAI RESPONSE ===')
        console.log(responseText)
        console.log('======================')
        screeningResult = JSON.parse(responseText)
        console.log('✓ Parsed JSON successfully')
      }
    }

    console.log('=== SCREENING RESULT ===')
    console.log('Recommendation:', screeningResult.recommendation)
    console.log('Reason:', screeningResult.reason)

    // 8. Update analysis table based on screening result
    console.log('=== STEP 7: UPDATING DATABASE ===')
    
    // First, get the current history to append to it
    const { data: currentAnalysis, error: fetchError } = await supabase
      .from('analysis')
      .select('history')
      .eq('id', analysis_id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching current analysis:', fetchError)
      throw new Error('Failed to fetch current analysis')
    }

    const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const currentHistory = currentAnalysis?.history || ''
    const newHistoryEntry = `${currentDate}: Screened`
    const updatedHistory = currentHistory ? `${currentHistory}\n${newHistoryEntry}` : newHistoryEntry

    console.log('Current history:', currentHistory)
    console.log('Appending:', newHistoryEntry)
    console.log('Updated history:', updatedHistory)

    const updateData: any = {
      status: 'Screened',
      recommendation_reason: screeningResult.reason,
      history: updatedHistory,
      updated_at: new Date().toISOString(),
    }

    if (screeningResult.recommendation === 'Reject') {
      updateData.recommendation = 'Reject'
      console.log('Setting recommendation to: Reject')
    } else if (screeningResult.recommendation === 'Accept') {
      updateData.recommendation = 'Analyze'
      console.log('Setting recommendation to: Analyze')
    }

    console.log('Updating analysis table...')
    console.log('Analysis ID:', analysis_id)
    console.log('Update data:', updateData)

    const { error: updateError } = await supabase
      .from('analysis')
      .update(updateData)
      .eq('id', analysis_id)

    if (updateError) {
      console.error('❌ Error updating analysis:', updateError)
      throw new Error('Failed to update analysis table')
    }

    console.log('✓ Analysis table updated successfully')

    // 9. Return success response
    console.log('=== SCREENING COMPLETE ===')
    console.log('Total time:', new Date().toISOString())
    
    return new Response(
      JSON.stringify({
        success: true,
        screening_result: screeningResult,
        analysis_id: analysis_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in screen-investor-match:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/screen-investor-match' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"company_id":"uuid","investor_user_id":"uuid","analysis_id":"uuid"}'

*/

