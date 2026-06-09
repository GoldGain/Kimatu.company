import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Check, X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const schoolId = user?.schoolId;
    const { data } = await supabaseUntyped.from('classes').select('*').eq('school_id', schoolId);
    setClasses(data || []);
  };

  const fetchStudents = async (classId: string) => {
    setLoading(true);
    const { data } = await supabaseUntyped.from('students').select('id, first_name, last_name, admission_number')
      .eq('class_id', classId).eq('is_active', true);
    setStudents(data || []);
    // Check existing attendance
    const { data: existing } = await supabaseUntyped.from('attendance').select('*')
      .eq('class_id', classId).eq('date', selectedDate);
    const map: Record<string, string> = {};
    existing?.forEach(a => { map[a.student_id] = a.status; });
    setAttendance(map);
    setLoading(false);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSaved(false);
    if (classId) fetchStudents(classId);
  };

  const toggleStatus = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === status ? '' : status }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: teacherData } = await supabaseUntyped.from('teachers').select('id').eq('profile_id', user?.id).single();
    const teacherId = teacherData?.id;
    
    const records = Object.entries(attendance).filter(([_, status]) => status).map(([studentId, status]) => ({
      school_id: user?.schoolId,
      student_id: studentId,
      class_id: selectedClass,
      teacher_id: teacherId,
      date: selectedDate,
      status,
    }));
    
    // Delete existing for this date/class
    await supabaseUntyped.from('attendance').delete().eq('class_id', selectedClass).eq('date', selectedDate);
    
    if (records.length > 0) {
      const { error } = await supabaseUntyped.from('attendance').insert(records);
      if (!error) {
        setSaved(true);
        toast.success(`Attendance saved for ${records.length} students!`);
      } else {
        toast.error('Failed to save attendance: ' + error.message);
      }
    } else {
      toast.info('No attendance marked. Please mark at least one student.');
    }
    setSaving(false);
  };

  const statusConfig = [
    { key: 'present', label: 'Present', color: 'bg-green-500', icon: <Check className="w-3 h-3" /> },
    { key: 'absent', label: 'Absent', color: 'bg-red-500', icon: <X className="w-3 h-3" /> },
    { key: 'late', label: 'Late', color: 'bg-yellow-500', icon: <ClipboardList className="w-3 h-3" /> },
    { key: 'excused', label: 'Excused', color: 'bg-blue-500', icon: <ClipboardList className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">Mark Attendance</h1><p className="text-sm text-[#666666]">Take attendance for your class</p></div>
      
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <select value={selectedClass} onChange={e => handleClassChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.stream && `(${c.stream})`}</option>)}
          </select>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSaved(false); }} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
        </div>

        {selectedClass && (
          <>
            {loading ? <div className="text-center py-8 text-sm text-[#666666]">Loading students...</div> :
             students.length === 0 ? <div className="text-center py-8 text-sm text-[#666666]">No students in this class</div> :
             <div className="space-y-3">
               {students.map(s => (
                 <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">{s.first_name[0]}{s.last_name[0]}</div>
                     <div><span className="text-sm font-medium">{s.first_name} {s.last_name}</span><br/><span className="text-xs text-[#666666]">{s.admission_number}</span></div>
                   </div>
                   <div className="flex gap-2">
                     {statusConfig.map(st => (
                       <button key={st.key} onClick={() => toggleStatus(s.id, st.key)}
                         className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${attendance[s.id] === st.key ? `${st.color} text-white` : 'bg-white text-gray-400 hover:bg-gray-100'}`}>
                         {st.icon} {st.label}
                       </button>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
            }
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || students.length === 0} className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Attendance
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
