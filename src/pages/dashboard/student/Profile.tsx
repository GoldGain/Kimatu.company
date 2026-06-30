import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, School } from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-[#111111] mb-6">My Profile</h1>
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#1A365D] rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-bold text-lg">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <School className="w-4 h-4 text-gray-400" />
            <span>School ID: {user?.schoolId || 'Not assigned'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
