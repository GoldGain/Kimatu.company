-- Fix timetable time slots to have correct break order:
-- FIRST BREAK: 10:20-11:00
-- SECOND BREAK: 12:20-12:50 (BEFORE LUNCH)
-- LUNCH: 12:50-13:30

-- Delete all existing time slots for all schools
DELETE FROM public.timetable_time_slots;

-- Re-insert correct slots for each school that had timetable data
-- We'll use a function to insert for all schools that exist

DO $$
DECLARE
  school_rec RECORD;
BEGIN
  FOR school_rec IN SELECT id FROM public.schools WHERE status = 'active' LOOP
    INSERT INTO public.timetable_time_slots (school_id, slot_order, start_time, end_time, slot_type, label)
    VALUES
      (school_rec.id, 1,  '08:20', '09:00', 'lesson', 'Lesson 1'),
      (school_rec.id, 2,  '09:00', '09:40', 'lesson', 'Lesson 2'),
      (school_rec.id, 3,  '09:40', '10:20', 'lesson', 'Lesson 3'),
      (school_rec.id, 4,  '10:20', '11:00', 'break',  'FIRST BREAK'),
      (school_rec.id, 5,  '11:00', '11:40', 'lesson', 'Lesson 4'),
      (school_rec.id, 6,  '11:40', '12:20', 'lesson', 'Lesson 5'),
      (school_rec.id, 7,  '12:20', '12:50', 'break',  'SECOND BREAK'),
      (school_rec.id, 8,  '12:50', '13:30', 'lunch',  'LUNCH'),
      (school_rec.id, 9,  '13:30', '14:10', 'lesson', 'Lesson 6'),
      (school_rec.id, 10, '14:10', '14:50', 'lesson', 'Lesson 7'),
      (school_rec.id, 11, '14:50', '15:20', 'lesson', 'Lesson 8')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Also update school_timetable_config to reflect correct break times
UPDATE public.school_timetable_config SET
  school_start_time = '08:20',
  school_end_time = '15:20',
  lesson_duration_minutes = 40,
  morning_break_start = '10:20',
  morning_break_end = '11:00',
  afternoon_break_start = '12:20',
  afternoon_break_end = '12:50',
  lunch_start = '12:50',
  lunch_end = '13:30';
