import { useState, useEffect } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Save, BookOpen, Users, Plus, Trash2, Edit2,
  ChevronDown, ChevronUp, Award, FileText, BarChart3
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

interface CATRecord {
  id?: string;
  name: string;
  subject_id: string;
  class_id: string;
  max_marks: number;
  weightage: number;
  exam_id: string | null;
  entries: Record<string, number>; // student_id -> marks
}

interface Assignment {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

interface SavedCAT {
  id: string;
  name: string;
  subject_id: string;
  class_id: string;
  max_marks: number;
  weightage: number;
  exam_id: string | null;
  teacher_id: string;
  created_at: string;
}

export default function CATs() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [savedCATs, setSavedCATs] = useState<SavedCAT[]>([]);
  const [viewMode, setViewMode] = useState<'create' | 'view' | 'marks'>('create');

  // Create CAT form
  const [catName, setCatName] = useState('');
  const [maxMarks, setMaxMarks] = useState(30);
  const [weightage, setWeightage] = useState(30);
  const [selectedExam, setSelectedExam] = useState('');
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);

  // Marks entry
  const [marksEntries, setMarksEntries] = useState<Record<string, number>>({});
  const [selectedCAT, setSelectedCAT] = useState<SavedCAT | null>(null);
  const [savingMarks, setSavingMarks] = useState(false);

  // CAT results view
  const [catResults, setCatResults] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id, school_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (!teacher) { setLoading(false); return; }

      // Get assignments
      const { data: assignData } = await supabase
        .from('teacher_subject_assignments')
        .select(`
          subject_id,
          class_id,
          subjects(name),
          classes(name)
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true);

      const mapped: Assignment[] = (assignData || []).map((a: any) => ({
        subjectId: a.subject_id,
        subjectName: a.subjects?.name || '',
        classId: a.class_id,
        className: a.classes?.name || '',
      }));
      setAssignments(mapped);

      // Get exams
      const { data: examData } = await supabase
        .from('school_exams')
        .select('id, name')
        .eq('school_id', teacher.school_id)
        .order('created_at', { ascending: false });
      setExams(examData || []);

      // Get saved CATs for this teacher
      await fetchSavedCATs(teacher.id);
    } catch (err) {
      toast.error('Failed to load assignments');
    }
    setLoading(false);
  };

  const fetchSavedCATs = async (teacherId?: string) => {
    const tid = teacherId || selectedCAT?.teacher_id;
    if (!tid) return;
    const { data } = await supabaseUntyped
      .from('school_exams')
      .select('*')
      .eq('created_by', tid)
      .eq('type', 'CAT')
      .order('created_at', { ascending: false });
    setSavedCATs((data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      subject_id: d.subject_id || '',
      class_id: d.class_id || '',
      max_marks: d.max_marks || 30,
      weightage: d.weightage || 30,
      exam_id: d.exam_id || null,
      teacher_id: d.created_by,
      created_at: d.created_at,
    })));
  };

  const handleSelectAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewMode('create');

    // Fetch students for this class
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('class_id', assignment.classId)
      .eq('is_active', true)
      .order('last_name');

    setStudents(studentsData || []);
    setMarksEntries({});
  };

  const createCAT = async () => {
    if (!catName.trim()) { toast.error('Please enter a CAT name'); return; }
    if (!selectedAssignment) { toast.error('Please select a subject'); return; }

    setCreating(true);
    try {
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id, school_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      const { data, error } = await supabaseUntyped
        .from('school_exams')
        .insert({
          school_id: teacher.school_id,
          name: catName.trim(),
          type: 'CAT',
          term_id: selectedExam || null,
          weightage: weightage,
          created_by: teacher.id,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      toast.success(`CAT "${catName}" created successfully!`);
      setCatName('');
      setMaxMarks(30);
      setWeightage(30);
      await fetchSavedCATs(teacher.id);
      setViewMode('view');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create CAT');
    }
    setCreating(false);
  };

  const handleSelectCATForMarks = async (cat: SavedCAT) => {
    setSelectedCAT(cat);
    setViewMode('marks');

    // Find the assignment for this CAT
    const assignment = assignments.find(
      a => a.subjectId === cat.subject_id && a.classId === cat.class_id
    );
    if (assignment) {
      setSelectedAssignment(assignment);
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, admission_number')
        .eq('class_id', assignment.classId)
        .eq('is_active', true)
        .order('last_name');
      setStudents(studentsData || []);
    }

    // Load existing marks
    const { data: existingResults } = await supabaseUntyped
      .from('cat_exam_results')
      .select('student_id, cat_marks')
      .eq('exam_id', cat.id);

    const entries: Record<string, number> = {};
    (existingResults || []).forEach((r: any) => {
      entries[r.student_id] = r.cat_marks;
    });
    setMarksEntries(entries);
  };

  const saveMarks = async () => {
    if (!selectedCAT || !selectedAssignment) { toast.error('Please select a CAT'); return; }

    const filledEntries = Object.entries(marksEntries).filter(([_, marks]) => marks !== undefined && !isNaN(marks));
    if (filledEntries.length === 0) { toast.error('No marks entered'); return; }

    setSavingMarks(true);
    try {
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      const rows = filledEntries.map(([studentId, marks]) => ({
        exam_id: selectedCAT.id,
        student_id: studentId,
        subject_id: selectedAssignment.subjectId,
        class_id: selectedAssignment.classId,
        teacher_id: teacher?.id,
        cat_marks: marks,
        exam_marks: 0,
        cat_weightage: selectedCAT.weightage,
        exam_weightage: 100 - selectedCAT.weightage,
      }));

      const { error } = await supabaseUntyped
        .from('cat_exam_results')
        .upsert(rows, {
          onConflict: 'exam_id,student_id,subject_id',
        });

      if (error) throw error;
      toast.success(`${rows.length} marks saved successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save marks');
    }
    setSavingMarks(false);
  };

  const viewCATResults = async (cat: SavedCAT) => {
    setSelectedCAT(cat);
    setViewMode('results');

    const { data } = await supabaseUntyped
      .from('cat_exam_results')
      .select(`
        *,
        students(first_name, last_name, admission_number)
      `)
      .eq('exam_id', cat.id)
      .order('cat_marks', { ascending: false });

    setCatResults(data || []);
  };

  const deleteCAT = async (catId: string) => {
    if (!confirm('Delete this CAT? All associated marks will also be deleted.')) return;
    try {
      await supabaseUntyped.from('cat_exam_results').delete().eq('exam_id', catId);
      await supabaseUntyped.from('school_exams').delete().eq('id', catId);
      toast.success('CAT deleted');
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();
      await fetchSavedCATs(teacher?.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A365D]"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#1A365D]" />
            Continuous Assessment (CATs)
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create custom CATs, enter marks independently, and track student performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignment selector */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4" style={{ color: '#1A365D' }} /> My Subjects
            </h2>
            {assignments.length === 0 ? (
              <p className="text-xs text-gray-400">No subjects assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <motion.button
                    key={`${a.subjectId}-${a.classId}`}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleSelectAssignment(a)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                      selectedAssignment?.subjectId === a.subjectId && selectedAssignment?.classId === a.classId
                        ? 'border-[#1A365D] bg-[#1A365D]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{a.subjectName}</div>
                    <div className="text-xs text-gray-500">{a.className}</div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Saved CATs */}
          {selectedAssignment && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-green-600" /> My CATs for {selectedAssignment.subjectName}
              </h2>
              {savedCATs.filter(c => c.subject_id === selectedAssignment.subjectId && c.class_id === selectedAssignment.classId).length === 0 ? (
                <p className="text-xs text-gray-400">No CATs created yet.</p>
              ) : (
                <div className="space-y-2">
                  {savedCATs
                    .filter(c => c.subject_id === selectedAssignment.subjectId && c.class_id === selectedAssignment.classId)
                    .map(cat => (
                      <div key={cat.id} className="p-3 rounded-xl border border-gray-200 text-sm">
                        <div className="font-semibold text-gray-900">{cat.name}</div>
                        <div className="text-xs text-gray-500 mt-1">Max: {cat.max_marks} | Weight: {cat.weightage}%</div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleSelectCATForMarks(cat)} className="text-xs bg-[#1A365D] text-white px-3 py-1 rounded-lg hover:bg-[#2D4A7C]">
                            Enter Marks
                          </button>
                          <button onClick={() => viewCATResults(cat)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200">
                            View
                          </button>
                          <button onClick={() => deleteCAT(cat.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Main content area */}
        <div className="lg:col-span-2">
          {!selectedAssignment ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Select a subject to manage CATs</p>
            </div>
          ) : viewMode === 'create' ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1A365D]" />
                Create New CAT
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">CAT Name *</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    placeholder="e.g. CAT 1, Quiz 1, End of Topic Test..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Max Marks</label>
                    <input
                      type="number"
                      value={maxMarks}
                      onChange={e => setMaxMarks(parseInt(e.target.value) || 30)}
                      min={1}
                      max={100}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Weightage (%)</label>
                    <input
                      type="number"
                      value={weightage}
                      onChange={e => setWeightage(parseInt(e.target.value) || 30)}
                      min={0}
                      max={100}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Link to Term (optional)</label>
                  <select
                    value={selectedExam}
                    onChange={e => setSelectedExam(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                  >
                    <option value="">No specific term</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>

                {/* Quick name presets */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Quick select a name:</p>
                  <div className="flex flex-wrap gap-2">
                    {['CAT 1', 'CAT 2', 'CAT 3', 'Quiz 1', 'Quiz 2', 'End of Topic Test', 'Mid-Topic Assessment', 'Opener Test'].map(name => (
                      <button
                        key={name}
                        onClick={() => setCatName(name)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-[#1A365D] hover:text-[#1A365D] transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createCAT}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A365D] text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create CAT'}
                </motion.button>
              </div>
            </div>
          ) : viewMode === 'marks' && selectedCAT ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    {selectedCAT.name} — {selectedAssignment.subjectName}
                  </h2>
                  <p className="text-xs text-gray-500">{students.length} students | Max: {selectedCAT.max_marks} marks | Weight: {selectedCAT.weightage}%</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('view')}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
                  >
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={saveMarks}
                    disabled={savingMarks}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50"
                    style={{ background: '#1A365D' }}
                  >
                    {savingMarks ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingMarks ? 'Saving...' : 'Save Marks'}
                  </motion.button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Adm #</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                        Marks (out of {selectedCAT.max_marks})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr key={student.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                        <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900 text-sm">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{student.admission_number}</td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={selectedCAT.max_marks}
                            step={0.5}
                            value={marksEntries[student.id] || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setMarksEntries(prev => ({
                                ...prev,
                                [student.id]: isNaN(val) ? 0 : val,
                              }));
                            }}
                            placeholder="—"
                            className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'results' ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#1A365D]" />
                  {selectedCAT?.name} Results
                </h2>
                <button onClick={() => setViewMode('view')} className="text-xs text-gray-500 hover:text-gray-700">
                  Back to CATs
                </button>
              </div>
              {catResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No marks entered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">CAT Marks</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {catResults.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">
                            {r.students?.first_name} {r.students?.last_name}
                          </td>
                          <td className="px-3 py-2 font-bold">{r.cat_marks}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              (r.cat_marks / (selectedCAT?.max_marks || 30)) * 100 >= 80 ? 'bg-green-100 text-green-700' :
                              (r.cat_marks / (selectedCAT?.max_marks || 30)) * 100 >= 60 ? 'bg-blue-100 text-blue-700' :
                              (r.cat_marks / (selectedCAT?.max_marks || 30)) * 100 >= 40 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {(r.cat_marks / (selectedCAT?.max_marks || 30)) * 100 >= 80 ? 'EE' :
                               (r.cat_marks / (selectedCAT?.max_marks || 30)) * 100 >= 60 ? 'ME' :
                               (r.cat_marks / (selectedCAT?.max_marks || 30)) * 100 >= 40 ? 'AE' : 'BE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-400">Select an option from the left panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
