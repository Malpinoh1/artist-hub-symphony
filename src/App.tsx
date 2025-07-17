
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import LoadingState from "./components/earnings/LoadingState";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Team = lazy(() => import("./pages/Team"));
const ReleaseForm = lazy(() => import("./pages/ReleaseForm"));
const ReleaseDetails = lazy(() => import("./pages/ReleaseDetails"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Earnings = lazy(() => import("./pages/Earnings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Resources = lazy(() => import("./pages/Resources"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Copyright = lazy(() => import("./pages/Copyright"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Blog = lazy(() => import("./pages/Blog"));
const Partners = lazy(() => import("./pages/Partners"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const MarketingGuide = lazy(() => import("./pages/resources/MarketingGuide"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/release/new" element={<ReleaseForm />} />
                  <Route path="/releases" element={<ReleaseDetails />} />
                  <Route path="/release/:id" element={<ReleaseDetails />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/earnings" element={<Earnings />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/resources/marketing-guide" element={<MarketingGuide />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/copyright" element={<Copyright />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/password-reset" element={<PasswordReset />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Toaster />
            </div>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
