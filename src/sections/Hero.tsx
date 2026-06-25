import { Link } from 'react-router';
import { ArrowRight, Sparkles, MessageCircle, TrendingUp, Users, BookOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function WhatsAppButton() {
  const handleWhatsApp = () => {
    window.open('https://wa.me/254114645757', '_blank');
  };

  return (
    <button
      onClick={handleWhatsApp}
      className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
    >
      <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
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
      {/* Subtle pattern background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A365D' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto">
          {/* Main Hero Card - Dark with Kimatu Branding */}
          <div className="hero-card md:col-span-7 md:row-span-2 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-200"
               style={{ background: 'linear-gradient(135deg, #1A365D 0%, #2D4A7C 50%, #1A365D 100%)' }}>
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #D4AF37, #F0D060, #D4AF37)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-sm text-gray-300">Kenya&apos;s Leading School Platform</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
                Kimatu Analytics
              </h1>
              <p className="text-lg md:text-xl font-medium mb-2" style={{ color: '#D4AF37' }}>
                Smarter Schools, Brighter Futures
              </p>
              <p className="text-sm text-gray-300 mb-6">
                School Analytics Simplified — Manage learners, learning areas, assessments, fees, and report cards all in one place.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span className="text-sm text-gray-300">CBE &amp; 8-4-4 Curriculum Support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span className="text-sm text-gray-300">Pre-Primary to Senior School</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <span className="text-sm text-gray-300">Real-Time Collaboration &amp; Analytics</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                <Link to="/get-started" className="inline-flex items-center gap-2 bg-white text-[#1A365D] px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <WhatsAppButton />
              </div>
            </div>
            {/* Mini Dashboard Preview */}
            <div className="relative mt-4 bg-[#0F2240] rounded-xl p-4 border border-[#2D4A7C]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="ml-auto text-xs text-gray-500">Dashboard Preview</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#D4AF37]/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#D4AF37]">2,000+</div>
                  <div className="text-[10px] text-gray-400">Schools</div>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">500K+</div>
                  <div className="text-[10px] text-gray-400">Learners</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-400">50K+</div>
                  <div className="text-[10px] text-gray-400">Teachers</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex-1 h-8 bg-gray-700/50 rounded flex items-end p-1 gap-1">
                  {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: 'linear-gradient(to top, #D4AF37, #1A365D)' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Curriculum Support Card */}
          <div className="hero-card md:col-span-5 rounded-2xl p-6 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200"
               style={{ background: 'linear-gradient(135deg, #F8F6F0 0%, #FFFFFF 100%)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium bg-[#1A365D] text-white px-3 py-1 rounded-full">Curricula Supported</span>
              <BookOpen className="w-5 h-5 text-[#1A365D]" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#1A365D]/5 rounded-xl">
                <div className="w-10 h-10 bg-[#1A365D] rounded-lg flex items-center justify-center text-white text-xs font-bold">CBE</div>
                <div>
                  <div className="text-sm font-semibold text-[#111111]">Competency Based Education</div>
                  <div className="text-xs text-gray-500">PP1 - Senior School</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#D4AF37]/10 rounded-xl">
                <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center text-white text-xs font-bold">8-4-4</div>
                <div>
                  <div className="text-sm font-semibold text-[#111111]">8-4-4 System</div>
                  <div className="text-xs text-gray-500">Form 1 - Form 4</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {['PP1', 'PP2', 'G1-6', 'G7-9', 'G10-12'].map((tag, i) => (
                <span key={i} className="text-xs bg-[#1A365D]/10 text-[#1A365D] px-2 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="hero-card md:col-span-3 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#1A365D]" />
              <span className="text-xs text-gray-500 font-medium">Performance</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111111]">98%</span>
                <span className="text-xs text-green-500 font-medium">Satisfaction</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1A365D] rounded-full" style={{ width: '98%' }} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111111]">35%</span>
                <span className="text-xs text-[#D4AF37] font-medium">Efficiency</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
          </div>

          {/* Analytics Preview Card */}
          <div className="hero-card md:col-span-5 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#111111]">School Analytics</span>
              <span className="text-xs text-[#D4AF37] font-medium">+24.5%</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {[30, 45, 35, 60, 50, 75, 65, 80, 70, 85, 78, 90].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div 
                    className="w-full rounded-t-sm transition-all duration-500" 
                    style={{ height: `${h}%`, opacity: 0.3 + (i / 20), background: i % 2 === 0 ? '#1A365D' : '#D4AF37' }} 
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

          {/* Schools Counter Card */}
          <div className="hero-card md:col-span-4 md:row-span-2 bg-white rounded-2xl p-6 border-4 border-[#1A365D] relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4AF37]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="text-center relative z-10">
              <Users className="w-8 h-8 text-[#1A365D] mx-auto mb-3" />
              <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color: '#1A365D' }}>2,000+</div>
              <p className="text-sm text-gray-500 mb-4">Schools Trust Kimatu Analytics</p>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {['CBE', '8-4-4', 'Both'].map((tag, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full font-medium" 
                      style={{ background: i === 1 ? '#D4AF37' : '#1A365D', color: 'white' }}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #1A365D, #2D4A7C)' }}>
              <div className="text-2xl font-bold text-white">All-in-one</div>
              <p className="text-xs text-gray-300">School operations, analytics, and communication</p>
            </div>
          </div>

          {/* Calendar Card */}
          <div className="hero-card md:col-span-4 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1A365D] font-mono tabular-nums">{formatTime(currentTime)}</div>
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
                    className={`py-1 rounded ${i + 1 === today ? 'text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                    style={i + 1 === today ? { background: 'linear-gradient(135deg, #1A365D, #D4AF37)' } : {}}
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
