import { Link } from 'react-router';
import { ArrowRight, Sparkles, MessageCircle, TrendingUp, Users, BookOpen, GraduationCap, School, Award } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function FloatingIcon({ icon: Icon, className, delay = 0 }: { icon: React.ElementType; className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
        <Icon className="w-5 h-5 text-white/80" />
      </div>
    </motion.div>
  );
}

function WhatsAppButton() {
  const handleWhatsApp = () => {
    window.open('https://wa.me/254114645757', '_blank');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleWhatsApp}
      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
    >
      <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
    </motion.button>
  );
}

export default function Hero() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(statsRef, { once: true });
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

  // Legacy animation fallback (kept for non-motion elements)
  useEffect(() => {
    const cards = cardsRef.current?.querySelectorAll('.hero-card-legacy');
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

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
  };

  return (
    <section className="relative overflow-hidden bg-[#F5F3EF]">
      {/* Subtle pattern background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A365D' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        <motion.div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Main Hero Card - Dark with Kimatu Branding */}
          <motion.div variants={cardVariants} className="hero-card md:col-span-7 md:row-span-2 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-300"
               style={{ background: 'linear-gradient(135deg, #1A365D 0%, #2D4A7C 50%, #1A365D 100%)' }}>
            {/* Floating education icons */}
            <FloatingIcon icon={GraduationCap} className="top-4 right-16" delay={0} />
            <FloatingIcon icon={BookOpen} className="top-16 right-4" delay={1} />
            <FloatingIcon icon={Award} className="bottom-20 right-8" delay={2} />
            {/* Animated glow */}
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #D4AF37, #F0D060, #D4AF37)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-base text-gray-300 font-medium">Kenya&apos;s Leading School Platform</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3 leading-tight">
                Kimatu Analytics
              </h1>
              <p className="text-xl md:text-2xl font-bold mb-3" style={{ color: '#D4AF37' }}>
                Smarter Schools, Brighter Futures
              </p>
              <p className="text-base md:text-lg text-gray-300 mb-6 leading-relaxed">
                School Analytics Simplified — Manage learners, learning areas, assessments, fees, and report cards all in one place.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span className="text-base text-gray-300 font-medium">CBE &amp; 8-4-4 Curriculum Support (Form 3 &amp; 4 only)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span className="text-base text-gray-300 font-medium">Pre-Primary to Senior School</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <span className="text-base text-gray-300 font-medium">Real-Time Collaboration &amp; Analytics</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                <Link to="/get-started">
                  <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 bg-white text-[#1A365D] px-6 py-3 rounded-full text-base font-bold hover:bg-gray-100 transition-colors shadow-lg cursor-pointer">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </motion.span>
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
                <div className="ml-auto text-sm text-gray-500 font-medium">Dashboard Preview</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#D4AF37]/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-[#D4AF37]">2,000+</div>
                  <div className="text-xs text-gray-400">Schools</div>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-400">500K+</div>
                  <div className="text-xs text-gray-400">Learners</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-400">50K+</div>
                  <div className="text-xs text-gray-400">Teachers</div>
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
          </motion.div>

          {/* Curriculum Support Card */}
          <motion.div variants={cardVariants} className="hero-card md:col-span-5 rounded-2xl p-6 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200"
               style={{ background: 'linear-gradient(135deg, #F8F6F0 0%, #FFFFFF 100%)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold bg-[#1A365D] text-white px-3 py-1 rounded-full">Curricula Supported</span>
              <BookOpen className="w-5 h-5 text-[#1A365D]" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#1A365D]/5 rounded-xl">
                <div className="w-10 h-10 bg-[#1A365D] rounded-lg flex items-center justify-center text-white text-xs font-bold">CBE</div>
                <div>
                  <div className="text-base font-bold text-[#111111]">Competency Based Education</div>
                  <div className="text-sm text-gray-500">PP1 - Senior School</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#D4AF37]/10 rounded-xl">
                <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center text-white text-xs font-bold">8-4-4</div>
                <div>
                  <div className="text-base font-bold text-[#111111]">8-4-4 System</div>
                  <div className="text-sm text-gray-500 font-medium">Form 3 &amp; Form 4 only</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['PP1', 'PP2', 'G1-6', 'G7-9', 'G10-12'].map((tag, i) => (
                <span key={i} className="text-sm bg-[#1A365D]/10 text-[#1A365D] px-3 py-1 rounded-full font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats Card */}
          <motion.div ref={statsRef} variants={cardVariants} className="hero-card md:col-span-3 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#1A365D]" />
              <span className="text-sm text-gray-500 font-semibold">Performance</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#111111]">98%</span>
                <span className="text-sm text-green-500 font-semibold">Satisfaction</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1A365D] rounded-full" style={{ width: '98%' }} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#111111]">35%</span>
                <span className="text-sm text-[#D4AF37] font-semibold">Efficiency</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#D4AF37] rounded-full"
                  initial={{ width: 0 }}
                  animate={isInView ? { width: '35%' } : { width: 0 }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Analytics Preview Card */}
          <motion.div variants={cardVariants} className="hero-card md:col-span-5 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold text-[#111111]">School Analytics</span>
              <span className="text-sm text-[#D4AF37] font-bold">+24.5%</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {[30, 45, 35, 60, 50, 75, 65, 80, 70, 85, 78, 90].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 flex flex-col justify-end"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                >
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${h}%`, opacity: 0.3 + (i / 20), background: i % 2 === 0 ? '#1A365D' : '#D4AF37' }}
                  />
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-400">
              <span>Jan</span>
              <span>Jun</span>
              <span>Dec</span>
            </div>
          </motion.div>

          {/* Schools Counter Card */}
          <motion.div variants={cardVariants} className="hero-card md:col-span-4 md:row-span-2 bg-white rounded-2xl p-6 border-4 border-[#1A365D] relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-200">
            <motion.div
              className="absolute top-0 right-0 w-20 h-20 bg-[#D4AF37]/20 rounded-full -translate-y-1/2 translate-x-1/2"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="text-center relative z-10">
              <Users className="w-8 h-8 text-[#1A365D] mx-auto mb-3" />
              <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color: '#1A365D' }}>2,000+</div>
              <p className="text-base text-gray-500 mb-4 font-medium">Schools Trust Kimatu Analytics</p>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {['CBE', '8-4-4', 'Both'].map((tag, i) => (
                <span key={i} className="text-sm px-3 py-1 rounded-full font-semibold" 
                      style={{ background: i === 1 ? '#D4AF37' : '#1A365D', color: 'white' }}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #1A365D, #2D4A7C)' }}>
              <div className="text-2xl font-bold text-white">All-in-one</div>
              <p className="text-base text-gray-300">School operations, analytics, and communication</p>
            </div>
          </motion.div>

          {/* Calendar Card */}
          <motion.div variants={cardVariants} className="hero-card md:col-span-4 bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-shadow duration-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1A365D] font-mono tabular-nums">{formatTime(currentTime)}</div>
              <div className="text-base text-gray-500 mb-3 font-medium">{formatDate(currentTime)}</div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-gray-400 font-bold">{d}</div>
                ))}
                {Array.from({ length: adjustedFirstDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <div 
                    key={i} 
                    className={`py-1 rounded font-medium ${i + 1 === today ? 'text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                    style={i + 1 === today ? { background: 'linear-gradient(135deg, #1A365D, #D4AF37)' } : {}}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
