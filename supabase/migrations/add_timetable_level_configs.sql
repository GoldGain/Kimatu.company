-- Migration: Add timetable level configs table for per-level timetable configuration
-- Each school can configure different timings for each level group

CREATE TABLE IF NOT EXISTS timetable_level_configs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_group VARCHAR(50) NOT NULL,
  -- e.g. 'pre-primary', 'lower-primary', 'upper-primary', 'combined-primary', 'junior', 'senior', 'form-3-4'
  start_time TIME NOT NULL DEFAULT '08:20',
  end_time TIME NOT NULL DEFAULT '15:40',
  period_duration INTEGER NOT NULL DEFAULT 40,
  first_break_start TIME DEFAULT '09:40',
  first_break_end TIME DEFAULT '10:20',
  second_break_start TIME DEFAULT '11:40',
  second_break_end TIME DEFAULT '12:20',
  lunch_start TIME DEFAULT '12:50',
  lunch_end TIME DEFAULT '13:30',
  activities_start TIME DEFAULT '15:40',
  activities_end TIME DEFAULT '16:20',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(school_id, level_group)
);

-- Enable RLS
ALTER TABLE timetable_level_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: school admins can manage their own school's configs
CREATE POLICY "School admins can manage timetable level configs"
  ON timetable_level_configs
  FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow read for all authenticated users in the same school
CREATE POLICY "School members can read timetable level configs"
  ON timetable_level_configs
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );
