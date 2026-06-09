-- ============================================================
-- Timetable System V2
-- Supports auto-generation, multi-role views, and conflict resolution
-- ============================================================

BEGIN;

-- 1. School timetable configuration
CREATE TABLE IF NOT EXISTS public.school_timetable_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  school_start_time TIME NOT NULL DEFAULT '09:00',
  school_end_time TIME NOT NULL DEFAULT '16:20',
  lesson_duration_minutes INTEGER NOT NULL DEFAULT 40,
  morning_break_start TIME NOT NULL DEFAULT '10:30',
  morning_break_end TIME NOT NULL DEFAULT '11:10',
  lunch_start TIME NOT NULL DEFAULT '12:00',
  lunch_end TIME NOT NULL DEFAULT '12:50',
  afternoon_break_start TIME NOT NULL DEFAULT '15:00',
  afternoon_break_end TIME NOT NULL DEFAULT '15:40',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Time slots (auto-generated from config)
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('lesson', 'break', 'lunch', 'activity')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Teacher subject assignments
CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lessons_per_week INTEGER NOT NULL DEFAULT 5,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, subject_id)
);

-- 4. After-school activities
CREATE TABLE IF NOT EXISTS public.after_school_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Monday, 5=Friday
  activity_name TEXT NOT NULL,
  start_time TIME NOT NULL DEFAULT '15:40',
  end_time TIME NOT NULL DEFAULT '16:20',
  target_classes TEXT NOT NULL DEFAULT 'All', -- 'All', 'Grade 7-9', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Generated timetable entries
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_break BOOLEAN NOT NULL DEFAULT false,
  is_lunch BOOLEAN NOT NULL DEFAULT false,
  is_activity BOOLEAN NOT NULL DEFAULT false,
  activity_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, day_of_week, time_slot_id, class_id)
);

-- 6. Enable RLS
ALTER TABLE public.school_timetable_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.after_school_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (using the existing can_access_school helper)
CREATE POLICY timetable_config_access ON public.school_timetable_config
FOR ALL USING (public.can_access_school(school_id));

CREATE POLICY time_slots_access ON public.time_slots
FOR ALL USING (public.can_access_school(school_id));

CREATE POLICY teacher_assignment_access ON public.teacher_subject_assignments
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = auth.uid() AND (p.id = teacher_id OR public.can_access_school((SELECT school_id FROM public.classes WHERE id = class_id)))
));

CREATE POLICY after_school_access ON public.after_school_activities
FOR ALL USING (public.can_access_school(school_id));

CREATE POLICY timetable_entries_access ON public.timetable_entries
FOR ALL USING (public.can_access_school(school_id));

-- 8. Triggers for updated_at
CREATE TRIGGER set_updated_at_timetable_config
BEFORE UPDATE ON public.school_timetable_config
FOR EACH ROW EXECUTE FUNCTION public.update_teacher_subjects_updated_at();

CREATE TRIGGER set_updated_at_teacher_assignment
BEFORE UPDATE ON public.teacher_subject_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_teacher_subjects_updated_at();

CREATE TRIGGER set_updated_at_after_school
BEFORE UPDATE ON public.after_school_activities
FOR EACH ROW EXECUTE FUNCTION public.update_teacher_subjects_updated_at();

COMMIT;
