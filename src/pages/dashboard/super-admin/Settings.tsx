import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminSettings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: currentPassword });
      if (verifyError) { toast.error('Current password is incorrect'); setLoading(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
      toast.success('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error('Failed to change password: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">Settings</h1><p className="text-sm text-[#666666]">Manage your super admin account</p></div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Settings className="w-6 h-6 text-blue-600" /></div>
          <div>
            <h3 className="font-semibold text-[#111111]">Account Information</h3>
            <p className="text-sm text-[#666666]">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-[#666666]">Name:</span> <span className="font-medium">{user?.firstName} {user?.lastName}</span></div>
          <div><span className="text-[#666666]">Role:</span> <span className="font-medium capitalize">{user?.role?.replace('_', ' ')}</span></div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700 font-medium">Password changed successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] max-w-md">
        <h3 className="font-semibold text-[#111111] mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Current Password', value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggleShow: () => setShowCurrent(!showCurrent) },
            { label: 'New Password', value: newPassword, setter: setNewPassword, show: showNew, toggleShow: () => setShowNew(!showNew) },
            { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggleShow: () => setShowConfirm(!showConfirm) },
          ].map((field, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">{field.label}</label>
              <div className="relative">
                <input type={field.show ? 'text' : 'password'} value={field.value} onChange={e => field.setter(e.target.value)} required placeholder={`Enter ${field.label.toLowerCase()}`} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] pr-10" />
                <button type="button" onClick={field.toggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading} className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
