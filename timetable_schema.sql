-- =====================================================
-- TIMETABLE SYSTEM V3 - Complete Schema
-- Teacher numbers, admin assignment, blackboard format
-- =====================================================

BEGIN;

-- 1. Add teacher_number to teachers table (auto-increment per school)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS teacher_number INTEGER;

-- Create index for teacher numbers per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_number_school 
ON public.teachers(school_id, teacher_number);

-- Auto-assign teacher numbers for existing teachers that don't have one
DO $$
DECLARE
  school_rec RECORD;
  teacher_rec RECORD;
  num INTEGER;
BEGIN
  FOR school_rec IN SELECT DISTINCT school_id FROM public.teachers LOOP
    num := 1;
    FOR teacher_rec IN 
      SELECT id FROM public.teachers 
      WHERE school_id = school_rec.school_id 
      AND teacher_number IS NULL
      ORDER BY created_at
    LOOP
      -- Find next available number
      WHILE EXISTS (
        SELECT 1 FROM public.teachers 
        WHERE school_id = school_rec.school_id AND teacher_number = num
      ) LOOP
        num := num + 1;
      END LOOP;
      UPDATE public.teachers SET teacher_number = num WHERE id = teacher_rec.id;
      num := num + 1;
    END LOOP;
  END LOOP;
END $$;

-- 2. School timetable config table
CREATE TABLE IF NOT EXISTS public.school_timetable_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  school_start_time TIME NOT NULL DEFAULT '08:20',
  school_end_time TIME NOT NULL DEFAULT '16:20',
  lesson_duration_minutes INTEGER NOT NULL DEFAULT 40,
  morning_break_start TIME NOT NULL DEFAULT '10:30',
  morning_break_end TIME NOT NULL DEFAULT '11:10',
  lunch_start TIME NOT NULL DEFAULT '12:50',
  lunch_end TIME NOT NULL DEFAULT '14:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Time slots table
CREATE TABLE IF NOT EXISTS public.timetable_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('lesson', 'break', 'lunch', 'activity')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, slot_order)
);

-- 4. After-school activities
CREATE TABLE IF NOT EXISTS public.school_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  activity_name TEXT NOT NULL,
  start_time TIME NOT NULL DEFAULT '15:40',
  end_time TIME NOT NULL DEFAULT '16:20',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. New timetable entries table (replaces old timetable)
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  time_slot_id UUID NOT NULL REFERENCES public.timetable_time_slots(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL DEFAULT 'lesson' CHECK (entry_type IN ('lesson', 'break', 'lunch', 'activity')),
  activity_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, day_of_week, time_slot_id, class_id)
);

-- 6. Enable RLS
ALTER TABLE public.school_timetable_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - drop existing if any
DROP POLICY IF EXISTS timetable_config_all ON public.school_timetable_config;
DROP POLICY IF EXISTS time_slots_all ON public.timetable_time_slots;
DROP POLICY IF EXISTS activities_all ON public.school_activities;
DROP POLICY IF EXISTS timetable_entries_all ON public.timetable_entries;

-- Allow all authenticated users to read, school_admin to write
CREATE POLICY timetable_config_all ON public.school_timetable_config
FOR ALL USING (public.can_access_school(school_id));

CREATE POLICY time_slots_all ON public.timetable_time_slots
FOR ALL USING (public.can_access_school(school_id));

CREATE POLICY activities_all ON public.school_activities
FOR ALL USING (public.can_access_school(school_id));

CREATE POLICY timetable_entries_all ON public.timetable_entries
FOR ALL USING (public.can_access_school(school_id));

-- 8. Update teacher_subject_assignments to support admin assignment
ALTER TABLE public.teacher_subject_assignments 
  ADD COLUMN IF NOT EXISTS assigned_by_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lessons_per_week INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;

COMMIT;
