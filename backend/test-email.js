/**
 * Quick test to verify Brevo HTTP API works.
 * Run: node test-email.js
 *
 * Get your API key at: https://app.brevo.com/settings/keys/api
 */
require('dotenv').config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const apiKey = process.env.BREVO_API_KEY;
const fromEmail = process.env.BREVO_FROM_EMAIL || 'adiashuto30@gmail.com';
const fromName = process.env.BREVO_FROM_NAME || 'TruthScanAI';

console.log('Brevo HTTP API Email Test');
console.log('─────────────────────────');
console.log('  API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NOT SET!');
console.log('  From:', `${fromName} <${fromEmail}>`);
console.log('');

if (!apiKey || apiKey === 'your-brevo-api-key-here') {
  console.error('❌ BREVO_API_KEY is not set!');
  console.error('');
  console.error('Steps to get your API key:');
  console.error('  1. Go to https://app.brevo.com/settings/keys/api');
  console.error('  2. Click "Generate a new API key"');
  console.error('  3. Copy the key and paste it in your .env file as BREVO_API_KEY=xkeysib-...');
  console.error('  4. Also set it in your Render dashboard environment variables');
  process.exit(1);
}

async function testEmail() {
  console.log('Sending test email...');
  
  const body = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: fromEmail, name: 'Test' }],
    subject: 'TruthScan AI - Email Test ✅',
    htmlContent: '<h1>Email service is working!</h1><p>If you see this, your Brevo HTTP API setup is correct.</p>',
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('  Message ID:', data.messageId);
      console.log('');
      console.log('Check your inbox at:', fromEmail);
    } else {
      console.error('❌ Brevo API error:', response.status);
      console.error('  Response:', JSON.stringify(data, null, 2));
      
      if (data.code === 'unauthorized') {
        console.error('');
        console.error('⚠️  API key is invalid! Generate a new one at:');
        console.error('   https://app.brevo.com/settings/keys/api');
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testEmail();
