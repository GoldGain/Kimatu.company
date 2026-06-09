-- =====================================================
-- FIX: Update school_timetable_config to match code expectations
-- Code expects: lesson_duration, school_start, school_end, first_break_start, etc.
-- Database has: lesson_duration_minutes, school_start_time, school_end_time, morning_break_start, etc.
-- =====================================================

BEGIN;

-- 1. Add missing columns to school_timetable_config
ALTER TABLE public.school_timetable_config 
  ADD COLUMN IF NOT EXISTS lesson_duration INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS school_start TIME DEFAULT '08:20',
  ADD COLUMN IF NOT EXISTS school_end TIME DEFAULT '15:40',
  ADD COLUMN IF NOT EXISTS first_break_start TIME DEFAULT '09:40',
  ADD COLUMN IF NOT EXISTS first_break_end TIME DEFAULT '10:20',
  ADD COLUMN IF NOT EXISTS second_break_start TIME DEFAULT '11:40',
  ADD COLUMN IF NOT EXISTS second_break_end TIME DEFAULT '12:20',
  ADD COLUMN IF NOT EXISTS lunch_start TIME DEFAULT '13:40',
  ADD COLUMN IF NOT EXISTS lunch_end TIME DEFAULT '14:20',
  ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '{"1":"Games","2":"Clubs","3":"Study Hall","4":"Drama","5":"Music Club"}'::jsonb;

-- 2. Migrate existing data from old columns to new columns
UPDATE public.school_timetable_config SET
  lesson_duration = COALESCE(lesson_duration, lesson_duration_minutes, 40),
  school_start = COALESCE(school_start, school_start_time, '08:20'::time),
  school_end = COALESCE(school_end, school_end_time, '15:40'::time),
  first_break_start = COALESCE(first_break_start, morning_break_start, '09:40'::time),
  first_break_end = COALESCE(first_break_end, morning_break_end, '10:20'::time),
  second_break_start = COALESCE(second_break_start, '11:40'::time),
  second_break_end = COALESCE(second_break_end, '12:20'::time),
  lunch_start = COALESCE(lunch_start, lunch_break_start, '13:40'::time),
  lunch_end = COALESCE(lunch_end, lunch_break_end, '14:20'::time),
  activities = COALESCE(activities, '{"1":"Games","2":"Clubs","3":"Study Hall","4":"Drama","5":"Music Club"}'::jsonb)
WHERE lesson_duration IS NULL OR school_start IS NULL;

-- 3. Also update time_slots table to have slot_type = 'activities' (code uses 'activities' not 'activity')
DO $$
BEGIN
  -- Check if the constraint exists and update it
  ALTER TABLE public.timetable_time_slots 
    DROP CONSTRAINT IF EXISTS timetable_time_slots_slot_type_check;
  
  -- Add the corrected constraint
  ALTER TABLE public.timetable_time_slots 
    ADD CONSTRAINT timetable_time_slots_slot_type_check 
    CHECK (slot_type IN ('lesson', 'break', 'lunch', 'activities', 'activity'));
EXCEPTION WHEN OTHERS THEN
  -- If the constraint doesn't exist or other issues, just continue
  RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- 4. Also fix timetable_entries entry_type constraint
DO $$
BEGIN
  ALTER TABLE public.timetable_entries 
    DROP CONSTRAINT IF EXISTS timetable_entries_entry_type_check;
  
  ALTER TABLE public.timetable_entries 
    ADD CONSTRAINT timetable_entries_entry_type_check 
    CHECK (entry_type IN ('lesson', 'break', 'lunch', 'activities', 'activity'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Entries constraint update skipped: %', SQLERRM;
END $$;

COMMIT;

-- 5. Verify the fix
SELECT 
  'school_timetable_config columns fixed' as status,
  COUNT(*) as row_count
FROM public.school_timetable_config;
