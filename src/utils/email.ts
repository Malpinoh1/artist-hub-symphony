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
