import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const envPath = '.env.local';

// Read current content
let content = '';
try {
  content = readFileSync(envPath, 'utf-8');
} catch (e) {
  console.error('Error reading .env.local:', e.message);
  process.exit(1);
}

// Variables to add
const variablesToAdd = [
  'SMTP_HOST=smtp.hostinger.com',
  'SMTP_PORT=465',
  'SMTP_SECURE=true',
  'SMTP_USER=cookie-bite@cookie-bite.com',
  'SMTP_PASS=Sra2810@',
  'SMTP_FROM=cookie-bite@cookie-bite.com',
  'SMTP_FROM_NAME=Cookie Bite'
];

// Add missing variables
let addedCount = 0;
variablesToAdd.forEach(variable => {
  const [key] = variable.split('=');
  if (!content.includes(key)) {
    content += `\n${variable}`;
    addedCount++;
    console.log(`Added: ${key}`);
  } else {
    console.log(`Already exists: ${key}`);
  }
});

// Write back
writeFileSync(envPath, content);
console.log(`\n✅ Added ${addedCount} new variables to .env.local`);