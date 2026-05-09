/**
 * Email Service — Uses Brevo HTTP API (v3) instead of SMTP.
 * This is more reliable on cloud platforms (Render, Railway, etc.)
 * which often block outbound SMTP ports.
 *
 * Requires: BREVO_API_KEY in .env
 * Get yours at: https://app.brevo.com/settings/keys/api
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send a transactional email via Brevo HTTP API.
 * @param {Object} options
 * @param {Object} options.sender  - { name, email }
 * @param {Array}  options.to      - [{ name, email }]
 * @param {string} options.subject
 * @param {string} options.htmlContent
 * @param {Object} [options.replyTo] - { email }
 */
const sendEmail = async ({ sender, to, subject, htmlContent, replyTo }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[EMAIL] BREVO_API_KEY is not set! Get yours at: https://app.brevo.com/settings/keys/api');
    throw new Error('Email service not configured — missing API key');
  }

  const body = {
    sender,
    to,
    subject,
    htmlContent,
  };
  if (replyTo) body.replyTo = replyTo;

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[EMAIL] Brevo API error (${response.status}):`, JSON.stringify(errorData));
    throw new Error(errorData.message || `Brevo API returned ${response.status}`);
  }

  const data = await response.json();
  console.log(`[EMAIL] Sent successfully — messageId: ${data.messageId}`);
  return data;
};

// ── Default sender ─────────────────────────────────────────
const getDefaultSender = () => ({
  name: process.env.BREVO_FROM_NAME || 'TruthScanAI',
  email: process.env.BREVO_FROM_EMAIL || 'adiashuto30@gmail.com',
});

// ── Email Functions ────────────────────────────────────────

const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    await sendEmail({
      sender: getDefaultSender(),
      to: [{ email: userEmail, name: userName }],
      subject: 'Welcome to TruthScan AI!',
      htmlContent: `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #09090B; color: white; padding: 30px; text-align: center;">
            <h1 style="font-size: 28px; letter-spacing: -1px; margin: 0;">TRUTHSCAN AI</h1>
            <p style="color: #D2E823; font-size: 12px; margin-top: 8px;">MISINFORMATION DETECTION ENGINE</p>
          </div>
          <div style="padding: 30px; border: 2px solid #09090B; border-top: 0;">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Welcome to TruthScan AI! Your account has been created successfully.</p>
            <p>You now have <strong>2 free AI scans</strong> to analyze any news content, screenshots, or claims for misinformation.</p>
            <p>Upgrade to <strong>Premium (₹150/month)</strong> for unlimited access.</p>
            <a href="${process.env.CLIENT_URL}/scan" style="display: inline-block; background: #D2E823; color: #09090B; padding: 12px 24px; text-decoration: none; font-weight: bold; border: 2px solid #09090B; margin-top: 16px;">START SCANNING →</a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    // Welcome email is non-critical — don't block signup
    console.error('[EMAIL] Welcome email failed (non-critical):', error.message);
  }
};

const sendPaymentConfirmation = async (userEmail, userName) => {
  try {
    await sendEmail({
      sender: getDefaultSender(),
      to: [{ email: userEmail, name: userName }],
      subject: 'TruthScan AI — Premium Activated!',
      htmlContent: `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #D2E823; color: #09090B; padding: 30px; text-align: center; border: 2px solid #09090B;">
            <h1 style="font-size: 28px; letter-spacing: -1px; margin: 0;">★ PREMIUM ACTIVATED</h1>
            <p style="font-size: 12px; margin-top: 8px;">TRUTHSCAN AI</p>
          </div>
          <div style="padding: 30px; border: 2px solid #09090B; border-top: 0;">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your payment of <strong>₹150</strong> has been received and your Premium subscription is now active for <strong>30 days</strong>.</p>
            <p>You now have <strong>unlimited AI scans</strong>. Thank you for supporting TruthScan AI!</p>
            <a href="${process.env.CLIENT_URL}/scan" style="display: inline-block; background: #09090B; color: #D2E823; padding: 12px 24px; text-decoration: none; font-weight: bold; border: 2px solid #09090B; margin-top: 16px;">START SCANNING →</a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('[EMAIL] Payment confirmation failed (non-critical):', error.message);
  }
};

const sendOtpEmail = async (userEmail, userName, otp) => {
  // OTP is CRITICAL — must throw on failure
  await sendEmail({
    sender: getDefaultSender(),
    to: [{ email: userEmail, name: userName }],
    subject: 'Your TruthScan AI Verification Code',
    htmlContent: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #09090B; color: white; padding: 30px; text-align: center;">
          <h1 style="font-size: 28px; letter-spacing: -1px; margin: 0;">VERIFICATION REQUIRED</h1>
          <p style="color: #D2E823; font-size: 12px; margin-top: 8px;">TRUTHSCAN AI</p>
        </div>
        <div style="padding: 30px; border: 2px solid #09090B; border-top: 0;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Please use the following 6-digit code to verify your email address. This code will expire in 10 minutes.</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; background: #D2E823; color: #09090B; padding: 16px 32px; font-size: 32px; font-weight: bold; border: 2px solid #09090B; letter-spacing: 8px;">${otp}</span>
          </div>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};

const sendDeleteOtpEmail = async (userEmail, userName, otp) => {
  // Deletion OTP is CRITICAL — must throw on failure
  await sendEmail({
    sender: getDefaultSender(),
    to: [{ email: userEmail, name: userName }],
    subject: 'URGENT: Account Deletion Code',
    htmlContent: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #ef4444; color: white; padding: 30px; text-align: center; border: 2px solid #09090B;">
          <h1 style="font-size: 28px; letter-spacing: -1px; margin: 0;">ACCOUNT DELETION</h1>
          <p style="font-size: 12px; margin-top: 8px;">TRUTHSCAN AI</p>
        </div>
        <div style="padding: 30px; border: 2px solid #09090B; border-top: 0;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>We received a request to permanently delete your TruthScan AI account.</p>
          <p>If you made this request, please use the following 6-digit code to confirm deletion. This action CANNOT be undone.</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; background: #09090B; color: #ef4444; padding: 16px 32px; font-size: 32px; font-weight: bold; border: 2px solid #09090B; letter-spacing: 8px;">${otp}</span>
          </div>
          <p>If you did not request this, please change your password immediately.</p>
        </div>
      </div>
    `,
  });
};

const sendSupportQueryEmail = async (userEmail, userName, message) => {
  // Support query — must throw on failure so user sees error
  await sendEmail({
    sender: getDefaultSender(),
    to: [{ email: process.env.BREVO_FROM_EMAIL || 'adiashuto30@gmail.com' }],
    replyTo: { email: userEmail },
    subject: `Support Query: TruthScan AI - ${userName}`,
    htmlContent: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #09090B; color: white; padding: 30px; border: 2px solid #09090B;">
          <h1 style="font-size: 24px; letter-spacing: -1px; margin: 0;">NEW SUPPORT QUERY</h1>
        </div>
        <div style="padding: 30px; border: 2px solid #09090B; border-top: 0; background: #F8F4E8;">
          <p><strong>From:</strong> ${userName} (${userEmail})</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border: 1px dashed #09090B; margin: 20px 0;" />
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `,
  });
};

module.exports = { sendWelcomeEmail, sendPaymentConfirmation, sendOtpEmail, sendDeleteOtpEmail, sendSupportQueryEmail };
