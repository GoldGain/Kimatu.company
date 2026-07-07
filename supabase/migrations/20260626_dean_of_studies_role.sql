-- Migration: Add is_dean_of_studies column to teachers table
-- Allows a teacher to be designated as Dean of Studies for a school

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS is_dean_of_studies BOOLEAN DEFAULT FALSE;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_teachers_is_dean_of_studies
  ON teachers (school_id, is_dean_of_studies)
  WHERE is_dean_of_studies = TRUE;

-- Comment
COMMENT ON COLUMN teachers.is_dean_of_studies IS
  'When true, this teacher has the Dean of Studies role and can access the DoS dashboard';
