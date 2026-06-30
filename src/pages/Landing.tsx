import MainLayout from '@/components/layout/MainLayout';
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

export default function Landing() {
  const { isInstallable, isInstalled, install } = usePWA();

  const handleInstallClick = async () => {
    if (isInstalled) {
      alert('Kimatu Analytics is already installed on your device!');
      return;
    }
    await install();
  };

  return (
    <MainLayout>
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
          description: "Kenya's leading school management system for student results, report cards, fee management, and performance tracking. Supports CBE and 8-4-4 curricula.",
          applicationCategory: 'EducationApplication',
          operatingSystem: 'Web',
          inLanguage: 'en-KE',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES', description: 'Free trial available for 3 months' },
          author: { '@type': 'Organization', name: 'Kimatu Analytics', url: 'https://kimatu.company' },
          keywords: 'Kimatu, Analytics, School Management, CBE, 8-4-4, Kenya, Education, School System, Learner Management',
        }}
      />
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-20 right-4 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 font-medium hover:bg-green-700 transition-colors animate-in slide-in-from-bottom-4"
        >
          <Smartphone className="w-4 h-4" /> Download App
        </button>
      )}
      <HeroCarousel />
      <Features />
      <Pricing />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
      <WhatsAppButton />
    </MainLayout>
  );
}
