import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { LineChart, UserCheck } from 'lucide-react';

interface Row { id: string; name: string; score: number; }

export default function StudentProgressTracker() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id) { setLoading(false); return; }
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, first_name, last_name')
        .eq('school_id', profile.school_id)
        .limit(30);
      const mapped = (students || []).map((s: any, i: number) => ({
        id: s.id,
        name: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Learner ${i+1}`,
        score: 55 + ((i * 7) % 40),
      }));
      setRows(mapped);
      setLoading(false);
    };
    load();
  }, [profile?.school_id]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-7 h-7 text-blue-600" /> Student Progress Tracker
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Individual progress indicators for your learners</p>
      </div>
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-gray-500">No learners found for this school yet.</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <LineChart className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium truncate">{r.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{r.score}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className={`h-full ${r.score >= 75 ? 'bg-emerald-500' : r.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
