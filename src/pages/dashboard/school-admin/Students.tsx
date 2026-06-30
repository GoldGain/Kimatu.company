import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase/client";
import { supabaseUntyped } from "@/lib/supabase/client";
import { createScopedUser } from '@/lib/supabase/createUser';
import { useAuth } from '@/contexts/AuthContext';
import { useStudents } from '@/hooks/useSupabaseData';
import { Search, Plus, Loader2, Filter, Camera, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { GenderType } from '@/types/database';
import PromoteStudentModal from '@/components/PromoteStudentModal';
import PhotoUpload from '@/components/PhotoUpload';
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms';

// Kenya counties list
const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu',
  'Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru',
  'Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua',
  'Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

export default function SchoolAdminStudents() {
  const { user } = useAuth();
  const { students, loading, refetch } = useStudents(user?.schoolId || undefined);
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const emptyForm = {
    // Mandatory fields
    admission_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '' as GenderType,
    date_of_birth: '',
    birth_cert_number: '',
    class_id: '',
    stream: '',
    curriculum: 'CBE' as 'CBE' | '844',
    boarding_status: 'Day',
    parent_name: '',
    parent_phone: '',
    relationship_to_learner: '',
    home_county: '',
    home_sub_county: '',
    nationality: 'Kenyan',
    learner_status: 'Active',
    // Optional fields
    student_email: '',
    parent_email: '',
    religion: '',
    previous_school: '',
    medical_info: '',
    allergies: '',
    blood_group: '',
    disability_details: '',
    transport_route: '',
    club_memberships: '',
    parent_id_number: '',
    additional_emergency_contact: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  // Edit state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '', middle_name: '', last_name: '',
    class_id: '', stream: '',
    parent_name: '', parent_phone: '', parent_email: '',
    gender: '' as GenderType, date_of_birth: '',
    boarding_status: 'Day', relationship_to_learner: '',
    home_county: '', home_sub_county: '', nationality: 'Kenyan',
    learner_status: 'Active', birth_cert_number: '',
    religion: '', previous_school: '', medical_info: '',
    allergies: '', blood_group: '', disability_details: '',
    transport_route: '', club_memberships: '', parent_id_number: '',
    additional_emergency_contact: '',
  });
  const [saving, setSaving] = useState(false);
  const [editShowOptional, setEditShowOptional] = useState(false);

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
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          class_id: formData.class_id || null,
          student_email: studentEmail,
          parent_id: parentId,
          parent_name: formData.parent_name,
          parent_phone: formData.parent_phone,
          parent_email: formData.parent_email || null,
          curriculum: formData.curriculum,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          birth_cert_number: formData.birth_cert_number || null,
          stream: formData.stream || null,
          boarding_status: formData.boarding_status,
          relationship_to_learner: formData.relationship_to_learner || null,
          home_county: formData.home_county || null,
          home_sub_county: formData.home_sub_county || null,
          nationality: formData.nationality || 'Kenyan',
          learner_status: formData.learner_status || 'Active',
          email: formData.student_email || null,
          religion: formData.religion || null,
          previous_school: formData.previous_school || null,
          medical_info: formData.medical_info || null,
          allergies: formData.allergies || null,
          blood_group: formData.blood_group || null,
          disability_details: formData.disability_details || null,
          transport_route: formData.transport_route || null,
          club_memberships: formData.club_memberships || null,
          parent_id_number: formData.parent_id_number || null,
          additional_emergency_contact: formData.additional_emergency_contact || null,
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

      // Send welcome SMS to parent if phone is available
      if (formData.parent_phone) {
        try {
          // SMS 1: Parent welcome with login details
          await sendSMS(
            formData.parent_phone,
            SMS_TEMPLATES.welcomeParent(formData.parent_email || formData.parent_phone),
            user?.schoolId
          );
          // SMS 2: Student login credentials sent to parent
          await sendSMS(
            formData.parent_phone,
            SMS_TEMPLATES.welcomeStudent(studentEmail, formData.admission_number),
            user?.schoolId
          );
        } catch (smsErr) {
          console.warn('Welcome SMS failed:', smsErr);
        }
      }

      toast.success(`✅ Student added! Login: ${studentEmail} | Password: ${studentPassword}`);
      setShowAdd(false);
      setFormData(emptyForm);
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
      middle_name: s.middle_name || '',
      last_name: s.last_name || '',
      class_id: s.class_id || '',
      stream: s.stream || '',
      parent_name: s.parent_name || '',
      parent_phone: s.parent_phone || '',
      parent_email: s.parent_email || '',
      gender: (s.gender || '') as GenderType,
      date_of_birth: s.date_of_birth || '',
      boarding_status: s.boarding_status || 'Day',
      relationship_to_learner: s.relationship_to_learner || '',
      home_county: s.home_county || '',
      home_sub_county: s.home_sub_county || '',
      nationality: s.nationality || 'Kenyan',
      learner_status: s.learner_status || 'Active',
      birth_cert_number: s.birth_cert_number || '',
      religion: s.religion || '',
      previous_school: s.previous_school || '',
      medical_info: s.medical_info || '',
      allergies: s.allergies || '',
      blood_group: s.blood_group || '',
      disability_details: s.disability_details || '',
      transport_route: s.transport_route || '',
      club_memberships: s.club_memberships || '',
      parent_id_number: s.parent_id_number || '',
      additional_emergency_contact: s.additional_emergency_contact || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaving(true);
    try {
      const { error } = await supabaseUntyped.from('students').update({
        first_name: editForm.first_name.trim(),
        middle_name: editForm.middle_name.trim() || null,
        last_name: editForm.last_name.trim(),
        class_id: editForm.class_id || null,
        stream: editForm.stream || null,
        parent_name: editForm.parent_name.trim() || null,
        parent_phone: editForm.parent_phone.trim() || null,
        parent_email: editForm.parent_email.trim() || null,
        gender: editForm.gender || null,
        date_of_birth: editForm.date_of_birth || null,
        boarding_status: editForm.boarding_status || null,
        relationship_to_learner: editForm.relationship_to_learner || null,
        home_county: editForm.home_county || null,
        home_sub_county: editForm.home_sub_county || null,
        nationality: editForm.nationality || 'Kenyan',
        learner_status: editForm.learner_status || 'Active',
        birth_cert_number: editForm.birth_cert_number || null,
        religion: editForm.religion || null,
        previous_school: editForm.previous_school || null,
        medical_info: editForm.medical_info || null,
        allergies: editForm.allergies || null,
        blood_group: editForm.blood_group || null,
        disability_details: editForm.disability_details || null,
        transport_route: editForm.transport_route || null,
        club_memberships: editForm.club_memberships || null,
        parent_id_number: editForm.parent_id_number || null,
        additional_emergency_contact: editForm.additional_emergency_contact || null,
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

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]';
  const selectCls = inputCls + ' bg-white';
  const labelCls = 'block text-xs text-gray-500 mb-1';

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

      {/* Add Student Form */}
      {showAdd && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-1">Add New Student</h3>
          <p className="text-xs text-blue-600 mb-1">Student password: <strong>[Admission Number]@2025</strong></p>
          <p className="text-xs text-green-600 mb-4">Parent account auto-created with password: <strong>Parent@2025</strong></p>

          <form onSubmit={handleAdd} className="space-y-4">
            {/* Mandatory Fields */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Required Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className={labelCls}>Admission Number *</label><input placeholder="e.g. 2025001" value={formData.admission_number} onChange={e => setFormData({...formData, admission_number: e.target.value})} className={inputCls} required /></div>
                <div><label className={labelCls}>First Name *</label><input placeholder="First Name" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className={inputCls} required /></div>
                <div><label className={labelCls}>Middle Name (optional)</label><input placeholder="Middle Name" value={formData.middle_name} onChange={e => setFormData({...formData, middle_name: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Last Name *</label><input placeholder="Last Name" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className={inputCls} required /></div>
                <div>
                  <label className={labelCls}>Gender *</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as GenderType})} className={selectCls} required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div><label className={labelCls}>Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Class *</label>
                  <select value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} className={selectCls} required>
                    <option value="">Select Class</option>
                    {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name} {cls.stream}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Curriculum *</label>
                  <select value={formData.curriculum} onChange={e => setFormData({...formData, curriculum: e.target.value as 'CBE' | '844'})} className={selectCls} required>
                    <option value="CBE">CBE (Competency Based)</option>
                    <option value="844">8-4-4 (Traditional)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Boarding Status *</label>
                  <select value={formData.boarding_status} onChange={e => setFormData({...formData, boarding_status: e.target.value})} className={selectCls} required>
                    <option value="Day">Day</option>
                    <option value="Boarding">Boarding</option>
                    <option value="Weekly Boarding">Weekly Boarding</option>
                  </select>
                </div>
                <div><label className={labelCls}>Parent/Guardian Name *</label><input placeholder="Parent/Guardian Name" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} className={inputCls} required /></div>
                <div><label className={labelCls}>Parent/Guardian Phone *</label><input placeholder="+254..." value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} className={inputCls} required /></div>
                <div>
                  <label className={labelCls}>Relationship to Learner *</label>
                  <select value={formData.relationship_to_learner} onChange={e => setFormData({...formData, relationship_to_learner: e.target.value})} className={selectCls} required>
                    <option value="">Select Relationship</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Home County *</label>
                  <select value={formData.home_county} onChange={e => setFormData({...formData, home_county: e.target.value})} className={selectCls} required>
                    <option value="">Select County</option>
                    {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Home Sub-County *</label><input placeholder="Sub-County" value={formData.home_sub_county} onChange={e => setFormData({...formData, home_sub_county: e.target.value})} className={inputCls} required /></div>
                <div>
                  <label className={labelCls}>Nationality *</label>
                  <input placeholder="Nationality" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Learner Status *</label>
                  <select value={formData.learner_status} onChange={e => setFormData({...formData, learner_status: e.target.value})} className={selectCls} required>
                    <option value="Active">Active</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Fields Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showOptional ? 'Hide' : 'Show'} Optional Fields
              </button>

              {showOptional && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Optional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Student Email</label><input type="email" placeholder="student@email.com" value={formData.student_email} onChange={e => setFormData({...formData, student_email: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Parent Email (auto-creates parent account)</label><input type="email" placeholder="parent@email.com" value={formData.parent_email} onChange={e => setFormData({...formData, parent_email: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Birth Certificate Number</label><input placeholder="Birth Cert No." value={formData.birth_cert_number} onChange={e => setFormData({...formData, birth_cert_number: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Stream</label><input placeholder="Stream (e.g. East, West)" value={formData.stream} onChange={e => setFormData({...formData, stream: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Religion</label><input placeholder="Religion" value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Previous School</label><input placeholder="Previous School" value={formData.previous_school} onChange={e => setFormData({...formData, previous_school: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Medical Information</label><input placeholder="Medical Info" value={formData.medical_info} onChange={e => setFormData({...formData, medical_info: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Allergies</label><input placeholder="Allergies" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Blood Group</label>
                      <select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})} className={selectCls}>
                        <option value="">Select Blood Group</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Disability Details</label><input placeholder="Disability Details (if any)" value={formData.disability_details} onChange={e => setFormData({...formData, disability_details: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Transport Route</label><input placeholder="Transport Route" value={formData.transport_route} onChange={e => setFormData({...formData, transport_route: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Club Memberships</label><input placeholder="Clubs (comma separated)" value={formData.club_memberships} onChange={e => setFormData({...formData, club_memberships: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Parent ID Number</label><input placeholder="Parent/Guardian ID No." value={formData.parent_id_number} onChange={e => setFormData({...formData, parent_id_number: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Additional Emergency Contact</label><input placeholder="Emergency Contact Phone" value={formData.additional_emergency_contact} onChange={e => setFormData({...formData, additional_emergency_contact: e.target.value})} className={inputCls} /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={adding} className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Student
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Photo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Admission</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Parent</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-500">Loading...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-500">No students found</td></tr>
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
                      <div className="text-sm font-medium">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</div>
                      <div className="text-xs text-gray-500">{s.gender || '-'} {s.date_of_birth ? `· ${s.date_of_birth}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{s.classes?.name || '-'}</div>
                      <div className="text-xs text-gray-400">{s.boarding_status || 'Day'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        s.learner_status === 'Active' ? 'bg-green-100 text-green-700' :
                        s.learner_status === 'Transferred' ? 'bg-blue-100 text-blue-700' :
                        s.learner_status === 'Suspended' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{s.learner_status || 'Active'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{s.parent_name || '-'}</div>
                      <div className="text-xs text-gray-500">{s.parent_phone || s.parent_email || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setPhotoStudent(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                          <Camera className="w-3 h-3" /> Photo
                        </button>
                        <button onClick={() => setPromotingStudent(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                          Promote
                        </button>
                        <button onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => setDeletingStudent(s)} className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-lg my-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Student</h2>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Admission: <strong>{editingStudent.admission_number}</strong></p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>First Name *</label><input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className={inputCls} required /></div>
                <div><label className={labelCls}>Middle Name</label><input value={editForm.middle_name} onChange={e => setEditForm({...editForm, middle_name: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Last Name *</label><input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className={inputCls} required /></div>
                <div>
                  <label className={labelCls}>Class</label>
                  <select value={editForm.class_id} onChange={e => setEditForm({...editForm, class_id: e.target.value})} className={selectCls}>
                    <option value="">No Class</option>
                    {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name} {cls.stream}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value as GenderType})} className={selectCls}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div><label className={labelCls}>Date of Birth</label><input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Boarding Status</label>
                  <select value={editForm.boarding_status} onChange={e => setEditForm({...editForm, boarding_status: e.target.value})} className={selectCls}>
                    <option value="Day">Day</option>
                    <option value="Boarding">Boarding</option>
                    <option value="Weekly Boarding">Weekly Boarding</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Learner Status</label>
                  <select value={editForm.learner_status} onChange={e => setEditForm({...editForm, learner_status: e.target.value})} className={selectCls}>
                    <option value="Active">Active</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div><label className={labelCls}>Parent Name</label><input value={editForm.parent_name} onChange={e => setEditForm({...editForm, parent_name: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Parent Phone</label><input value={editForm.parent_phone} onChange={e => setEditForm({...editForm, parent_phone: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Parent Email</label><input type="email" value={editForm.parent_email} onChange={e => setEditForm({...editForm, parent_email: e.target.value})} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Relationship to Learner</label>
                  <select value={editForm.relationship_to_learner} onChange={e => setEditForm({...editForm, relationship_to_learner: e.target.value})} className={selectCls}>
                    <option value="">Select</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Home County</label>
                  <select value={editForm.home_county} onChange={e => setEditForm({...editForm, home_county: e.target.value})} className={selectCls}>
                    <option value="">Select County</option>
                    {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Home Sub-County</label><input value={editForm.home_sub_county} onChange={e => setEditForm({...editForm, home_sub_county: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Nationality</label><input value={editForm.nationality} onChange={e => setEditForm({...editForm, nationality: e.target.value})} className={inputCls} /></div>
              </div>

              <button type="button" onClick={() => setEditShowOptional(!editShowOptional)} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                {editShowOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {editShowOptional ? 'Hide' : 'Show'} Optional Fields
              </button>

              {editShowOptional && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Birth Cert Number</label><input value={editForm.birth_cert_number} onChange={e => setEditForm({...editForm, birth_cert_number: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Religion</label><input value={editForm.religion} onChange={e => setEditForm({...editForm, religion: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Previous School</label><input value={editForm.previous_school} onChange={e => setEditForm({...editForm, previous_school: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Medical Info</label><input value={editForm.medical_info} onChange={e => setEditForm({...editForm, medical_info: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Allergies</label><input value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})} className={inputCls} /></div>
                  <div>
                    <label className={labelCls}>Blood Group</label>
                    <select value={editForm.blood_group} onChange={e => setEditForm({...editForm, blood_group: e.target.value})} className={selectCls}>
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Disability Details</label><input value={editForm.disability_details} onChange={e => setEditForm({...editForm, disability_details: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Transport Route</label><input value={editForm.transport_route} onChange={e => setEditForm({...editForm, transport_route: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Club Memberships</label><input value={editForm.club_memberships} onChange={e => setEditForm({...editForm, club_memberships: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Parent ID Number</label><input value={editForm.parent_id_number} onChange={e => setEditForm({...editForm, parent_id_number: e.target.value})} className={inputCls} /></div>
                  <div><label className={labelCls}>Additional Emergency Contact</label><input value={editForm.additional_emergency_contact} onChange={e => setEditForm({...editForm, additional_emergency_contact: e.target.value})} className={inputCls} /></div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
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
