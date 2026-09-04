import { sendCollectiveEmail } from "./collective-emails.ts";

/**
 * Shared referral attribution used by both the signup-claim flow and the
 * Collective application flow. Idempotent: a given referred email can only
 * ever be attributed to one referrer (enforced by a unique index too).
 */
export async function attributeReferral(
  admin: any,
  opts: {
    referralCode: string;
    referredUserId: string | null;
    referredEmail: string;
    applicationId?: string | null;
    source: string;
  },
): Promise<{ attributed: boolean; reason?: string; referrerName?: string }> {
  const handle = opts.referralCode.trim().toLowerCase();
  const email = opts.referredEmail.trim().toLowerCase();
  if (!handle || !email) return { attributed: false, reason: "invalid_input" };

  const { data: referrer } = await admin
    .from("collective_members")
    .select("id, user_id, display_name")
    .eq("handle", handle)
    .eq("status", "active")
    .maybeSingle();

  if (!referrer) return { attributed: false, reason: "invalid_code" };

  let referrerEmail: string | null = null;
  const { data: ru } = await admin.auth.admin.getUserById(referrer.user_id);
  referrerEmail = ru?.user?.email?.toLowerCase() ?? null;

  if (referrer.user_id === opts.referredUserId || referrerEmail === email) {
    return { attributed: false, reason: "self_referral", referrerName: referrer.display_name };
  }

  // Never overwrite an established attribution.
  const { data: existing } = await admin
    .from("collective_referrals")
    .select("id, referred_user_id, referred_application_id")
    .eq("referred_email_normalized", email)
    .maybeSingle();

  if (existing) {
    // Backfill identifiers on the already-established record only.
    const patch: Record<string, unknown> = {};
    if (!existing.referred_user_id && opts.referredUserId) patch.referred_user_id = opts.referredUserId;
    if (!existing.referred_application_id && opts.applicationId) {
      patch.referred_application_id = opts.applicationId;
    }
    if (Object.keys(patch).length) {
      await admin.from("collective_referrals").update(patch).eq("id", existing.id);
    }
    return { attributed: false, reason: "already_attributed", referrerName: referrer.display_name };
  }

  const { error: insErr } = await admin.from("collective_referrals").insert({
    referrer_member_id: referrer.id,
    referred_user_id: opts.referredUserId,
    referred_email_normalized: email,
    referred_application_id: opts.applicationId ?? null,
    source: opts.source,
    status: "registered",
  });

  if (insErr) {
    // Unique-index race: treat as already attributed, never as a failure.
    console.warn("referral insert skipped", insErr.message);
    return { attributed: false, reason: "already_attributed", referrerName: referrer.display_name };
  }

  if (referrerEmail) {
    await sendCollectiveEmail(admin, {
      event: "referral_new",
      to: referrerEmail,
      name: referrer.display_name,
      memberId: referrer.id,
    });
  }

  return { attributed: true, referrerName: referrer.display_name };
}
