import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

interface SubscriptionEmailRequest {
  to: string;
  userName: string;
  subscriptionTier: string;
  subscriptionEnd: string;
  action: 'activated' | 'renewed' | 'expired';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, userName, subscriptionTier, subscriptionEnd, action }: SubscriptionEmailRequest = await req.json();

    console.log(`Sending subscription ${action} email to:`, to);

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    const subjects = {
      activated: `🎉 Your ${subscriptionTier} Subscription is Now Active!`,
      renewed: `✅ Your ${subscriptionTier} Subscription Has Been Renewed`,
      expired: `⚠️ Your Subscription Has Expired`
    };

    const actionMessages = {
      activated: `
        <p>Great news! Your <strong>${subscriptionTier}</strong> subscription has been activated.</p>
        <p>You now have full access to all features including:</p>
        <ul>
          <li>Upload unlimited releases</li>
          <li>Access detailed analytics</li>
          <li>Priority support</li>
          <li>And much more!</li>
        </ul>
      `,
      renewed: `
        <p>Your <strong>${subscriptionTier}</strong> subscription has been renewed successfully.</p>
        <p>You'll continue to enjoy all premium features without interruption.</p>
      `,
      expired: `
        <p>Your subscription has expired. To continue enjoying our premium features, please renew your subscription.</p>
        <p>Without an active subscription, you won't be able to:</p>
        <ul>
          <li>Upload new releases</li>
          <li>Access your dashboard</li>
          <li>View detailed analytics</li>
        </ul>
      `
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MALPINOHdistro</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            ${actionMessages[action]}
            ${action !== 'expired' ? `
              <div class="info-box">
                <p><strong>Subscription Details:</strong></p>
                <p>Plan: ${subscriptionTier}</p>
                <p>Valid Until: ${new Date(subscriptionEnd).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
            ` : ''}
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MALPINOHdistro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "MALPINOHdistro", email: "no-reply@malpinohdistro.com.ng" },
        to: [{ email: to }],
        subject: subjects[action],
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log("Subscription email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error sending subscription email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
