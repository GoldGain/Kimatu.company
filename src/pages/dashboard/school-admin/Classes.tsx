import { useState } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/hooks/useSupabaseData';
import { Plus, Loader2, School, Search, ArrowRight, Users } from 'lucide-react';
import { toast } from 'sonner';

type CurriculumType = 'CBE' | '844';

const CURRICULUM_OPTIONS: { value: CurriculumType; label: string }[] = [
  { value: 'CBE', label: 'CBE (Competency Based)' },
  { value: '844', label: '8-4-4 (Traditional)' },
];

export default function SchoolAdminClasses() {
  const { user } = useAuth();
  const { classes, loading, refetch } = useClasses(user?.schoolId || undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCurriculum, setFilterCurriculum] = useState<CurriculumType | ''>('');
  const [formData, setFormData] = useState({
    name: '',
    grade_level: 1,
    curriculum: 'CBE' as CurriculumType,
    stream: '',
    capacity: 40,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!formData.grade_level || formData.grade_level < 1 || formData.grade_level > 12) {
      toast.error('Grade level must be between 1 and 12');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabaseUntyped.from('classes').insert([{
        name: formData.name.trim(),
        level: formData.grade_level,        // keep level in sync
        grade_level: formData.grade_level,  // new column for grading
        curriculum: formData.curriculum,
        stream: formData.stream.trim() || null,
        capacity: formData.capacity || 40,
        school_id: user?.schoolId,
        is_active: true,
      }]);

      if (error) {
        throw new Error(error.message);
      }

      toast.success(`Class "${formData.name}" added successfully!`);
      setShowAdd(false);
      setFormData({ name: '', grade_level: 1, curriculum: 'CBE', stream: '', capacity: 40 });
      refetch();
    } catch (err: any) {
      toast.error('Failed to add class: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const filteredClasses = classes.filter((c: any) => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.stream?.toLowerCase().includes(search.toLowerCase());
    const matchesCurriculum = filterCurriculum ? c.curriculum === filterCurriculum : true;
    return matchesSearch && matchesCurriculum;
  });

  const grouped = filteredClasses.reduce((acc: Record<string, any[]>, c: any) => {
    const key = c.curriculum || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const [bulkPromoteClass, setBulkPromoteClass] = useState<any | null>(null);
  const [bulkDestClassId, setBulkDestClassId] = useState('');
  const [bulkPromoting, setBulkPromoting] = useState(false);

  const handleBulkPromote = async () => {
    if (!bulkPromoteClass || !bulkDestClassId) { toast.error('Please select a destination class'); return; }
    setBulkPromoting(true);
    try {
      const { data: students, error: fetchErr } = await supabaseUntyped.from('students').select('id').eq('class_id', bulkPromoteClass.id).eq('is_active', true);
      if (fetchErr) throw fetchErr;
      if (!students || students.length === 0) { toast.error('No active students in this class'); setBulkPromoting(false); return; }
      const { error: updateErr } = await supabaseUntyped.from('students').update({ class_id: bulkDestClassId, previous_class_id: bulkPromoteClass.id, promoted_at: new Date().toISOString() }).eq('class_id', bulkPromoteClass.id).eq('is_active', true);
      if (updateErr) throw updateErr;
      toast.success(`${students.length} students promoted successfully!`);
      setBulkPromoteClass(null);
      setBulkDestClassId('');
      refetch();
    } catch (err: any) { toast.error('Bulk promotion failed: ' + err.message); }
    setBulkPromoting(false);
  };

  const getLevelBadgeColor = (gradeLevel: number) => {
    if (gradeLevel >= 1 && gradeLevel <= 6) return 'bg-green-100 text-green-700';
    if (gradeLevel >= 7 && gradeLevel <= 9) return 'bg-blue-100 text-blue-700';
    if (gradeLevel >= 10 && gradeLevel <= 12) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getLevelLabel = (gradeLevel: number) => {
    if (gradeLevel >= 1 && gradeLevel <= 6) return 'Primary';
    if (gradeLevel >= 7 && gradeLevel <= 9) return 'Junior';
    if (gradeLevel >= 10 && gradeLevel <= 12) return 'Senior';
    return `Grade ${gradeLevel}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Classes</h1>
          <p className="text-sm text-[#666666]">{filteredClasses.length} of {classes.length} classes</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8]"
        >
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
        <select
          value={filterCurriculum}
          onChange={e => setFilterCurriculum(e.target.value as CurriculumType | '')}
          className="w-full sm:w-48 px-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="">All Curricula</option>
          {CURRICULUM_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Add Class Form */}
      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold mb-4">Add New Class</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Class Name *</label>
              <input
                placeholder="e.g. Grade 7A"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grade Level * (1–12)</label>
              <input
                type="number"
                placeholder="e.g. 7"
                value={formData.grade_level}
                onChange={e => setFormData({...formData, grade_level: parseInt(e.target.value) || 1})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
                min={1}
                max={12}
              />
              <p className="text-xs text-gray-400 mt-1">1–6: Primary · 7–9: Junior · 10–12: Senior</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Curriculum *</label>
              <select
                value={formData.curriculum}
                onChange={e => setFormData({...formData, curriculum: e.target.value as CurriculumType})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                {CURRICULUM_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stream (optional)</label>
              <input
                placeholder="e.g. A, B, North"
                value={formData.stream}
                onChange={e => setFormData({...formData, stream: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Capacity</label>
              <input
                type="number"
                placeholder="40"
                value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 40})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                min={1}
                max={100}
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={adding}
                className="flex-1 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? 'Adding...' : 'Add Class'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Promote Modal */}
      {bulkPromoteClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
            <h2 className="text-lg font-semibold mb-1">Bulk Promote Class</h2>
            <p className="text-sm text-gray-500 mb-4">Promote ALL active students from <strong>{bulkPromoteClass.name}</strong> to a new class.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Destination Class</label>
              <select value={bulkDestClassId} onChange={e => setBulkDestClassId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">-- Select Destination Class --</option>
                {classes.filter(c => c.id !== bulkPromoteClass.id).sort((a,b) => (a.level||0)-(b.level||0)).map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.stream || ''} {c.level ? `(Level ${c.level})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBulkPromoteClass(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkPromote} disabled={bulkPromoting || !bulkDestClassId} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {bulkPromoting ? <><Loader2 className="w-4 h-4 animate-spin" /> Promoting...</> : <><ArrowRight className="w-4 h-4" /> Promote All Students</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classes List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-[#666666]">Loading classes...</div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <School className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[#666666] font-medium">No classes found</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Class" to create your first class.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([curriculum, cls]) => (
          <div key={curriculum} className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              <School className="w-5 h-5 text-[#2563EB]" />
              <h3 className="font-semibold text-[#111111]">
                {curriculum === '844' ? '8-4-4' : curriculum} Classes ({cls.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cls.map((c: any) => {
                const gradeLevel = c.grade_level || c.level || 0;
                return (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-[#111111]">
                        {c.name} {c.stream && `(${c.stream})`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLevelBadgeColor(gradeLevel)}`}>
                        {getLevelLabel(gradeLevel)}
                      </span>
                    </div>
                    <div className="text-xs text-[#666666] space-y-0.5">
                      <div>Grade {gradeLevel} · Capacity: {c.capacity}</div>
                      <div className="flex items-center justify-between gap-1 mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${curriculum === 'CBE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {curriculum === '844' ? '8-4-4' : curriculum}
                        </span>
                        <button onClick={() => { setBulkPromoteClass(c); setBulkDestClassId(''); }} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                          <Users className="w-3 h-3" /> Bulk Promote
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
