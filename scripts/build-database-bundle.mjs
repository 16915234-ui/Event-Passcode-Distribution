import fs from 'node:fs';

const source = fs.readFileSync('supabase-schema.sql', 'utf8');
if (!/COMMIT;\s*$/.test(source)) throw new Error('Expected a transactional schema');
const header = `-- ARU EVENT PASS — COMPLETE SUPABASE DATABASE SETUP
-- เปิด Supabase > SQL Editor > New query แล้ววางไฟล์ทั้งหมดและกด Run
-- ใช้กับ Supabase (มี auth.users, anon, authenticated และ service_role อยู่แล้ว)
-- ใช้ได้ทั้งการติดตั้งใหม่และอัปเกรดโครงสร้างเดิมของโปรเจคนี้
-- รันซ้ำได้ ไม่มีการล้างข้อมูลหรือเปลี่ยนรหัสผ่าน
-- บัญชีผู้ดูแล: admin16915234@aru.ac.th / รหัสผู้ใช้: 16915234
-- ต้องมีบัญชีนี้ใน Authentication > Users ก่อน จึงจะผูกสิทธิ์ Admin ได้
-- หากยังไม่มีบัญชี จะติดตั้งโครงสร้างก่อนและแจ้งให้สร้างบัญชีแล้วรันซ้ำ

`;
const admin = `
-- Link the administrator explicitly authorized by the project owner.
-- Never infer roles from email domains or self-editable user metadata.
DO $aru_admin$
DECLARE
  admin_email text := 'admin16915234@aru.ac.th';
  admin_username text := '16915234';
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = admin_email;
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Database installed. Create and confirm % in Authentication > Users, then run this file again to link the administrator.', admin_email;
  ELSE
    IF EXISTS (SELECT 1 FROM public.users WHERE username = admin_username AND id <> admin_id) THEN
      RAISE EXCEPTION 'Username % belongs to another Auth account. No changes were committed. Review the existing account before rerunning.', admin_username;
    END IF;
    INSERT INTO public.users (id, username, role, full_name)
    VALUES (admin_id, admin_username, 'ADMIN', 'ผู้ดูแลระบบ ARU')
    ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username, role = 'ADMIN';
    RAISE NOTICE 'Administrator linked: % (username %). Existing Auth password is unchanged.', admin_email, admin_username;
  END IF;
END $aru_admin$;

-- Refresh the REST API schema cache after this transaction commits.
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Installation result; no password, TOTP secret or Passcode is returned.
SELECT
  'ARU database ready' AS database_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.users u
    JOIN auth.users a ON a.id = u.id
    WHERE lower(a.email) = 'admin16915234@aru.ac.th' AND u.role = 'ADMIN'
  ) THEN 'Admin ready: 16915234 / admin16915234@aru.ac.th'
    ELSE 'Create admin16915234@aru.ac.th in Authentication > Users, then run again'
  END AS admin_status;
`;
fs.mkdirSync('deliverables', { recursive: true });
fs.writeFileSync('deliverables/ARU-DATABASE-FULL.sql', header + source.replace(/COMMIT;\s*$/, admin));
console.log('Created deliverables/ARU-DATABASE-FULL.sql');
