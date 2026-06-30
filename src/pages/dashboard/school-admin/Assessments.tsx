import { useState, useEffect } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle, GraduationCap, CalendarDays, Save, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Assessment {
  id: string;
  name: string;
  type: string;
  term_id: string | null;
  start_date: string | null;
  end_date: string | null;
  weightage: number | null;
  status: string;
  created_at: string;
}

export default function SchoolAdminAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'CAT',
    term_id: '',
    start_date: '',
    end_date: '',
    weightage: 40,
  });
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    if (user?.schoolId) {
      fetchAssessments();
      fetchTerms();
    }
  }, [user?.schoolId]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('school_exams')
        .select('*')
        .eq('school_id', user?.schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAssessments(data || []);
    } catch (err: any) {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async () => {
    const { data } = await supabase
      .from('terms')
      .select('id, name, academic_year')
      .eq('school_id', user?.schoolId)
      .order('academic_year', { ascending: false });
    setTerms(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.term_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        school_id: user?.schoolId,
        name: form.name.trim(),
        type: form.type,
        term_id: form.term_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        weightage: form.weightage,
        status: 'upcoming',
      };
      if (editingId) {
        const { error } = await supabase.from('school_exams').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Assessment updated!');
      } else {
        const { error } = await supabase.from('school_exams').insert(payload);
        if (error) throw error;
        toast.success('Assessment created!');
      }
      resetForm();
      fetchAssessments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('school_exams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Assessment deleted');
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmDelete(null);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    setStatusUpdating(id);
    try {
      const { error } = await supabase.from('school_exams').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      toast.success(`Assessment ${newStatus === 'active' ? 'activated' : 'closed'}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setStatusUpdating(null);
  };

  const handleEdit = (a: Assessment) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      type: a.type || 'CAT',
      term_id: a.term_id || '',
      start_date: a.start_date || '',
      end_date: a.end_date || '',
      weightage: a.weightage || 40,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ name: '', type: 'CAT', term_id: '', start_date: '', end_date: '', weightage: 40 });
    setEditingId(null);
    setShowForm(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>;
      case 'closed': return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Closed</span>;
      case 'upcoming': return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Upcoming</span>;
      default: return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{status}</span>;
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case 'CAT': return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">CAT</span>;
      case 'mid-term': return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Mid-Term</span>;
      case 'end-term': return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">End-Term</span>;
      case 'assignment': return <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Assignment</span>;
      default: return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{type}</span>;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#2563EB]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#1A365D]" />
            Assessments
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage school assessments, CATs, mid-terms, and end-term exams.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-[#1A365D] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2D4A7C] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Assessment'}
        </button>
      </div>

      {/* Info Banner */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-sm text-blue-900">
          <GraduationCap className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          <div className="flex-1">
            <p className="font-bold mb-1">About Assessments</p>
            <p>Assessments are used to organize student evaluations. Each assessment has a weightage that determines how much it contributes to the final grade. Teachers will select an assessment when uploading marks.</p>
          </div>
          <button onClick={() => setShowInfo(false)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Assessment Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit Assessment' : 'New Assessment'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. CAT 1, Mid-Term Exam, End-Term 2025"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type *</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] bg-white"
                    >
                      <option value="CAT">CAT (Continuous Assessment Test)</option>
                      <option value="mid-term">Mid-Term Exam</option>
                      <option value="end-term">End-Term Exam</option>
                      <option value="assignment">Assignment</option>
                      <option value="quiz">Quiz</option>
                      <option value="project">Project</option>
                      <option value="practical">Practical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                    <select
                      value={form.term_id}
                      onChange={e => setForm(p => ({ ...p, term_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] bg-white"
                      required
                    >
                      <option value="">Select Term</option>
                      {terms.map(t => (
                        <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%)</label>
                    <input
                      type="number"
                      value={form.weightage}
                      onChange={e => setForm(p => ({ ...p, weightage: parseInt(e.target.value) || 0 }))}
                      min={0}
                      max={100}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                    />
                    <p className="text-xs text-gray-500 mt-1">How much this assessment contributes to the final grade</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> Start Date
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> End Date
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-[#1A365D] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2D4A7C] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')} Assessment
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assessments List */}
      <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Weight</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No assessments yet</p>
                    <p className="text-xs mt-1">Click "Add Assessment" to create your first one.</p>
                  </td>
                </tr>
              ) : (
                assessments.map((a) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{a.name}</td>
                    <td className="px-6 py-4">{typeBadge(a.type)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {terms.find(t => t.id === a.term_id)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {a.start_date && a.end_date
                        ? `${new Date(a.start_date).toLocaleDateString()} - ${new Date(a.end_date).toLocaleDateString()}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">{a.weightage}%</td>
                    <td className="px-6 py-4">{statusBadge(a.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(a.id, a.status)}
                          disabled={statusUpdating === a.id}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            a.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {statusUpdating === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                            a.status === 'active' ? 'Close' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(a)}
                          className="text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 font-medium"
                        >
                          <Pencil className="w-3 h-3 inline" /> Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(a.id)}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                        >
                          <Trash2 className="w-3 h-3 inline" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Assessment?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. Any marks associated with this assessment will also be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
