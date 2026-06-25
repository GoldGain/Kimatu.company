import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, User, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PWAInstallButton from '@/components/PWAInstallButton';
import SEO from '@/components/SEO';

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
    if (!authLoading && user) {
      redirectByRole(user.role);
    }
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

  const DEMO_CREDENTIALS = [
    { email: 'iianisecondary2024@gmail.com', pass: 'SchoolAdmin@2025', role: 'School Admin' },
    { email: 'super@edu.ac.ke', pass: 'admin@2025', role: 'Super Admin' },
    { email: 'teacher@greenfield.ac.ke', pass: 'Teacher@2025!', role: 'Teacher' },
    { email: 'student@greenfield.ac.ke', pass: 'student@2025!', role: 'Student' },
    { email: 'parent@greenfield.ac.ke', pass: 'parent@2025!', role: 'Parent' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!identifier || !password) {
      setError('Please enter your credentials');
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
          setError('❌ Admission number not found. Please check with your school.');
          setLoading(false);
          return;
        }

        const studentData = student as unknown as any;
        const emailToUse = studentData.student_email || studentData.email;
        if (!emailToUse) {
          setError('❌ Student account not set up. Please contact your school administrator.');
          setLoading(false);
          return;
        }

        email = emailToUse;
      }

      const { error: loginError, data } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (loginError) {
        setError('❌ Invalid credentials. Please check your email/admission number and password.');
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('❌ Login failed. Please try again.');
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

      toast.success('Welcome back!');
      setLoading(false);

      if (role === 'master_super_admin') {
        navigate('/master-admin', { replace: true });
      } else if (role === 'reseller_super_admin') {
        navigate('/reseller-admin', { replace: true });
      } else if (role === 'super_admin') {
        navigate('/super-admin', { replace: true });
      } else if (role === 'school_admin') {
        navigate('/school-admin', { replace: true });
      } else if (role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else if (role === 'student') {
        navigate('/student', { replace: true });
      } else if (role === 'parent') {
        navigate('/parent', { replace: true });
      } else {
        setError('❌ Account role not configured. Please contact your administrator.');
        await supabase.auth.signOut();
      }

    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
      <SEO
        title="Login - Kimatu Analytics School Portal"
        description="Login to Kimatu Analytics, Kenya's school management portal for teachers, students, parents, and administrators. Access results, report cards, and more."
        path="/login"
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/kimatu-icon.png" alt="Kimatu Analytics" className="w-10 h-10 rounded-xl" />
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold" style={{ color: '#1A365D' }}>Kimatu</span>
              <span className="text-[10px] -mt-1" style={{ color: '#D4AF37' }}>ANALYTICS</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Welcome Back</h1>
          <p className="text-sm text-[#666666] mt-1">Login to your school portal</p>
          <div className="mt-3 flex justify-center">
            <PWAInstallButton />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Login Method Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                loginMethod === 'email' 
                  ? 'bg-[#1A365D] text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" /> Email Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('admission')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                loginMethod === 'admission' 
                  ? 'bg-[#1A365D] text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4" /> Student Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                {loginMethod === 'email' ? 'Email Address' : 'Admission Number'}
              </label>
              <input
                type={loginMethod === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginMethod === 'email' ? 'your@email.com' : 'e.g., GFA-2025-001'}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] focus:border-transparent"
                required
                autoFocus
              />
              {loginMethod === 'admission' && (
                <p className="text-xs text-gray-500 mt-1">Enter the admission number given by your school</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#666666]">
                <input type="checkbox" className="rounded border-gray-300" />
                Remember me
              </label>
              <Link to="/auth/forgot-password" className="text-sm text-[#1A365D] hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A365D] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D4A7C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#666666]">
            Don&apos;t have an account?{' '}
            <Link to="/get-started" className="text-[#1A365D] font-medium hover:underline">
              Get Started
            </Link>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Demo Credentials (Click to auto-fill)</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {DEMO_CREDENTIALS.map((demo, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setIdentifier(demo.email); setPassword(demo.pass); setLoginMethod('email'); }}
                  className="p-2 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-600">{demo.role}</span>
                  <br />
                  <span className="text-gray-400">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            <p>📧 School Admin / Teacher / Parent: Use Email Login</p>
            <p className="mt-1">🎓 Students: Use Admission Number Login or Email Login</p>
          </div>
        </div>
      </div>
    </div>
  );
}
