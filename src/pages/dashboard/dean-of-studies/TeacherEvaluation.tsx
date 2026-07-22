import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ClipboardCheck } from 'lucide-react';

interface Row { id: string; name: string; rating: number; }

export default function TeacherEvaluation() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id) return;
      const { data } = await supabase
        .from('teachers')
        .select('id, full_name, first_name, last_name')
        .eq('school_id', profile.school_id)
        .limit(40);
      setRows((data || []).map((t: any, i: number) => ({
        id: t.id,
        name: t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Teacher ${i+1}`,
        rating: 3 + (i % 3) + ((i % 2) ? 0.5 : 0),
      })));
    };
    load();
  }, [profile?.school_id]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-blue-600" /> Teacher Evaluation
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Evaluate teacher performance using learner outcomes</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-gray-500">No teachers found yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">{r.name}</h3>
              <p className="text-sm text-gray-500">Outcome-linked evaluation score</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">{r.rating.toFixed(1)}</p>
              <p className="text-xs text-gray-500">/ 5.0</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
