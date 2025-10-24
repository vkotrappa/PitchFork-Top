// Test Gmail SMTP configuration
// Run this in Supabase Edge Function to test email delivery

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

async function testGmailSMTP() {
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

  console.log('Testing Gmail SMTP...');
  console.log('Gmail User:', gmailUser);
  console.log('App Password Length:', gmailAppPassword?.length);

  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Gmail credentials not configured');
  }

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
      from: gmailUser,
      to: 'meganventures@gmail.com',
      subject: 'Test Email from PitchFork - ' + new Date().toISOString(),
      content: `This is a test email sent at ${new Date().toISOString()}.
      
If you receive this, your Gmail SMTP is working correctly.

Test details:
- From: ${gmailUser}
- To: meganventures@gmail.com
- Time: ${new Date().toISOString()}`,
    });

    console.log('Test email sent successfully!');
    await client.close();
    
    return { success: true, message: 'Test email sent successfully' };
    
  } catch (error) {
    console.error('SMTP Test Error:', error);
    throw error;
  }
}

// Export for use in edge function
export { testGmailSMTP };
