import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Releases from "./pages/Releases";
import Upload from "./pages/Upload";
import Analytics from "./pages/Analytics";
import HelpCenter from "./pages/HelpCenter";
import Account from "./pages/Account";
import Withdrawals from "./pages/Withdrawals";
import Admin from "./pages/Admin";
import AdminArtists from "./pages/AdminArtists";
import AdminReleases from "./pages/AdminReleases";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import AdminOther from "./pages/AdminOther";
import Team from "./pages/Team";
import TeamGuide from "./pages/TeamGuide";
import AcceptInvitation from "./pages/AcceptInvitation";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/releases" element={<Releases />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/account" element={<Account />} />
                <Route path="/withdrawals" element={<Withdrawals />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/artists" element={<AdminArtists />} />
                <Route path="/admin/releases" element={<AdminReleases />} />
                <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
                <Route path="/admin/other" element={<AdminOther />} />
                <Route path="/team" element={<Team />} />
                <Route path="/team/guide" element={<TeamGuide />} />
                <Route path="/team/accept-invitation" element={<AcceptInvitation />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
