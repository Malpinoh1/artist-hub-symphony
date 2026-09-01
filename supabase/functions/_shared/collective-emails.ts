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
  | "referral_qualified";

interface BuildArgs {
  event: CollectiveEmailEvent;
  name: string;
  note?: string;
  handle?: string;
}

export function buildCollectiveEmail({ event, name, note, handle }: BuildArgs) {
  const first = (name || "there").split(" ")[0];

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
            <p style="background:rgba(255,255,255,.05);padding:12px 14px;border-radius:10px;font-weight:700;">${SITE}/collective/${handle ?? ""}</p>
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
  }
}

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
