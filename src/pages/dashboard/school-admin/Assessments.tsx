import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Trash2, Edit2, FileText, Calendar, Loader2,
  CheckCircle2, BookOpen, Award, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';

interface Assessment {
  id: string;
  name: string;
  exam_type: string;
  term_id: string | null;
  start_date: string | null;
  end_date: string | null;
  weightage: number | null;
  status: string;
  created_at: string;
}

interface Term {
  id: string;
  name: string;
  academic_year: string;
}

const ASSESSMENT_TYPES = ['CAT', 'Exam', 'Mock', 'Pre-Mock', 'Revision Test', 'Assignment', 'Trial Exam', 'Custom'];

const QUICK_NAMES = [
  'CAT 1', 'CAT 2', 'CAT 3',
  'Opener Exam', 'Midterm Exam', 'End Term Exam',
  'Mock Exam', 'Pre-Mock Exam',
  'Form 4 Trial Exam', 'Form 4 National Trial Exam',
  'Holiday Assignment Test', 'Weekly Assessment 1',
  'Weekly Assessment 2', 'Weekly Assessment 3',
  'Revision Test 1', 'Revision Test 2',
  'End of Year Assessment',
];

export default function Assessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    exam_type: 'CAT',
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
      const { data: examsData } = await supabaseUntyped
        .from('school_exams')
        .select('*')
        .eq('school_id', user?.schoolId)
        .order('created_at', { ascending: false });
      setAssessments(examsData || []);

      const { data: termsData } = await supabaseUntyped
        .from('terms')
        .select('id, name, academic_year')
        .eq('school_id', user?.schoolId)
        .order('academic_year', { ascending: false });
      setTerms(termsData || []);
    } catch {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', exam_type: 'CAT', term_id: '', start_date: '', end_date: '', weightage: 40 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Assessment name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        school_id: user?.schoolId,
        name: form.name.trim(),
        exam_type: form.exam_type,
        term_id: form.term_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        weightage: form.weightage || null,
        status: 'active',
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabaseUntyped.from('school_exams').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Assessment updated!');
      } else {
        const { error } = await supabaseUntyped.from('school_exams').insert(payload);
        if (error) throw error;
        toast.success(`Assessment "${form.name}" created!`);
      }
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: Assessment) => {
    setForm({
      name: a.name,
      exam_type: a.exam_type || 'CAT',
      term_id: a.term_id || '',
      start_date: a.start_date || '',
      end_date: a.end_date || '',
      weightage: a.weightage || 40,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete assessment "${name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabaseUntyped.from('school_exams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Assessment deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
            <Award className="w-6 h-6 text-[#1A365D]" />
            Assessments
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage any assessment with any name</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#1A365D] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#2D4A7C] transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Assessment
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">
              {editingId ? 'Edit Assessment' : 'Create New Assessment'}
            </h2>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Quick Name Presets */}
          {!editingId && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Quick select a name:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_NAMES.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, name: n }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.name === n
                        ? 'bg-[#1A365D] text-white border-[#1A365D]'
                        : 'border-gray-200 text-gray-600 hover:border-[#1A365D] hover:text-[#1A365D]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assessment Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Form 4 Trial Exam, CAT 1, Mock Exams..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={form.exam_type}
                  onChange={e => setForm(p => ({ ...p, exam_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                >
                  {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Term (optional)</label>
                <select
                  value={form.term_id}
                  onChange={e => setForm(p => ({ ...p, term_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                >
                  <option value="">— No specific term —</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Weightage (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weightage}
                  onChange={e => setForm(p => ({ ...p, weightage: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#1A365D] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2D4A7C] transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Saving...' : editingId ? 'Update Assessment' : 'Create Assessment'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assessments List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1A365D]" />
            All Assessments ({assessments.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No assessments yet</p>
            <p className="text-xs mt-1">Create your first assessment using the button above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {assessments.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{a.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.exam_type}</span>
                    {a.weightage && (
                      <span className="text-xs text-gray-400">{a.weightage}%</span>
                    )}
                    {a.start_date && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.start_date).toLocaleDateString('en-KE')}
                        {a.end_date && ` – ${new Date(a.end_date).toLocaleDateString('en-KE')}`}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {a.status || 'active'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(a)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
