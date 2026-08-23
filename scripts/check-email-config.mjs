import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

console.log('=== Email Provider Configuration Check ===\n');

console.log('Primary Provider (Resend):');
console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'Set ✓' : 'Not set ✗'}`);
console.log(`RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || 'Not set'}`);
console.log(`RESEND_DOMAIN: ${process.env.RESEND_DOMAIN || 'Not set'}`);
console.log(`RESEND_REPLY_TO: ${process.env.RESEND_REPLY_TO || 'Not set'}`);

console.log('\nSMTP Provider (Fallback):');
console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE || 'Not set'}`);
console.log(`SMTP_USER: ${process.env.SMTP_USER ? 'Set ✓' : 'Not set ✗'}`);
console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? 'Set ✓' : 'Not set ✗'}`);
console.log(`SMTP_FROM: ${process.env.SMTP_FROM || 'Not set'}`);

console.log('\nSendGrid Provider (Fallback):');
console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'Set ✓' : 'Not set ✗'}`);
console.log(`SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL || 'Not set'}`);

console.log('\nMailgun Provider (Fallback):');
console.log(`MAILGUN_API_KEY: ${process.env.MAILGUN_API_KEY ? 'Set ✓' : 'Not set ✗'}`);
console.log(`MAILGUN_DOMAIN: ${process.env.MAILGUN_DOMAIN || 'Not set'}`);
console.log(`MAILGUN_FROM_EMAIL: ${process.env.MAILGUN_FROM_EMAIL || 'Not set'}`);

console.log('\nEmail Automation Settings:');
console.log(`EMAIL_AUTOMATION_ENABLED: ${process.env.EMAIL_AUTOMATION_ENABLED || 'Not set'}`);
console.log(`EMAIL_USE_QUEUE: ${process.env.EMAIL_USE_QUEUE || 'Not set'}`);
console.log(`EMAIL_USE_DB_QUEUE: ${process.env.EMAIL_USE_DB_QUEUE || 'Not set'}`);
console.log(`EMAIL_PROVIDER_PRIORITY: ${process.env.EMAIL_PROVIDER_PRIORITY || 'resend (default)'}`);

console.log('\nOther Email Settings:');
console.log(`CONTACT_INBOX: ${process.env.CONTACT_INBOX || 'Not set'}`);
console.log(`STORE_OPS_EMAIL: ${process.env.STORE_OPS_EMAIL || 'Not set'}`);
console.log(`ADMIN_ALERT_EMAIL: ${process.env.ADMIN_ALERT_EMAIL || 'Not set'}`);

console.log('\n=== Configuration Status ===');
const hasResend = Boolean(process.env.RESEND_API_KEY);
const hasSMTP = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
const hasMailgun = Boolean(process.env.MAILGUN_API_KEY);

console.log(`Primary (Resend): ${hasResend ? '✓ Available' : '✗ Not configured'}`);
console.log(`Fallback SMTP: ${hasSMTP ? '✓ Available' : '✗ Not configured'}`);
console.log(`Fallback SendGrid: ${hasSendGrid ? '✓ Available' : '✗ Not configured'}`);
console.log(`Fallback Mailgun: ${hasMailgun ? '✓ Available' : '✗ Not configured'}`);

if (hasResend) {
  console.log('\n✅ Email system is properly configured with Resend as primary provider');
} else if (hasSMTP || hasSendGrid || hasMailgun) {
  console.log('\n⚠️  Resend not configured, but fallback providers are available');
} else {
  console.log('\n❌ No email providers are configured - email notifications will not work');
}