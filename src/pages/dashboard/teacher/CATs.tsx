import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import WeightageSlider from '@/components/WeightageSlider';
import { Calculator, Save, ChevronDown, ChevronUp, BookOpen, Users } from 'lucide-react';
import { canTeacherEnterMarks } from '@/lib/permissions';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

interface CATEntry {
  studentId: string;
  catScore: string;
  examScore: string;
}

interface Assignment {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

export default function CATs() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Record<string, CATEntry>>({});
  const [catWeight, setCatWeight] = useState(40);
  const [examWeight, setExamWeight] = useState(60);
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (user?.id) fetchAssignments();
  }, [user?.id]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Get teacher record
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
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setEntries({});

    // Fetch students for this class
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('class_id', assignment.classId)
      .eq('is_active', true)
      .order('last_name');

    setStudents(studentsData || []);

    // Initialize entries
    const init: Record<string, CATEntry> = {};
    (studentsData || []).forEach((s: Student) => {
      init[s.id] = { studentId: s.id, catScore: '', examScore: '' };
    });
    setEntries(init);
  };

  const calculateCombined = (catScore: number, examScore: number): number => {
    return (catScore * catWeight) / 100 + (examScore * examWeight) / 100;
  };

  const handleSave = async () => {
    if (!selectedAssignment || !selectedExam) {
      toast.error('Please select an exam first');
      return;
    }

    setSaving(true);
    try {
      const rows = Object.values(entries)
        .filter((e) => e.catScore !== '' || e.examScore !== '')
        .map((e) => {
          const cat = parseFloat(e.catScore) || 0;
          const exam = parseFloat(e.examScore) || 0;
          const combined = calculateCombined(cat, exam);
          return {
            exam_id: selectedExam,
            student_id: e.studentId,
            subject_id: selectedAssignment.subjectId,
            cat_marks: cat,
            exam_marks: exam,
            combined_marks: combined,
            cat_weightage: catWeight,
            exam_weightage: examWeight,
          };
        });

      if (rows.length === 0) { toast.error('No marks entered'); setSaving(false); return; }

      const { error } = await supabase.from('cat_exam_results').upsert(rows, {
        onConflict: 'exam_id,student_id,subject_id',
      });

      if (error) throw error;
      toast.success(`${rows.length} results saved successfully!`);
      setShowResults(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A365D]"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Continuous Assessment (CATs)</h1>
        <p className="text-gray-500 text-sm mt-1">Enter CAT and exam marks. System auto-calculates combined scores.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignment selector + weightage */}
        <div className="space-y-4">
          {/* My Subjects */}
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
                    <div className="text-xs text-gray-500">Grade {a.className}</div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Exam selector */}
          {selectedAssignment && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Select Exam</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
              >
                <option value="">Choose exam...</option>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}

          {/* Weightage */}
          <WeightageSlider
            catWeight={catWeight}
            examWeight={examWeight}
            onChange={(cat, exam) => { setCatWeight(cat); setExamWeight(exam); }}
          />
        </div>

        {/* Right: Marks entry table */}
        <div className="lg:col-span-2">
          {!selectedAssignment ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Select a subject to enter marks</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    {selectedAssignment.subjectName} — Grade {selectedAssignment.className}
                  </h2>
                  <p className="text-xs text-gray-500">{students.length} students</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving || !selectedExam}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50"
                  style={{ background: '#1A365D' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Marks'}
                </motion.button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                        CAT <span className="text-[#1A365D]">({catWeight}%)</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                        Exam <span style={{ color: '#D4AF37' }}>({examWeight}%)</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                        <Calculator className="w-3.5 h-3.5 inline mr-1" />Combined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const entry = entries[student.id] || { studentId: student.id, catScore: '', examScore: '' };
                      const cat = parseFloat(entry.catScore) || 0;
                      const exam = parseFloat(entry.examScore) || 0;
                      const combined = entry.catScore !== '' || entry.examScore !== ''
                        ? calculateCombined(cat, exam).toFixed(1)
                        : '—';

                      return (
                        <tr key={student.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-gray-900 text-sm">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-xs text-gray-400">{student.admission_number}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={entry.catScore}
                              onChange={(e) => setEntries((prev) => ({
                                ...prev,
                                [student.id]: { ...entry, catScore: e.target.value },
                              }))}
                              placeholder="—"
                              className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={entry.examScore}
                              onChange={(e) => setEntries((prev) => ({
                                ...prev,
                                [student.id]: { ...entry, examScore: e.target.value },
                              }))}
                              placeholder="—"
                              className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <motion.span
                              key={combined}
                              initial={{ scale: 1.2, color: '#D4AF37' }}
                              animate={{ scale: 1, color: '#1A365D' }}
                              transition={{ duration: 0.2 }}
                              className="font-bold text-sm inline-block"
                              style={{ color: '#1A365D' }}
                            >
                              {combined}
                            </motion.span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
