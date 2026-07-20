#!/usr/bin/env node

/**
 * Append Paymob Environment Variables to .env
 * This script appends the Paymob live keys to the .env file
 */

import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const paymobConfig = `
# === Paymob Live Keys ===
PAYMOB_API_KEY=<your-paymob-api-key>
PAYMOB_HMAC_SECRET=<your-paymob-hmac-secret>
PAYMOB_INTEGRATION_ID_CARD=<paymob-card-integration-id>
PAYMOB_INTEGRATION_ID_WALLET=<paymob-wallet-integration-id>
PAYMOB_INTEGRATION_ID_INSTAPAY=<paymob-instapay-integration-id>
PAYMOB_INTEGRATION_ID_TAP_ON_PHONE=<paymob-tap-on-phone-integration-id>
`;

try {
  // Check if .env exists
  if (fs.existsSync(envPath)) {
    const currentEnv = fs.readFileSync(envPath, 'utf-8');
    
    // Check if Paymob keys already exist
    if (currentEnv.includes('PAYMOB_API_KEY')) {
      console.log('⚠️  Paymob keys already exist in .env file');
      console.log('Skipping append to avoid duplicates');
      process.exit(0);
    }
    
    // Append Paymob config
    fs.appendFileSync(envPath, paymobConfig);
    console.log('✅ Paymob environment variables added to .env file');
    console.log('\nAdded variables:');
    console.log('- PAYMOB_API_KEY');
    console.log('- PAYMOB_HMAC_SECRET');
    console.log('- PAYMOB_INTEGRATION_ID_CARD');
    console.log('- PAYMOB_INTEGRATION_ID_WALLET');
    console.log('- PAYMOB_INTEGRATION_ID_INSTAPAY');
    console.log('- PAYMOB_INTEGRATION_ID_TAP_ON_PHONE');
  } else {
    console.log('❌ .env file not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  process.exit(1);
}
