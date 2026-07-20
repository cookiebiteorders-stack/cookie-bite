#!/usr/bin/env node

/**
 * Test Paymob Webhook Endpoint
 * This script tests if the webhook endpoint is accessible
 */

async function testWebhookEndpoint() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/paymob';
  
  console.log('=== Testing Paymob Webhook Endpoint ===\n');
  console.log(`Testing endpoint: ${webhookUrl}\n`);

  try {
    // Test with a sample payload
    const testPayload = {
      obj: {
        id: 'test_transaction_123',
        success: true,
        order: {
          id: 12345
        }
      },
      hmac: 'test_hmac'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`Response body: ${responseText}\n`);

    if (response.status === 400 && responseText.includes('Invalid HMAC')) {
      console.log('✅ Webhook endpoint is accessible and HMAC verification is working');
      console.log('   (Expected: HMAC validation failed for test payload)');
    } else if (response.status === 200) {
      console.log('✅ Webhook endpoint is accessible');
    } else {
      console.log('⚠️  Webhook endpoint returned unexpected response');
    }

  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
    console.log('\nMake sure the development server is running:');
    console.log('  npm run dev');
  }
}

testWebhookEndpoint();
