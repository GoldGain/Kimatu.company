import { useState, useEffect } from 'react';
import { supabaseUntyped } from "@/lib/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Download, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassTeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedClass, setAssignedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchTeacherData();
    }
  }, [user]);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      // Get teacher's assigned class
      const { data: teacherData, error: teacherError } = await supabaseUntyped
        .from('teachers')
        .select('*, classes(*)')
        .eq('profile_id', user?.id)
        .single();

      if (teacherError) throw teacherError;
      
      if (teacherData?.classes) {
        setAssignedClass(teacherData.classes);
        
        // Fetch students in this class
        const { data: studentsData } = await supabaseUntyped
          .from('students')
          .select('*')
          .eq('class_id', teacherData.classes.id)
          .eq('is_active', true)
          .order('first_name');
        setStudents(studentsData || []);

        // Fetch subjects for this class
        const { data: assignments } = await supabaseUntyped
          .from('teacher_subject_assignments')
          .select('*, subjects(*)')
          .eq('class_id', teacherData.classes.id);
        
        const uniqueSubjects = Array.from(new Set(assignments?.map(a => a.subjects?.name))).map(name => {
          return assignments?.find(a => a.subjects?.name === name)?.subjects;
        }).filter(Boolean);
        
        setSubjects(uniqueSubjects);
      }
    } catch (err: any) {
      console.error('Error fetching teacher data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (!assignedClass) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Class Assigned</h2>
        <p className="text-gray-600 mt-2">You haven't been assigned as a Class Teacher yet. Please contact your School Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Class Teacher Dashboard</h1>
          <p className="text-sm text-[#666666]">Managing {assignedClass.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Students</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{students.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Subjects</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Reports Generated</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Student List</h3>
          <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Adm No</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Gender</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="py-3 px-6">{student.admission_number}</td>
                  <td className="py-3 px-6 font-medium">{student.first_name} {student.last_name}</td>
                  <td className="py-3 px-6 capitalize">{student.gender}</td>
                  <td className="py-3 px-6">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
