-- ดึงข้อมูลนักศึกษาที่อยู่ในระบบ (auth.users) มาลงในตารางปกติ (public.users)
-- เพื่อให้หน้าเว็บสามารถเรียกดูและจัดการรายชื่อได้
INSERT INTO public.users (id, username, role, full_name, faculty, major, academic_year, plaintext_password)
SELECT 
  id,
  lower(raw_app_meta_data->>'username'),
  COALESCE(raw_app_meta_data->>'role', 'STUDENT'),
  COALESCE(raw_app_meta_data->>'full_name', 'ไม่ระบุชื่อ'),
  raw_app_meta_data->>'faculty',
  raw_app_meta_data->>'major',
  raw_app_meta_data->>'academic_year',
  raw_app_meta_data->>'plaintext_password'
FROM auth.users
WHERE raw_app_meta_data->>'username' IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  faculty = EXCLUDED.faculty,
  major = EXCLUDED.major,
  academic_year = EXCLUDED.academic_year,
  plaintext_password = COALESCE(EXCLUDED.plaintext_password, public.users.plaintext_password);
