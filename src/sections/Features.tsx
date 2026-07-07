import { useEffect, useRef } from 'react';
import { 
  Users, 
  BookOpen, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Calendar, 
  Shield, 
  GraduationCap,
  Printer,
  Layers,
  Receipt,
  Megaphone,
  Download,
  Smartphone,
  UserCog,
  Lock
} from 'lucide-react';

const features = [
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Learner Management',
    description: 'Add, edit, search, and manage complete learner records with photos, admission numbers, parent contacts, and academic history.',
    color: 'bg-[#1A365D]',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Learning Areas',
    description: 'Manage learning areas for all levels — PP1, PP2, Primary, Junior, and Senior. Full CBE support plus 8-4-4 for Form 3 & 4.',
    color: 'bg-[#D4AF37]',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Assessments & Results',
    description: 'Upload and manage exam scores, auto-calculate CBE grades (EE, ME, AE, BE) and 8-4-4 grades. Smart subject presets by level.',
    color: 'bg-blue-600',
  },
  {
    icon: <Printer className="w-6 h-6" />,
    title: 'Report Cards',
    description: 'Generate beautiful PDF report cards with student photos, school logo, signatures, and performance trend graphs.',
    color: 'bg-green-600',
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Bulk Report Cards',
    description: 'Generate one-page-per-student bulk report cards for entire classes with a single click.',
    color: 'bg-purple-600',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Fee Management',
    description: 'Create fee invoices, record payments, generate receipts, and track balances per learner.',
    color: 'bg-orange-600',
  },
  {
    icon: <Receipt className="w-6 h-6" />,
    title: 'Fee Statements',
    description: 'Generate PDF fee statements with complete payment history and outstanding balances.',
    color: 'bg-teal-600',
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Timetable Generator',
    description: 'Auto-generate class timetables, manage teacher-subject assignments, and create exam schedules.',
    color: 'bg-indigo-600',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Analytics Dashboard',
    description: 'Visual dashboards with charts, trends, and insights on attendance, fees, and academic performance.',
    color: 'bg-red-600',
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: 'Teacher Management',
    description: 'Add teachers, assign subjects, and manage teacher workloads and class allocations.',
    color: 'bg-pink-600',
  },
  {
    icon: <UserCog className="w-6 h-6" />,
    title: 'Multi-Role Portals',
    description: 'Dedicated dashboards for School Admin, Class Teacher, Subject Teacher, Student, and Parent.',
    color: 'bg-cyan-600',
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: 'Announcements',
    description: 'Publish school announcements, fee reminders, exam schedules, and emergency alerts.',
    color: 'bg-amber-600',
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: 'PWA Support',
    description: 'Install Kimatu Analytics as an app on any device — works offline with cached data.',
    color: 'bg-emerald-600',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Data Security',
    description: 'Secure cloud storage with role-based access control and automatic data backups.',
    color: 'bg-rose-600',
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'Reseller Portal',
    description: 'Resellers can manage multiple schools, set custom pricing, and lock/unlock access.',
    color: 'bg-violet-600',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'WhatsApp Integration',
    description: 'Contact support via WhatsApp for quick assistance and school onboarding.',
    color: 'bg-green-500',
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.feature-card');
            cards.forEach((card, i) => {
              setTimeout(() => {
                (card as HTMLElement).style.opacity = '1';
                (card as HTMLElement).style.transform = 'translateY(0)';
              }, i * 80);
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
    <section id="features" className="py-16 md:py-20 bg-gradient-to-b from-[#1A1A1A] to-[#0F1729]" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-base font-bold mb-2 block" style={{ color: '#D4AF37' }}>FEATURES</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Everything Your School Needs
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
            A comprehensive suite of tools designed specifically for Kenyan schools. 
            Supports CBE (PP1-Senior) and 8-4-4 (Form 3 &amp; 4 only).
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <div
              key={i}
              className="feature-card bg-[#1E1E2E] rounded-2xl p-6 border border-gray-800 opacity-0 translate-y-10 transition-all duration-500 hover:border-gray-600 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] group"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 transition-transform group-hover:scale-110`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '2,000+', label: 'Schools Using Kimatu' },
            { value: '500K+', label: 'Learners Managed' },
            { value: '50K+', label: 'Teachers' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 bg-[#1E1E2E] rounded-xl border border-gray-800">
              <div className="text-2xl font-bold" style={{ color: '#D4AF37' }}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
