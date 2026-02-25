// utils/email.js

/**
 * Send email (placeholder for future implementation)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
exports.sendEmail = async (to, subject, html) => {
  // TODO: Integrate with SendGrid, Mailgun, or AWS SES
  console.log(`Email would be sent to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${html}`);
  
  // Example with nodemailer (uncomment when ready):
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  await transporter.sendMail({
    from: '"EthioMatch" <noreply@ethiomatch.com>',
    to,
    subject,
    html
  });
  */
};

/**
 * Send verification email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {string} token - Verification token
 */
exports.sendVerificationEmail = async (email, username, token) => {
  const subject = 'Verify Your EthioMatch Account';
  const verificationLink = `${process.env.BASE_URL}/verify/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #d32f2f;">🇪🇹 EthioMatch</h1>
      <h2>Welcome, ${username}!</h2>
      <p>Thank you for joining EthioMatch. Please verify your email address to complete your registration.</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Verify Email
      </a>
      <p>This link will expire in 24 hours.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If you didn't create this account, please ignore this email.
      </p>
    </div>
  `;
  
  await this.sendEmail(email, subject, html);
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {string} token - Reset token
 */
exports.sendPasswordResetEmail = async (email, username, token) => {
  const subject = 'Reset Your EthioMatch Password';
  const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #d32f2f;">🇪🇹 EthioMatch</h1>
      <h2>Password Reset Request</h2>
      <p>Hello ${username},</p>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If you didn't request this, please ignore this email and your password will remain unchanged.
      </p>
    </div>
  `;
  
  await this.sendEmail(email, subject, html);
};

/**
 * Send match notification email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {string} matchName - Match's username
 */
exports.sendMatchNotificationEmail = async (email, username, matchName) => {
  const subject = `🎉 You have a new match on EthioMatch!`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #d32f2f;">🇪🇹 EthioMatch</h1>
      <h2>It's a Match! 🎉</h2>
      <p>Congratulations ${username}!</p>
      <p>You and <strong>${matchName}</strong> have liked each other. You can now start chatting!</p>
      <a href="${process.env.BASE_URL}/messages" style="display: inline-block; padding: 12px 24px; background: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Start Chatting
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Happy matching!
      </p>
    </div>
  `;
  
  await this.sendEmail(email, subject, html);
};
