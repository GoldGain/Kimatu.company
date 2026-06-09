import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import { BookOpen, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  level: string;
}

interface Assignment {
  id?: string;
  class_id: string;
  subject_id: string;
  lessons_per_week: number;
  is_priority: boolean;
  class_name?: string;
  subject_name?: string;
}

export default function TeacherMySubjects() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Assignment>({
    class_id: '',
    subject_id: '',
    lessons_per_week: 5,
    is_priority: false,
  });

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    try {
      // Get teacher's school
      const { data: profile } = await supabaseUntyped
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) {
        toast.error('No school assigned to your account');
        return;
      }

      setSchoolId(profile.school_id);

      // Fetch subjects
      const { data: subjectsData } = await supabaseUntyped
        .from('subjects')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('name');

      setSubjects(subjectsData || []);

      // Fetch classes
      const { data: classesData } = await supabaseUntyped
        .from('classes')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('name');

      setClasses(classesData || []);

      // Fetch teacher's assignments
      const { data: assignmentsData } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .select(`
          *,
          classes(name),
          subjects(name)
        `)
        .eq('teacher_id', user?.id);

      const enrichedAssignments = (assignmentsData || []).map((a: any) => ({
        ...a,
        class_name: a.classes?.name,
        subject_name: a.subjects?.name,
      }));

      setAssignments(enrichedAssignments);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subject assignments');
    }
    setLoading(false);
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.class_id || !newAssignment.subject_id) {
      toast.error('Please select both class and subject');
      return;
    }

    // Check if assignment already exists
    const exists = assignments.some(
      a => a.class_id === newAssignment.class_id && a.subject_id === newAssignment.subject_id
    );

    if (exists) {
      toast.error('This assignment already exists');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .insert({
          teacher_id: user?.id,
          class_id: newAssignment.class_id,
          subject_id: newAssignment.subject_id,
          lessons_per_week: newAssignment.lessons_per_week,
          is_priority: newAssignment.is_priority,
        });

      if (error) throw error;

      toast.success('Assignment added');
      setNewAssignment({
        class_id: '',
        subject_id: '',
        lessons_per_week: 5,
        is_priority: false,
      });
      fetchData();
    } catch (err) {
      toast.error('Failed to add assignment');
    }
    setSaving(false);
  };

  const handleUpdateAssignment = async (id: string, lessons: number, priority: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .update({
          lessons_per_week: lessons,
          is_priority: priority,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Assignment updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update assignment');
    }
    setSaving(false);
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabaseUntyped
        .from('teacher_subject_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Assignment deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete assignment');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">My Subject Assignments</h1>
        <p className="text-sm text-[#666666]">Manage which classes and subjects you teach</p>
      </div>

      {/* Add Assignment Form */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Assignment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Class</label>
            <select
              value={newAssignment.class_id}
              onChange={(e) => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Subject</label>
            <select
              value={newAssignment.subject_id}
              onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">Select a subject</option>
              {subjects.map(subj => (
                <option key={subj.id} value={subj.id}>{subj.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Lessons Per Week</label>
            <input
              type="number"
              value={newAssignment.lessons_per_week}
              onChange={(e) => setNewAssignment({ ...newAssignment, lessons_per_week: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              min="1"
              max="10"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAssignment.is_priority}
                onChange={(e) => setNewAssignment({ ...newAssignment, is_priority: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-[#111111]">Priority Subject (Morning Slots)</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleAddAssignment}
          disabled={saving}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Adding...' : 'Add Assignment'}
        </button>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Your Assignments ({assignments.length})
        </h2>

        {assignments.length === 0 ? (
          <p className="text-[#666666] text-center py-8">No assignments yet. Add one to get started.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-[#111111]">{assignment.class_name} - {assignment.subject_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#666666]">
                    <span>{assignment.lessons_per_week} lessons/week</span>
                    {assignment.is_priority && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Priority (Morning)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={assignment.lessons_per_week}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value);
                      if (assignment.id) handleUpdateAssignment(assignment.id, newVal, assignment.is_priority);
                    }}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm"
                    min="1"
                    max="10"
                  />
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignment.is_priority}
                      onChange={(e) => {
                        if (assignment.id) handleUpdateAssignment(assignment.id, assignment.lessons_per_week, e.target.checked);
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </label>
                  <button
                    onClick={() => assignment.id && handleDeleteAssignment(assignment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Priority Subjects</p>
          <p>Mark Math and English as priority to ensure they appear in morning time slots when the timetable is generated.</p>
        </div>
      </div>
    </div>
  );
}
