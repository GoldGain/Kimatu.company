import { useState, useEffect } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Loader2, AlertCircle, Users, BookOpen, CheckCircle2, XCircle, Search } from 'lucide-react';
import { MarksProgress } from '@/components/MarksProgress';

interface ClassInfo {
  id: string;
  name: string;
  level: number;
}

interface Term {
  id: string;
  name: string;
  academic_year: string;
  is_current: boolean;
}

interface MissingMarksStudent {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  missingSubjects: string[];
}

export default function MarksOverview() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [missingMarksStudents, setMissingMarksStudents] = useState<Record<string, MissingMarksStudent[]>>({});
  const [loadingMissing, setLoadingMissing] = useState<Record<string, boolean>>({});
  const [searchStudent, setSearchStudent] = useState('');

  useEffect(() => {
    if (user?.schoolId) fetchData();
  }, [user?.schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: classesData }, { data: termsData }] = await Promise.all([
        (supabase as any)
          .from('classes')
          .select('id, name, level')
          .eq('school_id', user?.schoolId)
          .eq('is_active', true)
          .order('level'),
        (supabase as any)
          .from('terms')
          .select('id, name, academic_year, is_current')
          .eq('school_id', user?.schoolId)
          .order('academic_year', { ascending: false }),
      ]);

      setClasses(classesData || []);
      const allTerms = termsData || [];
      setTerms(allTerms);

      // Auto-select current term
      const current = allTerms.find((t: Term) => t.is_current);
      if (current) setSelectedTerm(current.id);
      else if (allTerms.length > 0) setSelectedTerm(allTerms[0].id);
    } catch (err) {
      console.error('MarksOverview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissingMarks = async (classId: string) => {
    if (!selectedTerm || !user?.schoolId) return;
    setLoadingMissing(prev => ({ ...prev, [classId]: true }));

    try {
      // Get all students in the class
      const { data: studentsData } = await supabaseUntyped
        .from('students')
        .select('id, first_name, last_name, admission_number')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('first_name');

      // Get all subject assignments for this class
      const { data: assignments } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .select('subject_id, subjects(name)')
        .eq('class_id', classId)
        .eq('school_id', user.schoolId)
        .eq('is_active', true);

      if (!studentsData || !assignments || assignments.length === 0) {
        setMissingMarksStudents(prev => ({ ...prev, [classId]: [] }));
        setLoadingMissing(prev => ({ ...prev, [classId]: false }));
        return;
      }

      const subjectMap = new Map<string, string>();
      assignments.forEach((a: any) => {
        subjectMap.set(a.subject_id, a.subjects?.name || 'Unknown');
      });

      const missingStudents: MissingMarksStudent[] = [];

      for (const student of studentsData) {
        const missingSubjects: string[] = [];

        for (const [subjectId, subjectName] of subjectMap) {
          const { count } = await supabaseUntyped
            .from('results')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)
            .eq('subject_id', subjectId)
            .eq('term_id', selectedTerm)
            .eq('student_id', student.id);

          if (!count || count === 0) {
            missingSubjects.push(subjectName);
          }
        }

        if (missingSubjects.length > 0) {
          missingStudents.push({
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            admission_number: student.admission_number,
            missingSubjects,
          });
        }
      }

      setMissingMarksStudents(prev => ({ ...prev, [classId]: missingStudents }));
    } catch (err) {
      console.error('fetchMissingMarks error:', err);
    } finally {
      setLoadingMissing(prev => ({ ...prev, [classId]: false }));
    }
  };

  const toggleClass = (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      if (!missingMarksStudents[classId]) {
        fetchMissingMarks(classId);
      }
    }
  };

  const filteredMissingStudents = (classId: string) => {
    const students = missingMarksStudents[classId] || [];
    if (!searchStudent.trim()) return students;
    const search = searchStudent.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search) ||
      s.admission_number?.toLowerCase().includes(search)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marks Entry Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor marks entry progress across all classes and identify students with missing marks</p>
      </div>

      {/* Term selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Term</label>
        <select
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a term --</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.academic_year}){t.is_current ? ' - Current' : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : !selectedTerm ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Please select a term to view marks progress</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No classes found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleClass(cls.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-gray-900">{cls.name}</span>
                    {cls.level !== null && (
                      <span className="text-xs text-gray-400 ml-2">Grade {cls.level}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedClass === cls.id ? (
                    <span className="text-xs text-blue-600 font-medium">Hide Details</span>
                  ) : (
                    <span className="text-xs text-blue-600 font-medium">View Details</span>
                  )}
                </div>
              </button>

              {expandedClass === cls.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  {/* Marks Progress */}
                  <div className="pt-4">
                    <MarksProgress
                      classId={cls.id}
                      className={cls.name}
                      termId={selectedTerm}
                      schoolId={user?.schoolId || ''}
                    />
                  </div>

                  {/* Missing Marks Section */}
                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-red-500" />
                        Students with Missing Marks
                      </h4>
                      <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search students..."
                          value={searchStudent}
                          onChange={e => setSearchStudent(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {loadingMissing[cls.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const filtered = filteredMissingStudents(cls.id);
                          if (filtered.length === 0) {
                            return (
                              <div className="flex items-center gap-2 py-3 px-4 bg-green-50 rounded-xl">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700">
                                  {searchStudent.trim() ? 'No matching students found.' : 'All students have marks entered for all subjects!'}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {filtered.map(student => (
                                <div key={student.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {student.first_name} {student.last_name}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        ({student.admission_number || 'No Adm#'})
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {student.missingSubjects.map(subj => (
                                        <span key={subj} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                                          <BookOpen className="w-3 h-3" />
                                          {subj}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-red-600 flex-shrink-0">
                                    {student.missingSubjects.length} missing
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
