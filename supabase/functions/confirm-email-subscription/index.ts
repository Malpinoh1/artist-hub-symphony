import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    if (!token) {
      console.error("No token provided");
      return new Response(
        JSON.stringify({ error: "Confirmation token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing email confirmation for token:", token);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user with this confirmation token
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email_confirmation_token, email_opt_in, email_confirmed_at")
      .eq("email_confirmation_token", token)
      .single();

    if (fetchError || !profile) {
      console.error("Token not found or invalid:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.email_confirmed_at) {
      console.log("Email already confirmed for user:", profile.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email subscription already confirmed",
          alreadyConfirmed: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile to confirm email opt-in
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_opt_in: true,
        email_confirmed_at: new Date().toISOString(),
        email_confirmation_token: null, // Clear the token after use
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to confirm email subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email subscription confirmed successfully for user:", profile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email subscription confirmed successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in confirm-email-subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
