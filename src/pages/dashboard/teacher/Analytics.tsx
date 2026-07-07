import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, TrendingUp, Award, Users, AlertTriangle, BookOpen, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface StudentPerformance {
  id: string;
  name: string;
  admission_number: string;
  class_name: string;
  average: number;
  results: Array<{
    subject: string;
    marks: number;
    grade: string;
    term: string;
  }>;
}

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalResults: 0,
    avgMarks: 0,
    topScore: 0,
    studentsCount: 0,
    needsAttention: 0,
  });
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentPerformance[]>([]);
  const [gradeDist, setGradeDist] = useState([
    { grade: 'EE', label: 'Exceeding', count: 0, color: 'bg-green-500' },
    { grade: 'ME', label: 'Meeting', count: 0, color: 'bg-blue-500' },
    { grade: 'AE', label: 'Approaching', count: 0, color: 'bg-orange-500' },
    { grade: 'BE', label: 'Below', count: 0, color: 'bg-red-500' },
  ]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'top' | 'attention'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformance | null>(null);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    const schoolId = user?.schoolId;
    if (!schoolId) { setLoading(false); return; }

    try {
      const { data: teacher } = await supabaseUntyped
        .from('teachers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (!teacher) { setLoading(false); return; }

      const { data: results } = await supabaseUntyped
        .from('results')
        .select(`
          student_id, subject_id, percentage, cbc_grade, cbc_sublevel, marks,
          students(first_name, last_name, admission_number, class_id, classes(name)),
          subjects(name),
          terms(name, academic_year)
        `)
        .eq('teacher_id', teacher.id)
        .eq('school_id', schoolId);

      if (results && results.length > 0) {
        const avg = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length;
        const top = Math.max(...results.map(r => r.percentage || 0));

        const bySubject: Record<string, { name: string; total: number; count: number }> = {};
        results.forEach(r => {
          const name = r.subjects?.name || 'Unknown';
          if (!bySubject[name]) bySubject[name] = { name, total: 0, count: 0 };
          bySubject[name].total += (r.percentage || 0);
          bySubject[name].count++;
        });

        const distribution = { EE: 0, ME: 0, AE: 0, BE: 0 };
        results.forEach(r => {
          const grade = r.cbc_grade || '';
          if (grade.startsWith('EE')) distribution.EE++;
          else if (grade.startsWith('ME')) distribution.ME++;
          else if (grade.startsWith('AE')) distribution.AE++;
          else if (grade.startsWith('BE')) distribution.BE++;
        });
        const totalDist = results.length;

        const byStudent: Record<string, StudentPerformance> = {};
        results.forEach(r => {
          const sid = r.student_id;
          if (!byStudent[sid]) {
            byStudent[sid] = {
              id: sid,
              name: `${r.students?.first_name || ''} ${r.students?.last_name || ''}`,
              admission_number: r.students?.admission_number || '',
              class_name: r.students?.classes?.name || '',
              average: 0,
              results: [],
            };
          }
          byStudent[sid].results.push({
            subject: r.subjects?.name || 'Unknown',
            marks: r.percentage || 0,
            grade: r.cbc_grade || r.cbc_sublevel || '-',
            term: `${r.terms?.name || ''} ${r.terms?.academic_year || ''}`,
          });
        });

        Object.values(byStudent).forEach(s => {
          s.average = Math.round(s.results.reduce((sum, r) => sum + r.marks, 0) / s.results.length);
        });

        const studentsList = Object.values(byStudent).sort((a, b) => b.average - a.average);
        const needsAttention = studentsList.filter(s => s.average < 50).length;

        setSubjectPerformance(Object.values(bySubject).map(s => ({ ...s, avg: Math.round(s.total / s.count) })));
        setStats({
          totalResults: results.length,
          avgMarks: Math.round(avg),
          topScore: top,
          studentsCount: studentsList.length,
          needsAttention,
        });
        setGradeDist([
          { grade: 'EE', label: 'Exceeding', count: Math.round((distribution.EE / totalDist) * 100) || 0, color: 'bg-green-500' },
          { grade: 'ME', label: 'Meeting', count: Math.round((distribution.ME / totalDist) * 100) || 0, color: 'bg-blue-500' },
          { grade: 'AE', label: 'Approaching', count: Math.round((distribution.AE / totalDist) * 100) || 0, color: 'bg-orange-500' },
          { grade: 'BE', label: 'Below', count: Math.round((distribution.BE / totalDist) * 100) || 0, color: 'bg-red-500' },
        ]);
        setStudentPerformance(studentsList);
        setFilteredStudents(studentsList);
      }
    } catch (err) {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (filter === 'top') {
      setFilteredStudents(studentPerformance.filter(s => s.average >= 70));
    } else if (filter === 'attention') {
      setFilteredStudents(studentPerformance.filter(s => s.average < 50));
    } else {
      setFilteredStudents(studentPerformance);
    }
  }, [filter, studentPerformance]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A365D]"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">Analytics</h1><p className="text-sm text-[#666666]">Performance overview and student monitoring</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Results', value: stats.totalResults, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Average Marks', value: `${stats.avgMarks}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green-500' },
          { label: 'Top Score', value: `${stats.topScore}%`, icon: <Award className="w-5 h-5" />, color: 'bg-purple-500' },
          { label: 'Students', value: stats.studentsCount, icon: <Users className="w-5 h-5" />, color: 'bg-orange-500' },
          { label: 'Needs Attention', value: stats.needsAttention, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-500' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white mb-3`}>{card.icon}</div>
            <div className="text-2xl font-bold text-[#111111]">{card.value}</div>
            <div className="text-xs text-[#666666] mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="font-semibold text-[#111111] mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Subject-wise Performance
          </h3>
          <div className="space-y-4">
            {subjectPerformance.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-[#111111]">{s.name}</span>
                  <span className="text-[#666666]">{s.avg}% avg ({s.count} entries)</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full transition-all duration-1000 flex items-center justify-end pr-2" style={{ width: Math.min(s.avg, 100) + '%' }}>
                    <span className="text-[10px] text-white font-medium">{s.avg}%</span>
                  </div>
                </div>
              </div>
            ))}
            {subjectPerformance.length === 0 && <p className="text-sm text-[#666666] text-center py-4">No data yet</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="font-semibold text-[#111111] mb-4">CBE Grade Distribution</h3>
          <div className="flex items-end gap-2 h-40">
            {gradeDist.map((g, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-[#111111]">{g.count}%</span>
                <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '120px' }}>
                  <div className={`w-full ${g.color} rounded-t-lg absolute bottom-0 transition-all duration-1000`} style={{ height: g.count * 1.2 + 'px' }} />
                </div>
                <span className="text-xs font-medium text-[#666666]">{g.grade}</span>
                <span className="text-[10px] text-gray-400">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="font-semibold text-[#111111] flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            Student Performance
          </h3>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {[
              { key: 'all', label: 'All' },
              { key: 'top', label: 'Top Performers' },
              { key: 'attention', label: 'Needs Attention' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === key ? 'bg-[#2563EB] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-sm text-[#666666] text-center py-8">No students match the selected filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Avg %</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{s.name} <span className="text-gray-400 text-xs">({s.admission_number})</span></td>
                    <td className="px-3 py-2 text-gray-500">{s.class_name}</td>
                    <td className="px-3 py-2 font-bold">
                      <span className={`${s.average >= 70 ? 'text-green-600' : s.average >= 50 ? 'text-blue-600' : s.average >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                        {s.average}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{s.results.length}</td>
                    <td className="px-3 py-2">
                      {s.average >= 70 ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Excellent</span>
                      ) : s.average >= 50 ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Good</span>
                      ) : s.average >= 40 ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Approaching</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Needs Attention</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedStudent(selectedStudent?.id === s.id ? null : s)}
                        className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        {selectedStudent?.id === s.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedStudent && (
          <div className="mt-6 border-t pt-6">
            <h4 className="font-semibold text-[#111111] mb-4">
              Full Results: {selectedStudent.name} ({selectedStudent.admission_number})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedStudent.results.map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-medium text-sm text-[#111111]">{r.subject}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{r.term}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.marks >= 80 ? 'bg-green-100 text-green-700' :
                      r.marks >= 60 ? 'bg-blue-100 text-blue-700' :
                      r.marks >= 40 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {r.marks}% ({r.grade})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
