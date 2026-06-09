// Add this to your src/types/database.ts file in the Tables section

export interface StudentPromotion {
  id: string;
  student_id: string;
  school_id: string;
  from_class_id: string;
  to_class_id: string;
  promotion_date: string;
  academic_year: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Add to Database.public.Tables:
/*
student_promotions: {
  Row: {
    id: string;
    student_id: string;
    school_id: string;
    from_class_id: string;
    to_class_id: string;
    promotion_date: string;
    academic_year: string;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: Partial<Tables['student_promotions']['Row']>;
  Update: Partial<Tables['student_promotions']['Row']>;
};
*/
