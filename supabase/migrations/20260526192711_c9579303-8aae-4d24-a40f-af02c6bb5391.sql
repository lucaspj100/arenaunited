ALTER TABLE public.interviews REPLICA IDENTITY FULL;
ALTER TABLE public.enrollments REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;