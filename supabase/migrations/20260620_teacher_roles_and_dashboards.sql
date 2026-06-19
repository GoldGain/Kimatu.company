-- 1. Add new roles to UserRole enum if needed
-- Note: Supabase doesn't support easy ALTER TYPE for enums in migrations without transaction issues.
-- We will handle this via RLS and application logic if the enum is hard to change.
-- However, we can add columns to the teachers table to store specific role assignments.

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS is_class_teacher BOOLEAN DEFAULT FALSE;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS assigned_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 2. Create teacher_subject_assignments table if not exists (already exists in some migrations but let's ensure)
CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lessons_per_week INTEGER DEFAULT 1,
  is_priority BOOLEAN DEFAULT FALSE,
  academic_year VARCHAR(10),
  assigned_by_admin UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "teacher_assignments_read" ON public.teacher_subject_assignments;
CREATE POLICY "teacher_assignments_read" ON public.teacher_subject_assignments
  FOR SELECT USING (
    auth.uid() = teacher_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

DROP POLICY IF EXISTS "teacher_assignments_write" ON public.teacher_subject_assignments;
CREATE POLICY "teacher_assignments_write" ON public.teacher_subject_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 5. Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_subject_assignments_updated_at ON public.teacher_subject_assignments;
CREATE TRIGGER teacher_subject_assignments_updated_at
BEFORE UPDATE ON public.teacher_subject_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 6. Add teacher_id to results to track who uploaded/is responsible for the result
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id);
