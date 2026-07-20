#!/usr/bin/env node

/**
 * Setup Paymob Environment Variables
 * 
 * This script helps you add the Paymob live keys to your .env file.
 * Run this script and it will show you exactly what to add.
 */

const paymobConfig = {
  PAYMOB_API_KEY: process.env.PAYMOB_API_KEY || '<your-paymob-api-key>',
  PAYMOB_HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET || '<your-paymob-hmac-secret>',
  PAYMOB_INTEGRATION_ID_CARD: process.env.PAYMOB_INTEGRATION_ID_CARD || '<paymob-card-integration-id>',
  PAYMOB_INTEGRATION_ID_WALLET: process.env.PAYMOB_INTEGRATION_ID_WALLET || '<paymob-wallet-integration-id>',
};

console.log('=== Paymob Live Keys Setup ===\n');
console.log('Add the following environment variables to your .env file:\n');

Object.entries(paymobConfig).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n=== Additional Integration IDs ===');
console.log('The following integration IDs are also available from your Paymob account:');
console.log('MIGS-online11 (ID: 5765742) - Online Card');
console.log('UIG-online_new (ID: 5765741) - Mobile Wallet');
console.log('UIG-in_store (ID: 5670208) - Mobile Wallet');
console.log('MIGS-tap_on_phone (ID: 5670207) - Online Card');
console.log('9MIGS-online (ID: 5670206) - Online Card');
console.log('\n=== Webhook Configuration ===');
console.log('Configure your Paymob webhook URL to:');
console.log('https://your-domain.com/api/webhooks/paymob');
console.log('\n=== Notes ===');
console.log('- PAYMOB_API_KEY: Your secret key for authentication');
console.log('- PAYMOB_HMAC_SECRET: Base64 encoded token for webhook verification');
console.log('- PAYMOB_INTEGRATION_ID_CARD: Integration ID for card payments');
console.log('- PAYMOB_INTEGRATION_ID_WALLET: Integration ID for mobile wallet payments');
