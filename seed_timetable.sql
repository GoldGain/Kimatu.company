-- =====================================================
-- SEED DATA for Theophillus Test Academy
-- school_id: faf8f165-0e6f-4a98-97ab-17d721b2dfb1
-- =====================================================

BEGIN;

-- School ID constant
DO $$
DECLARE
  v_school_id UUID := 'faf8f165-0e6f-4a98-97ab-17d721b2dfb1';
  v_class_9a UUID;
  v_class_9b UUID;
  v_class_8a UUID;
  v_class_8b UUID;
  v_class_7 UUID;
  -- Subject IDs
  v_math UUID;
  v_eng UUID;
  v_kisw UUID;
  v_sci UUID;
  v_sst UUID;
  v_cre UUID;
  v_agn UUID;
  v_intsci UUID;
  v_cas UUID;
  v_pre UUID;
  -- Teacher IDs
  v_t1 UUID; -- Teacher 1 - Mathematics
  v_t2 UUID; -- Teacher 2 - English
  v_t3 UUID; -- Teacher 3 - Kiswahili, Mathematics
  v_t4 UUID; -- Teacher 4 - CRE
  v_t5 UUID; -- Teacher 5 - Mathematics, English
  v_t6 UUID; -- Teacher 6 - SST, Pre-Technical
  v_t7 UUID; -- Teacher 7 - Agriculture, SST
  v_t8 UUID; -- Teacher 8 - Pre-Technical
  v_t9 UUID; -- Teacher 9 - English, Kiswahili
  v_t10 UUID; -- Teacher 10 - Mathematics, CAS
  v_t11 UUID; -- Teacher 11 - English
  v_t12 UUID; -- Teacher 12 - CRE, SST
  -- Time slot IDs
  v_slot1 UUID; v_slot2 UUID; v_slot3 UUID; v_slot4 UUID;
  v_slot5 UUID; v_slot6 UUID; v_slot7 UUID; v_slot8 UUID;
  v_slot9 UUID; v_slot10 UUID; v_slot11 UUID;
BEGIN

  -- =================== CLASSES ===================
  -- Delete old classes and create fresh ones
  DELETE FROM public.classes WHERE school_id = v_school_id;
  
  INSERT INTO public.classes (id, school_id, name, level, curriculum, academic_year, is_active)
  VALUES 
    (gen_random_uuid(), v_school_id, '9A', 9, 'CBC', '2026', true),
    (gen_random_uuid(), v_school_id, '9B', 9, 'CBC', '2026', true),
    (gen_random_uuid(), v_school_id, '8A', 8, 'CBC', '2026', true),
    (gen_random_uuid(), v_school_id, '8B', 8, 'CBC', '2026', true),
    (gen_random_uuid(), v_school_id, '7', 7, 'CBC', '2026', true);

  SELECT id INTO v_class_9a FROM public.classes WHERE school_id = v_school_id AND name = '9A';
  SELECT id INTO v_class_9b FROM public.classes WHERE school_id = v_school_id AND name = '9B';
  SELECT id INTO v_class_8a FROM public.classes WHERE school_id = v_school_id AND name = '8A';
  SELECT id INTO v_class_8b FROM public.classes WHERE school_id = v_school_id AND name = '8B';
  SELECT id INTO v_class_7 FROM public.classes WHERE school_id = v_school_id AND name = '7';

  -- =================== SUBJECTS ===================
  DELETE FROM public.subjects WHERE school_id = v_school_id;
  
  INSERT INTO public.subjects (id, school_id, name, code, curriculum, class_levels, is_core)
  VALUES
    (gen_random_uuid(), v_school_id, 'Mathematics', 'MATH', 'CBC', ARRAY[7,8,9], true),
    (gen_random_uuid(), v_school_id, 'English', 'ENG', 'CBC', ARRAY[7,8,9], true),
    (gen_random_uuid(), v_school_id, 'Kiswahili', 'KISW', 'CBC', ARRAY[7,8,9], true),
    (gen_random_uuid(), v_school_id, 'Integrated Science', 'INTSCI', 'CBC', ARRAY[7,8,9], true),
    (gen_random_uuid(), v_school_id, 'Social Studies', 'SST', 'CBC', ARRAY[7,8,9], true),
    (gen_random_uuid(), v_school_id, 'CRE', 'CRE', 'CBC', ARRAY[7,8,9], false),
    (gen_random_uuid(), v_school_id, 'Agriculture', 'AGN', 'CBC', ARRAY[7,8,9], false),
    (gen_random_uuid(), v_school_id, 'Pre-Technical', 'PRE', 'CBC', ARRAY[7,8,9], false),
    (gen_random_uuid(), v_school_id, 'Creative Arts', 'CAS', 'CBC', ARRAY[7,8,9], false);

  SELECT id INTO v_math FROM public.subjects WHERE school_id = v_school_id AND code = 'MATH';
  SELECT id INTO v_eng FROM public.subjects WHERE school_id = v_school_id AND code = 'ENG';
  SELECT id INTO v_kisw FROM public.subjects WHERE school_id = v_school_id AND code = 'KISW';
  SELECT id INTO v_intsci FROM public.subjects WHERE school_id = v_school_id AND code = 'INTSCI';
  SELECT id INTO v_sst FROM public.subjects WHERE school_id = v_school_id AND code = 'SST';
  SELECT id INTO v_cre FROM public.subjects WHERE school_id = v_school_id AND code = 'CRE';
  SELECT id INTO v_agn FROM public.subjects WHERE school_id = v_school_id AND code = 'AGN';
  SELECT id INTO v_pre FROM public.subjects WHERE school_id = v_school_id AND code = 'PRE';
  SELECT id INTO v_cas FROM public.subjects WHERE school_id = v_school_id AND code = 'CAS';

  -- =================== TEACHERS ===================
  DELETE FROM public.teacher_subject_assignments WHERE school_id = v_school_id;
  DELETE FROM public.teachers WHERE school_id = v_school_id;

  INSERT INTO public.teachers (id, school_id, first_name, last_name, employee_number, teacher_number, is_active)
  VALUES
    (gen_random_uuid(), v_school_id, 'Mr. John', 'Kamau', 'T001', 1, true),
    (gen_random_uuid(), v_school_id, 'Mrs. Mary', 'Wanjiku', 'T002', 2, true),
    (gen_random_uuid(), v_school_id, 'Mr. Peter', 'Omondi', 'T003', 3, true),
    (gen_random_uuid(), v_school_id, 'Ms. Sarah', 'Njeri', 'T004', 4, true),
    (gen_random_uuid(), v_school_id, 'Mr. James', 'Mwangi', 'T005', 5, true),
    (gen_random_uuid(), v_school_id, 'Mrs. Ann', 'Achieng', 'T006', 6, true),
    (gen_random_uuid(), v_school_id, 'Mr. Paul', 'Mutua', 'T007', 7, true),
    (gen_random_uuid(), v_school_id, 'Ms. Grace', 'Wambua', 'T008', 8, true),
    (gen_random_uuid(), v_school_id, 'Mr. David', 'Otieno', 'T009', 9, true),
    (gen_random_uuid(), v_school_id, 'Mrs. Faith', 'Kimani', 'T010', 10, true),
    (gen_random_uuid(), v_school_id, 'Mr. Moses', 'Kariuki', 'T011', 11, true),
    (gen_random_uuid(), v_school_id, 'Mrs. Ruth', 'Chebet', 'T012', 12, true);

  SELECT id INTO v_t1 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 1;
  SELECT id INTO v_t2 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 2;
  SELECT id INTO v_t3 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 3;
  SELECT id INTO v_t4 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 4;
  SELECT id INTO v_t5 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 5;
  SELECT id INTO v_t6 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 6;
  SELECT id INTO v_t7 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 7;
  SELECT id INTO v_t8 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 8;
  SELECT id INTO v_t9 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 9;
  SELECT id INTO v_t10 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 10;
  SELECT id INTO v_t11 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 11;
  SELECT id INTO v_t12 FROM public.teachers WHERE school_id = v_school_id AND teacher_number = 12;

  -- =================== TEACHER SUBJECT ASSIGNMENTS ===================
  -- T1 = Math (9A), T3 = Math (9A,8B), T5 = Math (9B,8A), T10 = Math (7)
  -- T2 = CRE (9A), T4 = CRE (8A), T6 = CRE (9B), T12 = CRE (8B)
  -- T11 = English (8A), T9 = English (8B,7), T2 = English (9A), T5 = English (9B), T6 = English (9B)
  -- T3 = Kiswahili (9A,8B), T1 = Kiswahili (9A), T12 = Kiswahili (8A)
  -- T6 = SST (9B,7), T12 = SST (8B), T7 = SST (7)
  -- T7 = AGN (9A,9B,8A,8B,7)
  -- T8 = PRE (9B,8A,8B,7)
  -- T10 = CAS (9A,9B,7), T2 = CAS (9A)
  -- T5 = INTSCI (9B,8A), T3 = INTSCI (8B), T8 = INTSCI (7)

  INSERT INTO public.teacher_subject_assignments 
    (school_id, teacher_id, class_id, subject_id, lessons_per_week, is_priority, assigned_by_admin, is_active)
  VALUES
    -- 9A assignments
    (v_school_id, v_t1, v_class_9a, v_math, 5, true, true, true),
    (v_school_id, v_t4, v_class_9a, v_cre, 3, false, true, true),
    (v_school_id, v_t2, v_class_9a, v_eng, 5, true, true, true),
    (v_school_id, v_t10, v_class_9a, v_cas, 2, false, true, true),
    (v_school_id, v_t6, v_class_9a, v_sst, 3, false, true, true),
    (v_school_id, v_t7, v_class_9a, v_agn, 3, false, true, true),
    (v_school_id, v_t1, v_class_9a, v_kisw, 3, false, true, true),
    -- 9B assignments
    (v_school_id, v_t5, v_class_9b, v_math, 5, true, true, true),
    (v_school_id, v_t6, v_class_9b, v_eng, 5, true, true, true),
    (v_school_id, v_t2, v_class_9b, v_kisw, 3, false, true, true),
    (v_school_id, v_t3, v_class_9b, v_cre, 3, false, true, true),
    (v_school_id, v_t7, v_class_9b, v_cas, 2, false, true, true),
    (v_school_id, v_t8, v_class_9b, v_pre, 3, false, true, true),
    -- 8A assignments
    (v_school_id, v_t5, v_class_8a, v_math, 5, true, true, true),
    (v_school_id, v_t11, v_class_8a, v_eng, 5, true, true, true),
    (v_school_id, v_t12, v_class_8a, v_kisw, 3, false, true, true),
    (v_school_id, v_t4, v_class_8a, v_cre, 3, false, true, true),
    (v_school_id, v_t5, v_class_8a, v_intsci, 3, false, true, true),
    (v_school_id, v_t7, v_class_8a, v_agn, 3, false, true, true),
    -- 8B assignments
    (v_school_id, v_t3, v_class_8b, v_math, 5, true, true, true),
    (v_school_id, v_t9, v_class_8b, v_eng, 5, true, true, true),
    (v_school_id, v_t3, v_class_8b, v_kisw, 3, false, true, true),
    (v_school_id, v_t12, v_class_8b, v_sst, 3, false, true, true),
    (v_school_id, v_t3, v_class_8b, v_intsci, 3, false, true, true),
    (v_school_id, v_t8, v_class_8b, v_pre, 3, false, true, true),
    -- Grade 7 assignments
    (v_school_id, v_t10, v_class_7, v_math, 5, true, true, true),
    (v_school_id, v_t9, v_class_7, v_eng, 5, true, true, true),
    (v_school_id, v_t9, v_class_7, v_kisw, 3, false, true, true),
    (v_school_id, v_t6, v_class_7, v_sst, 3, false, true, true),
    (v_school_id, v_t7, v_class_7, v_agn, 3, false, true, true),
    (v_school_id, v_t8, v_class_7, v_intsci, 3, false, true, true),
    (v_school_id, v_t10, v_class_7, v_cas, 2, false, true, true);

  -- =================== TIMETABLE CONFIG ===================
  DELETE FROM public.school_timetable_config WHERE school_id = v_school_id;
  INSERT INTO public.school_timetable_config 
    (school_id, school_start_time, school_end_time, lesson_duration_minutes, 
     morning_break_start, morning_break_end, lunch_start, lunch_end)
  VALUES
    (v_school_id, '08:20', '16:20', 40, '10:30', '11:10', '12:50', '14:00');

  -- =================== TIME SLOTS ===================
  DELETE FROM public.timetable_entries WHERE school_id = v_school_id;
  DELETE FROM public.timetable_time_slots WHERE school_id = v_school_id;

  -- Based on blackboard: 8:20-9:00, 9:00-9:40, 9:40-9:50(break), 9:50-10:30, 10:30-11:10(break), 
  -- 11:10-11:30, 11:30-12:10, 12:10-12:50, 12:50-2:00(lunch), 2:00-2:40, 2:40-3:20, 3:20-4:00(activity)
  INSERT INTO public.timetable_time_slots (id, school_id, slot_order, start_time, end_time, slot_type, label)
  VALUES
    (gen_random_uuid(), v_school_id, 1, '08:20', '09:00', 'lesson', 'Period 1'),
    (gen_random_uuid(), v_school_id, 2, '09:00', '09:40', 'lesson', 'Period 2'),
    (gen_random_uuid(), v_school_id, 3, '09:40', '09:50', 'break', 'Short Break'),
    (gen_random_uuid(), v_school_id, 4, '09:50', '10:30', 'lesson', 'Period 3'),
    (gen_random_uuid(), v_school_id, 5, '10:30', '11:10', 'break', 'Break'),
    (gen_random_uuid(), v_school_id, 6, '11:10', '11:30', 'lesson', 'Period 4'),
    (gen_random_uuid(), v_school_id, 7, '11:30', '12:10', 'lesson', 'Period 5'),
    (gen_random_uuid(), v_school_id, 8, '12:10', '12:50', 'lesson', 'Period 6'),
    (gen_random_uuid(), v_school_id, 9, '12:50', '14:00', 'lunch', 'Lunch'),
    (gen_random_uuid(), v_school_id, 10, '14:00', '14:40', 'lesson', 'Period 7'),
    (gen_random_uuid(), v_school_id, 11, '14:40', '15:20', 'lesson', 'Period 8'),
    (gen_random_uuid(), v_school_id, 12, '15:20', '16:00', 'activity', 'Activities'),
    (gen_random_uuid(), v_school_id, 13, '16:00', '16:20', 'activity', 'End of Day');

  -- Get slot IDs
  SELECT id INTO v_slot1 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 1;
  SELECT id INTO v_slot2 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 2;
  SELECT id INTO v_slot3 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 3;
  SELECT id INTO v_slot4 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 4;
  SELECT id INTO v_slot5 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 5;
  SELECT id INTO v_slot6 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 6;
  SELECT id INTO v_slot7 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 7;
  SELECT id INTO v_slot8 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 8;
  SELECT id INTO v_slot9 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 9;
  SELECT id INTO v_slot10 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 10;
  SELECT id INTO v_slot11 FROM public.timetable_time_slots WHERE school_id = v_school_id AND slot_order = 11;

  -- =================== ACTIVITIES ===================
  DELETE FROM public.school_activities WHERE school_id = v_school_id;
  INSERT INTO public.school_activities (school_id, day_of_week, activity_name, start_time, end_time)
  VALUES
    (v_school_id, 1, 'Games & Sports', '15:20', '16:20'),
    (v_school_id, 2, 'Guidance & Counselling', '15:20', '16:20'),
    (v_school_id, 3, 'Games & Sports', '15:20', '16:20'),
    (v_school_id, 4, 'Careers', '15:20', '16:20'),
    (v_school_id, 5, 'PP Games & Sports', '15:20', '16:20');

  -- =================== TIMETABLE ENTRIES ===================
  -- MONDAY (day_of_week = 1)
  -- 9A: MATH(1), CRE(4), [break], ENG(4)+CAS(2?), [break], SST(6)+AGN(5), [lunch], KISW(1)+PRE(5?), [activity]
  -- Following blackboard pattern: MATH3, CRE4 | ENG4+CAS(2) | SST6+AGN5 | KISW1+PRE5 | CLUB

  -- MONDAY - 9A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 1, v_slot1, v_class_9a, v_math, v_t1, 'lesson'),
    (v_school_id, 1, v_slot2, v_class_9a, v_cre, v_t4, 'lesson'),
    (v_school_id, 1, v_slot3, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot4, v_class_9a, v_eng, v_t2, 'lesson'),
    (v_school_id, 1, v_slot5, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot6, v_class_9a, v_sst, v_t6, 'lesson'),
    (v_school_id, 1, v_slot7, v_class_9a, v_agn, v_t7, 'lesson'),
    (v_school_id, 1, v_slot8, v_class_9a, v_cas, v_t10, 'lesson'),
    (v_school_id, 1, v_slot9, v_class_9a, NULL, NULL, 'lunch'),
    (v_school_id, 1, v_slot10, v_class_9a, v_kisw, v_t1, 'lesson'),
    (v_school_id, 1, v_slot11, v_class_9a, v_pre, v_t8, 'lesson');

  -- MONDAY - 9B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 1, v_slot1, v_class_9b, v_pre, v_t8, 'lesson'),
    (v_school_id, 1, v_slot2, v_class_9b, v_math, v_t5, 'lesson'),
    (v_school_id, 1, v_slot3, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot4, v_class_9b, v_cre, v_t3, 'lesson'),
    (v_school_id, 1, v_slot5, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot6, v_class_9b, v_sst, v_t6, 'lesson'),
    (v_school_id, 1, v_slot7, v_class_9b, v_cas, v_t7, 'lesson'),
    (v_school_id, 1, v_slot8, v_class_9b, v_eng, v_t6, 'lesson'),
    (v_school_id, 1, v_slot9, v_class_9b, NULL, NULL, 'lunch'),
    (v_school_id, 1, v_slot10, v_class_9b, v_kisw, v_t2, 'lesson'),
    (v_school_id, 1, v_slot11, v_class_9b, v_pre, v_t8, 'lesson');

  -- MONDAY - 8A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 1, v_slot1, v_class_8a, v_math, v_t5, 'lesson'),
    (v_school_id, 1, v_slot2, v_class_8a, v_eng, v_t11, 'lesson'),
    (v_school_id, 1, v_slot3, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot4, v_class_8a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 1, v_slot5, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot6, v_class_8a, v_cre, v_t4, 'lesson'),
    (v_school_id, 1, v_slot7, v_class_8a, v_agn, v_t7, 'lesson'),
    (v_school_id, 1, v_slot8, v_class_8a, v_kisw, v_t12, 'lesson'),
    (v_school_id, 1, v_slot9, v_class_8a, NULL, NULL, 'lunch'),
    (v_school_id, 1, v_slot10, v_class_8a, v_eng, v_t11, 'lesson'),
    (v_school_id, 1, v_slot11, v_class_8a, v_agn, v_t7, 'lesson');

  -- MONDAY - 8B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 1, v_slot1, v_class_8b, v_kisw, v_t3, 'lesson'),
    (v_school_id, 1, v_slot2, v_class_8b, v_math, v_t3, 'lesson'),
    (v_school_id, 1, v_slot3, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot4, v_class_8b, v_eng, v_t9, 'lesson'),
    (v_school_id, 1, v_slot5, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot6, v_class_8b, v_intsci, v_t3, 'lesson'),
    (v_school_id, 1, v_slot7, v_class_8b, v_cas, v_t10, 'lesson'),
    (v_school_id, 1, v_slot8, v_class_8b, v_sst, v_t12, 'lesson'),
    (v_school_id, 1, v_slot9, v_class_8b, NULL, NULL, 'lunch'),
    (v_school_id, 1, v_slot10, v_class_8b, v_cre, v_t4, 'lesson'),
    (v_school_id, 1, v_slot11, v_class_8b, v_sst, v_t12, 'lesson');

  -- MONDAY - Grade 7
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 1, v_slot1, v_class_7, v_math, v_t10, 'lesson'),
    (v_school_id, 1, v_slot2, v_class_7, v_cas, v_t10, 'lesson'),
    (v_school_id, 1, v_slot3, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot4, v_class_7, v_kisw, v_t9, 'lesson'),
    (v_school_id, 1, v_slot5, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 1, v_slot6, v_class_7, v_agn, v_t7, 'lesson'),
    (v_school_id, 1, v_slot7, v_class_7, v_sst, v_t6, 'lesson'),
    (v_school_id, 1, v_slot8, v_class_7, v_eng, v_t9, 'lesson'),
    (v_school_id, 1, v_slot9, v_class_7, NULL, NULL, 'lunch'),
    (v_school_id, 1, v_slot10, v_class_7, v_pre, v_t8, 'lesson'),
    (v_school_id, 1, v_slot11, v_class_7, v_cre, v_t12, 'lesson');

  -- TUESDAY (day_of_week = 2)
  -- 9A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 2, v_slot1, v_class_9a, v_kisw, v_t1, 'lesson'),
    (v_school_id, 2, v_slot2, v_class_9a, v_math, v_t1, 'lesson'),
    (v_school_id, 2, v_slot3, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot4, v_class_9a, v_eng, v_t2, 'lesson'),
    (v_school_id, 2, v_slot5, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot6, v_class_9a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 2, v_slot7, v_class_9a, v_cas, v_t10, 'lesson'),
    (v_school_id, 2, v_slot8, v_class_9a, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot9, v_class_9a, NULL, NULL, 'lunch'),
    (v_school_id, 2, v_slot10, v_class_9a, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot11, v_class_9a, v_cre, v_t4, 'lesson');

  -- TUESDAY - 9B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 2, v_slot1, v_class_9b, v_math, v_t5, 'lesson'),
    (v_school_id, 2, v_slot2, v_class_9b, v_eng, v_t6, 'lesson'),
    (v_school_id, 2, v_slot3, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot4, v_class_9b, v_kisw, v_t2, 'lesson'),
    (v_school_id, 2, v_slot5, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot6, v_class_9b, v_cre, v_t3, 'lesson'),
    (v_school_id, 2, v_slot7, v_class_9b, v_sst, v_t6, 'lesson'),
    (v_school_id, 2, v_slot8, v_class_9b, v_cas, v_t7, 'lesson'),
    (v_school_id, 2, v_slot9, v_class_9b, NULL, NULL, 'lunch'),
    (v_school_id, 2, v_slot10, v_class_9b, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot11, v_class_9b, v_pre, v_t8, 'lesson');

  -- TUESDAY - 8A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 2, v_slot1, v_class_8a, v_eng, v_t11, 'lesson'),
    (v_school_id, 2, v_slot2, v_class_8a, v_math, v_t5, 'lesson'),
    (v_school_id, 2, v_slot3, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot4, v_class_8a, v_kisw, v_t12, 'lesson'),
    (v_school_id, 2, v_slot5, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot6, v_class_8a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 2, v_slot7, v_class_8a, v_sst, v_t6, 'lesson'),
    (v_school_id, 2, v_slot8, v_class_8a, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot9, v_class_8a, NULL, NULL, 'lunch'),
    (v_school_id, 2, v_slot10, v_class_8a, v_sst, v_t6, 'lesson'),
    (v_school_id, 2, v_slot11, v_class_8a, v_agn, v_t7, 'lesson');

  -- TUESDAY - 8B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 2, v_slot1, v_class_8b, v_math, v_t3, 'lesson'),
    (v_school_id, 2, v_slot2, v_class_8b, v_eng, v_t9, 'lesson'),
    (v_school_id, 2, v_slot3, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot4, v_class_8b, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot5, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot6, v_class_8b, v_sst, v_t12, 'lesson'),
    (v_school_id, 2, v_slot7, v_class_8b, v_cas, v_t10, 'lesson'),
    (v_school_id, 2, v_slot8, v_class_8b, v_intsci, v_t3, 'lesson'),
    (v_school_id, 2, v_slot9, v_class_8b, NULL, NULL, 'lunch'),
    (v_school_id, 2, v_slot10, v_class_8b, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot11, v_class_8b, v_pre, v_t8, 'lesson');

  -- TUESDAY - Grade 7
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 2, v_slot1, v_class_7, v_sst, v_t6, 'lesson'),
    (v_school_id, 2, v_slot2, v_class_7, v_math, v_t10, 'lesson'),
    (v_school_id, 2, v_slot3, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot4, v_class_7, v_intsci, v_t8, 'lesson'),
    (v_school_id, 2, v_slot5, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 2, v_slot6, v_class_7, v_eng, v_t9, 'lesson'),
    (v_school_id, 2, v_slot7, v_class_7, v_cas, v_t10, 'lesson'),
    (v_school_id, 2, v_slot8, v_class_7, v_agn, v_t7, 'lesson'),
    (v_school_id, 2, v_slot9, v_class_7, NULL, NULL, 'lunch'),
    (v_school_id, 2, v_slot10, v_class_7, v_pre, v_t8, 'lesson'),
    (v_school_id, 2, v_slot11, v_class_7, v_cre, v_t12, 'lesson');

  -- WEDNESDAY (day_of_week = 3)
  -- 9A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 3, v_slot1, v_class_9a, v_math, v_t1, 'lesson'),
    (v_school_id, 3, v_slot2, v_class_9a, v_kisw, v_t1, 'lesson'),
    (v_school_id, 3, v_slot3, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot4, v_class_9a, v_eng, v_t2, 'lesson'),
    (v_school_id, 3, v_slot5, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot6, v_class_9a, v_sst, v_t6, 'lesson'),
    (v_school_id, 3, v_slot7, v_class_9a, v_cas, v_t10, 'lesson'),
    (v_school_id, 3, v_slot8, v_class_9a, v_agn, v_t7, 'lesson'),
    (v_school_id, 3, v_slot9, v_class_9a, NULL, NULL, 'lunch'),
    (v_school_id, 3, v_slot10, v_class_9a, v_pre, v_t8, 'lesson'),
    (v_school_id, 3, v_slot11, v_class_9a, v_cre, v_t4, 'lesson');

  -- WEDNESDAY - 9B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 3, v_slot1, v_class_9b, v_eng, v_t6, 'lesson'),
    (v_school_id, 3, v_slot2, v_class_9b, v_math, v_t5, 'lesson'),
    (v_school_id, 3, v_slot3, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot4, v_class_9b, v_kisw, v_t2, 'lesson'),
    (v_school_id, 3, v_slot5, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot6, v_class_9b, v_agn, v_t7, 'lesson'),
    (v_school_id, 3, v_slot7, v_class_9b, v_cas, v_t7, 'lesson'),
    (v_school_id, 3, v_slot8, v_class_9b, v_cre, v_t3, 'lesson'),
    (v_school_id, 3, v_slot9, v_class_9b, NULL, NULL, 'lunch'),
    (v_school_id, 3, v_slot10, v_class_9b, v_intsci, v_t5, 'lesson'),
    (v_school_id, 3, v_slot11, v_class_9b, v_sst, v_t6, 'lesson');

  -- WEDNESDAY - 8A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 3, v_slot1, v_class_8a, v_math, v_t5, 'lesson'),
    (v_school_id, 3, v_slot2, v_class_8a, v_eng, v_t11, 'lesson'),
    (v_school_id, 3, v_slot3, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot4, v_class_8a, v_kisw, v_t12, 'lesson'),
    (v_school_id, 3, v_slot5, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot6, v_class_8a, v_cre, v_t4, 'lesson'),
    (v_school_id, 3, v_slot7, v_class_8a, v_agn, v_t7, 'lesson'),
    (v_school_id, 3, v_slot8, v_class_8a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 3, v_slot9, v_class_8a, NULL, NULL, 'lunch'),
    (v_school_id, 3, v_slot10, v_class_8a, v_pre, v_t8, 'lesson'),
    (v_school_id, 3, v_slot11, v_class_8a, v_sst, v_t6, 'lesson');

  -- WEDNESDAY - 8B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 3, v_slot1, v_class_8b, v_kisw, v_t3, 'lesson'),
    (v_school_id, 3, v_slot2, v_class_8b, v_math, v_t3, 'lesson'),
    (v_school_id, 3, v_slot3, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot4, v_class_8b, v_eng, v_t9, 'lesson'),
    (v_school_id, 3, v_slot5, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot6, v_class_8b, v_intsci, v_t3, 'lesson'),
    (v_school_id, 3, v_slot7, v_class_8b, v_sst, v_t12, 'lesson'),
    (v_school_id, 3, v_slot8, v_class_8b, v_cre, v_t4, 'lesson'),
    (v_school_id, 3, v_slot9, v_class_8b, NULL, NULL, 'lunch'),
    (v_school_id, 3, v_slot10, v_class_8b, v_pre, v_t8, 'lesson'),
    (v_school_id, 3, v_slot11, v_class_8b, v_agn, v_t7, 'lesson');

  -- WEDNESDAY - Grade 7
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 3, v_slot1, v_class_7, v_math, v_t10, 'lesson'),
    (v_school_id, 3, v_slot2, v_class_7, v_cas, v_t10, 'lesson'),
    (v_school_id, 3, v_slot3, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot4, v_class_7, v_kisw, v_t9, 'lesson'),
    (v_school_id, 3, v_slot5, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 3, v_slot6, v_class_7, v_agn, v_t7, 'lesson'),
    (v_school_id, 3, v_slot7, v_class_7, v_intsci, v_t8, 'lesson'),
    (v_school_id, 3, v_slot8, v_class_7, v_eng, v_t9, 'lesson'),
    (v_school_id, 3, v_slot9, v_class_7, NULL, NULL, 'lunch'),
    (v_school_id, 3, v_slot10, v_class_7, v_pre, v_t8, 'lesson'),
    (v_school_id, 3, v_slot11, v_class_7, v_cre, v_t12, 'lesson');

  -- THURSDAY (day_of_week = 4)
  -- 9A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 4, v_slot1, v_class_9a, v_eng, v_t2, 'lesson'),
    (v_school_id, 4, v_slot2, v_class_9a, v_math, v_t1, 'lesson'),
    (v_school_id, 4, v_slot3, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot4, v_class_9a, v_kisw, v_t1, 'lesson'),
    (v_school_id, 4, v_slot5, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot6, v_class_9a, v_sst, v_t6, 'lesson'),
    (v_school_id, 4, v_slot7, v_class_9a, v_agn, v_t7, 'lesson'),
    (v_school_id, 4, v_slot8, v_class_9a, v_cre, v_t4, 'lesson'),
    (v_school_id, 4, v_slot9, v_class_9a, NULL, NULL, 'lunch'),
    (v_school_id, 4, v_slot10, v_class_9a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 4, v_slot11, v_class_9a, v_sst, v_t6, 'lesson');

  -- THURSDAY - 9B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 4, v_slot1, v_class_9b, v_math, v_t5, 'lesson'),
    (v_school_id, 4, v_slot2, v_class_9b, v_eng, v_t6, 'lesson'),
    (v_school_id, 4, v_slot3, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot4, v_class_9b, v_kisw, v_t2, 'lesson'),
    (v_school_id, 4, v_slot5, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot6, v_class_9b, v_agn, v_t7, 'lesson'),
    (v_school_id, 4, v_slot7, v_class_9b, v_cre, v_t3, 'lesson'),
    (v_school_id, 4, v_slot8, v_class_9b, v_intsci, v_t5, 'lesson'),
    (v_school_id, 4, v_slot9, v_class_9b, NULL, NULL, 'lunch'),
    (v_school_id, 4, v_slot10, v_class_9b, v_pre, v_t8, 'lesson'),
    (v_school_id, 4, v_slot11, v_class_9b, v_cas, v_t7, 'lesson');

  -- THURSDAY - 8A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 4, v_slot1, v_class_8a, v_cre, v_t4, 'lesson'),
    (v_school_id, 4, v_slot2, v_class_8a, v_math, v_t5, 'lesson'),
    (v_school_id, 4, v_slot3, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot4, v_class_8a, v_kisw, v_t12, 'lesson'),
    (v_school_id, 4, v_slot5, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot6, v_class_8a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 4, v_slot7, v_class_8a, v_sst, v_t6, 'lesson'),
    (v_school_id, 4, v_slot8, v_class_8a, v_pre, v_t8, 'lesson'),
    (v_school_id, 4, v_slot9, v_class_8a, NULL, NULL, 'lunch'),
    (v_school_id, 4, v_slot10, v_class_8a, v_cre, v_t4, 'lesson'),
    (v_school_id, 4, v_slot11, v_class_8a, v_agn, v_t7, 'lesson');

  -- THURSDAY - 8B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 4, v_slot1, v_class_8b, v_math, v_t3, 'lesson'),
    (v_school_id, 4, v_slot2, v_class_8b, v_eng, v_t9, 'lesson'),
    (v_school_id, 4, v_slot3, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot4, v_class_8b, v_intsci, v_t3, 'lesson'),
    (v_school_id, 4, v_slot5, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot6, v_class_8b, v_sst, v_t12, 'lesson'),
    (v_school_id, 4, v_slot7, v_class_8b, v_pre, v_t8, 'lesson'),
    (v_school_id, 4, v_slot8, v_class_8b, v_cas, v_t10, 'lesson'),
    (v_school_id, 4, v_slot9, v_class_8b, NULL, NULL, 'lunch'),
    (v_school_id, 4, v_slot10, v_class_8b, v_agn, v_t7, 'lesson'),
    (v_school_id, 4, v_slot11, v_class_8b, v_cre, v_t4, 'lesson');

  -- THURSDAY - Grade 7
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 4, v_slot1, v_class_7, v_math, v_t10, 'lesson'),
    (v_school_id, 4, v_slot2, v_class_7, v_cas, v_t10, 'lesson'),
    (v_school_id, 4, v_slot3, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot4, v_class_7, v_eng, v_t9, 'lesson'),
    (v_school_id, 4, v_slot5, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 4, v_slot6, v_class_7, v_pre, v_t8, 'lesson'),
    (v_school_id, 4, v_slot7, v_class_7, v_sst, v_t6, 'lesson'),
    (v_school_id, 4, v_slot8, v_class_7, v_agn, v_t7, 'lesson'),
    (v_school_id, 4, v_slot9, v_class_7, NULL, NULL, 'lunch'),
    (v_school_id, 4, v_slot10, v_class_7, v_intsci, v_t8, 'lesson'),
    (v_school_id, 4, v_slot11, v_class_7, v_cre, v_t12, 'lesson');

  -- FRIDAY (day_of_week = 5)
  -- 9A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 5, v_slot1, v_class_9a, v_eng, v_t2, 'lesson'),
    (v_school_id, 5, v_slot2, v_class_9a, v_math, v_t1, 'lesson'),
    (v_school_id, 5, v_slot3, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot4, v_class_9a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 5, v_slot5, v_class_9a, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot6, v_class_9a, v_agn, v_t7, 'lesson'),
    (v_school_id, 5, v_slot7, v_class_9a, v_cre, v_t4, 'lesson'),
    (v_school_id, 5, v_slot8, v_class_9a, v_cas, v_t10, 'lesson'),
    (v_school_id, 5, v_slot9, v_class_9a, NULL, NULL, 'lunch'),
    (v_school_id, 5, v_slot10, v_class_9a, v_sst, v_t6, 'lesson'),
    (v_school_id, 5, v_slot11, v_class_9a, v_kisw, v_t1, 'lesson');

  -- FRIDAY - 9B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 5, v_slot1, v_class_9b, v_math, v_t5, 'lesson'),
    (v_school_id, 5, v_slot2, v_class_9b, v_eng, v_t6, 'lesson'),
    (v_school_id, 5, v_slot3, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot4, v_class_9b, v_kisw, v_t2, 'lesson'),
    (v_school_id, 5, v_slot5, v_class_9b, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot6, v_class_9b, v_cre, v_t3, 'lesson'),
    (v_school_id, 5, v_slot7, v_class_9b, v_agn, v_t7, 'lesson'),
    (v_school_id, 5, v_slot8, v_class_9b, v_intsci, v_t5, 'lesson'),
    (v_school_id, 5, v_slot9, v_class_9b, NULL, NULL, 'lunch'),
    (v_school_id, 5, v_slot10, v_class_9b, v_pre, v_t8, 'lesson'),
    (v_school_id, 5, v_slot11, v_class_9b, v_sst, v_t6, 'lesson');

  -- FRIDAY - 8A
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 5, v_slot1, v_class_8a, v_eng, v_t11, 'lesson'),
    (v_school_id, 5, v_slot2, v_class_8a, v_math, v_t5, 'lesson'),
    (v_school_id, 5, v_slot3, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot4, v_class_8a, v_kisw, v_t12, 'lesson'),
    (v_school_id, 5, v_slot5, v_class_8a, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot6, v_class_8a, v_cre, v_t4, 'lesson'),
    (v_school_id, 5, v_slot7, v_class_8a, v_intsci, v_t5, 'lesson'),
    (v_school_id, 5, v_slot8, v_class_8a, v_agn, v_t7, 'lesson'),
    (v_school_id, 5, v_slot9, v_class_8a, NULL, NULL, 'lunch'),
    (v_school_id, 5, v_slot10, v_class_8a, v_pre, v_t8, 'lesson'),
    (v_school_id, 5, v_slot11, v_class_8a, v_agn, v_t7, 'lesson');

  -- FRIDAY - 8B
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 5, v_slot1, v_class_8b, v_intsci, v_t3, 'lesson'),
    (v_school_id, 5, v_slot2, v_class_8b, v_kisw, v_t3, 'lesson'),
    (v_school_id, 5, v_slot3, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot4, v_class_8b, v_math, v_t3, 'lesson'),
    (v_school_id, 5, v_slot5, v_class_8b, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot6, v_class_8b, v_cre, v_t4, 'lesson'),
    (v_school_id, 5, v_slot7, v_class_8b, v_eng, v_t9, 'lesson'),
    (v_school_id, 5, v_slot8, v_class_8b, v_sst, v_t12, 'lesson'),
    (v_school_id, 5, v_slot9, v_class_8b, NULL, NULL, 'lunch'),
    (v_school_id, 5, v_slot10, v_class_8b, v_kisw, v_t3, 'lesson'),
    (v_school_id, 5, v_slot11, v_class_8b, v_agn, v_t7, 'lesson');

  -- FRIDAY - Grade 7
  INSERT INTO public.timetable_entries (school_id, day_of_week, time_slot_id, class_id, subject_id, teacher_id, entry_type)
  VALUES
    (v_school_id, 5, v_slot1, v_class_7, v_intsci, v_t8, 'lesson'),
    (v_school_id, 5, v_slot2, v_class_7, v_cas, v_t10, 'lesson'),
    (v_school_id, 5, v_slot3, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot4, v_class_7, v_math, v_t10, 'lesson'),
    (v_school_id, 5, v_slot5, v_class_7, NULL, NULL, 'break'),
    (v_school_id, 5, v_slot6, v_class_7, v_eng, v_t9, 'lesson'),
    (v_school_id, 5, v_slot7, v_class_7, v_agn, v_t7, 'lesson'),
    (v_school_id, 5, v_slot8, v_class_7, v_sst, v_t6, 'lesson'),
    (v_school_id, 5, v_slot9, v_class_7, NULL, NULL, 'lunch'),
    (v_school_id, 5, v_slot10, v_class_7, v_pre, v_t8, 'lesson'),
    (v_school_id, 5, v_slot11, v_class_7, v_cre, v_t12, 'lesson');

END $$;

COMMIT;
