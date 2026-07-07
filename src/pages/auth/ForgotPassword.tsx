import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { requestPasswordResetOTP, verifyPasswordResetOTP, resetPasswordWithOTP } from '@/lib/sms';
import { GraduationCap, Loader2, ArrowLeft, Check, Mail, User, Phone, KeyRound, Lock } from 'lucide-react';
import { toast } from 'sonner';

type ResetMethod = 'email' | 'admission' | 'sms';
type SMSStep = 'phone' | 'otp' | 'password' | 'done';

export default function ForgotPassword() {
  const [resetMethod, setResetMethod] = useState<ResetMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState('');

  // SMS OTP flow state
  const [smsStep, setSmsStep] = useState<SMSStep>('phone');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsOtp, setSmsOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Email / Admission reset ────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let email = identifier;

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

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) { setError(resetError.message); setLoading(false); return; }
      setSuccess(true);
      toast.success('Password reset link sent! Check your email.');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── SMS OTP reset ──────────────────────────────────────────────────────────
  const handleSMSRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPhone.trim()) { toast.error('Please enter your phone number'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await requestPasswordResetOTP(smsPhone.trim());
      toast.success(result.message || 'OTP sent to your phone!');
      setSmsStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSMSVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsOtp.trim() || smsOtp.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyPasswordResetOTP(smsPhone.trim(), smsOtp.trim());
      toast.success('OTP verified! Set your new password.');
      setSmsStep('password');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSMSResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await resetPasswordWithOTP(smsPhone.trim(), smsOtp.trim(), newPassword);
      toast.success(result.message || 'Password reset successfully!');
      setSmsStep('done');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen (email) ─────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Check Your Email</h2>
          <p className="text-sm text-[#666666] mb-4">We sent a password reset link to <strong>{foundEmail || identifier}</strong></p>
          <p className="text-xs text-gray-500 mb-6">Click the link in the email to create a new password.</p>
          <Link to="/auth/login" className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── SMS done screen ────────────────────────────────────────────────────────
  if (resetMethod === 'sms' && smsStep === 'done') {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Password Reset!</h2>
          <p className="text-sm text-[#666666] mb-6">Your password has been successfully reset. You can now log in with your new password.</p>
          <Link to="/auth/login" className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] transition-colors">
            Go to Login
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
            <span className="text-2xl font-bold text-[#111111]">Kimatu Analytics</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Reset Password</h1>
          <p className="text-sm text-[#666666] mt-1">Choose how you'd like to reset your password</p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          {/* Method Toggle */}
          <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl">
            {[
              { key: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
              { key: 'admission', label: 'Adm No.', icon: <User className="w-3.5 h-3.5" /> },
              { key: 'sms', label: 'SMS OTP', icon: <Phone className="w-3.5 h-3.5" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setResetMethod(key as ResetMethod); setError(''); setSmsStep('phone'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  resetMethod === key ? 'bg-[#2563EB] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Email / Admission form */}
          {(resetMethod === 'email' || resetMethod === 'admission') && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">
                  {resetMethod === 'email' ? 'Email Address' : 'Admission Number'}
                </label>
                <input
                  type={resetMethod === 'email' ? 'email' : 'text'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={resetMethod === 'email' ? 'you@school.ac.ke' : 'e.g., GFA-2025-001'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* SMS OTP flow */}
          {resetMethod === 'sms' && (
            <div>
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 mb-5">
                {['phone', 'otp', 'password'].map((s, i) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      smsStep === s ? 'bg-[#2563EB] text-white' :
                      ['phone', 'otp', 'password', 'done'].indexOf(smsStep) > i ? 'bg-green-500 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {['phone', 'otp', 'password', 'done'].indexOf(smsStep) > i ? '✓' : i + 1}
                    </div>
                    {i < 2 && <div className={`w-6 h-0.5 ${['phone', 'otp', 'password', 'done'].indexOf(smsStep) > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>

              {smsStep === 'phone' && (
                <form onSubmit={handleSMSRequestOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={smsPhone}
                        onChange={e => setSmsPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Enter the phone number registered to your account.</p>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                    {loading ? 'Sending OTP...' : 'Send OTP via SMS'}
                  </button>
                </form>
              )}

              {smsStep === 'otp' && (
                <form onSubmit={handleSMSVerifyOTP} className="space-y-4">
                  <div className="text-center text-sm text-gray-600 bg-blue-50 rounded-xl p-3">
                    OTP sent to <strong>{smsPhone}</strong>. Check your SMS messages.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1.5">Enter 6-Digit OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={smsOtp}
                        onChange={e => setSmsOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-center tracking-widest text-lg font-mono"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">OTP is valid for 10 minutes.</p>
                  </div>
                  <button type="submit" disabled={loading || smsOtp.length !== 6} className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button type="button" onClick={() => { setSmsStep('phone'); setError(''); }} className="w-full text-sm text-gray-500 hover:text-gray-700">
                    ← Resend OTP / Change number
                  </button>
                </form>
              )}

              {smsStep === 'password' && (
                <form onSubmit={handleSMSResetPassword} className="space-y-4">
                  <div className="text-center text-sm text-green-700 bg-green-50 rounded-xl p-3">✅ OTP verified! Set your new password below.</div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !newPassword || !confirmPassword} className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 text-center text-sm text-[#666666]">
            Remember your password?{' '}
            <Link to="/auth/login" className="text-[#2563EB] font-medium hover:underline">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
