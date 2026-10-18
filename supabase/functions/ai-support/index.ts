import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const MAX_MESSAGE_LENGTH = 4000;
const CATEGORIES = new Set(["account", "billing", "releases", "technical", "other"]);
const PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Please sign in to use AI Support." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("AI Support is missing required Supabase environment configuration.");
    return json({ error: "AI Support is not configured yet. Please contact support." }, 503);
  }

  // Validate the bearer token using Supabase Auth. Never trust a user ID from the request body.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);

  // Service-role access is kept inside this function. Every user-owned operation below
  // is scoped to the authenticated user ID established above.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "chat";

  if (action === "create_ticket") {
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" ? body.category : "other";
    const priority = typeof body.priority === "string" ? body.priority : "medium";

    if (subject.length < 5 || subject.length > 120) {
      return json({ error: "Subject must be between 5 and 120 characters." }, 400);
    }
    if (description.length < 10 || description.length > 5000) {
      return json({ error: "Description must be between 10 and 5000 characters." }, 400);
    }
    if (!CATEGORIES.has(category)) return json({ error: "Choose a valid ticket category." }, 400);
    if (!PRIORITIES.has(priority)) return json({ error: "Choose a valid ticket priority." }, 400);

    const ticketWindowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentTicketCount, error: ticketRateError } = await admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", ticketWindowStart);
    if (ticketRateError) {
      console.error("AI Support ticket rate check failed:", ticketRateError.message);
      return json({ error: "We couldn't verify ticket limits. Please try again shortly." }, 500);
    }
    if ((recentTicketCount ?? 0) >= 5) {
      return json({ error: "You've created several tickets recently. Please wait a few minutes or continue in the Support Center." }, 429);
    }

    const { data: ticket, error } = await admin
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        description,
        category,
        priority,
      })
      .select("id,subject,status,priority,category,created_at")
      .single();

    if (error || !ticket) {
      console.error("AI Support ticket creation failed:", error?.message);
      return json({ error: "We couldn't create your support ticket. Please try again or use the Support Center." }, 500);
    }
    return json({ ok: true, ticket });
  }

  if (action !== "chat") return json({ error: "Unsupported action." }, 400);

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` }, 400);
  }

  const chatWindowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentChatCount, error: chatRateError } = await admin
    .from("ai_support_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", chatWindowStart);
  if (chatRateError) {
    console.error("AI Support chat rate check failed:", chatRateError.message);
    return json({ error: "We couldn't verify request limits. Please try again shortly." }, 500);
  }
  if ((recentChatCount ?? 0) >= 20) {
    return json({ error: "You've reached the temporary support message limit. Please wait a few minutes or create a support ticket." }, 429);
  }

  let conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  if (conversationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return json({ error: "Invalid conversation ID." }, 400);
  }

  if (conversationId) {
    const { data: conversation, error } = await admin
      .from("ai_support_conversations")
      .select("id,user_id,status")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) {
      console.error("AI Support conversation lookup failed:", error.message);
      return json({ error: "We couldn't load this conversation." }, 500);
    }
    if (!conversation || conversation.user_id !== user.id || conversation.status !== "open") {
      return json({ error: "Conversation not found or no longer available." }, 404);
    }
  } else {
    const title = message.replace(/\s+/g, " ").slice(0, 80) || "New support conversation";
    const { data: conversation, error } = await admin
      .from("ai_support_conversations")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (error || !conversation) {
      console.error("AI Support conversation creation failed:", error?.message);
      return json({ error: "We couldn't start a conversation. Please try again." }, 500);
    }
    conversationId = conversation.id;
  }

  const { error: userMessageError } = await admin.from("ai_support_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: message,
  });
  if (userMessageError) {
    console.error("AI Support message save failed:", userMessageError.message);
    return json({ error: "We couldn't save your message. Please try again." }, 500);
  }

  const { data: articles, error: articlesError } = await admin
    .from("ai_support_articles")
    .select("title,category,body,source_url")
    .eq("published", true)
    .limit(100);
  if (articlesError) {
    console.error("AI Support knowledge lookup failed:", articlesError.message);
    return json({ error: "We couldn't search the Help Center right now. Please create a support ticket." }, 500);
  }

  // A no-API knowledge assistant: normalize common wording, score approved articles,
  // and answer only with content from the MALPINOHdistro knowledge base.
  const normalizedMessage = message.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const synonymGroups: string[][] = [
    ["cover", "artwork", "art", "coverart", "thumbnail", "image", "picture"],
    ["song", "music", "track", "audio", "wav", "mp3", "file", "upload"],
    ["release", "distribute", "distribution", "deliver", "store", "spotify", "apple"],
    ["payment", "payout", "withdraw", "withdrawal", "earnings", "money", "balance"],
    ["account", "login", "sign", "password", "email", "profile"],
    ["team", "role", "viewer", "manager", "admin", "permission", "label"],
    ["status", "pending", "approved", "rejected", "review", "time", "days"],
    ["support", "help", "ticket", "problem", "issue", "contact", "error"],
    ["metadata", "artist", "title", "genre", "credits", "composer", "isrc", "upc"],
  ];
  const stopWords = new Set(["the", "and", "for", "with", "you", "your", "how", "what", "when", "where", "why", "can", "could", "would", "does", "this", "that", "from", "have", "need", "want", "about", "please", "tell", "help", "into", "are", "is", "was", "my", "our", "i", "me", "to", "of", "in", "on", "it", "do", "a", "an"]);
  let previousAssistantMessage = "";
  if (conversationId) {
    const { data: previousMessages } = await admin
      .from("ai_support_messages")
      .select("content")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1);
    previousAssistantMessage = String(previousMessages?.[0]?.content ?? "");
  }
  const isAcknowledgement = /^(ok|okay|thanks|thank you|got it|alright|all right|sure|understood|cool|great)[!.?,\s]*$/i.test(message.trim());
  const tokens = [...new Set(normalizedMessage.split(/\s+/).filter((word) => word.length >= 2 && !stopWords.has(word)))];
  const expandedTerms = new Set(tokens);
  for (const group of synonymGroups) {
    if (group.some((term) => tokens.some((token) => token === term || (token.length > 4 && term.startsWith(token))))) {
      group.forEach((term) => expandedTerms.add(term));
    }
  }

  const rankedArticles = (articles ?? [])
    .map((article) => {
      const title = String(article.title ?? "").toLowerCase();
      const category = String(article.category ?? "").toLowerCase();
      const bodyText = String(article.body ?? "").toLowerCase();
      const searchable = `${title} ${category} ${bodyText}`;
      const score = [...expandedTerms].reduce((total, term) => {
        if (!searchable.includes(term)) return total;
        return total + (title.includes(term) ? 4 : category.includes(term) ? 2 : 1);
      }, 0);
      return { ...article, score };
    })
    .filter((article) => article.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  let reply: string;
  let replySources: { title: string; source_url: string }[] = [];
  const cleanMessage = message.toLowerCase().trim().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ");
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|hiya|yo)[!.?,\s]*$/i.test(message.trim());
  const isStartRelease = /\b(start|create|new|submit|send|upload|distribute|release|put out|drop)\b/i.test(cleanMessage) &&
    /\b(my music|new music|my song|my track|my album|my single|a release|new release|music for release|release my|send.*music|submit.*music|upload.*music|release wizard|my next song|my next track)\b/i.test(cleanMessage);
  const isReleaseTypeAnswer = /^(single|ep|album|an ep|a single|an album|one song|one track|mixtape)$/i.test(cleanMessage) &&
    /single|ep|album|release|music|track/i.test(previousAssistantMessage);
  const isAudioArtworkAnswer = /^(yes|yeah|yep|both|i have them|ready|not yet|no|nope|still working|almost|audio only|artwork only)$/i.test(cleanMessage) &&
    /audio files|cover artwork|audio and.*artwork|finished.*audio/i.test(previousAssistantMessage);
  const isAccountStatement = /\b(account statement|royalty statement|earnings statement|statement of account|transaction statement|download.*statement|request.*statement|generate.*statement|my statement|financial statement)\b/i.test(cleanMessage);
  const isCreditPayment = /\b(credit balance|outstanding balance|account credit|credit on (my|the|their) account|clear.*credit|clear.*balance|clear my credit|pay.*credit|pay.*balance|settle.*balance|settle.*credit|debt on my account|money i owe|amount i owe)\b/i.test(cleanMessage);
  const isSubscriptionPayment = /\b(subscription|subscribe|renewal|renew|membership)\b/i.test(cleanMessage) && /\b(pay|payment|renew|subscribe|expired|plan|checkout|fee|billing)\b/i.test(cleanMessage);
  const isWithdrawalRequest = /\b(withdraw|withdrawal|cash out|payout|take out my earnings)\b/i.test(cleanMessage);
  const isEarningsSummary = /\b(earnings summary|summary of.*earning(s)?|summar(y|ize|ise).*earning(s)?|my account earning(s)?|account earning(s)?|how much.*earned|total earnings|my earnings|earning balance|available balance|pending earnings|royalties earned|income summary)\b/i.test(cleanMessage);
  const isBillingHistory = /\b(payment history|payment receipt|subscription receipt|proof of payment|past payments|billing history|transaction history)\b/i.test(cleanMessage);
  if (isGreeting) {
    reply = "Hi! 👋 Welcome to MALPINOHdistro. I can help you prepare a release, understand audio and artwork requirements, check release guidance, manage team access, and find answers about earnings or your account. What are you working on today?";
  } else if (isStartRelease) {
    reply = "Absolutely — let's get your new music ready for distribution. First, what are you releasing: a single (one track), an EP, or an album? I'll guide you one step at a time. You can start the secure [Release Form](/release-form) whenever you're ready; you don't need to figure out every step at once.";
  } else if (isReleaseTypeAnswer) {
    const releaseKind = /ep/i.test(cleanMessage) ? "EP" : /album|mixtape/i.test(cleanMessage) ? "album" : "single";
    reply = "Great — we'll prepare your " + releaseKind + ". Next, have you finished the audio files and cover artwork, or are you still preparing them? Once I know that, I'll tell you the best next step. You can continue in the [Release Form](/release-form).";
  } else if (isAudioArtworkAnswer) {
    if (/not yet|nope|still working|almost|audio only|artwork only/i.test(cleanMessage)) {
      reply = "No problem — it's better to prepare everything carefully before submission. The release form will show the current audio and artwork requirements. The Help Center's current audio guidance says WAV, 16-bit, 44.1 kHz; please confirm that in the form in case requirements have changed. Which part are you still preparing: the audio, the cover artwork, or both?";
    } else {
      reply = "Great — you're ready to begin entering your release details. Open the [Release Form](/release-form) and start with Album Info: release title and type, artist name, genre, language, credits, and planned release date. If possible, choose a date at least 21 days ahead to allow review and store processing. Tell me when you're on the first step and I'll help with it.";
    }
  } else if (isAcknowledgement && /release form|release wizard|ready to begin|release submission/i.test(previousAssistantMessage)) {
    reply = "Sounds good. Let's take it one step at a time: open the [Release Form](/release-form), then choose your release type and enter the basic release details. What step do you see on your screen right now?";
  } else if (isAcknowledgement) {
    reply = "You're welcome! What would you like to work on next? I can help with release preparation, audio or cover artwork, release status guidance, earnings and withdrawals, account access, or team permissions.";
  } else if (rankedArticles.length > 0 && rankedArticles[0].score >= 2) {
    const best = rankedArticles[0];
    const bodyText = String(best.body ?? "").trim();
    reply = "**" + String(best.title ?? "MALPINOHdistro Help") + "**\n\n" + bodyText + "\n\nIf you tell me what part you're stuck on, I'll help with that specific step. If the issue needs account access or can't be verified here, you can create a support ticket.";
  } else {
    reply = "I don't have a verified answer for that exact question in the current Help Center, and I don't want to guess. Could you tell me a little more about what you're trying to do? I can help with release preparation, audio and artwork, release status guidance, earnings and withdrawals, account access, and team permissions. For private account-specific issues, create a support ticket so the team can check it securely.";
  }


  // Financial actions route users to existing authenticated dashboard pages.
  if (isAccountStatement) {
    reply = "Of course. Open [Earnings & Payments](/earnings) and choose the Statements tab to view available royalty statements or use the statement generator if available for your account. For income, withdrawals, and subscription payment records, open [Transaction History](/transactions). Are you looking for a royalty statement or a full transaction history?";
    replySources = [{ title: "Earnings and royalty statements", source_url: "/earnings" }, { title: "Transaction history", source_url: "/transactions" }];
  } else if (isCreditPayment) {
    reply = "To clear an outstanding account credit, open [Billing & Payments](/billing) and look for Outstanding Credit Balance. If a balance is shown, select Pay Balance to start the secure checkout. Use only the checkout inside MALPINOHdistro, and don't share card details in this chat. If you don't see the balance or payment option, tell me what appears on the page.";
    replySources = [{ title: "Billing and outstanding credit balance", source_url: "/billing" }];
  } else if (isSubscriptionPayment) {
    reply = "You can make or renew a subscription payment from [Billing & Payments](/billing). Check Current Plan first; if renewal is available, use the renewal button. If you need a new or different plan, open [Pricing](/pricing). Follow the in-app checkout and wait for confirmation before trying again to avoid duplicate payments. Are you renewing your current plan or choosing a new one?";
    replySources = [{ title: "Billing and subscription payments", source_url: "/billing" }, { title: "Subscription plans", source_url: "/pricing" }];
  } else if (isWithdrawalRequest) {
    reply = "I can guide you through requesting a withdrawal. Open [Earnings & Payments](/earnings) and choose the Withdraw tab. Review your available balance, any credit deduction, the withdrawal limits, and your payout details before submitting. Chatting with me does not submit the request; wait for the dashboard's success confirmation. If you see an error, tell me the message, but don't share full bank or card details here.";
    replySources = [{ title: "Request a withdrawal", source_url: "/earnings" }];
  } else if (isEarningsSummary) {
    reply = "Your earnings summary is available in [Earnings & Payments](/earnings). The overview shows total earnings, available balance, pending earnings, credit balance, and recent activity. The Statements and Withdraw tabs provide more detail. Please use the signed-in dashboard for the latest amounts; I won't guess your personal figures in chat. Which figure would you like me to explain?";
    replySources = [{ title: "Earnings summary and balances", source_url: "/earnings" }];
  } else if (isBillingHistory) {
    reply = "Review subscription payments and download receipts in [Billing & Payments](/billing). For earnings, withdrawals, and broader transaction activity, open [Transaction History](/transactions). Check the record's status before treating a payment as complete. If a payment is pending or you think you were charged twice, I can help prepare a support request.";
    replySources = [{ title: "Billing and payment receipts", source_url: "/billing" }, { title: "Transaction history", source_url: "/transactions" }];
  }

  const { error: assistantMessageError } = await admin.from("ai_support_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "assistant",
    content: reply,
  });
  if (assistantMessageError) {
    console.error("AI Support assistant message save failed:", assistantMessageError.message);
    return json({ error: "The answer was generated but couldn't be saved. Please try again." }, 500);
  }

  await admin
    .from("ai_support_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  return json({
    ok: true,
    conversationId,
    reply,
    sources: replySources.length ? replySources : isStartRelease
      ? [{ title: "Open the release submission wizard", source_url: "/release-form" }]
      : rankedArticles.map(({ title, source_url }) => ({ title, source_url })),
  });
});
