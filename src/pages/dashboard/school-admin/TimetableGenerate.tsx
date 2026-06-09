import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Zap, CheckCircle, Loader2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function TimetableGenerate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  useEffect(() => {
    if (user?.schoolId) fetchData();
  }, [user?.schoolId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const schoolId = user?.schoolId;

      const { data: configData } = await supabase
        .from('school_timetable_config').select('*').eq('school_id', schoolId).maybeSingle();
      setConfig(configData);

      const { count: ac } = await supabase
        .from('teacher_subject_assignments').select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId).eq('is_active', true);
      setAssignmentCount(ac || 0);

      const { count: tc } = await supabase
        .from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true);
      setTeacherCount(tc || 0);

      const { count: cc } = await supabase
        .from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true);
      setClassCount(cc || 0);

      const { data: ttData } = await supabase
        .from('timetable_entries').select('created_at').eq('school_id', schoolId).limit(1).order('created_at', { ascending: false });
      setLastGenerated(ttData && ttData.length > 0 ? new Date(ttData[0].created_at).toLocaleString() : null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable readiness data');
    } finally {
      setLoading(false);
    }
  };

  const generateSlots = (config: any) => {
    const duration = config.lesson_duration;
    let currentMinutes = timeToMinutes('08:20');
    const slots = [];

    // Lesson 1
    slots.push({ slot_order: 1, label: 'Lesson 1', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });
    currentMinutes += duration;

    // Lesson 2
    slots.push({ slot_order: 2, label: 'Lesson 2', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });
    
    // FIRST BREAK
    slots.push({ slot_order: 3, label: 'FIRST BREAK', slot_type: 'break', start_time: config.first_break_start, end_time: config.first_break_end });
    currentMinutes = timeToMinutes(config.first_break_end);

    // Lesson 3
    slots.push({ slot_order: 4, label: 'Lesson 3', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });
    currentMinutes += duration;

    // Lesson 4
    slots.push({ slot_order: 5, label: 'Lesson 4', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });

    // SECOND BREAK
    slots.push({ slot_order: 6, label: 'SECOND BREAK', slot_type: 'break', start_time: config.second_break_start, end_time: config.second_break_end });
    currentMinutes = timeToMinutes(config.second_break_end);

    // Lesson 5
    slots.push({ slot_order: 7, label: 'Lesson 5', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });
    currentMinutes += duration;

    // Lesson 6
    slots.push({ slot_order: 8, label: 'Lesson 6', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });

    // LUNCH
    slots.push({ slot_order: 9, label: 'LUNCH', slot_type: 'lunch', start_time: config.lunch_start, end_time: config.lunch_end });
    currentMinutes = timeToMinutes(config.lunch_end);

    // Lesson 7
    slots.push({ slot_order: 10, label: 'Lesson 7', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });
    currentMinutes += duration;

    // Lesson 8
    slots.push({ slot_order: 11, label: 'Lesson 8', slot_type: 'lesson', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + duration) });
    currentMinutes += duration;

    // ACTIVITIES
    slots.push({ slot_order: 12, label: 'ACTIVITIES', slot_type: 'activities', start_time: minutesToTime(currentMinutes), end_time: minutesToTime(currentMinutes + 40) });

    return slots;
  };

  const handleGenerateTimetable = async () => {
    if (!config) {
      toast.error('Please complete the timetable setup first');
      return;
    }

    try {
      setGenerating(true);
      const schoolId = user?.schoolId;

      // 1. Rebuild time slots
      const slots = generateSlots(config);
      await supabase.from('timetable_time_slots').delete().eq('school_id', schoolId);
      const { data: createdSlots, error: slotError } = await supabase
        .from('timetable_time_slots')
        .insert(slots.map(s => ({ ...s, school_id: schoolId })))
        .select();
      if (slotError) throw slotError;

      // 2. Get data for generation
      const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId).eq('is_active', true);
      const { data: assignments } = await supabase.from('teacher_subject_assignments').select('*, subjects(name, code)').eq('school_id', schoolId).eq('is_active', true);

      if (!classes?.length || !assignments?.length) {
        throw new Error('Classes or assignments missing');
      }

      // 3. Clear existing entries
      await supabase.from('timetable_entries').delete().eq('school_id', schoolId);

      const entries: any[] = [];
      const teacherBusy = new Set<string>();
      const classBusy = new Set<string>();

      // 4. Fill fixed slots (Breaks, Lunch, Activities)
      const fixedSlots = createdSlots.filter(s => ['break', 'lunch', 'activities'].includes(s.slot_type));
      const lessonSlots = createdSlots.filter(s => s.slot_type === 'lesson').sort((a, b) => a.slot_order - b.slot_order);

      for (const cls of classes) {
        for (let day = 1; day <= 5; day++) {
          for (const slot of fixedSlots) {
            entries.push({
              school_id: schoolId,
              day_of_week: day,
              time_slot_id: slot.id,
              class_id: cls.id,
              entry_type: slot.slot_type,
              activity_name: slot.slot_type === 'activities' ? (config.activities?.[day] || 'Activity') : slot.label
            });
          }
        }
      }

      // 5. Simple lesson allocation logic
      for (const cls of classes) {
        const classAssignments = assignments.filter(a => a.class_id === cls.id);
        let currentSlotIdx = 0;

        for (const assignment of classAssignments) {
          const lessonsToSchedule = assignment.lessons_per_week || 0;
          let scheduled = 0;

          for (let day = 1; day <= 5 && scheduled < lessonsToSchedule; day++) {
            // Try to find an available slot for this class and teacher
            for (const slot of lessonSlots) {
              const teacherKey = `${assignment.teacher_id}-${day}-${slot.id}`;
              const classKey = `${cls.id}-${day}-${slot.id}`;

              if (!teacherBusy.has(teacherKey) && !classBusy.has(classKey)) {
                entries.push({
                  school_id: schoolId,
                  day_of_week: day,
                  time_slot_id: slot.id,
                  class_id: cls.id,
                  subject_id: assignment.subject_id,
                  teacher_id: assignment.teacher_id,
                  entry_type: 'lesson'
                });
                teacherBusy.add(teacherKey);
                classBusy.add(classKey);
                scheduled++;
                break;
              }
            }
          }
        }
      }

      // 6. Bulk insert entries
      const { error: insertError } = await supabase.from('timetable_entries').insert(entries);
      if (insertError) throw insertError;

      toast.success('Timetable generated successfully');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Generate Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">Generate a complete school timetable based on your configuration.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
        <p className="font-black mb-1 flex items-center gap-2"><Clock size={16}/> Configured Schedule:</p>
        {config ? (
          <p>Lesson duration: {config.lesson_duration} min | Breaks: {config.first_break_start}, {config.second_break_start} | Lunch: {config.lunch_start}</p>
        ) : (
          <p className="text-red-600 font-bold">Please configure the timetable setup first!</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-black text-blue-700">{teacherCount}</div>
          <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Teachers</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-black text-green-700">{classCount}</div>
          <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Classes</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-black text-purple-700">{assignmentCount}</div>
          <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Assignments</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="font-black text-gray-900 mb-4">Ready to Generate?</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <CheckCircle className={config ? "text-green-600" : "text-gray-300"} size={20} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">Timetable Configuration</p>
              <p className="text-xs text-gray-500">{config ? 'Configuration found and ready' : 'No configuration found'}</p>
            </div>
            <a href="/school-admin/timetable/setup" className="text-blue-600 text-xs font-semibold hover:underline">Edit Setup</a>
          </div>
          
          <button 
            onClick={handleGenerateTimetable}
            disabled={generating || !config}
            className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white px-6 py-4 rounded-2xl text-lg font-black hover:bg-[#1d4ed8] disabled:opacity-50 transition-all shadow-lg"
          >
            {generating ? <Loader2 className="animate-spin" /> : <Zap fill="white" />}
            {generating ? 'Generating...' : 'GENERATE TIMETABLE NOW'}
          </button>
          
          {lastGenerated && (
            <p className="text-center text-xs text-gray-400">Last generated: {lastGenerated}</p>
          )}
        </div>
      </div>
    </div>
  );
}
