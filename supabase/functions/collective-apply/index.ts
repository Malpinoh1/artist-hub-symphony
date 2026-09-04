import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { sendCollectiveEmail } from "../_shared/collective-emails.ts";
import { attributeReferral } from "../_shared/collective-referral.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    // ---- Identify caller (REQUIRED: applications belong to a MALPINOHDISTRO account) ----
    let userId: string | null = null;
    let authEmail: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (data?.user) {
        userId = data.user.id;
        authEmail = data.user.email ?? null;
      }
    }
    if (!userId || !authEmail) {
      return json(
        { error: "Please sign in to your MALPINOHDISTRO account before applying.", code: "auth_required" },
        401,
      );
    }

    // ---- Server-side validation ----
    const full_name = str(body.full_name, 120);
    const emailRaw = str(authEmail ?? body.email, 255);
    const email = emailRaw.toLowerCase();
    const phone = str(body.phone, 40) || null;
    const country = str(body.country, 80);
    const city = str(body.city, 80) || null;
    const why_join = str(body.why_join, 2000);
    const contribution = str(body.contribution, 2000);
    const other_role = str(body.other_role, 120) || null;
    const referral_code = str(body.referral_code, 80).toLowerCase() || null;
    const roles: string[] = Array.isArray(body.roles)
      ? body.roles.filter((r: unknown) => typeof r === "string").slice(0, 12)
      : [];
    const social_links: string[] = Array.isArray(body.social_links)
      ? body.social_links.filter((s: unknown) => typeof s === "string" && (s as string).trim().length > 0)
          .map((s: string) => s.trim().slice(0, 300))
          .slice(0, 8)
      : [];

    const errors: string[] = [];
    if (full_name.length < 2) errors.push("Full name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required");
    if (!country) errors.push("Country is required");
    if (roles.length === 0) errors.push("Select at least one role");
    if (roles.includes("other") && !other_role) errors.push("Please specify your role");
    if (why_join.length < 20) errors.push("Tell us a bit more about why you want to join (min 20 characters)");
    if (contribution.length < 20) errors.push("Tell us a bit more about how you'd contribute (min 20 characters)");

    const { data: validRoles } = await admin
      .from("collective_roles").select("slug").eq("is_active", true);
    const allowed = new Set((validRoles ?? []).map((r: any) => r.slug));
    if (roles.some((r) => !allowed.has(r))) errors.push("Invalid role selection");

    if (errors.length) return json({ error: errors[0], errors }, 400);

    // ---- Rate limiting (per IP, per hour) ----
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (ip !== "unknown") {
      const { count } = await admin
        .from("collective_applications")
        .select("id", { count: "exact", head: true })
        .eq("submitted_ip", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        return json({ error: "Too many applications from this network. Please try again later." }, 429);
      }
    }

    // ---- Duplicate protection ----
    const { data: existing } = await admin
      .from("collective_applications")
      .select("id, status")
      .eq("email_normalized", email)
      .neq("status", "rejected")
      .maybeSingle();
    if (existing) {
      return json({ error: "An application for this email is already in progress.", status: existing.status }, 409);
    }

    // ---- Insert ----
    const { data: app, error: insErr } = await admin
      .from("collective_applications")
      .insert({
        user_id: userId,
        full_name, email, phone, country, city,
        roles, other_role,
        social_links,
        why_join, contribution,
        referral_code,
        submitted_ip: ip,
      })
      .select("id, full_name, email")
      .single();
    if (insErr) throw insErr;

    // ---- Referral attribution (server-side only) ----
    if (referral_code) {
      const { data: referrer } = await admin
        .from("collective_members")
        .select("id, user_id, display_name")
        .eq("handle", referral_code)
        .eq("status", "active")
        .maybeSingle();

      if (referrer) {
        let referrerEmail: string | null = null;
        const { data: ru } = await admin.auth.admin.getUserById(referrer.user_id);
        referrerEmail = ru?.user?.email?.toLowerCase() ?? null;

        const selfReferral = referrer.user_id === userId || referrerEmail === email;
        if (!selfReferral) {
          const { error: refErr } = await admin.from("collective_referrals").insert({
            referrer_member_id: referrer.id,
            referred_user_id: userId,
            referred_email_normalized: email,
            referred_application_id: app.id,
            source: "collective_link",
            status: "registered",
          });
          if (!refErr && referrerEmail) {
            await sendCollectiveEmail(admin, {
              event: "referral_new",
              to: referrerEmail,
              name: referrer.display_name,
              memberId: referrer.id,
            });
          }
        }
      }
    }

    await sendCollectiveEmail(admin, {
      event: "application_received",
      to: app.email,
      name: app.full_name,
      applicationId: app.id,
    });

    return json({ success: true, application_id: app.id, status: "pending" });
  } catch (e) {
    console.error("collective-apply error", e);
    return json({ error: (e as Error)?.message ?? "Unexpected error" }, 500);
  }
});
