-- ============================================================
-- Fix Role Hierarchy: Distinguish master_super_admin from reseller_super_admin
-- Run this migration to correct the role assignments in the database
-- ============================================================

BEGIN;

-- 1. Ensure the user_role enum has all required values
DO $$
BEGIN
  -- Add master_super_admin if it doesn't exist
  BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'master_super_admin';
  EXCEPTION WHEN others THEN
    NULL;
  END;
  
  -- Add reseller_super_admin if it doesn't exist
  BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reseller_super_admin';
  EXCEPTION WHEN others THEN
    NULL;
  END;
END$$;

-- 2. Update the master super admin (Martin Makau) to have the correct role
WITH master_user AS (
  SELECT id FROM auth.users WHERE lower(email) = 'martinmakau2005@gmail.com' LIMIT 1
)
UPDATE public.profiles p
SET role = 'master_super_admin'::public.user_role,
    first_name = 'Martin',
    last_name = 'Makau',
    school_id = NULL,
    is_active = true,
    updated_at = NOW()
FROM master_user u
WHERE p.id = u.id;

-- 3. Update reseller super admins (e.g., Theophillus Ngewa) to have the correct role
WITH reseller_user AS (
  SELECT id FROM auth.users WHERE lower(email) = 'theophillusngewa@gmail.com' LIMIT 1
)
UPDATE public.profiles p
SET role = 'reseller_super_admin'::public.user_role,
    first_name = 'Theophillus',
    last_name = 'Ngewa',
    school_id = NULL,
    is_active = true,
    updated_at = NOW()
FROM reseller_user u
WHERE p.id = u.id;

-- 4. Update RLS helper function to recognize master_super_admin
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
      AND role = 'master_super_admin'::public.user_role
      AND lower(email) = 'martinmakau2005@gmail.com'
  )
$$;

-- 5. Update the can_access_school function to handle both master and reseller super admins
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
        AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role)
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.school_id = p_school_id
        AND p.role IN ('school_admin'::public.user_role, 'teacher'::public.user_role, 'student'::public.user_role, 'parent'::public.user_role)
    )
$$;

-- 6. Update schools RLS policies to include master_super_admin
DROP POLICY IF EXISTS schools_tenant_select ON public.schools;
CREATE POLICY schools_tenant_select ON public.schools
FOR SELECT USING (
  public.is_master_super_admin()
  OR (owner_id = auth.uid() AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role))
  OR id = public.current_profile_school_id()
);

DROP POLICY IF EXISTS schools_tenant_insert ON public.schools;
CREATE POLICY schools_tenant_insert ON public.schools
FOR INSERT WITH CHECK (
  public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role, 'master_super_admin'::public.user_role)
  AND (public.is_master_super_admin() OR owner_id = auth.uid() OR owner_id IS NULL)
);

DROP POLICY IF EXISTS schools_tenant_update ON public.schools;
CREATE POLICY schools_tenant_update ON public.schools
FOR UPDATE USING (
  public.is_master_super_admin() OR (owner_id = auth.uid() AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role))
) WITH CHECK (
  public.is_master_super_admin() OR (owner_id = auth.uid() AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role))
);

-- 7. Update profiles RLS policies to include master_super_admin
DROP POLICY IF EXISTS profiles_tenant_select ON public.profiles;
CREATE POLICY profiles_tenant_select ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id))
);

DROP POLICY IF EXISTS profiles_tenant_update ON public.profiles;
CREATE POLICY profiles_tenant_update ON public.profiles
FOR UPDATE USING (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id) AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role, 'school_admin'::public.user_role))
) WITH CHECK (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id) AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role, 'school_admin'::public.user_role))
);

DROP POLICY IF EXISTS profiles_tenant_insert ON public.profiles;
CREATE POLICY profiles_tenant_insert ON public.profiles
FOR INSERT WITH CHECK (
  id = auth.uid()
  OR public.is_master_super_admin()
  OR (school_id IS NOT NULL AND public.can_access_school(school_id) AND public.current_profile_role() IN ('super_admin'::public.user_role, 'reseller_super_admin'::public.user_role, 'school_admin'::public.user_role))
);

-- 8. Update resellers RLS policies
DROP POLICY IF EXISTS master_admin_all_resellers ON public.resellers;
CREATE POLICY master_admin_all_resellers ON public.resellers
FOR ALL
USING (public.is_master_super_admin());

DROP POLICY IF EXISTS reseller_own_record ON public.resellers;
CREATE POLICY reseller_own_record ON public.resellers
FOR SELECT
USING (user_id = auth.uid() OR public.is_master_super_admin());

-- 9. Update parent_payments RLS policies
DROP POLICY IF EXISTS master_admin_all_payments ON public.parent_payments;
CREATE POLICY master_admin_all_payments ON public.parent_payments
FOR ALL
USING (public.is_master_super_admin());

COMMIT;

SELECT 'Role hierarchy fixed successfully' AS status;
