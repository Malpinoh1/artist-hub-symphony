
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccountProvider } from "./contexts/AccountContext";
import { AuthenticatedLayout } from "./components/layouts/AuthenticatedLayout";
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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccountProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/pricing" element={<Pricing />} />
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
                
                {/* Authenticated routes with sidebar */}
                <Route path="/dashboard" element={<AuthenticatedLayout><Dashboard /></AuthenticatedLayout>} />
                <Route path="/releases" element={<AuthenticatedLayout><Releases /></AuthenticatedLayout>} />
                <Route path="/releases/:id" element={<AuthenticatedLayout><ReleaseDetails /></AuthenticatedLayout>} />
                <Route path="/release-form" element={<AuthenticatedLayout><ReleaseForm /></AuthenticatedLayout>} />
                <Route path="/analytics" element={<AuthenticatedLayout><Analytics /></AuthenticatedLayout>} />
                <Route path="/earnings" element={<AuthenticatedLayout><Earnings /></AuthenticatedLayout>} />
                <Route path="/settings" element={<AuthenticatedLayout><Settings /></AuthenticatedLayout>} />
                <Route path="/help" element={<AuthenticatedLayout><HelpCenter /></AuthenticatedLayout>} />
                <Route path="/team" element={<AuthenticatedLayout><Team /></AuthenticatedLayout>} />
                <Route path="/team/guide" element={<AuthenticatedLayout><TeamGuide /></AuthenticatedLayout>} />
                <Route path="/team/accept-invitation" element={<AuthenticatedLayout><AcceptInvitation /></AuthenticatedLayout>} />
                <Route path="/admin" element={<AuthenticatedLayout><AdminDashboard /></AuthenticatedLayout>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AccountProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
