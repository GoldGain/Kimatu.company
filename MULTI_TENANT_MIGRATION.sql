-- ============================================================
-- CBE-Analytics Multi-Tenant Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add new roles to the user_role enum (if it exists as enum)
-- First check if the enum exists and add new values
DO $$
BEGIN
  -- Add master_super_admin role
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'master_super_admin';
  EXCEPTION WHEN others THEN
    NULL;
  END;
  -- Add reseller_super_admin role
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reseller_super_admin';
  EXCEPTION WHEN others THEN
    NULL;
  END;
END$$;

-- 2. Create resellers table
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  -- Paystack keys (per reseller)
  paystack_public_key TEXT,
  paystack_secret_key TEXT,
  parent_pay_enabled BOOLEAN DEFAULT FALSE,
  view_results_fee INTEGER DEFAULT 50,
  pdf_report_fee INTEGER DEFAULT 50,
  -- Stats (denormalized for performance)
  total_schools INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add reseller_id to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS parent_pay_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS view_results_fee INTEGER DEFAULT 50;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS pdf_report_fee INTEGER DEFAULT 50;

-- 4. Add reseller_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;

-- 5. Create parent_payments table for tracking Paystack payments
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

-- 6. Enable RLS on new tables
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for resellers table
-- Master super admin can see all resellers
CREATE POLICY IF NOT EXISTS "master_admin_all_resellers" ON public.resellers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'master_super_admin'
    )
  );

-- Reseller can see only their own record
CREATE POLICY IF NOT EXISTS "reseller_own_record" ON public.resellers
  FOR SELECT
  USING (user_id = auth.uid());

-- 8. RLS Policies for parent_payments
-- Master admin sees all
CREATE POLICY IF NOT EXISTS "master_admin_all_payments" ON public.parent_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'master_super_admin'
    )
  );

-- Reseller sees only their payments
CREATE POLICY IF NOT EXISTS "reseller_own_payments" ON public.parent_payments
  FOR SELECT
  USING (
    reseller_id IN (
      SELECT id FROM public.resellers WHERE user_id = auth.uid()
    )
  );

-- School admin sees only their school payments
CREATE POLICY IF NOT EXISTS "school_admin_own_payments" ON public.parent_payments
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- Parent can insert and see own payments
CREATE POLICY IF NOT EXISTS "parent_own_payments" ON public.parent_payments
  FOR ALL
  USING (parent_id = auth.uid());

-- 9. Update schools RLS to include reseller isolation
-- Reseller super admin sees only their schools
DROP POLICY IF EXISTS "reseller_own_schools" ON public.schools;
CREATE POLICY "reseller_own_schools" ON public.schools
  FOR SELECT
  USING (
    reseller_id IN (
      SELECT id FROM public.resellers WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('master_super_admin', 'super_admin')
    )
    OR
    id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_resellers_user_id ON public.resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_resellers_status ON public.resellers(status);
CREATE INDEX IF NOT EXISTS idx_schools_reseller_id ON public.schools(reseller_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_reseller_id ON public.parent_payments(reseller_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_school_id ON public.parent_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_status ON public.parent_payments(status);
CREATE INDEX IF NOT EXISTS idx_profiles_reseller_id ON public.profiles(reseller_id);

-- 11. Update trigger for resellers updated_at
CREATE OR REPLACE FUNCTION public.update_resellers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resellers_updated_at_trigger ON public.resellers;
CREATE TRIGGER resellers_updated_at_trigger
BEFORE UPDATE ON public.resellers
FOR EACH ROW
EXECUTE FUNCTION public.update_resellers_updated_at();

SELECT 'Multi-tenant migration completed successfully' AS status;
