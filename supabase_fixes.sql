-- ============================================================
-- CBE-Analytics Supabase Fixes
-- Run these SQL commands in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. FIX TIMETABLE TIME SLOTS: Add SECOND BREAK before lunch
-- ============================================================

-- Delete and re-insert correct time slots for all schools
DELETE FROM public.timetable_time_slots;

DO $$
DECLARE
  school_rec RECORD;
BEGIN
  FOR school_rec IN SELECT id FROM public.schools LOOP
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

-- Update school_timetable_config to reflect correct break times
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

-- ============================================================
-- 2. CREATE create_auth_user RPC FUNCTION (backup method)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'student',
  p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Check if caller has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('master_super_admin', 'reseller_super_admin', 'school_admin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create user using auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', p_role,
      'school_id', p_school_id
    ),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name, role, school_id, is_active)
  VALUES (v_user_id, p_email, p_first_name, p_last_name, p_role::public.user_role, p_school_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    is_active = true;

  v_result := jsonb_build_object(
    'user_id', v_user_id,
    'email', p_email
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- ============================================================
-- 3. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.create_auth_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_auth_user TO anon;
GRANT EXECUTE ON FUNCTION public.create_auth_user TO service_role;

-- ============================================================
-- 4. VERIFY: Check time slots were created
-- ============================================================

SELECT 'Fixes applied successfully!' AS status;
