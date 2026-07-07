import { useState, useEffect } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Plus, Loader2, Calendar, ChevronDown, ChevronUp, CheckCircle, Clock, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherHomework() {
  const { user } = useAuth();
  const [homework, setHomework] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [expandedHw, setExpandedHw] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any[]>>({});
  const [gradingData, setGradingData] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', class_id: '', subject_id: '', due_date: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const schoolId = user?.schoolId ?? '';
    const [{ data: h }, { data: c }, { data: s }] = await Promise.all([
      supabaseUntyped.from('homework').select('*, classes(name), subjects(name)').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('classes').select('*').eq('school_id', schoolId),
      supabase.from('subjects').select('*').eq('school_id', schoolId),
    ]);
    setHomework(h || []);
    setClasses(c || []);
    setSubjects(s || []);
    setLoading(false);
  };

  const fetchSubmissions = async (homeworkId: string) => {
    const { data } = await supabaseUntyped
      .from('homework_submissions')
      .select('*, students(first_name, last_name, admission_number)')
      .eq('homework_id', homeworkId)
      .order('submitted_at', { ascending: false });
    setSubmissions(prev => ({ ...prev, [homeworkId]: data || [] }));
  };

  const handleToggleExpand = async (hwId: string) => {
    if (expandedHw === hwId) {
      setExpandedHw(null);
    } else {
      setExpandedHw(hwId);
      if (!submissions[hwId]) {
        await fetchSubmissions(hwId);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { data: teacherData } = await supabaseUntyped
        .from('teachers')
        .select('id')
        .eq('profile_id', user?.id)
        .single();

      const { error } = await supabaseUntyped.from('homework').insert([{
        title: formData.title,
        description: formData.description,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        due_date: formData.due_date,
        school_id: user?.schoolId ?? '',
        teacher_id: teacherData?.id ?? null,
      }]);

      if (error) throw error;
      toast.success('Homework assignment created!');
      setShowAdd(false);
      setFormData({ title: '', description: '', class_id: '', subject_id: '', due_date: '' });
      fetchData();
    } catch (err: any) {
      toast.error('Failed to create homework: ' + err.message);
    }
    setAdding(false);
  };

  const handleSaveGrade = async (submissionId: string, homeworkId: string) => {
    const grade = gradingData[submissionId];
    if (!grade?.marks) {
      toast.error('Please enter marks');
      return;
    }
    setSavingGrade(submissionId);
    try {
      const { error } = await supabaseUntyped
        .from('homework_submissions')
        .update({
          marks_awarded: parseFloat(grade.marks),
          teacher_feedback: grade.feedback || '',
          is_graded: true,
        })
        .eq('id', submissionId);

      if (error) throw error;
      toast.success('Grade saved!');
      await fetchSubmissions(homeworkId);
    } catch (err: any) {
      toast.error('Failed to save grade: ' + err.message);
    }
    setSavingGrade(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Homework</h1>
          <p className="text-sm text-[#666666]">Manage assignments and grade submissions</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8]"
        >
          <Plus className="w-4 h-4" /> Add Homework
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold mb-4">New Assignment</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <input
              placeholder="Title *"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              required
            />
            <textarea
              placeholder="Description / Instructions"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] min-h-[80px]"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={formData.class_id}
                onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                required
              >
                <option value="">Select Class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={formData.subject_id}
                onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={adding}
                className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {adding ? 'Creating...' : 'Add Homework'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="border border-gray-200 px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-[#666666]">Loading...</div>
      ) : homework.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#666666] bg-white rounded-2xl">No homework assignments yet</div>
      ) : (
        <div className="space-y-3">
          {homework.map((h: any) => (
            <div key={h.id} className="bg-white rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleToggleExpand(h.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#111111]">{h.title}</h3>
                      {expandedHw === h.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                    <p className="text-sm text-[#666666] mt-1 line-clamp-1">{h.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#666666]">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {h.due_date}</span>
                      <span>{h.classes?.name}</span>
                      <span>{h.subjects?.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {expandedHw === h.id && (
                <div className="border-t border-gray-100 p-5">
                  <h4 className="text-sm font-semibold text-[#111111] mb-3">
                    Submissions ({(submissions[h.id] || []).length})
                  </h4>
                  {!submissions[h.id] ? (
                    <div className="text-center py-4 text-sm text-[#666666]">Loading submissions...</div>
                  ) : submissions[h.id].length === 0 ? (
                    <div className="text-center py-4 text-sm text-[#666666] bg-gray-50 rounded-xl">No submissions yet</div>
                  ) : (
                    <div className="space-y-4">
                      {submissions[h.id].map((sub: any) => (
                        <div key={sub.id} className="border border-gray-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-[#111111]">
                                {sub.students?.first_name} {sub.students?.last_name}
                              </p>
                              <p className="text-xs text-[#666666]">{sub.students?.admission_number}</p>
                            </div>
                            {sub.is_graded ? (
                              <span className="flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Graded: {sub.marks_awarded}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" /> Submitted
                              </span>
                            )}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-[#333333] whitespace-pre-wrap">{sub.submission_text}</p>
                          </div>

                          {/* Grading form */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="number"
                              placeholder="Marks"
                              value={gradingData[sub.id]?.marks ?? (sub.marks_awarded ?? '')}
                              onChange={e => setGradingData(prev => ({
                                ...prev,
                                [sub.id]: { ...prev[sub.id], marks: e.target.value, feedback: prev[sub.id]?.feedback ?? sub.teacher_feedback ?? '' }
                              }))}
                              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                              min="0"
                            />
                            <input
                              type="text"
                              placeholder="Feedback (optional)"
                              value={gradingData[sub.id]?.feedback ?? (sub.teacher_feedback ?? '')}
                              onChange={e => setGradingData(prev => ({
                                ...prev,
                                [sub.id]: { ...prev[sub.id], feedback: e.target.value, marks: prev[sub.id]?.marks ?? String(sub.marks_awarded ?? '') }
                              }))}
                              className="flex-1 min-w-[160px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            />
                            <button
                              onClick={() => handleSaveGrade(sub.id, h.id)}
                              disabled={savingGrade === sub.id}
                              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              {savingGrade === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                              {sub.is_graded ? 'Update' : 'Grade'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
