-- SUPABASE MIGRATIONS FOR TEACHER PRODUCTIVITY FEATURES
-- Run these SQL commands in your Supabase SQL Editor
-- ============================================================

-- 1. Create curriculum_topics table
CREATE TABLE IF NOT EXISTS public.curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level VARCHAR(20) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  topic_name VARCHAR(255) NOT NULL,
  sub_topic VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_grade_subject ON public.curriculum_topics(grade_level, subject);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_grade ON public.curriculum_topics(grade_level);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_subject ON public.curriculum_topics(subject);

-- 2. Create school_hours_config table
CREATE TABLE IF NOT EXISTS public.school_hours_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME,
  break_end_time TIME,
  lunch_start_time TIME,
  lunch_end_time TIME,
  period_duration_minutes INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_hours_config_school_id ON public.school_hours_config(school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_hours_config_school_day ON public.school_hours_config(school_id, day_of_week);

-- 3. Create teacher_timetables table
CREATE TABLE IF NOT EXISTS public.teacher_timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  term VARCHAR(20) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  timetable_data JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_timetables_teacher_id ON public.teacher_timetables(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_timetables_class_id ON public.teacher_timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_timetables_school_id ON public.teacher_timetables(school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_timetables_unique ON public.teacher_timetables(teacher_id, class_id, term, academic_year);

-- 4. Create exam_timetables table
CREATE TABLE IF NOT EXISTS public.exam_timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  exam_period VARCHAR(50) NOT NULL,
  term VARCHAR(20) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  exam_schedule JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_timetables_school_id ON public.exam_timetables(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_timetables_class_id ON public.exam_timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_timetables_exam_period ON public.exam_timetables(exam_period);

-- 5. Create generated_exams table
CREATE TABLE IF NOT EXISTS public.generated_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.curriculum_topics(id) ON DELETE SET NULL,
  exam_title VARCHAR(255),
  exam_content JSONB NOT NULL,
  marking_scheme JSONB,
  total_marks INTEGER,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_exams_teacher_id ON public.generated_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_generated_exams_class_id ON public.generated_exams(class_id);
CREATE INDEX IF NOT EXISTS idx_generated_exams_subject_id ON public.generated_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_generated_exams_topic_id ON public.generated_exams(topic_id);

-- 6. Create lesson_plans table
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.curriculum_topics(id) ON DELETE SET NULL,
  lesson_title VARCHAR(255),
  lesson_content JSONB NOT NULL,
  duration_periods INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_id ON public.lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class_id ON public.lesson_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject_id ON public.lesson_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_topic_id ON public.lesson_plans(topic_id);

-- 7. Create schemes_of_work table
CREATE TABLE IF NOT EXISTS public.schemes_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  term VARCHAR(20) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  scheme_content JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemes_of_work_teacher_id ON public.schemes_of_work(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schemes_of_work_class_id ON public.schemes_of_work(class_id);
CREATE INDEX IF NOT EXISTS idx_schemes_of_work_subject_id ON public.schemes_of_work(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schemes_of_work_unique ON public.schemes_of_work(teacher_id, class_id, subject_id, term, academic_year);

-- 8. Create past_papers table
CREATE TABLE IF NOT EXISTS public.past_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  term VARCHAR(20) NOT NULL,
  paper_type VARCHAR(20) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_past_papers_school_id ON public.past_papers(school_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_id ON public.past_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_class_id ON public.past_papers(class_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_year_term ON public.past_papers(year, term);

-- 9. Enable RLS on all new tables
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_hours_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for curriculum_topics (public read access)
CREATE POLICY "curriculum_topics_public_read" ON public.curriculum_topics
  FOR SELECT
  USING (TRUE);

-- 11. Create RLS policies for school_hours_config
CREATE POLICY "school_hours_config_school_admin_read" ON public.school_hours_config
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher')
    )
  );

CREATE POLICY "school_hours_config_school_admin_write" ON public.school_hours_config
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 12. Create RLS policies for teacher_timetables
CREATE POLICY "teacher_timetables_teacher_read" ON public.teacher_timetables
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "teacher_timetables_teacher_write" ON public.teacher_timetables
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
  );

CREATE POLICY "teacher_timetables_teacher_update" ON public.teacher_timetables
  FOR UPDATE
  USING (
    teacher_id = auth.uid()
  );

-- 13. Create RLS policies for exam_timetables
CREATE POLICY "exam_timetables_school_admin_read" ON public.exam_timetables
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher')
    )
  );

CREATE POLICY "exam_timetables_school_admin_write" ON public.exam_timetables
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 14. Create RLS policies for generated_exams
CREATE POLICY "generated_exams_teacher_read" ON public.generated_exams
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "generated_exams_teacher_write" ON public.generated_exams
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
  );

-- 15. Create RLS policies for lesson_plans
CREATE POLICY "lesson_plans_teacher_read" ON public.lesson_plans
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "lesson_plans_teacher_write" ON public.lesson_plans
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
  );

-- 16. Create RLS policies for schemes_of_work
CREATE POLICY "schemes_of_work_teacher_read" ON public.schemes_of_work
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "schemes_of_work_teacher_write" ON public.schemes_of_work
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
  );

-- 17. Create RLS policies for past_papers
CREATE POLICY "past_papers_school_read" ON public.past_papers
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('school_admin', 'teacher')
    )
  );

CREATE POLICY "past_papers_school_admin_write" ON public.past_papers
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 18. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER curriculum_topics_updated_at_trigger
BEFORE UPDATE ON public.curriculum_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER school_hours_config_updated_at_trigger
BEFORE UPDATE ON public.school_hours_config
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER teacher_timetables_updated_at_trigger
BEFORE UPDATE ON public.teacher_timetables
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER exam_timetables_updated_at_trigger
BEFORE UPDATE ON public.exam_timetables
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER generated_exams_updated_at_trigger
BEFORE UPDATE ON public.generated_exams
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER lesson_plans_updated_at_trigger
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER schemes_of_work_updated_at_trigger
BEFORE UPDATE ON public.schemes_of_work
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER past_papers_updated_at_trigger
BEFORE UPDATE ON public.past_papers
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- 19. Verify tables were created
SELECT 'All teacher features tables created successfully' AS status;
