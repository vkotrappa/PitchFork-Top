import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

interface RequestBody {
  toEmail?: string;
  toName?: string;
  subject: string;
  body: string;
  senderName?: string;
  companyName?: string;
  messageType?: 'admin' | 'investor' | 'founder' | 'general';
}

serve(async (req) => {
  try {
    console.log('=== Send Email Function Started ===');
    
    // Parse request body
    const { 
      toEmail = 'vkotrappa@gmail.com', // Default admin email
      toName = 'Admin',
      subject,
      body,
      senderName = 'Admin@PitchFork.com',
      companyName = 'PitchFork Platform',
      messageType = 'general'
    }: RequestBody = await req.json();

    console.log('Request parameters:', {
      toEmail,
      toName,
      subject,
      senderName,
      companyName,
      messageType
    });

    // Get environment variables
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      gmailUser: gmailUser ? 'Set' : 'Missing',
      gmailAppPassword: gmailAppPassword ? 'Set' : 'Missing',
      supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
      supabaseServiceKey: supabaseServiceKey ? 'Set' : 'Missing'
    });

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured.');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    // Extract user info from JWT token
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    const userEmail = payload.email;

    console.log('User info:', { userId, userEmail });

    // Get user details based on message type
    let fromName = senderName;
    if (messageType === 'investor') {
      const { data: investorData } = await supabaseClient
        .from('investor_details')
        .select('name')
        .eq('user_id', userId)
        .single();
      
      if (investorData?.name) {
        fromName = investorData.name;
      }
    }

    console.log('Sending email from:', fromName);

    // Create email content
    const emailBody = `From: ${fromName}
Company: ${companyName}

Message:
${body}

This message was sent via Pitch Fork platform from pitchforkmanager@gmail.com.`;

    // Send email via Gmail SMTP
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
      subject: subject,
      content: emailBody,
    });

    console.log('Email sent successfully!');

    await client.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        to: toEmail,
        subject: subject
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
