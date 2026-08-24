import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, User, Mail, ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PWAInstallButton from '@/components/PWAInstallButton';
import SEO from '@/components/SEO';

interface StudentData {
  email: string;
  admission_number: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'email' | 'admission'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) redirectByRole(user.role);
  }, [user, authLoading]);

  const redirectByRole = (role: string) => {
    if (role === 'master_super_admin') navigate('/master-admin', { replace: true });
    else if (role === 'reseller_super_admin') navigate('/reseller-admin', { replace: true });
    else if (role === 'super_admin') navigate('/super-admin', { replace: true });
    else if (role === 'school_admin') navigate('/school-admin', { replace: true });
    else if (role === 'teacher') navigate('/teacher', { replace: true });
    else if (role === 'student') navigate('/student', { replace: true });
    else if (role === 'parent') navigate('/parent', { replace: true });
    else navigate('/', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!identifier || !password) {
      setError('Enter your sign-in details to continue.');
      setLoading(false);
      return;
    }

    try {
      let email = identifier;

      if (loginMethod === 'admission') {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('student_email, admission_number')
          .eq('admission_number', identifier.toUpperCase())
          .maybeSingle();

        if (studentError || !student) {
          setError('That assessment number could not be found. Please check with your school.');
          setLoading(false);
          return;
        }

        const studentData = student as unknown as StudentData & { student_email?: string };
        const emailToUse = studentData.student_email || studentData.email;
        if (!emailToUse) {
          setError('This learner account is not ready yet. Please contact your school administrator.');
          setLoading(false);
          return;
        }
        email = emailToUse;
      }

      const { error: loginError, data } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        setError('The details did not match. Check your email or assessment number and password.');
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('We could not complete the sign-in. Please try again.');
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const profileRecord = profileData as unknown as { role: string } | null;
      const role = profileRecord?.role || data.user.user_metadata?.role;

      toast.success('Welcome back to Kimatu.');
      setLoading(false);

      if (role === 'master_super_admin') navigate('/master-admin', { replace: true });
      else if (role === 'reseller_super_admin') navigate('/reseller-admin', { replace: true });
      else if (role === 'super_admin') navigate('/super-admin', { replace: true });
      else if (role === 'school_admin') navigate('/school-admin', { replace: true });
      else if (role === 'teacher') navigate('/teacher', { replace: true });
      else if (role === 'student') navigate('/student', { replace: true });
      else if (role === 'parent') navigate('/parent', { replace: true });
      else {
        setError('Your account role is not configured. Please contact your administrator.');
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error(err);
      setError('Something interrupted sign-in. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F3EA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#587000]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EA] text-[#10233F]">
      <SEO
        title="Sign in — Kimatu Analytics School Portal"
        description="Sign in to Kimatu Analytics, the clear school operations workspace for Kenyan administrators, teachers, learners, and parents."
        path="/login"
      />
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-5 px-3 py-3 sm:px-5 sm:py-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <aside className="relative hidden min-h-[720px] overflow-hidden rounded-[2rem] bg-[#10233F] lg:block">
          <img src="/images/hero4.jpg" alt="Kenyan senior students collaborating with laptops in the library" className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#10233F]/55 to-[#10233F]/10" />
          <div className="relative flex h-full flex-col justify-between p-8 xl:p-10">
            <Link to="/" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15">
              <ArrowLeft className="h-4 w-4" /> Back to Kimatu
            </Link>
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D8F23F]/30 bg-[#D8F23F]/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#E7F995]">
                <Sparkles className="h-3.5 w-3.5" /> One clear school view
              </div>
              <h1 className="max-w-lg text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white xl:text-6xl">Your school, moving in one direction.</h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#C5D0DE]">Open the tools your role needs, see what matters next, and keep every school day connected.</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {['Admin control', 'Teacher clarity', 'Family access'].map((label) => (
                  <span key={label} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">{label}</span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-start justify-center py-3 sm:py-8 lg:items-center">
          <div className="w-full max-w-lg">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#60708A] transition hover:text-[#10233F] lg:hidden">
                <ArrowLeft className="h-4 w-4" /> Back to home
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <PWAInstallButton />
                <Link to="/register-school" className="text-sm font-bold text-[#587000] transition hover:text-[#10233F]">Create workspace</Link>
              </div>
            </div>

            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10233F] shadow-[4px_4px_0_0_#D8F23F]">
                <img src="/kimatu-icon.png" alt="Kimatu Analytics" className="h-9 w-9 object-contain" />
              </span>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#60708A]">Kimatu Analytics</p>
                <p className="text-sm font-semibold text-[#10233F]">School operations, clarified</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#DDE3D5] bg-white p-5 shadow-[0_24px_80px_rgba(16,35,63,.12)] sm:p-8">
              <div className="mb-7">
                <h2 className="text-3xl font-black tracking-[-0.04em] text-[#10233F] sm:text-4xl">Welcome back.</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#60708A]">Sign in to pick up where your school left off.</p>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {error}
                </div>
              )}

              <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#F1F3ED] p-1.5">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${loginMethod === 'email' ? 'bg-[#10233F] text-white shadow-sm' : 'text-[#60708A] hover:text-[#10233F]'}`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('admission')}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${loginMethod === 'admission' ? 'bg-[#10233F] text-white shadow-sm' : 'text-[#60708A] hover:text-[#10233F]'}`}
                >
                  <User className="h-4 w-4" /> Learner number
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-black text-[#10233F]">
                    {loginMethod === 'email' ? 'Work or personal email' : 'Assessment number'}
                  </label>
                  <input
                    type={loginMethod === 'email' ? 'email' : 'text'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={loginMethod === 'email' ? 'name@school.org' : 'e.g. GFA-2025-001'}
                    className="w-full rounded-2xl border border-[#DDE3D5] bg-[#FBFCF9] px-4 py-3.5 text-sm text-[#10233F] outline-none transition placeholder:text-[#99A7B6] focus:border-[#587000] focus:ring-4 focus:ring-[#D8F23F]/25"
                    required
                    autoFocus
                  />
                  <p className="mt-2 text-xs leading-5 text-[#8291A3]">
                    {loginMethod === 'email' ? 'For school administrators, teachers, parents, and learners.' : 'Use the number given to the learner by the school.'}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-black text-[#10233F]">Password</label>
                    <Link to="/auth/forgot-password" className="text-xs font-bold text-[#587000] transition hover:text-[#10233F]">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-[#DDE3D5] bg-[#FBFCF9] px-4 py-3.5 pr-12 text-sm text-[#10233F] outline-none transition placeholder:text-[#99A7B6] focus:border-[#587000] focus:ring-4 focus:ring-[#D8F23F]/25"
                      required
                    />
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8291A3] transition hover:bg-[#EDF1E6] hover:text-[#10233F]">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-[#60708A]">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#C9D3C2] accent-[#587000]" />
                  Keep me signed in on this device
                </label>

                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D8F23F] px-4 py-4 text-sm font-black text-[#10233F] shadow-[4px_4px_0_0_#10233F] transition hover:-translate-y-0.5 hover:bg-[#E7F995] hover:shadow-[6px_6px_0_0_#10233F] active:translate-y-0 active:shadow-[2px_2px_0_0_#10233F] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue to Kimatu <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <div className="mt-7 border-t border-[#EDF0EA] pt-6 text-center">
                <p className="text-sm text-[#60708A]">New school to Kimatu?</p>
                <Link to="/register-school" className="mt-1 inline-flex items-center gap-1 text-sm font-black text-[#587000] hover:text-[#10233F]">Create your school workspace <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#F5F8F0] px-4 py-3 text-xs leading-5 text-[#60708A]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#587000]" />
                <p>Your school role determines the tools you can access. If something looks missing, ask your school administrator to check your account setup.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
