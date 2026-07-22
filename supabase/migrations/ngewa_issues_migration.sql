-- ============================================================
-- NGEWA ISSUES MIGRATION
-- Adds: dean_of_studies_id to schools, exam_id to results
-- school_exams table already exists with correct schema
-- ============================================================

-- 1. Add dean_of_studies_id to schools table
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS dean_of_studies_id UUID REFERENCES public.teachers(id);

-- 2. Add exam_id to results table so results can be linked to a specific exam
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.school_exams(id);

-- 3. Ensure school_exams has RLS enabled and correct policies
ALTER TABLE public.school_exams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "school_exams_select" ON public.school_exams;
DROP POLICY IF EXISTS "school_exams_insert" ON public.school_exams;
DROP POLICY IF EXISTS "school_exams_update" ON public.school_exams;
DROP POLICY IF EXISTS "school_exams_delete" ON public.school_exams;

-- Allow school members to view exams for their school
CREATE POLICY "school_exams_select" ON public.school_exams
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Allow school admin and teachers to create exams
CREATE POLICY "school_exams_insert" ON public.school_exams
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
      AND role IN ('school_admin', 'teacher')
    )
  );

-- Allow school admin and teachers to update exams
CREATE POLICY "school_exams_update" ON public.school_exams
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
      AND role IN ('school_admin', 'teacher')
    )
  );

-- Allow school admin to delete exams
CREATE POLICY "school_exams_delete" ON public.school_exams
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
      AND role = 'school_admin'
    )
  );
