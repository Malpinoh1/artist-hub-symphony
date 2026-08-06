import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { brandedEmail, sendBrandedEmail } from "../_shared/branding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS_COPY: Record<string, { label: string; heading: string; sub: string }> = {
  pending: {
    label: "Pending review",
    heading: "Your OAC request is under review",
    sub: "Our distribution team is reviewing your YouTube Official Artist Channel request.",
  },
  submitted: {
    label: "Submitted to YouTube",
    heading: "Your OAC request has been submitted",
    sub: "We have submitted your Official Artist Channel request to YouTube.",
  },
  needs_info: {
    label: "More information needed",
    heading: "We need a bit more information",
    sub: "We can't move your OAC request forward until we hear back from you.",
  },
  approved: {
    label: "Approved",
    heading: "Your Official Artist Channel is approved",
    sub: "Congratulations — YouTube approved your Official Artist Channel.",
  },
  rejected: {
    label: "Rejected",
    heading: "Your OAC request was not approved",
    sub: "Unfortunately this request could not be approved at this time.",
  },
  completed: {
    label: "Completed",
    heading: "Your OAC request is complete",
    sub: "Everything is done — your channel changes are live.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { request_id, notify_email = true } = await req.json();
    if (!request_id || typeof request_id !== "string") {
      return new Response(JSON.stringify({ error: "request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: reqRow, error } = await admin
      .from("oac_requests")
      .select("id, user_id, artist_id, artist_name, status, admin_notes, youtube_channel_url")
      .eq("id", request_id)
      .maybeSingle();
    if (error) throw error;
    if (!reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const copy = STATUS_COPY[reqRow.status] || {
      label: String(reqRow.status).replace(/_/g, " "),
      heading: "Your OAC request was updated",
      sub: "There is an update on your YouTube Official Artist Channel request.",
    };

    // In-app notification
    await admin.from("notifications").insert({
      user_id: reqRow.user_id,
      type: "oac_status",
      title: `YouTube OAC: ${copy.label}`,
      message: reqRow.admin_notes || copy.sub,
      link: "/artist-hub",
      metadata: { request_id: reqRow.id, status: reqRow.status },
    });

    let emailed = false;
    if (notify_email) {
      const { data: artist } = await admin
        .from("artists")
        .select("email, name")
        .eq("id", reqRow.artist_id)
        .maybeSingle();

      if (artist?.email) {
        const html = brandedEmail({
          preheader: `YouTube OAC status: ${copy.label}`,
          heading: copy.heading,
          subheading: copy.sub,
          bodyHtml: `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0C1A;border:1px solid #2A2340;border-radius:12px;padding:16px;margin-bottom:14px;">
              <tr><td style="color:#A79FC0;font-size:12px;">Artist</td><td align="right" style="color:#F5F3FF;font-size:13px;font-weight:600;">${reqRow.artist_name}</td></tr>
              <tr><td style="color:#A79FC0;font-size:12px;padding-top:8px;">Status</td><td align="right" style="color:#8B5CF6;font-size:13px;font-weight:700;padding-top:8px;">${copy.label.toUpperCase()}</td></tr>
            </table>
            ${reqRow.admin_notes ? `<p style="margin:0 0 8px;color:#A79FC0;font-size:12px;">Message from our team</p><p style="margin:0;padding:14px;background:#0F0C1A;border-left:3px solid #8B5CF6;border-radius:8px;color:#F5F3FF;font-size:14px;">${reqRow.admin_notes}</p>` : ""}
          `,
          ctaLabel: "View request status",
          ctaUrl: "https://artist-hub-symphony.lovable.app/artist-hub",
        });
        await sendBrandedEmail(artist.email, `YouTube OAC update — ${copy.label}`, html);
        emailed = true;
      }
    }

    return new Response(JSON.stringify({ success: true, emailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-oac-status-notification error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
