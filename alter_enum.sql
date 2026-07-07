DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN 
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'student', 'parent'); 
  ELSE 
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'school_admin') THEN 
      ALTER TYPE public.user_role ADD VALUE 'school_admin'; 
    END IF; 
  END IF; 
END $$;
