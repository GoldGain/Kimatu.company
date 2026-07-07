import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { CheckCircle2, XCircle, Loader2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  teacherId: string;
  schoolId: string;
  termId: string;
}

interface ClassProgress {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  totalStudents: number;
  marksEntered: number;
  percentage: number;
}

export default function MarksEntryProgress({ teacherId, schoolId, termId }: Props) {
  const [progress, setProgress] = useState<ClassProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (teacherId && schoolId && termId) fetchProgress();
  }, [teacherId, schoolId, termId]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      // Get teacher's assignments
      const { data: assignments } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .select('class_id, subject_id, classes(id, name), subjects(id, name)')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      if (!assignments || assignments.length === 0) {
        setProgress([]);
        setLoading(false);
        return;
      }

      const progressList: ClassProgress[] = [];

      for (const a of assignments) {
        if (!a.classes || !a.subjects) continue;

        // Count students in class
        const { count: totalStudents } = await supabaseUntyped
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', a.class_id)
          .eq('is_active', true);

        // Count marks entered for this class + subject + term
        const { count: marksEntered } = await supabaseUntyped
          .from('results')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', a.class_id)
          .eq('subject_id', a.subject_id)
          .eq('term_id', termId);

        const total = totalStudents || 0;
        const entered = marksEntered || 0;

        progressList.push({
          classId: a.class_id,
          className: (a.classes as any).name,
          subjectId: a.subject_id,
          subjectName: (a.subjects as any).name,
          totalStudents: total,
          marksEntered: entered,
          percentage: total > 0 ? Math.round((entered / total) * 100) : 0,
        });
      }

      // Sort: incomplete first, then by class name
      progressList.sort((a, b) => {
        if (a.percentage === 100 && b.percentage < 100) return 1;
        if (a.percentage < 100 && b.percentage === 100) return -1;
        return a.className.localeCompare(b.className);
      });

      setProgress(progressList);
    } catch (err) {
      console.error('Failed to load marks progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalClasses = progress.length;
  const completedClasses = progress.filter(p => p.percentage === 100).length;
  const overallPct = totalClasses > 0
    ? Math.round(progress.reduce((s, p) => s + p.percentage, 0) / totalClasses)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Marks Entry Progress</p>
            <p className="text-xs text-gray-500">
              {completedClasses}/{totalClasses} classes complete · {overallPct}% overall
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  overallPct === 100 ? 'bg-green-500' :
                  overallPct >= 60 ? 'bg-yellow-500' : 'bg-red-400'
                }`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${
              overallPct === 100 ? 'text-green-600' :
              overallPct >= 60 ? 'text-yellow-600' : 'text-red-500'
            }`}>{overallPct}%</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : progress.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No class assignments found for this term.</p>
          ) : (
            <div className="space-y-3">
              {progress.map((p, i) => (
                <div
                  key={`${p.classId}-${p.subjectId}-${i}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    p.percentage === 100
                      ? 'bg-green-50 border-green-100'
                      : p.percentage > 0
                      ? 'bg-yellow-50 border-yellow-100'
                      : 'bg-red-50 border-red-100'
                  }`}
                >
                  {p.percentage === 100
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {p.className}
                        <span className="text-gray-400 font-normal ml-1">· {p.subjectName}</span>
                      </p>
                      <span className={`text-xs font-bold shrink-0 ${
                        p.percentage === 100 ? 'text-green-600' :
                        p.percentage > 0 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {p.marksEntered}/{p.totalStudents}
                      </span>
                    </div>
                    <div className="mt-1.5 bg-white rounded-full h-1.5 border border-gray-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          p.percentage === 100 ? 'bg-green-500' :
                          p.percentage > 0 ? 'bg-yellow-400' : 'bg-red-300'
                        }`}
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
