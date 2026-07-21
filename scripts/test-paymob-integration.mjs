#!/usr/bin/env node

/**
 * Test Paymob Integration
 * This script tests if the Paymob keys are correctly configured
 */

import fs from 'fs';
import path from 'path';

// Load .env file manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const paymobConfig = {
  secretKey:
    process.env.PAYMOB_SECRET_KEY ||
    process.env.PAYMOB_API_KEY ||
    process.env.NEXT_PUBLIC_PAYMOB_SECRET_KEY ||
    process.env.NEXT_PUBLIC_PAYMOB_API_KEY,
  publicKey:
    process.env.PAYMOB_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYMOB_PUBLIC_KEY,
  hmacSecret:
    process.env.PAYMOB_HMAC_SECRET ||
    process.env.PAYMOB_HMAC ||
    process.env.NEXT_PUBLIC_PAYMOB_HMAC_SECRET,
  integrationCard:
    process.env.PAYMOB_INTEGRATION_ID_CARD ||
    process.env.PAYMOB_CARD_INTEGRATION_ID,
  integrationWallet:
    process.env.PAYMOB_INTEGRATION_ID_WALLET ||
    process.env.PAYMOB_WALLET_INTEGRATION_ID,
};

console.log('=== Paymob Integration Test ===\n');

let allConfigured = true;

if (!paymobConfig.secretKey) {
  console.log('❌ PAYMOB_SECRET_KEY (or legacy alias) is missing');
  allConfigured = false;
} else {
  console.log('✅ Paymob secret key is configured');
}

if (!paymobConfig.publicKey) {
  console.log('❌ PAYMOB_PUBLIC_KEY (or legacy alias) is missing');
  allConfigured = false;
} else {
  console.log('✅ Paymob public key is configured');
}

if (!paymobConfig.hmacSecret) {
  console.log('❌ PAYMOB_HMAC_SECRET (or legacy alias) is missing');
  allConfigured = false;
} else {
  console.log('✅ PAYMOB_HMAC_SECRET is configured');
}

if (!paymobConfig.integrationCard) {
  console.log('❌ PAYMOB_INTEGRATION_ID_CARD (or PAYMOB_CARD_INTEGRATION_ID) is missing');
  allConfigured = false;
} else {
  console.log('✅ Card integration ID is configured:', paymobConfig.integrationCard);
}

if (!paymobConfig.integrationWallet) {
  console.log('❌ PAYMOB_INTEGRATION_ID_WALLET (or PAYMOB_WALLET_INTEGRATION_ID) is missing');
  allConfigured = false;
} else {
  console.log('✅ Wallet integration ID is configured:', paymobConfig.integrationWallet);
}

console.log('\n=== Test Result ===');
if (allConfigured) {
  console.log('✅ All Paymob environment variables are configured correctly');
  console.log('\nNext steps:');
  console.log('1. Configure webhook URL in Paymob dashboard: https://cookie-bite.com/api/webhooks/paymob');
  console.log('2. Test a checkout flow on your application');
  console.log('3. Verify webhook callbacks are received');
} else {
  console.log('❌ Some Paymob environment variables are missing');
  console.log('\nPlease add the missing variables to your .env file');
}

process.exit(allConfigured ? 0 : 1);
