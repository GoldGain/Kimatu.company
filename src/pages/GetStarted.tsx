import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  School, 
  Users, 
  Building2, 
  Check, 
  Star,
  Calculator,
  MessageCircle,
  Send,
  GraduationCap
} from 'lucide-react';
import SEO from '@/components/SEO';
import WhatsAppButton from '@/components/WhatsAppButton';

type SchoolType = 'pre-primary' | 'primary' | 'junior' | 'senior' | 'mixed';
type Curriculum = 'cbe' | '8-4-4' | 'both';

interface FormData {
  schoolName: string;
  schoolType: SchoolType | '';
  curriculum: Curriculum | '';
  learnerCount: number;
  email: string;
  phone: string;
  address: string;
  plan: 'essential' | 'standard' | 'premium';
}

const planDetails = {
  essential: {
    name: 'Essential',
    icon: <School className="w-5 h-5" />,
    oneTime: 8000,
    annualFlat: 2000,
    termlyFlat: 1000,
    color: '#6B7280',
  },
  standard: {
    name: 'Standard',
    icon: <Users className="w-5 h-5" />,
    oneTime: 10000,
    annualPerLearner: 15,
    termlyPerLearner: 5,
    color: '#1A365D',
    featured: true,
  },
  premium: {
    name: 'Premium',
    icon: <Building2 className="w-5 h-5" />,
    oneTime: 15000,
    annualPerLearner: 25,
    termlyPerLearner: 10,
    color: '#D4AF37',
  },
};

const schoolTypeLabels: Record<SchoolType, string> = {
  'pre-primary': 'Pre-Primary (PP1, PP2)',
  'primary': 'Primary (Grade 1-6)',
  'junior': 'Junior School (Grade 7-9)',
  'senior': 'Senior School (Grade 10-12)',
  'mixed': 'Mixed (Multiple Levels)',
};

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    schoolType: '',
    curriculum: '',
    learnerCount: 100,
    email: '',
    phone: '',
    address: '',
    plan: 'standard',
  });
  const [billingCycle, setBillingCycle] = useState<'annual' | 'termly'>('annual');

  const calculateTotal = () => {
    const plan = planDetails[formData.plan];
    let recurring = 0;
    
    if (formData.plan === 'essential') {
      recurring = billingCycle === 'annual' ? plan.annualFlat : plan.termlyFlat;
    } else {
      const perLearner = billingCycle === 'annual' 
        ? (plan as any).annualPerLearner 
        : (plan as any).termlyPerLearner;
      recurring = perLearner * formData.learnerCount;
    }

    return {
      oneTime: plan.oneTime,
      recurring,
      total: plan.oneTime + recurring,
    };
  };

  const handleSubmit = async () => {
    const pricing = calculateTotal();
    const message = `Hello! I'm interested in Kimatu Analytics.

School Details:
- Name: ${formData.schoolName}
- Type: ${schoolTypeLabels[formData.schoolType as SchoolType]}
- Curriculum: ${formData.curriculum?.toUpperCase()}
- Learners: ${formData.learnerCount}
- Plan: ${planDetails[formData.plan].name}
- Billing: ${billingCycle}

Pricing:
- One-time: Ksh ${pricing.oneTime.toLocaleString()}
- Recurring: Ksh ${pricing.recurring.toLocaleString()}/${billingCycle === 'annual' ? 'year' : 'term'}
- Total First Payment: Ksh ${pricing.total.toLocaleString()}

I'd like to start my FREE 3-month trial!`;

    window.open(`https://wa.me/254114645757?text=${encodeURIComponent(message)}`, '_blank');
  };

  const pricing = calculateTotal();

  const updateForm = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    if (step === 2) {
      return formData.schoolName && formData.schoolType && formData.curriculum && formData.email && formData.phone;
    }
    return true;
  };

  return (
    <>
      <SEO
        title="Get Started - Kimatu Analytics"
        description="Start your free 3-month trial of Kimatu Analytics. Choose your plan, enter your school details, and get started in minutes."
        path="/get-started"
      />
      
      <div className="min-h-screen bg-[#F5F3EF]">
        {/* Header */}
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-[#1A365D] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Home</span>
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <img src="/kimatu-icon.png" alt="Kimatu" className="w-7 h-7 rounded" />
              <span className="font-bold" style={{ color: '#1A365D' }}>Kimatu</span>
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          {/* Progress */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    s === step ? 'bg-[#1A365D] text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Choose Plan */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#1A365D' }}>
                  Choose Your Plan
                </h1>
                <p className="text-gray-600">Select the plan that best fits your school's needs</p>
              </div>

              {/* Billing Toggle */}
              <div className="flex justify-center mb-6">
                <div className="bg-white rounded-full p-1 shadow border border-gray-200 inline-flex">
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      billingCycle === 'annual' ? 'bg-[#1A365D] text-white shadow' : 'text-gray-600'
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setBillingCycle('termly')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      billingCycle === 'termly' ? 'bg-[#1A365D] text-white shadow' : 'text-gray-600'
                    }`}
                  >
                    Termly
                  </button>
                </div>
              </div>

              {/* Plan Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {(Object.keys(planDetails) as Array<keyof typeof planDetails>).map((key) => {
                  const plan = planDetails[key];
                  const isSelected = formData.plan === key;
                  const recurring = key === 'essential' 
                    ? (billingCycle === 'annual' ? plan.annualFlat : plan.termlyFlat)
                    : ((billingCycle === 'annual' ? (plan as any).annualPerLearner : (plan as any).termlyPerLearner) * formData.learnerCount);

                  return (
                    <button
                      key={key}
                      onClick={() => updateForm({ plan: key })}
                      className={`relative rounded-2xl p-5 text-left transition-all duration-200 ${
                        isSelected 
                          ? 'ring-2 ring-[#1A365D] shadow-lg scale-[1.02]' 
                          : 'border border-gray-200 hover:border-gray-300 hover:shadow-md'
                      } ${key === 'standard' ? 'bg-gradient-to-b from-[#1A365D] to-[#2D4A7C] text-white' : 'bg-white'}`}
                    >
                      {key === 'standard' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#1A365D] px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3" /> Most Popular
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          key === 'standard' ? 'bg-white/20' : 'bg-[#1A365D]/10'
                        }`}>
                          <span className={key === 'standard' ? 'text-white' : 'text-[#1A365D]'}>{plan.icon}</span>
                        </div>
                        <div>
                          <div className={`font-bold ${key === 'standard' ? 'text-white' : 'text-[#111111]'}`}>{plan.name}</div>
                          <div className={`text-xs ${key === 'standard' ? 'text-gray-300' : 'text-gray-500'}`}>
                            {key === 'essential' ? 'Small schools' : key === 'standard' ? 'Growing schools' : 'Large schools'}
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-bold ${key === 'standard' ? 'text-white' : 'text-[#111111]'}`}>
                            Ksh {recurring.toLocaleString()}
                          </span>
                          <span className={`text-xs ${key === 'standard' ? 'text-gray-300' : 'text-gray-500'}`}>
                            /{billingCycle === 'annual' ? 'year' : 'term'}
                          </span>
                        </div>
                        <div className={`text-xs ${key === 'standard' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Setup: Ksh {plan.oneTime.toLocaleString()}
                        </div>
                      </div>
                      {isSelected && (
                        <div className={`absolute bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center ${
                          key === 'standard' ? 'bg-white' : 'bg-[#1A365D]'
                        }`}>
                          <Check className={`w-4 h-4 ${key === 'standard' ? 'text-[#1A365D]' : 'text-white'}`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-full font-bold text-white transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1A365D, #2D4A7C)' }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: School Details */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#1A365D' }}>
                  School Details
                </h1>
                <p className="text-gray-600">Tell us about your school so we can set everything up</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => updateForm({ schoolName: e.target.value })}
                    placeholder="e.g., Kimatu Primary School"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/20 outline-none transition-all"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Type *</label>
                    <select
                      value={formData.schoolType}
                      onChange={(e) => updateForm({ schoolType: e.target.value as SchoolType })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/20 outline-none transition-all bg-white"
                    >
                      <option value="">Select type</option>
                      {Object.entries(schoolTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum *</label>
                    <select
                      value={formData.curriculum}
                      onChange={(e) => updateForm({ curriculum: e.target.value as Curriculum })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/20 outline-none transition-all bg-white"
                    >
                      <option value="">Select curriculum</option>
                      <option value="cbe">CBE (Competency Based Education)</option>
                      <option value="8-4-4">8-4-4 System</option>
                      <option value="both">Both CBE &amp; 8-4-4</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Learners * 
                    <span className="text-gray-400 font-normal ml-1">(Current count: {formData.learnerCount})</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    value={formData.learnerCount}
                    onChange={(e) => updateForm({ learnerCount: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A365D] mb-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>10</span>
                    <span>500</span>
                    <span>1000</span>
                    <span>1500</span>
                    <span>2000</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateForm({ email: e.target.value })}
                      placeholder="school@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateForm({ phone: e.target.value })}
                      placeholder="+254 712 345 678"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => updateForm({ address: e.target.value })}
                    placeholder="Physical address of the school"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/20 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => canProceed() && setStep(3)}
                  disabled={!canProceed()}
                  className="flex-1 py-3 rounded-full font-bold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #1A365D, #2D4A7C)' }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#1A365D' }}>
                  Review &amp; Start Trial
                </h1>
                <p className="text-gray-600">Review your details and start your FREE 3-month trial</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* School Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-[#1A365D]" />
                    <h3 className="font-bold text-[#111111]">School Information</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">School Name:</span>
                      <span className="ml-2 font-medium">{formData.schoolName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium">{formData.schoolType ? schoolTypeLabels[formData.schoolType] : ''}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Curriculum:</span>
                      <span className="ml-2 font-medium">{formData.curriculum?.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Learners:</span>
                      <span className="ml-2 font-medium">{formData.learnerCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 font-medium">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2 font-medium">{formData.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="font-bold text-[#111111]">Pricing Summary</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-medium">{planDetails[formData.plan].name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Billing Cycle</span>
                      <span className="font-medium capitalize">{billingCycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">One-time Setup</span>
                      <span className="font-medium">Ksh {pricing.oneTime.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Recurring ({billingCycle})</span>
                      <span className="font-medium">Ksh {pricing.recurring.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold" style={{ color: '#1A365D' }}>
                      <span>First Payment</span>
                      <span>Ksh {pricing.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Trial Banner */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">FREE 3-Month Trial</div>
                  <p className="text-green-700 text-sm mb-3">
                    Start using Kimatu Analytics immediately — no payment required!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-green-600">
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Full access</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> No credit card</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Cancel anytime</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-full font-bold text-white transition-all hover:shadow-xl flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #1A365D, #2D4A7C)' }}
                >
                  <Send className="w-5 h-5" />
                  Start Free Trial via WhatsApp
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                >
                  Back to Edit Details
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-4">
                By starting your trial, you agree to our Terms of Service and Privacy Policy.
                Payment will be required after the 3-month trial period.
              </p>
            </div>
          )}
        </div>

        <WhatsAppButton />
      </div>
    </>
  );
}
