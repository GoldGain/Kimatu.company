import Hero from '@/sections/Hero';
import Features from '@/sections/Features';
import HowItWorks from '@/sections/HowItWorks';
import Testimonials from '@/sections/Testimonials';
import FAQ from '@/sections/FAQ';
import CTA from '@/sections/CTA';
import { usePWA } from '@/hooks/usePWA';
import { Smartphone } from 'lucide-react';
import SEO from '@/components/SEO';

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
      <SEO
        title="CBE-Analytics — Kenya's #1 CBC School Management Platform"
        description="CBE-Analytics is Kenya's leading Competency-Based Education (CBC) school management system. Manage student results, generate report cards, track performance for Grades 1-12 and 8-4-4 curricula. Trusted by schools across Kenya."
        path="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'CBE-Analytics',
          url: 'https://cbe-analytics.com',
          description: 'Kenya\'s leading CBC/CBE school management system for student results, report cards, and performance tracking.',
          applicationCategory: 'EducationApplication',
          operatingSystem: 'Web',
          inLanguage: 'en-KE',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES' },
          author: { '@type': 'Organization', name: 'CBE-Analytics', url: 'https://cbe-analytics.com' },
          keywords: 'CBE Analytics, CBC grading Kenya, school management system Kenya, competency based education, student results portal, CBC report card',
        }}
      />
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
