// ─── Account Deletion Utilities ──────────────────────────────────────────────
// Deletes accounts from both the database AND Supabase Authentication

import { supabase, supabaseUntyped } from './supabase/client';

/**
 * Delete a teacher: removes from teachers table AND auth system
 */
export async function deleteTeacherAccount(teacherId: string, profileId?: string | null) {
  // 1. Delete from teachers table first
  const { error: dbError } = await supabaseUntyped
    .from('teachers')
    .delete()
    .eq('id', teacherId);

  if (dbError) throw new Error(`Database delete failed: ${dbError.message}`);

  // 2. Delete related assignments
  await supabaseUntyped
    .from('teacher_subject_assignments')
    .delete()
    .eq('teacher_id', teacherId);

  // 3. Delete from auth if profile_id exists
  if (profileId) {
    try {
      await supabaseUntyped.rpc('delete_auth_user', { user_id: profileId });
    } catch (err) {
      console.warn('Auth deletion via RPC failed:', err);
      // Try alternative: delete profile (triggers auth cleanup if RLS policy allows)
      await supabaseUntyped.from('profiles').delete().eq('id', profileId);
    }
  }

  return { success: true };
}

/**
 * Delete a student: removes from students table AND auth system
 */
export async function deleteStudentAccount(studentId: string, profileId?: string | null) {
  // 1. Delete parent_student_links first (to avoid FK constraint issues)
  await supabaseUntyped
    .from('parent_student_links')
    .delete()
    .eq('student_id', studentId);

  // 2. Delete related results
  await supabaseUntyped
    .from('results')
    .delete()
    .eq('student_id', studentId);

  // 3. Delete from students table
  const { error: dbError } = await supabaseUntyped
    .from('students')
    .delete()
    .eq('id', studentId);

  if (dbError) throw new Error(`Database delete failed: ${dbError.message}`);

  // 4. Delete from auth if profile_id exists
  if (profileId) {
    try {
      await supabaseUntyped.rpc('delete_auth_user', { user_id: profileId });
    } catch (err) {
      console.warn('Auth deletion via RPC failed:', err);
      await supabaseUntyped.from('profiles').delete().eq('id', profileId);
    }
  }

  return { success: true };
}

/**
 * Delete any user account from auth (for admin use)
 */
export async function deleteAuthUser(userId: string) {
  try {
    const { error } = await supabaseUntyped.rpc('delete_auth_user', { user_id: userId });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Auth deletion failed:', err);
    return { success: false, error: err.message };
  }
}
