import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserCheck, School, GraduationCap, Loader2, CheckCircle2,
  AlertCircle, Users, Search, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_class_teacher: boolean;
  assigned_class_id: string | null;
  is_dean_of_studies: boolean;
}

interface Class {
  id: string;
  name: string;
  level: string;
  class_teacher_id: string | null;
  classTeacherName?: string;
}

export default function AssignRoles() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'class-teachers' | 'dean'>('class-teachers');

  useEffect(() => {
    if (user?.schoolId) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teachers
      const { data: teachersData } = await supabaseUntyped
        .from('teachers')
        .select('id, profile_id, is_class_teacher, assigned_class_id, is_dean_of_studies, first_name, last_name, email')
        .eq('school_id', user?.schoolId)
        .eq('is_active', true);

      const mappedTeachers: Teacher[] = (teachersData || []).map((t: any) => ({
        id: t.id,
        profile_id: t.profile_id,
        first_name: t.first_name || '',
        last_name: t.last_name || '',
        email: t.email || '',
        is_class_teacher: t.is_class_teacher || false,
        assigned_class_id: t.assigned_class_id,
        is_dean_of_studies: t.is_dean_of_studies || false,
      }));
      setTeachers(mappedTeachers);

      // Fetch classes
      const { data: classesData } = await supabaseUntyped
        .from('classes')
        .select('id, name, level, class_teacher_id')
        .eq('school_id', user?.schoolId)
        .order('name');

      // Enrich with teacher names
      const enrichedClasses: Class[] = (classesData || []).map((cls: any) => {
        const ct = mappedTeachers.find(t => t.assigned_class_id === cls.id);
        return {
          ...cls,
          classTeacherName: ct ? `${ct.first_name} ${ct.last_name}` : null,
        };
      });
      setClasses(enrichedClasses);
    } catch (err: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const assignClassTeacher = async (teacherId: string, classId: string | null) => {
    setSaving(teacherId);
    try {
      // Remove existing assignment for this class
      if (classId) {
        await supabaseUntyped
          .from('teachers')
          .update({ is_class_teacher: false, assigned_class_id: null })
          .eq('assigned_class_id', classId)
          .eq('school_id', user?.schoolId);
      }

      // Assign new teacher
      const { error } = await supabaseUntyped
        .from('teachers')
        .update({
          is_class_teacher: classId ? true : false,
          assigned_class_id: classId,
        })
        .eq('id', teacherId);

      if (error) throw error;
      toast.success(classId ? 'Class teacher assigned!' : 'Class teacher removed!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign class teacher');
    } finally {
      setSaving(null);
    }
  };

  const assignDeanOfStudies = async (teacherId: string, assign: boolean) => {
    setSaving(teacherId);
    try {
      // Remove existing DoS if assigning new one
      if (assign) {
        await supabaseUntyped
          .from('teachers')
          .update({ is_dean_of_studies: false })
          .eq('school_id', user?.schoolId)
          .eq('is_dean_of_studies', true);
      }

      const { error } = await supabaseUntyped
        .from('teachers')
        .update({ is_dean_of_studies: assign })
        .eq('id', teacherId);

      if (error) throw error;
      toast.success(assign ? 'Dean of Studies assigned!' : 'Dean of Studies role removed!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setSaving(null);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const currentDos = teachers.find(t => t.is_dean_of_studies);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#1A365D]" />
            Assign Roles
          </h1>
          <p className="text-sm text-gray-500 mt-1">Assign Class Teachers and Dean of Studies</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Total Teachers</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{teachers.filter(t => t.is_class_teacher).length}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><School className="w-3.5 h-3.5" /> Class Teachers</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{currentDos ? 1 : 0}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Dean of Studies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['class-teachers', 'dean'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-[#1A365D] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'class-teachers' ? 'Class Teachers' : 'Dean of Studies'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
        </div>
      ) : activeTab === 'class-teachers' ? (
        /* Class Teachers Tab */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <School className="w-5 h-5 text-[#1A365D]" />
              Assign Class Teachers
            </h2>
            <p className="text-xs text-gray-500 mt-1">Each class can have one class teacher. Select a teacher for each class.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {classes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <School className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No classes found.</p>
              </div>
            ) : classes.map(cls => (
              <div key={cls.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{cls.name}</p>
                  {cls.level && <p className="text-xs text-gray-400">{cls.level}</p>}
                  {cls.classTeacherName && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Current: {cls.classTeacherName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    defaultValue={teachers.find(t => t.assigned_class_id === cls.id)?.id || ''}
                    onChange={e => {
                      const teacherId = e.target.value;
                      if (!teacherId) {
                        // Remove class teacher assignment
                        const currentTeacher = teachers.find(t => t.assigned_class_id === cls.id);
                        if (currentTeacher) {
                          assignClassTeacher(currentTeacher.id, null);
                        }
                      } else {
                        assignClassTeacher(teacherId, cls.id);
                      }
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                    disabled={saving !== null}
                  >
                    <option value="">— No Class Teacher —</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                        {t.assigned_class_id && t.assigned_class_id !== cls.id ? ' (assigned)' : ''}
                      </option>
                    ))}
                  </select>
                  {saving === cls.id && <Loader2 className="w-4 h-4 animate-spin text-[#1A365D]" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Dean of Studies Tab */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#1A365D]" />
              Assign Dean of Studies
            </h2>
            <p className="text-xs text-gray-500 mt-1">Only one teacher can be the Dean of Studies at a time.</p>
            {currentDos && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  Current Dean of Studies: <strong>{currentDos.first_name} {currentDos.last_name}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teachers..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No teachers found.</p>
              </div>
            ) : filteredTeachers.map(t => (
              <div key={t.id} className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A365D] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {t.first_name[0]}{t.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{t.first_name} {t.last_name}</p>
                  <p className="text-xs text-gray-400 truncate">{t.email}</p>
                  {t.is_class_teacher && t.assigned_class_id && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Class Teacher — {classes.find(c => c.id === t.assigned_class_id)?.name || ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.is_dean_of_studies ? (
                    <>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> Dean of Studies
                      </span>
                      <button
                        onClick={() => assignDeanOfStudies(t.id, false)}
                        disabled={saving === t.id}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {saving === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => assignDeanOfStudies(t.id, true)}
                      disabled={saving === t.id}
                      className="text-xs bg-[#1A365D] text-white px-4 py-1.5 rounded-lg hover:bg-[#2D4A7C] transition-colors flex items-center gap-1"
                    >
                      {saving === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><GraduationCap className="w-3 h-3" /> Assign as DoS</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
