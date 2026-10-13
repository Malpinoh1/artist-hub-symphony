import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { brandedEmail, sendBrandedEmail } from "../_shared/branding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] || c));

const badge = (milestone: number) => {
  if (milestone >= 1_000_000) return { label: `${milestone / 1_000_000}M STREAMS`, tier: "Diamond" };
  if (milestone >= 1_000) return { label: `${milestone / 1_000}K STREAMS`, tier: milestone >= 100_000 ? "Platinum" : milestone >= 10_000 ? "Gold" : "Silver" };
  return { label: `${milestone} STREAMS`, tier: "Bronze" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Supabase server configuration is incomplete");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // This function performs privileged awarding and email delivery. Require a real admin JWT.
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token || token === authorization) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin, error: adminError } = await admin.rpc("user_is_admin", { user_id: authData.user.id });
    if (adminError || isAdmin !== true) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: awardErr } = await admin.rpc("award_stream_achievements");
    if (awardErr) throw awardErr;

    const { data: pending, error: pendingError } = await admin
      .from("stream_achievements")
      .select("id, artist_id, release_id, track_title, milestone, streams_at_award, awarded_at")
      .is("notified_at", null)
      .order("awarded_at", { ascending: true })
      .limit(200);
    if (pendingError) throw pendingError;

    let notificationsCreated = 0, emailed = 0, failed = 0, suppressed = 0;
    for (const a of pending || []) {
      const [{ data: artist, error: artistError }, { data: release }, { data: profile }] = await Promise.all([
        admin.from("artists").select("name,email").eq("id", a.artist_id).maybeSingle(),
        a.release_id ? admin.from("releases").select("title,cover_art_url").eq("id", a.release_id).maybeSingle() : Promise.resolve({ data: null }),
        admin.from("profiles").select("email_notifications").eq("user_id", a.artist_id).maybeSingle(),
      ]);
      if (artistError) throw artistError;
      const b = badge(Number(a.milestone));
      const trackTitle = a.track_title || release?.title || "Your catalogue";
      const displayName = artist?.name || "Artist";
      const awardDate = new Date(a.awarded_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // Unique DB index on metadata achievement_id makes this safe under concurrent/retried runs.
      const { data: existingNotification, error: notificationReadError } = await admin
        .from("notifications").select("id").eq("type", "achievement").contains("metadata", { achievement_id: a.id }).maybeSingle();
      if (notificationReadError) throw notificationReadError;
      if (!existingNotification) {
        const { error: notificationError } = await admin.from("notifications").insert({
          user_id: a.artist_id, type: "achievement", title: `🏆 ${b.label} unlocked — ${trackTitle}`,
          message: `Congratulations ${displayName}! ${trackTitle} has reached ${fmt(Number(a.milestone))} lifetime streams.`,
          link: "/achievements", metadata: { achievement_id: a.id, milestone: a.milestone, release_id: a.release_id },
        });
        if (notificationError && notificationError.code !== "23505") throw notificationError;
        if (!notificationError) notificationsCreated++;
      }

      const { data: ledger, error: ledgerReadError } = await admin
        .from("achievement_email_deliveries").select("*").eq("achievement_id", a.id).maybeSingle();
      if (ledgerReadError) throw ledgerReadError;
      if (ledger?.status === "sent" && ledger.sent_at) {
        await admin.from("stream_achievements").update({ notified_at: ledger.sent_at }).eq("id", a.id).is("notified_at", null);
        continue;
      }
      if (ledger?.status === "suppressed") {
        await admin.from("stream_achievements").update({ notified_at: new Date().toISOString() }).eq("id", a.id).is("notified_at", null);
        continue;
      }
      if (Number(ledger?.attempt_count || 0) >= 5) { failed++; continue; }

      const email = artist?.email?.trim();
      if (!email || profile?.email_notifications === false) {
        await admin.from("achievement_email_deliveries").upsert({
          achievement_id: a.id, artist_id: a.artist_id, recipient_email: email || null,
          status: "suppressed", attempt_count: Number(ledger?.attempt_count || 0),
          last_error: !email ? "No artist email on file" : "Artist email notifications are disabled",
          updated_at: new Date().toISOString(),
        }, { onConflict: "achievement_id" });
        await admin.from("stream_achievements").update({ notified_at: new Date().toISOString() }).eq("id", a.id).is("notified_at", null);
        suppressed++;
        continue;
      }

      const attempts = Number(ledger?.attempt_count || 0) + 1;
      await admin.from("achievement_email_deliveries").upsert({
        achievement_id: a.id, artist_id: a.artist_id, recipient_email: email,
        status: "sending", attempt_count: attempts, last_error: null, updated_at: new Date().toISOString(),
      }, { onConflict: "achievement_id" });

      const artwork = release?.cover_art_url
        ? `<img src="${escapeHtml(release.cover_art_url)}" width="96" height="96" alt="${escapeHtml(trackTitle)} artwork (if images are enabled)" style="display:block;width:96px;height:96px;object-fit:cover;border-radius:10px;border:0;background:#15121F;" />`
        : `<div style="width:96px;height:96px;border-radius:10px;background:#211a31;color:#A79FC0;text-align:center;line-height:96px;font-size:30px;">♪</div>`;
      const html = brandedEmail({
        preheader: `${b.label} unlocked for ${trackTitle}`,
        heading: `🏆 ${b.label}`,
        subheading: `${b.tier} achievement unlocked for “${escapeHtml(trackTitle)}”.`,
        bodyHtml: `
          <p style="margin:0 0 18px;color:#F5F3FF;font-size:15px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px;color:#F5F3FF;font-size:15px;line-height:1.65;">Congratulations! Your music has reached a new milestone. This achievement recognizes the listeners who have discovered and supported your release.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0C1A;border:1px solid #2A2340;border-radius:14px;"><tr>
            <td width="112" valign="top" style="padding:12px;">${artwork}</td>
            <td valign="middle" style="padding:12px 14px 12px 0;color:#F5F3FF;">
              <div style="font-size:16px;font-weight:700;line-height:1.4;">${escapeHtml(trackTitle)}</div>
              <div style="color:#A79FC0;font-size:13px;margin-top:4px;">${escapeHtml(displayName)}</div>
              <div style="display:inline-block;margin-top:10px;background:#6D28D9;color:#fff;font-size:11px;font-weight:800;padding:6px 10px;border-radius:999px;">${b.tier.toUpperCase()} · ${fmt(Number(a.milestone))} STREAMS</div>
            </td>
          </tr></table>
          <p style="margin:18px 0 0;color:#F5F3FF;font-size:14px;line-height:1.7;">Milestone reached: <strong>${fmt(Number(a.milestone))} streams</strong><br />Streams at award: <strong>${fmt(Number(a.streams_at_award))}</strong><br />Unlocked: <strong>${awardDate}</strong></p>
          <p style="margin:16px 0 0;color:#A79FC0;font-size:13px;line-height:1.6;">Keep creating and sharing your music. Your next milestone starts with every new listener.</p>
        `,
        ctaLabel: "View your achievements",
        ctaUrl: "https://artist-hub-symphony.lovable.app/achievements",
      });

      try {
        const providerResponse = await sendBrandedEmail(email, `🏆 ${b.label} unlocked!`, html);
        let providerMessageId: string | null = null;
        try { providerMessageId = JSON.parse(providerResponse)?.messageId || null; } catch { /* provider response can be empty */ }
        const sentAt = new Date().toISOString();
        const { error: sentError } = await admin.from("achievement_email_deliveries").update({
          status: "sent", sent_at: sentAt, provider_message_id: providerMessageId,
          last_error: null, updated_at: sentAt,
        }).eq("achievement_id", a.id);
        if (sentError) throw sentError;
        const { error: markError } = await admin.from("stream_achievements").update({ notified_at: sentAt }).eq("id", a.id).is("notified_at", null);
        if (markError) throw markError;
        emailed++;
      } catch (e) {
        const message = (e as Error).message || "Unknown email delivery error";
        await admin.from("achievement_email_deliveries").update({
          status: "failed", last_error: message.slice(0, 1500), updated_at: new Date().toISOString(),
        }).eq("achievement_id", a.id);
        console.error("achievement email failed", { achievementId: a.id, attempt: attempts, error: message });
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, awardedSweep: true, notificationsCreated, emailed, failed, suppressed, pendingRemaining: Math.max(0, (pending || []).length - emailed - suppressed) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("award-achievements error:", (e as Error).message);
    return new Response(JSON.stringify({ error: "Achievement processing failed", detail: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
