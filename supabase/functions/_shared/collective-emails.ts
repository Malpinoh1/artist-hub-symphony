import { brandedEmail, sendBrandedEmail } from "./branding.ts";

const SITE = "https://malpinohdistro.com.ng";
const PROGRAMME = "MDISTRO COLLECTIVE";

const tag = (text: string) =>
  `<div style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(139,92,246,.18);color:#C4B5FD;font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:14px;">${text}</div>`;

export type CollectiveEmailEvent =
  | "application_received"
  | "application_approved"
  | "application_rejected"
  | "application_needs_information"
  | "referral_new"
  | "referral_qualified"
  | "contribution_accepted"
  | "contribution_declined"
  | "contribution_needs_changes"
  | "opportunity_new"
  | "announcement"
  | "opportunity_application_under_review"
  | "opportunity_application_accepted"
  | "opportunity_application_declined";

interface BuildArgs {
  event: CollectiveEmailEvent;
  name: string;
  note?: string;
  handle?: string;
  /** Opportunity / announcement title, where relevant. */
  title?: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function buildCollectiveEmail({ event, name, note: rawNote, handle: rawHandle, title }: BuildArgs) {
  const first = escapeHtml((name || "there").split(" ")[0]);
  const note = rawNote ? escapeHtml(rawNote) : undefined;
  const titleHtml = title ? escapeHtml(title) : undefined;
  const safeHandle = escapeHtml(rawHandle ?? "");

  switch (event) {
    case "application_received":
      return {
        subject: `We received your ${PROGRAMME} application`,
        html: brandedEmail({
          preheader: "Your application is now in review.",
          heading: `Thanks for applying, ${first}`,
          subheading: "Your application is in the review queue.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>MDISTRO COLLECTIVE is a voluntary community of artists, fans and music professionals helping grow the independent music ecosystem.</p>
            <p>Our team reviews every application manually. You can track your status any time from your Collective Center.</p>`,
          ctaLabel: "View application status",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "application_approved":
      return {
        subject: `Welcome to ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Your membership is active.",
          heading: `You're in, ${first}`,
          subheading: "Your Collective membership is now active.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>Your application has been approved. Your Collective Center is now unlocked, including your personal Collective link:</p>
            <p style="background:rgba(255,255,255,.05);padding:12px 14px;border-radius:10px;font-weight:700;">${SITE}/collective?ref=${safeHandle}</p>
            <p>Share it with artists, fans and industry people you think belong here. Participation is entirely voluntary.</p>`,
          ctaLabel: "Open Collective Center",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "application_rejected":
      return {
        subject: `Update on your ${PROGRAMME} application`,
        html: brandedEmail({
          preheader: "An update about your application.",
          heading: `Thank you for your interest, ${first}`,
          subheading: "We are not moving forward at this time.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>After review, we are unable to approve your MDISTRO COLLECTIVE application right now.</p>
            ${note ? `<p><strong>Reviewer note:</strong> ${note}</p>` : ""}
            <p>You are welcome to apply again in the future as the programme grows.</p>`,
          ctaLabel: "Explore MALPINOHDISTRO",
          ctaUrl: `${SITE}/`,
        }),
      };
    case "application_needs_information":
      return {
        subject: `We need a little more information — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Action needed on your application.",
          heading: `One more step, ${first}`,
          subheading: "We need additional information to complete your review.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>Our reviewers need a bit more detail before making a decision.</p>
            ${note ? `<p><strong>What we need:</strong> ${note}</p>` : ""}
            <p>Reply to this email or reach out through our contact page with the requested details.</p>`,
          ctaLabel: "View application status",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "referral_new":
      return {
        subject: `New referral activity — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Someone applied through your Collective link.",
          heading: `Nice work, ${first}`,
          subheading: "Someone applied using your Collective link.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>A new application was submitted through your Collective link. We keep applicant details private, so you'll only see counts in your Collective Center.</p>`,
          ctaLabel: "Open Collective Center",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "referral_qualified":
      return {
        subject: `A referral just qualified — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "One of your referrals qualified.",
          heading: `A referral qualified, ${first}`,
          subheading: "One of your referrals has been approved into the Collective.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>One of the people who joined through your Collective link has been approved. Your qualified referral count has been updated.</p>
            <p>Rewards are not part of this phase — this is recognition of your contribution to the community.</p>`,
          ctaLabel: "Open Collective Center",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "contribution_accepted":
      return {
        subject: `Your contribution was accepted — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Your contribution has been accepted.",
          heading: `Thank you, ${first}`,
          subheading: "Your contribution has been accepted.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>Your contribution${args_title(titleHtml)} has been reviewed and accepted. Thank you for helping grow the independent music ecosystem.</p>
            ${note ? `<p><strong>Reviewer note:</strong> ${note}</p>` : ""}`,
          ctaLabel: "View my contributions",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "contribution_declined":
      return {
        subject: `Update on your contribution — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "An update on your contribution.",
          heading: `Thanks for taking part, ${first}`,
          subheading: "This contribution was not accepted.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>After review, your contribution${args_title(titleHtml)} was not accepted this time.</p>
            ${note ? `<p><strong>Reviewer note:</strong> ${note}</p>` : ""}
            <p>Plenty of other opportunities are open in your Collective Center.</p>`,
          ctaLabel: "Browse opportunities",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "contribution_needs_changes":
      return {
        subject: `Changes requested on your contribution — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Action needed on your contribution.",
          heading: `One more step, ${first}`,
          subheading: "Our reviewers asked for some changes.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>Your contribution${args_title(titleHtml)} needs a few changes before it can be accepted.</p>
            ${note ? `<p><strong>What to change:</strong> ${note}</p>` : ""}`,
          ctaLabel: "Update my contribution",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "opportunity_new":
      return {
        subject: `New Collective opportunity: ${title ?? "open now"}`,
        html: brandedEmail({
          preheader: "A new way to contribute is open.",
          heading: `New opportunity, ${first}`,
          subheading: titleHtml ?? "A new opportunity is open.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>A new contribution opportunity is now open to Collective members. Participation is voluntary and unpaid.</p>
            ${note ? `<p>${note}</p>` : ""}`,
          ctaLabel: "View opportunity",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "opportunity_application_under_review":
      return {
        subject: `Your opportunity application is under review — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Your expression of interest is being reviewed.",
          heading: `Thanks for applying, ${first}`,
          subheading: titleHtml ?? "Your opportunity application is under review.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>Your expression of interest has moved into review. You can check its status from your Collective Center.</p>
            ${note ? `<p><strong>Reviewer note:</strong> ${note}</p>` : ""}
          `,
          ctaLabel: "View application status",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "opportunity_application_accepted":
      return {
        subject: `Your opportunity application was accepted — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "Your expression of interest was accepted.",
          heading: `Good news, ${first}`,
          subheading: titleHtml ?? "Your opportunity application was accepted.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>Your expression of interest was accepted. Please review the opportunity details and any next steps in your Collective Center.</p>
            ${note ? `<p><strong>Reviewer note:</strong> ${note}</p>` : ""}
          `,
          ctaLabel: "View opportunity",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "opportunity_application_declined":
      return {
        subject: `Update on your opportunity application — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "An update on your expression of interest.",
          heading: `Thanks for applying, ${first}`,
          subheading: titleHtml ?? "Your opportunity application was not accepted.",
          bodyHtml: `${tag(PROGRAMME)}
            <p>After review, your expression of interest was not accepted this time.</p>
            ${note ? `<p><strong>Reviewer note:</strong> ${note}</p>` : ""}
            <p>Other opportunities may be available in your Collective Center.</p>
          `,
          ctaLabel: "Browse opportunities",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
    case "announcement":
      return {
        subject: `${title ?? "Collective update"} — ${PROGRAMME}`,
        html: brandedEmail({
          preheader: "A new Collective update.",
          heading: titleHtml ?? "Collective update",
          subheading: `An update for the community, ${first}`,
          bodyHtml: `${tag(PROGRAMME)}
            ${note ? `<p>${note}</p>` : ""}`,
          ctaLabel: "Read in Collective Center",
          ctaUrl: `${SITE}/collective/center`,
        }),
      };
  }
}

const args_title = (title?: string) => (title ? ` for “${title}”` : "");

/** Sends a Collective email and always writes an audit row. */
export async function sendCollectiveEmail(
  admin: any,
  args: BuildArgs & { to: string; applicationId?: string | null; memberId?: string | null },
) {
  const { subject, html } = buildCollectiveEmail(args);
  let status = "sent";
  let error_message: string | null = null;
  try {
    await sendBrandedEmail(args.to, subject, html);
  } catch (e) {
    status = "failed";
    error_message = String((e as Error)?.message ?? e).slice(0, 500);
    console.error("Collective email failed", args.event, error_message);
  }
  await admin.from("collective_email_events").insert({
    event_type: args.event,
    recipient: args.to,
    application_id: args.applicationId ?? null,
    member_id: args.memberId ?? null,
    status,
    error_message,
  });
  return status === "sent";
}


export type TrackedEmailStatus = "sent" | "failed" | "in_progress" | "queue_failed" | "no_email";

/**
 * Idempotent, retryable delivery wrapper for core Collective email events.
 * The event key must represent one business decision/publication version.
 */
export async function sendTrackedCollectiveEmail(
  admin: any,
  args: BuildArgs & {
    to: string;
    applicationId?: string | null;
    memberId?: string | null;
    userId: string;
    eventKey: string;
  },
): Promise<TrackedEmailStatus> {
  const recipient = args.to.trim();
  if (!recipient) return "no_email";
  const { userId, eventKey, ...emailArgs } = args;

  const { error: queueError } = await admin
    .from("collective_notification_deliveries")
    .upsert({
      event_key: eventKey,
      user_id: userId,
      member_id: args.memberId ?? null,
      recipient,
      event_type: args.event,
      status: "pending",
    }, { onConflict: "event_key,user_id", ignoreDuplicates: true });
  if (queueError) {
    console.error("Collective email queue failed", queueError);
    return "queue_failed";
  }

  const { data: delivery, error: deliveryError } = await admin
    .from("collective_notification_deliveries")
    .select("id, recipient, event_type, status, attempts, updated_at, member_id")
    .eq("event_key", eventKey)
    .eq("user_id", userId)
    .maybeSingle();
  if (deliveryError || !delivery) return "queue_failed";
  if (delivery.status === "sent") return "sent";

  let claimableStatus = delivery.status;
  if (delivery.status === "sending") {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    if (new Date(delivery.updated_at).getTime() > Date.now() - 10 * 60 * 1000) return "in_progress";
    const { data: reset } = await admin
      .from("collective_notification_deliveries")
      .update({ status: "failed", updated_at: new Date().toISOString(), last_error: "Recovered stale in-flight delivery" })
      .eq("id", delivery.id)
      .eq("status", "sending")
      .lt("updated_at", staleBefore)
      .select("id")
      .maybeSingle();
    if (!reset) return "in_progress";
    claimableStatus = "failed";
  }
  if (!["pending", "failed"].includes(claimableStatus)) return "in_progress";

  const { data: claimed } = await admin
    .from("collective_notification_deliveries")
    .update({
      status: "sending",
      attempts: delivery.attempts + 1,
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", delivery.id)
    .eq("status", claimableStatus)
    .select("id, recipient, event_type, member_id")
    .maybeSingle();
  if (!claimed) return "in_progress";

  let sent = false;
  try {
    sent = await sendCollectiveEmail(admin, {
      ...emailArgs,
      event: claimed.event_type as CollectiveEmailEvent,
      to: claimed.recipient,
      memberId: claimed.member_id ?? undefined,
    });
  } catch (error) {
    console.error("Collective tracked email failed", error);
  }

  const now = new Date().toISOString();
  const { error: finishError } = await admin
    .from("collective_notification_deliveries")
    .update({
      status: sent ? "sent" : "failed",
      last_error: sent ? null : "Email provider did not confirm delivery",
      sent_at: sent ? now : null,
      updated_at: now,
    })
    .eq("id", claimed.id)
    .eq("status", "sending");

  return sent && !finishError ? "sent" : "failed";
}
