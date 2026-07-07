-- ============================================================
-- Kimatu Analytics: Exam Management & CAT Integration Tables
-- Migration: 20260626_exams_cats
-- ============================================================

-- 1. school_exams table: stores all exam types per school
CREATE TABLE IF NOT EXISTS public.school_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'CAT' CHECK (type IN ('CAT', 'Exam', 'Mock', 'Pre-Mock', 'Revision', 'Custom')),
  start_date DATE,
  end_date DATE,
  weightage NUMERIC(5,2) DEFAULT 40 CHECK (weightage >= 0 AND weightage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_exams_school_id ON public.school_exams(school_id);
CREATE INDEX IF NOT EXISTS idx_school_exams_term_id ON public.school_exams(term_id);

-- Enable RLS
ALTER TABLE public.school_exams ENABLE ROW LEVEL SECURITY;

-- RLS: School admins can manage their school's exams
CREATE POLICY "school_admin_manage_exams" ON public.school_exams
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- RLS: Teachers can view their school's exams
CREATE POLICY "teacher_view_exams" ON public.school_exams
  FOR SELECT USING (
    school_id IN (
      SELECT t.school_id FROM public.teachers t WHERE t.profile_id = auth.uid()
    )
  );

-- 2. cat_exam_results table: stores CAT + Exam marks with combined score
CREATE TABLE IF NOT EXISTS public.cat_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.school_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  cat_marks NUMERIC(6,2) DEFAULT 0 CHECK (cat_marks >= 0 AND cat_marks <= 100),
  exam_marks NUMERIC(6,2) DEFAULT 0 CHECK (exam_marks >= 0 AND exam_marks <= 100),
  combined_marks NUMERIC(6,2) GENERATED ALWAYS AS (
    COALESCE(cat_marks, 0) * COALESCE(cat_weightage, 40) / 100.0 +
    COALESCE(exam_marks, 0) * COALESCE(exam_weightage, 60) / 100.0
  ) STORED,
  cat_weightage NUMERIC(5,2) DEFAULT 40,
  exam_weightage NUMERIC(5,2) DEFAULT 60,
  remarks TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_exam_results_exam_id ON public.cat_exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_cat_exam_results_student_id ON public.cat_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_cat_exam_results_subject_id ON public.cat_exam_results(subject_id);
CREATE INDEX IF NOT EXISTS idx_cat_exam_results_class_id ON public.cat_exam_results(class_id);

-- Enable RLS
ALTER TABLE public.cat_exam_results ENABLE ROW LEVEL SECURITY;

-- RLS: Teachers can only enter marks for their assigned subjects
CREATE POLICY "teacher_enter_own_marks" ON public.cat_exam_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_subject_assignments tsa
      JOIN public.teachers t ON t.id = tsa.teacher_id
      WHERE t.profile_id = auth.uid()
        AND tsa.subject_id = cat_exam_results.subject_id
        AND tsa.class_id = cat_exam_results.class_id
        AND tsa.is_active = TRUE
    )
  );

-- RLS: Teachers can update only their own entered marks
CREATE POLICY "teacher_update_own_marks" ON public.cat_exam_results
  FOR UPDATE USING (
    teacher_id IN (
      SELECT id FROM public.teachers WHERE profile_id = auth.uid()
    )
  );

-- RLS: School admins can view all results for their school
CREATE POLICY "school_admin_view_results" ON public.cat_exam_results
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.classes c ON c.id = s.class_id
      WHERE c.school_id IN (
        SELECT school_id FROM public.profiles WHERE id = auth.uid() AND role = 'school_admin'
      )
    )
  );

-- RLS: Teachers can view results for their assigned classes
CREATE POLICY "teacher_view_class_results" ON public.cat_exam_results
  FOR SELECT USING (
    class_id IN (
      SELECT tsa.class_id FROM public.teacher_subject_assignments tsa
      JOIN public.teachers t ON t.id = tsa.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

-- 3. Add updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_school_exams_updated_at ON public.school_exams;
CREATE TRIGGER set_school_exams_updated_at
  BEFORE UPDATE ON public.school_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_cat_exam_results_updated_at ON public.cat_exam_results;
CREATE TRIGGER set_cat_exam_results_updated_at
  BEFORE UPDATE ON public.cat_exam_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
