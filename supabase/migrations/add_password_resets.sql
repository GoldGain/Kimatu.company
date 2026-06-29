-- Migration: Add password_resets table for SMS OTP-based password reset

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Only the system (service role) can manage password resets
-- No user-facing RLS needed since this is accessed via edge functions
CREATE POLICY "Service role can manage password resets"
  ON password_resets
  FOR ALL
  USING (true);

-- Index for fast OTP lookup
CREATE INDEX IF NOT EXISTS idx_password_resets_phone ON password_resets(phone);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
