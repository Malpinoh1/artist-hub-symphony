import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
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

const renderMiniContent = (content: string): ReactNode => {
  const normalized = content
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\+\r?\n/g, "\n")
    .replace(/\\+([*_[\]()])/g, "$1")
    .replace(/^\s*svg(?=[A-Z])/i, "")
    .trim();

  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\((?:https?:\/\/[^)\s]+|\/[^)\s]*)\))/g).filter(Boolean);
    return parts.map((part, index) => {
      const key = keyPrefix + "-" + index;
      const bold = part.match(/^\*\*(.+)\*\*$/);
      if (bold) return <strong key={key} className="font-semibold">{bold[1]}</strong>;
      const italic = part.match(/^\*([^*]+)\*$/);
      if (italic) return <em key={key}>{italic[1]}</em>;
      const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)$/);
      if (link) {
        return link[2].startsWith("/")
          ? <a key={key} href={link[2]} className="font-medium text-primary underline underline-offset-2">{link[1]}</a>
          : <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">{link[1]}</a>;
      }
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  };

  return <div className="space-y-2">
    {normalized.split("\n").map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={"line-" + index} className="h-1" />;
      const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      const unordered = trimmed.match(/^[-*]\s+(.+)$/);
      if (ordered) {
        return <div key={"line-" + index} className="flex items-start gap-2">
          <span className="font-semibold text-primary">{ordered[1]}.</span>
          <span className="min-w-0 flex-1">{renderInline(ordered[2], "ordered-" + index)}</span>
        </div>;
      }
      if (unordered) {
        return <div key={"line-" + index} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <span className="min-w-0 flex-1">{renderInline(unordered[1], "unordered-" + index)}</span>
        </div>;
      }
      return <p key={"line-" + index}>{renderInline(trimmed, "text-" + index)}</p>;
    })}
  </div>;
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
  const [pendingSettingsPermission, setPendingSettingsPermission] = useState(false);
  const [settingsAccessGranted, setSettingsAccessGranted] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsValues, setSettingsValues] = useState({ full_name: "", username: "", bio: "", website: "", email_notifications: true, marketing_emails: true });
  const [releaseComposerOpen, setReleaseComposerOpen] = useState(false);
  const [uploadingReleaseDraft, setUploadingReleaseDraft] = useState(false);
  const [releaseDraftData, setReleaseDraftData] = useState({ title: "", release_type: "single", genre: "", release_date: "", artist_name: "", primary_language: "English", description: "", explicit_content: false, track_title: "" });
  const [releaseCoverFile, setReleaseCoverFile] = useState<File | null>(null);
  const [releaseAudioFiles, setReleaseAudioFiles] = useState<File[]>([]);
  const [releaseTrackTitles, setReleaseTrackTitles] = useState<string[]>([]);

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
    setPendingSettingsPermission(false); setSettingsAccessGranted(false); setReleaseComposerOpen(false);
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
    if (!releaseComposerOpen && !settingsAccessGranted) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, open, releaseComposerOpen, settingsAccessGranted]);

  // Keep the launcher visible on public pages too; saved-history loading remains account-aware.
  if (location.pathname.startsWith("/ai-support")) return null;

  const startNewChat = () => {
    historyAttemptedRef.current = true;
    setConversationId(null);
    setMessages([welcomeMessage]);
    setInput("");
  };


  const openSettingsEditor = async () => {
    if (!user) { toast({ title: "Sign in required", description: "Sign in before granting AI Support access to account settings.", variant: "destructive" }); return; }
    try {
      const { data, error } = await supabase.from("profiles").select("full_name,username,bio,website,email_notifications,marketing_emails").eq("id", user.id).maybeSingle();
      if (error) throw error;
      setSettingsValues({ full_name: data?.full_name ?? String(user.user_metadata?.full_name ?? ""), username: data?.username ?? user.email ?? "", bio: data?.bio ?? "", website: data?.website ?? "", email_notifications: data?.email_notifications ?? true, marketing_emails: data?.marketing_emails ?? true });
      setPendingSettingsPermission(false); setSettingsAccessGranted(true);
    } catch (error) { toast({ title: "Could not load settings", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
  };

  const saveSettingsChanges = async () => {
    if (!user || !settingsAccessGranted || savingSettings) return;
    setSavingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-support", { body: { action: "update_profile", confirmed: true, changes: settingsValues } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Settings could not be saved.");
      setSettingsAccessGranted(false);
      setMessages((current) => [...current, { id: `assistant-settings-${Date.now()}`, role: "assistant", content: "Your approved profile and notification settings have been saved. You can ask me to help with another setting whenever you need." }]);
      toast({ title: "Settings updated", description: "Your approved changes have been saved." });
    } catch (error) { toast({ title: "Settings not saved", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
    finally { setSavingSettings(false); }
  };

  const saveReleaseDraft = async () => {
    if (!user || uploadingReleaseDraft) return;
    if (!releaseDraftData.title.trim() || !releaseDraftData.genre || !releaseDraftData.release_date || !releaseDraftData.track_title.trim()) {
      toast({ title: "Complete the release details", description: "Add a release title, genre, release date, and track title.", variant: "destructive" }); return;
    }
    if (!releaseCoverFile || !releaseAudioFiles.length) {
      toast({ title: "Add your files", description: "Choose cover artwork and at least one audio file before saving the draft.", variant: "destructive" }); return;
    }
    if (!["image/jpeg", "image/png"].includes(releaseCoverFile.type)) { toast({ title: "Unsupported cover art", description: "Please choose a JPG or PNG image.", variant: "destructive" }); return; }
    if (releaseCoverFile.size > 15 * 1024 * 1024) { toast({ title: "Cover art is too large", description: "Cover art must be 15 MB or smaller.", variant: "destructive" }); return; }
    if (releaseAudioFiles.some((file) => !["wav", "mp3", "flac"].includes(file.name.split(".").pop()?.toLowerCase() ?? ""))) { toast({ title: "Unsupported audio format", description: "Please upload WAV, MP3, or FLAC files.", variant: "destructive" }); return; }
    if (releaseAudioFiles.some((file) => file.size > 50 * 1024 * 1024)) { toast({ title: "Audio file is too large", description: "Each audio file must be 50 MB or smaller.", variant: "destructive" }); return; }
    setUploadingReleaseDraft(true);
    try {
      const coverExtension = releaseCoverFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const coverPath = `${user.id}/${Date.now()}_ai_cover.${coverExtension}`;
      const { error: coverError } = await supabase.storage.from("release_artwork").upload(coverPath, releaseCoverFile, { cacheControl: "3600", upsert: false });
      if (coverError) throw new Error("Cover art upload failed: " + coverError.message);
      const { data: coverPublic } = supabase.storage.from("release_artwork").getPublicUrl(coverPath);
      if (!coverPublic?.publicUrl) throw new Error("Could not retrieve the uploaded cover art URL.");
      const audioUrls: string[] = [];
      for (let index = 0; index < releaseAudioFiles.length; index++) {
        const file = releaseAudioFiles[index];
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const audioPath = `${user.id}/${Date.now()}_${index}_ai_${safeName}`;
        const { error: audioError } = await supabase.storage.from("audio_files").upload(audioPath, file, { cacheControl: "3600", upsert: false });
        if (audioError) throw new Error("Audio upload failed for " + file.name + ": " + audioError.message);
        const { data: audioPublic } = supabase.storage.from("audio_files").getPublicUrl(audioPath);
        if (!audioPublic?.publicUrl) throw new Error("Could not retrieve an uploaded audio file URL.");
        audioUrls.push(audioPublic.publicUrl);
      }
      const formData = {
        title: releaseDraftData.title.trim(), release_type: releaseDraftData.release_type, genre: releaseDraftData.genre,
        release_date: releaseDraftData.release_date, artist_name: releaseDraftData.artist_name.trim(),
        primary_language: releaseDraftData.primary_language, description: releaseDraftData.description.trim(),
        explicit_content: releaseDraftData.explicit_content, artwork_credits: "", producer_credits: "", songwriter_credits: "",
        copyright_info: "", submission_notes: "", upc: "", total_tracks: releaseAudioFiles.length,
        territory: "World", release_time: "", release_timezone: "", pre_order_enabled: false, pre_order_previews: false, pricing: "standard",
      };
      const tracks = releaseAudioFiles.map((file, index) => ({
        track_number: index + 1, title: index === 0 ? releaseDraftData.track_title.trim() : file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        explicit_content: releaseDraftData.explicit_content, performers: [], featured_artists: [],
      }));
      const { data: savedDraft, error: draftError } = await supabase.from("release_drafts").insert({
        user_id: user.id, data: { formData, tracks, storeSelections: {}, freeTrackIds: [], audioClips: {}, termsAccepted: false },
        cover_art_url: coverPublic.publicUrl, audio_file_urls: audioUrls, current_step: 1, selected_artist_account: "self",
      }).select("id").single();
      if (draftError || !savedDraft) throw new Error(draftError?.message || "Could not save your release draft.");
      setReleaseComposerOpen(false); setReleaseCoverFile(null); setReleaseAudioFiles([]); setReleaseTrackTitles([]);
      setMessages((current) => [...current, { id: `assistant-release-${Date.now()}`, role: "assistant", content: `Your release draft “${releaseDraftData.title.trim()}” is saved, and ${audioUrls.length} audio file(s) plus the cover art have been uploaded. It has not been submitted. Continue in the release wizard to review distribution stores, confirm all metadata, and submit when you're ready.` }]);
      toast({ title: "Release draft saved", description: "Your files are uploaded. Review the draft before submitting." });
    } catch (error) { toast({ title: "Could not save release draft", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
    finally { setUploadingReleaseDraft(false); }
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
      const settingsIntent = /\b(change|update|edit|modify|manage)\b.{0,60}\b(account|profile|settings|username|bio|website|notifications|preferences)\b/i.test(content) ||
        /\b(account settings|profile settings|change my username|update my bio|edit my profile)\b/i.test(content);
      const releaseIntent = /\b(start|create|prepare|upload|submit|release|distribute)\b/i.test(content) && /\b(music|song|track|album|single|release)\b/i.test(content);
      const continuingRelease = releaseComposerOpen && !!user && !settingsIntent;
      setPendingSettingsPermission(settingsIntent && !!user);
      if (settingsIntent) {
        setSettingsAccessGranted(false);
        setReleaseComposerOpen(false);
      } else if (releaseIntent && user) {
        setReleaseComposerOpen(true);
      }
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: settingsIntent
        ? "Before I access or change your profile settings, may I have your permission? Nothing will change until you approve the specific edits."
        : releaseIntent && user
          ? "Let's prepare your release draft here. Fill in the metadata and attach your cover art and audio files in the form below. I'll save a draft for review, not submit it."
          : continuingRelease
            ? "Great — the release form is ready below. Start with the release title, genre, release date, and track title, then attach your cover art and audio files. I'll keep everything in this chat while we prepare your draft."
            : data.reply }]);
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
                  {message.role === "assistant" ? renderMiniContent(message.content) : message.content}
                </div>
              </div>
            ))}
            {pendingSettingsPermission && user && (
              <div className="rounded-xl border border-primary/20 bg-background p-3 text-sm shadow-sm">
                <p className="font-semibold">Permission to access account settings</p>
                <p className="mt-1 text-muted-foreground">May I read your editable profile and notification preferences so I can help update them? I will not save anything until you review the fields and press Save changes.</p>
                <div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={() => void openSettingsEditor()}>Allow access</Button><Button type="button" size="sm" variant="outline" onClick={() => setPendingSettingsPermission(false)}>Not now</Button></div>
              </div>
            )}
            {settingsAccessGranted && user && (
              <form className="space-y-3 rounded-xl border bg-background p-3 text-sm" onSubmit={(event) => { event.preventDefault(); void saveSettingsChanges(); }}>
                <div><p className="font-semibold">Review profile changes</p><p className="text-xs text-muted-foreground">Only the fields below can be updated here. Email address, password, and security settings are not editable in this chat.</p></div>
                {([["full_name", "Full name"], ["username", "Username"], ["bio", "Bio"], ["website", "Website"]] as const).map(([key, label]) => (
                  <label key={key} className="block space-y-1"><span className="text-xs font-medium">{label}</span><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={settingsValues[key]} onChange={(event) => setSettingsValues((current) => ({ ...current, [key]: event.target.value }))} maxLength={key === "bio" ? 1000 : 180} /></label>
                ))}
                <label className="flex items-center gap-2"><input type="checkbox" checked={settingsValues.email_notifications} onChange={(event) => setSettingsValues((current) => ({ ...current, email_notifications: event.target.checked }))} /> Email notifications</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={settingsValues.marketing_emails} onChange={(event) => setSettingsValues((current) => ({ ...current, marketing_emails: event.target.checked }))} /> Marketing emails</label>
                <div className="flex gap-2"><Button type="submit" size="sm" disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save changes</Button><Button type="button" size="sm" variant="outline" onClick={() => setSettingsAccessGranted(false)}>Cancel</Button></div>
              </form>
            )}
            {releaseComposerOpen && user && (
              <form className="space-y-3 rounded-xl border bg-background p-3 text-sm" onSubmit={(event) => { event.preventDefault(); void saveReleaseDraft(); }}>
                <div><p className="font-semibold">Prepare a release draft</p><p className="text-xs text-muted-foreground">Add the key metadata and files. Audio and artwork will upload to your account, and the draft will remain unsubmitted.</p></div>
                <label className="block space-y-1"><span className="text-xs font-medium">Release title *</span><input required className="w-full rounded-md border bg-background px-3 py-2" value={releaseDraftData.title} onChange={(event) => setReleaseDraftData((current) => ({ ...current, title: event.target.value }))} placeholder="Release title" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1"><span className="text-xs font-medium">Release type</span><select className="w-full rounded-md border bg-background px-2 py-2" value={releaseDraftData.release_type} onChange={(event) => setReleaseDraftData((current) => ({ ...current, release_type: event.target.value }))}><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option></select></label>
                  <label className="block space-y-1"><span className="text-xs font-medium">Genre *</span><select required className="w-full rounded-md border bg-background px-2 py-2" value={releaseDraftData.genre} onChange={(event) => setReleaseDraftData((current) => ({ ...current, genre: event.target.value }))}><option value="">Select genre</option>{["Afrobeats","Highlife","Afro-Pop","Gospel","Hip-Hop","R&B","Amapiano","Traditional","Reggae/Dancehall","Alternative","Electronic","Jazz","Folk","Pop","Rock","Country","Classical","Blues","Funk","Soul"].map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></label>
                </div>
                <label className="block space-y-1"><span className="text-xs font-medium">Release date *</span><input required type="date" min={new Date().toISOString().slice(0, 10)} className="w-full rounded-md border bg-background px-3 py-2" value={releaseDraftData.release_date} onChange={(event) => setReleaseDraftData((current) => ({ ...current, release_date: event.target.value }))} /></label>
                <label className="block space-y-1"><span className="text-xs font-medium">Artist name</span><input className="w-full rounded-md border bg-background px-3 py-2" value={releaseDraftData.artist_name} onChange={(event) => setReleaseDraftData((current) => ({ ...current, artist_name: event.target.value }))} placeholder="Artist name" /></label>
                <label className="block space-y-1"><span className="text-xs font-medium">Primary track title *</span><input required className="w-full rounded-md border bg-background px-3 py-2" value={releaseDraftData.track_title} onChange={(event) => setReleaseDraftData((current) => ({ ...current, track_title: event.target.value }))} placeholder="Song title" /></label>
                <label className="block space-y-1"><span className="text-xs font-medium">Description</span><textarea rows={2} className="w-full rounded-md border bg-background px-3 py-2" value={releaseDraftData.description} onChange={(event) => setReleaseDraftData((current) => ({ ...current, description: event.target.value }))} placeholder="Optional release description" /></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={releaseDraftData.explicit_content} onChange={(event) => setReleaseDraftData((current) => ({ ...current, explicit_content: event.target.checked }))} /> Contains explicit content</label>
                <label className="block space-y-1"><span className="text-xs font-medium">Cover art * (JPG/PNG, max 15 MB)</span><input required type="file" accept="image/jpeg,image/png" className="block w-full text-xs" onChange={(event) => setReleaseCoverFile(event.target.files?.[0] ?? null)} /></label>
                <label className="block space-y-1"><span className="text-xs font-medium">Audio files * (WAV/MP3/FLAC, max 50 MB each)</span><input required type="file" multiple accept="audio/wav,audio/mpeg,audio/flac,.wav,.mp3,.flac" className="block w-full text-xs" onChange={(event) => { const files = Array.from(event.target.files ?? []); setReleaseAudioFiles(files); setReleaseTrackTitles(files.map((file) => file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "))); }} /></label>
                {releaseAudioFiles.length > 0 && <p className="text-xs text-muted-foreground">{releaseAudioFiles.length} audio file(s) selected: {releaseAudioFiles.map((file) => file.name).join(", ")}</p>}
                {releaseAudioFiles.length > 1 && releaseAudioFiles.map((file, index) => index === 0 ? null : (
                  <label key={file.name + index} className="block space-y-1"><span className="text-xs font-medium">Track {index + 1} title</span>
                    <input className="w-full rounded-md border bg-background px-3 py-2" value={releaseTrackTitles[index] ?? ""} onChange={(event) => setReleaseTrackTitles((current) => { const next = [...current]; next[index] = event.target.value; return next; })} />
                  </label>
                ))}
                <div className="flex gap-2"><Button type="submit" size="sm" disabled={uploadingReleaseDraft}>{uploadingReleaseDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save draft &amp; upload files</Button><Button type="button" size="sm" variant="outline" onClick={() => setReleaseComposerOpen(false)}>Cancel</Button></div>
              </form>
            )}
            {messages.length >= 10 && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">This is a longer conversation. Open the full chat to keep going with more space and your saved history.</p><Button type="button" size="sm" className="mt-2 w-full" onClick={openFullChat}>Continue in full chat <ExternalLink className="ml-2 h-3.5 w-3.5" /></Button></div>}
            {messages.some((message) => message.id.startsWith("assistant-release-")) && <Button type="button" className="w-full" onClick={() => { setOpen(false); navigate("/release-form?resume=1"); }}>Continue in release wizard</Button>}
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
      <Button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((current) => !current); }}
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
