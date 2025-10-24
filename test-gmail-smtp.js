// Test script to verify Gmail SMTP setup
// Run this in Supabase Edge Function to test email

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

async function testGmailSMTP() {
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

  console.log('Gmail User:', gmailUser);
  console.log('App Password Length:', gmailAppPassword?.length);

  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Gmail credentials not configured');
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 587,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    console.log('Testing SMTP connection...');
    
    await client.send({
      from: `${gmailUser}`,
      to: 'meganventures@gmail.com',
      subject: 'Test Email from PitchFork',
      content: 'This is a test email to verify SMTP setup.',
    });

    console.log('Test email sent successfully!');
    await client.close();
    
  } catch (error) {
    console.error('SMTP Test Error:', error);
    throw error;
  }
}

// Call the test function
testGmailSMTP().catch(console.error);
