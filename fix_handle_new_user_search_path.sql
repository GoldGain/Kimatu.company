-- Fix: handle_new_user trigger function missing search_path
-- 
-- Root Cause:
--   The handle_new_user() function was defined without SET search_path = public.
--   When Supabase Auth calls this trigger after a new user signs up, it executes
--   in the 'auth' schema context. Without an explicit search_path, PostgreSQL
--   cannot resolve the 'user_role' enum type (defined in the 'public' schema),
--   causing: ERROR 42704 - type "user_role" does not exist.
--   This manifested as a 500 Internal Server Error on every student creation attempt.
--
-- Fix:
--   Recreate the function with SET search_path = public so that the user_role
--   enum and the profiles table are always resolved in the correct schema.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    first_name, 
    last_name, 
    school_id, 
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'school_id')::UUID, NULL),
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;
