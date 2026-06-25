import { Link } from 'react-router';
import { ArrowRight, Sparkles, MessageCircle } from 'lucide-react';

export default function CTA() {
  const handleWhatsApp = () => {
    window.open('https://wa.me/254114645757', '_blank');
  };

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-[#1A1A1A] to-[#0F1729]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="rounded-3xl p-8 md:p-16 text-center relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #1A365D 0%, #2D4A7C 100%)' }}>
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-[#D4AF37]/20 rounded-full" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/10 rounded-full translate-x-1/4 -translate-y-1/4" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
              <Sparkles className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to Transform Your School?
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8 text-lg">
              Join 2,000+ schools across Kenya already using Kimatu Analytics to streamline management, 
              improve communication, and enhance learning outcomes. Smarter Schools, Brighter Futures.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg"
                style={{ color: '#1A365D' }}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
              </button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1"><span className="text-[#D4AF37]">✓</span> Free 3-month trial</span>
              <span className="flex items-center gap-1"><span className="text-[#D4AF37]">✓</span> No credit card required</span>
              <span className="flex items-center gap-1"><span className="text-[#D4AF37]">✓</span> CBE &amp; 8-4-4 support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
