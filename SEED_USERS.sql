-- ============================================================
-- CBE-Analytics User Seed Script
-- Run in Supabase SQL Editor (with service role)
-- ============================================================
-- NOTE: Auth users must be created via Supabase Dashboard > Authentication > Users
-- OR via the Supabase Admin API. This script seeds the profiles table
-- after auth users are created.
-- ============================================================

-- STEP 1: Run this AFTER creating auth users in Supabase Dashboard
-- Create auth users with these credentials:
--
-- 1. martinmakau2005@gmail.com / #Martin123456789 (master_super_admin)
-- 2. theophillusngewa@gmail.com / 123456789 (reseller_super_admin)
-- 3. demoreseller@school.com / Demo@2025 (reseller_super_admin)
-- 4. admin@greenfield.ac.ke / admin@2025! (school_admin)
-- 5. teacher@greenfield.ac.ke / Teacher@2025! (teacher)
-- 6. parent@greenfield.ac.ke / parent@2025! (parent)
-- 7. student@demo.edu / student@2025 (student)

-- ============================================================
-- STEP 2: Update profiles with correct roles
-- Run this after creating auth users - replace UUIDs with actual user IDs
-- ============================================================

-- Get user IDs from auth.users
-- SELECT id, email FROM auth.users WHERE email IN (
--   'martinmakau2005@gmail.com',
--   'theophillusngewa@gmail.com',
--   'demoreseller@school.com',
--   'admin@greenfield.ac.ke',
--   'teacher@greenfield.ac.ke',
--   'parent@greenfield.ac.ke',
--   'student@demo.edu'
-- );

-- ============================================================
-- STEP 3: Ensure user_role enum has new values
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'master_super_admin';
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reseller_super_admin';
  EXCEPTION WHEN others THEN NULL;
  END;
END$$;

-- ============================================================
-- STEP 4: Create resellers table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  paystack_public_key TEXT,
  paystack_secret_key TEXT,
  parent_pay_enabled BOOLEAN DEFAULT FALSE,
  view_results_fee INTEGER DEFAULT 50,
  pdf_report_fee INTEGER DEFAULT 50,
  total_schools INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- STEP 5: Add columns to existing tables
-- ============================================================
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS parent_pay_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS view_results_fee INTEGER DEFAULT 50;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS pdf_report_fee INTEGER DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 6: Create parent_payments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  parent_name TEXT,
  student_name TEXT,
  school_name TEXT,
  reseller_name TEXT,
  amount INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('view_results', 'pdf_report')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  paystack_reference TEXT,
  paystack_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- STEP 7: Seed Theophillus reseller record
-- (Replace 'THEOPHILLUS_USER_ID' with actual UUID from auth.users)
-- ============================================================
INSERT INTO public.resellers (name, email, phone, status, paystack_public_key, parent_pay_enabled, view_results_fee, pdf_report_fee)
VALUES (
  'Theophillus Ngewa',
  'theophillusngewa@gmail.com',
  '',
  'active',
  'pk_live_c15b4c6c95f06f7408326b14395eb727147a8935',
  TRUE,
  50,
  50
)
ON CONFLICT (email) DO UPDATE SET
  paystack_public_key = EXCLUDED.paystack_public_key,
  parent_pay_enabled = EXCLUDED.parent_pay_enabled;

-- ============================================================
-- STEP 8: Seed Demo reseller record
-- ============================================================
INSERT INTO public.resellers (name, email, phone, status, parent_pay_enabled)
VALUES (
  'Demo Reseller',
  'demoreseller@school.com',
  '',
  'active',
  FALSE
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- STEP 9: Update profiles roles
-- Run AFTER creating auth users and getting their UUIDs
-- ============================================================
-- UPDATE public.profiles SET role = 'master_super_admin' WHERE email = 'martinmakau2005@gmail.com';
-- UPDATE public.profiles SET role = 'reseller_super_admin' WHERE email = 'theophillusngewa@gmail.com';
-- UPDATE public.profiles SET role = 'reseller_super_admin' WHERE email = 'demoreseller@school.com';

-- Link reseller user_id after getting auth user IDs:
-- UPDATE public.resellers SET user_id = (SELECT id FROM auth.users WHERE email = 'theophillusngewa@gmail.com') WHERE email = 'theophillusngewa@gmail.com';
-- UPDATE public.resellers SET user_id = (SELECT id FROM auth.users WHERE email = 'demoreseller@school.com') WHERE email = 'demoreseller@school.com';

-- ============================================================
-- STEP 10: Enable RLS on new tables
-- ============================================================
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_payments ENABLE ROW LEVEL SECURITY;

-- RLS: Master admin sees all
DROP POLICY IF EXISTS "master_admin_all_resellers" ON public.resellers;
CREATE POLICY "master_admin_all_resellers" ON public.resellers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master_super_admin')
  );

DROP POLICY IF EXISTS "reseller_own_record" ON public.resellers;
CREATE POLICY "reseller_own_record" ON public.resellers
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "master_admin_all_payments" ON public.parent_payments;
CREATE POLICY "master_admin_all_payments" ON public.parent_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master_super_admin')
  );

DROP POLICY IF EXISTS "reseller_own_payments" ON public.parent_payments;
CREATE POLICY "reseller_own_payments" ON public.parent_payments
  FOR SELECT USING (
    reseller_id IN (SELECT id FROM public.resellers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "parent_own_payments" ON public.parent_payments;
CREATE POLICY "parent_own_payments" ON public.parent_payments
  FOR ALL USING (parent_id = auth.uid());

-- ============================================================
-- STEP 11: Create indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_resellers_user_id ON public.resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_reseller_id ON public.schools(reseller_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_reseller_id ON public.parent_payments(reseller_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_school_id ON public.parent_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_reseller_id ON public.profiles(reseller_id);

SELECT 'CBE-Analytics seed completed successfully' AS status;
