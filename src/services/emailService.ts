

export interface EmailResult {
  success: boolean;
  error?: string;
}

const EDGE_FUNCTION_URL = `https://hewyffhdykietximpfbu.supabase.co/functions/v1/send-email`;

// Core email sending function via Brevo
export const sendEmail = async (to: string, subject: string, html: string): Promise<EmailResult> => {
  try {
    console.log('Sending email via Brevo:', { to, subject });
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Email sending failed:', result);
      return { success: false, error: result.error || 'Failed to send email' };
    }

    console.log('Email sent successfully:', result);
    return { success: true };
  } catch (error: any) {
    console.error('Email service error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
};

// Welcome email for new users (legacy signature support)
export const sendWelcomeEmail = async (email: string, fullName: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 32px; margin: 0; font-weight: bold;">Welcome to MALPINOHdistro!</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Hello ${fullName}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Thank you for joining MALPINOHdistro - your gateway to global music distribution. We're excited to help you share your music with the world!
          </p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="https://malpinohdistro.com.ng/dashboard" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Get Started Now
          </a>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, '🎵 Welcome to MALPINOHdistro!', html);
};

// Release approved notification
export const sendReleaseApprovedEmail = async (email: string, artistName: string, releaseTitle: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #059669; font-size: 28px; margin: 0; font-weight: bold;">🎉 Release Approved!</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Congratulations ${artistName}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Your release <strong>"${releaseTitle}"</strong> has been approved and is now being distributed to all selected platforms.
          </p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="https://malpinohdistro.com.ng/dashboard" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Your Release
          </a>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, `🎉 "${releaseTitle}" is Now Live!`, html);
};

// Password reset email
export const sendPasswordResetEmail = async (email: string, resetUrl: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Password Reset Request</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to reset it. This link will expire in 24 hours.
          </p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⚠️ If you didn't request this password reset, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, '🔒 Reset Your MALPINOHdistro Password', html);
};

// Email verification
export const sendEmailVerification = async (email: string, link: string, name?: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Verify Your Email</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            ${name ? `Hi ${name},` : 'Hi there,'}<br><br>
            Please confirm your email address to complete your MALPINOHdistro account setup.
          </p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            🔒 This link will expire in 24 hours for security purposes.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, '✉️ Verify Your MALPINOHdistro Email', html);
};

// Marketing email
export const sendMarketingEmail = async (email: string, name: string, subject: string, content: string, actionLabel?: string, actionUrl?: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">MALPINOHdistro</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Hello ${name}!</h2>
          <div style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            ${content}
          </div>
        </div>
        ${actionLabel && actionUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionUrl}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ${actionLabel}
            </a>
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
};

// Release submission email
export const sendReleaseSubmissionEmail = async (email: string, releaseTitle: string, artistName: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Release Submitted Successfully!</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Hello ${artistName}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            We've successfully received your release submission for <strong>"${releaseTitle}"</strong>.
          </p>
        </div>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">📋 What Happens Next?</h3>
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <p style="margin: 8px 0;">🔍 <strong>Review Process:</strong> Our team will review within 24-48 hours</p>
            <p style="margin: 8px 0;">✅ <strong>Quality Check:</strong> We'll verify audio quality and metadata</p>
            <p style="margin: 8px 0;">🚀 <strong>Distribution:</strong> Once approved, your music will be distributed</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="https://malpinohdistro.com.ng/dashboard" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Your Dashboard
          </a>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, `🎵 "${releaseTitle}" - Release Submitted!`, html);
};

// Team invitation email
export const sendTeamInvitationEmail = async (email: string, inviterName: string, role: string, inviteUrl: string): Promise<EmailResult> => {
  const roleNames: Record<string, string> = {
    'account_admin': 'Account Administrator',
    'manager': 'Manager',
    'viewer': 'Viewer'
  };
  
  const roleName = roleNames[role] || 'Team Member';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Team Invitation</h1>
        </div>
        <div style="margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join their MALPINOHdistro account as a <strong>${roleName}</strong>.
          </p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">© 2024 MALPINOHdistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, '🎵 You\'re Invited to Join a MALPINOHdistro Team!', html);
};