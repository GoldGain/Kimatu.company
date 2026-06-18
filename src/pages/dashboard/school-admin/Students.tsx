import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase/client";
import { supabaseUntyped } from "@/lib/supabase/client";
import { createScopedUser } from '@/lib/supabase/createUser';
import { useAuth } from '@/contexts/AuthContext';
import { useStudents } from '@/hooks/useSupabaseData';
import { Search, Plus, Loader2, Filter, Camera, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { GenderType } from '@/types/database';
import PromoteStudentModal from '@/components/PromoteStudentModal';
import PhotoUpload from '@/components/PhotoUpload';

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

  // Edit state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    class_id: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    gender: '' as GenderType,
    date_of_birth: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const ensureParentAccount = async (parentEmail: string, parentName: string): Promise<string> => {
    const normalizedEmail = parentEmail.trim().toLowerCase();
    const { data: existingProfile } = await supabaseUntyped
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingProfile?.id) return existingProfile.id as string;
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
      let parentId: string | null = null;
      if (formData.parent_email && formData.parent_email.trim()) {
        try {
          parentId = await ensureParentAccount(formData.parent_email, formData.parent_name);
        } catch (parentError: any) {
          console.warn('Parent account creation warning:', parentError.message);
          toast.warning(`Student created but parent account issue: ${parentError.message}`);
        }
      }
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
      if (parentId && studentId) {
        const { error: linkError } = await supabaseUntyped
          .from('parent_student_links')
          .upsert({ parent_id: parentId, student_id: studentId }, { onConflict: 'parent_id,student_id' });
        if (linkError) console.warn('parent_student_links upsert warning:', linkError.message);
      }
      const parentMsg = parentId ? ` | Parent: ${formData.parent_email} (Password: Parent@2025)` : '';
      toast.success(`✅ Student added! Login: ${studentEmail} | Password: ${studentPassword}${parentMsg}`);
      setShowAdd(false);
      setFormData({ admission_number: '', student_email: '', first_name: '', last_name: '', class_id: '', curriculum: 'CBE' as 'CBE' | '844', gender: '' as GenderType, date_of_birth: '', parent_name: '', parent_phone: '', parent_email: '' });
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (s: any) => {
    setEditingStudent(s);
    setEditForm({
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      class_id: s.class_id || '',
      parent_name: s.parent_name || '',
      parent_phone: s.parent_phone || '',
      parent_email: s.parent_email || '',
      gender: (s.gender || '') as GenderType,
      date_of_birth: s.date_of_birth || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaving(true);
    try {
      const { error } = await supabaseUntyped.from('students').update({
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        class_id: editForm.class_id || null,
        parent_name: editForm.parent_name.trim() || null,
        parent_phone: editForm.parent_phone.trim() || null,
        parent_email: editForm.parent_email.trim() || null,
        gender: editForm.gender || null,
        date_of_birth: editForm.date_of_birth || null,
      }).eq('id', editingStudent.id);
      if (error) throw new Error(error.message);
      toast.success('Student updated successfully!');
      setEditingStudent(null);
      refetch();
    } catch (err: any) {
      toast.error('Failed to update student: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      const { error } = await supabaseUntyped.from('students').delete().eq('id', deletingStudent.id);
      if (error) throw new Error(error.message);
      toast.success(`Student "${deletingStudent.first_name} ${deletingStudent.last_name}" deleted.`);
      setDeletingStudent(null);
      refetch();
    } catch (err: any) {
      toast.error('Failed to delete student: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const [promotingStudent, setPromotingStudent] = useState<any | null>(null);
  const [photoStudent, setPhotoStudent] = useState<any | null>(null);

  const handlePhotoSuccess = async (url: string, studentId: string) => {
    await supabaseUntyped.from('students').update({ photo_url: url }).eq('id', studentId);
    toast.success('Student photo updated!');
    setPhotoStudent(null);
    refetch();
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
            <input placeholder="Parent Email (auto-creates parent account)" value={formData.parent_email} onChange={e => setFormData({...formData, parent_email: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" type="email" />
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Photo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Admission</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Parent</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-500">Loading...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-500">No students found</td></tr>
              ) : (
                filteredStudents.map((s: any) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {s.photo_url ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{(s.first_name?.[0] || '?').toUpperCase()}</span>}
                      </div>
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setPhotoStudent(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                          <Camera className="w-3 h-3" /> Photo
                        </button>
                        <button onClick={() => setPromotingStudent(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                          Promote
                        </button>
                        <button onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => setDeletingStudent(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promote Student Modal */}
      {promotingStudent && (
        <PromoteStudentModal
          student={promotingStudent}
          classes={classes}
          onClose={() => setPromotingStudent(null)}
          onSuccess={() => { refetch(); setPromotingStudent(null); }}
        />
      )}

      {/* Student Photo Modal */}
      {photoStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-lg font-semibold mb-1">Student Photo</h2>
            <p className="text-sm text-gray-500 mb-4">{photoStudent.first_name} {photoStudent.last_name} — {photoStudent.admission_number}</p>
            <div className="flex flex-col items-center py-4">
              <PhotoUpload
                currentPhotoUrl={photoStudent.photo_url}
                bucket="student-photos"
                folder="students"
                entityId={photoStudent.id}
                onSuccess={(url) => handlePhotoSuccess(url, photoStudent.id)}
                label="Student Photo"
                size="lg"
              />
            </div>
            <button onClick={() => setPhotoStudent(null)} className="w-full mt-3 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Student</h2>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Admission: <strong>{editingStudent.admission_number}</strong></p>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">First Name *</label>
                <input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Name *</label>
                <input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Class</label>
                <select value={editForm.class_id} onChange={e => setEditForm({...editForm, class_id: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white">
                  <option value="">No Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name} {cls.stream}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gender</label>
                <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value as GenderType})} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date of Birth</label>
                <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Name</label>
                <input value={editForm.parent_name} onChange={e => setEditForm({...editForm, parent_name: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Phone</label>
                <input value={editForm.parent_phone} onChange={e => setEditForm({...editForm, parent_phone: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Email</label>
                <input type="email" value={editForm.parent_email} onChange={e => setEditForm({...editForm, parent_email: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-6 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Delete Student</h2>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deletingStudent.first_name} {deletingStudent.last_name}</strong> ({deletingStudent.admission_number})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingStudent(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
