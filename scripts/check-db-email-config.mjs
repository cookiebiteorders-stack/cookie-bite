import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function checkDatabaseEmailConfig() {
  console.log('=== Database Email Provider Configuration ===\n');

  // Check email_provider_settings
  try {
    const { data: providerSettings, error: providerError } = await supabase
      .from('email_provider_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (providerError) {
      console.log('email_provider_settings table may not exist:', providerError.message);
    } else if (providerSettings) {
      console.log('Email Provider Settings:');
      console.log(`Active Provider: ${providerSettings.active_provider}`);
      console.log(`Provider Priority: ${providerSettings.provider_priority?.join(', ')}`);
      console.log(`Auto Fallback Enabled: ${providerSettings.auto_fallback_enabled}`);
      console.log(`Self Heal Enabled: ${providerSettings.self_heal_enabled}`);
      console.log(`Test Recipient: ${providerSettings.test_recipient || 'Not set'}`);
      console.log(`Rate Limit: ${providerSettings.rate_limit_per_minute} per minute`);
      console.log('---');
    } else {
      console.log('No email provider settings found in database');
    }
  } catch (e) {
    console.log('Error checking email_provider_settings:', e.message);
  }

  console.log('');

  // Check smtp_configs
  try {
    const { data: smtpConfigs, error: smtpError } = await supabase
      .from('smtp_configs')
      .select('*');
    
    if (smtpError) {
      console.log('smtp_configs table may not exist:', smtpError.message);
    } else if (smtpConfigs && smtpConfigs.length > 0) {
      console.log(`SMTP Configs (${smtpConfigs.length} found):`);
      smtpConfigs.forEach((config, index) => {
        console.log(`\n${index + 1}. ${config.name} (${config.provider_type})`);
        console.log(`   Host: ${config.host || 'Not set'}`);
        console.log(`   Port: ${config.port}`);
        console.log(`   Secure: ${config.secure}`);
        console.log(`   From Email: ${config.from_email}`);
        console.log(`   From Name: ${config.from_name || 'Not set'}`);
        console.log(`   Active: ${config.is_active}`);
        console.log(`   Default: ${config.is_default}`);
        console.log(`   Last Verified: ${config.last_verified_at || 'Never'}`);
      });
      console.log('---');
    } else {
      console.log('No SMTP configs found in database');
    }
  } catch (e) {
    console.log('Error checking smtp_configs:', e.message);
  }

  console.log('');

  // Check recent email_logs
  try {
    const { data: recentLogs, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logsError) {
      console.log('email_logs table may not exist:', logsError.message);
    } else if (recentLogs && recentLogs.length > 0) {
      console.log('Recent Email Logs:');
      recentLogs.forEach((log) => {
        console.log(`- ${log.recipient} | ${log.template_key || log.email_type} | ${log.status} | ${log.provider} | ${new Date(log.created_at).toLocaleString()}`);
      });
      console.log('---');
    } else {
      console.log('No recent email logs found');
    }
  } catch (e) {
    console.log('Error checking email_logs:', e.message);
  }

  console.log('');

  // Check for failed emails
  try {
    const { data: failedEmails, error: failedError } = await supabase
      .from('failed_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (failedError) {
      console.log('failed_emails table may not exist:', failedError.message);
    } else if (failedEmails && failedEmails.length > 0) {
      console.log('Recent Failed Emails:');
      failedEmails.forEach((email) => {
        console.log(`- ${email.recipient} | ${email.provider} | ${email.error_message} | Retry count: ${email.retry_count}`);
      });
      console.log('---');
    } else {
      console.log('No failed emails found');
    }
  } catch (e) {
    console.log('Error checking failed_emails:', e.message);
  }
}

checkDatabaseEmailConfig();