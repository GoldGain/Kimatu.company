# EduHub Bug Fixes

## Fixes Applied (May 2026)

### 1. Supabase RLS Policy Fix (students table)
- Removed conflicting INSERT policies (`school_admin_insert_students` and `students_insert`)
- Created a single clean INSERT policy that checks `profiles.school_id = students.school_id`
- Added `super_admin_insert_students` policy for super admins

### 2. Fixed `auto_calculate_grades` Trigger
- Fixed field name mismatch: `v_cbc.sublevel` → `v_cbc.sub_level`
- Added `percentage` field population for both CBC and 844 curricula

### 3. Fixed Results SELECT Policy
- Updated `results_select` policy to allow students to see their own results
- Added condition: `EXISTS (SELECT 1 FROM students WHERE students.id = results.student_id AND students.profile_id = auth.uid())`

### 4. Students.tsx
- Code was already correct (no manual profiles insert)
- The `handle_new_user` trigger auto-creates profiles on signup
