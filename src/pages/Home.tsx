import HeroCarousel from '@/sections/HeroCarousel';
import Features from '@/sections/Features';
import Pricing from '@/sections/Pricing';
import HowItWorks from '@/sections/HowItWorks';
import Testimonials from '@/sections/Testimonials';
import FAQ from '@/sections/FAQ';
import CTA from '@/sections/CTA';
import WhatsAppButton from '@/components/WhatsAppButton';
import { usePWA } from '@/hooks/usePWA';
import { Smartphone } from 'lucide-react';
import SEO from '@/components/SEO';
import PathwayFinder from '@/components/PathwayFinder';

export default function Home() {
  const { isInstallable, isInstalled, install } = usePWA();

  const handleInstallClick = async () => {
    if (isInstalled) {
      alert('Kimatu Analytics is already installed on your device!');
      return;
    }
    await install();
  };

  return (
    <>
      <SEO
        title="Kimatu Analytics - Smarter Schools, Brighter Futures"
        description="Kimatu Analytics is Kenya's leading school management system. Manage learners, learning areas, assessments, fees, and report cards. Supports CBE and 8-4-4 curricula for Pre-Primary, Primary, Junior, and Senior schools."
        path="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Kimatu Analytics',
          alternateName: 'Kimatu',
          url: 'https://kimatu.company',
          slogan: 'Smarter Schools, Brighter Futures',
          description: 'Kenya\'s leading school management system for student results, report cards, fee management, and performance tracking. Supports CBE and 8-4-4 curricula.',
          applicationCategory: 'EducationApplication',
          operatingSystem: 'Web',
          inLanguage: 'en-KE',
          offers: { '@type': 'Offer', priceCurrency: 'KES', description: 'Affordable school management plans for Kenyan schools' },
          author: { '@type': 'Organization', name: 'Kimatu Analytics', url: 'https://kimatu.company' },
          keywords: 'Kimatu, Analytics, School Management, CBE, 8-4-4, Kenya, Education, School System, Learner Management',
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
      <HeroCarousel />

      {/* Pathway Finder Section */}
      <section id="pathway-finder" className="py-16 md:py-20 bg-[#111827]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <span className="text-sm font-medium text-[#60a5fa] mb-2 block">PATHWAY FINDER</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Find the Right Senior School Pathway
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Answer a few questions about your interests and grades to discover whether STEM, Social Sciences, or Arts &amp; Sports Science is the best fit for you.
            </p>
          </div>
          <PathwayFinder />
        </div>
      </section>

      <Features />
      <Pricing />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
      <WhatsAppButton />
    </>
  );
}
