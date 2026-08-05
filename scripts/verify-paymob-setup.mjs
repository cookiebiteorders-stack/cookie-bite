#!/usr/bin/env node

/**
 * Paymob Setup Verification Script
 * Checks environment variables and configuration for Paymob integration
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(value, name) {
  if (value && value.trim() !== '') {
    log(`✓ ${name}`, 'green');
    return true;
  } else {
    log(`✗ ${name} - MISSING OR EMPTY`, 'red');
    return false;
  }
}

function checkIntegrationId(value, name) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    log(`✓ ${name}: ${num}`, 'green');
    return true;
  } else {
    log(`✗ ${name} - INVALID OR MISSING`, 'red');
    return false;
  }
}

function checkNoPublicPrefix(value, name) {
  if (value && value.startsWith('NEXT_PUBLIC_')) {
    log(`✗ ${name} - SECURITY RISK: Using NEXT_PUBLIC_ prefix for secret`, 'red');
    return false;
  } else {
    log(`✓ ${name} - No NEXT_PUBLIC_ prefix (good)`, 'green');
    return true;
  }
}

function checkEnvironmentMatch(secretKey, integrationId, name) {
  const isTest = secretKey.includes('sk_test_');
  const isLive = secretKey.includes('sk_live_');

  if (!isTest && !isLive) {
    log(`⚠ ${name} - Secret key format unclear (should start with sk_test_ or sk_live_)`, 'yellow');
    return true; // Don't fail, just warn
  }

  log(`✓ ${name} - ${isTest ? 'Test Mode' : 'Live Mode'}`, 'green');
  return true;
}

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
    log(`Error loading ${envPath}: ${error.message}`, 'red');
    return {};
  }
}

function main() {
  log('\n=== Paymob Setup Verification ===\n', 'cyan');

  // Try to load .env.local first (development), then .env (production)
  const envLocal = loadEnvFile(resolve('.env.local'));
  const env = loadEnvFile(resolve('.env'));
  const environment = { ...env, ...envLocal };

  let allPassed = true;

  log('\n--- Environment Variables ---\n', 'blue');

  // Check required variables
  allPassed &= check(environment.PAYMOB_SECRET_KEY, 'PAYMOB_SECRET_KEY');
  allPassed &= check(environment.PAYMOB_PUBLIC_KEY, 'PAYMOB_PUBLIC_KEY');
  allPassed &= check(environment.PAYMOB_HMAC_SECRET, 'PAYMOB_HMAC_SECRET');
  allPassed &= checkIntegrationId(environment.PAYMOB_INTEGRATION_ID_CARD, 'PAYMOB_INTEGRATION_ID_CARD');
  allPassed &= checkIntegrationId(environment.PAYMOB_INTEGRATION_ID_WALLET, 'PAYMOB_INTEGRATION_ID_WALLET');

  log('\n--- Security Checks ---\n', 'blue');

  // Check for NEXT_PUBLIC_ prefix on secrets
  allPassed &= checkNoPublicPrefix(environment.PAYMOB_SECRET_KEY, 'PAYMOB_SECRET_KEY');
  allPassed &= checkNoPublicPrefix(environment.PAYMOB_HMAC_SECRET, 'PAYMOB_HMAC_SECRET');

  log('\n--- Environment Matching ---\n', 'blue');

  // Check environment match
  if (environment.PAYMOB_SECRET_KEY) {
    allPassed &= checkEnvironmentMatch(
      environment.PAYMOB_SECRET_KEY,
      environment.PAYMOB_INTEGRATION_ID_CARD,
      'Card Integration'
    );
    allPassed &= checkEnvironmentMatch(
      environment.PAYMOB_SECRET_KEY,
      environment.PAYMOB_INTEGRATION_ID_WALLET,
      'Wallet Integration'
    );
  }

  log('\n--- App Configuration ---\n', 'blue');

  // Check app base URL
  const appBaseUrl = environment.APP_BASE_URL || environment.NEXT_PUBLIC_APP_URL;
  if (appBaseUrl && appBaseUrl.includes('localhost')) {
    log('⚠ APP_BASE_URL - Using localhost (OK for development, not production)', 'yellow');
  } else if (appBaseUrl && appBaseUrl.startsWith('https://')) {
    log(`✓ APP_BASE_URL: ${appBaseUrl}`, 'green');
  } else {
    log('✗ APP_BASE_URL - Missing or not HTTPS (required for production)', 'red');
    allPassed &= false;
  }

  log('\n--- Webhook URLs ---\n', 'blue');

  // Calculate webhook URLs
  const baseUrl = appBaseUrl || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/paymob`;
  const responseUrl = `${baseUrl}/checkout/paymob-response`;

  log(`Transaction Processed Webhook: ${webhookUrl}`, 'cyan');
  log(`Transaction Response URL: ${responseUrl}`, 'cyan');

  if (baseUrl.includes('localhost')) {
    log('\n⚠ Development mode: Use ngrok for webhook testing', 'yellow');
    log('Example: ngrok http 3000', 'yellow');
    log(`Then use: https://your-ngrok-url.ngrok.io/api/webhooks/paymob`, 'yellow');
  }

  log('\n--- Files Check ---\n', 'blue');

  // Check if key files exist (basic check)
  const files = [
    'app/api/webhooks/paymob/route.ts',
    'app/(site)/checkout/paymob-response/page.tsx',
    'lib/paymob/hmac.ts',
    'lib/paymob/config.ts',
    'lib/paymob/intention.ts',
  ];

  files.forEach(file => {
    const filePath = resolve(file);
    if (existsSync(filePath)) {
      log(`✓ ${file}`, 'green');
    } else {
      log(`✗ ${file} - NOT FOUND`, 'red');
      allPassed &= false;
    }
  });

  log('\n=== Summary ===\n', 'cyan');

  if (allPassed) {
    log('✓ All checks passed! Paymob setup looks good.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Add webhook URL in Paymob Dashboard:', 'reset');
    log(`   ${webhookUrl}`, 'cyan');
    log('2. Test with ngrok if in development', 'reset');
    log('3. Run end-to-end payment test', 'reset');
    process.exit(0);
  } else {
    log('✗ Some checks failed. Please fix the issues above.', 'red');
    log('\nCommon fixes:', 'blue');
    log('- Add missing environment variables to .env or .env.local', 'reset');
    log('- Remove NEXT_PUBLIC_ prefix from secret keys', 'reset');
    log('- Ensure Integration IDs are valid numbers', 'reset');
    log('- Set APP_BASE_URL to production domain', 'reset');
    process.exit(1);
  }
}

main();
