import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { createScopedUser } from '@/lib/supabase/createUser';
import { useAuth } from '@/contexts/AuthContext';
import { useTeachers } from '@/hooks/useSupabaseData';
import { Search, Plus, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import type { GenderType } from '@/types/database';

const DEFAULT_TEACHER_PASSWORD = 'Teacher@2025';

export default function SchoolAdminTeachers() {
  const { user } = useAuth();
  const { teachers, loading, refetch } = useTeachers(user?.schoolId || undefined);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '' as GenderType,
    qualification: '',
    specialization: '',
    tsc_number: '',
  });

  const nextTeacherNumber = useMemo(() => {
    const maxNumber = teachers.reduce((max, teacher: any) => Math.max(max, Number(teacher.teacher_number || 0)), 0);
    return maxNumber + 1;
  }, [teachers]);

  const nextTeacherNumberLabel = String(nextTeacherNumber).padStart(2, '0');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.schoolId) {
      toast.error('No school assigned to your account');
      return;
    }

    setAdding(true);
    try {
      const { data: existingTeachers, error: numberError } = await supabase
        .from('teachers')
        .select('teacher_number')
        .eq('school_id', user.schoolId)
        .order('teacher_number', { ascending: false })
        .limit(1);
      if (numberError) throw numberError;

      const actualNextTeacherNumber = existingTeachers && existingTeachers.length > 0
        ? Number(existingTeachers[0].teacher_number || 0) + 1
        : 1;
      const teacherNumberLabel = String(actualNextTeacherNumber).padStart(2, '0');
      const employeeNumber = `T${teacherNumberLabel}`;

      const authData = await createScopedUser({
        email: formData.email,
        password: DEFAULT_TEACHER_PASSWORD,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: 'teacher',
        school_id: user.schoolId,
        metadata: { teacher_number: actualNextTeacherNumber, employee_number: employeeNumber },
      });

      const { error: teacherError } = await supabase.from('teachers').insert([{
        employee_number: employeeNumber,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        qualification: formData.qualification.trim() || null,
        specialization: formData.specialization.trim() || null,
        tsc_number: formData.tsc_number.trim() || null,
        profile_id: authData.user.id,
        school_id: user.schoolId,
        is_active: true,
        hire_date: new Date().toISOString().split('T')[0],
        teacher_number: actualNextTeacherNumber,
      }]);

      if (teacherError) throw new Error(`Teacher record failed: ${teacherError.message}`);

      toast.success(`Teacher ${teacherNumberLabel} added. Login: ${formData.email.trim().toLowerCase()} | Password: ${DEFAULT_TEACHER_PASSWORD}`);
      setShowAdd(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', gender: '' as GenderType, qualification: '', specialization: '', tsc_number: '' });
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add teacher');
    } finally {
      setAdding(false);
    }
  };

  const filtered = teachers.filter((teacher: any) =>
    teacher.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    teacher.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(search.toLowerCase()) ||
    String(teacher.teacher_number || '').includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Teachers</h1>
          <p className="text-sm text-gray-500">{filtered.length} total teachers. New teachers receive automatic numbers like 01, 02, 03.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#1d4ed8]"><Plus className="w-4 h-4" /> Add Teacher</button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold">Add New Teacher</h3>
              <p className="text-sm text-gray-500">Only enter the teacher details. The number and password are generated automatically.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wider font-black text-blue-600">Next Number</p>
                <p className="text-3xl font-black text-blue-800">{nextTeacherNumberLabel}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider font-black text-emerald-700 flex items-center gap-1"><KeyRound className="w-3 h-3" /> Default Password</p>
                <p className="text-lg font-black text-emerald-800">{DEFAULT_TEACHER_PASSWORD}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="First Name *" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" required />
            <input placeholder="Last Name *" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" required />
            <input placeholder="Email *" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" type="email" required />
            <input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" />
            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value as GenderType })} className="w-full px-4 py-2 border rounded-xl text-sm bg-white">
              <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option>
            </select>
            <input placeholder="Qualification" value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" />
            <input placeholder="Specialization" value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" />
            <input placeholder="TSC Number" value={formData.tsc_number} onChange={(e) => setFormData({ ...formData, tsc_number: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" />
            <div className="flex gap-3 md:col-span-3 pt-2">
              <button type="submit" disabled={adding} className="bg-[#2563EB] text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2">{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add Teacher {nextTeacherNumberLabel}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="border px-6 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search teachers by name, email, or number..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-4 text-xs font-black text-blue-700 uppercase">#</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Teacher</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Employee #</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Specialization</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-500">Loading...</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-500">No teachers found</td></tr> :
                filtered.map((teacher: any) => (
                  <tr key={teacher.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-4 text-center"><span className="text-blue-700 font-black text-xl">{teacher.teacher_number ? String(teacher.teacher_number).padStart(2, '0') : '—'}</span></td>
                    <td className="px-6 py-4"><div className="text-sm font-medium">{teacher.first_name} {teacher.last_name}</div><div className="text-xs text-gray-500">{teacher.email}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.employee_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.specialization || '-'}</td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${teacher.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{teacher.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
