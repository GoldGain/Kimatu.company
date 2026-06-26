/**
 * Kimatu Analytics – Role-Based Permissions Engine
 * Enforces that only assigned teachers can enter marks for their subjects.
 * Security is enforced at both frontend and backend (Supabase RLS) levels.
 */

import { supabase } from '@/lib/supabase/client';

/**
 * Check if a teacher is assigned to a specific subject for a specific class.
 * This is the frontend guard — the real enforcement is in Supabase RLS policies.
 */
export const canTeacherEnterMarks = async (
  teacherId: string,
  subjectId: string,
  classId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('subject_id', subjectId)
    .eq('class_id', classId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Permission check failed:', error.message);
    return false;
  }

  return data !== null;
};

/**
 * Get all subjects a teacher is assigned to (across all classes).
 */
export const getTeacherAssignedSubjects = async (
  teacherId: string,
  schoolId: string
): Promise<{ subjectId: string; classId: string; subjectName: string; className: string }[]> => {
  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .select(`
      subject_id,
      class_id,
      subjects(name),
      classes(name)
    `)
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .eq('is_active', true);

  if (error || !data) return [];

  return data.map((row: any) => ({
    subjectId: row.subject_id,
    classId: row.class_id,
    subjectName: row.subjects?.name || '',
    className: row.classes?.name || '',
  }));
};

/**
 * Check if a user has a specific role.
 */
export const hasRole = (userRole: string | undefined, ...allowedRoles: string[]): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Check if a teacher is the class teacher for a given class.
 */
export const isClassTeacher = async (teacherId: string, classId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('classes')
    .select('class_teacher_id')
    .eq('id', classId)
    .maybeSingle();

  return data?.class_teacher_id === teacherId;
};
