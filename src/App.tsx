
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
import MobileBottomNav from "./components/MobileBottomNav";
import React, { Suspense } from "react";

// Lazy-loaded pages
const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Releases = React.lazy(() => import("./pages/Releases"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const HelpCenter = React.lazy(() => import("./pages/HelpCenter"));
const Team = React.lazy(() => import("./pages/Team"));
const TeamGuide = React.lazy(() => import("./pages/TeamGuide"));
const AcceptInvitation = React.lazy(() => import("./pages/AcceptInvitation"));
const ReleaseDetails = React.lazy(() => import("./pages/ReleaseDetails"));
const ReleaseForm = React.lazy(() => import("./pages/ReleaseForm"));
const Earnings = React.lazy(() => import("./pages/Earnings"));
const Settings = React.lazy(() => import("./pages/Settings"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const About = React.lazy(() => import("./pages/About"));
const Services = React.lazy(() => import("./pages/Services"));
const Resources = React.lazy(() => import("./pages/Resources"));
const Blog = React.lazy(() => import("./pages/Blog"));
const Contact = React.lazy(() => import("./pages/Contact"));
const FAQ = React.lazy(() => import("./pages/FAQ"));
const Partners = React.lazy(() => import("./pages/Partners"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const Cookies = React.lazy(() => import("./pages/Cookies"));
const Copyright = React.lazy(() => import("./pages/Copyright"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const ConfirmSubscription = React.lazy(() => import("./pages/ConfirmSubscription"));
const PasswordReset = React.lazy(() => import("./pages/PasswordReset"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const MarketingGuide = React.lazy(() => import("./pages/resources/MarketingGuide"));
const Support = React.lazy(() => import("./pages/Support"));
const Transactions = React.lazy(() => import("./pages/Transactions"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Wrapper for dashboard pages
const DashboardPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const AppContent = () => {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/transactions" element={<DashboardPage><Transactions /></DashboardPage>} />
        <Route path="/admin" element={<DashboardPage><AdminDashboard /></DashboardPage>} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Bottom nav only for mobile dashboard */}
      <MobileBottomNav />
    </Suspense>
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
