import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, BookOpen, Pencil, Trash2, X, Check, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

type CurriculumType = 'CBE' | '844';

const CATEGORIES = ['Languages', 'Mathematics', 'Sciences', 'Humanities', 'Technical', 'Creative'] as const;
type CategoryType = typeof CATEGORIES[number];

interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  curriculum: CurriculumType;
  category?: CategoryType | null;
  is_core?: boolean | null;
  created_at?: string | null;
}

// Pre-populated subjects by curriculum
const CBE_SUBJECTS: { name: string; category: CategoryType }[] = [
  { name: 'English',               category: 'Languages'    },
  { name: 'Kiswahili',             category: 'Languages'    },
  { name: 'Mathematics',           category: 'Mathematics'  },
  { name: 'Integrated Science',    category: 'Sciences'     },
  { name: 'Social Studies',        category: 'Humanities'   },
  { name: 'Pre-Technical Studies', category: 'Technical'    },
  { name: 'Business Studies',      category: 'Humanities'   },
  { name: 'Agriculture',           category: 'Sciences'     },
  { name: 'Creative Arts',         category: 'Creative'     },
  { name: 'Physical Education',    category: 'Creative'     },
  { name: 'Religious Education',   category: 'Humanities'   },
];

const SUBJECTS_844: { name: string; category: CategoryType }[] = [
  { name: 'English',          category: 'Languages'   },
  { name: 'Kiswahili',        category: 'Languages'   },
  { name: 'Mathematics',      category: 'Mathematics' },
  { name: 'Biology',          category: 'Sciences'    },
  { name: 'Chemistry',        category: 'Sciences'    },
  { name: 'Physics',          category: 'Sciences'    },
  { name: 'History',          category: 'Humanities'  },
  { name: 'Geography',        category: 'Humanities'  },
  { name: 'CRE',              category: 'Humanities'  },
  { name: 'Business Studies', category: 'Humanities'  },
  { name: 'Agriculture',      category: 'Sciences'    },
  { name: 'Computer Studies', category: 'Technical'   },
];

const emptyForm = {
  name: '',
  code: '',
  curriculum: 'CBE' as CurriculumType,
  category: '' as CategoryType | '',
};

export default function SchoolAdminSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [bulkAdding, setBulkAdding] = useState(false);

  // Quick-add from pre-populated list
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseUntyped
      .from('subjects')
      .select('*')
      .eq('school_id', user?.schoolId)
      .order('name');
    if (!error) setSubjects(data || []);
    setLoading(false);
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) fetchSubjects();
  }, [user?.schoolId, fetchSubjects]);

  // Get pre-populated list for selected curriculum
  const getPresetList = (curriculum: CurriculumType) =>
    curriculum === 'CBE' ? CBE_SUBJECTS : SUBJECTS_844;

  // Get subjects not yet added for the selected curriculum
  const getAvailablePresets = (curriculum: CurriculumType) => {
    const existing = subjects
      .filter(s => s.curriculum === curriculum)
      .map(s => s.name.toLowerCase());
    return getPresetList(curriculum).filter(
      p => !existing.includes(p.name.toLowerCase())
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Subject name is required'); return; }
    setAdding(true);
    const { error } = await supabaseUntyped.from('subjects').insert([{
      school_id: user?.schoolId,
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      curriculum: formData.curriculum,
      category: formData.category || null,
      class_levels: [],
    }]);
    if (error) {
      toast.error('Failed to add subject: ' + error.message);
    } else {
      toast.success(`Subject "${formData.name}" added successfully!`);
      setFormData(emptyForm);
      setShowAdd(false);
      fetchSubjects();
    }
    setAdding(false);
  };

  const handleQuickAdd = async () => {
    if (!selectedPreset) { toast.error('Select a subject from the list'); return; }
    const [curriculum, name] = selectedPreset.split('::');
    const preset = getPresetList(curriculum as CurriculumType).find(p => p.name === name);
    if (!preset) return;

    setAdding(true);
    const { error } = await supabaseUntyped.from('subjects').insert([{
      school_id: user?.schoolId,
      name: preset.name,
      code: null,
      curriculum: curriculum,
      category: preset.category,
      class_levels: [],
    }]);
    if (error) {
      toast.error('Failed to add subject: ' + error.message);
    } else {
      toast.success(`"${preset.name}" added!`);
      setSelectedPreset('');
      fetchSubjects();
    }
    setAdding(false);
  };

  const handleBulkAdd = async (curriculum: CurriculumType) => {
    const available = getAvailablePresets(curriculum);
    if (available.length === 0) {
      toast.info(`All ${curriculum === 'CBE' ? 'CBE' : '8-4-4'} subjects already added!`);
      return;
    }
    setBulkAdding(true);
    const rows = available.map(p => ({
      school_id: user?.schoolId,
      name: p.name,
      code: null,
      curriculum,
      category: p.category,
      class_levels: [],
    }));
    const { error } = await supabaseUntyped.from('subjects').insert(rows);
    if (error) {
      toast.error('Failed to bulk add subjects: ' + error.message);
    } else {
      toast.success(`Added ${available.length} ${curriculum === 'CBE' ? 'CBE' : '8-4-4'} subjects!`);
      fetchSubjects();
    }
    setBulkAdding(false);
  };

  const startEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setEditForm({
      name: subject.name,
      code: subject.code || '',
      curriculum: subject.curriculum,
      category: (subject.category as CategoryType) || '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim()) { toast.error('Subject name is required'); return; }
    setSaving(true);
    const { error } = await supabaseUntyped.from('subjects').update({
      name: editForm.name.trim(),
      code: editForm.code.trim() || null,
      curriculum: editForm.curriculum,
      category: editForm.category || null,
    }).eq('id', id);
    if (error) {
      toast.error('Failed to update subject: ' + error.message);
    } else {
      toast.success('Subject updated successfully!');
      setEditingId(null);
      fetchSubjects();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete subject "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabaseUntyped.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete subject: ' + error.message);
    } else {
      toast.success(`Subject "${name}" deleted.`);
      fetchSubjects();
    }
    setDeletingId(null);
  };

  const grouped = subjects.reduce((acc, s) => {
    const key = s.curriculum;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, Subject[]>);

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Subjects</h1>
          <p className="text-sm text-[#666666]">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Quick-Add from Pre-populated List */}
      <div className="bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-[#111111]">Quick Add from Standard Subjects</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={selectedPreset}
            onChange={e => setSelectedPreset(e.target.value)}
            className={`flex-1 ${inputClass}`}
          >
            <option value="">— Select a subject to add —</option>
            <optgroup label="CBE Subjects">
              {getAvailablePresets('CBE').map(p => (
                <option key={`CBE::${p.name}`} value={`CBE::${p.name}`}>{p.name} (CBE)</option>
              ))}
            </optgroup>
            <optgroup label="8-4-4 Subjects">
              {getAvailablePresets('844').map(p => (
                <option key={`844::${p.name}`} value={`844::${p.name}`}>{p.name} (8-4-4)</option>
              ))}
            </optgroup>
          </select>
          <button
            onClick={handleQuickAdd}
            disabled={adding || !selectedPreset}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Selected
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBulkAdd('CBE')}
            disabled={bulkAdding}
            className="flex items-center gap-2 border border-blue-200 text-blue-700 bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
          >
            {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Add All CBE Subjects ({getAvailablePresets('CBE').length} remaining)
          </button>
          <button
            onClick={() => handleBulkAdd('844')}
            disabled={bulkAdding}
            className="flex items-center gap-2 border border-purple-200 text-purple-700 bg-purple-50 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-100 disabled:opacity-50"
          >
            {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Add All 8-4-4 Subjects ({getAvailablePresets('844').length} remaining)
          </button>
        </div>
      </div>

      {/* Add Subject Form (custom) */}
      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold mb-4 text-[#111111]">Add Custom Subject</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Subject Name *</label>
              <input
                placeholder="e.g. Mathematics"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Subject Code</label>
              <input
                placeholder="e.g. MATH101"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Curriculum *</label>
              <select
                value={formData.curriculum}
                onChange={e => setFormData({ ...formData, curriculum: e.target.value as CurriculumType })}
                className={inputClass}
              >
                <option value="CBE">CBE</option>
                <option value="844">8-4-4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as CategoryType | '' })}
                className={inputClass}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="flex gap-3 md:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={adding}
                className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? 'Adding...' : 'Add Subject'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setFormData(emptyForm); }}
                className="border border-gray-200 px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-[#666666]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
          Loading subjects...
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[#666666] font-medium">No subjects yet</p>
          <p className="text-sm text-gray-400 mt-1">Use the quick-add buttons above to add standard subjects.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([curriculum, subjectList]) => (
          <div key={curriculum} className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#2563EB]" />
              <h3 className="font-semibold text-[#111111]">
                {curriculum === '844' ? '8-4-4' : curriculum} Subjects ({subjectList.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#666666] uppercase tracking-wide">Subject Name</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#666666] uppercase tracking-wide">Code</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#666666] uppercase tracking-wide">Curriculum</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#666666] uppercase tracking-wide">Category</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[#666666] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectList.map(subject => (
                    <tr key={subject.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      {editingId === subject.id ? (
                        <>
                          <td className="py-2 px-3">
                            <input
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 border border-[#2563EB] rounded-lg text-sm focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              value={editForm.code}
                              onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none"
                              placeholder="Code"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={editForm.curriculum}
                              onChange={e => setEditForm({ ...editForm, curriculum: e.target.value as CurriculumType })}
                              className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                            >
                              <option value="CBE">CBE</option>
                              <option value="844">8-4-4</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={editForm.category}
                              onChange={e => setEditForm({ ...editForm, category: e.target.value as CategoryType | '' })}
                              className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                            >
                              <option value="">None</option>
                              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSaveEdit(subject.id)}
                                disabled={saving}
                                className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                title="Save"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 font-medium text-[#111111]">{subject.name}</td>
                          <td className="py-3 px-3 text-[#666666]">{subject.code || <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subject.curriculum === 'CBE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {subject.curriculum === '844' ? '8-4-4' : subject.curriculum}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#666666]">{subject.category || <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(subject)}
                                className="p-1.5 bg-blue-50 text-[#2563EB] rounded-lg hover:bg-blue-100 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(subject.id, subject.name)}
                                disabled={deletingId === subject.id}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === subject.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
