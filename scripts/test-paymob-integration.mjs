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
  apiKey: process.env.PAYMOB_API_KEY,
  hmacSecret: process.env.PAYMOB_HMAC_SECRET,
  integrationCard: process.env.PAYMOB_INTEGRATION_ID_CARD,
  integrationWallet: process.env.PAYMOB_INTEGRATION_ID_WALLET,
};

console.log('=== Paymob Integration Test ===\n');

let allConfigured = true;

if (!paymobConfig.apiKey) {
  console.log('❌ PAYMOB_API_KEY is missing');
  allConfigured = false;
} else {
  console.log('✅ PAYMOB_API_KEY is configured');
}

if (!paymobConfig.hmacSecret) {
  console.log('❌ PAYMOB_HMAC_SECRET is missing');
  allConfigured = false;
} else {
  console.log('✅ PAYMOB_HMAC_SECRET is configured');
}

if (!paymobConfig.integrationCard) {
  console.log('❌ PAYMOB_INTEGRATION_ID_CARD is missing');
  allConfigured = false;
} else {
  console.log('✅ PAYMOB_INTEGRATION_ID_CARD is configured:', paymobConfig.integrationCard);
}

if (!paymobConfig.integrationWallet) {
  console.log('❌ PAYMOB_INTEGRATION_ID_WALLET is missing');
  allConfigured = false;
} else {
  console.log('✅ PAYMOB_INTEGRATION_ID_WALLET is configured:', paymobConfig.integrationWallet);
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
