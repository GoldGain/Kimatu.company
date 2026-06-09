import Hero from '@/sections/Hero';
import Features from '@/sections/Features';
import HowItWorks from '@/sections/HowItWorks';
import Testimonials from '@/sections/Testimonials';
import FAQ from '@/sections/FAQ';
import CTA from '@/sections/CTA';
import { usePWA } from '@/hooks/usePWA';
import { Smartphone } from 'lucide-react';

export default function Home() {
  const { isInstallable, isInstalled, install } = usePWA();

  const handleInstallClick = async () => {
    if (isInstalled) {
      alert('CBE-Analytics is already installed on your device!');
      return;
    }
    await install();
  };

  return (
    <>
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 font-medium hover:bg-green-700 transition-colors animate-in slide-in-from-bottom-4"
        >
          <Smartphone className="w-4 h-4" /> Download App
        </button>
      )}
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}
