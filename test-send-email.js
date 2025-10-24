// Test script for send-email function
const testEmailFunction = async () => {
  const supabaseUrl = 'https://nsimmsznrutwgtkkblgw.supabase.co';
  const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
  
  // Test payload
  const testPayload = {
    toEmail: 'vkotrappa@gmail.com',
    toName: 'Admin',
    subject: 'Test Email from Unified Function',
    body: 'This is a test email to verify the unified send-email function is working correctly.',
    senderName: 'Admin@PitchFork.com',
    companyName: 'Test Company',
    messageType: 'admin'
  };

  console.log('Testing send-email function...');
  console.log('Function URL:', functionUrl);
  console.log('Payload:', testPayload);

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test won't have auth, so it should fail gracefully
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testEmailFunction();
