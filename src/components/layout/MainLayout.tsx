import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, GraduationCap, Menu, X } from 'lucide-react';
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

  const dashboardPath = user
    ? user.role === 'master_super_admin'
      ? '/master-admin'
      : user.role === 'reseller_super_admin'
        ? '/reseller-admin'
        : `/${user.role.replace(/_/g, '-')}`
    : '/auth/login';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#F6F3EA] text-[#10233F] selection:bg-[#D8F23F] selection:text-[#10233F]">
      <nav className="sticky top-0 z-50 border-b border-[#DDE3D5] bg-[#F6F3EA]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3" onClick={closeMobileMenu}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10233F] shadow-[4px_4px_0_0_#D8F23F] transition-transform duration-200 group-hover:-translate-y-0.5">
              <img src="/kimatu-icon.png" alt="Kimatu Analytics" className="h-8 w-8 object-contain" />
            </span>
            <span className="leading-none">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#60708A]">School operations</span>
              <span className="block text-lg font-black tracking-tight text-[#10233F]">Kimatu Analytics</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            <Link to="/pathway-finder" className="text-sm font-bold text-[#10233F] transition-colors hover:text-[#587000]">Pathway Finder</Link>
            <a href="#features" className="text-sm font-medium text-[#60708A] transition-colors hover:text-[#10233F]">Platform</a>
            <a href="#how-it-works" className="text-sm font-medium text-[#60708A] transition-colors hover:text-[#10233F]">How it works</a>
            <a href="#faq" className="text-sm font-medium text-[#60708A] transition-colors hover:text-[#10233F]">FAQs</a>
            <PWAInstallButton variant="nav" />
            {user ? (
              <div className="flex items-center gap-3">
                <Link to={dashboardPath} className="inline-flex items-center gap-1.5 rounded-full bg-[#10233F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1E3A5F]">
                  Open dashboard <ArrowUpRight className="h-4 w-4" />
                </Link>
                <button onClick={handleLogout} className="text-sm font-medium text-[#60708A] transition hover:text-[#10233F]">Sign out</button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/auth/login" className="text-sm font-bold text-[#10233F] transition hover:text-[#587000]">Sign in</Link>
                <Link to="/register-school" className="inline-flex items-center gap-1.5 rounded-full bg-[#D8F23F] px-5 py-2.5 text-sm font-black text-[#10233F] shadow-[3px_3px_0_0_#10233F] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#10233F]">
                  Start with Kimatu <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="rounded-xl border border-[#DDE3D5] bg-white p-2.5 text-[#10233F] shadow-sm transition hover:border-[#10233F] lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#DDE3D5] bg-[#F6F3EA] px-4 pb-5 pt-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link to="/pathway-finder" onClick={closeMobileMenu} className="rounded-xl bg-[#D8F23F] px-4 py-3 text-sm font-black text-[#10233F]">Explore the Pathway Finder</Link>
              <a href="#features" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-sm font-semibold text-[#60708A] hover:bg-white hover:text-[#10233F]">Platform</a>
              <a href="#how-it-works" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-sm font-semibold text-[#60708A] hover:bg-white hover:text-[#10233F]">How it works</a>
              <a href="#faq" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-sm font-semibold text-[#60708A] hover:bg-white hover:text-[#10233F]">FAQs</a>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#DDE3D5] pt-4">
                {user ? (
                  <>
                    <Link to={dashboardPath} onClick={closeMobileMenu} className="rounded-xl bg-[#10233F] px-4 py-3 text-center text-sm font-bold text-white">Open dashboard</Link>
                    <button onClick={handleLogout} className="rounded-xl border border-[#DDE3D5] bg-white px-4 py-3 text-sm font-bold text-[#10233F]">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/auth/login" onClick={closeMobileMenu} className="rounded-xl border border-[#DDE3D5] bg-white px-4 py-3 text-center text-sm font-bold text-[#10233F]">Sign in</Link>
                    <Link to="/register-school" onClick={closeMobileMenu} className="rounded-xl bg-[#10233F] px-4 py-3 text-center text-sm font-bold text-white">Start with Kimatu</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {children}

      <footer className="bg-[#10233F] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.8fr_0.8fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D8F23F]">
                  <img src="/kimatu-icon.png" alt="Kimatu Analytics" className="h-8 w-8 object-contain" />
                </span>
                <div>
                  <div className="text-lg font-black">Kimatu Analytics</div>
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#B9C8D9]">School operations, clarified</div>
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#B9C8D9]">One calm workspace for Kenyan schools to organise learners, assessments, fees, timetables, communication, and reports.</p>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#D8F23F]">Explore</h4>
              <div className="mt-4 flex flex-col gap-3 text-sm text-[#B9C8D9]">
                <a href="#features" className="transition hover:text-white">Platform</a>
                <a href="#how-it-works" className="transition hover:text-white">How it works</a>
                <Link to="/pathway-finder" className="transition hover:text-white">Pathway Finder</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#D8F23F]">Support</h4>
              <div className="mt-4 flex flex-col gap-3 text-sm text-[#B9C8D9]">
                <a href="#faq" className="transition hover:text-white">FAQs</a>
                <a href="https://wa.me/254114645757" target="_blank" rel="noreferrer" className="transition hover:text-white">Talk to our team</a>
                <PWAInstallButton variant="footer" />
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm font-bold"><GraduationCap className="h-4 w-4 text-[#D8F23F]" /> Built for Kenyan schools</div>
              <p className="mt-3 text-sm leading-6 text-[#B9C8D9]">CBE and 8-4-4 workflows, designed for phones, tablets, and school offices.</p>
              <Link to="/register-school" className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[#D8F23F] hover:text-white">Create a workspace <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-[#8FA3BA] md:flex-row md:items-center md:justify-between">
            <p>&copy; {new Date().getFullYear()} Kimatu Analytics. All rights reserved.</p>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              <Link to="/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/terms" className="hover:text-white">Terms</Link>
              <Link to="/cookie-policy" className="hover:text-white">Cookies</Link>
              <Link to="/data-processing-agreement" className="hover:text-white">Data protection</Link>
              <Link to="/confidentiality" className="hover:text-white">Confidentiality</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
