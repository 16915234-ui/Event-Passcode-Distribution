-- ARU EVENT PASS — COMPLETE SUPABASE DATABASE SETUP
-- เปิด Supabase > SQL Editor > New query แล้ววางไฟล์ทั้งหมดและกด Run
-- ใช้กับ Supabase (มี auth.users, anon, authenticated และ service_role อยู่แล้ว)
-- ใช้ได้ทั้งการติดตั้งใหม่และอัปเกรดโครงสร้างเดิมของโปรเจคนี้
-- รันซ้ำได้ ไม่มีการล้างข้อมูลหรือเปลี่ยนรหัสผ่าน
-- บัญชีผู้ดูแล: admin16915234@aru.ac.th / รหัสผู้ใช้: 16915234
-- ต้องมีบัญชีนี้ใน Authentication > Users ก่อน จึงจะผูกสิทธิ์ Admin ได้
-- หากยังไม่มีบัญชี จะติดตั้งโครงสร้างก่อนและแจ้งให้สร้างบัญชีแล้วรันซ้ำ

-- Run as the database owner. Transactional; legacy data is archived, never dropped.
BEGIN;
CREATE SCHEMA IF NOT EXISTS aru_legacy;
REVOKE ALL ON SCHEMA aru_legacy FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='passcodes' AND column_name='assigned_to' AND data_type='text') THEN
    ALTER TABLE public.passcodes SET SCHEMA aru_legacy;
    REVOKE ALL ON aru_legacy.passcodes FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regclass('public.registrations') IS NOT NULL THEN
    ALTER TABLE public.registrations SET SCHEMA aru_legacy;
    REVOKE ALL ON aru_legacy.registrations FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._-]{3,40}$'),
  role text NOT NULL CHECK (role IN ('STUDENT','STAFF','ADMIN')),
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
  faculty text,
  major text,
  academic_year text,
  plaintext_password text
);
-- Password hashes belong exclusively to Supabase Auth (auth.users).
CREATE OR REPLACE FUNCTION public.provision_aru_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'aru_provisioned' = 'true' THEN
    INSERT INTO public.users(id,username,role,full_name,faculty,major,academic_year,plaintext_password) VALUES (NEW.id, lower(NEW.raw_app_meta_data->>'username'), NEW.raw_app_meta_data->>'role', NEW.raw_app_meta_data->>'full_name', NEW.raw_app_meta_data->>'faculty', NEW.raw_app_meta_data->>'major', NEW.raw_app_meta_data->>'academic_year', NEW.raw_app_meta_data->>'plaintext_password');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS provision_aru_user ON auth.users;
CREATE TRIGGER provision_aru_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.provision_aru_user();
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, totp_secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude double precision CHECK(latitude BETWEEN -90 AND 90);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude double precision CHECK(longitude BETWEEN -180 AND 180);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS radius_meters integer NOT NULL DEFAULT 100 CHECK(radius_meters BETWEEN 10 AND 5000);
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_attended boolean NOT NULL DEFAULT false,
  check_in_time timestamptz,
  check_in_method text CHECK(check_in_method IN ('STAFF_SCAN','DYNAMIC_QR','MANUAL')),
  checked_in_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,student_id),
  CHECK ((NOT is_attended AND check_in_time IS NULL AND check_in_method IS NULL) OR (is_attended AND check_in_time IS NOT NULL AND check_in_method IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.passcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code_value text NOT NULL CHECK(length(code_value) BETWEEN 1 AND 200),
  assigned_to uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,code_value), UNIQUE(event_id,assigned_to),
  FOREIGN KEY(event_id,assigned_to) REFERENCES public.event_registrations(event_id,student_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS aru_attendance_idx ON public.event_registrations(event_id,is_attended);
CREATE INDEX IF NOT EXISTS aru_student_idx ON public.event_registrations(student_id,event_id);
CREATE INDEX IF NOT EXISTS aru_available_idx ON public.passcodes(event_id) WHERE assigned_to IS NULL;
CREATE OR REPLACE FUNCTION public.aru_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT role FROM public.users WHERE id=auth.uid() $$;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passcodes ENABLE ROW LEVEL SECURITY;
-- Remove every legacy permissive policy, including policies from the old demo.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('users','events','event_registrations','passcodes') LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
  END LOOP;
END $$;
REVOKE ALL ON public.users,public.events,public.event_registrations,public.passcodes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.users,public.event_registrations,public.passcodes TO authenticated;
-- No client may select the secret, including admins. API returns only safe columns.
GRANT SELECT(id,name,latitude,longitude,radius_meters,created_at) ON public.events TO authenticated;
GRANT ALL ON public.users,public.events,public.event_registrations,public.passcodes TO service_role;
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated USING (id=auth.uid() OR public.aru_role() IN ('ADMIN','STAFF'));
CREATE POLICY events_read ON public.events FOR SELECT TO authenticated USING (public.aru_role() IN ('ADMIN','STAFF') OR EXISTS(SELECT 1 FROM public.event_registrations r WHERE r.event_id=events.id AND r.student_id=auth.uid()));
CREATE POLICY registrations_read ON public.event_registrations FOR SELECT TO authenticated USING (student_id=auth.uid() OR public.aru_role() IN ('ADMIN','STAFF'));
CREATE POLICY passcodes_read ON public.passcodes FOR SELECT TO authenticated USING (public.aru_role()='ADMIN' OR (assigned_to=auth.uid() AND EXISTS(SELECT 1 FROM public.event_registrations r WHERE r.event_id=passcodes.event_id AND r.student_id=auth.uid() AND r.is_attended)));
CREATE OR REPLACE FUNCTION public.allocate_students(p_event uuid,p_students uuid[]) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; pid uuid; total integer:=0;
BEGIN
  PERFORM 1 FROM public.events WHERE id=p_event FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND'; END IF;
  FOREACH sid IN ARRAY p_students LOOP
    IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=sid AND role='STUDENT') THEN RAISE EXCEPTION 'INVALID_STUDENT'; END IF;
    INSERT INTO public.event_registrations(event_id,student_id) VALUES(p_event,sid) ON CONFLICT(event_id,student_id) DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.passcodes WHERE event_id=p_event AND assigned_to=sid) THEN
      SELECT id INTO pid FROM public.passcodes WHERE event_id=p_event AND assigned_to IS NULL ORDER BY created_at,id LIMIT 1 FOR UPDATE;
      IF pid IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_PASSCODES'; END IF;
      UPDATE public.passcodes SET assigned_to=sid WHERE id=pid;
    END IF;
    total:=total+1;
  END LOOP;
  RETURN total;
END $$;
CREATE OR REPLACE FUNCTION public.check_in_student(p_event uuid,p_student uuid,p_method text,p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.event_registrations; actor_role text; was_attended boolean;
BEGIN
  SELECT role INTO actor_role FROM public.users WHERE id=p_actor;
  IF p_method='DYNAMIC_QR' THEN
    IF actor_role IS DISTINCT FROM 'STUDENT' OR p_actor<>p_student THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  ELSIF p_method IN ('STAFF_SCAN','MANUAL') THEN
    IF actor_role IS NULL OR actor_role NOT IN ('ADMIN','STAFF') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  ELSE RAISE EXCEPTION 'INVALID_METHOD'; END IF;
  SELECT * INTO r FROM public.event_registrations WHERE event_id=p_event AND student_id=p_student FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;
  was_attended:=r.is_attended;
  IF NOT was_attended THEN
    UPDATE public.event_registrations SET is_attended=true,check_in_time=now(),check_in_method=p_method,checked_in_by=p_actor WHERE id=r.id RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('registration',to_jsonb(r),'alreadyCheckedIn',was_attended);
END $$;
CREATE TABLE IF NOT EXISTS public.aru_rate_limits (key text PRIMARY KEY,hits integer NOT NULL,expires_at timestamptz NOT NULL);
ALTER TABLE public.aru_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aru_rate_limits FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.aru_rate_limits WHERE expires_at<now()-interval '1 hour';
  INSERT INTO public.aru_rate_limits(key,hits,expires_at) VALUES(p_key,1,now()+make_interval(secs=>p_seconds))
  ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN aru_rate_limits.expires_at<=now() THEN 1 ELSE aru_rate_limits.hits+1 END,expires_at=CASE WHEN aru_rate_limits.expires_at<=now() THEN now()+make_interval(secs=>p_seconds) ELSE aru_rate_limits.expires_at END RETURNING hits INTO n;
  RETURN n<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.provision_aru_user(),public.aru_role(),public.allocate_students(uuid,uuid[]),public.check_in_student(uuid,uuid,text,uuid),public.consume_rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aru_role() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.allocate_students(uuid,uuid[]),public.check_in_student(uuid,uuid,text,uuid),public.consume_rate_limit(text,integer,integer) TO service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_registrations') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
 END IF;
END $$;

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
