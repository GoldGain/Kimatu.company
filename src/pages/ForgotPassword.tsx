import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordResetOTP, verifyPasswordResetOTP, resetPasswordWithOTP } from '@/lib/sms';
import { Loader2, Phone, KeyRound, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'phone' | 'otp' | 'password' | 'done';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
    setLoading(true);
    try {
      const result = await requestPasswordResetOTP(phone.trim());
      toast.success(result.message || 'OTP sent to your phone!');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      await verifyPasswordResetOTP(phone.trim(), otp.trim());
      toast.success('OTP verified! Set your new password.');
      setStep('password');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await resetPasswordWithOTP(phone.trim(), otp.trim(), newPassword);
      toast.success(result.message || 'Password reset successfully!');
      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-2xl font-black text-[#111111]">Kimatu Analytics</span>
          </div>
          <h1 className="text-xl font-bold text-[#111111]">Reset Your Password</h1>
          <p className="text-sm text-gray-500 mt-1">We'll send a verification code to your registered phone number.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {(['phone', 'otp', 'password'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? 'bg-[#2563EB] text-white' :
                  (['phone', 'otp', 'password', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {(['phone', 'otp', 'password', 'done'].indexOf(step) > i) ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${(['phone', 'otp', 'password', 'done'].indexOf(step) > i) ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Phone */}
          {step === 'phone' && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0712345678 or +254712345678"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter the phone number registered to your account.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center text-sm text-gray-600 bg-blue-50 rounded-xl p-3">
                OTP sent to <strong>{phone}</strong>. Check your SMS messages.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-Digit OTP</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-center tracking-widest text-lg font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">OTP is valid for 10 minutes.</p>
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                ← Resend OTP / Change number
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center text-sm text-green-700 bg-green-50 rounded-xl p-3">
                ✅ OTP verified! Set your new password below.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#111111]">Password Reset!</h2>
              <p className="text-sm text-gray-600">Your password has been successfully reset. You can now log in with your new password.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#1d4ed8] transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
