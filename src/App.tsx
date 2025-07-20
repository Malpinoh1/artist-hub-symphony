

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Releases from "./pages/Releases";
import Analytics from "./pages/Analytics";
import HelpCenter from "./pages/HelpCenter";
import Team from "./pages/Team";
import TeamGuide from "./pages/TeamGuide";
import AcceptInvitation from "./pages/AcceptInvitation";
import ReleaseDetails from "./pages/ReleaseDetails";
import ReleaseForm from "./pages/ReleaseForm";
import Earnings from "./pages/Earnings";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import About from "./pages/About";
import Services from "./pages/Services";
import Resources from "./pages/Resources";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Partners from "./pages/Partners";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Cookies from "./pages/Cookies";
import Copyright from "./pages/Copyright";
import NotFound from "./pages/NotFound";
import PasswordReset from "./pages/PasswordReset";
import ResetPassword from "./pages/ResetPassword";
import MarketingGuide from "./pages/resources/MarketingGuide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            <Route path="/releases/:id" element={<ReleaseDetails />} />
            <Route path="/release-form" element={<ReleaseForm />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/team" element={<Team />} />
            <Route path="/team/guide" element={<TeamGuide />} />
            <Route path="/team/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/marketing-guide" element={<MarketingGuide />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/copyright" element={<Copyright />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
