import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Download, Save, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject?: string;
  room?: string;
}

interface TimetableData {
  [day: string]: TimeSlot[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: '1', day: '', startTime: '08:00', endTime: '08:40', subject: '', room: '' },
  { id: '2', day: '', startTime: '08:40', endTime: '09:20', subject: '', room: '' },
  { id: '3', day: '', startTime: '09:20', endTime: '10:00', subject: '', room: '' },
  { id: '4', day: '', startTime: '10:00', endTime: '10:30', subject: 'BREAK', room: '' },
  { id: '5', day: '', startTime: '10:30', endTime: '11:10', subject: '', room: '' },
  { id: '6', day: '', startTime: '11:10', endTime: '11:50', subject: '', room: '' },
  { id: '7', day: '', startTime: '11:50', endTime: '12:30', subject: '', room: '' },
  { id: '8', day: '', startTime: '12:30', endTime: '13:30', subject: 'LUNCH', room: '' },
  { id: '9', day: '', startTime: '13:30', endTime: '14:10', subject: '', room: '' },
  { id: '10', day: '', startTime: '14:10', endTime: '14:50', subject: '', room: '' },
];

export default function TeacherTimetable() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [timetableData, setTimetableData] = useState<TimetableData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedSlot, setDraggedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    fetchTeacherClassesAndSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable();
    }
  }, [selectedClass, selectedTerm, selectedYear]);

  const fetchTeacherClassesAndSubjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher record first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!teacher) return;

      // Get teacher's assignments to derive classes and subjects
      const { data: assignments, error } = await supabase
        .from('teacher_subject_assignments')
        .select('*, classes(id, name, grade_level), subjects(id, name)')
        .eq('teacher_id', teacher.id)
        .eq('is_active', true);

      if (error) throw error;

      const uniqueClasses: any[] = [];
      const seenClasses = new Set();
      const uniqueSubjects: any[] = [];
      const seenSubjects = new Set();

      (assignments || []).forEach((a: any) => {
        if (a.classes && !seenClasses.has(a.classes.id)) {
          seenClasses.add(a.classes.id);
          uniqueClasses.push(a.classes);
        }
        if (a.subjects && !seenSubjects.has(a.subjects.id)) {
          seenSubjects.add(a.subjects.id);
          uniqueSubjects.push(a.subjects);
        }
      });

      setClasses(uniqueClasses);
      setSubjects(uniqueSubjects);
    } catch (err: any) {
      toast.error('Failed to load classes and subjects');
    }
  };

  const fetchTimetable = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher record first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!teacher) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('teacher_timetables')
        .select('*')
        .eq('teacher_id', teacher.id)
        .eq('class_id', selectedClass)
        .eq('term', selectedTerm)
        .eq('academic_year', selectedYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setTimetableData(data.timetable_data || generateEmptyTimetable());
      } else {
        setTimetableData(generateEmptyTimetable());
      }
    } catch (err: any) {
      toast.error('Failed to load timetable');
      setTimetableData(generateEmptyTimetable());
    } finally {
      setLoading(false);
    }
  };

  const generateEmptyTimetable = (): TimetableData => {
    const timetable: TimetableData = {};
    DAYS_OF_WEEK.forEach(day => {
      timetable[day] = DEFAULT_TIME_SLOTS.map((slot, idx) => ({
        ...slot,
        id: `${day}-${idx}`,
        day,
      }));
    });
    return timetable;
  };

  const handleSubjectChange = (day: string, slotId: string, subject: string) => {
    setTimetableData(prev => ({
      ...prev,
      [day]: prev[day].map(slot =>
        slot.id === slotId ? { ...slot, subject } : slot
      ),
    }));
  };

  const handleRoomChange = (day: string, slotId: string, room: string) => {
    setTimetableData(prev => ({
      ...prev,
      [day]: prev[day].map(slot =>
        slot.id === slotId ? { ...slot, room } : slot
      ),
    }));
  };

  const saveTimetable = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: school } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      // Get teacher record first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!teacher) throw new Error('Teacher record not found');

      const { error } = await supabase
        .from('teacher_timetables')
        .upsert({
          teacher_id: teacher.id,
          school_id: school?.school_id,
          class_id: selectedClass,
          term: selectedTerm,
          academic_year: selectedYear,
          timetable_data: timetableData,
          is_published: false,
        }, {
          onConflict: 'teacher_id,class_id,term,academic_year',
        });

      if (error) throw error;
      toast.success('Timetable saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save timetable');
    } finally {
      setSaving(false);
    }
  };

  const exportToPDF = () => {
    if (!selectedClass || Object.keys(timetableData).length === 0) {
      toast.error('Please create a timetable first');
      return;
    }

    const doc = new jsPDF();
    const selectedClassObj = classes.find(c => c.id === selectedClass);
    const title = `${selectedClassObj?.name} - Teaching Timetable`;

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Term: ${selectedTerm} | Year: ${selectedYear}`, 14, 25);

    const tableData: any[] = [];
    const headers = ['Time', ...DAYS_OF_WEEK];

    // Get unique time slots
    const timeSlots = timetableData[DAYS_OF_WEEK[0]] || [];

    timeSlots.forEach(slot => {
      const row = [`${slot.startTime} - ${slot.endTime}`];
      DAYS_OF_WEEK.forEach(day => {
        const daySlots = timetableData[day] || [];
        const daySlot = daySlots.find(s => s.startTime === slot.startTime);
        row.push(daySlot?.subject || '');
      });
      tableData.push(row);
    });

    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.save(`${selectedClassObj?.name}-timetable-${selectedYear}.pdf`);
    toast.success('Timetable exported to PDF');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teaching Timetable</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage your weekly teaching schedule</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTimetable}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={saveTimetable}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : selectedClass ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium min-w-24">Time</th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="px-4 py-3 font-medium min-w-32">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(timetableData[DAYS_OF_WEEK[0]] || []).map((slot, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map(day => {
                      const daySlot = (timetableData[day] || [])[idx];
                      const isBreak = daySlot?.subject === 'BREAK' || daySlot?.subject === 'LUNCH';

                      return (
                        <td key={day} className={`px-4 py-3 ${isBreak ? 'bg-yellow-50' : ''}`}>
                          {isBreak ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                              {daySlot?.subject}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={daySlot?.subject || ''}
                              onChange={e => handleSubjectChange(day, daySlot?.id || '', e.target.value)}
                              placeholder="Subject"
                              list="subjects-list"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select a class to create or edit your timetable</p>
        </div>
      )}

      {/* Subjects List for Autocomplete */}
      <datalist id="subjects-list">
        {subjects.map(subject => (
          <option key={subject.id} value={subject.name} />
        ))}
      </datalist>
    </div>
  );
}
