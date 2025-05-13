// src/lib/email.ts
import nodemailer from 'nodemailer';

// Configure nodemailer with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

/**
 * Send an email using nodemailer
 */
export async function sendEmail(options: EmailOptions) {
  const { to, subject, html, from = process.env.EMAIL_FROM } = options;

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Generate invitation email HTML
 */
export function generateInvitationEmail({
  workspaceName,
  inviterName,
  invitationLink,
  role,
}: {
  workspaceName: string;
  inviterName: string;
  invitationLink: string;
  role: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invitation to join ${workspaceName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #e1e4e8;
          border-radius: 8px;
          padding: 30px;
          background-color: #f9f9f9;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #2563eb;
          font-size: 24px;
        }
        .content {
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          text-align: center;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VideoCollab</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${inviterName} has invited you to join the workspace <strong>${workspaceName}</strong> as a <strong>${role}</strong>.</p>
          <p>Click the button below to accept the invitation and join the workspace:</p>
          <div style="text-align: center;">
            <a href="${invitationLink}" class="button">Accept Invitation</a>
          </div>
          <p>This invitation will expire in 7 days.</p>
          <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>VideoCollab - Collaborate on videos with your team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}