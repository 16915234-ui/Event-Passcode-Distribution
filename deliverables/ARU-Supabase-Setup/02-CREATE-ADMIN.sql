-- Run supabase-schema.sql first.
-- In Supabase Authentication > Users, create and confirm:
-- email: admin@accounts.aru.invalid
-- password: choose your own strong password in the Auth UI, never in this file.
-- Edit the display name below, then run this file in SQL Editor.
DO $$
DECLARE user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE lower(email)='admin@accounts.aru.invalid';
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Create admin@accounts.aru.invalid in Authentication > Users first';
  END IF;
  INSERT INTO public.users(id,username,role,full_name)
  VALUES(user_id,'admin','ADMIN','ผู้ดูแลระบบ ARU')
  ON CONFLICT(id) DO NOTHING;
END $$;
