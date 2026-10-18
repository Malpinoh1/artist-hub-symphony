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
  const tokens = [...new Set(normalizedMessage.split(/\s+/).filter((word) => word.length >= 2 && !stopWords.has(word)))];
  const expandedTerms = new Set(tokens);
  for (const group of synonymGroups) {
    if (group.some((term) => tokens.some((token) => token === term || (token.length > 4 && term.startsWith(token)))) {
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
  if (rankedArticles.length > 0 && rankedArticles[0].score >= 2) {
    const best = rankedArticles[0];
    const bodyText = String(best.body ?? "").trim();
    const additional = rankedArticles.length > 1 && rankedArticles[1].score >= rankedArticles[0].score * 0.7
      ? `\n\n**Related guidance — ${rankedArticles[1].title}**\n${String(rankedArticles[1].body ?? "").trim()}`
      : "";
    reply = `**${best.title}**\n\n${bodyText}${additional}\n\nIf this doesn't answer your question, you can create a support ticket and our team can follow up.`;
  } else {
    reply = "I couldn't find a confirmed answer to that in the MALPINOHdistro Help Center yet, and I don't want to guess. Try asking about release preparation, audio or artwork requirements, release status, earnings and withdrawals, account access, or team permissions. If your question is account-specific or urgent, please create a support ticket so our team can help.";
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
    sources: rankedArticles.map(({ title, source_url }) => ({ title, source_url })),
  });
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
    sources: rankedArticles.map(({ title, source_url }) => ({ title, source_url })),
  });
});
