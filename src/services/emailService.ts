
import { supabase } from '../integrations/supabase/client';

export interface EmailResult {
  success: boolean;
  error?: string;
}

const EDGE_FUNCTION_URL = `${supabase.supabaseUrl}/functions/v1/send-email`;

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
        'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`,
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
    from: 'MALPINOHdistro <welcome@resend.dev>'
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
    from: 'MALPINOHdistro Security <security@resend.dev>'
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

        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            💡 <strong>Tip:</strong> You can track your release status and view analytics in your dashboard once it's approved.
          </p>
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
    from: 'MALPINOHdistro <releases@resend.dev>'
  });
};

export const sendReleaseApprovalEmail = async (email: string, releaseTitle: string, artistName: string): Promise<EmailResult> => {
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

        <div style="background: #ecfdf5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #059669; font-size: 18px; margin-bottom: 16px;">🚀 Your Music is Going Live!</h3>
          <div style="color: #065f46; font-size: 14px; line-height: 1.6;">
            <p style="margin: 8px 0;">🎵 <strong>Spotify:</strong> Live within 1-3 days</p>
            <p style="margin: 8px 0;">🍎 <strong>Apple Music:</strong> Live within 1-2 days</p>
            <p style="margin: 8px 0;">▶️ <strong>YouTube Music:</strong> Live within 2-5 days</p>
            <p style="margin: 8px 0;">🎶 <strong>Other Platforms:</strong> Live within 3-7 days</p>
          </div>
        </div>

        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            📊 <strong>Track Your Success:</strong> Monitor streams, earnings, and analytics in your dashboard once your music goes live.
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
    from: 'MALPINOHdistro <success@resend.dev>'
  });
};

export const sendMarketingEmail = async (recipients: string[], subject: string, content: string): Promise<EmailResult> => {
  try {
    const results = await Promise.allSettled(
      recipients.map(email => 
        sendEmail({
          to: email,
          subject,
          html: content,
          from: 'MALPINOHdistro <marketing@resend.dev>'
        })
      )
    );

    const failures = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success)
    );

    if (failures.length === results.length) {
      return { success: false, error: 'All emails failed to send' };
    } else if (failures.length > 0) {
      return { 
        success: true, 
        error: `${failures.length}/${results.length} emails failed to send` 
      };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
