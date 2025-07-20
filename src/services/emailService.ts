import { supabase } from '../integrations/supabase/client';

export interface EmailResult {
  success: boolean;
  error?: string;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

const sendEmail = async (emailData: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<EmailResult> => {
  try {
    console.log('Sending email via edge function:', emailData.subject);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Email sending failed:', result);
      return { 
        success: false, 
        error: result.error || `HTTP ${response.status}: Failed to send email` 
      };
    }

    console.log('Email sent successfully:', result);
    return { success: true };
  } catch (error: any) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};

export const sendWelcomeEmail = async (email: string, fullName: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 32px; margin: 0; font-weight: bold;">Welcome to MALPINOHdistro!</h1>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 16px auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Hello ${fullName}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Thank you for joining MALPINOHdistro - your gateway to global music distribution. We're excited to help you share your music with the world!
          </p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">🎵 What's Next?</h3>
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <p style="margin: 8px 0;">✅ <strong>Upload Your Music:</strong> Start by submitting your first release</p>
            <p style="margin: 8px 0;">✅ <strong>Choose Platforms:</strong> Select where you want your music distributed</p>
            <p style="margin: 8px 0;">✅ <strong>Track Performance:</strong> Monitor your streams and earnings</p>
            <p style="margin: 8px 0;">✅ <strong>Get Paid:</strong> Withdraw your earnings directly to your account</p>
          </div>
        </div>

        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
          <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 500;">
            🔒 <strong>Security Notice:</strong> All data is protected with SSL encryption and stored securely.
          </p>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="https://malpinohdistro.com.ng/dashboard" 
             style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            Get Started Now
          </a>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 MALPINOHdistro. All rights reserved.<br>
            Need help? Contact us at support@malpinohdistro.com.ng
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: '🎵 Welcome to MALPINOHdistro - Let\'s Get Your Music Out There!',
    html,
    from: 'MALPINOHdistro <welcome@malpinohdistro.com.ng>'
  });
};

export const sendPasswordResetEmail = async (email: string, resetUrl: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Password Reset Request</h1>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 16px auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            We received a request to reset your password for your MALPINOHdistro account.
          </p>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Click the button below to reset your password. This link will expire in 24 hours for security.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            Reset Your Password
          </a>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⚠️ <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 MALPINOHdistro. All rights reserved.<br>
            This email was sent securely with SSL encryption.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: '🔒 Reset Your MALPINOHdistro Password',
    html,
    from: 'MALPINOHdistro Security <security@malpinohdistro.com.ng>'
  });
};

export const sendMarketingEmail = async (email: string, name: string, subject: string, content: string, actionLabel?: string, actionUrl?: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">MALPINOHdistro</h1>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 16px auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Hello ${name}!</h2>
          <div style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            ${content}
          </div>
        </div>

        ${actionLabel && actionUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionUrl}" 
               style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              ${actionLabel}
            </a>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 MALPINOHdistro. All rights reserved.<br>
            Questions? Contact us at support@malpinohdistro.com.ng
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    from: 'MALPINOHdistro <marketing@malpinohdistro.com.ng>'
  });
};

export const sendReleaseSubmissionEmail = async (email: string, releaseTitle: string, artistName: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Release Submitted Successfully!</h1>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 16px auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Hello ${artistName}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Great news! We've successfully received your release submission for <strong>"${releaseTitle}"</strong>.
          </p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">📋 What Happens Next?</h3>
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <p style="margin: 8px 0;">🔍 <strong>Review Process:</strong> Our team will review your submission within 24-48 hours</p>
            <p style="margin: 8px 0;">✅ <strong>Quality Check:</strong> We'll verify audio quality and metadata accuracy</p>
            <p style="margin: 8px 0;">🚀 <strong>Distribution:</strong> Once approved, your music will be sent to all selected platforms</p>
            <p style="margin: 8px 0;">📊 <strong>Go Live:</strong> Most platforms will have your music live within 3-7 days</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="https://malpinohdistro.com.ng/dashboard" 
             style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            View Your Dashboard
          </a>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 MALPINOHdistro. All rights reserved.<br>
            Questions? Contact us at support@malpinohdistro.com.ng
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `🎵 "${releaseTitle}" - Release Submitted Successfully!`,
    html,
    from: 'MALPINOHdistro <releases@malpinohdistro.com.ng>'
  });
};

export const sendReleaseApprovalEmail = async (email: string, artistName: string, releaseTitle: string): Promise<EmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #059669; font-size: 28px; margin: 0; font-weight: bold;">🎉 Release Approved!</h1>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #10b981, #059669); margin: 16px auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Congratulations ${artistName}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Excellent news! Your release <strong>"${releaseTitle}"</strong> has been approved and is now being distributed to all selected platforms.
          </p>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="https://malpinohdistro.com.ng/dashboard" 
             style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            View Your Release
          </a>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 MALPINOHdistro. All rights reserved.<br>
            Celebrate your success! Share your music with the world 🌍
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 "${releaseTitle}" is Now Live - Congratulations!`,
    html,
    from: 'MALPINOHdistro <success@malpinohdistro.com.ng>'
  });
};

export const sendTeamInvitationEmail = async (email: string, inviterName: string, role: string, inviteUrl: string): Promise<EmailResult> => {
  const roleNames = {
    'account_admin': 'Account Administrator',
    'manager': 'Manager',
    'viewer': 'Viewer'
  };
  
  const roleName = roleNames[role as keyof typeof roleNames] || 'Team Member';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">Team Invitation</h1>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 16px auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">You've been invited to join a team!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            <strong>${inviterName}</strong> has invited you to join their MALPINOHdistro account as a <strong>${roleName}</strong>.
          </p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">🎵 Your Role: ${roleName}</h3>
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            ${role === 'account_admin' ? `
              <p style="margin: 8px 0;">✅ <strong>Full Account Access:</strong> Complete control over the account</p>
              <p style="margin: 8px 0;">✅ <strong>Team Management:</strong> Invite and manage other team members</p>
              <p style="margin: 8px 0;">✅ <strong>All Permissions:</strong> Everything a manager can do and more</p>
            ` : role === 'manager' ? `
              <p style="margin: 8px 0;">✅ <strong>Release Management:</strong> Create and manage music releases</p>
              <p style="margin: 8px 0;">✅ <strong>Financial Access:</strong> Process withdrawals and view earnings</p>
              <p style="margin: 8px 0;">✅ <strong>Account Settings:</strong> Update account information</p>
              <p style="margin: 8px 0;">✅ <strong>Analytics:</strong> View performance data and statistics</p>
            ` : `
              <p style="margin: 8px 0;">✅ <strong>View Releases:</strong> See all music releases and their status</p>
              <p style="margin: 8px 0;">✅ <strong>View Earnings:</strong> Check revenue and payment history</p>
              <p style="margin: 8px 0;">✅ <strong>View Analytics:</strong> Access performance statistics</p>
              <p style="margin: 8px 0;">📋 <strong>Read-Only:</strong> Cannot make changes to the account</p>
            `}
          </div>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" 
             style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
          <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 500;">
            🔒 <strong>Secure Access:</strong> You'll need to create an account or log in to accept this invitation. Your access will be limited to the permissions granted by your role.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 MALPINOHdistro. All rights reserved.<br>
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `🎵 You've been invited to join ${inviterName}'s MALPINOHdistro team as ${roleName}`,
    html,
    from: 'MALPINOHdistro Team <team@malpinohdistro.com.ng>'
  });
};
