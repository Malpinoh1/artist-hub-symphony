import React, { FormEvent, useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  Ticket,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";



const renderAssistantContent = (content: string): string => {
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  // Normalize escaped Markdown and line breaks before rendering model replies.
  const normalizedContent = content
    .replace(/\\n/g, "\n")
    .replace(/\\\r?\n/g, "\n")
    .replace(/\\\*/g, "*")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")");
  let html = escapeHtml(normalizedContent);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_match, label: string, url: string) => {
    const safeUrl = url.startsWith("/") || /^https?:\/\//i.test(url) ? url : "";
    return safeUrl ? '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : label;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  const lines = html.split(/\n/);
  let inList = false;
  const rendered: string[] = [];
  for (const line of lines) {
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) {
      if (!inList) rendered.push("<ul>");
      inList = true;
      rendered.push("<li>" + item[1] + "</li>");
    } else {
      if (inList) rendered.push("</ul>");
      inList = false;
      if (/^\s*\d+\.\s+/.test(line)) {
        rendered.push("<p>" + line.replace(/^\s*\d+\.\s+/, "• ") + "</p>");
      } else if (line.trim()) {
        rendered.push("<p>" + line + "</p>");
      }
    }
  }
  if (inList) rendered.push("</ul>");
  return DOMPurify.sanitize(rendered.join(""), {
    ALLOWED_TAGS: ["p", "strong", "em", "br", "a", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
};

type Source = { title: string; source_url: string | null };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const starterPrompts = [
  "Help me submit my music for release",
  "How do I prepare a release for distribution?",
  "What artwork and audio files do I need?",
  "How can I check my release status?",
  "I need help with my account",
];

const getInvokeErrorMessage = async (error: unknown, data: any): Promise<string> => {
  if (typeof data?.error === "string" && data.error) return data.error;
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).clone === "function") {
    try {
      const payload = await (context as Response).clone().json();
      if (typeof payload?.error === "string") return payload.error;
    } catch {
      // Fall back to the SDK error message when the response isn't JSON.
    }
  }
  return error instanceof Error ? error.message : "Please try again shortly.";
};

const AISupport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm MALPINOHdistro AI Support. I can help explain platform features, release preparation, and common support questions. If I can't verify an answer, I can help you open a ticket with our support team.",
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    category: "other",
    priority: "medium",
  });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, showTicketForm]);

  const sendMessage = async (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    const content = (prompt ?? input).trim();
    if (!content || sending) return;
    if (content.length > 4000) {
      toast({
        title: "Message too long",
        description: "Please keep each message under 4,000 characters.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-support", {
        body: {
          action: "chat",
          message: content,
          conversationId,
        },
      });
      if (error || !data?.ok || typeof data?.reply !== "string") {
        throw new Error(await getInvokeErrorMessage(error, data) || "AI Support is temporarily unavailable.");
      }

      setConversationId(data.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again or create a support ticket.";
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `I couldn't complete that request. ${message} You can try again or create a support ticket below.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const openTicketForm = () => {
    const recentUserMessages = messages
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => message.content);
    setTicketForm((current) => ({
      ...current,
      subject: current.subject || "AI support follow-up",
      description:
        current.description ||
        (recentUserMessages.length
          ? `Please help me with the following issue:\n\n${recentUserMessages.join("\n\n")}`
          : ""),
    }));
    setShowTicketForm(true);
    setTicketCreated(null);
  };

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (creatingTicket) return;
    setCreatingTicket(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-support", {
        body: {
          action: "create_ticket",
          subject: ticketForm.subject.trim(),
          description: ticketForm.description.trim(),
          category: ticketForm.category,
          priority: ticketForm.priority,
        },
      });
      if (error || !data?.ok || !data?.ticket?.id) {
        throw new Error(await getInvokeErrorMessage(error, data) || "We couldn't create your ticket.");
      }

      setTicketCreated(data.ticket.id);
      setShowTicketForm(false);
      toast({
        title: "Support ticket created",
        description: `Ticket ${data.ticket.id} has been sent to the MALPINOHdistro support team.`,
      });
    } catch (error) {
      toast({
        title: "Ticket not created",
        description: error instanceof Error ? error.message : "Please try again from the Support Center.",
        variant: "destructive",
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to use AI Support</CardTitle>
            <CardDescription>Your account keeps support conversations private.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">AI Support</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get help with MALPINOHdistro and create a ticket when you need our team.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/support"><ArrowLeft className="mr-2 h-4 w-4" /> Support Center</Link>
          </Button>
          <Button variant="outline" onClick={openTicketForm}>
            <Ticket className="mr-2 h-4 w-4" /> Create ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="flex min-h-[640px] flex-col overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary p-2 text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">MALPINOHdistro AI Assistant</CardTitle>
                <CardDescription>Platform guidance and release-preparation help</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col p-0">
            <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 md:max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-card-foreground"
                  }`}>
                    {message.role === "assistant" ? (\n                      <div className="support-message-content break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: renderAssistantContent(message.content) }} />\n                    ) : (\n                      <p className="whitespace-pre-wrap break-words">{message.content}</p>\n                    )}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 border-t border-border/70 pt-2">
                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <BookOpen className="h-3 w-3" /> Help articles
                        </p>
                        <ul className="space-y-1">
                          {message.sources.map((source, index) => (
                            <li key={`${source.title}-${index}`}>
                              {source.source_url?.startsWith("/") ? (
                                <Link className="text-xs underline underline-offset-2" to={source.source_url}>
                                  {source.title}
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">{source.title}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {ticketCreated && (
              <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <div>
                  <p className="font-medium">Ticket submitted successfully</p>
                  <p className="text-muted-foreground">Reference: {ticketCreated}. You can follow up in the Support Center.</p>
                  <Button variant="link" className="h-auto px-0 py-1" asChild><Link to="/support">Open Support Center</Link></Button>
                </div>
              </div>
            )}

            {showTicketForm && (
              <form onSubmit={createTicket} className="mx-4 mb-3 space-y-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">Create a support ticket</h2>
                    <p className="text-xs text-muted-foreground">Our team can follow up if AI Support can't resolve your issue.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowTicketForm(false)}>Cancel</Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-ticket-subject">Subject</Label>
                  <Input id="ai-ticket-subject" required minLength={5} maxLength={120} value={ticketForm.subject}
                    onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-ticket-description">Describe the issue</Label>
                  <Textarea id="ai-ticket-description" required minLength={10} maxLength={5000} rows={4}
                    value={ticketForm.description}
                    onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Include the steps you tried and a release ID if relevant. Don't include passwords or banking credentials." />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={ticketForm.category} onValueChange={(value) => setTicketForm((current) => ({ ...current, category: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="releases">Releases</SelectItem>
                        <SelectItem value="technical">Technical issue</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm((current) => ({ ...current, priority: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={creatingTicket}>
                  {creatingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
                  Submit ticket
                </Button>
              </form>
            )}

            <form onSubmit={(event) => void sendMessage(event)} className="border-t bg-background p-3 md:p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about distribution, releases, or your account…"
                  rows={2}
                  maxLength={4000}
                  className="max-h-40 min-h-12 resize-y"
                  disabled={sending}
                  aria-label="Message AI Support"
                />
                <Button type="submit" size="icon" className="h-12 w-12 shrink-0" disabled={sending || !input.trim()} aria-label="Send message">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Don't send passwords, one-time codes, or private banking details.</p>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Try asking</CardTitle>
              <CardDescription>Choose a common support question to get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {starterPrompts.map((prompt) => (
                <Button key={prompt} type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal py-2.5 text-left"
                  disabled={sending} onClick={() => void sendMessage(undefined, prompt)}>
                  <Sparkles className="mr-2 h-4 w-4 shrink-0 text-primary" />
                  <span>{prompt}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Ticket className="h-4 w-4" /> Need a human?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Create a ticket if the issue involves a specific release, account access, billing, or something the AI cannot verify.</p>
              <Button className="w-full" variant="secondary" onClick={openTicketForm}>
                Create support ticket
              </Button>
              <div className="flex items-start gap-2 text-xs">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>AI Support provides guidance. It does not submit releases or change account settings in this first version.</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default AISupport;
