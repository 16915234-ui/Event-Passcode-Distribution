-- Create Settings Table
CREATE TABLE IF NOT EXISTS public.aru_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

-- Enable RLS and setup permissions
ALTER TABLE public.aru_settings ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (Admin & Staff might need it for dropdowns)
CREATE POLICY settings_read ON public.aru_settings FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.aru_settings TO authenticated;

-- Service Role (API) can modify
GRANT ALL ON public.aru_settings TO service_role;

-- Insert some default arrays if table is empty
INSERT INTO public.aru_settings (key, value)
VALUES 
  ('faculties', '["คณะวิทยาศาสตร์", "คณะครุศาสตร์", "คณะวิทยาการจัดการ", "คณะมนุษยศาสตร์และสังคมศาสตร์", "คณะเทคโนโลยีการเกษตร"]'::jsonb),
  ('majors', '[]'::jsonb)
ON CONFLICT DO NOTHING;
