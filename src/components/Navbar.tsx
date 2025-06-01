
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { signOut } from '../services/authService';
import { toast } from 'sonner';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };

    checkAuthStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      setIsLoggedIn(event === 'SIGNED_IN');
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
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navClassNames = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled || isOpen ? 'bg-white/90 backdrop-blur-lg shadow-lg' : 'bg-transparent'
  }`;

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/services', label: 'Services' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/about', label: 'About' },
    { path: '/resources', label: 'Resources' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <nav className={navClassNames}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-display text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
              MALPINOHdistro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`py-2 px-3 mx-1 rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'text-blue-600 font-medium'
                    : 'text-black hover:text-blue-600'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {isLoggedIn ? (
              <div className="flex space-x-2 ml-4">
                <Button asChild variant="outline">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button onClick={handleSignOut} variant="destructive" className="flex items-center gap-1">
                  <LogOut size={16} />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button asChild className="ml-4 bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/auth">Get Started</Link>
              </Button>
            )}
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex items-center space-x-3 md:hidden">
            {isLoggedIn && (
              <Button onClick={handleSignOut} variant="destructive" size="sm" className="flex items-center gap-1">
                <LogOut size={14} />
                <span className="sr-only md:not-sr-only">Sign Out</span>
              </Button>
            )}
            <button
              onClick={toggleMenu}
              className="p-2 text-black focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`py-2 px-3 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? 'text-blue-600 font-medium bg-blue-50'
                      : 'text-black'
                  }`}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
              
              {isLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    className="py-2 px-3 rounded-lg text-black"
                    onClick={closeMenu}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      closeMenu();
                    }}
                    className="py-2 px-3 text-left rounded-lg bg-red-500 text-white flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="py-2 px-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  onClick={closeMenu}
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
