/**
 * Email utility for MALPINOHDISTRO using Brevo templates
 * All emails are sent via the send-email edge function
 */

const EDGE_FUNCTION_URL = 'https://hewyffhdykietximpfbu.supabase.co/functions/v1/send-email';

// ============================================
// TEMPLATE IDS (Configured in Brevo Dashboard)
// ============================================
export const TEMPLATE_WELCOME = 1;
export const TEMPLATE_RELEASE_SUBMITTED = 2;
export const TEMPLATE_RELEASE_APPROVED = 3;
export const TEMPLATE_RELEASE_REJECTED = 4;
export const TEMPLATE_ROYALTY_READY = 5;
export const TEMPLATE_PAYMENT_SENT = 6;
export const TEMPLATE_ADDED_TO_TEAM = 7;
export const TEMPLATE_ROLE_UPDATED = 8;
export const TEMPLATE_TEAM_MEMBER_REMOVED = 9;
export const TEMPLATE_PASSWORD_RESET = 10;
export const TEMPLATE_TEAM_INVITATION = 11;

// ============================================
// BASE FUNCTION
// ============================================
export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function sendTemplateEmail(
  to: string,
  templateId: number,
  params: Record<string, any> = {}
): Promise<EmailResult> {
  try {
    console.log('Sending template email:', { to, templateId, params });

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y',
      },
      body: JSON.stringify({ to, templateId, params }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Email send error:', result);
      return { success: false, error: result.error || 'Failed to send email' };
    }

    console.log('Email sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// EMAIL FUNCTIONS
// ============================================

interface User {
  email: string;
  name?: string;
}

interface Release {
  title: string;
  artist: string;
  userEmail?: string;
}

interface Team {
  name: string;
}

export async function sendWelcomeEmail(user: User): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_WELCOME, {
    username: user.name || 'Artist',
  });
}

export async function sendReleaseSubmitted(release: Release): Promise<EmailResult> {
  return sendTemplateEmail('admin@malpinohdistro.com', TEMPLATE_RELEASE_SUBMITTED, {
    title: release.title,
    artist: release.artist,
    uploader: release.userEmail || 'Unknown',
  });
}

export async function sendReleaseApproved(release: Release, user: User): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_RELEASE_APPROVED, {
    title: release.title,
    artist: release.artist,
  });
}

export async function sendReleaseRejected(
  release: Release,
  user: User,
  reason: string
): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_RELEASE_REJECTED, {
    title: release.title,
    artist: release.artist,
    reason,
  });
}

export async function sendRoyaltyReportReady(user: User, period: string): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_ROYALTY_READY, {
    period,
  });
}

export async function sendPaymentSent(user: User, amount: string | number): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_PAYMENT_SENT, {
    amount: String(amount),
  });
}

export async function sendAddedToTeam(
  user: User,
  team: Team,
  role: string
): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_ADDED_TO_TEAM, {
    teamName: team.name,
    role,
  });
}

export async function sendRoleUpdated(
  user: User,
  team: Team,
  role: string
): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_ROLE_UPDATED, {
    teamName: team.name,
    role,
  });
}

export async function sendTeamMemberRemoved(user: User, team: Team): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_TEAM_MEMBER_REMOVED, {
    teamName: team.name,
  });
}

export async function sendPasswordReset(user: User, link: string): Promise<EmailResult> {
  return sendTemplateEmail(user.email, TEMPLATE_PASSWORD_RESET, {
    resetLink: link,
  });
}

// ============================================
// TEAM INVITATION EMAIL (Uses dedicated edge function)
// ============================================

interface TeamInviteParams {
  to: string;
  inviterName: string;
  teamName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}

const TEAM_INVITE_FUNCTION_URL = 'https://hewyffhdykietximpfbu.supabase.co/functions/v1/send-team-invite';

export async function sendTeamInviteEmail(params: TeamInviteParams): Promise<EmailResult> {
  try {
    console.log('Sending team invite email:', params);

    const response = await fetch(TEAM_INVITE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Team invite email error:', result);
      return { success: false, error: result.error || 'Failed to send invitation email' };
    }

    console.log('Team invite email sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('Team invite email error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// TEAM NOTIFICATION EMAILS (Member removed/role updated)
// ============================================

interface TeamNotificationParams {
  to: string;
  type: 'removed' | 'role_updated';
  teamName: string;
  memberName?: string;
  oldRole?: string;
  newRole?: string;
}

const TEAM_NOTIFICATION_FUNCTION_URL = 'https://hewyffhdykietximpfbu.supabase.co/functions/v1/send-team-notification';

export async function sendTeamNotificationEmail(params: TeamNotificationParams): Promise<EmailResult> {
  try {
    console.log('Sending team notification email:', params);

    const response = await fetch(TEAM_NOTIFICATION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Team notification email error:', result);
      return { success: false, error: result.error || 'Failed to send notification email' };
    }

    console.log('Team notification email sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('Team notification email error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// SUPPORT TICKET REPLY NOTIFICATION
// ============================================

interface SupportReplyNotificationParams {
  to: string;
  ticketSubject: string;
  ticketId: string;
  replyPreview: string;
}

const SUPPORT_REPLY_FUNCTION_URL = 'https://hewyffhdykietximpfbu.supabase.co/functions/v1/send-support-reply-notification';

export async function sendSupportReplyNotificationEmail(params: SupportReplyNotificationParams): Promise<EmailResult> {
  try {
    console.log('Sending support reply notification email:', params);

    const response = await fetch(SUPPORT_REPLY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Support reply notification email error:', result);
      return { success: false, error: result.error || 'Failed to send notification email' };
    }

    console.log('Support reply notification email sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('Support reply notification email error:', error.message);
    return { success: false, error: error.message };
  }
}
 
 // ============================================
 // WITHDRAWAL NOTIFICATION EMAIL
 // ============================================
 
 export async function sendWithdrawalNotificationEmail(
   userEmail: string,
   status: 'requested' | 'approved' | 'rejected' | 'completed',
   amountUSD: number,
   amountNGN: number,
   rejectionReason?: string
 ): Promise<EmailResult> {
   try {
     let subject = '';
     let message = '';
     
     switch (status) {
       case 'requested':
         subject = 'Withdrawal Request Received';
         message = `
           <p>Your withdrawal request has been received and is being reviewed.</p>
           <p><strong>Amount:</strong> $${amountUSD.toLocaleString()} (₦${amountNGN.toLocaleString()})</p>
           <p>We will notify you once your request has been processed.</p>
         `;
         break;
       case 'approved':
         subject = 'Withdrawal Request Approved';
         message = `
           <p>Great news! Your withdrawal request has been approved.</p>
           <p><strong>Amount:</strong> $${amountUSD.toLocaleString()} (₦${amountNGN.toLocaleString()})</p>
           <p>Your withdrawal is now being processed and will be completed within 7 business days.</p>
         `;
         break;
       case 'rejected':
         subject = 'Withdrawal Request Rejected';
         message = `
           <p>Unfortunately, your withdrawal request has been rejected.</p>
           <p><strong>Amount:</strong> $${amountUSD.toLocaleString()} (₦${amountNGN.toLocaleString()})</p>
           <p><strong>Reason:</strong> ${rejectionReason || 'No reason provided'}</p>
           <p>If you have any questions, please contact our support team.</p>
         `;
         break;
       case 'completed':
         subject = 'Withdrawal Completed';
         message = `
           <p>Your withdrawal has been completed successfully!</p>
           <p><strong>Amount:</strong> $${amountUSD.toLocaleString()} (₦${amountNGN.toLocaleString()})</p>
           <p>The funds have been transferred to your bank account. Please allow 1-2 business days for the transfer to reflect in your account.</p>
         `;
         break;
     }
 
     const htmlContent = `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
         <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
           <h1 style="color: #ffffff; margin: 0;">MALPINOHdistro</h1>
         </div>
         <div style="padding: 30px; background-color: #ffffff;">
           <h2 style="color: #1a1a2e;">${subject}</h2>
           ${message}
           <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
           <p style="color: #666; font-size: 12px;">
             This is an automated message from MALPINOHdistro. Please do not reply to this email.
           </p>
         </div>
         <div style="background-color: #f5f5f5; padding: 15px; text-align: center;">
           <p style="color: #666; font-size: 12px; margin: 0;">
             © ${new Date().getFullYear()} MALPINOHdistro. All rights reserved.
           </p>
         </div>
       </div>
     `;
 
     console.log('Sending withdrawal notification email:', { userEmail, status });
 
     const response = await fetch(EDGE_FUNCTION_URL, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y',
       },
       body: JSON.stringify({
         to: userEmail,
         subject: `MALPINOHdistro - ${subject}`,
         html: htmlContent,
       }),
     });
 
     const result = await response.json();
 
     if (!response.ok) {
       console.error('Withdrawal notification email error:', result);
       return { success: false, error: result.error || 'Failed to send notification email' };
     }
 
     console.log('Withdrawal notification email sent successfully:', result);
     return { success: true, messageId: result.messageId };
   } catch (error: any) {
     console.error('Withdrawal notification email error:', error.message);
     return { success: false, error: error.message };
   }
 }
