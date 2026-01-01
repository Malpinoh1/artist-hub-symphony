import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject?: string;
  html?: string;
  templateId?: number;
  params?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if request has a body
    const contentLength = req.headers.get("content-length");
    if (!contentLength || contentLength === "0") {
      console.error("Empty request body received");
      return new Response(
        JSON.stringify({ error: "Request body is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let body: EmailRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Failed to parse JSON body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, html, templateId, params } = body;
    const apiKey = Deno.env.get("BREVO_API_KEY");

    if (!apiKey) {
      console.error("BREVO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email recipient
    if (!to) {
      console.error("Missing recipient email");
      return new Response(
        JSON.stringify({ error: "Missing required field: to" }),
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

    // Determine if using template or raw HTML
    const useTemplate = templateId !== undefined;

    if (!useTemplate && (!subject || !html)) {
      console.error("Missing required fields for raw email:", { subject: !!subject, html: !!html });
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject and html are required for non-template emails" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending email via Brevo to: ${to}, ${useTemplate ? `Template ID: ${templateId}` : `Subject: ${subject}`}`);

    // Build request body based on email type
    const emailBody: Record<string, any> = {
      sender: { name: "MALPINOHDISTRO", email: "no-reply@malpinohdistro.com" },
      to: [{ email: to }],
    };

    if (useTemplate) {
      emailBody.templateId = templateId;
      if (params) {
        emailBody.params = params;
      }
    } else {
      emailBody.subject = subject;
      emailBody.htmlContent = html;
    }

    // Send email via Brevo API
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

    console.log("Email sent successfully to:", to);
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-email function:", error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
