import { useState, useEffect } from 'react';
import { supabaseUntyped } from "@/lib/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, Upload, Loader2, BarChart3 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

export default function SubjectTeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .select('*, subjects(*), classes(*)')
        .eq('teacher_id', user?.id);

      if (error) throw error;
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Subject Teacher Dashboard</h1>
        <p className="text-sm text-[#666666]">Your assigned subjects and classes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center rounded-2xl border border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No subjects assigned yet.</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase">
                  {assignment.classes?.curriculum}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{assignment.subjects?.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{assignment.classes?.name}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">All Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Analytics</span>
                </div>
              </div>

              <Link 
                to="/teacher/results/upload" 
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Marks
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
