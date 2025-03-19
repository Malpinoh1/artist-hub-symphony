
import { Link } from 'react-router-dom';
import { Music, Instagram, Twitter, Facebook, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-100">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Music className="text-white w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-semibold text-slate-900">MALPINOH</span>
                <span className="text-xs text-slate-500 -mt-1">distro.com.ng</span>
              </div>
            </Link>
            <p className="mt-4 text-slate-600 text-sm">
              Your music, everywhere. Independent music distribution with a personal touch.
            </p>
            <div className="flex gap-4 mt-6">
              <SocialLink href="https://instagram.com" icon={<Instagram className="w-4 h-4" />} />
              <SocialLink href="https://twitter.com" icon={<Twitter className="w-4 h-4" />} />
              <SocialLink href="https://facebook.com" icon={<Facebook className="w-4 h-4" />} />
              <SocialLink href="mailto:contact@malpinoh.com.ng" icon={<Mail className="w-4 h-4" />} />
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              <FooterLink to="/dashboard">Dashboard</FooterLink>
              <FooterLink to="/releases">Releases</FooterLink>
              <FooterLink to="/new-release">Submit Music</FooterLink>
              <FooterLink to="/earnings">Earnings</FooterLink>
              <FooterLink to="/help">Help Center</FooterLink>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Resources</h3>
            <ul className="space-y-2">
              <FooterLink to="/faq">FAQ</FooterLink>
              <FooterLink to="/pricing">Pricing</FooterLink>
              <FooterLink to="/blog">Blog</FooterLink>
              <FooterLink to="/partners">Partners</FooterLink>
              <FooterLink to="/contact">Contact Us</FooterLink>
            </ul>
          </div>
          
          {/* Legal */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2">
              <FooterLink to="/terms">Terms of Service</FooterLink>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/copyright">Copyright Info</FooterLink>
              <FooterLink to="/cookies">Cookie Policy</FooterLink>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} MALPINOH. All rights reserved.
          </p>
          <p className="text-sm text-slate-500 mt-2 md:mt-0">
            Designed with ♥ in Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="text-slate-600 hover:text-blue-600 transition-colors text-sm">
      {children}
    </Link>
  </li>
);

const SocialLink = ({ href, icon }: { href: string; icon: React.ReactNode }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className="w-8 h-8 rounded-full bg-slate-200 hover:bg-blue-100 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
  >
    {icon}
  </a>
);

export default Footer;
