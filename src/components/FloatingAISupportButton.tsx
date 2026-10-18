import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, ChevronDown, ExternalLink, Loader2, MessageCircle, Plus, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const supportHistoryClient = supabase as any;

type MiniMessage = { id: string; role: "user" | "assistant"; content: string };
const welcomeMessage: MiniMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm MALPINOHdistro AI Support. Ask me about releases, distribution, or your account.",
};

const FloatingAISupportButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MiniMessage[]>([welcomeMessage]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const historyAttemptedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (previousUserIdRef.current === nextUserId) return;
    previousUserIdRef.current = nextUserId;
    historyAttemptedRef.current = false;
    setConversationId(null);
    setMessages([welcomeMessage]);
    setInput("");
    setOpen(false);
  }, [user?.id]);

  useEffect(() => {
    if (!open || !user || conversationId || historyAttemptedRef.current) return;
    let cancelled = false;
    historyAttemptedRef.current = true;
    setLoadingHistory(true);
    void (async () => {
      try {
        const { data: conversation } = await supportHistoryClient
          .from("ai_support_conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!conversation || cancelled) return;
        const { data: savedMessages } = await supportHistoryClient
          .from("ai_support_messages")
          .select("id,role,content")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
          .limit(80);
        if (cancelled) return;
        setConversationId(conversation.id);
        if (savedMessages?.length) {
          setMessages(savedMessages.map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.content,
          })));
        }
      } catch {
        // History lookup must not prevent the support widget from opening.
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user, conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, open]);

  // Keep the launcher visible on public pages too; saved-history loading remains account-aware.
  if (location.pathname.startsWith("/ai-support")) return null;

  const startNewChat = () => {
    historyAttemptedRef.current = true;
    setConversationId(null);
    setMessages([welcomeMessage]);
    setInput("");
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    if (content.length > 4000) {
      toast({ title: "Message too long", description: "Please keep messages under 4,000 characters.", variant: "destructive" });
      return;
    }
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content }]);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-support", {
        body: { action: "chat", message: content, conversationId },
      });
      if (error || !data?.ok || typeof data?.reply !== "string") {
        throw new Error(data?.error || error?.message || "AI Support is temporarily unavailable.");
      }
      setConversationId(data.conversationId);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: data.reply }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Please try again.";
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "assistant", content: `I couldn't complete that request. ${detail} You can continue in the full Support chat.` }]);
    } finally {
      setSending(false);
    }
  };

  const openFullChat = () => {
    setOpen(false);
    navigate(conversationId ? `/ai-support?conversationId=${encodeURIComponent(conversationId)}` : "/ai-support");
  };

  return (
    <>
      {open && (
        <section aria-label="MALPINOHdistro AI Support chat"
          className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] right-3 z-[70] flex h-[min(680px,calc(100dvh-9rem))] max-h-[calc(100dvh-8rem)] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:bottom-24 sm:right-6">
          <header className="flex items-center justify-between gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15"><Sparkles className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">MALPINOHdistro Support</p>
                <p className="text-xs opacity-80">AI assistant · Your chats are saved</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={startNewChat} title="New chat" aria-label="Start a new chat"><Plus className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={openFullChat} title="Open full chat page" aria-label="Open full chat page"><ExternalLink className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={() => setOpen(false)} title="Minimize chat" aria-label="Minimize chat"><ChevronDown className="h-4 w-4" /></Button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {loadingHistory && <p className="text-center text-xs text-muted-foreground">Loading your recent chat…</p>}
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2.5 text-sm leading-5 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {message.role === "assistant" && <Bot className="mb-1 inline h-4 w-4 text-primary" />}
                  {message.content}
                </div>
              </div>
            ))}
            {messages.length >= 10 && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">This is a longer conversation. Open the full chat to keep going with more space and your saved history.</p><Button type="button" size="sm" className="mt-2 w-full" onClick={openFullChat}>Continue in full chat <ExternalLink className="ml-2 h-3.5 w-3.5" /></Button></div>}
            {sending && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</p>}
            <div ref={endRef} />
          </div>
          <div className="border-t p-3">
            <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2">
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a quick question…" rows={2} maxLength={4000} disabled={sending} className="max-h-28 min-h-11 resize-none" aria-label="Message AI Support" />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !input.trim()} aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
            </form>
            <button type="button" onClick={openFullChat} className="mt-2 w-full text-center text-xs font-medium text-primary hover:underline">Open full chat &amp; conversation history</button>
          </div>
        </section>
      )}
      <Button type="button" onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close AI Support chat" : "Open MALPINOHdistro AI Support"}
        title="Need help? Chat with AI Support"
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] right-4 z-[60] inline-flex min-h-12 items-center gap-2.5 rounded-full px-4 py-3 text-sm font-semibold shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] sm:bottom-6 sm:right-6 sm:px-5">
        {open ? <X className="h-5 w-5" /> : <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15"><MessageCircle className="h-4 w-4" /><Sparkles className="absolute -right-1 -top-1 h-3 w-3" /></span>}
        <span>{open ? "Close chat" : "AI Support"}</span>
      </Button>
    </>
  );
};

export default FloatingAISupportButton;
