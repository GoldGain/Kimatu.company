-- Migration: Digital Signatures & Fee Opening Balance
-- Date: 2026-06-16

-- 1. Add principal signature fields to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS principal_signature_url TEXT,
ADD COLUMN IF NOT EXISTS principal_signature_type TEXT CHECK (principal_signature_type IN ('drawn', 'uploaded'));

-- 2. Add signature fields to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS signature_type TEXT CHECK (signature_type IN ('drawn', 'uploaded'));

-- 3. Add opening balance to fee_invoices for balance forwarding
ALTER TABLE fee_invoices 
ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;

-- 4. Add fee components tracking to fee_payments
ALTER TABLE fee_payments 
ADD COLUMN IF NOT EXISTS allocated_to TEXT DEFAULT 'general';

-- 5. Add school logo URL tracking (already exists in branding, ensure it's accessible)
-- schools.logo_url already exists from branding page

-- 6. Create index for faster signature lookups
CREATE INDEX IF NOT EXISTS idx_teachers_signature ON teachers(school_id, id);

-- 7. Update existing schools to have null signatures (default)
UPDATE schools SET principal_signature_type = NULL WHERE principal_signature_url IS NULL;
UPDATE teachers SET signature_type = NULL WHERE signature_url IS NULL;
