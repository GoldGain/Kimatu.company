-- Migration: Add new fields to students table for complete learner registration

ALTER TABLE students ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_cert_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS stream VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS boarding_status VARCHAR(20) DEFAULT 'Day';
ALTER TABLE students ADD COLUMN IF NOT EXISTS relationship_to_learner VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS home_county VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS home_sub_county VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Kenyan';
ALTER TABLE students ADD COLUMN IF NOT EXISTS learner_status VARCHAR(20) DEFAULT 'Active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS previous_school VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_info TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS disability_details TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS transport_route VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS club_memberships TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS additional_emergency_contact VARCHAR(50);
