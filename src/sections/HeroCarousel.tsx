import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  LogIn,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
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
      type="button"
      onClick={() => window.open('https://wa.me/254114645757', '_blank', 'noopener,noreferrer')}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15 active:scale-[0.98]"
    >
      <MessageCircle className="h-4 w-4 text-[#D8F23F]" /> Talk to our team
    </button>
  );
}

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const loadedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = 0;
    heroImages.forEach((image) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedRef.current += 1;
        if (!cancelled && loadedRef.current >= heroImages.length) setImagesReady(true);
      };
      img.src = image.src;
    });
    const timeout = window.setTimeout(() => {
      if (!cancelled) setImagesReady(true);
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((previous) => (previous + 1) % heroImages.length);
  }, []);

  const previousSlide = useCallback(() => {
    setCurrentIndex((previous) => (previous - 1 + heroImages.length) % heroImages.length);
  }, []);

  useEffect(() => {
    if (isPaused || !imagesReady) return;
    const interval = window.setInterval(nextSlide, 6000);
    return () => window.clearInterval(interval);
  }, [imagesReady, isPaused, nextSlide]);

  return (
    <section
      className="relative overflow-hidden bg-[#10233F] text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 80% 10%, rgba(216,242,63,.13), transparent 28%), radial-gradient(circle at 10% 85%, rgba(69,126,255,.18), transparent 30%)' }} />
      <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-12 top-40 h-56 w-56 rounded-full border border-[#D8F23F]/20" />

      <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-8 lg:py-16">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8F23F]/30 bg-[#D8F23F]/10 px-3.5 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#E7F995]">
            <Sparkles className="h-3.5 w-3.5" /> The school operating room
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
            Make every school day easier to run.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-[#C5D0DE] sm:text-lg">
            Kimatu brings learners, teachers, assessments, fees, timetables, and families into one clear view—so your team can spend less time chasing records and more time moving learning forward.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/register-school" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D8F23F] px-6 py-3.5 text-sm font-black text-[#10233F] shadow-[5px_5px_0_0_rgba(216,242,63,.2)] transition hover:-translate-y-0.5 hover:bg-[#E7F995] active:scale-[0.98]">
              Build your school workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15 active:scale-[0.98]">
              <LogIn className="h-4 w-4" /> Sign in to Kimatu
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <WhatsAppButton />
            <Link to="/pathway-finder" className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-[#D8F23F] transition hover:bg-white/10">
              <Compass className="h-4 w-4" /> Explore pathways
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-white/15 border-y border-white/15 py-5">
            {[
              ['CBE + 8-4-4', 'Curriculum-ready'],
              ['One view', 'For every role'],
              ['Mobile first', 'Made for Kenya'],
            ].map(([value, label]) => (
              <div key={label} className="px-3 first:pl-0 last:pr-0">
                <p className="text-sm font-black text-white sm:text-base">{value}</p>
                <p className="mt-1 text-[0.68rem] uppercase tracking-[0.13em] text-[#91A5BC]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:mr-0">
          <div className="absolute -left-4 top-8 h-28 w-28 rounded-[2rem] bg-[#D8F23F] opacity-90 sm:-left-8 sm:h-40 sm:w-40" />
          <div className="absolute -bottom-5 -right-4 h-28 w-28 rounded-[2rem] border border-[#D8F23F]/40 sm:-right-8 sm:h-40 sm:w-40" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[#0A182C] p-2 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:rounded-[2.5rem] sm:p-3">
            <div className="relative aspect-[4/4.5] overflow-hidden rounded-[1.5rem] sm:aspect-[5/4] sm:rounded-[2rem]">
              <div
                className="absolute inset-y-0 left-0 flex h-full transition-transform duration-700 ease-out will-change-transform"
                style={{
                  width: `${heroImages.length * 100}%`,
                  transform: `translateX(-${(currentIndex * 100) / heroImages.length}%)`,
                }}
              >
                {heroImages.map((image, index) => (
                  <div key={image.src} className="relative h-full shrink-0" style={{ width: `${100 / heroImages.length}%` }}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/85 via-transparent to-[#071426]/5" />
                  </div>
                ))}
              </div>

              <div className="absolute left-4 top-4 rounded-2xl border border-white/20 bg-[#10233F]/75 px-3 py-2 backdrop-blur-md sm:left-6 sm:top-6">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#D8F23F]">Live school view</p>
                <p className="mt-1 text-xs font-semibold text-white/90">Every learner. Every signal.</p>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-6 sm:left-6 sm:right-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#D8F23F]">Kimatu in action</p>
                  <p className="mt-1 max-w-[15rem] text-sm font-semibold leading-5 text-white sm:text-base">From the office desk to the classroom floor.</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-right text-[#10233F] shadow-xl">
                  <p className="text-lg font-black leading-none">{String(currentIndex + 1).padStart(2, '0')}</p>
                  <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.16em] text-[#60708A]">of 05</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between px-2 sm:px-4">
            <p className="text-xs font-semibold text-[#91A5BC]">Real schools. Clearer decisions.</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={previousSlide} aria-label="Previous school image" className="rounded-full border border-white/20 p-2 text-white transition hover:border-[#D8F23F] hover:text-[#D8F23F] active:scale-95">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5" aria-label="Choose school image">
                {heroImages.map((image, index) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Show school image ${index + 1}`}
                    aria-current={index === currentIndex ? 'true' : undefined}
                    className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-7 bg-[#D8F23F]' : 'w-1.5 bg-white/40 hover:bg-white/80'}`}
                  />
                ))}
              </div>
              <button type="button" onClick={nextSlide} aria-label="Next school image" className="rounded-full border border-white/20 p-2 text-white transition hover:border-[#D8F23F] hover:text-[#D8F23F] active:scale-95">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
