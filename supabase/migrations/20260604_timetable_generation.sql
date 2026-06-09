-- ============================================================
-- Timetable Generation Feature
-- Supports automatic timetable generation with conflict resolution
-- ============================================================

BEGIN;

-- 1. Create teacher_subjects table to store teacher subject assignments and lessons per week
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lessons_per_week INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_school_id ON public.teacher_subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_id ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id ON public.teacher_subjects(subject_id);

-- 2. Create school_timetable_config table for school hours and break times
CREATE TABLE IF NOT EXISTS public.school_timetable_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  school_start_time TEXT NOT NULL DEFAULT '08:20',
  school_end_time TEXT NOT NULL DEFAULT '16:20',
  lesson_duration INTEGER NOT NULL DEFAULT 40,
  breaks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_timetable_config_school_id ON public.school_timetable_config(school_id);

-- 3. Create timetable_generated table to store auto-generated timetables
CREATE TABLE IF NOT EXISTS public.timetable_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  timetable_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, term, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_timetable_generated_school_id ON public.timetable_generated(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_generated_term ON public.timetable_generated(term, academic_year);

-- 4. Enable RLS on new tables
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_generated ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for teacher_subjects
DROP POLICY IF EXISTS teacher_subjects_tenant_select ON public.teacher_subjects;
CREATE POLICY teacher_subjects_tenant_select ON public.teacher_subjects
FOR SELECT USING (public.can_access_school(school_id));

DROP POLICY IF EXISTS teacher_subjects_tenant_insert ON public.teacher_subjects;
CREATE POLICY teacher_subjects_tenant_insert ON public.teacher_subjects
FOR INSERT WITH CHECK (public.can_access_school(school_id));

DROP POLICY IF EXISTS teacher_subjects_tenant_update ON public.teacher_subjects;
CREATE POLICY teacher_subjects_tenant_update ON public.teacher_subjects
FOR UPDATE USING (public.can_access_school(school_id)) WITH CHECK (public.can_access_school(school_id));

DROP POLICY IF EXISTS teacher_subjects_tenant_delete ON public.teacher_subjects;
CREATE POLICY teacher_subjects_tenant_delete ON public.teacher_subjects
FOR DELETE USING (public.can_access_school(school_id));

-- 6. Create RLS policies for school_timetable_config
DROP POLICY IF EXISTS school_timetable_config_tenant_select ON public.school_timetable_config;
CREATE POLICY school_timetable_config_tenant_select ON public.school_timetable_config
FOR SELECT USING (public.can_access_school(school_id));

DROP POLICY IF EXISTS school_timetable_config_tenant_insert ON public.school_timetable_config;
CREATE POLICY school_timetable_config_tenant_insert ON public.school_timetable_config
FOR INSERT WITH CHECK (public.can_access_school(school_id));

DROP POLICY IF EXISTS school_timetable_config_tenant_update ON public.school_timetable_config;
CREATE POLICY school_timetable_config_tenant_update ON public.school_timetable_config
FOR UPDATE USING (public.can_access_school(school_id)) WITH CHECK (public.can_access_school(school_id));

-- 7. Create RLS policies for timetable_generated
DROP POLICY IF EXISTS timetable_generated_tenant_select ON public.timetable_generated;
CREATE POLICY timetable_generated_tenant_select ON public.timetable_generated
FOR SELECT USING (public.can_access_school(school_id));

DROP POLICY IF EXISTS timetable_generated_tenant_insert ON public.timetable_generated;
CREATE POLICY timetable_generated_tenant_insert ON public.timetable_generated
FOR INSERT WITH CHECK (public.can_access_school(school_id));

DROP POLICY IF EXISTS timetable_generated_tenant_update ON public.timetable_generated;
CREATE POLICY timetable_generated_tenant_update ON public.timetable_generated
FOR UPDATE USING (public.can_access_school(school_id)) WITH CHECK (public.can_access_school(school_id));

DROP POLICY IF EXISTS timetable_generated_tenant_delete ON public.timetable_generated;
CREATE POLICY timetable_generated_tenant_delete ON public.timetable_generated
FOR DELETE USING (public.can_access_school(school_id));

-- 8. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_teacher_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_subjects_updated_at_trigger ON public.teacher_subjects;
CREATE TRIGGER teacher_subjects_updated_at_trigger
BEFORE UPDATE ON public.teacher_subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_teacher_subjects_updated_at();

CREATE OR REPLACE FUNCTION public.update_school_timetable_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS school_timetable_config_updated_at_trigger ON public.school_timetable_config;
CREATE TRIGGER school_timetable_config_updated_at_trigger
BEFORE UPDATE ON public.school_timetable_config
FOR EACH ROW
EXECUTE FUNCTION public.update_school_timetable_config_updated_at();

CREATE OR REPLACE FUNCTION public.update_timetable_generated_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS timetable_generated_updated_at_trigger ON public.timetable_generated;
CREATE TRIGGER timetable_generated_updated_at_trigger
BEFORE UPDATE ON public.timetable_generated
FOR EACH ROW
EXECUTE FUNCTION public.update_timetable_generated_updated_at();

COMMIT;

SELECT 'Timetable generation tables created successfully' AS status;
