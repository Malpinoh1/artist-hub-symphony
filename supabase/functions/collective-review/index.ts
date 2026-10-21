import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { sendCollectiveEmail, sendTrackedCollectiveEmail, type CollectiveEmailEvent } from "../_shared/collective-emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "member";

const VALID = new Set(["approved", "rejected", "needs_information", "under_review"]);

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

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await admin.auth.getUser(token);
    const reviewer = authData?.user;
    if (!reviewer) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("user_is_admin", { user_id: reviewer.id });
    if (!isAdmin) return json({ error: "Admin privileges required" }, 403);

    const body = await req.json().catch(() => null);
    const applicationId: string = body?.application_id;
    const status: string = body?.status;
    const note: string | null = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : null;
    if (!applicationId || !VALID.has(status)) return json({ error: "Invalid request" }, 400);

    const { data: app, error: appErr } = await admin
      .from("collective_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app) return json({ error: "Application not found" }, 404);

    const writeReviewAudit = async (reviewedAt: string, previousStatus: string | null, nextStatus: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Audit table is introduced by the accompanying migration.
      const { error: auditError } = await admin.from("collective_audit_logs" as any).upsert({
        event_key: `application:${app.id}:${reviewedAt}`,
        actor_id: reviewer.id,
        action: "application_review",
        target_table: "collective_applications",
        target_id: app.id,
        old_state: previousStatus ? { status: previousStatus } : null,
        new_state: { status: nextStatus, reviewed_at: reviewedAt },
      }, { onConflict: "event_key", ignoreDuplicates: true });
      if (auditError) console.error("Collective application audit write failed", auditError);
    };

    let member: { id: string; handle: string; user_id: string; display_name: string; status: string } | null = null;
    const eventMap: Record<string, CollectiveEmailEvent> = {
      approved: "application_approved",
      rejected: "application_rejected",
      needs_information: "application_needs_information",
    };
    let reviewTimestamp = app.reviewed_at ?? app.created_at ?? new Date().toISOString();

    // A repeated decision is idempotent. Final decisions cannot be silently
    // flipped through this endpoint; rejected applicants may reapply.
    if (app.status === status) {
      if (note !== app.applicant_message && !["approved", "rejected"].includes(status)) {
        reviewTimestamp = new Date().toISOString();
        const { error: noteError } = await admin
          .from("collective_applications")
          .update({
            applicant_message: note ?? app.applicant_message,
            reviewed_at: reviewTimestamp,
            reviewed_by: reviewer.id,
          })
          .eq("id", app.id)
          .eq("status", app.status);
        if (noteError) throw noteError;
        await writeReviewAudit(reviewTimestamp, app.status, app.status);
      }
      if (status === "approved") {
        const { data: existingMember } = await admin
          .from("collective_members")
          .select("id, handle, user_id, display_name, status")
          .eq("application_id", app.id)
          .maybeSingle();
        member = existingMember;
      }
      const event = eventMap[status];
      const emailStatus = event
        ? await sendTrackedCollectiveEmail(admin, {
            event,
            to: app.email,
            name: app.full_name,
            note: app.applicant_message ?? undefined,
            handle: member?.handle,
            applicationId: app.id,
            memberId: member?.id ?? null,
            userId: app.user_id,
            eventKey: `application:${app.id}:${reviewTimestamp}`,
          })
        : "not_required";
      return json({ success: true, status, handle: member?.handle ?? null, already_processed: true, email_status: emailStatus });
    }

    if (["approved", "rejected"].includes(app.status)) {
      return json({ error: "This application already has a final decision. Ask an administrator to use the approved correction process if needed." }, 409);
    }

    if (status === "approved") {
      // Resolve the applicant's platform account
      let userId: string | null = app.user_id;
      if (!userId) {
        const { data: artist } = await admin
          .from("artists").select("id").ilike("email", app.email_normalized).maybeSingle();
        userId = artist?.id ?? null;
      }
      if (!userId) {
        return json({
          error: "This applicant has no MALPINOHDISTRO account yet. Ask them to sign up with this email, then approve.",
        }, 409);
      }

      const { data: already } = await admin
        .from("collective_members").select("*").eq("user_id", userId).maybeSingle();

      if (already) {
        member = already;
      } else {
        const base = slugify(app.full_name);
        let handle = base;
        for (let i = 0; i < 12; i++) {
          const { data: taken } = await admin
            .from("collective_members").select("id").eq("handle", handle).maybeSingle();
          if (!taken) break;
          handle = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        }
        const { data: created, error: mErr } = await admin
          .from("collective_members")
          .insert({
            user_id: userId,
            application_id: app.id,
            handle,
            display_name: app.full_name,
            roles: app.roles,
            status: "active",
          })
          .select("*")
          .single();
        if (mErr) {
          // A concurrent approval may have created the unique member row.
          const { data: concurrentMember } = await admin
            .from("collective_members")
            .select("id, handle, user_id, display_name, status")
            .eq("user_id", userId)
            .maybeSingle();
          if (!concurrentMember) throw mErr;
          member = concurrentMember;
        } else {
          member = created;
        }
      }
    }

    reviewTimestamp = new Date().toISOString();
    const { data: updatedApp, error: updErr } = await admin
      .from("collective_applications")
      .update({
        status,
        applicant_message: note ?? app.applicant_message,
        reviewed_at: reviewTimestamp,
        reviewed_by: reviewer.id,
      })
      .eq("id", app.id)
      .eq("status", app.status)
      .select("id")
      .maybeSingle();
    if (updErr) throw updErr;
    if (!updatedApp) {
      return json({ error: "The application status changed during review. Refresh and try again." }, 409);
    }
    await writeReviewAudit(reviewTimestamp, app.status, status);

    // Applicant email is recorded in the delivery ledger so a retry can resume
    // a failed send without repeating the application decision.
    let emailStatus = "not_required";
    const emailEvent = eventMap[status];
    if (emailEvent) {
      emailStatus = await sendTrackedCollectiveEmail(admin, {
        event: emailEvent,
        to: app.email,
        name: app.full_name,
        note: note ?? undefined,
        handle: member?.handle,
        applicationId: app.id,
        memberId: member?.id ?? null,
        userId: app.user_id,
        eventKey: `application:${app.id}:${reviewTimestamp}`,
      });
    }

    // Referral qualification (server-side only)
    if (status === "approved") {
      const { data: referral } = await admin
        .from("collective_referrals")
        .select("id, referrer_member_id, status")
        .eq("referred_application_id", app.id)
        .maybeSingle();

      if (referral && !["qualified", "active"].includes(referral.status)) {
        await admin
          .from("collective_referrals")
          .update({ status: "qualified", qualified_at: new Date().toISOString() })
          .eq("id", referral.id);

        const { data: refMember } = await admin
          .from("collective_members")
          .select("id, user_id, display_name")
          .eq("id", referral.referrer_member_id)
          .maybeSingle();
        if (refMember) {
          const { data: ru } = await admin.auth.admin.getUserById(refMember.user_id);
          const refEmail = ru?.user?.email;
          if (refEmail) {
            await sendCollectiveEmail(admin, {
              event: "referral_qualified",
              to: refEmail,
              name: refMember.display_name,
              memberId: refMember.id,
            });
          }
        }
      }
    }

    return json({ success: true, status, handle: member?.handle ?? null, email_status: emailStatus });
  } catch (e) {
    console.error("collective-review error", e);
    return json({ error: (e as Error)?.message ?? "Unexpected error" }, 500);
  }
});
