-- ============================================================
-- SUPABASE MIGRATIONS FOR STUDENT PROMOTION FEATURES
-- Run these SQL commands in your Supabase SQL Editor
-- ============================================================

-- 1. Create student_promotions table
CREATE TABLE IF NOT EXISTS public.student_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  from_class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  to_class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  promotion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  academic_year TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_promotions_student_id ON public.student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_school_id ON public.student_promotions(school_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_academic_year ON public.student_promotions(academic_year);
CREATE INDEX IF NOT EXISTS idx_student_promotions_promotion_date ON public.student_promotions(promotion_date);

-- 3. Enable RLS on student_promotions table
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for student_promotions
-- Policy: School admins can view promotions for their school
CREATE POLICY "school_admin_view_promotions" ON public.student_promotions
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- Policy: School admins can insert promotions for their school
CREATE POLICY "school_admin_insert_promotions" ON public.student_promotions
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- Policy: School admins can update promotions for their school
CREATE POLICY "school_admin_update_promotions" ON public.student_promotions
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 5. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_student_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_promotions_updated_at_trigger
BEFORE UPDATE ON public.student_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_student_promotions_updated_at();

-- 6. Verify the table was created
SELECT 'student_promotions table created successfully' AS status;
