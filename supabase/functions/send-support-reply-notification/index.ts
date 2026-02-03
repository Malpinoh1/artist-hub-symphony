import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportReplyNotificationRequest {
  to: string;
  ticketSubject: string;
  ticketId: string;
  replyPreview: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, ticketSubject, ticketId, replyPreview }: SupportReplyNotificationRequest = await req.json();

    if (!to || !ticketSubject || !ticketId) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, ticketSubject, ticketId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      console.error("BREVO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Truncate reply preview
    const truncatedPreview = replyPreview.length > 200 
      ? replyPreview.substring(0, 200) + "..." 
      : replyPreview;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">MALPINOHDISTRO</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            <h2 style="color: #1a1a2e; margin-bottom: 20px;">New Reply to Your Support Ticket</h2>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.6;">
              Our support team has replied to your ticket:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; color: #1a1a2e; font-weight: 600;">
                Subject: ${ticketSubject}
              </p>
              <p style="margin: 0; color: #666666; font-style: italic;">
                "${truncatedPreview}"
              </p>
            </div>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.6;">
              Log in to your dashboard to view the full reply and continue the conversation.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://artist-hub-symphony.lovable.app/support" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Ticket
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} MALPINOHDISTRO. All rights reserved.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
              This is an automated notification about your support request.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending support reply notification to: ${to} for ticket: ${ticketSubject}`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "MALPINOHDISTRO Support", email: "no-reply@malpinohdistro.com.ng" },
        to: [{ email: to }],
        subject: `Re: ${ticketSubject} - MALPINOHDISTRO Support`,
        htmlContent: htmlContent,
      }),
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

    console.log("Support reply notification sent successfully to:", to);
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-support-reply-notification function:", error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
