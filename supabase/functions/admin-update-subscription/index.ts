import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform writes (upsert) in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      throw new Error("Access denied. Admin privileges required.");
    }
    logStep("Admin access verified");

    // Parse request body
    const body = await req.json();
    const { target_user_email, subscribed, subscription_tier, subscription_end } = body;

    if (!target_user_email) {
      throw new Error("target_user_email is required");
    }

    logStep("Updating subscription for user", { target_user_email, subscribed, subscription_tier, subscription_end });

    // Get target user ID
    const { data: targetUser } = await supabaseClient.auth.admin.getUserByEmail(target_user_email);
    if (!targetUser.user) {
      throw new Error("Target user not found");
    }

    // Update or insert subscription record
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
    logStep("ERROR in admin-update-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});