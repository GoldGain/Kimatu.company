import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase/client";
import { supabaseUntyped } from "@/lib/supabase/client";
import { createScopedUser } from '@/lib/supabase/createUser';
import { useAuth } from '@/contexts/AuthContext';
import { useStudents } from '@/hooks/useSupabaseData';
import { Search, Plus, Loader2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { GenderType } from '@/types/database';

export default function SchoolAdminStudents() {
  const { user } = useAuth();
  const { students, loading, refetch } = useStudents(user?.schoolId || undefined);
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    admission_number: '', 
    student_email: '',
    first_name: '', 
    last_name: '', 
    class_id: '',
    curriculum: 'CBE' as 'CBE' | '844',
    gender: '' as GenderType, 
    date_of_birth: '',
    parent_name: '', 
    parent_phone: '', 
    parent_email: '', 
  });

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.schoolId) return;
      const { data } = await supabase
        .from('classes')
        .select('id, name, stream')
        .eq('school_id', user.schoolId)
        .order('name', { ascending: true });
      setClasses(data || []);
    };
    fetchClasses();
  }, [user?.schoolId]);

  /**
   * Ensures a parent account exists for the given email.
   * - If a profile with that email already exists → return its id.
   * - If not → create a new auth user with role=parent and return the new id.
   * Returns the parent profile id (UUID).
   */
  const ensureParentAccount = async (parentEmail: string, parentName: string): Promise<string> => {
    const normalizedEmail = parentEmail.trim().toLowerCase();

    // 1. Check if a profile already exists with this email
    const { data: existingProfile } = await supabaseUntyped
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      return existingProfile.id as string;
    }

    // 2. Create a new parent account
    const nameParts = (parentName || 'Parent').trim().split(' ');
    const firstName = nameParts[0] || 'Parent';
    const lastName = nameParts.slice(1).join(' ') || '';

    const result = await createScopedUser({
      email: normalizedEmail,
      password: 'Parent@2025',
      first_name: firstName,
      last_name: lastName,
      role: 'parent',
      school_id: user?.schoolId || null,
    });

    return result.user.id;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const studentEmail = formData.student_email || `${formData.admission_number.toLowerCase().replace(/\s+/g, '')}@student.edu`;
      const studentPassword = `${formData.admission_number}@2025`;

      // 1. Create auth user for student without disrupting the school-admin session.
      const authData = await createScopedUser({
        email: studentEmail,
        password: studentPassword,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: 'student',
        school_id: user?.schoolId || null,
        metadata: { admission_number: formData.admission_number },
      });

      const studentUserId = authData.user.id;

      // 2. Handle parent account creation/lookup
      let parentId: string | null = null;
      if (formData.parent_email && formData.parent_email.trim()) {
        try {
          parentId = await ensureParentAccount(formData.parent_email, formData.parent_name);
        } catch (parentError: any) {
          // Log but don't block student creation if parent creation fails
          console.warn('Parent account creation warning:', parentError.message);
          toast.warning(`Student created but parent account issue: ${parentError.message}`);
        }
      }

      // 3. Insert into students table
      const { data: studentData, error: studentError } = await supabaseUntyped
        .from('students')
        .insert({
          profile_id: studentUserId,
          school_id: user?.schoolId,
          admission_number: formData.admission_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          class_id: formData.class_id,
          student_email: studentEmail,
          parent_id: parentId,
          parent_name: formData.parent_name,
          parent_phone: formData.parent_phone,
          parent_email: formData.parent_email,
          curriculum: formData.curriculum,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          is_active: true,
          enrollment_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (studentError) throw new Error('Database error: ' + studentError.message);

      const studentId = (studentData as any)?.id;

      // 4. Create parent_student_links row so parent portal shows the child
      if (parentId && studentId) {
        const { error: linkError } = await supabaseUntyped
          .from('parent_student_links')
          .upsert(
            { parent_id: parentId, student_id: studentId },
            { onConflict: 'parent_id,student_id' }
          );
        if (linkError) {
          console.warn('parent_student_links upsert warning:', linkError.message);
        }
      }

      const parentMsg = parentId
        ? ` | Parent: ${formData.parent_email} (Password: Parent@2025)`
        : '';
      toast.success(`✅ Student added! Login: ${studentEmail} | Password: ${studentPassword}${parentMsg}`);
      setShowAdd(false);
      setFormData({
        admission_number: '', student_email: '', first_name: '', last_name: '', class_id: '',
        curriculum: 'CBE' as 'CBE' | '844', gender: '' as GenderType, date_of_birth: '', parent_name: '', 
        parent_phone: '', parent_email: '',
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  };

  const filteredStudents = students.filter((s: any) => {
    const matchesSearch = 
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClassId ? s.class_id === filterClassId : true;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-gray-500">{filteredStudents.length} total students</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1d4ed8]">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
        </div>
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)} className="w-full pl-11 pr-10 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB] appearance-none">
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name} {cls.stream}</option>
            ))}
          </select>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Add New Student</h3>
          <p className="text-xs text-blue-600 mb-1">Student password: <strong>[Admission Number]@2025</strong></p>
          <p className="text-xs text-green-600 mb-4">Parent account auto-created with password: <strong>Parent@2025</strong></p>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Admission Number *" value={formData.admission_number} onChange={e => setFormData({...formData, admission_number: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" required />
            <input placeholder="Student Email (optional)" value={formData.student_email} onChange={e => setFormData({...formData, student_email: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
            <input placeholder="First Name *" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" required />
            <input placeholder="Last Name *" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" required />
            <select value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white" required>
              <option value="">Select Class *</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name} {cls.stream}</option>
              ))}
            </select>
            <select value={formData.curriculum} onChange={e => setFormData({...formData, curriculum: e.target.value as 'CBE' | '844'})} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white" required>
              <option value="CBE">CBE (Competency Based)</option>
              <option value="844">8-4-4 (Traditional)</option>
            </select>
            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as GenderType})} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white">
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
            <input placeholder="Parent Name" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
            <input placeholder="Parent Phone" value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
            <input 
              placeholder="Parent Email (auto-creates parent account)" 
              value={formData.parent_email} 
              onChange={e => setFormData({...formData, parent_email: e.target.value})} 
              className="w-full px-4 py-2.5 border rounded-xl text-sm" 
              type="email"
            />
            
            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={adding} className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Student
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Admission</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Parent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-sm text-gray-500">Loading...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-sm text-gray-500">No students found</td></tr>
              ) : (
                filteredStudents.map((s: any) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{s.admission_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-gray-500">{s.student_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{s.classes?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{s.parent_name || '-'}</div>
                      <div className="text-xs text-gray-500">{s.parent_email || s.parent_phone || '-'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
