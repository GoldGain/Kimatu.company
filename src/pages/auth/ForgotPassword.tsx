import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { GraduationCap, Loader2, ArrowLeft, Check, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [resetMethod, setResetMethod] = useState<'email' | 'admission'>('email');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let email = identifier;

      // If using admission number, find the student's email
      if (resetMethod === 'admission') {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('email, admission_number, first_name, last_name')
          .eq('admission_number', identifier.toUpperCase())
          .maybeSingle() as any;

        if (studentError || !student) {
          setError('❌ Admission number not found. Please contact your school.');
          setLoading(false);
          return;
        }

        if (!student.email) {
          setError('❌ No email linked to this admission number. Please contact your school administrator.');
          setLoading(false);
          return;
        }

        email = student.email;
        setFoundEmail(email);
        toast.success(`Found student: ${student.first_name} ${student.last_name}`);
      }

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
      
      setSuccess(true);
      toast.success('Password reset link sent! Check your email.');
      
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Check Your Email</h2>
          <p className="text-sm text-[#666666] mb-4">
            We sent a password reset link to <strong>{foundEmail || identifier}</strong>
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Click the link in the email to create a new password.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link to="/auth/login" className="inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#111111] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#111111]">CBE-Analytics</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Reset Password</h1>
          <p className="text-sm text-[#666666] mt-1">We'll send you a reset link</p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Toggle between Email and Admission Number */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setResetMethod('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                resetMethod === 'email' 
                  ? 'bg-[#2563EB] text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button
              type="button"
              onClick={() => setResetMethod('admission')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                resetMethod === 'admission' 
                  ? 'bg-[#2563EB] text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4" /> Admission Number
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                {resetMethod === 'email' ? 'Email Address' : 'Admission Number'}
              </label>
              <input
                type={resetMethod === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={resetMethod === 'email' ? 'you@school.ac.ke' : 'e.g., GFA-2025-001'}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                required
                autoFocus
              />
              {resetMethod === 'admission' && (
                <p className="text-xs text-gray-500 mt-1">
                  Enter your admission number to reset your password
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#666666]">
            Remember your password?{' '}
            <Link to="/auth/login" className="text-[#2563EB] font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}