#!/usr/bin/env node

/**
 * Generate Paymob Webhook URLs for different environments
 * Usage: node scripts/generate-paymob-webhook-urls.mjs [environment]
 * Environments: local, staging, production
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

function main() {
  const envArg = process.argv[2] || 'local';
  const envLocal = loadEnvFile(resolve('.env.local'));
  const env = loadEnvFile(resolve('.env'));
  const environment = { ...env, ...envLocal };

  let baseUrl;

  switch (envArg) {
    case 'production':
    case 'prod':
      baseUrl = environment.APP_BASE_URL || environment.NEXT_PUBLIC_APP_URL;
      if (!baseUrl || baseUrl.includes('localhost')) {
        baseUrl = 'https://cookie-bite.com';
        console.log('⚠️  APP_BASE_URL not set or is localhost. Using default: https://cookie-bite.com\n');
        console.log('To set your production domain, add to .env:');
        console.log('  APP_BASE_URL=https://your-domain.com\n');
      }
      break;
    case 'staging':
    case 'stage':
      baseUrl = environment.APP_BASE_URL || environment.NEXT_PUBLIC_APP_URL;
      if (!baseUrl || baseUrl.includes('localhost')) {
        baseUrl = 'https://staging.cookie-bite.com';
        console.log('⚠️  APP_BASE_URL not set or is localhost. Using default: https://staging.cookie-bite.com\n');
        console.log('To set your staging domain, add to .env:');
        console.log('  APP_BASE_URL=https://staging.your-domain.com\n');
      }
      break;
    case 'local':
    default:
      baseUrl = environment.APP_BASE_URL || environment.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      break;
  }

  // Ensure no trailing slash
  baseUrl = baseUrl.replace(/\/$/, '');

  const webhookUrl = `${baseUrl}/api/webhooks/paymob`;
  const redirectUrl = `${baseUrl}/checkout/paymob-response`;

  console.log('\n=== Paymob Webhook URLs ===\n');
  console.log(`Environment: ${envArg.toUpperCase()}\n`);
  console.log(`Base URL: ${baseUrl}\n`);
  console.log('--- Paymob Dashboard Configuration ---\n');
  console.log('For Card Integration (#5777362):');
  console.log(`  Webhook URL: ${webhookUrl}`);
  console.log(`  Redirect URL: ${redirectUrl}\n`);
  console.log('For Wallet Integration (#5777363):');
  console.log(`  Webhook URL: ${webhookUrl}`);
  console.log(`  Redirect URL: ${redirectUrl}\n`);

  if (envArg === 'local') {
    console.log('⚠️  LOCAL MODE: Use ngrok to expose localhost\n');
    console.log('To start ngrok:');
    console.log('  ngrok http 3000\n');
    console.log('Then use the ngrok HTTPS URL in Paymob Dashboard.\n');
    console.log('Or use the convenience script:');
    console.log('  scripts/dev-with-ngrok.bat\n');
  } else if (envArg === 'production') {
    console.log('✅ PRODUCTION MODE: Ready for live payments\n');
    console.log('Make sure:');
    console.log('  - PAYMOB_SECRET_KEY starts with sk_live_');
    console.log('  - PAYMOB_PUBLIC_KEY starts with pk_live_');
    console.log('  - Integration IDs are for Live mode\n');
  }

  console.log('--- Testing ---\n');
  console.log('To verify Paymob setup:');
  console.log('  node scripts/verify-paymob-setup.mjs\n');
  console.log('To test webhook HMAC:');
  console.log('  node scripts/test-paymob-webhook.mjs\n');
}

main();
