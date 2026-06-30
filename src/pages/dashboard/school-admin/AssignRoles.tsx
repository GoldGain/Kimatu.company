import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserCog, Loader2, Users, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export default function SchoolAdminAssignRoles() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [dosStream, setDosStream] = useState('');
  const [hasDean, setHasDean] = useState(false);

  useEffect(() => {
    if (user?.schoolId) fetchData();
  }, [user?.schoolId]);

  const fetchData = async () => {
    try {
      const [{ data: teacherData }, { data: classData }, { data: streamData }] = await Promise.all([
        supabase.from('teachers').select('*, assigned_class_id, is_class_teacher, assigned_streams').eq('school_id', user?.schoolId).eq('is_active', true).order('id'),
        supabase.from('classes').select('*').eq('school_id', user?.schoolId).order('name'),
        supabase.from('streams').select('*').eq('school_id', user?.schoolId).order('name'),
      ]);
      setTeachers(teacherData || []);
      setClasses(classData || []);
      setStreams(streamData || []);
      if ((streamData || []).length > 0) {
        const dos = (streamData || []).find((s: any) => s.has_dean_of_studies);
        if (dos) setDosStream(dos.id);
        setHasDean(!!dos);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  // Fetch teacher names
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const fetchNames = async () => {
      const names: Record<string, string> = {};
      for (const t of teachers) {
        if (t.profile_id) {
          const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', t.profile_id).single();
          names[t.id] = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : `Teacher ${t.id.slice(0, 6)}`;
        } else {
          names[t.id] = `Teacher ${t.id.slice(0, 6)}`;
        }
      }
      setTeacherNames(names);
    };
    if (teachers.length > 0) fetchNames();
  }, [teachers]);

  const assignClassTeacher = async (teacherId: string, classId: string | null) => {
    if (!teacherId || teacherId === '') {
      console.error('Invalid teacher ID');
      return;
    }
    setSavingRole(`class-${teacherId}`);
    try {
      if (classId) {
        await supabaseUntyped
          .from('teachers')
          .update({ is_class_teacher: false, assigned_class_id: null })
          .eq('assigned_class_id', classId)
          .eq('school_id', user?.schoolId);
        const { error } = await supabaseUntyped
          .from('teachers')
          .update({ is_class_teacher: true, assigned_class_id: classId })
          .eq('id', teacherId);
        if (error) throw error;
        toast.success('Class teacher assigned');
      } else {
        const { error } = await supabaseUntyped
          .from('teachers')
          .update({ is_class_teacher: false, assigned_class_id: null })
          .eq('id', teacherId);
        if (error) throw error;
        toast.success('Class teacher removed');
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSavingRole(null);
  };

  const toggleDeanOfStudies = async (teacherId: string, streamId: string | null) => {
    setSavingRole(`dos-${teacherId}`);
    try {
      const { error } = await supabaseUntyped
        .from('teachers')
        .update({ is_dean_of_studies: !!streamId, assigned_streams: streamId ? [streamId] : [] })
        .eq('id', teacherId);
      if (error) throw error;

      if (streamId) {
        await supabaseUntyped.from('streams').update({ has_dean_of_studies: true }).eq('id', streamId);
        setDosStream(streamId);
        toast.success('Dean of Studies assigned');
      } else {
        await supabaseUntyped.from('streams').update({ has_dean_of_studies: false }).eq('id', dosStream);
        setDosStream('');
        toast.success('Dean of Studies removed');
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSavingRole(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#2563EB]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <UserCog className="w-6 h-6 text-[#1A365D]" />
          Assign Roles
        </h1>
        <p className="text-gray-500 text-sm mt-1">Assign Class Teachers and Deans of Studies.</p>
      </div>

      {/* Class Teachers */}
      <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#1A365D]" />
          <h2 className="font-bold text-gray-900">Class Teachers</h2>
        </div>
        {classes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">No classes found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Current Class Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map((cls) => {
                  const currentTeacher = teachers.find(t => t.assigned_class_id === cls.id);
                  const availableTeachers = teachers.filter(t => !t.is_class_teacher || t.assigned_class_id === cls.id);
                  return (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{cls.name} {cls.stream || ''}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {currentTeacher ? (teacherNames[currentTeacher.id] || `Teacher ${currentTeacher.id?.slice(0, 6)}`) : <span className="text-gray-400 italic">None assigned</span>}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={currentTeacher?.id || ''}
                          onChange={e => {
                            const teacherId = e.target.value;
                            if (!teacherId) {
                              if (currentTeacher) assignClassTeacher(currentTeacher.id, null);
                            } else {
                              assignClassTeacher(teacherId, cls.id);
                            }
                          }}
                          disabled={savingRole?.startsWith('class-')}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] bg-white disabled:opacity-50"
                        >
                          <option value="">— No Class Teacher —</option>
                          {availableTeachers.map((t) => (
                            <option key={t.id} value={t.id}>{teacherNames[t.id] || `Teacher ${t.id?.slice(0, 6)}`}</option>
                          ))}
                        </select>
                        {savingRole?.startsWith('class-') && <Loader2 className="w-4 h-4 animate-spin inline ml-2 text-gray-400" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dean of Studies */}
      {streams.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#1A365D]" />
            <h2 className="font-bold text-gray-900">Dean of Studies</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stream</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Current Dean</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {streams.map((stream) => {
                  const currentDean = teachers.find(t => t.is_dean_of_studies && t.assigned_streams?.includes(stream.id));
                  const availableForDean = teachers.filter(t => !t.is_dean_of_studies || t.id === currentDean?.id);
                  return (
                    <tr key={stream.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{stream.name}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {currentDean ? (teacherNames[currentDean.id] || `Teacher ${currentDean.id?.slice(0, 6)}`) : <span className="text-gray-400 italic">None assigned</span>}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={currentDean?.id || ''}
                          onChange={e => {
                            const teacherId = e.target.value;
                            if (!teacherId) {
                              if (currentDean) toggleDeanOfStudies(currentDean.id, null);
                            } else {
                              toggleDeanOfStudies(teacherId, stream.id);
                            }
                          }}
                          disabled={savingRole?.startsWith('dos-')}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] bg-white disabled:opacity-50"
                        >
                          <option value="">— No Dean —</option>
                          {availableForDean.map((t) => (
                            <option key={t.id} value={t.id}>{teacherNames[t.id] || `Teacher ${t.id?.slice(0, 6)}`}</option>
                          ))}
                        </select>
                        {savingRole?.startsWith('dos-') && <Loader2 className="w-4 h-4 animate-spin inline ml-2 text-gray-400" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
