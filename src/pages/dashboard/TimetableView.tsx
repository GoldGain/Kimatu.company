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

/** Extracurricular columns displayed on far right */
const EXTRACURRICULAR_COLUMNS = ['Clubs & Societies', 'Guidance & Counselling', 'Games & Sports', 'Careers'];

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

  /** Filter slots by type */
  const lessonSlots = useMemo(() => timeSlots.filter((s) => s.slot_type === 'lesson'), [timeSlots]);
  const breakSlots = useMemo(() => timeSlots.filter((s) => s.slot_type === 'break'), [timeSlots]);
  const lunchSlots = useMemo(() => timeSlots.filter((s) => s.slot_type === 'lunch'), [timeSlots]);
  const activitySlots = useMemo(() => timeSlots.filter((s) => s.slot_type === 'activities' || s.slot_type === 'activity'), [timeSlots]);

  /** Get all unique slots in order */
  const allSlots = useMemo(() => [...timeSlots].sort((a, b) => a.slot_order - b.slot_order), [timeSlots]);

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

  const getExtracurricularText = (col: string, dayIdx: number): string => {
    const dayEntries = entries.filter(e => e.day_of_week === dayIdx + 1 && e.entry_type === 'activity');
    const colMap: Record<string, string> = {
      'Clubs & Societies': 'CLUB & SOCIETIES',
      'Guidance & Counselling': 'GUIDANCE & COUNSELLING',
      'Games & Sports': 'GAMES & SPORTS',
      'Careers': 'CAREERS',
    };
    
    // Check if any entry activity name matches the column
    const matched = dayEntries.find(e => e.activity_name?.toUpperCase().includes(colMap[col]?.split(' ')[0]));
    return matched ? matched.activity_name?.toUpperCase() || '' : '';
  };

  const downloadPdf = async () => {
    const element = document.getElementById('timetable-print-area');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: [0.1, 0.1, 0.1, 0.1],
        filename: `${(schoolName || 'school').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-timetable.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' },
      })
      .from(element)
      .save();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-full mx-auto space-y-4 timetable-page p-4 bg-gray-100 min-h-screen">
      <style>{`
        .blackboard-theme {
          background-color: #1a1a1a;
          color: #e0e0e0;
          font-family: 'Courier New', Courier, monospace;
          padding: 20px;
          border: 10px solid #4a3728;
          box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
        }
        .timetable-grid {
          border-collapse: collapse;
          width: 100%;
          border: 2px solid #555;
        }
        .timetable-grid th, .timetable-grid td {
          border: 1px solid #444;
          padding: 4px;
          text-align: center;
          font-size: 0.75rem;
        }
        .day-label {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          font-weight: bold;
          font-size: 1.2rem;
          background-color: #222;
          width: 40px;
        }
        .class-label {
          font-weight: bold;
          background-color: #2a2a2a;
          width: 60px;
        }
        .break-cell, .lunch-cell {
          writing-mode: vertical-rl;
          text-orientation: upright;
          font-weight: 900;
          font-size: 1.5rem;
          letter-spacing: 0.5rem;
          background-color: #1a1a1a;
          color: #4da6ff;
          width: 30px;
        }
        .time-header {
          background-color: #222;
          color: #4da6ff;
          font-weight: bold;
        }
        .cell-content {
          min-width: 80px;
          height: 30px;
        }
        .activity-col {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          font-weight: bold;
          color: #33cc33;
          width: 35px;
          font-size: 0.7rem;
        }
        @media print {
          .no-print { display: none !important; }
          .blackboard-theme { border: none; box-shadow: none; background: white; color: black; }
          .timetable-grid th, .timetable-grid td { border: 1px solid black; }
        }
      `}</style>

      <div className="flex justify-between items-center no-print mb-4">
        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">School Timetable</h1>
        <div className="flex gap-2">
          <button onClick={() => fetchAll()} className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 font-bold text-sm hover:bg-gray-50"><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 font-bold text-sm hover:bg-gray-50"><Printer size={16} /> Print</button>
          <button onClick={downloadPdf} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200"><Download size={16} /> Download PDF</button>
        </div>
      </div>

      <div id="timetable-print-area" className="blackboard-theme rounded-lg overflow-hidden">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-black tracking-tighter text-blue-400 uppercase">{schoolName || 'School'} Timetable</h2>
          <div className="h-1 w-32 bg-blue-400 mx-auto mt-2"></div>
        </div>

        <div className="overflow-x-auto">
          <table className="timetable-grid">
            <thead>
              <tr>
                <th rowSpan={2} className="time-header">DAYS</th>
                <th rowSpan={2} className="time-header">CLASS</th>
                {allSlots.map(slot => (
                  <th key={slot.id} className="time-header" style={{ width: slot.slot_type === 'lesson' ? 'auto' : '30px' }}>
                    {slot.slot_type === 'lesson' ? `${formatTimeDisplay(slot.start_time)}-${formatTimeDisplay(slot.end_time)}` : ''}
                  </th>
                ))}
                {EXTRACURRICULAR_COLUMNS.map(col => (
                  <th key={col} rowSpan={2} className="time-header" style={{ width: '40px' }}>{col.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIdx) => (
                <React.Fragment key={day}>
                  {classes.map((cls, clsIdx) => (
                    <tr key={`${day}-${cls.id}`}>
                      {clsIdx === 0 && (
                        <td rowSpan={classes.length} className="day-label">
                          {day}
                        </td>
                      )}
                      <td className="class-label">{displayClassName(cls)}</td>
                      {allSlots.map(slot => {
                        if (slot.slot_type === 'break' || slot.slot_type === 'lunch') {
                          if (clsIdx === 0) {
                            return (
                              <td key={slot.id} rowSpan={classes.length} className={slot.slot_type === 'break' ? 'break-cell' : 'lunch-cell'}>
                                {slot.slot_type.toUpperCase()}
                              </td>
                            );
                          }
                          return null;
                        }
                        
                        const cellEntries = getEntries(dayIdx + 1, cls.id, slot.id);
                        const display = getCellDisplay(cellEntries);
                        return (
                          <td key={slot.id} className="cell-content">
                            {display}
                          </td>
                        );
                      })}
                      
                      {EXTRACURRICULAR_COLUMNS.map((col, colIdx) => {
                        if (clsIdx === 0) {
                          const activityText = getExtracurricularText(col, dayIdx);
                          return (
                            <td key={col} rowSpan={classes.length} className="activity-col">
                              {activityText || col.toUpperCase()}
                            </td>
                          );
                        }
                        return null;
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {teacherKey.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-blue-400 font-black text-sm uppercase mb-4 tracking-widest">Teacher Reference Key</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {teacherKey.map(t => (
                <div key={t.teacher_number} className="text-[0.7rem] flex flex-col">
                  <span className="text-blue-300 font-bold">T{t.teacher_number}: {t.teacher_name}</span>
                  <span className="text-gray-500 italic">({t.subjects.join(', ')})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
