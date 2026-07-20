#!/usr/bin/env node

/**
 * Force Update Paymob Environment Variables in .env
 * This script reads the .env file and updates/adds Paymob configuration
 */

import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

const paymobVars = {
  'PAYMOB_API_KEY': process.env.PAYMOB_API_KEY || '<your-paymob-api-key>',
  'PAYMOB_HMAC_SECRET': process.env.PAYMOB_HMAC_SECRET || '<your-paymob-hmac-secret>',
  'PAYMOB_INTEGRATION_ID_CARD': process.env.PAYMOB_INTEGRATION_ID_CARD || '<paymob-card-integration-id>',
  'PAYMOB_INTEGRATION_ID_WALLET': process.env.PAYMOB_INTEGRATION_ID_WALLET || '<paymob-wallet-integration-id>',
  'PAYMOB_INTEGRATION_ID_INSTAPAY': process.env.PAYMOB_INTEGRATION_ID_INSTAPAY || '<paymob-instapay-integration-id>',
  'PAYMOB_INTEGRATION_ID_TAP_ON_PHONE': process.env.PAYMOB_INTEGRATION_ID_TAP_ON_PHONE || '<paymob-tap-on-phone-integration-id>',
};

try {
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf-8');
  let updated = false;

  // Update or add each Paymob variable
  Object.entries(paymobVars).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`✅ Updated ${key}`);
    } else {
      envContent += `\n${key}=${value}`;
      console.log(`✅ Added ${key}`);
    }
    updated = true;
  });

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Paymob environment variables updated successfully');
  console.log('\nPlease restart your development server to apply changes:');
  console.log('  npm run dev');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  process.exit(1);
}
