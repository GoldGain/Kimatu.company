import { Link } from 'react-router';
import { ArrowRight, LogIn, MessageCircle, Sparkles, BookOpen, GraduationCap, Award } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const heroImages = [
  { src: '/images/hero1.jpg', alt: 'Students collaborating on analytics dashboard in a modern classroom' },
  { src: '/images/hero2.jpg', alt: 'Teacher presenting student performance analytics on smartboard' },
  { src: '/images/hero3.jpg', alt: 'Students focused on computers in a modern digital literacy lab' },
  { src: '/images/hero4.jpg', alt: 'Beautiful modern school campus with world-class facilities' },
  { src: '/images/hero5.jpg', alt: 'Happy students celebrating academic achievements with certificates and trophies' },
];

const featureBullets = [
  { icon: BookOpen, text: 'CBE & 8-4-4 Curriculum Support (Form 3 & 4 only)', color: '#D4AF37' },
  { icon: GraduationCap, text: 'Pre-Primary to Senior School', color: '#60A5FA' },
  { icon: Award, text: 'Real-Time Collaboration & Analytics', color: '#4ADE80' },
];

function WhatsAppButton() {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => window.open('https://wa.me/254114645757', '_blank')}
      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
    >
      <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
    </motion.button>
  );
}

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: '100vh', minHeight: '600px' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* RIGHT-TO-LEFT SLIDING CAROUSEL */}
      <div className="absolute inset-0 flex">
        <AnimatePresence initial={false} mode="popLayout">
          {heroImages.map((image, index) => (
            <motion.div
              key={index}
              className="absolute inset-0 flex-shrink-0"
              initial={{
                x: index === currentIndex ? '100%' : index < currentIndex ? '-100%' : '100%',
                opacity: 0
              }}
              animate={{
                x: index === currentIndex ? '0%' : index < currentIndex ? '-100%' : '100%',
                opacity: index === currentIndex ? 1 : 0
              }}
              exit={{
                x: index === currentIndex ? '0%' : index < currentIndex ? '-100%' : '100%',
                opacity: 0
              }}
              transition={{
                x: { duration: 0.8, ease: 'easeInOut' },
                opacity: { duration: 0.6, ease: 'easeInOut' }
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.style.background = 'linear-gradient(135deg, #1A365D 0%, #2D4A7C 50%, #1A365D 100%)';
                  }
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-[1]" />

      {/* Subtle animated particles/dots for depth */}
      <div className="absolute inset-0 z-[2] opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 10) % 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Kenya's Leading School Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white mb-4 tracking-tight leading-none"
          >
            Kimatu Analytics
          </motion.h1>

          {/* Gold Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
            style={{ color: '#D4AF37' }}
          >
            Smarter Schools, Brighter Futures
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            School Analytics Simplified. Manage learners, learning areas, assessments, fees, and report cards all in one place.
          </motion.p>

          {/* Feature Bullets */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-10"
          >
            {featureBullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-300">
                <div
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: bullet.color, animationDelay: `${i * 0.3}s` }}
                />
                <span className="text-sm font-medium">{bullet.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Link to="/auth/login">
              <motion.span
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="relative inline-flex items-center gap-3 px-10 py-4 rounded-full text-lg font-bold shadow-2xl cursor-pointer overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
                  color: '#1A365D',
                  boxShadow: '0 0 30px rgba(212, 175, 55, 0.5), 0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
              >
                <LogIn className="w-6 h-6" />
                Login to Your School
              </motion.span>
            </Link>
            <Link to="/get-started">
              <motion.span
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border-2 border-white/40 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white/20 transition-colors cursor-pointer"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </motion.span>
            </Link>
          </motion.div>

          {/* WhatsApp Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
          >
            <WhatsAppButton />
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="flex flex-wrap items-center justify-center gap-8 mt-12"
          >
            <span className="text-white text-center">
              <span className="block text-2xl font-bold">2,000+</span>
              <span className="text-sm text-gray-300">Schools</span>
            </span>
            <span className="text-white text-center">
              <span className="block text-2xl font-bold">500K+</span>
              <span className="text-sm text-gray-300">Learners</span>
            </span>
            <span className="text-white text-center">
              <span className="block text-2xl font-bold">50K+</span>
              <span className="text-sm text-gray-300">Teachers</span>
            </span>
            <span className="text-white text-center">
              <span className="block text-2xl font-bold">98%</span>
              <span className="text-sm text-gray-300">Satisfaction</span>
            </span>
          </motion.div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-[#D4AF37]'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-2 bg-white/50 rounded-full mt-2 animate-pulse" />
        </div>
      </motion.div>
    </section>
  );
}
