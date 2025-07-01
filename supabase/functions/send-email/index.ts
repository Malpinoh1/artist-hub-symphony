
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !html) {
      console.error("Missing required fields:", { to: !!to, subject: !!subject, html: !!html });
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          details: "Email address, subject, and content are required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("Invalid email format:", to);
      return new Response(
        JSON.stringify({ 
          error: "Invalid email format",
          details: "Please provide a valid email address"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Attempting to send email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${from || "MALPINOHdistro <noreply@resend.dev>"}`);
    console.log(`Content length: ${html.length} characters`);

    // Send email with enhanced configuration for better deliverability
    const emailResponse = await resend.emails.send({
      from: from || "MALPINOHdistro <noreply@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
      headers: {
        'X-Entity-Ref-ID': Math.random().toString(36).substring(7),
        'X-Mailer': 'MALPINOHdistro-EmailService',
        'X-Priority': '1',
        'Importance': 'high',
      },
      tags: [
        {
          name: 'category',
          value: 'transactional'
        },
        {
          name: 'environment',
          value: 'production'
        }
      ]
    });

    console.log("Email sent successfully:", emailResponse);

    // Check for errors in the response
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      
      // Handle specific Resend errors
      let errorMessage = "Failed to send email";
      if (emailResponse.error.message) {
        if (emailResponse.error.message.includes("Invalid email")) {
          errorMessage = "Invalid email address format";
        } else if (emailResponse.error.message.includes("rate limit")) {
          errorMessage = "Email sending rate limit exceeded. Please try again later.";
        } else if (emailResponse.error.message.includes("authentication")) {
          errorMessage = "Email service authentication failed";
        } else {
          errorMessage = emailResponse.error.message;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: emailResponse.error 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        id: emailResponse.data?.id || 'unknown',
        message: "Email sent successfully"
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Unexpected error in send-email function:", error);
    
    // Handle different types of errors
    let errorMessage = "Internal server error";
    let statusCode = 500;
    
    if (error.name === 'SyntaxError') {
      errorMessage = "Invalid request format";
      statusCode = 400;
    } else if (error.message?.includes("fetch")) {
      errorMessage = "Email service temporarily unavailable";
      statusCode = 503;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.stack || error.toString()
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
