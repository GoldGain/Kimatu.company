-- SCHOOL-WIDE TIMETABLE GENERATION SYSTEM
-- Complete system for managing school timetables with automatic scheduling

-- 1. Time slots configuration table
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type VARCHAR(20) DEFAULT 'lesson',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_slots_school_id ON public.time_slots(school_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_order ON public.time_slots(school_id, slot_order);

-- 2. Teacher subject assignments
CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lessons_per_week INTEGER DEFAULT 5,
  is_morning_priority BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher_id ON public.teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_class_id ON public.teacher_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_subject_id ON public.teacher_subject_assignments(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_subject_assignments_unique ON public.teacher_subject_assignments(teacher_id, class_id, subject_id);

-- 3. After-school activities
CREATE TABLE IF NOT EXISTS public.after_school_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  activity_name VARCHAR(100) NOT NULL,
  start_time TIME DEFAULT '15:20',
  end_time TIME DEFAULT '16:20',
  target_classes TEXT[] DEFAULT ARRAY['all'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_after_school_activities_school_id ON public.after_school_activities(school_id);
CREATE INDEX IF NOT EXISTS idx_after_school_activities_day ON public.after_school_activities(school_id, day_of_week);

-- 4. Timetable entries (the generated schedule)
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_break BOOLEAN DEFAULT false,
  is_lunch BOOLEAN DEFAULT false,
  is_activity BOOLEAN DEFAULT false,
  activity_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_school_id ON public.timetable_entries(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_class_id ON public.timetable_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher_id ON public.timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_day_slot ON public.timetable_entries(school_id, day_of_week, time_slot_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_entries_unique ON public.timetable_entries(school_id, day_of_week, time_slot_id, class_id);

-- 5. School timetable configuration
CREATE TABLE IF NOT EXISTS public.school_timetable_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE UNIQUE,
  school_start_time TIME DEFAULT '08:20',
  school_end_time TIME DEFAULT '16:20',
  morning_break_start TIME DEFAULT '10:20',
  morning_break_end TIME DEFAULT '10:50',
  lunch_break_start TIME DEFAULT '12:10',
  lunch_break_end TIME DEFAULT '13:00',
  afternoon_break_start TIME DEFAULT '15:00',
  afternoon_break_end TIME DEFAULT '15:20',
  lesson_duration_minutes INTEGER DEFAULT 40,
  timetable_generated_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_timetable_config_school_id ON public.school_timetable_config(school_id);

-- 6. Enable RLS on all tables
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.after_school_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_config ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for time_slots
CREATE POLICY "time_slots_school_admin_read" ON public.time_slots
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher', 'student')
    )
  );

CREATE POLICY "time_slots_school_admin_write" ON public.time_slots
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 8. RLS Policies for teacher_subject_assignments
CREATE POLICY "teacher_subject_assignments_teacher_read" ON public.teacher_subject_assignments
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
      AND school_id IN (
        SELECT school_id FROM public.profiles WHERE id = teacher_subject_assignments.teacher_id
      )
    )
  );

CREATE POLICY "teacher_subject_assignments_teacher_write" ON public.teacher_subject_assignments
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
  );

CREATE POLICY "teacher_subject_assignments_teacher_update" ON public.teacher_subject_assignments
  FOR UPDATE
  USING (
    teacher_id = auth.uid()
  );

-- 9. RLS Policies for after_school_activities
CREATE POLICY "after_school_activities_school_admin_read" ON public.after_school_activities
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher', 'student')
    )
  );

CREATE POLICY "after_school_activities_school_admin_write" ON public.after_school_activities
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 10. RLS Policies for timetable_entries
CREATE POLICY "timetable_entries_school_read" ON public.timetable_entries
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher')
    ) OR
    class_id IN (
      SELECT class_id FROM public.students 
      WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      JOIN public.students s ON psl.student_id = s.id
      WHERE psl.parent_id = auth.uid() AND s.class_id = timetable_entries.class_id
    )
  );

CREATE POLICY "timetable_entries_school_admin_write" ON public.timetable_entries
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 11. RLS Policies for school_timetable_config
CREATE POLICY "school_timetable_config_school_admin_read" ON public.school_timetable_config
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher', 'student')
    )
  );

CREATE POLICY "school_timetable_config_school_admin_write" ON public.school_timetable_config
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "school_timetable_config_school_admin_update" ON public.school_timetable_config
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 12. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_slots_updated_at_trigger
BEFORE UPDATE ON public.time_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER teacher_subject_assignments_updated_at_trigger
BEFORE UPDATE ON public.teacher_subject_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER after_school_activities_updated_at_trigger
BEFORE UPDATE ON public.after_school_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER timetable_entries_updated_at_trigger
BEFORE UPDATE ON public.timetable_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER school_timetable_config_updated_at_trigger
BEFORE UPDATE ON public.school_timetable_config
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- 13. Verify tables were created
SELECT 'School timetable system tables created successfully' AS status;
