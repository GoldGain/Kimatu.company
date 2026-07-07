import { useRef, useEffect, useState } from 'react';
import { Check, Star, MessageCircle, Calculator, School, Users, Building2, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { initializePayment, calculatePaymentAmount, generatePaymentReference } from '@/lib/paystack';
import { toast } from 'sonner';

interface PricingPlan {
  name: string;
  icon: React.ReactNode;
  description: string;
  oneTime: number;
  annualPerLearner: number;
  termlyPerLearner: number;
  flatAnnual: number;
  flatTermly: number;
  bestFor: string;
  featured: boolean;
  features: string[];
}

const plans: PricingPlan[] = [
  {
    name: 'Essential',
    icon: <School className="w-6 h-6" />,
    description: 'Perfect for small schools getting started',
    oneTime: 8000,
    annualPerLearner: 0,
    termlyPerLearner: 0,
    flatAnnual: 2000,
    flatTermly: 1000,
    bestFor: 'Small schools',
    featured: false,
    features: [
      'Learner Management',
      'Learning Areas (Up to 8)',
      'Assessment Upload',
      'Basic Report Cards',
      'Fee Tracking',
      'CBE & 8-4-4 Support',
      'Parent Portal',
      'Student Portal',
      'Email Support',
    ],
  },
  {
    name: 'Standard',
    icon: <Users className="w-6 h-6" />,
    description: 'Ideal for growing schools',
    oneTime: 10000,
    annualPerLearner: 15,
    termlyPerLearner: 5,
    flatAnnual: 0,
    flatTermly: 0,
    bestFor: 'Growing schools',
    featured: true,
    features: [
      'Everything in Essential',
      'Unlimited Learning Areas',
      'Advanced Report Cards with Photos',
      'Bulk Report Card Generation',
      'Fee Management with Invoices',
      'Timetable Generator',
      'Analytics Dashboard',
      'Teacher Management',
      'Class Teacher Dashboard',
      'Subject Teacher Dashboard',
      'Priority Support',
    ],
  },
  {
    name: 'Premium',
    icon: <Building2 className="w-6 h-6" />,
    description: 'For large schools with advanced needs',
    oneTime: 15000,
    annualPerLearner: 25,
    termlyPerLearner: 10,
    flatAnnual: 0,
    flatTermly: 0,
    bestFor: 'Large schools',
    featured: false,
    features: [
      'Everything in Standard',
      'Bulk Result Upload',
      'Advanced Analytics & Trends',
      'Reseller Portal Access',
      'Custom Branding',
      'Data Export/Import',
      'Multiple Admin Accounts',
      'Stream Dashboard',
      'Homework Management',
      'Announcement System',
      'Dedicated Account Manager',
    ],
  },
];

type BillingCycle = 'annual' | 'termly';

function PricingCard({ plan, billingCycle, learnerCount }: { plan: PricingPlan; billingCycle: BillingCycle; learnerCount: number }) {
  const getPrice = () => {
    if (plan.name === 'Essential') {
      return billingCycle === 'annual' ? plan.flatAnnual : plan.flatTermly;
    }
    const perLearner = billingCycle === 'annual' ? plan.annualPerLearner : plan.termlyPerLearner;
    return perLearner * learnerCount;
  };

  const price = getPrice();
  const [paying, setPaying] = useState(false);

  const handlePayNow = async () => {
    if (price <= 0) {
      toast.info('Please contact us via WhatsApp for Essential plan signup');
      return;
    }
    setPaying(true);
    try {
      const reference = generatePaymentReference('school');
      await initializePayment({
        email: 'school@kimatu.company',
        amount: price * 100, // Convert to kobo
        reference,
        metadata: {
          plan: plan.name,
          billing_cycle: billingCycle,
          learner_count: learnerCount,
          amount_kes: price,
        },
        onSuccess: (response) => {
          toast.success(`Payment successful! Reference: ${response.reference}`);
          // TODO: Call your backend to verify and activate the plan
        },
        onCancel: () => {
          toast.info('Payment cancelled');
        },
        onError: (error) => {
          toast.error('Payment failed: ' + error.message);
        },
      });
    } catch (error: any) {
      toast.error('Failed to initialize payment: ' + error.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={`relative rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
      plan.featured 
        ? 'bg-gradient-to-b from-[#1A365D] to-[#2D4A7C] text-white shadow-2xl scale-105 md:scale-110 z-10' 
        : 'bg-white border border-gray-200 hover:border-[#D4AF37]/50'
    }`}>
      {plan.featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-[#1A365D] px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
          <Star className="w-3 h-3" /> Best Value
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          plan.featured ? 'bg-white/20' : 'bg-[#1A365D]/10'
        }`}>
          <span className={plan.featured ? 'text-white' : 'text-[#1A365D]'}>{plan.icon}</span>
        </div>
        <div>
          <h3 className={`text-xl font-bold ${plan.featured ? 'text-white' : 'text-[#111111]'}`}>{plan.name}</h3>
          <p className={`text-xs ${plan.featured ? 'text-gray-300' : 'text-gray-500'}`}>{plan.bestFor}</p>
        </div>
      </div>

      <p className={`text-sm mb-4 ${plan.featured ? 'text-gray-300' : 'text-gray-600'}`}>{plan.description}</p>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${plan.featured ? 'text-white' : 'text-[#111111]'}`}>
            Ksh {price.toLocaleString()}
          </span>
          <span className={`text-sm ${plan.featured ? 'text-gray-300' : 'text-gray-500'}`}>
            /{billingCycle === 'annual' ? 'year' : 'term'}
          </span>
        </div>
        <div className={`text-xs mt-1 ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>
          One-time setup: Ksh {plan.oneTime.toLocaleString()}
        </div>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.featured ? 'text-[#D4AF37]' : 'text-green-500'}`} />
            <span className={`text-xs ${plan.featured ? 'text-gray-300' : 'text-gray-600'}`}>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <button
          onClick={handlePayNow}
          disabled={paying}
          className={`block w-full text-center py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            plan.featured 
              ? 'bg-white text-[#1A365D] hover:bg-gray-100 shadow-lg disabled:opacity-70' 
              : 'bg-[#1A365D] text-white hover:bg-[#2D4A7C] disabled:opacity-70'
          }`}
        >
          {paying ? 'Processing...' : <><CreditCard className="w-4 h-4" /> Pay Now</>}
        </button>
        <Link 
          to="/get-started"
          className={`block w-full text-center py-2 rounded-full text-xs font-medium transition-all ${
            plan.featured 
              ? 'bg-white/10 text-white hover:bg-white/20 border border-white/30' 
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Get Started
        </Link>
        <button 
          onClick={() => window.open('https://wa.me/254114645757', '_blank')}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium transition-all ${
            plan.featured 
              ? 'bg-white/10 text-white hover:bg-white/20 border border-white/30' 
              : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
          }`}
        >
          <MessageCircle className="w-3 h-3" /> WhatsApp Inquiry
        </button>
      </div>
    </div>
  );
}

export default function Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [learnerCount, setLearnerCount] = useState(100);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.pricing-card');
            cards.forEach((card, i) => {
              setTimeout(() => {
                (card as HTMLElement).style.opacity = '1';
                (card as HTMLElement).style.transform = 'translateY(0)';
              }, i * 150);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="pricing" className="py-16 md:py-20 bg-[#F5F3EF]" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <span className="text-sm font-medium text-[#D4AF37] mb-2 block">PRICING</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1A365D' }}>
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your school. All plans include CBE &amp; 8-4-4 support, free updates, and dedicated support.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-full p-1 shadow-md border border-gray-200 inline-flex">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'annual' 
                  ? 'bg-[#1A365D] text-white shadow' 
                  : 'text-gray-600 hover:text-[#1A365D]'
              }`}
            >
              Annual
            </button>
            <button
              onClick={() => setBillingCycle('termly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'termly' 
                  ? 'bg-[#1A365D] text-white shadow' 
                  : 'text-gray-600 hover:text-[#1A365D]'
              }`}
            >
              Termly
            </button>
          </div>
        </div>

        {/* Learner Count Calculator for Standard/Premium */}
        <div className="max-w-md mx-auto mb-10 bg-white rounded-2xl p-5 shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-5 h-5 text-[#1A365D]" />
            <span className="text-sm font-semibold text-[#111111]">Pricing Calculator</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Number of Learners</label>
              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                value={learnerCount}
                onChange={(e) => setLearnerCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A365D]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>10</span>
                <span>1000</span>
                <span>2000</span>
              </div>
            </div>
            <div className="bg-[#1A365D]/5 rounded-xl px-4 py-2 text-center min-w-[80px]">
              <div className="text-2xl font-bold text-[#1A365D]">{learnerCount}</div>
              <div className="text-[10px] text-gray-500">Learners</div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-center pricing-cards-container">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className="pricing-card opacity-0 translate-y-10 transition-all duration-500"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <PricingCard plan={plan} billingCycle={billingCycle} learnerCount={learnerCount} />
            </div>
          ))}
        </div>

        {/* Paystack Payment Note */}
        <div className="mt-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 text-[#1A365D] px-5 py-2.5 rounded-full text-sm font-medium">
            <Star className="w-4 h-4" />
            Secure Paystack payment — Ksh 50 per learner per term
          </div>
          <p className="text-xs text-gray-500">
            Paystack accepts M-Pesa, Bank Cards, and Bank Transfer
          </p>
        </div>
      </div>
    </section>
  );
}
