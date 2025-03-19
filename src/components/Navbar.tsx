
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Music, User, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Music className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-semibold text-slate-900">MALPINOH</span>
              <span className="text-xs text-slate-500 -mt-1">distro.com.ng</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard" active={location.pathname === '/dashboard'}>Dashboard</NavLink>
            <NavLink to="/releases" active={location.pathname.startsWith('/releases')}>Releases</NavLink>
            <NavLink to="/earnings" active={location.pathname === '/earnings'}>Earnings</NavLink>
            <NavLink to="/help" active={location.pathname === '/help'}>Help</NavLink>
          </nav>
          
          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-full px-4 py-2 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-colors duration-300">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Account</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
              <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600">Profile</Link>
                <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600">Settings</Link>
                <div className="border-t border-slate-100 my-1"></div>
                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign Out</button>
              </div>
            </div>
            <Link to="/new-release" className="btn-primary">
              New Release
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
          >
            {isMenuOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div 
        className={`md:hidden fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-20 pb-6 px-6">
          <nav className="flex flex-col gap-2">
            <MobileNavLink to="/dashboard" active={location.pathname === '/dashboard'}>Dashboard</MobileNavLink>
            <MobileNavLink to="/releases" active={location.pathname.startsWith('/releases')}>Releases</MobileNavLink>
            <MobileNavLink to="/earnings" active={location.pathname === '/earnings'}>Earnings</MobileNavLink>
            <MobileNavLink to="/help" active={location.pathname === '/help'}>Help</MobileNavLink>
          </nav>
          
          <div className="border-t border-slate-100 my-6"></div>
          
          <div className="flex flex-col gap-3 mt-auto">
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-slate-900 font-medium">Account</div>
                <div className="text-sm text-slate-500">Manage your profile</div>
              </div>
            </Link>
            
            <Link to="/new-release" className="btn-primary">
              New Release
            </Link>
            
            <button className="mt-4 text-center text-sm text-red-600 hover:text-red-700 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Desktop Navigation Link
const NavLink = ({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) => (
  <Link to={to} className={`nav-link ${active ? 'active' : ''}`}>
    {children}
  </Link>
);

// Mobile Navigation Link
const MobileNavLink = ({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) => (
  <Link 
    to={to} 
    className={`text-lg font-medium py-3 px-4 rounded-xl transition-colors ${
      active ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
