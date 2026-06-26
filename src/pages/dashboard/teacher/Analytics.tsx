import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, TrendingUp, Award, Users } from 'lucide-react';

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalResults: 0, avgMarks: 0, topGrade: 0, studentsCount: 0 });
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    const schoolId = user?.schoolId;
    if (!schoolId) return;

    // Get teacher record first
    const { data: teacher } = await supabaseUntyped
      .from('teachers')
      .select('id')
      .eq('profile_id', user?.id)
      .maybeSingle();

    if (!teacher) return;

    // Fetch results for this teacher's assigned subjects
    const { data: results } = await supabaseUntyped
      .from('results')
      .select('*, subjects(name)')
      .eq('teacher_id', teacher.id)
      .eq('school_id', schoolId);

    const { count: sCount } = await supabaseUntyped
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);
    
    if (results && results.length > 0) {
      const avg = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length;
      const top = Math.max(...results.map(r => r.percentage || 0));
      
      // Group by subject
      const bySubject: Record<string, { name: string; total: number; count: number }> = {};
      results.forEach(r => {
        const name = r.subjects?.name || 'Unknown';
        if (!bySubject[name]) bySubject[name] = { name, total: 0, count: 0 };
        bySubject[name].total += (r.percentage || 0);
        bySubject[name].count++;
      });

      // Grade distribution
      const distribution = { EE: 0, ME: 0, AE: 0, BE: 0 };
      results.forEach(r => {
        const grade = r.cbc_grade || '';
        if (grade.startsWith('EE')) distribution.EE++;
        else if (grade.startsWith('ME')) distribution.ME++;
        else if (grade.startsWith('AE')) distribution.AE++;
        else if (grade.startsWith('BE')) distribution.BE++;
      });
      const totalDist = results.length;
      
      setSubjectPerformance(Object.values(bySubject).map(s => ({ ...s, avg: Math.round(s.total / s.count) })));
      setStats({ totalResults: results.length, avgMarks: Math.round(avg), topGrade: top, studentsCount: sCount || 0 });
      setGradeDist([
        { grade: 'EE', label: 'Exceeding', count: Math.round((distribution.EE / totalDist) * 100), color: 'bg-green-500' },
        { grade: 'ME', label: 'Meeting', count: Math.round((distribution.ME / totalDist) * 100), color: 'bg-blue-500' },
        { grade: 'AE', label: 'Approaching', count: Math.round((distribution.AE / totalDist) * 100), color: 'bg-orange-500' },
        { grade: 'BE', label: 'Below', count: Math.round((distribution.BE / totalDist) * 100), color: 'bg-red-500' },
      ]);
    }
  };

  const [gradeDist, setGradeDist] = useState([
    { grade: 'EE', label: 'Exceeding', count: 0, color: 'bg-green-500' },
    { grade: 'ME', label: 'Meeting', count: 0, color: 'bg-blue-500' },
    { grade: 'AE', label: 'Approaching', count: 0, color: 'bg-orange-500' },
    { grade: 'BE', label: 'Below', count: 0, color: 'bg-red-500' },
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">Analytics</h1><p className="text-sm text-[#666666]">Performance overview</p></div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Results', value: stats.totalResults, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Average Marks', value: `${stats.avgMarks}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green-500' },
          { label: 'Top Score', value: `${stats.topGrade}%`, icon: <Award className="w-5 h-5" />, color: 'bg-purple-500' },
          { label: 'Students', value: stats.studentsCount, icon: <Users className="w-5 h-5" />, color: 'bg-orange-500' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white mb-3`}>{card.icon}</div>
            <div className="text-2xl font-bold text-[#111111]">{card.value}</div>
            <div className="text-xs text-[#666666] mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4">Subject-wise Performance</h3>
        <div className="space-y-4">
          {subjectPerformance.map((s, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-[#111111]">{s.name}</span>
                <span className="text-[#666666]">{s.avg}% avg ({s.count} entries)</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#2563EB] rounded-full transition-all duration-1000 flex items-center justify-end pr-2" style={{ width: `${s.avg}%` }}>
                  <span className="text-[10px] text-white font-medium">{s.avg}%</span>
                </div>
              </div>
            </div>
          ))}
          {subjectPerformance.length === 0 && <p className="text-sm text-[#666666] text-center py-4">No data yet</p>}
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4">CBE Grade Distribution</h3>
        <div className="flex items-end gap-2 h-40">
          {gradeDist.map((g, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-[#111111]">{g.count}%</span>
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '120px' }}>
                <div className={`w-full ${g.color} rounded-t-lg absolute bottom-0 transition-all duration-1000`} style={{ height: `${g.count * 1.2}px` }} />
              </div>
              <span className="text-xs font-medium text-[#666666]">{g.grade}</span>
              <span className="text-[10px] text-gray-400">{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
