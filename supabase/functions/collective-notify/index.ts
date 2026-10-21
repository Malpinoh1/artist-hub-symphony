import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { sendCollectiveEmail, type CollectiveEmailEvent } from "../_shared/collective-emails.ts";

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
        .select("id, user_id, member_id, opportunity_id, status, reviewer_notes")
        .eq("id", submissionId)
        .maybeSingle();
      if (subErr || !sub) return json({ error: "Submission not found" }, 404);

      // Make repeated review requests safe. A duplicate click or client retry
      // must not send another notification/email for the same status decision.
      if (sub.status === status) {
        if ((sub.reviewer_notes ?? null) !== notes) {
          const { error: noteErr } = await admin
            .from("collective_submissions")
            .update({
              reviewer_notes: notes,
              reviewed_at: new Date().toISOString(),
              reviewed_by: actor.id,
            })
            .eq("id", submissionId)
            .eq("status", sub.status);
          if (noteErr) return json({ error: "Could not update reviewer note" }, 400);
        }
        return json({ ok: true, already_processed: true });
      }

      const allowedTransitions: Record<string, string[]> = {
        submitted: ["under_review", "accepted", "declined", "needs_changes"],
        under_review: ["accepted", "declined", "needs_changes"],
        needs_changes: ["under_review", "accepted", "declined"],
        accepted: [],
        declined: [],
      };
      if (!(allowedTransitions[sub.status] ?? []).includes(status)) {
        return json({ error: "This submission has already been reviewed or its status changed. Refresh and try again." }, 409);
      }

      // Compare-and-set the previous status to avoid two concurrent reviewers
      // both generating notifications for competing decisions.
      const reviewTimestamp = new Date().toISOString();
      const { data: updated, error: updErr } = await admin
        .from("collective_submissions")
        .update({
          status,
          reviewer_notes: notes,
          reviewed_at: reviewTimestamp,
          reviewed_by: actor.id,
        })
        .eq("id", submissionId)
        .eq("status", sub.status)
        .select("id")
        .maybeSingle();
      if (updErr) return json({ error: "Could not update submission status" }, 400);
      if (!updated) return json({ error: "Submission status changed while you were reviewing it. Refresh and try again." }, 409);

      // Record the reviewer and status transition without copying private submission text.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Audit table is introduced by the accompanying migration.
      const { error: auditError } = await admin.from("collective_audit_logs" as any).upsert({
        event_key: `submission:${submissionId}:${reviewTimestamp}`,
        actor_id: actor.id,
        action: "submission_review",
        target_table: "collective_submissions",
        target_id: submissionId,
        old_state: { status: sub.status },
        new_state: { status, reviewed_at: reviewTimestamp },
      }, { onConflict: "event_key", ignoreDuplicates: true });
      if (auditError) console.error("Collective submission audit write failed", auditError);

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
            event: event as CollectiveEmailEvent,
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
      const notificationType = kind === "announcement" ? "collective_announcement" : "collective_opportunity";
      const metadataFilter = { [`${kind}_id`]: id };
      const { data: existingNotifications, error: existingError } = await admin
        .from("notifications")
        .select("user_id")
        .eq("type", notificationType)
        .contains("metadata", metadataFilter);
      if (existingError) return json({ error: "Could not check existing notifications" }, 500);

      const alreadyNotified = new Set((existingNotifications ?? []).map((row: { user_id: string }) => row.user_id));
      const pendingRecipients = recipients.filter((member) => !alreadyNotified.has(member.user_id));
      if (pendingRecipients.length > 0) {
        const { error: notificationError } = await admin.from("notifications").insert(
          pendingRecipients.map((m) => ({
            user_id: m.user_id,
            type: notificationType,
            title: kind === "announcement" ? `Collective update: ${title}` : `New opportunity: ${title}`,
            message: summary,
            link: "/collective/center",
            metadata: metadataFilter,
          })),
        );
        if (notificationError) return json({ error: "Could not create member notifications" }, 500);
      }

      let emailed = 0;
      let emailFailed = 0;
      if (withEmail) {
        const eventKey = `${kind}:${id}`;
        const eventType = kind === "announcement" ? "announcement" : "opportunity_new";
        const emailTargets: Array<{ user_id: string; member_id: string; recipient: string }> = [];
        for (const member of recipients) {
          const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
          const recipient = authUser?.user?.email?.trim();
          if (recipient) emailTargets.push({ user_id: member.user_id, member_id: member.id, recipient });
        }

        // Unique (event_key, user_id) records make repeated broadcasts safe to
        // retry. Sent deliveries are skipped; failed or stale in-flight rows can
        // be retried without resending successful deliveries.
        const emailTargetIds = new Set(emailTargets.map((target) => target.user_id));
        if (emailTargets.length > 0) {
          const { error: queueError } = await admin
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This migration adds the table before generated client types are refreshed.
            .from("collective_notification_deliveries" as any)
            .upsert(
              emailTargets.map((target) => ({
                event_key: eventKey,
                user_id: target.user_id,
                member_id: target.member_id,
                recipient: target.recipient,
                event_type: eventType,
                status: "pending",
              })),
              { onConflict: "event_key,user_id", ignoreDuplicates: true },
            );
          if (queueError) return json({ error: "Could not queue email deliveries" }, 500);
        }

        const { data: deliveries, error: deliveryError } = await admin
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This migration adds the table before generated client types are refreshed.
          .from("collective_notification_deliveries" as any)
          .select("id, user_id, member_id, recipient, event_type, status, attempts, updated_at")
          .eq("event_key", eventKey);
        if (deliveryError) return json({ error: "Could not load email delivery state" }, 500);

        for (const delivery of (deliveries ?? []) as Array<{
          id: string; user_id: string; member_id: string | null; recipient: string;
          event_type: string; status: string; attempts: number; updated_at: string;
        }>) {
          if (delivery.status === "sent") continue;
          if (!emailTargetIds.has(delivery.user_id)) continue;

          let claimableStatus = delivery.status;
          if (delivery.status === "sending") {
            const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            if (new Date(delivery.updated_at).getTime() > Date.now() - 10 * 60 * 1000) continue;
            const { data: reset } = await admin
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This migration adds the table before generated client types are refreshed.
              .from("collective_notification_deliveries" as any)
              .update({ status: "failed", updated_at: new Date().toISOString(), last_error: "Recovered stale in-flight delivery" })
              .eq("id", delivery.id)
              .eq("status", "sending")
              .lt("updated_at", staleBefore)
              .select("id")
              .maybeSingle();
            if (!reset) continue;
            claimableStatus = "failed";
          }
          if (!["pending", "failed"].includes(claimableStatus)) continue;

          const { data: claimed, error: claimError } = await admin
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This migration adds the table before generated client types are refreshed.
            .from("collective_notification_deliveries" as any)
            .update({
              status: "sending",
              attempts: delivery.attempts + 1,
              updated_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("id", delivery.id)
            .eq("status", claimableStatus)
            .select("id, user_id, member_id, recipient, event_type")
            .maybeSingle();
          if (claimError || !claimed) continue;

          const member = recipients.find((candidate) => candidate.user_id === claimed.user_id);
          let sent = false;
          try {
            sent = await sendCollectiveEmail(admin, {
              event: claimed.event_type as CollectiveEmailEvent,
              name: member?.display_name ?? "there",
              title,
              note: summary,
              to: claimed.recipient,
              memberId: claimed.member_id ?? undefined,
            });
          } catch (emailError) {
            console.error("Collective broadcast email failed", emailError);
          }

          const now = new Date().toISOString();
          const { error: finishError } = await admin
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This migration adds the table before generated client types are refreshed.
            .from("collective_notification_deliveries" as any)
            .update({
              status: sent ? "sent" : "failed",
              last_error: sent ? null : "Email provider did not confirm delivery",
              sent_at: sent ? now : null,
              updated_at: now,
            })
            .eq("id", claimed.id)
            .eq("status", "sending");

          if (sent && !finishError) emailed += 1;
          else emailFailed += 1;
        }
      }

      // Record the broadcast action separately from the per-recipient delivery ledger.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Audit table is introduced by the accompanying migration.
      const { error: broadcastAuditError } = await admin.from("collective_audit_logs" as any).insert({
        actor_id: actor.id,
        action: "broadcast",
        target_table: kind === "announcement" ? "collective_announcements" : "collective_opportunities",
        target_id: id,
        new_state: { kind, notified: pendingRecipients.length, emailed, email_failed: emailFailed },
      });
      if (broadcastAuditError) console.error("Collective broadcast audit write failed", broadcastAuditError);

      return json({
        ok: true,
        notified: pendingRecipients.length,
        already_notified: alreadyNotified.size,
        emailed,
        email_failed: emailFailed,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("collective-notify error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
