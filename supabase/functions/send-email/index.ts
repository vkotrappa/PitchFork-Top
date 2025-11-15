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
  pdfUrl?: string;
  pdfFileName?: string;
}

serve(async (req) => {
  console.log('=== FUNCTION CALLED ===');
  console.log('Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    console.log('=== Send Email Function Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Parse request body
    console.log('Parsing request body...');
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new Error(`Failed to parse request body: ${parseError.message}`);
    }
    
    const { 
      toEmail = 'vkotrappa@gmail.com', // Default admin email
      toName = 'Admin',
      subject,
      body,
      senderName = 'Admin@PitchFork.com',
      companyName = 'PitchFork Platform',
      messageType = 'general',
      pdfUrl,
      pdfFileName
    }: RequestBody = requestBody;

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
    console.log('All request headers:', Object.fromEntries(req.headers.entries()));
    
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header value:', authHeader);
    
    // Try alternative header names
    const authHeaderLower = req.headers.get('authorization');
    console.log('Lowercase auth header:', authHeaderLower);
    
    const authHeaderMixed = req.headers.get('AUTHORIZATION');
    console.log('Uppercase auth header:', authHeaderMixed);

    // Use whichever header is available
    const finalAuthHeader = authHeader || authHeaderLower || authHeaderMixed;
    
    if (!finalAuthHeader) {
      throw new Error('Authorization header missing - tried Authorization, authorization, and AUTHORIZATION');
    }

    console.log('Using auth header:', finalAuthHeader);

    if (!finalAuthHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header must start with "Bearer "');
    }

    // Extract user info from JWT token
    const token = finalAuthHeader.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'Present' : 'Missing');
    
    if (!token) {
      throw new Error('Token is empty after removing Bearer prefix');
    }
    
    let userId, userEmail;
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      userId = payload.sub;
      userEmail = payload.email;

      console.log('User info:', { userId, userEmail });
      
      if (!userId) {
        throw new Error('User ID not found in token');
      }
    } catch (jwtError) {
      console.error('JWT parsing error:', jwtError);
      throw new Error(`Invalid JWT token: ${jwtError.message}`);
    }

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

    // Validate required fields
    console.log('Validating email fields...');
    console.log('toEmail:', toEmail);
    console.log('subject:', subject);
    console.log('body:', body);
    console.log('fromName:', fromName);
    console.log('companyName:', companyName);

    if (!toEmail) {
      throw new Error('toEmail is required');
    }
    if (!subject) {
      throw new Error('subject is required');
    }
    if (!body) {
      throw new Error('body is required');
    }
    if (!fromName) {
      throw new Error('fromName is required');
    }
    if (!companyName) {
      throw new Error('companyName is required');
    }

    // Create email content
    const emailBody = `From: ${fromName}
Company: ${companyName}

Message:
${body}

This message was sent via PitchFork platform from pitchforkmanager@gmail.com.`;

    console.log('Email body created:', emailBody);

    // Send email via Gmail SMTP with timeout
    console.log('Creating SMTP client...');
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
    
    // Download PDF if URL is provided
    let pdfAttachment: { filename: string; content: Uint8Array; contentType?: string } | undefined;
    if (pdfUrl) {
      try {
        console.log('Downloading PDF from URL:', pdfUrl);
        const pdfResponse = await fetch(pdfUrl);
        if (pdfResponse.ok) {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          pdfAttachment = {
            filename: pdfFileName || 'founder-report.pdf',
            content: new Uint8Array(pdfArrayBuffer),
            contentType: 'application/pdf'
          };
          console.log('PDF downloaded successfully, size:', pdfArrayBuffer.byteLength, 'bytes');
        } else {
          console.warn('Failed to download PDF, status:', pdfResponse.status, 'continuing without attachment');
        }
      } catch (error) {
        console.error('Error downloading PDF:', error);
        // Continue without attachment
      }
    }

    // Add timeout to prevent hanging
    const sendEmailWithTimeout = async () => {
      let emailContent = emailBody;
      
      // If we have an attachment, construct a MIME multipart message
      if (pdfAttachment) {
        console.log('Constructing MIME multipart message with attachment');
        
        // Generate boundary for multipart message
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Convert PDF to base64 (handle large files in chunks)
        let base64Content = '';
        const chunkSize = 8192; // Process in chunks to avoid stack overflow
        for (let i = 0; i < pdfAttachment.content.length; i += chunkSize) {
          const chunk = pdfAttachment.content.slice(i, i + chunkSize);
          base64Content += btoa(String.fromCharCode(...chunk));
        }
        
        // Split base64 into lines (76 characters per line for email compatibility)
        const base64Lines = base64Content.match(/.{1,76}/g) || [];
        const formattedBase64 = base64Lines.join('\r\n');
        
        // Construct multipart message
        emailContent = [
          `--${boundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: 7bit',
          '',
          emailBody,
          `--${boundary}`,
          `Content-Type: ${pdfAttachment.contentType || 'application/pdf'}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${pdfAttachment.filename}"`,
          '',
          formattedBase64,
          `--${boundary}--`
        ].join('\r\n');
        
        console.log('MIME message constructed, total size:', emailContent.length, 'characters');
      }
      
      const emailOptions: any = {
        from: 'pitchforkmanager@gmail.com',
        to: toEmail,
        subject: subject,
        content: emailContent,
      };

      // Add Content-Type header for multipart messages
      if (pdfAttachment) {
        const boundary = emailContent.match(/^----=_Part_\d+_\w+/m)?.[0];
        if (boundary) {
          emailOptions.headers = {
            'Content-Type': `multipart/mixed; boundary="${boundary}"`
          };
        }
      }

      return await Promise.race([
        client.send(emailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP timeout after 30 seconds')), 30000)
        )
      ]);
    };

    await sendEmailWithTimeout();
    console.log('Email sent successfully!');

    console.log('Closing SMTP connection...');
    await client.close();
    console.log('SMTP connection closed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        to: toEmail,
        subject: subject
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );

  } catch (error) {
    console.error('Error in send-email function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        errorType: error.name,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
});
