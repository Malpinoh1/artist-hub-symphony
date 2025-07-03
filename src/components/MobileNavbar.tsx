
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, Music, Settings, DollarSign, BarChart3 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { signOut } from '../services/authService';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const MobileNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      setLoading(false);
    };

    checkAuthStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { success, error } = await signOut();
    if (success) {
      toast.success("Successfully signed out");
    } else if (error) {
      toast.error("Failed to sign out. Please try again.");
    }
    setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/services', label: 'Services', icon: Music },
    { path: '/pricing', label: 'Pricing', icon: DollarSign },
    { path: '/about', label: 'About', icon: BarChart3 },
    { path: '/contact', label: 'Contact', icon: Settings },
  ];

  const authenticatedLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/earnings', label: 'Earnings', icon: DollarSign },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/08874f5c-9cad-4d09-a9c1-fcbc1bb869f5.png" 
                alt="MALPINOHdistro" 
                className="h-8 w-auto"
              />
            </Link>
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/08874f5c-9cad-4d09-a9c1-fcbc1bb869f5.png" 
              alt="MALPINOHdistro" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-1">
            {(isLoggedIn ? authenticatedLinks : navLinks).map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`py-2 px-3 mx-1 rounded-lg transition-colors flex items-center gap-2 ${
                    isActive(link.path)
                      ? 'text-blue-600 font-medium bg-blue-50'
                      : 'text-black hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent size={16} />
                  {link.label}
                </Link>
              );
            })}

            {isLoggedIn ? (
              <Button onClick={handleSignOut} variant="destructive" className="ml-4 flex items-center gap-2">
                <LogOut size={16} />
                Sign Out
              </Button>
            ) : (
              <Button asChild className="ml-4 bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/auth">Get Started</Link>
              </Button>
            )}
          </div>

          {/* Mobile Navigation Drawer */}
          <div className="md:hidden">
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu size={24} />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="flex items-center gap-2">
                    <img 
                      src="/lovable-uploads/08874f5c-9cad-4d09-a9c1-fcbc1bb869f5.png" 
                      alt="MALPINOHdistro" 
                      className="h-8 w-auto"
                    />
                    MALPINOHdistro
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6">
                  <div className="flex flex-col space-y-2">
                    {(isLoggedIn ? authenticatedLinks : navLinks).map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          className={`py-3 px-4 rounded-lg transition-colors flex items-center gap-3 text-base ${
                            isActive(link.path)
                              ? 'text-blue-600 font-medium bg-blue-50'
                              : 'text-black hover:bg-gray-50'
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <IconComponent size={20} />
                          {link.label}
                        </Link>
                      );
                    })}
                    
                    <div className="border-t border-gray-200 my-4"></div>
                    
                    {isLoggedIn ? (
                      <button
                        onClick={handleSignOut}
                        className="py-3 px-4 text-left rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-3 text-base font-medium"
                      >
                        <LogOut size={20} />
                        Sign Out
                      </button>
                    ) : (
                      <Link
                        to="/auth"
                        className="py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-3 text-base font-medium"
                        onClick={() => setIsOpen(false)}
                      >
                        Get Started
                      </Link>
                    )}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavbar;
