import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PhotoUpload from '@/components/PhotoUpload';

export default function ParentProfile() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '' });

  useEffect(() => { fetchProfile(); }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabaseUntyped.from('profiles').select('first_name, last_name, email, avatar_url').eq('id', user.id).maybeSingle();
    if (data) {
      setProfile({ first_name: data.first_name || '', last_name: data.last_name || '', email: data.email || '' });
      setAvatarUrl(data.avatar_url || null);
    }
    setLoading(false);
  };

  const handlePhotoSuccess = async (url: string) => {
    setAvatarUrl(url);
    await supabaseUntyped.from('profiles').update({ avatar_url: url }).eq('id', user?.id);
    await refreshProfile();
    toast.success('Profile photo updated!');
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">My Profile</h1>
        <p className="text-sm text-[#666666]">Manage your profile photo and account information</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#111111]">Profile Photo</h3>
            <p className="text-xs text-[#666666]">Upload or capture your photo (optional).</p>
          </div>
        </div>
        <div className="flex flex-col items-center py-4">
          <PhotoUpload
            currentPhotoUrl={avatarUrl}
            bucket="avatars"
            folder="parents"
            entityId={user?.id || ''}
            onSuccess={handlePhotoSuccess}
            label="Profile Photo"
            size="lg"
          />
          <p className="text-xs text-gray-400 mt-3">Max 5MB · JPG, PNG, or WebP</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-500 w-28">Name</span>
            <span className="text-sm font-medium text-[#111111]">{profile.first_name} {profile.last_name}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-500 w-28">Email</span>
            <span className="text-sm font-medium text-[#111111]">{profile.email}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-500 w-28">Role</span>
            <span className="text-sm font-medium text-green-600">Parent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
