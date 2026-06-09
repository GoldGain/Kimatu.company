import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolConfig {
  school_start_time: string;
  school_end_time: string;
  morning_break_start: string;
  morning_break_end: string;
  lunch_start: string;
  lunch_end: string;
  afternoon_break_start: string;
  afternoon_break_end: string;
  lesson_duration_minutes: number;
}

export default function TimetableSetup() {
  const [config, setConfig] = useState<SchoolConfig>({
    school_start_time: '08:20',
    school_end_time: '15:40',
    morning_break_start: '09:40',
    morning_break_end: '10:20',
    lunch_start: '12:50',
    lunch_end: '13:30',
    afternoon_break_start: '11:40',
    afternoon_break_end: '12:20',
    lesson_duration_minutes: 40,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState('');

  useEffect(() => {
    fetchSchoolConfig();
  }, []);

  const fetchSchoolConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) {
        toast.error('School not found');
        return;
      }

      setSchoolId(profile.school_id);

      const { data, error } = await supabase
        .from('school_timetable_config')
        .select('*')
        .eq('school_id', profile.school_id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          school_start_time: data.school_start_time || '08:20',
          school_end_time: data.school_end_time || '15:40',
          morning_break_start: data.morning_break_start || '09:40',
          morning_break_end: data.morning_break_end || '10:20',
          lunch_start: data.lunch_start || '12:50',
          lunch_end: data.lunch_end || '13:30',
          afternoon_break_start: data.afternoon_break_start || '11:40',
          afternoon_break_end: data.afternoon_break_end || '12:20',
          lesson_duration_minutes: data.lesson_duration_minutes || 40,
        });
      }
    } catch (err: any) {
      toast.error('Failed to load school configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!schoolId) {
      toast.error('School ID not found');
      return;
    }

    setSaving(true);
    try {
      // Map frontend config to DB column names
      const dbConfig = {
        school_id: schoolId,
        school_start_time: config.school_start_time,
        school_end_time: config.school_end_time,
        morning_break_start: config.morning_break_start,
        morning_break_end: config.morning_break_end,
        lunch_start: config.lunch_start,
        lunch_end: config.lunch_end,
        afternoon_break_start: config.afternoon_break_start,
        afternoon_break_end: config.afternoon_break_end,
        lesson_duration_minutes: config.lesson_duration_minutes,
      };
      
      const { error } = await supabase
        .from('school_timetable_config')
        .upsert(dbConfig, {
          onConflict: 'school_id',
        });

      if (error) throw error;
      toast.success('School configuration saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Configure school hours, breaks, and lesson duration</p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Configuration Guide</h3>
            <p className="text-sm text-blue-700 mt-1">
              Set up your school's daily schedule. These times will be used to automatically generate the timetable.
            </p>
          </div>
        </div>
      </div>

      {/* School Hours */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" /> School Hours
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Start Time</label>
            <input
              type="time"
              value={config.school_start_time}
              onChange={e => setConfig({ ...config, school_start_time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School End Time</label>
            <input
              type="time"
              value={config.school_end_time}
              onChange={e => setConfig({ ...config, school_end_time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p>School operates from <strong>{config.school_start_time}</strong> to <strong>{config.school_end_time}</strong></p>
        </div>
      </div>

      {/* Breaks Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Break Times</h2>

        <div className="space-y-6">
          {/* Morning Break */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Morning Break</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={config.morning_break_start}
                  onChange={e => setConfig({ ...config, morning_break_start: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={config.morning_break_end}
                  onChange={e => setConfig({ ...config, morning_break_end: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Lunch Break */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Lunch Break</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={config.lunch_start}
                  onChange={e => setConfig({ ...config, lunch_start: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={config.lunch_end}
                  onChange={e => setConfig({ ...config, lunch_end: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Afternoon Break */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Afternoon Break</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={config.afternoon_break_start}
                  onChange={e => setConfig({ ...config, afternoon_break_start: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={config.afternoon_break_end}
                  onChange={e => setConfig({ ...config, afternoon_break_end: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Duration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Duration</h2>

        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">Minutes per Lesson</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="30"
              max="60"
              step="5"
              value={config.lesson_duration_minutes}
              onChange={e => setConfig({ ...config, lesson_duration_minutes: parseInt(e.target.value) })}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">minutes</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Standard is 40 minutes per lesson</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">Configuration Summary</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• School hours: {config.school_start_time} - {config.school_end_time}</p>
          <p>• Morning break: {config.morning_break_start} - {config.morning_break_end}</p>
          <p>• Lunch break: {config.lunch_start} - {config.lunch_end}</p>
          <p>• Afternoon break: {config.afternoon_break_start} - {config.afternoon_break_end}</p>
          <p>• Lesson duration: {config.lesson_duration_minutes} minutes</p>
        </div>
      </div>
    </div>
  );
}
