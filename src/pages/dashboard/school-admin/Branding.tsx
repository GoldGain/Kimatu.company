import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, Palette, School, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { subscribeToPush } from '@/hooks/usePWA';

export default function SchoolBranding() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [form, setForm] = useState({
    name: '',
    motto: '',
    primary_color: '#2563EB',
    secondary_color: '#1d4ed8',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    principal_name: '',
  });

  useEffect(() => {
    fetchSchool();
    checkNotifPermission();
  }, []);

  const checkNotifPermission = () => {
    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted');
    }
  };

  const fetchSchool = async () => {
    setLoading(true);
    const { data } = await supabaseUntyped
      .from('schools')
      .select('*')
      .eq('id', user?.schoolId)
      .single();
    if (data) {
      setForm({
        name: data.name || '',
        motto: data.motto || '',
        primary_color: data.primary_color || '#2563EB',
        secondary_color: data.secondary_color || '#1d4ed8',
        logo_url: data.logo_url || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        principal_name: data.principal_name || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabaseUntyped
        .from('schools')
        .update({
          motto: form.motto,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          logo_url: form.logo_url,
          address: form.address,
          phone: form.phone,
          email: form.email,
          website: form.website,
          principal_name: form.principal_name,
        })
        .eq('id', user?.schoolId);
      if (error) throw error;
      toast.success('School branding saved!');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const enableNotifications = async () => {
    setNotifLoading(true);
    try {
      const success = await subscribeToPush(user?.id || '', supabaseUntyped);
      if (success) {
        setNotifEnabled(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Could not enable notifications. Please check browser permissions.');
      }
    } catch (err) {
      toast.error('Notification setup failed');
    }
    setNotifLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">School Settings & Branding</h1>
        <p className="text-sm text-[#666666]">Customise your school's appearance and notification settings</p>
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" />
          Push Notifications
        </h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-[#111111]">Browser Push Notifications</p>
            <p className="text-xs text-[#666666]">Receive instant alerts for new results, fees, and announcements</p>
          </div>
          {notifEnabled ? (
            <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1.5 rounded-full">Enabled</span>
          ) : (
            <button
              onClick={enableNotifications}
              disabled={notifLoading}
              className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {notifLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {/* Branding Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-500" />
          School Branding
        </h3>

        {/* Color Preview */}
        <div className="mb-6 p-4 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 mb-3">Brand Preview</p>
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: form.primary_color }}>
              {form.name?.[0] || 'S'}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: form.primary_color }}>{form.name || 'School Name'}</p>
              <p className="text-xs text-gray-500 italic">{form.motto || 'School motto'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">School Name</label>
            <input
              value={form.name}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">School Motto</label>
            <input
              value={form.motto}
              onChange={e => setForm({ ...form, motto: e.target.value })}
              placeholder="e.g. Excellence in Education"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Primary Colour</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm({ ...form, primary_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                value={form.primary_color}
                onChange={e => setForm({ ...form, primary_color: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Secondary Colour</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.secondary_color}
                onChange={e => setForm({ ...form, secondary_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                value={form.secondary_color}
                onChange={e => setForm({ ...form, secondary_color: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Logo URL</label>
            <input
              value={form.logo_url}
              onChange={e => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Principal Name</label>
            <input
              value={form.principal_name}
              onChange={e => setForm({ ...form, principal_name: e.target.value })}
              placeholder="Principal's full name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Address</label>
            <input
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="School physical address"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Website</label>
            <input
              value={form.website}
              onChange={e => setForm({ ...form, website: e.target.value })}
              placeholder="https://yourschool.ac.ke"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
