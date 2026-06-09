-- Priority timetable fixes: exact school day, correct break order, reusable slot/activity constraints.

ALTER TABLE public.school_timetable_config
  ALTER COLUMN school_start_time SET DEFAULT '08:20'::time,
  ALTER COLUMN school_end_time SET DEFAULT '15:20'::time,
  ALTER COLUMN lesson_duration_minutes SET DEFAULT 40,
  ALTER COLUMN morning_break_start SET DEFAULT '10:20'::time,
  ALTER COLUMN morning_break_end SET DEFAULT '11:00'::time,
  ALTER COLUMN lunch_start SET DEFAULT '12:20'::time,
  ALTER COLUMN lunch_end SET DEFAULT '13:00'::time;

ALTER TABLE public.school_timetable_config
  ADD COLUMN IF NOT EXISTS afternoon_break_start time NOT NULL DEFAULT '13:00'::time,
  ADD COLUMN IF NOT EXISTS afternoon_break_end time NOT NULL DEFAULT '13:40'::time;

UPDATE public.school_timetable_config
SET school_start_time = '08:20'::time,
    school_end_time = '15:20'::time,
    lesson_duration_minutes = 40,
    morning_break_start = '10:20'::time,
    morning_break_end = '11:00'::time,
    lunch_start = '12:20'::time,
    lunch_end = '13:00'::time,
    afternoon_break_start = '13:00'::time,
    afternoon_break_end = '13:40'::time,
    updated_at = now();

CREATE UNIQUE INDEX IF NOT EXISTS school_timetable_config_school_id_uidx
  ON public.school_timetable_config (school_id);

CREATE UNIQUE INDEX IF NOT EXISTS timetable_time_slots_school_slot_uidx
  ON public.timetable_time_slots (school_id, slot_order);

CREATE UNIQUE INDEX IF NOT EXISTS teacher_subject_assignments_unique_active_uidx
  ON public.teacher_subject_assignments (teacher_id, class_id, subject_id);

CREATE UNIQUE INDEX IF NOT EXISTS school_activities_school_day_name_uidx
  ON public.school_activities (school_id, day_of_week, activity_name);
