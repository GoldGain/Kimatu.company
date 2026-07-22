import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { BarChart3, TrendingUp, Users, Award, Activity } from 'lucide-react';

export default function AdvancedAnalytics() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, assessments: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id) { setLoading(false); return; }
      const schoolId = profile.school_id;
      const [students, teachers, results] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('results').select('score, max_score').eq('school_id', schoolId).limit(500),
      ]);
      const rows = results.data || [];
      const avg = rows.length
        ? rows.reduce((s, r: any) => s + (Number(r.score) / Math.max(Number(r.max_score) || 100, 1)) * 100, 0) / rows.length
        : 0;
      setStats({
        students: students.count || 0,
        teachers: teachers.count || 0,
        assessments: rows.length,
        avgScore: Math.round(avg * 10) / 10,
      });
      setLoading(false);
    };
    load();
  }, [profile?.school_id]);

  const cards = useMemo(() => [
    { label: 'Learners', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { label: 'Teachers', value: stats.teachers, icon: Activity, color: 'bg-emerald-500' },
    { label: 'Assessments Logged', value: stats.assessments, icon: BarChart3, color: 'bg-violet-500' },
    { label: 'Avg Performance %', value: stats.avgScore, icon: Award, color: 'bg-amber-500' },
  ], [stats]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-blue-600" /> Advanced Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Visual performance trends for your school</p>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading analytics…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{c.label}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{c.value}</p>
                </div>
                <div className={`w-12 h-12 ${c.color} rounded-lg flex items-center justify-center text-white`}>
                  <c.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className={`h-full ${c.color}`} style={{ width: `${Math.min(100, Number(c.value) || 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="font-semibold text-lg mb-2">Performance Insights</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Use this dashboard to monitor learner volume, staffing, assessment coverage, and average scores.
          Pair it with mark lists and bulk operations for faster academic interventions across CBE and 8-4-4 pathways.
        </p>
      </div>
    </div>
  );
}
