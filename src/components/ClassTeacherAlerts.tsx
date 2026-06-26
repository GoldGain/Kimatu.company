import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, X, Bell, TrendingDown, UserX, BookOpen } from 'lucide-react';

interface Alert {
  id: string;
  type: 'low_performance' | 'absent' | 'missing_marks' | 'info';
  title: string;
  message: string;
  studentName?: string;
  severity: 'high' | 'medium' | 'low';
  dismissed?: boolean;
}

interface ClassTeacherAlertsProps {
  classId: string;
  teacherId: string;
}

export default function ClassTeacherAlerts({ classId, teacherId }: ClassTeacherAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (classId) generateAlerts();
  }, [classId]);

  const generateAlerts = async () => {
    setLoading(true);
    const generatedAlerts: Alert[] = [];

    try {
      // 1. Check for students with low performance (< 40%)
      const { data: lowPerf } = await supabase
        .from('results')
        .select(`
          percentage,
          students(first_name, last_name, id)
        `)
        .eq('class_id', classId)
        .lt('percentage', 40)
        .limit(10);

      if (lowPerf && lowPerf.length > 0) {
        const uniqueStudents = new Map<string, string>();
        lowPerf.forEach((r: any) => {
          if (r.students) {
            uniqueStudents.set(r.students.id, `${r.students.first_name} ${r.students.last_name}`);
          }
        });
        uniqueStudents.forEach((name, id) => {
          generatedAlerts.push({
            id: `low-${id}`,
            type: 'low_performance',
            title: 'Low Performance Alert',
            message: `${name} is scoring below 40% in recent assessments.`,
            studentName: name,
            severity: 'high',
          });
        });
      }

      // 2. Check for missing marks (students with no results in recent exam)
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .eq('is_active', true);

      const { data: recentResults } = await supabase
        .from('results')
        .select('student_id')
        .in('student_id', (students || []).map((s: any) => s.id));

      const studentsWithResults = new Set((recentResults || []).map((r: any) => r.student_id));
      const studentsWithoutResults = (students || []).filter((s: any) => !studentsWithResults.has(s.id));

      if (studentsWithoutResults.length > 0) {
        generatedAlerts.push({
          id: 'missing-marks',
          type: 'missing_marks',
          title: 'Missing Marks',
          message: `${studentsWithoutResults.length} student(s) have no recorded results yet.`,
          severity: 'medium',
        });
      }

      // 3. General info alert
      if (generatedAlerts.length === 0) {
        generatedAlerts.push({
          id: 'all-good',
          type: 'info',
          title: 'All Good!',
          message: 'No critical alerts for your class at this time.',
          severity: 'low',
        });
      }

      setAlerts(generatedAlerts);
    } catch (err) {
      console.error('Failed to generate alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  const severityConfig = {
    high: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-500', badge: 'bg-red-100 text-red-700' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock, iconColor: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
    low: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-500', badge: 'bg-green-100 text-green-700' },
  };

  const typeIcon = {
    low_performance: TrendingDown,
    absent: UserX,
    missing_marks: BookOpen,
    info: CheckCircle,
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-12 bg-gray-100 rounded" />
        <div className="h-12 bg-gray-100 rounded" />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: '#1A365D' }} />
          <h3 className="font-bold text-gray-900 text-sm">Class Alerts</h3>
          {visibleAlerts.filter((a) => a.severity === 'high').length > 0 && (
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold"
            >
              {visibleAlerts.filter((a) => a.severity === 'high').length}
            </motion.span>
          )}
        </div>
        <button
          onClick={generateAlerts}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {visibleAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-gray-400"
            >
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm font-medium">All alerts dismissed</p>
            </motion.div>
          ) : (
            visibleAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = typeIcon[alert.type];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg} ${config.border}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-800">{alert.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${config.badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
