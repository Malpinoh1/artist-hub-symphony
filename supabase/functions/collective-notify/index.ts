import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { sendCollectiveEmail } from "../_shared/collective-emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const REVIEW_STATUSES = new Set(["under_review", "accepted", "declined", "needs_changes"]);

const EMAIL_FOR_STATUS: Record<string, string | null> = {
  accepted: "contribution_accepted",
  declined: "contribution_declined",
  needs_changes: "contribution_needs_changes",
  under_review: null,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: authData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const actor = authData?.user;
    if (!actor) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("user_is_admin", { user_id: actor.id });
    if (!isAdmin) return json({ error: "Admin privileges required" }, 403);

    const body = await req.json().catch(() => null);
    const action: string = body?.action;

    // ---------- Review a contribution submission ----------
    if (action === "review_submission") {
      const submissionId: string = body?.submission_id;
      const status: string = body?.status;
      const notes: string | null =
        typeof body?.reviewer_notes === "string" ? body.reviewer_notes.trim().slice(0, 2000) : null;
      if (!submissionId || !REVIEW_STATUSES.has(status)) return json({ error: "Invalid request" }, 400);

      const { data: sub, error: subErr } = await admin
        .from("collective_submissions")
        .select("id, user_id, member_id, opportunity_id")
        .eq("id", submissionId)
        .maybeSingle();
      if (subErr || !sub) return json({ error: "Submission not found" }, 404);

      const { error: updErr } = await admin
        .from("collective_submissions")
        .update({
          status,
          reviewer_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: actor.id,
        })
        .eq("id", submissionId);
      if (updErr) return json({ error: updErr.message }, 400);

      const [{ data: member }, { data: opp }] = await Promise.all([
        admin.from("collective_members").select("id, display_name, user_id").eq("id", sub.member_id).maybeSingle(),
        admin.from("collective_opportunities").select("title").eq("id", sub.opportunity_id).maybeSingle(),
      ]);

      await admin.from("notifications").insert({
        user_id: sub.user_id,
        type: "collective_contribution",
        title:
          status === "accepted"
            ? "Contribution accepted"
            : status === "declined"
              ? "Contribution not accepted"
              : status === "needs_changes"
                ? "Contribution needs changes"
                : "Contribution under review",
        message: `${opp?.title ?? "Your contribution"}${notes ? ` — ${notes}` : ""}`,
        link: "/collective/center",
        metadata: { submission_id: submissionId, status },
      });

      const event = EMAIL_FOR_STATUS[status];
      if (event) {
        const { data: authUser } = await admin.auth.admin.getUserById(sub.user_id);
        const email = authUser?.user?.email;
        if (email) {
          await sendCollectiveEmail(admin, {
            event: event as any,
            name: member?.display_name ?? "there",
            note: notes ?? undefined,
            title: opp?.title ?? undefined,
            to: email,
            memberId: member?.id ?? null,
          });
        }
      }

      return json({ ok: true });
    }

    // ---------- Broadcast a published announcement or opportunity ----------
    if (action === "broadcast") {
      const kind: string = body?.kind; // 'announcement' | 'opportunity'
      const id: string = body?.id;
      const withEmail = body?.email === true;
      if (!id || !["announcement", "opportunity"].includes(kind)) return json({ error: "Invalid request" }, 400);

      let title = "";
      let summary = "";
      if (kind === "announcement") {
        const { data } = await admin
          .from("collective_announcements")
          .select("title, content, status")
          .eq("id", id)
          .maybeSingle();
        if (!data || data.status !== "published") return json({ error: "Announcement is not published" }, 400);
        title = data.title;
        summary = String(data.content ?? "").slice(0, 400);
      } else {
        const { data } = await admin
          .from("collective_opportunities")
          .select("title, description, status")
          .eq("id", id)
          .maybeSingle();
        if (!data || data.status !== "published") return json({ error: "Opportunity is not published" }, 400);
        title = data.title;
        summary = String(data.description ?? "").slice(0, 400);
      }

      const { data: members } = await admin
        .from("collective_members")
        .select("id, user_id, display_name")
        .eq("status", "active");

      const recipients = members ?? [];
      if (recipients.length > 0) {
        await admin.from("notifications").insert(
          recipients.map((m) => ({
            user_id: m.user_id,
            type: kind === "announcement" ? "collective_announcement" : "collective_opportunity",
            title: kind === "announcement" ? `Collective update: ${title}` : `New opportunity: ${title}`,
            message: summary,
            link: "/collective/center",
            metadata: { [`${kind}_id`]: id },
          })),
        );
      }

      let emailed = 0;
      if (withEmail) {
        for (const m of recipients) {
          const { data: authUser } = await admin.auth.admin.getUserById(m.user_id);
          const email = authUser?.user?.email;
          if (!email) continue;
          const ok = await sendCollectiveEmail(admin, {
            event: kind === "announcement" ? "announcement" : "opportunity_new",
            name: m.display_name ?? "there",
            title,
            note: summary,
            to: email,
            memberId: m.id,
          });
          if (ok) emailed += 1;
        }
      }

      return json({ ok: true, notified: recipients.length, emailed });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("collective-notify error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
