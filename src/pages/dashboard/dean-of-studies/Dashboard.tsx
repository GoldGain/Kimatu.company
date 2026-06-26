import { useState, useEffect } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, TrendingUp, CheckCircle2,
  XCircle, AlertCircle, Plus, Loader2, RefreshCw, School,
  BarChart3, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassProgress {
  id: string;
  name: string;
  level: string;
  totalStudents: number;
  totalLearningAreas: number;
  enteredCount: number;
  missingCount: number;
  percentage: number;
  learningAreas: LearningAreaStatus[];
}

interface LearningAreaStatus {
  id: string;
  name: string;
  teacherName: string;
  teacherId: string;
  entered: boolean;
  marksCount: number;
}

interface Assessment {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function DeanOfStudiesDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassProgress[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: '',
    type: 'Exam',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (user?.schoolId) {
      fetchTerms();
      fetchAssessments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTerm && user?.schoolId) {
      fetchAllClassProgress();
    }
  }, [selectedTerm]);

  const fetchTerms = async () => {
    const { data } = await supabaseUntyped
      .from('terms')
      .select('*')
      .eq('school_id', user?.schoolId)
      .order('academic_year', { ascending: false });
    setTerms(data || []);
    if (data && data.length > 0) setSelectedTerm(data[0].id);
  };

  const fetchAssessments = async () => {
    const { data } = await supabaseUntyped
      .from('school_exams')
      .select('*')
      .eq('school_id', user?.schoolId)
      .order('created_at', { ascending: false })
      .limit(20);
    setAssessments(data || []);
  };

  const fetchAllClassProgress = async () => {
    setLoading(true);
    try {
      // Fetch all classes for this school
      const { data: classesData } = await supabaseUntyped
        .from('classes')
        .select('id, name, level')
        .eq('school_id', user?.schoolId)
        .order('name');

      if (!classesData) { setLoading(false); return; }

      const progressList: ClassProgress[] = [];

      for (const cls of classesData) {
        // Get students count
        const { count: studentCount } = await supabaseUntyped
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('is_active', true);

        // Get learning area assignments for this class
        const { data: assignments } = await supabaseUntyped
          .from('teacher_subject_assignments')
          .select('subject_id, teacher_id, subjects(id, name), profiles(id, first_name, last_name)')
          .eq('class_id', cls.id)
          .eq('is_active', true);

        const uniqueAreas = new Map<string, any>();
        (assignments || []).forEach((a: any) => {
          if (a.subjects && !uniqueAreas.has(a.subjects.id)) {
            uniqueAreas.set(a.subjects.id, {
              id: a.subjects.id,
              name: a.subjects.name,
              teacherName: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Unassigned',
              teacherId: a.teacher_id,
            });
          }
        });

        const learningAreaStatuses: LearningAreaStatus[] = [];
        for (const [, area] of uniqueAreas) {
          // Check if results exist for this class + subject + term
          const { count: marksCount } = await supabaseUntyped
            .from('results')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('subject_id', area.id)
            .eq('term_id', selectedTerm);

          learningAreaStatuses.push({
            ...area,
            entered: (marksCount || 0) > 0,
            marksCount: marksCount || 0,
          });
        }

        const enteredCount = learningAreaStatuses.filter(a => a.entered).length;
        const total = learningAreaStatuses.length;

        progressList.push({
          id: cls.id,
          name: cls.name,
          level: cls.level || '',
          totalStudents: studentCount || 0,
          totalLearningAreas: total,
          enteredCount,
          missingCount: total - enteredCount,
          percentage: total > 0 ? Math.round((enteredCount / total) * 100) : 0,
          learningAreas: learningAreaStatuses,
        });
      }

      setClasses(progressList);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load class progress');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.name.trim()) {
      toast.error('Assessment name is required');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabaseUntyped.from('school_exams').insert({
        school_id: user?.schoolId,
        name: newAssessment.name.trim(),
        exam_type: newAssessment.type,
        start_date: newAssessment.start_date || null,
        end_date: newAssessment.end_date || null,
        created_by: user?.id,
        status: 'active',
      });
      if (error) throw error;
      toast.success(`Assessment "${newAssessment.name}" created!`);
      setNewAssessment({ name: '', type: 'Exam', start_date: '', end_date: '' });
      setShowCreateAssessment(false);
      fetchAssessments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  const totalClasses = classes.length;
  const totalStudents = classes.reduce((s, c) => s + c.totalStudents, 0);
  const avgProgress = totalClasses > 0
    ? Math.round(classes.reduce((s, c) => s + c.percentage, 0) / totalClasses)
    : 0;
  const classesComplete = classes.filter(c => c.percentage === 100).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#1A365D]" />
            Dean of Studies Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor marks entry progress across all classes</p>
        </div>
        <div className="flex items-center gap-2">
          {terms.length > 0 && (
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
              ))}
            </select>
          )}
          <button
            onClick={fetchAllClassProgress}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Classes', value: totalClasses, icon: School, color: 'blue' },
          { label: 'Total Learners', value: totalStudents, icon: Users, color: 'green' },
          { label: 'Avg. Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'yellow' },
          { label: 'Classes Complete', value: classesComplete, icon: CheckCircle2, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              stat.color === 'blue' ? 'bg-blue-50' :
              stat.color === 'green' ? 'bg-green-50' :
              stat.color === 'yellow' ? 'bg-yellow-50' : 'bg-emerald-50'
            }`}>
              <stat.icon className={`w-5 h-5 ${
                stat.color === 'blue' ? 'text-blue-600' :
                stat.color === 'green' ? 'text-green-600' :
                stat.color === 'yellow' ? 'text-yellow-600' : 'text-emerald-600'
              }`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* All Classes Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1A365D]" />
              Marks Entry Progress — All Classes
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Click a class to see learning area details</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No classes found. Please set up classes first.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classes.map(cls => (
              <div key={cls.id}>
                {/* Class Row */}
                <button
                  onClick={() => setExpandedClass(expandedClass === cls.id ? null : cls.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{cls.name}</span>
                      {cls.level && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{cls.level}</span>
                      )}
                      <span className="text-xs text-gray-400">{cls.totalStudents} learners</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            cls.percentage === 100 ? 'bg-green-500' :
                            cls.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${cls.percentage}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold min-w-[3rem] text-right ${
                        cls.percentage === 100 ? 'text-green-600' :
                        cls.percentage >= 60 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {cls.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />{cls.enteredCount}
                    </span>
                    <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />{cls.missingCount}
                    </span>
                    {expandedClass === cls.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Learning Areas */}
                {expandedClass === cls.id && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
                      {cls.learningAreas.length === 0 ? (
                        <p className="text-sm text-gray-400 col-span-full py-2">No learning areas assigned to this class.</p>
                      ) : cls.learningAreas.map(area => (
                        <div
                          key={area.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            area.entered
                              ? 'bg-green-50 border-green-100'
                              : 'bg-red-50 border-red-100'
                          }`}
                        >
                          {area.entered
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{area.name}</p>
                            <p className="text-xs text-gray-500 truncate">{area.teacherName}</p>
                          </div>
                          {area.entered && (
                            <span className="ml-auto text-xs text-green-600 font-medium shrink-0">{area.marksCount} marks</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessments Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1A365D]" />
            Assessments
          </h2>
          <button
            onClick={() => setShowCreateAssessment(!showCreateAssessment)}
            className="flex items-center gap-2 bg-[#1A365D] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#2D4A7C] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Assessment
          </button>
        </div>

        {/* Create Assessment Form */}
        {showCreateAssessment && (
          <div className="p-5 border-b border-gray-100 bg-blue-50">
            <h3 className="font-semibold text-gray-800 mb-3">New Assessment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assessment Name *</label>
                <input
                  type="text"
                  value={newAssessment.name}
                  onChange={e => setNewAssessment(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Form 4 Trial Exam, CAT 1, Mock Exams..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={newAssessment.type}
                  onChange={e => setNewAssessment(p => ({ ...p, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                >
                  {['Exam', 'CAT', 'Mock', 'Pre-Mock', 'Assignment', 'Revision Test', 'Custom'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newAssessment.start_date}
                  onChange={e => setNewAssessment(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={newAssessment.end_date}
                  onChange={e => setNewAssessment(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateAssessment}
                disabled={creating}
                className="flex items-center gap-2 bg-[#1A365D] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#2D4A7C] transition-colors disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreateAssessment(false)}
                className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Assessments List */}
        <div className="divide-y divide-gray-50">
          {assessments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No assessments yet. Create one above.</p>
            </div>
          ) : assessments.map(a => (
            <div key={a.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{a.name}</p>
                <p className="text-xs text-gray-400">
                  {a.exam_type || a.type}
                  {a.start_date && ` · ${new Date(a.start_date).toLocaleDateString('en-KE')}`}
                  {a.end_date && ` – ${new Date(a.end_date).toLocaleDateString('en-KE')}`}
                </p>
              </div>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full shrink-0">Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
