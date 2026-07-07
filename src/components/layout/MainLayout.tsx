import { Link, useNavigate } from 'react-router';
import { Menu, X, LogIn, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PWAInstallButton from '@/components/PWAInstallButton';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#F5F3EF]/95 backdrop-blur-sm border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src="/kimatu-icon.png" alt="Kimatu Analytics" className="w-8 h-8 rounded-lg" />
              <div className="flex flex-col">
                <span className="text-xl font-bold" style={{ color: '#1A365D' }}>Kimatu</span>
                <span className="text-[10px] -mt-1" style={{ color: '#D4AF37' }}>ANALYTICS</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-base text-[#666666] hover:text-[#111111] transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-base text-[#666666] hover:text-[#111111] transition-colors font-medium">Pricing</a>
              <a href="#testimonials" className="text-base text-[#666666] hover:text-[#111111] transition-colors font-medium">Testimonials</a>
              <a href="#faq" className="text-base text-[#666666] hover:text-[#111111] transition-colors font-medium">FAQ</a>
              <PWAInstallButton variant="nav" />
              {user ? (
                <div className="flex items-center gap-3">
                  <Link 
                    to={user.role === 'master_super_admin' ? '/master-admin' : user.role === 'reseller_super_admin' ? '/reseller-admin' : `/${user.role.replace(/_/g, '-')}`}
                    className="text-base font-medium bg-[#1A365D] text-white px-5 py-2.5 rounded-full hover:bg-[#2D4A7C] transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-base text-[#666666] hover:text-[#111111] transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/auth/login" className="inline-flex items-center gap-2 text-base font-bold bg-[#1A365D] text-white px-6 py-2.5 rounded-full hover:bg-[#2D4A7C] transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                    <LogIn className="w-4 h-4" /> Login
                  </Link>
                  <Link to="/get-started" className="inline-flex items-center gap-2 text-base font-bold bg-[#D4AF37] text-white px-6 py-2.5 rounded-full hover:bg-[#C4A030] transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#E5E5E5]">
              <div className="flex flex-col gap-3">
                <a href="#features" className="text-base text-[#666666] py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#pricing" className="text-base text-[#666666] py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                <a href="#testimonials" className="text-base text-[#666666] py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
                <a href="#faq" className="text-base text-[#666666] py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
                {user ? (
                  <>
                    <Link to={user.role === 'master_super_admin' ? '/master-admin' : user.role === 'reseller_super_admin' ? '/reseller-admin' : `/${user.role.replace(/_/g, '-')}`} className="text-base font-medium bg-[#1A365D] text-white px-4 py-2.5 rounded-full text-center" onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <button onClick={handleLogout} className="text-base text-[#666666] py-2 text-left font-medium">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/auth/login" className="inline-flex items-center justify-center gap-2 text-base font-medium bg-[#1A365D] text-white px-4 py-2.5 rounded-full" onClick={() => setMobileMenuOpen(false)}>
                      <LogIn className="w-4 h-4" /> Login
                    </Link>
                    <Link to="/get-started" className="text-base font-medium bg-[#D4AF37] text-white px-4 py-2.5 rounded-full text-center" onClick={() => setMobileMenuOpen(false)}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#1A1A1A] to-[#0F1729] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/kimatu-icon.png" alt="Kimatu Analytics" className="w-8 h-8 rounded-lg" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold">Kimatu</span>
                  <span className="text-[10px] -mt-1" style={{ color: '#D4AF37' }}>ANALYTICS</span>
                </div>
              </div>
              <p className="text-base text-gray-400 mb-4 leading-relaxed">Smarter Schools, Brighter Futures. Empowering schools with data-driven insights for better learner outcomes.</p>
              <div className="flex flex-col gap-2 text-base text-gray-400">
                <span className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-semibold">Phone:</span> 0114 645 757
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-semibold">Email:</span> martinmakau123@gmail.com
                </span>
                <a 
                  href="https://wa.me/254114645757" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors mt-1"
                >
                  <span className="font-semibold">WhatsApp:</span> 0114 645 757
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-lg" style={{ color: '#D4AF37' }}>Product</h4>
              <div className="flex flex-col gap-2 text-base text-gray-400">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
                <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-lg" style={{ color: '#D4AF37' }}>Support</h4>
              <div className="flex flex-col gap-2 text-base text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Documentation</a>
                <a href="#" className="hover:text-white transition-colors">Video Tutorials</a>
                <a href="#" className="hover:text-white transition-colors">System Status</a>
                <button onClick={() => window.open('https://wa.me/254114645757', '_blank')} className="text-left hover:text-green-400 transition-colors">
                  WhatsApp Support
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-lg" style={{ color: '#D4AF37' }}>Legal</h4>
              <div className="flex flex-col gap-2 text-base text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-base text-gray-400">&copy; 2026 Kimatu Analytics. All Rights Reserved.</p>
            <p className="text-base text-gray-400 flex items-center gap-1">
              Made with <span style={{ color: '#D4AF37' }}>care</span> for Kenyan Schools
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
