import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  distributeLessons,
  rebalanceLessons,
  validateDistribution,
  DAYS,
  type Day,
  type LessonDistribution,
  type TeacherAvailability,
} from '@/lib/timetable';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface TeacherWorkloadTableProps {
  teacherId: string;
  totalLessonsPerWeek: number;
  unavailableDays?: Day[];
  onChange?: (distribution: LessonDistribution[]) => void;
  readOnly?: boolean;
}

export default function TeacherWorkloadTable({
  teacherId,
  totalLessonsPerWeek,
  unavailableDays = [],
  onChange,
  readOnly = false,
}: TeacherWorkloadTableProps) {
  const [distribution, setDistribution] = useState<LessonDistribution[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'warning'>('success');

  const buildAvailability = (): TeacherAvailability => ({
    teacherId,
    totalLessonsPerWeek,
    availableDays: {
      monday: !unavailableDays.includes('monday'),
      tuesday: !unavailableDays.includes('tuesday'),
      wednesday: !unavailableDays.includes('wednesday'),
      thursday: !unavailableDays.includes('thursday'),
      friday: !unavailableDays.includes('friday'),
    },
  });

  // Auto-generate distribution whenever inputs change
  useEffect(() => {
    const availability = buildAvailability();
    const dist = distributeLessons(availability);
    setDistribution(dist);
    onChange?.(dist);
    setMessage(null);
  }, [teacherId, totalLessonsPerWeek, unavailableDays.join(',')]);

  const handleLessonChange = (day: Day, value: number) => {
    if (readOnly) return;
    const updated = distribution.map((d) =>
      d.day === day ? { ...d, lessons: Math.max(0, value) } : d
    );
    const { distribution: rebalanced, message: msg } = rebalanceLessons(
      updated,
      totalLessonsPerWeek
    );
    setDistribution(rebalanced);
    onChange?.(rebalanced);
    if (msg) {
      setMessage(msg);
      setMessageType('warning');
    } else {
      setMessage(null);
    }
  };

  const handleReset = () => {
    const availability = buildAvailability();
    const dist = distributeLessons(availability);
    setDistribution(dist);
    onChange?.(dist);
    setMessage('Distribution reset to automatic suggestion.');
    setMessageType('success');
  };

  const validation = validateDistribution(distribution, totalLessonsPerWeek);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1A365D] to-[#2D4A7C]">
        <div>
          <h3 className="text-white font-semibold text-sm">Weekly Lesson Distribution</h3>
          <p className="text-blue-200 text-xs mt-0.5">
            {totalLessonsPerWeek} lessons/week · Auto-distributed
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Day</th>
              <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Lessons</th>
              <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Status</th>
              {!readOnly && (
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Adjust</th>
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {distribution.map((row, idx) => {
                const isUnavailable = unavailableDays.includes(row.day);
                return (
                  <motion.tr
                    key={row.day}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`border-b border-gray-50 ${
                      isUnavailable ? 'bg-red-50/50' : 'hover:bg-blue-50/30'
                    } transition-colors`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {row.label}
                      {isUnavailable && (
                        <span className="ml-2 text-xs text-red-500 font-normal">(Unavailable)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <motion.span
                        key={row.lessons}
                        initial={{ scale: 1.3, color: '#D4AF37' }}
                        animate={{ scale: 1, color: '#1A365D' }}
                        transition={{ duration: 0.25 }}
                        className="font-bold text-base inline-block"
                        style={{ color: '#1A365D' }}
                      >
                        {row.lessons}
                      </motion.span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isUnavailable ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                          Blocked
                        </span>
                      ) : row.lessons === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          No Lesson
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-2.5 text-center">
                        {!isUnavailable ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleLessonChange(row.day, row.lessons - 1)}
                              disabled={row.lessons === 0}
                              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold text-sm flex items-center justify-center transition-all disabled:opacity-30"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={row.lessons}
                              onChange={(e) =>
                                handleLessonChange(row.day, parseInt(e.target.value) || 0)
                              }
                              className="w-10 text-center border border-gray-200 rounded-md py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A365D]/30"
                            />
                            <button
                              onClick={() => handleLessonChange(row.day, row.lessons + 1)}
                              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600 font-bold text-sm flex items-center justify-center transition-all"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="px-4 py-2.5 font-bold text-gray-700">Total</td>
              <td className="px-4 py-2.5 text-center font-bold" style={{ color: '#1A365D' }}>
                {distribution.reduce((s, d) => s + d.lessons, 0)}
              </td>
              <td
                className="px-4 py-2.5 text-center text-xs font-semibold"
                colSpan={readOnly ? 1 : 2}
              >
                {validation.valid ? (
                  <span className="text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Balanced
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {validation.message}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Message Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2.5 text-xs flex items-center gap-2 ${
              messageType === 'success'
                ? 'bg-green-50 text-green-700 border-t border-green-100'
                : 'bg-amber-50 text-amber-700 border-t border-amber-100'
            }`}
          >
            {messageType === 'success' ? (
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
