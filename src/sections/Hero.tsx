import { Link } from 'react-router';
import { ArrowRight, Sparkles, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function DownloadAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleDownload = async () => {
    if (deferredPrompt) {
      // Show native browser install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isInstalled) {
      alert('CBE-Analytics is already installed on your device!');
    } else {
      // Fallback for browsers that do not support beforeinstallprompt (e.g. Safari iOS)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('To install on iOS: Tap the Share button (📤) at the bottom of Safari → then tap "Add to Home Screen"');
      } else {
        alert('To install: Open this site in Chrome or Edge, then tap the browser menu (⋮) → "Install App" or "Add to Home Screen"');
      }
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-green-700 transition-colors"
    >
      <Smartphone className="w-4 h-4" /> {isInstalled ? 'App Installed ✓' : 'Download App'}
    </button>
  );
}

export default function Hero() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
  const today = currentTime.getDate();
  const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  useEffect(() => {
    const cards = cardsRef.current?.querySelectorAll('.hero-card');
    cards?.forEach((card, i) => {
      const el = card as HTMLElement;
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
      setTimeout(() => {
        el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100 + i * 100);
    });
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#F5F3EF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto">
          {/* Main Hero Card - Dark */}
          <div className="hero-card md:col-span-7 md:row-span-2 bg-[#1A1A1A] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-200">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#E6F24B]" />
                <span className="text-sm text-gray-400">Kenya&apos;s #1 School Platform</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
                A Smart School
              </h1>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-[#E6F24B]">
                Management System
              </h1>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-gray-300">Smart System and Workflow</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span className="text-sm text-gray-300">Flexible System and Workflow</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <span className="text-sm text-gray-300">Real Time Collaboration</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                <Link to="/auth/register" className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#1d4ed8] transition-colors">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/auth/login" className="inline-flex items-center gap-2 border border-gray-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                  Login
                </Link>
                <DownloadAppButton />
              </div>
            </div>
            {/* Mini Dashboard Preview */}
            <div className="relative mt-4 bg-[#2A2A2A] rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="ml-auto text-xs text-gray-500">Dashboard Preview</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#E6F24B]/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#E6F24B]">2,000+</div>
                  <div className="text-[10px] text-gray-400">Schools</div>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">500K+</div>
                  <div className="text-[10px] text-gray-400">Students</div>
                </div>
                <div className="bg-orange-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-orange-400">50K+</div>
                  <div className="text-[10px] text-gray-400">Teachers</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex-1 h-8 bg-gray-700/50 rounded flex items-end p-1 gap-1">
                  {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#2563EB] rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SaaS Card */}
          <div className="hero-card md:col-span-5 bg-[#F0F0F0] rounded-2xl p-6 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium bg-white px-3 py-1 rounded-full border border-gray-200">SaaS Software</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-[#111111] mb-4">
              Easy-to-use SaaS software for educational institutions.
            </p>
            <div className="flex items-end justify-between">
              <div className="flex -space-x-2">
                {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'].map((color, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                    {['T', 'S', 'P', 'A'][i]}
                  </div>
                ))}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#111111]">98%</div>
                <div className="text-xs text-gray-500">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="hero-card md:col-span-3 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="text-xs text-gray-500 mb-1">Performance</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-[#111111]">32%</span>
              <span className="text-xs text-green-500 font-medium">More</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '32%' }} />
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl font-bold text-[#111111]">28%</span>
              <span className="text-xs text-blue-500 font-medium">Faster</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '28%' }} />
            </div>
          </div>

          {/* Chart Card */}
          <div className="hero-card md:col-span-5 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#111111]">Revenue Growth</span>
              <span className="text-xs text-green-500 font-medium">+24.5%</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {[30, 45, 35, 60, 50, 75, 65, 80, 70, 85, 78, 90].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div 
                    className="w-full bg-[#2563EB] rounded-t-sm transition-all duration-500" 
                    style={{ height: `${h}%`, opacity: 0.3 + (i / 20) }} 
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>Jan</span>
              <span>Jun</span>
              <span>Dec</span>
            </div>
          </div>

          {/* Big Number Card */}
          <div className="hero-card md:col-span-4 md:row-span-2 bg-white rounded-2xl p-6 border-4 border-[#1A1A1A] relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-200">
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-2">2,000+</div>
              <p className="text-sm text-gray-500 mb-4">Schools Using CBE-Analytics</p>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {['CBE', '8-4-4', 'Both'].map((tag, i) => (
                <span key={i} className="text-xs bg-[#E6F24B] px-3 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
            <div className="bg-[#E6F24B]/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-[#1A1A1A]">All-in-one</div>
              <p className="text-xs text-gray-600">School operations, analytics, and communication</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#E6F24B] rounded-full opacity-20" />
          </div>

          {/* Calendar Card */}
          <div className="hero-card md:col-span-4 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#2563EB] font-mono tabular-nums">{formatTime(currentTime)}</div>
              <div className="text-sm text-gray-500 mb-3">{formatDate(currentTime)}</div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-gray-400 font-medium">{d}</div>
                ))}
                {Array.from({ length: adjustedFirstDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <div 
                    key={i} 
                    className={`py-1 rounded ${i + 1 === today ? 'bg-[#2563EB] text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
