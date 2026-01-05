import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamInviteRequest {
  to: string;
  inviterName: string;
  teamName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TeamInviteRequest = await req.json();
    const { to, inviterName, teamName, role, inviteLink, expiresAt } = body;

    const apiKey = Deno.env.get("BREVO_API_KEY");

    if (!apiKey) {
      console.error("BREVO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate required fields
    if (!to || !inviteLink) {
      console.error("Missing required fields:", { to: !!to, inviteLink: !!inviteLink });
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and inviteLink" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("Invalid email format:", to);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedRole = role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1);
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log(`Sending team invitation email to: ${to}`);

    // Build the HTML email content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">MALPINOHdistro</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Team Invitation</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">You're Invited to Join a Team! 🎉</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName || 'A team owner'}</strong> has invited you to join ${teamName ? `<strong>"${teamName}"</strong>` : 'their team'} on MALPINOHdistro.
              </p>
              
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Role:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${formattedRole}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Expires:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${formattedExpiry}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 25px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                As a <strong>${formattedRole}</strong>, you'll be able to:
              </p>
              
              ${role === 'account_admin' ? `
              <ul style="margin: 0 0 25px 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                <li>Full account access and control</li>
                <li>Manage team members and permissions</li>
                <li>Create and manage music releases</li>
                <li>Process withdrawals and financial operations</li>
                <li>View all analytics and performance data</li>
              </ul>
              ` : role === 'manager' ? `
              <ul style="margin: 0 0 25px 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                <li>Create and manage music releases</li>
                <li>Process withdrawals and financial operations</li>
                <li>Update account settings and preferences</li>
                <li>View all analytics and performance data</li>
              </ul>
              ` : `
              <ul style="margin: 0 0 25px 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                <li>View releases and their status</li>
                <li>Check earnings and analytics</li>
                <li>See withdrawal and payment history</li>
                <li>Read-only access to all data</li>
              </ul>
              `}
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0 0; color: #6366f1; font-size: 12px; word-break: break-all; text-align: center;">
                ${inviteLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                This invitation will expire on <strong>${formattedExpiry}</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} MALPINOHdistro. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Brevo API
    const emailBody = {
      sender: { name: "MALPINOHDISTRO", email: "no-reply@malpinohdistro.com.ng" },
      to: [{ email: to }],
      subject: `${inviterName || 'Someone'} invited you to join ${teamName || 'their team'} on MALPINOHdistro`,
      htmlContent,
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();
    console.log("Brevo API response:", JSON.stringify(result));

    if (!response.ok) {
      console.error("Brevo API error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: result.message || "Failed to send email" }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Team invitation email sent successfully to:", to);
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-team-invite function:", error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);