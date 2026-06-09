import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Zap, AlertCircle, CheckCircle, Loader2, Eye, Settings, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CORRECT SCHOOL DAY ORDER (per user requirements):
 * 1. Lesson 1  08:20 - 09:00
 * 2. Lesson 2  09:00 - 09:40
 * 3. FIRST BREAK  09:40 - 10:20
 * 4. Lesson 3  10:20 - 11:00
 * 5. Lesson 4  11:00 - 11:40
 * 6. SECOND BREAK  11:40 - 12:20
 * 7. Lesson 5  12:20 - 13:00
 * 8. Lesson 6  13:00 - 13:40
 * 9. LUNCH  13:40 - 14:20
 * 10. Lesson 7  14:20 - 15:00
 * 11. Lesson 8  15:00 - 15:40
 * 12. AFTER-SCHOOL ACTIVITIES  15:40 - 16:20
 */
const EXACT_SLOTS = [
  { slot_order: 1,  start_time: '08:20', end_time: '09:00', slot_type: 'lesson', label: 'Lesson 1' },
  { slot_order: 2,  start_time: '09:00', end_time: '09:40', slot_type: 'lesson', label: 'Lesson 2' },
  { slot_order: 3,  start_time: '09:40', end_time: '10:20', slot_type: 'break',  label: 'FIRST BREAK' },
  { slot_order: 4,  start_time: '10:20', end_time: '11:00', slot_type: 'lesson', label: 'Lesson 3' },
  { slot_order: 5,  start_time: '11:00', end_time: '11:40', slot_type: 'lesson', label: 'Lesson 4' },
  { slot_order: 6,  start_time: '11:40', end_time: '12:20', slot_type: 'break',  label: 'SECOND BREAK' },
  { slot_order: 7,  start_time: '12:20', end_time: '13:00', slot_type: 'lesson', label: 'Lesson 5' },
  { slot_order: 8,  start_time: '13:00', end_time: '13:40', slot_type: 'lesson', label: 'Lesson 6' },
  { slot_order: 9,  start_time: '13:40', end_time: '14:20', slot_type: 'lunch',  label: 'LUNCH' },
  { slot_order: 10, start_time: '14:20', end_time: '15:00', slot_type: 'lesson', label: 'Lesson 7' },
  { slot_order: 11, start_time: '15:00', end_time: '15:40', slot_type: 'lesson', label: 'Lesson 8' },
];

const ACTIVITIES = [
  { day_of_week: 1, activity_name: 'Games' },
  { day_of_week: 2, activity_name: 'Clubs' },
  { day_of_week: 3, activity_name: 'Study Hall' },
  { day_of_week: 4, activity_name: 'Drama' },
  { day_of_week: 5, activity_name: 'Music Club' },
];

const isMorningPrioritySubject = (assignment: any) => {
  const name = String(assignment.subjects?.name || '').toLowerCase();
  const code = String(assignment.subjects?.code || '').toLowerCase();
  return assignment.is_priority || name.includes('math') || name.includes('english') || ['math', 'eng'].includes(code);
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function TimetableGenerate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [configReady, setConfigReady] = useState(false);
  const [assignmentsReady, setAssignmentsReady] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [timetableCount, setTimetableCount] = useState(0);

  useEffect(() => {
    if (user?.schoolId) fetchData();
  }, [user?.schoolId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const schoolId = user?.schoolId;

      const { data: config } = await supabase
        .from('school_timetable_config').select('*').eq('school_id', schoolId).maybeSingle();
      setConfigReady(!!config);

      const { count: ac } = await supabase
        .from('teacher_subject_assignments').select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId).eq('is_active', true);
      setAssignmentCount(ac || 0);
      setAssignmentsReady((ac || 0) > 0);

      const { count: tc } = await supabase
        .from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true);
      setTeacherCount(tc || 0);

      const { count: cc } = await supabase
        .from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true);
      setClassCount(cc || 0);

      const { count: ttc, data: ttData } = await supabase
        .from('timetable_entries').select('created_at', { count: 'exact' }).eq('school_id', schoolId).limit(1).order('created_at', { ascending: false });
      setTimetableCount(ttc || 0);
      setLastGenerated(ttData && ttData.length > 0 ? new Date(ttData[0].created_at).toLocaleString() : null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable readiness data');
    } finally {
      setLoading(false);
    }
  };

  const ensureStandardSetup = async (schoolId: string) => {
    // Save config with correct break order
    await supabase.from('school_timetable_config').upsert({
      school_id: schoolId,
      school_start_time: '08:20',
      school_end_time: '15:40',
      lesson_duration_minutes: 40,
      // FIRST BREAK: after 2 lessons (09:40 - 10:20)
      morning_break_start: '09:40',
      morning_break_end: '10:20',
      // SECOND BREAK: after next 2 lessons (11:40 - 12:20)
      afternoon_break_start: '11:40',
      afternoon_break_end: '12:20',
      // LUNCH: after next 2 lessons (13:40 - 14:20)
      lunch_start: '13:40',
      lunch_end: '14:20',
    } as any, { onConflict: 'school_id' });

    // Rebuild time slots with correct order
    await supabase.from('timetable_time_slots').delete().eq('school_id', schoolId);
    const { data: slots, error: slotError } = await supabase
      .from('timetable_time_slots')
      .insert(EXACT_SLOTS.map((slot) => ({ ...slot, school_id: schoolId })))
      .select('*')
      .order('slot_order');
    if (slotError) throw slotError;

    for (const activity of ACTIVITIES) {
      await supabase.from('school_activities').upsert({
        school_id: schoolId,
        day_of_week: activity.day_of_week,
        activity_name: activity.activity_name,
        start_time: '15:40',
        end_time: '16:20',
      }, { onConflict: 'school_id,day_of_week,activity_name' });
    }

    return slots || [];
  };

  const handleGenerateTimetable = async () => {
    if (!assignmentsReady) {
      toast.error('Please assign teachers to subjects first');
      return;
    }

    try {
      setGenerating(true);
      const schoolId = user?.schoolId;
      if (!schoolId) throw new Error('No school assigned to your account');

      const slots = await ensureStandardSetup(schoolId);
      const { data: classes, error: classesError } = await supabase
        .from('classes').select('id, name, level').eq('school_id', schoolId).eq('is_active', true).order('level').order('name');
      if (classesError) throw classesError;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('teacher_subject_assignments')
        .select('teacher_id, class_id, subject_id, lessons_per_week, is_priority, teachers(teacher_number), subjects(name, code)')
        .eq('school_id', schoolId).eq('is_active', true);
      if (assignmentsError) throw assignmentsError;

      if (!classes?.length) throw new Error('No active classes found. Add classes before generating the timetable.');
      if (!slots.length) throw new Error('No time slots could be created. Please check timetable setup.');
      if (!assignments?.length) throw new Error('No teacher-subject assignments found. Assign teachers first.');

      const lessonSlots = [...slots]
        .filter((slot: any) => slot.slot_type === 'lesson')
        .sort((a: any, b: any) => a.slot_order - b.slot_order);
      const morningSlots = lessonSlots.filter((slot: any) => timeToMinutes(slot.start_time) < 12 * 60);
      const afternoonSlots = lessonSlots.filter((slot: any) => timeToMinutes(slot.start_time) >= 12 * 60);
      const fixedSlots = slots.filter((slot: any) => slot.slot_type === 'break' || slot.slot_type === 'lunch');

      await supabase.from('timetable_entries').delete().eq('school_id', schoolId);

      const entries: any[] = [];
      const teacherBusy = new Set<string>();
      const classBusy = new Set<string>();

      const classAssignmentsByClass = new Map<string, any[]>();
      for (const assignment of assignments as any[]) {
        if (!classAssignmentsByClass.has(assignment.class_id)) classAssignmentsByClass.set(assignment.class_id, []);
        classAssignmentsByClass.get(assignment.class_id)!.push(assignment);
      }

      for (const cls of classes as any[]) {
        for (let day = 1; day <= 5; day++) {
          for (const slot of fixedSlots as any[]) {
            entries.push({
              school_id: schoolId,
              day_of_week: day,
              time_slot_id: slot.id,
              class_id: cls.id,
              subject_id: null,
              teacher_id: null,
              entry_type: slot.slot_type,
              activity_name: slot.label,
            });
            classBusy.add(`${cls.id}-${day}-${slot.id}`);
          }
        }
      }

      const sortAssignments = (items: any[]) => [...items].sort((a, b) => {
        const aPriority = isMorningPrioritySubject(a);
        const bPriority = isMorningPrioritySubject(b);
        if (aPriority !== bPriority) return aPriority ? -1 : 1;
        return String(a.subjects?.name || '').localeCompare(String(b.subjects?.name || ''));
      });

      for (const cls of classes as any[]) {
        const classAssignments = sortAssignments(classAssignmentsByClass.get(cls.id) || []);
        for (const assignment of classAssignments) {
          const targetLessons = Math.max(1, Math.min(Number(assignment.lessons_per_week || 5), 5));
          let scheduled = 0;

          for (let day = 1; day <= 5 && scheduled < targetLessons; day++) {
            const priority = isMorningPrioritySubject(assignment);
            const slotPreference = priority ? [...morningSlots, ...afternoonSlots] : [...afternoonSlots, ...morningSlots];
            const slot = slotPreference.find((candidate: any) => {
              const teacherKey = `${assignment.teacher_id}-${day}-${candidate.id}`;
              const classKey = `${cls.id}-${day}-${candidate.id}`;
              return !teacherBusy.has(teacherKey) && !classBusy.has(classKey);
            });

            if (!slot) continue;

            entries.push({
              school_id: schoolId,
              day_of_week: day,
              time_slot_id: slot.id,
              class_id: cls.id,
              subject_id: assignment.subject_id,
              teacher_id: assignment.teacher_id,
              entry_type: 'lesson',
              activity_name: null,
            });
            teacherBusy.add(`${assignment.teacher_id}-${day}-${slot.id}`);
            classBusy.add(`${cls.id}-${day}-${slot.id}`);
            scheduled += 1;
          }
        }
      }

      for (let i = 0; i < entries.length; i += 100) {
        const { error } = await supabase.from('timetable_entries').insert(entries.slice(i, i + 100));
        if (error) throw error;
      }

      const lessonCount = entries.filter((entry) => entry.entry_type === 'lesson').length;
      setLastGenerated(new Date().toLocaleString());
      setTimetableCount(entries.length);
      toast.success(`Timetable generated: ${lessonCount} lessons. Order: 2 lessons → FIRST BREAK → 2 lessons → SECOND BREAK → 2 lessons → LUNCH → 2 lessons → ACTIVITIES`);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Generate Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">
          One-click generation using the required schedule.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
        <p className="font-black mb-1">Correct Break Order (locked):</p>
        <p>Lesson 1 &amp; 2 (8:20–9:40) → <strong>FIRST BREAK</strong> (9:40–10:20) → Lesson 3 &amp; 4 (10:20–11:40) → <strong>SECOND BREAK</strong> (11:40–12:20) → Lesson 5 &amp; 6 (12:20–13:40) → <strong>LUNCH</strong> (13:40–14:20) → Lesson 7 &amp; 8 (14:20–15:40) → <strong>AFTER-SCHOOL ACTIVITIES</strong> (15:40–16:20)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 text-center"><div className="text-3xl font-black text-blue-700">{teacherCount}</div><div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Teachers</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 text-center"><div className="text-3xl font-black text-green-700">{classCount}</div><div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Classes</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 text-center"><div className="text-3xl font-black text-purple-700">{assignmentCount}</div><div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Assignments</div></div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-3">
        <h2 className="font-black text-gray-900 mb-4">Pre-Generation Checklist</h2>
        <div className={`flex items-center gap-3 p-3 rounded-xl ${configReady ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          {configReady ? <CheckCircle className="text-green-600 flex-shrink-0" size={20} /> : <Clock className="text-blue-600 flex-shrink-0" size={20} />}
          <div className="flex-1"><p className="font-semibold text-sm text-gray-900">School Schedule</p><p className="text-xs text-gray-500">2 lessons → FIRST BREAK (9:40–10:20) → 2 lessons → SECOND BREAK (11:40–12:20) → 2 lessons → LUNCH (13:40–14:20) → 2 lessons → ACTIVITIES (15:40–16:20)</p></div>
          <a href="/school-admin/timetable/setup" className="text-blue-600 text-xs font-semibold hover:underline">Edit setup →</a>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-xl ${assignmentsReady ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {assignmentsReady ? <CheckCircle className="text-green-600 flex-shrink-0" size={20} /> : <AlertCircle className="text-red-600 flex-shrink-0" size={20} />}
          <div className="flex-1"><p className="font-semibold text-sm text-gray-900">Teacher Assignments</p><p className="text-xs text-gray-500">{assignmentsReady ? `${assignmentCount} active assignments ready` : 'No assignments — please assign teachers to subjects first'}</p></div>
          <a href="/school-admin/timetable/assign" className="text-blue-600 text-xs font-semibold hover:underline">Assign →</a>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-xl ${timetableCount > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
          {timetableCount > 0 ? <CheckCircle className="text-blue-600 flex-shrink-0" size={20} /> : <Zap className="text-gray-400 flex-shrink-0" size={20} />}
          <div className="flex-1"><p className="font-semibold text-sm text-gray-900">Timetable Status</p><p className="text-xs text-gray-500">{timetableCount > 0 ? `${timetableCount} timetable entries generated` : 'Not yet generated'}{lastGenerated && ` · Last: ${lastGenerated}`}</p></div>
          {timetableCount > 0 && <a href="/timetable" className="text-blue-600 text-xs font-semibold hover:underline">View →</a>}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <button
          onClick={handleGenerateTimetable}
          disabled={generating || !assignmentsReady}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
          {generating ? 'Generating Timetable...' : 'Generate Timetable'}
        </button>
        {!assignmentsReady && (
          <p className="text-center text-sm text-red-500 mt-3">
            You must assign teachers to subjects before generating.{' '}
            <a href="/school-admin/timetable/assign" className="underline font-semibold">Assign now →</a>
          </p>
        )}
        {timetableCount > 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Generating again will replace the existing timetable.
          </p>
        )}
      </div>
    </div>
  );
}
