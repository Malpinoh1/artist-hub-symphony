import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      throw new Error("Access denied. Admin privileges required.");
    }
    logStep("Admin access verified");

    const body = await req.json();
    const { target_user_email, subscribed, subscription_tier, subscription_end } = body;

    if (!target_user_email) {
      throw new Error("target_user_email is required");
    }

    logStep("Updating subscription", { target_user_email, subscribed, subscription_tier, subscription_end });

    const { data: targetUser } = await supabaseClient.auth.admin.getUserByEmail(target_user_email);
    if (!targetUser.user) {
      throw new Error("Target user not found");
    }

    // Get previous subscription status to determine if this is an activation
    const { data: previousSub } = await supabaseClient
      .from("subscribers")
      .select("subscribed")
      .eq("email", target_user_email)
      .maybeSingle();

    const wasSubscribed = previousSub?.subscribed || false;
    const isNowSubscribed = subscribed || false;

    const { data: updatedSubscription, error: updateError } = await supabaseClient
      .from("subscribers")
      .upsert({
        email: target_user_email,
        user_id: targetUser.user.id,
        subscribed: subscribed || false,
        subscription_tier: subscription_tier || null,
        subscription_end: subscription_end || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single();

    if (updateError) {
      logStep("Error updating subscription", { error: updateError });
      throw updateError;
    }

    // Send email notification if subscription was just activated or renewed
    if (isNowSubscribed && subscription_end) {
      try {
        // Get user's profile name
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', targetUser.user.id)
          .maybeSingle();

        const userName = profile?.full_name || target_user_email.split('@')[0];
        const action = wasSubscribed ? 'renewed' : 'activated';

        logStep("Sending subscription email", { userName, action, subscription_tier });

        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: target_user_email,
            userName,
            subscriptionTier: subscription_tier || 'Standard',
            subscriptionEnd: subscription_end,
            action
          }),
        });

        if (!emailResponse.ok) {
          logStep("Email send warning - non-fatal", { status: emailResponse.status });
        } else {
          logStep("Subscription email sent successfully");
        }
      } catch (emailError) {
        logStep("Email send error - non-fatal", { error: emailError.message });
      }
    }

    logStep("Subscription updated successfully", { updatedSubscription });
    return new Response(JSON.stringify({
      success: true,
      subscription: updatedSubscription
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});