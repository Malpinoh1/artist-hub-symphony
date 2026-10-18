import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const FloatingAISupportButton = () => {
  const { user } = useAuth();
  const location = useLocation();

  // The chat page already has its own interface; don't cover it with the launcher.
  if (!user || location.pathname.startsWith("/ai-support")) return null;

  return (
    <Link
      to="/ai-support"
      aria-label="Open MALPINOHdistro AI Support"
      title="Need help? Chat with AI Support"
      className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:right-6 sm:bottom-6 z-[60] inline-flex min-h-12 items-center gap-2.5 rounded-full border border-primary-foreground/15 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] sm:px-5"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
        <MessageCircle className="h-4 w-4" />
        <Sparkles className="absolute -right-1 -top-1 h-3 w-3" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>AI Support</span>
        <span className="mt-0.5 hidden text-[10px] font-normal opacity-80 sm:block">We’re here to help</span>
      </span>
    </Link>
  );
};

export default FloatingAISupportButton;
