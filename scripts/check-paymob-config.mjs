import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

console.log('=== Paymob Configuration Check ===\n');

console.log('Base URL Configuration:');
console.log(`APP_BASE_URL: ${process.env.APP_BASE_URL || 'Not set'}`);
console.log(`NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set'}`);
console.log(`NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'Not set'}`);

// Determine which base URL would be used
const appBaseUrl = (process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
console.log(`\nEffective Base URL: ${appBaseUrl}`);

console.log('\n=== Generated Webhook URLs ===');
console.log(`Webhook URL: ${appBaseUrl}/api/webhooks/paymob`);
console.log(`Redirect URL: ${appBaseUrl}/checkout/paymob-response`);

console.log('\n=== Paymob Credentials ===');
console.log(`PAYMOB_SECRET_KEY: ${process.env.PAYMOB_SECRET_KEY ? 'Set ✓' : 'Not set ✗'}`);
console.log(`PAYMOB_PUBLIC_KEY: ${process.env.PAYMOB_PUBLIC_KEY ? 'Set ✓' : 'Not set ✗'}`);
console.log(`PAYMOB_HMAC_SECRET: ${process.env.PAYMOB_HMAC_SECRET ? 'Set ✓' : 'Not set ✗'}`);
console.log(`PAYMOB_API_URL: ${process.env.PAYMOB_API_URL || 'https://accept.paymob.com (default)'}`);

console.log('\n=== Integration IDs ===');
console.log(`PAYMOB_INTEGRATION_ID_CARD: ${process.env.PAYMOB_INTEGRATION_ID_CARD || 'Not set'}`);
console.log(`PAYMOB_INTEGRATION_ID_WALLET: ${process.env.PAYMOB_INTEGRATION_ID_WALLET || 'Not set'}`);

console.log('\n=== Expected Paymob Dashboard Configuration ===');
console.log(`For Card Integration:`);
console.log(`  - Webhook URL: ${appBaseUrl}/api/webhooks/paymob`);
console.log(`  - Redirect URL: ${appBaseUrl}/checkout/paymob-response`);
console.log(`For Wallet Integration:`);
console.log(`  - Webhook URL: ${appBaseUrl}/api/webhooks/paymob`);
console.log(`  - Redirect URL: ${appBaseUrl}/checkout/paymob-response`);