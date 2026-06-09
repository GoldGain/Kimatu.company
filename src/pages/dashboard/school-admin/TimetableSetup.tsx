import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import { Clock, Plus, Trash2, Save, AlertCircle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface TimeConfig {
  school_start_time: string;
  school_end_time: string;
  lesson_duration_minutes: number;
  morning_break_start: string;
  morning_break_end: string;
  lunch_start: string;
  lunch_end: string;
  afternoon_break_start: string;
  afternoon_break_end: string;
}

interface Activity {
  id?: string;
  day_of_week: number;
  activity_name: string;
  start_time: string;
  end_time: string;
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * REQUIRED BREAK ORDER:
 * 2 lessons → FIRST BREAK (9:40–10:20) → 2 lessons → SECOND BREAK (11:40–12:20)
 * → 2 lessons → LUNCH (13:40–14:20) → 2 lessons → ACTIVITIES (15:40–16:20)
 */
const REQUIRED_CONFIG: TimeConfig = {
  school_start_time: '08:20',
  school_end_time: '15:40',
  lesson_duration_minutes: 40,
  morning_break_start: '09:40',   // FIRST BREAK: after 2 lessons
  morning_break_end: '10:20',
  afternoon_break_start: '11:40', // SECOND BREAK: after next 2 lessons
  afternoon_break_end: '12:20',
  lunch_start: '13:40',           // LUNCH: after next 2 lessons
  lunch_end: '14:20',
};

const REQUIRED_ACTIVITIES = [
  { day_of_week: 1, activity_name: 'Games',      start_time: '15:40', end_time: '16:20' },
  { day_of_week: 2, activity_name: 'Clubs',      start_time: '15:40', end_time: '16:20' },
  { day_of_week: 3, activity_name: 'Study Hall', start_time: '15:40', end_time: '16:20' },
  { day_of_week: 4, activity_name: 'Drama',      start_time: '15:40', end_time: '16:20' },
  { day_of_week: 5, activity_name: 'Music Club', start_time: '15:40', end_time: '16:20' },
];

export default function TimetableSetup() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string>('');
  const [config, setConfig] = useState<TimeConfig>(REQUIRED_CONFIG);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newActivity, setNewActivity] = useState<Activity>({ day_of_week: 1, activity_name: '', start_time: '15:40', end_time: '16:20' });

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const resolveSchoolId = async () => {
    if (user?.schoolId) return user.schoolId;
    const { data: profile } = await supabaseUntyped.from('profiles').select('school_id').eq('id', user?.id).single();
    return profile?.school_id || '';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const resolvedSchoolId = await resolveSchoolId();
      if (!resolvedSchoolId) {
        toast.error('No school assigned to your account');
        return;
      }
      setSchoolId(resolvedSchoolId);

      const { data: configData } = await supabaseUntyped
        .from('school_timetable_config')
        .select('*')
        .eq('school_id', resolvedSchoolId)
        .maybeSingle();
      setConfig(configData ? { ...REQUIRED_CONFIG, ...configData } : REQUIRED_CONFIG);

      const { data: activitiesData } = await supabaseUntyped
        .from('school_activities')
        .select('*')
        .eq('school_id', resolvedSchoolId)
        .order('day_of_week');
      setActivities(activitiesData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable setup');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof TimeConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const saveConfig = async (overrideConfig = config) => {
    if (!schoolId) throw new Error('No school selected');
    const { error } = await supabaseUntyped
      .from('school_timetable_config')
      .upsert({ school_id: schoolId, ...overrideConfig }, { onConflict: 'school_id' });
    if (error) throw error;
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await saveConfig();
      toast.success('Timetable schedule saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const applyRequiredTemplate = async () => {
    setSaving(true);
    try {
      setConfig(REQUIRED_CONFIG);
      await saveConfig(REQUIRED_CONFIG);
      for (const activity of REQUIRED_ACTIVITIES) {
        await supabaseUntyped.from('school_activities').upsert({ school_id: schoolId, ...activity }, { onConflict: 'school_id,day_of_week,activity_name' });
      }
      toast.success('Required template applied: 2 lessons → FIRST BREAK → 2 lessons → SECOND BREAK → 2 lessons → LUNCH → 2 lessons → ACTIVITIES');
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.activity_name.trim()) {
      toast.error('Activity name is required');
      return;
    }
    try {
      const { error } = await supabaseUntyped.from('school_activities').upsert({ school_id: schoolId, ...newActivity }, { onConflict: 'school_id,day_of_week,activity_name' });
      if (error) throw error;
      toast.success('Activity saved');
      setNewActivity({ day_of_week: 1, activity_name: '', start_time: '15:40', end_time: '16:20' });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save activity');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const { error } = await supabaseUntyped.from('school_activities').delete().eq('id', id);
      if (error) throw error;
      toast.success('Activity deleted');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete activity');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Timetable Setup</h1>
          <p className="text-sm text-[#666666]">Configure the school schedule. Use the required template for the correct break order.</p>
        </div>
        <button onClick={applyRequiredTemplate} disabled={saving} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
          <Wand2 className="w-4 h-4" /> Use Required Template
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-sm text-blue-900">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-black">Correct break order (required):</p>
          <p>
            Lesson 1 &amp; 2 (8:20–9:40) → <strong>FIRST BREAK</strong> (9:40–10:20) →
            Lesson 3 &amp; 4 (10:20–11:40) → <strong>SECOND BREAK</strong> (11:40–12:20) →
            Lesson 5 &amp; 6 (12:20–13:40) → <strong>LUNCH</strong> (13:40–14:20) →
            Lesson 7 &amp; 8 (14:20–15:40) → <strong>AFTER-SCHOOL ACTIVITIES</strong> (15:40–16:20)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> School Hours and Breaks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <TimeInput label="School starts" value={config.school_start_time} onChange={(value) => handleConfigChange('school_start_time', value)} />
          <TimeInput label="School ends" value={config.school_end_time} onChange={(value) => handleConfigChange('school_end_time', value)} />
          <div><label className="block text-sm font-medium text-[#111111] mb-2">Lesson duration (min)</label><input type="number" value={config.lesson_duration_minutes} onChange={(e) => handleConfigChange('lesson_duration_minutes', parseInt(e.target.value))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" min="20" max="60" /></div>
          <TimeInput label="FIRST BREAK starts (after 2 lessons)" value={config.morning_break_start} onChange={(value) => handleConfigChange('morning_break_start', value)} />
          <TimeInput label="FIRST BREAK ends" value={config.morning_break_end} onChange={(value) => handleConfigChange('morning_break_end', value)} />
          <div className="hidden md:block" />
          <TimeInput label="SECOND BREAK starts (after next 2 lessons)" value={config.afternoon_break_start} onChange={(value) => handleConfigChange('afternoon_break_start', value)} />
          <TimeInput label="SECOND BREAK ends" value={config.afternoon_break_end} onChange={(value) => handleConfigChange('afternoon_break_end', value)} />
          <div className="hidden md:block" />
          <TimeInput label="LUNCH starts (after next 2 lessons)" value={config.lunch_start} onChange={(value) => handleConfigChange('lunch_start', value)} />
          <TimeInput label="LUNCH ends" value={config.lunch_end} onChange={(value) => handleConfigChange('lunch_end', value)} />
        </div>
        <button onClick={handleSaveConfig} disabled={saving} className="flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Configuration'}</button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4">After-School Activities (3:40–4:20 PM)</h2>
        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div><label className="block text-sm font-medium text-[#111111] mb-2">Day</label><select value={newActivity.day_of_week} onChange={(e) => setNewActivity({ ...newActivity, day_of_week: parseInt(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]">{dayNames.map((day, idx) => <option key={day} value={idx + 1}>{day}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-[#111111] mb-2">Activity</label><input type="text" placeholder="Games, Clubs, Study Hall" value={newActivity.activity_name} onChange={(e) => setNewActivity({ ...newActivity, activity_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" /></div>
            <TimeInput label="Start" value={newActivity.start_time} onChange={(value) => setNewActivity({ ...newActivity, start_time: value })} />
            <TimeInput label="End" value={newActivity.end_time} onChange={(value) => setNewActivity({ ...newActivity, end_time: value })} />
          </div>
          <button onClick={handleAddActivity} className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8]"><Plus className="w-4 h-4" />Save Activity</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.length === 0 ? <p className="text-sm text-gray-500">No activities saved yet. Use the required template to add all five.</p> : activities.map((activity) => (
            <div key={activity.id || `${activity.day_of_week}-${activity.activity_name}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div><p className="font-bold text-[#111111]">{dayNames[activity.day_of_week - 1]} — {activity.activity_name}</p><p className="text-sm text-[#666666]">{activity.start_time?.slice(0, 5)} - {activity.end_time?.slice(0, 5)}</p></div>
              {activity.id && <button onClick={() => handleDeleteActivity(activity.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111111] mb-2">{label}</label>
      <input type="time" value={value?.slice(0, 5) || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
    </div>
  );
}
