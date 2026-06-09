import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import { Clock, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TimetableConfig {
  id?: string;
  school_id: string;
  lesson_duration: number;
  first_break_start: string;
  first_break_end: string;
  second_break_start: string;
  second_break_end: string;
  lunch_start: string;
  lunch_end: string;
  activities: any;
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableSetup() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string>('');
  const [config, setConfig] = useState<TimetableConfig>({
    school_id: '',
    lesson_duration: 40,
    first_break_start: '09:40',
    first_break_end: '10:20',
    second_break_start: '11:40',
    second_break_end: '12:20',
    lunch_start: '13:40',
    lunch_end: '14:20',
    activities: {
      1: 'Games',
      2: 'Clubs',
      3: 'Study Hall',
      4: 'Drama',
      5: 'Music Club'
    }
  });
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

      const { data: configData, error } = await supabaseUntyped
        .from('school_timetable_config')
        .select('*')
        .eq('school_id', resolvedSchoolId)
        .maybeSingle();
      
      if (configData) {
        setConfig(configData);
      } else {
        setConfig(prev => ({ ...prev, school_id: resolvedSchoolId }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable setup');
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
        [day]: value
      }
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseUntyped
        .from('school_timetable_config')
        .upsert(config, { onConflict: 'school_id' });
      
      if (error) throw error;
      toast.success('Timetable configuration saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration');
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
              onChange={(e) => handleConfigChange('lesson_duration', parseInt(e.target.value))} 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" 
            />
          </div>
          <div className="hidden md:block" />
          <div className="hidden md:block" />
          
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
        <h2 className="text-lg font-bold text-[#111111] mb-4">After-School Activities (3:40–4:20 PM)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {dayNames.map((day, idx) => (
            <div key={day}>
              <label className="block text-sm font-medium text-[#111111] mb-2">{day} Activity</label>
              <input 
                type="text" 
                value={config.activities?.[idx + 1] || ''} 
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
