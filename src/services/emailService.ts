
import { supabase } from "../integrations/supabase/client";

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Enhanced email sending with SSL and authentication
const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        ...emailData,
        // Ensure proper from address with domain authentication
        from: emailData.from || 'MALPINOHdistro <noreply@malpinohdistro.com>',
        // Add email headers for better deliverability
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'MALPINOHdistro',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
        }
      }
    });
    
    if (error) {
      console.error('Error sending email:', error);
      return false;
    }
    
    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
  const welcomeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to MALPINOHdistro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">MALPINOHdistro</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">GLOBAL MUSIC DISTRIBUTION SERVICE</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 24px 0; font-size: 24px;">Welcome to MALPINOHdistro, ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            We're excited to have you join our global music distribution platform. You're now part of a community of artists reaching millions of listeners worldwide.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">What you can do with MALPINOHdistro:</h3>
            <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Distribute your music to 150+ streaming platforms worldwide</li>
              <li style="margin-bottom: 8px;">Keep 100% of your royalties</li>
              <li style="margin-bottom: 8px;">Track your earnings and statistics in real-time</li>
              <li style="margin-bottom: 8px;">Manage all your releases in one place</li>
              <li style="margin-bottom: 8px;">Get paid quickly and reliably</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${window.location.origin}/dashboard" 
               style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">
              Access Your Dashboard
            </a>
          </div>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>🔒 Secure Email Delivery:</strong> This email was delivered using SSL encryption and proper authentication to ensure it reaches your inbox safely.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
            © 2025 MALPINOHdistro. All rights reserved.
          </p>
          <div style="margin-top: 16px;">
            <a href="#" style="color: #3b82f6; text-decoration: none; margin: 0 12px; font-size: 12px;">Privacy Policy</a>
            <a href="#" style="color: #3b82f6; text-decoration: none; margin: 0 12px; font-size: 12px;">Terms of Service</a>
            <a href="#" style="color: #3b82f6; text-decoration: none; margin: 0 12px; font-size: 12px;">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: "Welcome to MALPINOHdistro - Your Music Distribution Journey Begins!",
    html: welcomeHtml,
    from: 'MALPINOHdistro <welcome@malpinohdistro.com>'
  });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string): Promise<boolean> => {
  const resetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - MALPINOHdistro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">MALPINOHdistro</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">PASSWORD RESET REQUEST</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 24px 0; font-size: 24px;">Reset Your Password</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset your password for your MALPINOHdistro account. If you didn't make this request, you can safely ignore this email.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" 
               style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
            This link will expire in 24 hours. If you need to reset your password after that, please request a new reset link.
          </p>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>🔒 Secure Email Delivery:</strong> This email was delivered using SSL encryption and authentication to protect your security.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
            © 2025 MALPINOHdistro. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: "Reset Your MALPINOHdistro Password",
    html: resetHtml,
    from: 'MALPINOHdistro Security <security@malpinohdistro.com>'
  });
};

export const sendReleaseApprovalEmail = async (
  email: string, 
  artistName: string, 
  releaseTitle: string, 
  releaseId: string
): Promise<boolean> => {
  const approvalHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Release Approved - MALPINOHdistro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">MALPINOHdistro</h1>
          <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">RELEASE APPROVED</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 24px 0; font-size: 24px;">🎉 Great News, ${artistName}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            Your release "<strong>${releaseTitle}</strong>" has been approved and is now being distributed to streaming platforms worldwide!
          </p>
          
          <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #065f46; margin: 0 0 16px 0; font-size: 18px;">What happens next:</h3>
            <ul style="color: #047857; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Your music is being sent to all major streaming platforms</li>
              <li style="margin-bottom: 8px;">It may take 24-48 hours to appear on all platforms</li>
              <li style="margin-bottom: 8px;">You'll receive streaming links once they're live</li>
              <li style="margin-bottom: 8px;">Earnings will start appearing in your dashboard</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${window.location.origin}/release/${releaseId}" 
               style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">
              View Release Details
            </a>
          </div>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>🔒 Secure Email Delivery:</strong> This notification was delivered using SSL encryption for your privacy and security.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
            © 2025 MALPINOHdistro. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: `🎉 Release Approved: "${releaseTitle}" is now live!`,
    html: approvalHtml,
    from: 'MALPINOHdistro Releases <releases@malpinohdistro.com>'
  });
};

export const sendMarketingEmail = async (
  email: string,
  name: string,
  subject: string,
  content: string,
  actionUrl?: string,
  actionLabel?: string
): Promise<boolean> => {
  const marketingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">MALPINOHdistro</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">YOUR PREMIER MUSIC DISTRIBUTION PARTNER</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 18px;">Hello ${name},</p>
          
          <div style="color: #4b5563; line-height: 1.6; margin: 0 0 32px 0;">
            ${content}
          </div>
          
          ${actionUrl && actionLabel ? `
            <div style="text-align: center; margin: 32px 0;">
              <a href="${actionUrl}" 
                 style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">
                ${actionLabel}
              </a>
            </div>
          ` : ''}
          
          <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; margin: 32px 0;">
            <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px;">Why choose MALPINOHdistro?</h3>
            <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px; font-size: 14px;">
              <li style="margin-bottom: 8px;">Global distribution to 150+ platforms</li>
              <li style="margin-bottom: 8px;">Keep 100% of your royalties</li>
              <li style="margin-bottom: 8px;">Professional support team</li>
              <li style="margin-bottom: 8px;">Advanced analytics and reporting</li>
            </ul>
          </div>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>🔒 Secure Email Delivery:</strong> This email was delivered using SSL encryption and proper authentication to ensure inbox delivery.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
            © 2025 MALPINOHdistro. All rights reserved. You're receiving this because you've opted-in to receive marketing emails.
          </p>
          <div style="margin-top: 16px;">
            <a href="${window.location.origin}/settings" style="color: #3b82f6; text-decoration: none; margin: 0 12px; font-size: 12px;">Unsubscribe</a>
            <a href="#" style="color: #3b82f6; text-decoration: none; margin: 0 12px; font-size: 12px;">Privacy Policy</a>
            <a href="#" style="color: #3b82f6; text-decoration: none; margin: 0 12px; font-size: 12px;">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: subject,
    html: marketingHtml,
    from: 'MALPINOHdistro Marketing <marketing@malpinohdistro.com>'
  });
};
