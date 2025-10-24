// Test script to verify send-email function is accessible
const testFunctionAccess = async () => {
  const supabaseUrl = 'https://nsimmsznrutwgtkkblgw.supabase.co';
  const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
  
  console.log('Testing function accessibility...');
  console.log('Function URL:', functionUrl);

  try {
    // Test with a simple GET request first (should return 405 Method Not Allowed)
    const getResponse = await fetch(functionUrl, {
      method: 'GET',
    });
    
    console.log('GET Response status:', getResponse.status);
    const getResponseText = await getResponse.text();
    console.log('GET Response:', getResponseText);
    
    // Test with POST but no auth (should return 401)
    const postResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Test',
        body: 'Test body'
      })
    });
    
    console.log('POST Response status:', postResponse.status);
    const postResponseText = await postResponse.text();
    console.log('POST Response:', postResponseText);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testFunctionAccess();
