const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_FROM_NAME || 'TruthScanAI'}" <${process.env.BREVO_FROM_EMAIL || 'noreply@truthscan.ai'}>`,
      to: userEmail,
      subject: 'Welcome to TruthScan AI!',
      html: `
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
    console.log(`Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    // Don't throw — email is non-critical
  }
};

const sendPaymentConfirmation = async (userEmail, userName) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_FROM_NAME || 'TruthScanAI'}" <${process.env.BREVO_FROM_EMAIL || 'noreply@truthscan.ai'}>`,
      to: userEmail,
      subject: 'TruthScan AI — Premium Activated!',
      html: `
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
    console.log(`Payment confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send payment email:', error.message);
  }
};

const sendOtpEmail = async (userEmail, userName, otp) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_FROM_NAME || 'TruthScanAI'}" <${process.env.BREVO_FROM_EMAIL || 'noreply@truthscan.ai'}>`,
      to: userEmail,
      subject: 'Your TruthScan AI Verification Code',
      html: `
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
    console.log(`OTP email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
  }
};

const sendDeleteOtpEmail = async (userEmail, userName, otp) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_FROM_NAME || 'TruthScanAI'}" <${process.env.BREVO_FROM_EMAIL || 'noreply@truthscan.ai'}>`,
      to: userEmail,
      subject: 'URGENT: Account Deletion Code',
      html: `
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
    console.log(`Account deletion OTP email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send deletion OTP email:', error.message);
  }
};

const sendSupportQueryEmail = async (userEmail, userName, message) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_FROM_NAME || 'TruthScanAI'}" <${process.env.BREVO_FROM_EMAIL || 'noreply@truthscan.ai'}>`,
      replyTo: userEmail,
      to: 'adiashuto2005@gmail.com',
      subject: `Support Query: TruthScan AI - ${userName}`,
      html: `
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
    console.log(`Support query sent from ${userEmail}`);
  } catch (error) {
    console.error('Failed to send support query:', error.message);
    throw new Error('Could not send email');
  }
};

module.exports = { sendWelcomeEmail, sendPaymentConfirmation, sendOtpEmail, sendDeleteOtpEmail, sendSupportQueryEmail };
