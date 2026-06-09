import { useState } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncements } from '@/hooks/useSupabaseData';
import { Plus, Loader2, Megaphone } from 'lucide-react';
import type { AnnouncementType } from '@/types/database';

export default function SchoolAdminAnnouncements() {
  const { user } = useAuth();
  const { announcements, loading, refetch } = useAnnouncements(user?.schoolId || undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'general' as AnnouncementType });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    await supabaseUntyped.from('announcements').insert([{
      title: formData.title,
      content: formData.content,
      type: formData.type,
      school_id: user?.schoolId,
      created_by: user?.id,
      is_published: true,
      published_at: new Date().toISOString(),
    }]);
    setShowAdd(false);
    setFormData({ title: '', content: '', type: 'general' });
    refetch();
    setAdding(false);
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'fee_reminder': return 'bg-orange-100 text-orange-700';
      case 'exam': return 'bg-blue-100 text-blue-700';
      case 'emergency': return 'bg-red-100 text-red-700';
      case 'event': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-[#111111]">Announcements</h1><p className="text-sm text-[#666666]">Manage school announcements</p></div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8]"><Plus className="w-4 h-4" /> New Announcement</button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <input placeholder="Title *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" required />
            <textarea placeholder="Content *" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] min-h-[100px]" required />
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AnnouncementType})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white">
              <option value="general">General</option><option value="fee_reminder">Fee Reminder</option><option value="exam">Exam</option><option value="event">Event</option><option value="emergency">Emergency</option>
            </select>
            <div className="flex gap-3">
              <button type="submit" disabled={adding} className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50">{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="border border-gray-200 px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="space-y-3">
        {loading ? <div className="text-center py-8 text-sm text-[#666666]">Loading...</div> :
         announcements.length === 0 ? <div className="text-center py-8 text-sm text-[#666666] bg-white rounded-2xl">No announcements yet</div> :
         announcements.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"><Megaphone className="w-5 h-5 text-blue-600" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[#111111]">{a.title}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor(a.type || '')}`}>{a.type}</span>
                </div>
                <p className="text-sm text-[#666666] leading-relaxed">{a.content}</p>
                <p className="text-xs text-gray-400 mt-2">{a.published_at ? new Date(a.published_at).toLocaleDateString() : 'Draft'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
