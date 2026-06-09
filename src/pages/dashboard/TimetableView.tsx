import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Download, Printer, RefreshCw } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/timetable-generator';

interface SchoolClass {
  id: string;
  name: string;
  level: number;
  stream?: string | null;
}

interface TimetableEntry {
  id: string;
  class_id: string;
  day_of_week: number;
  time_slot_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  entry_type: 'lesson' | 'break' | 'lunch' | 'activities' | 'activity';
  activity_name: string | null;
  teacher_number?: number;
  teacher_first_name?: string;
  teacher_last_name?: string;
  subject_name?: string;
  subject_code?: string;
}

interface TimeSlot {
  id: string;
  slot_order: number;
  start_time: string;
  end_time: string;
  slot_type: 'lesson' | 'break' | 'lunch' | 'activities';
  label: string;
}

interface TeacherKeyEntry {
  teacher_number: number;
  teacher_name: string;
  subjects: string[];
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Extracurricular columns displayed on far right */
const EXTRACURRICULAR_COLUMNS = ['Clubs & Societies', 'Guidance & Counselling', 'Games & Sports', 'Careers'];

/** Vertical divider letters placed between time slot columns */
const DIVIDER_LETTERS = ['B', 'D', 'E', 'A', 'K', 'L', 'N', 'C', 'H'];

const SUBJECT_CODE_MAP: Record<string, string> = {
  Mathematics: 'MATH',
  Math: 'MATH',
  English: 'ENG',
  Kiswahili: 'KISW',
  'Integrated Science': 'INTSC',
  Science: 'SC',
  'Social Studies': 'SST',
  CRE: 'CRE',
  'Christian Religious Education': 'CRE',
  Agriculture: 'AGN',
  'Pre-Technical': 'PRET',
  'Pre Technical': 'PRET',
  'Pre-technical': 'PRET',
  'Creative Arts': 'CAS',
  'Creative and Sports': 'CAS',
};

const getSubjectCode = (name: string, code: string): string => {
  const normalizedName = (name || '').trim().toLowerCase();
  const mappedByName = Object.entries(SUBJECT_CODE_MAP).find(([key]) =>
    normalizedName.includes(key.toLowerCase())
  );
  if (mappedByName) return mappedByName[1];

  const cleanCode = (code || '').trim().toUpperCase();
  if (cleanCode) {
    if (cleanCode.startsWith('MAT') || cleanCode === 'MA') return 'MATH';
    if (cleanCode.startsWith('ENG') || cleanCode === 'ELA') return 'ENG';
    if (cleanCode.startsWith('KIS') || cleanCode === 'KLA') return 'KISW';
    if (cleanCode.startsWith('BIO')) return 'BIO';
    if (cleanCode.startsWith('CHE')) return 'CHEM';
    if (cleanCode.startsWith('PHY')) return 'PHY';
    if (cleanCode.startsWith('INTSCI') || cleanCode.startsWith('ISC')) return 'INTSC';
    if (cleanCode.startsWith('SS')) return 'SST';
    if (cleanCode.startsWith('AGR')) return 'AGN';
    if (cleanCode.startsWith('PRE') || cleanCode.startsWith('PTS')) return 'PRET';
    if (cleanCode.startsWith('CAS') || cleanCode.startsWith('CA')) return 'CAS';
    if (cleanCode.startsWith('CRE') || cleanCode.startsWith('CHR')) return 'CRE';
    return cleanCode.replace(/\d+/g, '').substring(0, 5) || cleanCode.substring(0, 5);
  }

  return name.replace(/[^A-Za-z]/g, '').substring(0, 5).toUpperCase() || 'SUB';
};

const displayClassName = (cls: SchoolClass): string => {
  const name = cls.name?.replace(/^grade\s*/i, '').trim() || String(cls.level);
  return name.toUpperCase();
};

export default function TimetableView() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [teacherKey, setTeacherKey] = useState<TeacherKeyEntry[]>([]);
  const [activities, setActivities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    if (user?.schoolId) fetchAll();
  }, [user?.schoolId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchSchoolName(),
        fetchClasses(),
        fetchTimeSlots(),
        fetchEntries(),
        fetchTeacherKey(),
        fetchActivities(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolName = async () => {
    const { data } = await supabase
      .from('schools')
      .select('name')
      .eq('id', user?.schoolId)
      .single();
    if (data) setSchoolName(data.name);
  };

  const fetchActivities = async () => {
    const { data: activitiesData } = await supabase
      .from('school_activities')
      .select('day_of_week, activity_name')
      .eq('school_id', user?.schoolId)
      .order('day_of_week');

    const acts: Record<string, string> = {};
    (activitiesData || []).forEach((a: any) => {
      acts[String(a.day_of_week)] = a.activity_name;
    });
    setActivities(acts);
  };

  const fetchClasses = async () => {
    const { data, error: err } = await supabase
      .from('classes')
      .select('id, name, level, stream')
      .eq('school_id', user?.schoolId)
      .eq('is_active', true)
      .order('level')
      .order('name');
    if (err) throw err;
    setClasses((data || []) as SchoolClass[]);
  };

  const fetchTimeSlots = async () => {
    const { data, error: err } = await supabase
      .from('timetable_time_slots')
      .select('*')
      .eq('school_id', user?.schoolId)
      .order('slot_order');
    if (err) throw err;
    setTimeSlots(((data || []) as TimeSlot[]).length ? (data as TimeSlot[]) : []);
  };

  const fetchEntries = async () => {
    const { data, error: err } = await supabase
      .from('timetable_entries')
      .select(
        `id, class_id, day_of_week, time_slot_id, teacher_id, subject_id, entry_type, activity_name,
        teachers(teacher_number, first_name, last_name), subjects(name, code)`
      )
      .eq('school_id', user?.schoolId);
    if (err) throw err;
    const mapped: TimetableEntry[] = (data || []).map((entry: any) => ({
      id: entry.id,
      class_id: entry.class_id,
      day_of_week: entry.day_of_week,
      time_slot_id: entry.time_slot_id,
      teacher_id: entry.teacher_id,
      subject_id: entry.subject_id,
      entry_type: entry.entry_type,
      activity_name: entry.activity_name,
      teacher_number: entry.teachers?.teacher_number,
      teacher_first_name: entry.teachers?.first_name,
      teacher_last_name: entry.teachers?.last_name,
      subject_name: entry.subjects?.name,
      subject_code: entry.subjects?.code,
    }));
    setEntries(mapped);
  };

  const fetchTeacherKey = async () => {
    const { data: teachers, error: teachersErr } = await supabase
      .from('teachers')
      .select('id, teacher_number, first_name, last_name')
      .eq('school_id', user?.schoolId)
      .eq('is_active', true)
      .order('teacher_number');
    if (teachersErr) throw teachersErr;

    const { data: assignments, error: assignmentsErr } = await supabase
      .from('teacher_subject_assignments')
      .select('teacher_id, subjects(name, code)')
      .eq('school_id', user?.schoolId)
      .eq('is_active', true);
    if (assignmentsErr) throw assignmentsErr;

    const keyMap: Record<string, TeacherKeyEntry> = {};
    (teachers || []).forEach((teacher: any) => {
      if (teacher.teacher_number) {
        keyMap[teacher.id] = {
          teacher_number: teacher.teacher_number,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`,
          subjects: [],
        };
      }
    });

    (assignments || []).forEach((assignment: any) => {
      if (keyMap[assignment.teacher_id] && assignment.subjects) {
        const code = getSubjectCode(assignment.subjects.name, assignment.subjects.code);
        if (!keyMap[assignment.teacher_id].subjects.includes(code))
          keyMap[assignment.teacher_id].subjects.push(code);
      }
    });

    setTeacherKey(
      Object.values(keyMap).sort((a, b) => a.teacher_number - b.teacher_number)
    );
  };

  /** Filter to only lesson-type time slots for the main grid columns */
  const lessonSlots = useMemo(
    () => timeSlots.filter((s) => s.slot_type === 'lesson'),
    [timeSlots]
  );

  /** Use actual classes from database */
  const classGroups = useMemo(() => {
    return classes.map((c) => ({
      ...c,
      displayName: displayClassName(c),
    }));
  }, [classes]);

  const entryLookup = useMemo(() => {
    const lookup = new Map<string, TimetableEntry[]>();
    entries.forEach((entry) => {
      const key = `${entry.day_of_week}-${entry.class_id}-${entry.time_slot_id}`;
      const existing = lookup.get(key) || [];
      existing.push(entry);
      lookup.set(key, existing);
    });
    return lookup;
  }, [entries]);

  const getEntries = (day: number, classId: string, slotId: string): TimetableEntry[] => {
    return entryLookup.get(`${day}-${classId}-${slotId}`) || [];
  };

  /** Format cell content: SUBJECT + TEACHER NUMBER (e.g. "MATH3", "MATH3 CRE4") */
  const getCellDisplay = (entriesForCell: TimetableEntry[]): string => {
    if (!entriesForCell || entriesForCell.length === 0) return '';

    const parts: string[] = [];
    entriesForCell.forEach((entry) => {
      if (entry.entry_type === 'activity' || entry.entry_type === 'activities') {
        if (entry.activity_name) parts.push(entry.activity_name.toUpperCase());
        return;
      }
      if (!entry.subject_name && !entry.subject_code) return;
      const code = getSubjectCode(entry.subject_name || '', entry.subject_code || '');
      const teacherNum = entry.teacher_number ? String(entry.teacher_number) : '';
      parts.push(`${code}${teacherNum}`);
    });

    return parts.join(' ') || '';
  };

  /** Get extracurricular text for a cell */
  const getExtracurricularText = (col: string, groupIdx: number): string => {
    const colTexts: Record<string, string[]> = {
      'Clubs & Societies': ['Club', '&', 'Societies', '', ''],
      'Guidance & Counselling': ['Guidance', '&', 'Counselling', '', ''],
      'Games & Sports': ['Games', '&', 'Sports', '', ''],
      'Careers': ['Careers', '', '', '', ''],
    };
    return colTexts[col]?.[groupIdx] || '';
  };

  /** Build schedule summary for header */
  const scheduleSummary = useMemo(() => {
    const firstLesson = timeSlots.find((s) => s.slot_order === 1);
    const lastLesson = timeSlots.find((s) => s.slot_order === 11);
    const dayStart = firstLesson ? formatTimeDisplay(firstLesson.start_time) : '08:20';
    const dayEnd = lastLesson ? formatTimeDisplay(lastLesson.end_time) : '15:40';

    const firstBreak = timeSlots.find((s) => s.slot_type === 'break');
    const lunch = timeSlots.find((s) => s.slot_type === 'lunch');
    const activitiesSlot = timeSlots.find((s) => s.slot_type === 'activities');

    return {
      dayStart,
      dayEnd,
      firstBreak: firstBreak
        ? `${formatTimeDisplay(firstBreak.start_time)}-${formatTimeDisplay(firstBreak.end_time)}`
        : '9:40-10:20',
      lunch: lunch
        ? `${formatTimeDisplay(lunch.start_time)}-${formatTimeDisplay(lunch.end_time)}`
        : '12:50-1:30',
      activitiesTime: activitiesSlot
        ? `${formatTimeDisplay(activitiesSlot.start_time)}-${formatTimeDisplay(activitiesSlot.end_time)}`
        : '3:20-4:00',
    };
  }, [timeSlots]);

  const downloadPdf = async () => {
    const element = document.getElementById('timetable-print-area');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: [0.15, 0.15, 0.15, 0.15],
        filename: `${(schoolName || 'school').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-timetable-grid.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(element)
      .save();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-4 timetable-page">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print, aside, header { display: none !important; }
          .lg\\:ml-64 { margin-left: 0 !important; }
          main { padding: 0 !important; }
          .print-card { box-shadow: none !important; border-radius: 0 !important; }
        }
        .timetable-grid {
          border-collapse: collapse;
          table-layout: fixed;
        }
        .timetable-grid th,
        .timetable-grid td {
          border: 1.5px solid #1a1a1a;
        }
        .timetable-grid .day-header {
          background-color: #1e3a5f;
          color: white;
          font-weight: 900;
          letter-spacing: 0.15em;
        }
        .timetable-grid .slot-header {
          background-color: #1e3a5f;
          color: white;
          font-weight: 800;
          font-size: 0.6rem;
          text-align: center;
          padding: 4px 1px;
        }
        .timetable-grid .class-label {
          background-color: #374151;
          color: white;
          font-weight: 700;
          font-size: 0.65rem;
          text-align: center;
          width: 40px;
          padding: 3px 1px;
        }
        .timetable-grid .cell-content {
          font-size: 0.6rem;
          font-weight: 700;
          text-align: center;
          padding: 3px 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .timetable-grid .day-cell {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          font-weight: 900;
          font-size: 0.85rem;
          letter-spacing: 0.1em;
          text-align: center;
          background-color: #1f2937;
          color: white;
          width: 26px;
        }
        .timetable-grid .divider-col {
          background-color: #e5e7eb;
          font-weight: 900;
          font-size: 1rem;
          color: #1a1a1a;
          text-align: center;
          width: 18px;
          padding: 2px;
        }
        .timetable-grid .extra-header {
          background-color: #1e3a5f;
          color: white;
          font-weight: 700;
          font-size: 0.55rem;
          text-align: center;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          padding: 4px 1px;
          width: 28px;
        }
        .timetable-grid .extra-cell {
          background-color: #f8fafc;
          font-size: 0.5rem;
          font-weight: 600;
          text-align: center;
          padding: 3px 1px;
          color: #334155;
        }
        .timetable-grid .even-row {
          background-color: #ffffff;
        }
        .timetable-grid .odd-row {
          background-color: #f9fafb;
        }
        .timetable-grid .has-data {
          background-color: #eff6ff;
        }
      `}</style>

      <div className="no-print flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">School Timetable</h1>
          <p className="text-sm text-gray-500 font-medium">
            {scheduleSummary.dayStart}–{scheduleSummary.dayEnd} · Break{' '}
            {scheduleSummary.firstBreak} · Lunch {scheduleSummary.lunch} · Activities{' '}
            {scheduleSummary.activitiesTime}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 border border-gray-300 bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 transition"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={downloadPdf}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0" size={18} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <section
        id="timetable-print-area"
        className="print-card bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-gray-200"
      >
        <div className="bg-gray-50 border-b-4 border-gray-200 text-gray-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase">
              {schoolName || 'School'} Weekly Timetable
            </h2>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">
              {scheduleSummary.dayStart}–{scheduleSummary.dayEnd} · Break{' '}
              {scheduleSummary.firstBreak} · Lunch {scheduleSummary.lunch} · Activities{' '}
              {scheduleSummary.activitiesTime}
            </p>
          </div>
          <p className="text-xs text-gray-500 font-bold">
            {new Date().toLocaleDateString('en-KE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table
            className="timetable-grid w-full"
            style={{
              minWidth: `${200 + lessonSlots.length * 85 + (lessonSlots.length > 0 ? (lessonSlots.length - 1) * 22 : 0) + EXTRACURRICULAR_COLUMNS.length * 32}px`,
            }}
          >
            <thead>
              <tr>
                <th
                  className="day-header"
                  colSpan={1}
                  rowSpan={2}
                  style={{ width: '26px' }}
                ></th>
                <th
                  className="class-label"
                  rowSpan={2}
                  style={{ width: '40px' }}
                ></th>
                {lessonSlots.map((slot, idx) => (
                  <React.Fragment key={slot.id}>
                    <th className="slot-header" style={{ minWidth: '80px' }}>
                      {formatTimeDisplay(slot.start_time)}–
                      {formatTimeDisplay(slot.end_time)}
                    </th>
                    {idx < lessonSlots.length - 1 && (
                      <th
                        className="slot-header"
                        style={{ width: '18px', padding: '0' }}
                      ></th>
                    )}
                  </React.Fragment>
                ))}
                {EXTRACURRICULAR_COLUMNS.map((col) => (
                  <th key={col} className="extra-header" style={{ width: '30px' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIdx) => (
                <React.Fragment key={day}>
                  {classGroups.map((group, groupIdx) => {
                    const rowKey = `${day}-${group.id}`;
                    const isEvenGroup = groupIdx % 2 === 0;

                    return (
                      <tr key={rowKey} className={isEvenGroup ? 'even-row' : 'odd-row'}>
                        {/* Day label - only on first group row */}
                        {groupIdx === 0 && (
                          <td className="day-cell" rowSpan={classGroups.length}>
                            {day}
                          </td>
                        )}
                        {/* Class group label */}
                        <td className="class-label">{group.displayName}</td>
                        {/* Lesson cells */}
                        {lessonSlots.map((slot, slotIdx) => {
                          const entriesForCell = getEntries(
                            dayIdx + 1,
                            group.id,
                            slot.id
                          );
                          const display = getCellDisplay(entriesForCell);
                          const hasData = !!display;

                          return (
                            <React.Fragment key={`${rowKey}-${slot.id}`}>
                              <td
                                className={`cell-content ${hasData ? 'has-data' : ''}`}
                                style={{ minWidth: '80px' }}
                              >
                                {display || (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              {slotIdx < lessonSlots.length - 1 && (
                                <td className="divider-col">
                                  {DIVIDER_LETTERS[slotIdx % DIVIDER_LETTERS.length]}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {/* Extracurricular cells */}
                        {EXTRACURRICULAR_COLUMNS.map((col) => (
                          <td key={`${rowKey}-${col}`} className="extra-cell">
                            {getExtracurricularText(col, groupIdx)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {teacherKey.length > 0 && (
          <div className="border-t-4 border-gray-200 p-4 bg-gray-50">
            <h3 className="font-black text-gray-700 text-xs uppercase tracking-widest mb-2">
              Teacher Key
            </h3>
            <div className="flex flex-wrap gap-3">
              {teacherKey.map((teacher) => (
                <div
                  key={teacher.teacher_number}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span className="font-black text-blue-600">
                    T{String(teacher.teacher_number).padStart(2, '0')}
                  </span>
                  <span className="text-gray-600">{teacher.teacher_name}</span>
                  {teacher.subjects.length > 0 && (
                    <span className="text-gray-400">
                      ({teacher.subjects.join(', ')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
