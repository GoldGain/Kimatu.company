CREATE POLICY "school_admin_view_promotions" ON public.student_promotions FOR SELECT USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid() AND role = 'school_admin'));
CREATE POLICY "school_admin_insert_promotions" ON public.student_promotions FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid() AND role = 'school_admin'));
CREATE POLICY "school_admin_update_promotions" ON public.student_promotions FOR UPDATE USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid() AND role = 'school_admin'));
CREATE OR REPLACE FUNCTION public.update_student_promotions_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER student_promotions_updated_at_trigger BEFORE UPDATE ON public.student_promotions FOR EACH ROW EXECUTE FUNCTION public.update_student_promotions_updated_at();
