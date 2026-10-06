-- Add new columns for organization and visibility
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS faculty text,
  ADD COLUMN IF NOT EXISTS major text,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS plaintext_password text;

-- Update the provision trigger to also sync these fields
CREATE OR REPLACE FUNCTION public.provision_aru_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'aru_provisioned' = 'true' THEN
    INSERT INTO public.users(id, username, role, full_name, faculty, major, academic_year, plaintext_password) 
    VALUES (
      NEW.id, 
      lower(NEW.raw_app_meta_data->>'username'), 
      NEW.raw_app_meta_data->>'role', 
      NEW.raw_app_meta_data->>'full_name',
      NEW.raw_app_meta_data->>'faculty',
      NEW.raw_app_meta_data->>'major',
      NEW.raw_app_meta_data->>'academic_year',
      NEW.raw_app_meta_data->>'plaintext_password'
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      faculty = EXCLUDED.faculty,
      major = EXCLUDED.major,
      academic_year = EXCLUDED.academic_year,
      plaintext_password = EXCLUDED.plaintext_password;
  END IF;
  RETURN NEW;
END $$;

-- Ensure admins can read the new columns (already covered by existing SELECT policy, but good to ensure no restricted views exist)
