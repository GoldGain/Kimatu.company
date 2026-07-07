-- Add teacher_number column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_number INTEGER UNIQUE;

-- Create a function to auto-assign teacher numbers
CREATE OR REPLACE FUNCTION assign_teacher_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'teacher' AND NEW.teacher_number IS NULL THEN
    NEW.teacher_number := (
      SELECT COALESCE(MAX(teacher_number), 0) + 1
      FROM users
      WHERE school_id = NEW.school_id AND role = 'teacher'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS auto_assign_teacher_number ON users;
CREATE TRIGGER auto_assign_teacher_number
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION assign_teacher_number();

-- Refactor teacher_subject_assignments to support admin-led assignment
ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS assigned_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP DEFAULT NOW();

-- Create a view for teacher assignments with teacher details
CREATE OR REPLACE VIEW teacher_assignment_details AS
SELECT
  tsa.id,
  tsa.teacher_id,
  u.full_name AS teacher_name,
  u.teacher_number,
  tsa.class_id,
  c.name AS class_name,
  tsa.subject_id,
  s.name AS subject_name,
  tsa.lessons_per_week,
  tsa.is_priority,
  tsa.assigned_by_admin,
  tsa.assignment_date,
  u.school_id
FROM teacher_subject_assignments tsa
JOIN users u ON tsa.teacher_id = u.id
JOIN classes c ON tsa.class_id = c.id
JOIN subjects s ON tsa.subject_id = s.id;

-- Update RLS policies for teacher_subject_assignments to allow admin assignment
CREATE POLICY "School admins can assign teachers" ON teacher_subject_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'school_admin'
      AND school_id = (
        SELECT school_id FROM users WHERE id = teacher_id
      )
    )
  );

-- Add policy to allow admins to update assignments
CREATE POLICY "School admins can update assignments" ON teacher_subject_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'school_admin'
      AND school_id = (
        SELECT school_id FROM users WHERE id = teacher_id
      )
    )
  );

-- Add policy to allow admins to delete assignments
CREATE POLICY "School admins can delete assignments" ON teacher_subject_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'school_admin'
      AND school_id = (
        SELECT school_id FROM users WHERE id = teacher_id
      )
    )
  );
