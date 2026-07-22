import { Link } from 'react-router-dom';
import { ArrowRight, LogIn, MessageCircle, Sparkles } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

const heroImages = [
  { src: '/images/hero1.jpg', alt: 'Kenyan secondary students collaborating with a tablet in class' },
  { src: '/images/hero2.jpg', alt: 'Kenyan junior students doing STEM lab work together' },
  { src: '/images/hero3.jpg', alt: 'Kenyan primary pupils learning with tablets in class' },
  { src: '/images/hero4.jpg', alt: 'Kenyan senior students collaborating with laptops in the library' },
  { src: '/images/hero5.jpg', alt: 'Kenyan students celebrating academic success outdoors' },
];

function WhatsAppButton() {
  return (
    <button
      onClick={() => window.open('https://wa.me/254114645757', '_blank')}
      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
    >
      <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
    </button>
  );
}

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const loadedRef = useRef(0);

  // Preload all images so first paint is never white
  useEffect(() => {
    let cancelled = false;
    loadedRef.current = 0;
    heroImages.forEach((image) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedRef.current += 1;
        if (!cancelled && loadedRef.current >= heroImages.length) {
          setImagesReady(true);
        }
      };
      img.src = image.src;
    });
    // Failsafe: show after 1.2s even if some images lag
    const t = setTimeout(() => {
      if (!cancelled) setImagesReady(true);
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  }, []);

  useEffect(() => {
    if (isPaused || !imagesReady) return;
    const interval = setInterval(nextSlide, 5500);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, imagesReady]);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0F1729]"
      style={{ height: '100vh', minHeight: '600px' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Continuous right-to-left track — no white flash between slides */}
      <div
        className="absolute inset-0 flex h-full transition-transform duration-[900ms] ease-in-out will-change-transform"
        style={{
          width: `${heroImages.length * 100}%`,
          transform: `translateX(-${(currentIndex * 100) / heroImages.length}%)`,
        }}
      >
        {heroImages.map((image, index) => (
          <div
            key={index}
            className="relative h-full shrink-0"
            style={{ width: `${100 / heroImages.length}%` }}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>
        ))}
      </div>

      {/* Soft overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/55 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/30 z-[1]" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Kenya&apos;s Leading School Platform</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white mb-4 tracking-tight leading-none drop-shadow-lg">
            Kimatu Analytics
          </h1>

          <p className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 drop-shadow-md" style={{ color: '#D4AF37' }}>
            Smarter Schools, Brighter Futures
          </p>

          <p className="text-lg md:text-xl text-white mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            School Analytics Simplified. Manage learners, learning areas, assessments, fees, and report cards all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/auth/login">
              <span
                className="relative inline-flex items-center gap-3 px-10 py-4 rounded-full text-lg font-bold shadow-2xl cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
                  color: '#1A365D',
                  boxShadow: '0 0 30px rgba(212, 175, 55, 0.5), 0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
              >
                <LogIn className="w-6 h-6" />
                Login to Your School
              </span>
            </Link>
            <Link to="/register-school">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border-2 border-white/40 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white/20 transition-colors cursor-pointer">
                Get Started <ArrowRight className="w-5 h-5" />
              </span>
            </Link>
          </div>

          <WhatsAppButton />

          <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
            {[
              ['2,000+', 'Schools'],
              ['500K+', 'Learners'],
              ['50K+', 'Teachers'],
              ['98%', 'Satisfaction'],
            ].map(([v, l]) => (
              <span key={l} className="text-white text-center drop-shadow-md">
                <span className="block text-2xl font-bold">{v}</span>
                <span className="text-sm text-gray-100">{l}</span>
              </span>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex ? 'w-8 h-2 bg-[#D4AF37]' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
