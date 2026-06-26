import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Download, Loader2, BookOpen, TrendingUp, Award, BarChart3, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getSchoolLevelBand } from '@/lib/grading';
import ClassTeacherAlerts from '@/components/ClassTeacherAlerts';

interface StudentPerformance {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  gender: string;
  avgPercentage: number | null;
  totalPoints: number | null;
  position: number | null;
  subjectResults: Record<string, { pct: number; grade: string }>;
}

export default function ClassTeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedClass, setAssignedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [performance, setPerformance] = useState<StudentPerformance[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'performance'>('overview');

  useEffect(() => {
    if (user?.id) fetchTeacherData();
  }, [user]);

  useEffect(() => {
    if (selectedTerm && assignedClass) fetchPerformance();
  }, [selectedTerm, assignedClass]);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const { data: teacherData, error: teacherError } = await supabaseUntyped
        .from('teachers')
        .select('*, assigned_class_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (teacherError) throw teacherError;

      // Determine the class: use assigned_class_id or class_teacher_id lookup
      let classId = teacherData?.assigned_class_id;
      if (!classId) {
        // Fallback: find class where class_teacher_id = teacher.id
        const { data: cls } = await supabaseUntyped
          .from('classes')
          .select('*')
          .eq('class_teacher_id', teacherData?.id)
          .maybeSingle();
        if (cls) classId = cls.id;
      }

      if (!classId) {
        setLoading(false);
        return;
      }

      // Fetch the class details
      const { data: classData } = await supabaseUntyped
        .from('classes')
        .select('*')
        .eq('id', classId)
        .maybeSingle();

      setAssignedClass(classData);

      if (classData) {
        // Fetch students
        const { data: studentsData } = await supabaseUntyped
          .from('students')
          .select('id, first_name, last_name, admission_number, gender, photo_url')
          .eq('class_id', classId)
          .eq('is_active', true)
          .order('first_name');
        setStudents(studentsData || []);

        // Fetch subjects via teacher_subject_assignments
        const { data: assignments } = await supabaseUntyped
          .from('teacher_subject_assignments')
          .select('subjects(id, name)')
          .eq('class_id', classId)
          .eq('is_active', true);

        const uniqueSubjects: any[] = [];
        const seen = new Set<string>();
        (assignments || []).forEach((a: any) => {
          if (a.subjects && !seen.has(a.subjects.id)) {
            seen.add(a.subjects.id);
            uniqueSubjects.push(a.subjects);
          }
        });
        setSubjects(uniqueSubjects);

        // Fetch terms
        const { data: termsData } = await supabaseUntyped
          .from('terms')
          .select('*')
          .eq('school_id', classData.school_id)
          .order('academic_year', { ascending: false });
        setTerms(termsData || []);
        if (termsData && termsData.length > 0) setSelectedTerm(termsData[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching teacher data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    if (!assignedClass || !selectedTerm) return;
    setLoadingPerf(true);
    try {
      const { data: results } = await supabaseUntyped
        .from('results')
        .select('student_id, subject_id, marks, out_of, percentage, cbc_grade, cbc_sublevel, cbc_points, grade_844, subjects(name)')
        .eq('class_id', assignedClass.id)
        .eq('term_id', selectedTerm);

      if (!results || results.length === 0) {
        setPerformance([]);
        setLoadingPerf(false);
        return;
      }

      const band = getSchoolLevelBand(assignedClass);
      const is844 = String(assignedClass.curriculum || '').toUpperCase() === '844';

      // Group by student
      const studentMap: Record<string, { total: number; count: number; points: number; subjects: Record<string, any> }> = {};
      results.forEach((r: any) => {
        if (!studentMap[r.student_id]) {
          studentMap[r.student_id] = { total: 0, count: 0, points: 0, subjects: {} };
        }
        const pct = r.percentage ?? (r.out_of > 0 ? Math.round((r.marks / r.out_of) * 100) : 0);
        studentMap[r.student_id].total += pct;
        studentMap[r.student_id].count += 1;
        studentMap[r.student_id].points += r.cbc_points ?? r.points_844 ?? 0;
        const grade = is844 ? (r.grade_844 || '') : (r.cbc_sublevel || r.cbc_grade || '');
        studentMap[r.student_id].subjects[r.subjects?.name || r.subject_id] = { pct, grade };
      });

      // Merge with student list and rank
      const perf: StudentPerformance[] = students.map(s => {
        const data = studentMap[s.id];
        return {
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          gender: s.gender,
          avgPercentage: data ? Math.round(data.total / data.count) : null,
          totalPoints: data ? data.points : null,
          position: null,
          subjectResults: data?.subjects || {},
        };
      });

      // Rank by average percentage
      const ranked = [...perf].sort((a, b) => (b.avgPercentage ?? -1) - (a.avgPercentage ?? -1));
      ranked.forEach((s, i) => { s.position = s.avgPercentage !== null ? i + 1 : null; });

      setPerformance(ranked);
    } catch (err: any) {
      toast.error('Failed to load performance data');
    } finally {
      setLoadingPerf(false);
    }
  };

  const classAvg = performance.length > 0
    ? Math.round(performance.filter(p => p.avgPercentage !== null).reduce((s, p) => s + (p.avgPercentage || 0), 0) / performance.filter(p => p.avgPercentage !== null).length)
    : null;

  const gradeColor = (grade: string) => {
    if (grade?.startsWith('EE') || grade === 'A' || grade === 'A-') return 'bg-green-100 text-green-700';
    if (grade?.startsWith('ME') || grade?.startsWith('B')) return 'bg-blue-100 text-blue-700';
    if (grade?.startsWith('AE') || grade?.startsWith('C')) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPerf = performance.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (!assignedClass) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-dashed border-gray-300">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Class Assigned</h2>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">You haven't been assigned as a Class Teacher yet. Please contact your School Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Class Teacher Dashboard</h1>
          <p className="text-sm text-[#666666]">Managing <strong>{assignedClass.name}</strong> · {assignedClass.curriculum} · Grade {assignedClass.grade_level ?? assignedClass.level}</p>
        </div>
        {terms.length > 0 && (
          <select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
          >
            {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500">Students</span></div>
          <div className="text-2xl font-bold text-gray-900">{students.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500">Learning Areas</span></div>
          <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-purple-600" /><span className="text-xs text-gray-500">Class Average</span></div>
          <div className="text-2xl font-bold text-gray-900">{classAvg !== null ? `${classAvg}%` : '—'}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1"><Award className="w-4 h-4 text-yellow-600" /><span className="text-xs text-gray-500">Results In</span></div>
          <div className="text-2xl font-bold text-gray-900">{performance.filter(p => p.avgPercentage !== null).length}/{students.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['overview', 'students', 'performance'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Class Teacher Alerts */}
          <ClassTeacherAlerts classId={assignedClass.id} teacherId={user?.id || ''} />
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Learning Areas in {assignedClass.name}</h3>
            {subjects.length === 0 ? (
              <p className="text-gray-500 text-sm">No learning areas assigned to this class yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subjects.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">{sub.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 students */}
          {performance.filter(p => p.avgPercentage !== null).length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Top 5 Students</h3>
              <div className="space-y-3">
                {performance.filter(p => p.avgPercentage !== null).slice(0, 5).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>{i + 1}</span>
                      <span className="text-sm font-medium">{s.first_name} {s.last_name}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{s.avgPercentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Student List ({filteredStudents.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Adm No</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Gender</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-6 text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-6 text-gray-500">{s.admission_number}</td>
                    <td className="py-3 px-6 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                    <td className="py-3 px-6 capitalize text-gray-600">{s.gender || '—'}</td>
                    <td className="py-3 px-6"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Class Performance Rankings</h3>
            <p className="text-xs text-gray-500 mt-1">Ranked by average percentage across all subjects</p>
          </div>
          {loadingPerf ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : filteredPerf.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No results uploaded for this term yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Pos</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Avg %</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Learning Areas Done</th>
                    {subjects.slice(0, 5).map(sub => (
                      <th key={sub.id} className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{sub.name.substring(0, 6)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPerf.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-3 px-6">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${s.position === 1 ? 'bg-yellow-100 text-yellow-700' : s.position === 2 ? 'bg-gray-200 text-gray-700' : s.position === 3 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                          {s.position ?? '—'}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                      <td className="py-3 px-6 font-bold text-blue-600">{s.avgPercentage !== null ? `${s.avgPercentage}%` : '—'}</td>
                      <td className="py-3 px-6 text-gray-500">{Object.keys(s.subjectResults).length}</td>
                      {subjects.slice(0, 5).map(sub => {
                        const sr = s.subjectResults[sub.name];
                        return (
                          <td key={sub.id} className="py-3 px-6">
                            {sr ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor(sr.grade)}`}>{sr.grade || `${sr.pct}%`}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
