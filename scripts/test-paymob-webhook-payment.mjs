#!/usr/bin/env node

/**
 * Test Paymob Webhook Payment
 * Creates a test payment intention and displays the payment URL
 * This helps test webhook configuration without browser interaction
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

async function createPaymobIntention(config) {
  const secretKey = config.PAYMOB_SECRET_KEY;
  const integrationId = config.PAYMOB_INTEGRATION_ID_CARD;
  const webhookUrl = config.WEBHOOK_URL || 'https://hooks.paymob.com/b55265a6-ce99-44cb-8f07-48fb56fdbd96';
  const redirectUrl = config.REDIRECT_URL || 'https://cookie-bite.com/checkout/paymob-response';

  if (!secretKey || !integrationId) {
    console.error('❌ Missing PAYMOB_SECRET_KEY or PAYMOB_INTEGRATION_ID_CARD');
    process.exit(1);
  }

  const apiUrl = config.PAYMOB_API_URL || 'https://accept.paymob.com';

  const payload = {
    amount: 10000, // 100 EGP in cents
    currency: 'EGP',
    payment_methods: [parseInt(integrationId)],
    special_reference: `webhook-test-${Date.now()}`,
    billing_data: {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone_number: '+201000000000',
      street: 'Test Street',
      city: 'Cairo',
      country: 'EG',
      state: 'Cairo',
      apartment: 'NA',
      floor: 'NA',
      building: 'NA',
      postal_code: 'NA',
      shipping_method: 'NA'
    },
    items: [
      {
        name: 'Webhook Test Product',
        amount: 10000,
        description: 'Test payment for webhook verification',
        quantity: 1
      }
    ],
    notification_url: webhookUrl,
    redirection_url: redirectUrl
  };

  console.log('\n=== Creating Paymob Test Intention ===\n');
  console.log('API URL:', apiUrl);
  console.log('Integration ID:', integrationId);
  console.log('Webhook URL:', webhookUrl);
  console.log('Redirect URL:', redirectUrl);
  console.log('\nPayload:', JSON.stringify(payload, null, 2));
  console.log('\n---\n');

  try {
    const response = await fetch(`${apiUrl}/v1/intention/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${secretKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to create intention');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('✅ Intention created successfully!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n---\n');

    if (data.client_secret) {
      const paymentUrl = `${apiUrl}/unifiedcheckout/?clientSecret=${data.client_secret}`;
      console.log('🔗 Payment URL:', paymentUrl);
      console.log('\nInstructions:');
      console.log('1. Copy the Payment URL above');
      console.log('2. Open it in your browser');
      console.log('3. Complete the test payment');
      console.log('4. Use test card: 5123456789012346');
      console.log('5. Check webhook delivery');
    }

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function main() {
  const envLocal = loadEnvFile(resolve('.env.local'));
  const env = loadEnvFile(resolve('.env'));
  const config = { ...env, ...envLocal };

  // Allow command line override for webhook URL
  const webhookArg = process.argv[2];
  if (webhookArg) {
    config.WEBHOOK_URL = webhookArg;
  }

  createPaymobIntention(config);
}

main();
