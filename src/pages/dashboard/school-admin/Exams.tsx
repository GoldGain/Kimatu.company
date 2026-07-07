import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2, AlertCircle, CheckCircle, FileText, Calendar, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Exam {
  id: string;
  name: string;
  type: string;
  term_id: string | null;
  start_date: string | null;
  end_date: string | null;
  weightage: number | null;
  created_at: string;
}

interface Term {
  id: string;
  name: string;
}

const EXAM_TYPES = ['CAT', 'Exam', 'Mock', 'Pre-Mock', 'Revision', 'Custom'];

const PRESET_NAMES = [
  'CAT 1', 'CAT 2', 'CAT 3',
  'Midterm Exam', 'End Term Exam',
  'Mock Exam', 'Pre-Mock Exam',
  'Holiday Assignment Test', 'Weekly Assessment',
];

export default function Exams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    customName: '',
    type: 'CAT',
    term_id: '',
    start_date: '',
    end_date: '',
    weightage: 40,
  });

  useEffect(() => {
    if (user?.schoolId) fetchData();
  }, [user?.schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: examsData } = await supabase
        .from('school_exams')
        .select('*')
        .eq('school_id', user?.schoolId)
        .order('created_at', { ascending: false });
      setExams(examsData || []);

      const { data: termsData } = await supabase
        .from('terms')
        .select('id, name')
        .eq('school_id', user?.schoolId)
        .order('name');
      setTerms(termsData || []);
    } catch (err) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const examName = form.name === '__custom__' ? form.customName.trim() : form.name;
    if (!examName) { toast.error('Please enter an exam name'); return; }

    setSaving(true);
    try {
      const payload = {
        school_id: user?.schoolId,
        name: examName,
        type: form.type,
        term_id: form.term_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        weightage: form.weightage,
      };

      if (editingId) {
        const { error } = await supabase.from('school_exams').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Exam updated!');
      } else {
        const { error } = await supabase.from('school_exams').insert(payload);
        if (error) throw error;
        toast.success('Exam created!');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exam? This cannot be undone.')) return;
    const { error } = await supabase.from('school_exams').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Exam deleted');
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEdit = (exam: Exam) => {
    const isPreset = PRESET_NAMES.includes(exam.name);
    setForm({
      name: isPreset ? exam.name : '__custom__',
      customName: isPreset ? '' : exam.name,
      type: exam.type || 'CAT',
      term_id: exam.term_id || '',
      start_date: exam.start_date || '',
      end_date: exam.end_date || '',
      weightage: exam.weightage || 40,
    });
    setEditingId(exam.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: '', customName: '', type: 'CAT', term_id: '', start_date: '', end_date: '', weightage: 40 });
  };

  const typeColors: Record<string, string> = {
    CAT: 'bg-blue-100 text-blue-700',
    Exam: 'bg-purple-100 text-purple-700',
    Mock: 'bg-orange-100 text-orange-700',
    'Pre-Mock': 'bg-yellow-100 text-yellow-700',
    Revision: 'bg-green-100 text-green-700',
    Custom: 'bg-gray-100 text-gray-700',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A365D]"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Exam Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage all types of exams — CATs, Mocks, Custom assessments</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm"
          style={{ background: '#1A365D' }}
        >
          <Plus className="w-4 h-4" /> New Exam
        </motion.button>
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
          >
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#1A365D' }} />
              {editingId ? 'Edit Exam' : 'Create New Exam'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exam Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Exam Name</label>
                <select
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30 mb-2"
                >
                  <option value="">Select preset name...</option>
                  {PRESET_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value="__custom__">Custom name...</option>
                </select>
                {form.name === '__custom__' && (
                  <input
                    type="text"
                    placeholder="e.g. Form 4 National Trial Exam"
                    value={form.customName}
                    onChange={(e) => setForm({ ...form, customName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                  />
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Exam Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                >
                  {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Term */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Term (optional)</label>
                <select
                  value={form.term_id}
                  onChange={(e) => setForm({ ...form, term_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                >
                  <option value="">No specific term</option>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                />
              </div>

              {/* Weightage */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                  Weightage: <span style={{ color: '#1A365D' }}>{form.weightage}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.weightage}
                  onChange={(e) => setForm({ ...form, weightage: parseInt(e.target.value) })}
                  className="w-full accent-[#1A365D]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span className="font-semibold text-gray-600">e.g. CAT=40%, Exam=60%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: '#1A365D' }}
                >
                  {saving ? 'Saving...' : editingId ? 'Update Exam' : 'Create Exam'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exams List */}
      {exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No exams created yet.</p>
          <p className="text-sm">Click "New Exam" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{exam.name}</h3>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${typeColors[exam.type] || typeColors.Custom}`}>
                      {exam.type}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEdit(exam)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#1A365D] hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  {exam.start_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {exam.start_date}{exam.end_date ? ` → ${exam.end_date}` : ''}
                    </div>
                  )}
                  {exam.weightage !== null && (
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      Weightage: <span className="font-bold text-gray-700">{exam.weightage}%</span>
                    </div>
                  )}
                </div>

                {exam.weightage !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: '#1A365D' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${exam.weightage}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
