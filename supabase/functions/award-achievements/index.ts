import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { brandedEmail, sendBrandedEmail } from "../_shared/branding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));

const badge = (milestone: number) => {
  if (milestone >= 1_000_000) return { label: `${milestone / 1_000_000}M STREAMS`, tier: "Diamond" };
  if (milestone >= 1_000) return { label: `${milestone / 1_000}K STREAMS`, tier: milestone >= 100_000 ? "Platinum" : milestone >= 10_000 ? "Gold" : "Silver" };
  return { label: `${milestone} STREAMS`, tier: "Bronze" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 1. Award any newly reached milestones
    const { error: awardErr } = await admin.rpc("award_stream_achievements");
    if (awardErr) throw awardErr;

    // 2. Notify everything not yet notified
    const { data: pending, error: pErr } = await admin
      .from("stream_achievements")
      .select("id, artist_id, release_id, milestone, streams_at_award")
      .is("notified_at", null)
      .order("milestone", { ascending: true })
      .limit(200);
    if (pErr) throw pErr;

    let notified = 0;
    let emailed = 0;

    for (const a of pending || []) {
      const [{ data: artist }, { data: release }] = await Promise.all([
        admin.from("artists").select("name, email").eq("id", a.artist_id).maybeSingle(),
        a.release_id
          ? admin.from("releases").select("title, cover_art_url").eq("id", a.release_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const b = badge(Number(a.milestone));
      const title = `${b.label} unlocked${release?.title ? ` — ${release.title}` : ""}`;

      await admin.from("notifications").insert({
        user_id: a.artist_id,
        type: "achievement",
        title: `🏆 ${title}`,
        message: `${release?.title || "Your catalogue"} has passed ${fmt(Number(a.milestone))} lifetime streams.`,
        link: "/achievements",
        metadata: { achievement_id: a.id, milestone: a.milestone, release_id: a.release_id },
      });
      notified++;

      if (artist?.email) {
        try {
          const html = brandedEmail({
            preheader: `${b.label} unlocked on MALPINOHDISTRO`,
            heading: `🏆 ${b.label}`,
            subheading: `${b.tier} milestone unlocked${release?.title ? ` for “${release.title}”` : ""}.`,
            bodyHtml: `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0C1A;border:1px solid #2A2340;border-radius:14px;padding:18px;">
                <tr>
                  ${release?.cover_art_url ? `<td width="96" valign="top"><img src="${release.cover_art_url}" width="88" height="88" alt="${release?.title || "Cover art"}" style="border-radius:10px;display:block;object-fit:cover;" /></td>` : ""}
                  <td valign="top" style="padding-left:${release?.cover_art_url ? "14px" : "0"};">
                    <div style="color:#F5F3FF;font-size:16px;font-weight:700;">${release?.title || "Your catalogue"}</div>
                    <div style="color:#A79FC0;font-size:13px;margin-top:2px;">${artist?.name || ""}</div>
                    <div style="margin-top:10px;display:inline-block;background:linear-gradient(135deg,#6D28D9,#8B5CF6);color:#fff;font-size:11px;font-weight:800;letter-spacing:1px;padding:6px 12px;border-radius:999px;">${b.tier.toUpperCase()} · ${b.label}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;color:#F5F3FF;font-size:15px;">
                Total lifetime streams: <strong style="color:#8B5CF6;">${fmt(Number(a.streams_at_award))}</strong>
              </p>
              <p style="margin:10px 0 0;color:#A79FC0;font-size:13px;">
                Streams are taken from your latest processed royalty reports. Keep pushing — the next milestone is closer than you think.
              </p>
            `,
            ctaLabel: "View your achievements",
            ctaUrl: "https://artist-hub-symphony.lovable.app/achievements",
          });
          await sendBrandedEmail(artist.email, `🏆 ${b.label} unlocked!`, html);
          emailed++;
        } catch (e) {
          console.error("achievement email failed:", (e as Error).message);
        }
      }

      await admin
        .from("stream_achievements")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", a.id);
    }

    return new Response(JSON.stringify({ success: true, notified, emailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("award-achievements error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
