import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./integrations/supabase/client";
import { ThemeProvider } from "./contexts/ThemeContext";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ReleaseForm from "./pages/ReleaseForm";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Analytics from "./pages/Analytics";
import Earnings from "./pages/Earnings";
import Pricing from "./pages/Pricing";
import HelpCenter from "./pages/HelpCenter";
import ReleaseDetails from "./pages/ReleaseDetails";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Resources from "./pages/Resources";
import MarketingGuide from "./pages/resources/MarketingGuide";
import Settings from "./pages/Settings";
import PasswordReset from "./pages/PasswordReset";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

// Create a custom ProtectedRoute component for admin routes
const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user has admin role in user_roles table
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
          
        if (data && !error) {
          setIsAdmin(true);
        }
      }
      
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAdmin ? children : <Navigate to="/" replace />;
};

// Protected route for authenticated users
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

const App = () => {
  // Add scroll animation observer
  useEffect(() => {
    const animateOnScrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            
            // If this element contains staggered children, animate them too
            if (entry.target.classList.contains('stagger-children')) {
              entry.target.classList.add('animated');
            }
            
            // Once animated, no need to observe anymore
            animateOnScrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    // Observe all elements with the animate-on-scroll class
    document.querySelectorAll('.animate-on-scroll').forEach((element) => {
      animateOnScrollObserver.observe(element);
    });
    
    // Observe all elements with the stagger-children class
    document.querySelectorAll('.stagger-children').forEach((element) => {
      animateOnScrollObserver.observe(element);
    });
    
    return () => {
      document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach((element) => {
        animateOnScrollObserver.unobserve(element);
      });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/marketing" element={<MarketingGuide />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/releases/:id" 
                element={
                  <ProtectedRoute>
                    <ReleaseDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/new-release" 
                element={
                  <ProtectedRoute>
                    <ReleaseForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/earnings" 
                element={
                  <ProtectedRoute>
                    <Earnings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
