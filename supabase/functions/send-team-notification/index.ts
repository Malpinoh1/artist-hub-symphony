import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamNotificationRequest {
  to: string;
  type: 'removed' | 'role_updated';
  teamName: string;
  memberName?: string;
  oldRole?: string;
  newRole?: string;
}

const formatRole = (role: string): string => {
  return role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TeamNotificationRequest = await req.json();
    const { to, type, teamName, memberName, oldRole, newRole } = body;

    const apiKey = Deno.env.get("BREVO_API_KEY");

    if (!apiKey) {
      console.error("BREVO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!to || !type) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("Invalid email format:", to);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let heading: string;
    let message: string;
    let iconColor: string;

    if (type === 'removed') {
      subject = `You've been removed from ${teamName || 'a team'} on MALPINOHdistro`;
      heading = "Team Access Removed";
      message = `Your access to <strong>${teamName || 'a team'}</strong> on MALPINOHdistro has been removed by the team administrator.`;
      iconColor = "#ef4444";
    } else {
      const formattedOldRole = formatRole(oldRole || 'viewer');
      const formattedNewRole = formatRole(newRole || 'viewer');
      subject = `Your role has been updated in ${teamName || 'a team'} on MALPINOHdistro`;
      heading = "Role Updated";
      message = `Your role in <strong>${teamName || 'a team'}</strong> has been changed from <strong>${formattedOldRole}</strong> to <strong>${formattedNewRole}</strong>.`;
      iconColor = "#6366f1";
    }

    console.log(`Sending team notification email (${type}) to: ${to}`);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Team Notification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background-color: ${iconColor}20; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  ${type === 'removed' ? `
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="17" y1="11" x2="22" y2="11"></line>
                  </svg>
                  ` : `
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  `}
                </div>
              </div>
              
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600; text-align: center;">${heading}</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                ${message}
              </p>
              
              ${type === 'role_updated' ? `
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Your New Permissions:</h3>
                ${newRole === 'account_admin' ? `
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>Full account access and control</li>
                  <li>Manage team members and permissions</li>
                  <li>Create and manage music releases</li>
                  <li>Process withdrawals and financial operations</li>
                  <li>View all analytics and performance data</li>
                </ul>
                ` : newRole === 'manager' ? `
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>Create and manage music releases</li>
                  <li>Process withdrawals and financial operations</li>
                  <li>Update account settings and preferences</li>
                  <li>View all analytics and performance data</li>
                </ul>
                ` : `
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>View releases and their status</li>
                  <li>Check earnings and analytics</li>
                  <li>See withdrawal and payment history</li>
                  <li>Read-only access to all data</li>
                </ul>
                `}
              </div>
              ` : `
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #fecaca;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                  You no longer have access to this team's releases, earnings, analytics, or other data. If you believe this was done in error, please contact the team administrator.
                </p>
              </div>
              `}
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://malpinohdistro.com.ng/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                If you have any questions, please contact support.
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

    const emailBody = {
      sender: { name: "MALPINOHDISTRO", email: "no-reply@malpinohdistro.com.ng" },
      to: [{ email: to }],
      subject,
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

    console.log("Team notification email sent successfully to:", to);
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-team-notification function:", error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);