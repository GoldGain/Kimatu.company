import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import { Clock, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Database column names (matching the actual DB schema)
interface DbTimetableConfig {
  id?: string;
  school_id: string;
  lesson_duration_minutes: number;
  school_start_time: string;
  school_end_time: string;
  morning_break_start: string;
  morning_break_end: string;
  afternoon_break_start: string;
  afternoon_break_end: string;
  lunch_start: string;
  lunch_end: string;
  created_at?: string;
  updated_at?: string;
}

// Frontend interface (what the UI uses)
interface TimetableConfig {
  lesson_duration: number;
  school_start: string;
  school_end: string;
  first_break_start: string;
  first_break_end: string;
  second_break_start: string;
  second_break_end: string;
  lunch_start: string;
  lunch_end: string;
  activities: Record<string, string>;
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Map DB config to frontend config
const mapDbToFrontend = (dbConfig: DbTimetableConfig | null, dbActivities: Record<string, string>): TimetableConfig => {
  if (!dbConfig) {
    return {
      lesson_duration: 40,
      school_start: '08:20',
      school_end: '15:40',
      first_break_start: '09:40',
      first_break_end: '10:20',
      second_break_start: '11:40',
      second_break_end: '12:20',
      lunch_start: '12:50',
      lunch_end: '13:30',
      activities: { '1': 'Games', '2': 'Clubs', '3': 'Study Hall', '4': 'Drama', '5': 'Music Club' }
    };
  }
  return {
    lesson_duration: dbConfig.lesson_duration_minutes || 40,
    school_start: dbConfig.school_start_time?.slice(0, 5) || '08:20',
    school_end: dbConfig.school_end_time?.slice(0, 5) || '15:40',
    first_break_start: dbConfig.morning_break_start?.slice(0, 5) || '09:40',
    first_break_end: dbConfig.morning_break_end?.slice(0, 5) || '10:20',
    second_break_start: dbConfig.afternoon_break_start?.slice(0, 5) || '11:40',
    second_break_end: dbConfig.afternoon_break_end?.slice(0, 5) || '12:20',
    lunch_start: dbConfig.lunch_start?.slice(0, 5) || '12:50',
    lunch_end: dbConfig.lunch_end?.slice(0, 5) || '13:30',
    activities: dbActivities
  };
};

// Map frontend config to DB config
const mapFrontendToDb = (frontend: TimetableConfig, schoolId: string): DbTimetableConfig => ({
  school_id: schoolId,
  lesson_duration_minutes: frontend.lesson_duration,
  school_start_time: frontend.school_start,
  school_end_time: frontend.school_end,
  morning_break_start: frontend.first_break_start,
  morning_break_end: frontend.first_break_end,
  afternoon_break_start: frontend.second_break_start,
  afternoon_break_end: frontend.second_break_end,
  lunch_start: frontend.lunch_start,
  lunch_end: frontend.lunch_end
});

export default function TimetableSetup() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string>('');
  const [config, setConfig] = useState<TimetableConfig>(mapDbToFrontend(null, {}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      // Fetch config
      const { data: configData, error: configError } = await supabaseUntyped
        .from('school_timetable_config')
        .select('*')
        .eq('school_id', resolvedSchoolId)
        .maybeSingle();
      
      if (configError) {
        console.error('Config fetch error:', configError);
        toast.error('Failed to load timetable configuration');
      }

      // Fetch activities from school_activities table
      const { data: activitiesData, error: actError } = await supabaseUntyped
        .from('school_activities')
        .select('day_of_week, activity_name')
        .eq('school_id', resolvedSchoolId)
        .order('day_of_week');
      
      if (actError) {
        console.error('Activities fetch error:', actError);
      }

      // Build activities record
      const activities: Record<string, string> = {
        '1': 'Games', '2': 'Clubs', '3': 'Study Hall', '4': 'Drama', '5': 'Music Club'
      };
      (activitiesData || []).forEach((a: any) => {
        activities[String(a.day_of_week)] = a.activity_name;
      });

      setConfig(mapDbToFrontend(configData || null, activities));
    } catch (err: any) {
      console.error('fetchData error:', err);
      toast.error('Failed to load timetable setup: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof TimetableConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleActivityChange = (day: number, value: string) => {
    setConfig((prev) => ({
      ...prev,
      activities: {
        ...prev.activities,
        [String(day)]: value
      }
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      if (!schoolId) {
        throw new Error('No school ID found. Please log in again.');
      }

      // 1. Save config (upsert into school_timetable_config)
      const dbConfig = mapFrontendToDb(config, schoolId);
      console.log('Saving config:', dbConfig);

      const { error: configError } = await supabaseUntyped
        .from('school_timetable_config')
        .upsert(dbConfig, { onConflict: 'school_id' });
      
      if (configError) {
        console.error('Config save error details:', configError);
        throw new Error('Failed to save timetable configuration: ' + configError.message);
      }

      // 2. Save activities (upsert into school_activities table)
      for (let day = 1; day <= 5; day++) {
        const activityName = config.activities[String(day)] || '';
        
        // Try to update existing, if none then insert
        const { data: existing } = await supabaseUntyped
          .from('school_activities')
          .select('id')
          .eq('school_id', schoolId)
          .eq('day_of_week', day)
          .maybeSingle();

        if (existing?.id) {
          const { error: updateError } = await supabaseUntyped
            .from('school_activities')
            .update({ activity_name: activityName })
            .eq('id', existing.id);
          if (updateError) console.error(`Failed to update activity for day ${day}:`, updateError);
        } else {
          const { error: insertError } = await supabaseUntyped
            .from('school_activities')
            .insert({
              school_id: schoolId,
              day_of_week: day,
              activity_name: activityName,
              start_time: '15:40',
              end_time: '16:20'
            });
          if (insertError) console.error(`Failed to insert activity for day ${day}:`, insertError);
        }
      }

      toast.success('Configuration saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-[#111111]">Timetable Setup</h1>
        <p className="text-sm text-[#666666]">Configure your school's lesson duration, break times, and after-school activities.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-sm text-blue-900">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-black">School Day Structure:</p>
          <p>
            Lesson 1 & 2 → <strong>FIRST BREAK</strong> → Lesson 3 & 4 → <strong>SECOND BREAK</strong> → Lesson 5 & 6 → <strong>LUNCH</strong> → Lesson 7 & 8 → <strong>ACTIVITIES</strong>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Lessons and Breaks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Lesson duration (min)</label>
            <input
              type="number"
              value={config.lesson_duration}
              onChange={(e) => handleConfigChange('lesson_duration', parseInt(e.target.value) || 40)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <TimeInput label="School starts" value={config.school_start} onChange={(value) => handleConfigChange('school_start', value)} />
          <TimeInput label="School ends" value={config.school_end} onChange={(value) => handleConfigChange('school_end', value)} />

          <TimeInput label="FIRST BREAK starts" value={config.first_break_start} onChange={(value) => handleConfigChange('first_break_start', value)} />
          <TimeInput label="FIRST BREAK ends" value={config.first_break_end} onChange={(value) => handleConfigChange('first_break_end', value)} />
          <div className="hidden md:block" />

          <TimeInput label="SECOND BREAK starts" value={config.second_break_start} onChange={(value) => handleConfigChange('second_break_start', value)} />
          <TimeInput label="SECOND BREAK ends" value={config.second_break_end} onChange={(value) => handleConfigChange('second_break_end', value)} />
          <div className="hidden md:block" />

          <TimeInput label="LUNCH starts" value={config.lunch_start} onChange={(value) => handleConfigChange('lunch_start', value)} />
          <TimeInput label="LUNCH ends" value={config.lunch_end} onChange={(value) => handleConfigChange('lunch_end', value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4">After-School Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {dayNames.map((day, idx) => (
            <div key={day}>
              <label className="block text-sm font-medium text-[#111111] mb-2">{day} Activity</label>
              <input 
                type="text" 
                value={config.activities?.[String(idx + 1)] || ''} 
                onChange={(e) => handleActivityChange(idx + 1, e.target.value)} 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" 
                placeholder={`Activity for ${day}`}
              />
            </div>
          ))}
        </div>
        
        <button 
          onClick={handleSaveConfig} 
          disabled={saving} 
          className="flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111111] mb-2">{label}</label>
      <input 
        type="time" 
        value={value?.slice(0, 5) || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" 
      />
    </div>
  );
}
