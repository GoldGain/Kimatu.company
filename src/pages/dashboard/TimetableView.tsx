import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Download, Printer, RefreshCw } from 'lucide-react';

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
  entry_type: 'lesson' | 'break' | 'lunch' | 'activity';
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
  slot_type: 'lesson' | 'break' | 'lunch' | 'activity';
  label: string;
}

interface TeacherKeyEntry {
  teacher_number: number;
  teacher_name: string;
  subjects: string[];
}

interface Activity {
  day_of_week: number;
  activity_name: string;
  start_time?: string;
  end_time?: string;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
  'Creative Arts': 'CAS',
};

/**
 * CORRECT BREAK ORDER:
 * 2 lessons → FIRST BREAK (9:40–10:20) → 2 lessons → SECOND BREAK (11:40–12:20)
 * → 2 lessons → LUNCH (13:40–14:20) → 2 lessons → ACTIVITIES (15:40–16:20)
 */
const DEFAULT_SLOTS: TimeSlot[] = [
  { id: 'fallback-1',  slot_order: 1,  start_time: '08:20:00', end_time: '09:00:00', slot_type: 'lesson', label: 'Lesson 1' },
  { id: 'fallback-2',  slot_order: 2,  start_time: '09:00:00', end_time: '09:40:00', slot_type: 'lesson', label: 'Lesson 2' },
  { id: 'fallback-3',  slot_order: 3,  start_time: '09:40:00', end_time: '10:20:00', slot_type: 'break',  label: 'FIRST BREAK' },
  { id: 'fallback-4',  slot_order: 4,  start_time: '10:20:00', end_time: '11:00:00', slot_type: 'lesson', label: 'Lesson 3' },
  { id: 'fallback-5',  slot_order: 5,  start_time: '11:00:00', end_time: '11:40:00', slot_type: 'lesson', label: 'Lesson 4' },
  { id: 'fallback-6',  slot_order: 6,  start_time: '11:40:00', end_time: '12:20:00', slot_type: 'break',  label: 'SECOND BREAK' },
  { id: 'fallback-7',  slot_order: 7,  start_time: '12:20:00', end_time: '13:00:00', slot_type: 'lesson', label: 'Lesson 5' },
  { id: 'fallback-8',  slot_order: 8,  start_time: '13:00:00', end_time: '13:40:00', slot_type: 'lesson', label: 'Lesson 6' },
  { id: 'fallback-9',  slot_order: 9,  start_time: '13:40:00', end_time: '14:20:00', slot_type: 'lunch',  label: 'LUNCH' },
  { id: 'fallback-10', slot_order: 10, start_time: '14:20:00', end_time: '15:00:00', slot_type: 'lesson', label: 'Lesson 7' },
  { id: 'fallback-11', slot_order: 11, start_time: '15:00:00', end_time: '15:40:00', slot_type: 'lesson', label: 'Lesson 8' },
];

const getSubjectCode = (name: string, code: string): string => {
  const normalizedName = (name || '').trim().toLowerCase();
  const mappedByName = Object.entries(SUBJECT_CODE_MAP).find(([key]) => normalizedName.includes(key.toLowerCase()));
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
    return cleanCode.replace(/\d+/g, '').substring(0, 5) || cleanCode.substring(0, 5);
  }

  return name.replace(/[^A-Za-z]/g, '').substring(0, 5).toUpperCase() || 'SUB';
};

const formatTime = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = Number(h);
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${hour12}:${m}`;
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
  const [activities, setActivities] = useState<Activity[]>([]);
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
      await Promise.all([fetchSchoolName(), fetchClasses(), fetchTimeSlots(), fetchEntries(), fetchTeacherKey(), fetchActivities()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolName = async () => {
    const { data } = await supabase.from('schools').select('name').eq('id', user?.schoolId).single();
    if (data) setSchoolName(data.name);
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
    setTimeSlots(((data || []) as TimeSlot[]).length ? (data as TimeSlot[]) : DEFAULT_SLOTS);
  };

  const fetchEntries = async () => {
    const { data, error: err } = await supabase
      .from('timetable_entries')
      .select(`id, class_id, day_of_week, time_slot_id, teacher_id, subject_id, entry_type, activity_name,
        teachers(teacher_number, first_name, last_name), subjects(name, code)`)
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

  const fetchActivities = async () => {
    const { data, error: err } = await supabase
      .from('school_activities')
      .select('day_of_week, activity_name, start_time, end_time')
      .eq('school_id', user?.schoolId)
      .order('day_of_week');
    if (err) throw err;
    setActivities((data || []) as Activity[]);
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
        if (!keyMap[assignment.teacher_id].subjects.includes(code)) keyMap[assignment.teacher_id].subjects.push(code);
      }
    });

    setTeacherKey(Object.values(keyMap).sort((a, b) => a.teacher_number - b.teacher_number));
  };

  const entryLookup = useMemo(() => {
    const lookup = new Map<string, TimetableEntry>();
    entries.forEach((entry) => lookup.set(`${entry.day_of_week}-${entry.class_id}-${entry.time_slot_id}`, entry));
    return lookup;
  }, [entries]);

  const getEntry = (day: number, classId: string, slotId: string) => entryLookup.get(`${day}-${classId}-${slotId}`);

  const getActivityForDay = (day: number): string => {
    const dayActivities = activities.filter((activity) => activity.day_of_week === day);
    return dayActivities.map((activity) => activity.activity_name).join(' / ') || '—';
  };

  const getCellContent = (entry: TimetableEntry | undefined, slot: TimeSlot): React.ReactNode => {
    if (slot.slot_type === 'break') {
      const breakLabel = slot.label?.toUpperCase().includes('SECOND') ? 'SECOND BREAK' : 'FIRST BREAK';
      return <span className="vertical-writing text-blue-500 font-black tracking-[0.35em] text-lg">{breakLabel}</span>;
    }
    if (slot.slot_type === 'lunch') {
      return <span className="vertical-writing text-blue-500 font-black tracking-[0.35em] text-lg">LUNCH</span>;
    }
    if (!entry) return <span className="text-gray-400">—</span>;
    if (entry.entry_type === 'activity') return <span className="text-emerald-600 font-black text-sm">{entry.activity_name}</span>;
    if (!entry.subject_code && !entry.subject_name) return <span className="text-gray-400">—</span>;
    const code = getSubjectCode(entry.subject_name || '', entry.subject_code || '');
    const teacherNumDisplay = entry.teacher_number ? `T${String(entry.teacher_number).padStart(2, '0')}` : '';
    return (
      <span className="inline-flex items-baseline justify-center gap-0.5 whitespace-nowrap font-black tracking-tight text-gray-800">
        <span>{code}</span>
        {teacherNumDisplay ? <span className="text-blue-500">{teacherNumDisplay}</span> : null}
      </span>
    );
  };

  const downloadPdf = async () => {
    const element = document.getElementById('timetable-print-area');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: [0.15, 0.15, 0.15, 0.15],
        filename: `${(schoolName || 'school').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-timetable-with-teacher-key.pdf`,
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
        .chalk-text { text-shadow: none; }
        .vertical-writing { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
      `}</style>

      <div className="no-print flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">School Timetable</h1>
          <p className="text-sm text-gray-500 font-medium">
            {schoolName || 'School'} · 2 lessons → FIRST BREAK → 2 lessons → SECOND BREAK → 2 lessons → LUNCH → 2 lessons → ACTIVITIES
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchAll} className="flex items-center gap-2 border border-gray-300 bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 transition">
            <Printer size={16} /> Print
          </button>
          <button onClick={downloadPdf} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition">
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

      <section id="timetable-print-area" className="print-card bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-gray-200">
        <div className="bg-gray-50 border-b-4 border-gray-200 text-gray-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase">{schoolName || 'School'} Weekly Timetable</h2>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">
              8:20 AM–3:40 PM · First Break 9:40–10:20 · Second Break 11:40–12:20 · Lunch 1:40–2:20 · Activities 3:40–4:20 PM
            </p>
          </div>
          <p className="text-xs text-gray-500 font-bold">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-3 py-3 text-left font-black text-gray-700 border-r-2 border-gray-300 w-24">TIME</th>
                {classes.map((cls) => (
                  <th key={cls.id} className="px-2 py-3 text-center font-black text-gray-700 border-r border-gray-200 min-w-[60px]">
                    {displayClassName(cls)}
                    {cls.stream && <span className="block text-gray-400 font-normal">{cls.stream}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIdx) => (
                <React.Fragment key={day}>
                  <tr className="bg-blue-600 text-white">
                    <td colSpan={classes.length + 1} className="px-3 py-1.5 font-black text-sm tracking-widest uppercase">
                      {DAY_NAMES[dayIdx]}
                    </td>
                  </tr>
                  {timeSlots.map((slot) => {
                    const isBreak = slot.slot_type === 'break';
                    const isLunch = slot.slot_type === 'lunch';
                    const isFixed = isBreak || isLunch;
                    return (
                      <tr
                        key={slot.id}
                        className={`border-b border-gray-100 ${
                          isBreak ? 'bg-blue-50' : isLunch ? 'bg-amber-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-600 border-r-2 border-gray-300 whitespace-nowrap">
                          <div>{formatTime(slot.start_time)}</div>
                          <div className="text-gray-400">–{formatTime(slot.end_time)}</div>
                          {isFixed && (
                            <div className={`text-[10px] font-black mt-0.5 ${isBreak ? 'text-blue-600' : 'text-amber-600'}`}>
                              {slot.label}
                            </div>
                          )}
                        </td>
                        {isFixed ? (
                          <td
                            colSpan={classes.length}
                            className={`text-center font-black text-sm py-2 ${
                              isBreak ? 'text-blue-600' : 'text-amber-700'
                            }`}
                          >
                            {slot.label}
                          </td>
                        ) : (
                          classes.map((cls) => {
                            const entry = getEntry(dayIdx + 1, cls.id, slot.id);
                            return (
                              <td key={cls.id} className="px-2 py-2 text-center border-r border-gray-100">
                                {getCellContent(entry, slot)}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50 border-b-2 border-gray-200">
                    <td className="px-3 py-2 font-semibold text-emerald-700 border-r-2 border-gray-300 whitespace-nowrap text-[10px]">
                      <div>3:40</div>
                      <div className="text-gray-400">–4:20</div>
                      <div className="font-black">ACTIVITIES</div>
                    </td>
                    <td colSpan={classes.length} className="text-center font-black text-sm text-emerald-700 py-2">
                      {getActivityForDay(dayIdx + 1)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {teacherKey.length > 0 && (
          <div className="border-t-4 border-gray-200 p-4 bg-gray-50">
            <h3 className="font-black text-gray-700 text-xs uppercase tracking-widest mb-2">Teacher Key</h3>
            <div className="flex flex-wrap gap-3">
              {teacherKey.map((teacher) => (
                <div key={teacher.teacher_number} className="flex items-center gap-1.5 text-xs">
                  <span className="font-black text-blue-600">T{String(teacher.teacher_number).padStart(2, '0')}</span>
                  <span className="text-gray-600">{teacher.teacher_name}</span>
                  {teacher.subjects.length > 0 && (
                    <span className="text-gray-400">({teacher.subjects.join(', ')})</span>
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
