export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CurriculumType = 'CBE' | '';
export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';
export type SubscriptionPlan = 'trial' | 'basic' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'suspended' | 'expired' | 'trial';
export type SchoolStatus = 'active' | 'suspended' | 'inactive';
export type GenderType = 'male' | 'female' | 'other';
export type TermType = 'Term 1' | 'Term 2' | 'Term 3';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type FeeStatus = 'paid' | 'partial' | 'unpaid' | 'waived';
export type PaymentMethod = 'mpesa' | 'bank' | 'cash' | 'cheque' | 'other';
export type ResultStatus = 'draft' | 'submitted' | 'approved' | 'published';
export type CBEGrade = 'EE' | 'ME' | 'AE' | 'BE';
export type CBESublevel = 'EE1' | 'EE2' | 'ME1' | 'ME2' | 'AE1' | 'AE2' | 'BE1' | 'BE2';
export type AnnouncementType = 'general' | 'fee_reminder' | 'exam' | 'event' | 'emergency';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          code: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          county: string | null;
          sub_county: string | null;
          logo_url: string | null;
          website: string | null;
          curriculum: CurriculumType[] | null;
          subscription_plan: SubscriptionPlan | null;
          subscription_status: SubscriptionStatus | null;
          subscription_expires_at: string | null;
          monthly_fee_ksh: number | null;
          status: SchoolStatus | null;
          principal_name: string | null;
          principal_phone: string | null;
          max_students: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['schools']['Row']>;
        Update: Partial<Tables['schools']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          school_id: string | null;
          role: UserRole;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          gender: GenderType | null;
          date_of_birth: string | null;
          avatar_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['profiles']['Row']>;
        Update: Partial<Tables['profiles']['Row']>;
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          level: number;
          curriculum: CurriculumType;
          stream: string | null;
          capacity: number | null;
          class_teacher_id: string | null;
          academic_year: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['classes']['Row']>;
        Update: Partial<Tables['classes']['Row']>;
      };
      subjects: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          code: string | null;
          curriculum: CurriculumType;
          class_levels: number[] | null;
          is_core: boolean | null;
          max_marks: number | null;
          pass_mark: number | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['subjects']['Row']>;
        Update: Partial<Tables['subjects']['Row']>;
      };
      students: {
        Row: {
          id: string;
          profile_id: string | null;
          school_id: string;
          admission_number: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          gender: GenderType | null;
          class_id: string | null;
          curriculum: CurriculumType;
          parent_id: string | null;
          parent_name: string | null;
          parent_phone: string | null;
          parent_email: string | null;
          parent2_name: string | null;
          parent2_phone: string | null;
          address: string | null;
          photo_url: string | null;
          blood_group: string | null;
          medical_notes: string | null;
          is_active: boolean | null;
          enrollment_date: string | null;
          academic_year: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['students']['Row']>;
        Update: Partial<Tables['students']['Row']>;
      };
      teachers: {
        Row: {
          id: string;
          profile_id: string | null;
          school_id: string;
          employee_number: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          gender: GenderType | null;
          date_of_birth: string | null;
          qualification: string | null;
          specialization: string | null;
          tsc_number: string | null;
          is_active: boolean | null;
          hire_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['teachers']['Row']>;
        Update: Partial<Tables['teachers']['Row']>;
      };
      results: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string;
          term_id: string;
          academic_year: string | null;
          curriculum: CurriculumType;
          marks: number | null;
          out_of: number | null;
          cbc_sublevel: CBESublevel | null;
          cbc_grade: CBEGrade | null;
          cbc_points: number | null;
          cbc_descriptor: string | null;
          grade_: string | null;
          points_: number | null;
          percentage_: number | null;
          remarks: string | null;
          teacher_comment: string | null;
          status: ResultStatus | null;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['results']['Row']>;
        Update: Partial<Tables['results']['Row']>;
      };
      fee_invoices: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          term_id: string;
          academic_year: string | null;
          total_amount: number | null;
          amount_paid: number | null;
          balance: number | null;
          status: FeeStatus | null;
          due_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['fee_invoices']['Row']>;
        Update: Partial<Tables['fee_invoices']['Row']>;
      };
      fee_payments: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          invoice_id: string;
          amount: number;
          payment_method: PaymentMethod;
          mpesa_reference: string | null;
          mpesa_phone: string | null;
          bank_reference: string | null;
          receipt_number: string | null;
          payment_date: string | null;
          recorded_by: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['fee_payments']['Row']>;
        Update: Partial<Tables['fee_payments']['Row']>;
      };
      attendance: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          class_id: string;
          teacher_id: string;
          date: string;
          status: AttendanceStatus;
          remarks: string | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['attendance']['Row']>;
        Update: Partial<Tables['attendance']['Row']>;
      };
      timetable: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          room: string | null;
          academic_year: string | null;
          term_id: string | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['timetable']['Row']>;
        Update: Partial<Tables['timetable']['Row']>;
      };
      announcements: {
        Row: {
          id: string;
          school_id: string;
          title: string;
          content: string;
          type: AnnouncementType | null;
          target_roles: UserRole[] | null;
          target_class_ids: string[] | null;
          is_published: boolean | null;
          published_at: string | null;
          expires_at: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['announcements']['Row']>;
        Update: Partial<Tables['announcements']['Row']>;
      };
      terms: {
        Row: {
          id: string;
          school_id: string;
          name: TermType;
          academic_year: string | null;
          start_date: string;
          end_date: string;
          is_current: boolean | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['terms']['Row']>;
        Update: Partial<Tables['terms']['Row']>;
      };
      homework: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          due_date: string;
          file_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['homework']['Row']>;
        Update: Partial<Tables['homework']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          school_id: string | null;
          title: string;
          message: string;
          type: string | null;
          is_read: boolean | null;
          read_at: string | null;
          action_url: string | null;
          created_at: string | null;
        };
        Insert: Partial<Tables['notifications']['Row']>;
        Update: Partial<Tables['notifications']['Row']>;
      };
      platform_settings: {
        Row: {
          id: string;
          key: string;
          value: string | null;
          description: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Tables['platform_settings']['Row']>;
        Update: Partial<Tables['platform_settings']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables = Database['public']['Tables'];
export type School = Tables['schools']['Row'];
export type Profile = Tables['profiles']['Row'];
export type Class = Tables['classes']['Row'];
export type Subject = Tables['subjects']['Row'];
export type Student = Tables['students']['Row'];
export type Teacher = Tables['teachers']['Row'];
export type Result = Tables['results']['Row'];
export type FeeInvoice = Tables['fee_invoices']['Row'];
export type FeePayment = Tables['fee_payments']['Row'];
export type Attendance = Tables['attendance']['Row'];
export type Timetable = Tables['timetable']['Row'];
export type Announcement = Tables['announcements']['Row'];
export type Term = Tables['terms']['Row'];
export type Homework = Tables['homework']['Row'];
export type Notification = Tables['notifications']['Row'];
