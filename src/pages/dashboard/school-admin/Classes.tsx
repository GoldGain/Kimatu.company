import { useState } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/hooks/useSupabaseData';
import { Plus, Loader2, School } from 'lucide-react';
import type { CurriculumType } from '@/types/database';

export default function SchoolAdminClasses() {
  const { user } = useAuth();
  const { classes, loading, refetch } = useClasses(user?.schoolId || undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', level: 1, grade_level: 1, curriculum: 'CBE' as CurriculumType, stream: '', capacity: 40 });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    await supabaseUntyped.from('classes').insert([{ ...formData, school_id: user?.schoolId }]);
    setShowAdd(false);
    setFormData({ name: '', level: 1, grade_level: 1, curriculum: 'CBE', stream: '', capacity: 40 });
    refetch();
    setAdding(false);
  };

  const grouped = classes.reduce((acc, c) => {
    const key = c.curriculum;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, typeof classes>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-[#111111]">Classes</h1><p className="text-sm text-[#666666]">{classes.length} total classes</p></div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8]"><Plus className="w-4 h-4" /> Add Class</button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold mb-4">Add New Class</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input placeholder="Class Name * (e.g. Grade 5)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" required />
            <input type="number" placeholder="Level *" value={formData.level} onChange={e => setFormData({...formData, level: parseInt(e.target.value)})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" required />
            <input type="number" placeholder="Grade Level * (1-12)" value={formData.grade_level} onChange={e => setFormData({...formData, grade_level: parseInt(e.target.value)})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" required min={1} max={12} />
            <select value={formData.curriculum} onChange={e => setFormData({...formData, curriculum: e.target.value as CurriculumType})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white">
              <option value="CBE">CBE</option><option value="844">8-4-4</option>
            </select>
            <input placeholder="Stream (e.g. A, B)" value={formData.stream} onChange={e => setFormData({...formData, stream: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            <div className="flex gap-3 md:col-span-4">
              <button type="submit" disabled={adding} className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50">{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Class'}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="border border-gray-200 px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {Object.entries(grouped).map(([curriculum, cls]) => (
        <div key={curriculum} className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-4">
            <School className="w-5 h-5 text-[#2563EB]" />
            <h3 className="font-semibold text-[#111111]">{curriculum} Classes ({cls.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cls.map(c => (
              <div key={c.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#111111]">{c.name} {c.stream && `(${c.stream})`}</span>
                  <span className="text-xs bg-[#2563EB] text-white px-2 py-0.5 rounded-full">Lv.{c.level}</span>
                </div>
                <div className="text-xs text-[#666666]">Capacity: {c.capacity} students</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {loading && <div className="text-center py-8 text-sm text-[#666666]">Loading classes...</div>}
    </div>
  );
}
