
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccountProvider } from "./contexts/AccountContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import DashboardLayout from "./components/DashboardLayout";
import FloatingTeamSwitcher from "./components/FloatingTeamSwitcher";
import MobileBottomNav from "./components/MobileBottomNav";
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
import ConfirmSubscription from "./pages/ConfirmSubscription";
import PasswordReset from "./pages/PasswordReset";
import ResetPassword from "./pages/ResetPassword";
import MarketingGuide from "./pages/resources/MarketingGuide";
import Support from "./pages/Support";

const queryClient = new QueryClient();

// Wrapper for dashboard pages
const DashboardPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const AppContent = () => {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        {/* Public routes — redirect to dashboard if logged in */}
        <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

        {/* Public marketing pages — always accessible */}
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
        <Route path="/confirm-subscription" element={<ConfirmSubscription />} />

        {/* Protected dashboard routes — wrapped in DashboardLayout */}
        <Route path="/dashboard" element={<DashboardPage><Dashboard /></DashboardPage>} />
        <Route path="/releases" element={<DashboardPage><Releases /></DashboardPage>} />
        <Route path="/releases/:id" element={<DashboardPage><ReleaseDetails /></DashboardPage>} />
        <Route path="/release-form" element={<DashboardPage><ReleaseForm /></DashboardPage>} />
        <Route path="/analytics" element={<DashboardPage><Analytics /></DashboardPage>} />
        <Route path="/earnings" element={<DashboardPage><Earnings /></DashboardPage>} />
        <Route path="/settings" element={<DashboardPage><Settings /></DashboardPage>} />
        <Route path="/help" element={<DashboardPage><HelpCenter /></DashboardPage>} />
        <Route path="/team" element={<DashboardPage><Team /></DashboardPage>} />
        <Route path="/team/guide" element={<DashboardPage><TeamGuide /></DashboardPage>} />
        <Route path="/team/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/support" element={<DashboardPage><Support /></DashboardPage>} />
        <Route path="/admin" element={<DashboardPage><AdminDashboard /></DashboardPage>} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Bottom nav only for mobile dashboard */}
      <MobileBottomNav />
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AccountProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </AccountProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
