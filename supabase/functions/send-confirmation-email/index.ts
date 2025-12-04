import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendConfirmationRequest {
  userId: string;
  email: string;
  fullName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName }: SendConfirmationRequest = await req.json();

    console.log("Sending confirmation email to:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a unique confirmation token
    const confirmationToken = crypto.randomUUID();

    // Store the token in the user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_confirmation_token: confirmationToken,
        email_confirmation_sent_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error storing confirmation token:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to generate confirmation token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the confirmation URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://hewyffhdykietximpfbu.supabase.co";
    const confirmationUrl = `${baseUrl}/functions/v1/confirm-email-subscription?token=${confirmationToken}`;
    
    // For the frontend redirect after confirmation
    const frontendUrl = "https://malpinohdistro.lovable.app";
    const fullConfirmationUrl = `${frontendUrl}/confirm-subscription?token=${confirmationToken}`;

    // Send the confirmation email
    const emailResponse = await resend.emails.send({
      from: "MALPINOHdistro <onboarding@resend.dev>",
      to: [email],
      subject: "Please confirm your subscription to MALPINOHdistro updates",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">MALPINOHdistro</h1>
            <p style="color: #64748b; margin: 5px 0;">Your Premier Music Distribution Partner</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Confirm Your Email Subscription</h2>
            <p>Hello ${fullName || "there"},</p>
            <p>Thank you for signing up with MALPINOHdistro! To complete your subscription and receive updates, news, and exclusive offers, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${fullConfirmationUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Confirm My Subscription
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${fullConfirmationUrl}</p>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Why confirm?</strong> This ensures you receive important updates about your releases, earnings, and platform news. You can unsubscribe at any time.
            </p>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p>© 2025 MALPINOHdistro. All rights reserved.</p>
            <p>If you didn't create an account with us, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
