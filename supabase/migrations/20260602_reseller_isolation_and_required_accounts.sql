-- CBE-Analytics hardening: required account profiles, reseller isolation, and tenant-safe RLS.
-- This migration is intentionally idempotent so it can be re-run safely.

BEGIN;

-- Schools owned by a reseller/super-admin. Existing schools are assigned to the master account below.
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS owner_id UUID NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS paystack_public_key TEXT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS paystack_secret_key TEXT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS paystack_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS paystack_currency TEXT NOT NULL DEFAULT 'KES';

-- Keep required profile records correct when the auth users already exist.
WITH master_user AS (
  SELECT id FROM auth.users WHERE lower(email) = 'martinmakau2005@gmail.com' LIMIT 1
)
UPDATE public.profiles p
SET role = 'super_admin'::user_role,
    first_name = 'Martin',
    last_name = 'Makau',
    school_id = NULL,
    is_active = true,
    updated_at = NOW()
FROM master_user u
WHERE p.id = u.id OR lower(p.email) = 'martinmakau2005@gmail.com';

WITH reseller_user AS (
  SELECT id FROM auth.users WHERE lower(email) = 'theophillusngewa@gmail.com' LIMIT 1
)
UPDATE public.profiles p
SET role = 'super_admin'::user_role,
    first_name = 'Theophillus',
    last_name = 'Ngewa',
    school_id = NULL,
    is_active = true,
    updated_at = NOW()
FROM reseller_user u
WHERE p.id = u.id OR lower(p.email) = 'theophillusngewa@gmail.com';

-- Assign all legacy unowned schools to the master super admin, preserving isolation for new reseller schools.
WITH master_user AS (
  SELECT id FROM auth.users WHERE lower(email) = 'martinmakau2005@gmail.com' LIMIT 1
)
UPDATE public.schools s
SET owner_id = u.id
FROM master_user u
WHERE s.owner_id IS NULL;

ALTER TABLE public.schools ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.current_profile_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.is_master_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'super_admin'::user_role
      AND lower(email) = 'martinmakau2005@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id = p_school_id
        AND s.owner_id = auth.uid()
        AND public.current_profile_role() = 'super_admin'::user_role
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.school_id = p_school_id
        AND p.role IN ('school_admin'::user_role, 'teacher'::user_role, 'student'::user_role, 'parent'::user_role)
    )
$$;

CREATE OR REPLACE FUNCTION public.set_school_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_school_owner_id_before_insert ON public.schools;
CREATE TRIGGER set_school_owner_id_before_insert
BEFORE INSERT ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.set_school_owner_id();

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Schools: master sees all; reseller super-admin sees owned schools; school users see their assigned school.
DROP POLICY IF EXISTS schools_tenant_select ON public.schools;
CREATE POLICY schools_tenant_select ON public.schools
FOR SELECT USING (
  public.is_master_super_admin()
  OR owner_id = auth.uid()
  OR id = public.current_profile_school_id()
);

DROP POLICY IF EXISTS schools_tenant_insert ON public.schools;
CREATE POLICY schools_tenant_insert ON public.schools
FOR INSERT WITH CHECK (
  public.current_profile_role() = 'super_admin'::user_role
  AND (public.is_master_super_admin() OR owner_id = auth.uid() OR owner_id IS NULL)
);

DROP POLICY IF EXISTS schools_tenant_update ON public.schools;
CREATE POLICY schools_tenant_update ON public.schools
FOR UPDATE USING (
  public.is_master_super_admin() OR owner_id = auth.uid()
) WITH CHECK (
  public.is_master_super_admin() OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS schools_master_delete ON public.schools;
CREATE POLICY schools_master_delete ON public.schools
FOR DELETE USING (public.is_master_super_admin());

-- Profiles: own profile; master; owning reseller for users in owned schools; school admin for own school users.
DROP POLICY IF EXISTS profiles_tenant_select ON public.profiles;
CREATE POLICY profiles_tenant_select ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id))
  OR (role = 'super_admin'::user_role AND id = auth.uid())
);

DROP POLICY IF EXISTS profiles_tenant_update ON public.profiles;
CREATE POLICY profiles_tenant_update ON public.profiles
FOR UPDATE USING (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id) AND public.current_profile_role() IN ('super_admin'::user_role, 'school_admin'::user_role))
) WITH CHECK (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id) AND public.current_profile_role() IN ('super_admin'::user_role, 'school_admin'::user_role))
);

DROP POLICY IF EXISTS profiles_tenant_insert ON public.profiles;
CREATE POLICY profiles_tenant_insert ON public.profiles
FOR INSERT WITH CHECK (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id) AND public.current_profile_role() IN ('super_admin'::user_role, 'school_admin'::user_role))
);

-- Generic school_id tables.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'classes','subjects','students','teachers','results','fee_invoices','fee_payments','fee_structures',
    'terms','attendance','timetable','announcements','homework','notifications'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_select ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_select ON public.%I FOR SELECT USING (public.can_access_school(school_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_insert ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_insert ON public.%I FOR INSERT WITH CHECK (public.can_access_school(school_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_update ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_update ON public.%I FOR UPDATE USING (public.can_access_school(school_id)) WITH CHECK (public.can_access_school(school_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_delete ON public.%I FOR DELETE USING (public.can_access_school(school_id))', t, t);
  END LOOP;
END $$;

-- Tables whose school is reached through another row.
DROP POLICY IF EXISTS homework_submissions_tenant_select ON public.homework_submissions;
CREATE POLICY homework_submissions_tenant_select ON public.homework_submissions
FOR SELECT USING (EXISTS (SELECT 1 FROM public.homework h WHERE h.id = homework_id AND public.can_access_school(h.school_id)));
DROP POLICY IF EXISTS homework_submissions_tenant_insert ON public.homework_submissions;
CREATE POLICY homework_submissions_tenant_insert ON public.homework_submissions
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.homework h WHERE h.id = homework_id AND public.can_access_school(h.school_id)));
DROP POLICY IF EXISTS homework_submissions_tenant_update ON public.homework_submissions;
CREATE POLICY homework_submissions_tenant_update ON public.homework_submissions
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.homework h WHERE h.id = homework_id AND public.can_access_school(h.school_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.homework h WHERE h.id = homework_id AND public.can_access_school(h.school_id)));

DROP POLICY IF EXISTS parent_student_links_tenant_select ON public.parent_student_links;
CREATE POLICY parent_student_links_tenant_select ON public.parent_student_links
FOR SELECT USING (
  parent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND public.can_access_school(s.school_id))
);
DROP POLICY IF EXISTS parent_student_links_tenant_insert ON public.parent_student_links;
CREATE POLICY parent_student_links_tenant_insert ON public.parent_student_links
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND public.can_access_school(s.school_id)));
DROP POLICY IF EXISTS parent_student_links_tenant_update ON public.parent_student_links;
CREATE POLICY parent_student_links_tenant_update ON public.parent_student_links
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND public.can_access_school(s.school_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND public.can_access_school(s.school_id)));

DROP POLICY IF EXISTS platform_settings_master_only ON public.platform_settings;
CREATE POLICY platform_settings_master_only ON public.platform_settings
FOR ALL USING (public.is_master_super_admin()) WITH CHECK (public.is_master_super_admin());

COMMIT;
