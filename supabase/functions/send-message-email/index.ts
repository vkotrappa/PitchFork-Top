import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  companyName: string;
  messageTitle: string;
  messageDetail: string;
}

async function sendEmailViaGmail(
  toEmail: string,
  senderName: string,
  companyName: string,
  messageTitle: string,
  messageDetail: string
): Promise<void> {
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
  }

  console.log('Initializing SMTP client...');
  console.log('Gmail user:', gmailUser);
  console.log('Sending from: pitchforkmanager@gmail.com');

  // Create email content
  const emailBody = `From: ${senderName}
Company: ${companyName}

Message:
${messageDetail}

This message was sent via Pitch Fork platform from pitchforkmanager@gmail.com.`;

  try {
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    console.log('Connecting to Gmail SMTP...');

    await client.send({
      from: 'pitchforkmanager@gmail.com',
      to: toEmail,
      subject: messageTitle,
      content: emailBody,
    });

    console.log('Email sent successfully!');

    await client.close();

  } catch (error) {
    console.error('SMTP Error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Supabase URL present:', !!supabaseUrl);
    console.log('Service role key present:', !!serviceRoleKey);
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }

    console.log('Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from JWT token
    console.log('Extracting user from JWT token...');
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT token to get user info
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    const userEmail = payload.email;
    
    console.log('User ID from token:', userId);
    console.log('User email from token:', userEmail);
    
    if (!userId) {
      console.error('No user ID found in token');
      throw new Error('Invalid authentication token');
    }

    // Get user details from investor_details table (for investors) or use email fallback
    const { data: userData, error: userDataError } = await supabaseClient
      .from('investor_details')
      .select('name')
      .eq('user_id', userId)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      // Don't fail if user data not found, use email as fallback
      console.log('Using email as sender name fallback');
    }

    const senderName = userData?.name || userEmail || 'Pitch Fork User';

    // Parse request body
    const { companyName, messageTitle, messageDetail }: EmailRequest = await req.json();

    if (!messageTitle || !messageDetail) {
      throw new Error('Message title and detail are required');
    }

    console.log('Sending email from:', senderName);
    console.log('Company:', companyName);
    console.log('Title:', messageTitle);

    // Send email
    await sendEmailViaGmail(
      'vkotrappa@gmail.com',
      'Admin@PitchFork.com',
      companyName,
      messageTitle,
      messageDetail
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-message-email function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

