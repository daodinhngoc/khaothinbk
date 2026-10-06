-- ==============================================================================
-- HỆ THỐNG QUẢN LÝ & XẾP PHÒNG THI - SUPABASE DATABASE SCHEMA
-- Bảng phân quyền người dùng (Admin, GiaoVu, ToTruong, GiaoVien) tương thích Supabase Auth
-- ==============================================================================

-- 1. Bật extension pgcrypto (để mã hóa mật khẩu khi khởi tạo tài khoản ban đầu)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tạo bảng profiles liên kết 1-1 với auth.users (hỗ trợ đủ 4 vai trò của nhà trường)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  specialization TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'GiaoVien',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Cập nhật ràng buộc vai trò (áp dụng cho cả bảng mới tạo hoặc bảng cũ đã có từ trước)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('Admin', 'GiaoVu', 'ToTruong', 'GiaoVien'));

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin' OR
    (auth.jwt() ->> 'role') = 'service_role'
  );
END;
$$ LANGUAGE plpgsql STABLE;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role');

-- Trigger tự động đồng bộ khi tài khoản được tạo từ Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'GiaoVien');
  IF v_role NOT IN ('Admin', 'GiaoVu', 'ToTruong', 'GiaoVien') THEN
    v_role := 'GiaoVien';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, unit, specialization, phone, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Cán bộ giáo viên'),
    COALESCE(NEW.raw_user_meta_data->>'unit', 'Trường THPT'),
    COALESCE(NEW.raw_user_meta_data->>'specialization', 'Toán - Tin'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    unit = EXCLUDED.unit,
    specialization = EXCLUDED.specialization,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. SỬA LỖI TOKEN NULL TRONG AUTH.USERS (DO SQL CŨ) & DỌN DẸP TÀI KHOẢN CŨ
UPDATE auth.users SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL 
   OR recovery_token IS NULL 
   OR email_change_token_new IS NULL 
   OR email_change IS NULL;

-- 4. KHỞI TẠO DUY NHẤT 1 TÀI KHOẢN ADMIN: admin@nbkcs.edu.vn (MẬT KHẨU: admin123)
DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_admin_email TEXT := 'admin@nbkcs.edu.vn';
  v_admin_pass TEXT := 'admin123';
  v_existing_id UUID;
BEGIN
  -- Xóa triệt để các tài khoản mẫu cũ không còn dùng
  DELETE FROM auth.identities WHERE identity_data->>'email' IN ('admin@truonghoc.edu.vn', 'giaovien@truonghoc.edu.vn');
  DELETE FROM public.profiles WHERE email IN ('admin@truonghoc.edu.vn', 'giaovien@truonghoc.edu.vn');
  DELETE FROM auth.users WHERE email IN ('admin@truonghoc.edu.vn', 'giaovien@truonghoc.edu.vn');

  -- Kiểm tra xem admin@nbkcs.edu.vn đã tồn tại trong auth.users chưa
  SELECT id INTO v_existing_id FROM auth.users WHERE email = v_admin_email;

  IF v_existing_id IS NOT NULL THEN
    -- Nếu đã có thì cập nhật mật khẩu và metadata
    UPDATE auth.users SET
      encrypted_password = crypt(v_admin_pass, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}',
      raw_user_meta_data = '{"full_name":"ngoccs","unit":"ITNBK","specialization":"Tin học & Quản trị","phone":"0986041183","role":"Admin"}',
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      updated_at = now()
    WHERE id = v_existing_id;

    INSERT INTO public.profiles (id, email, full_name, unit, specialization, phone, role, is_active)
    VALUES (v_existing_id, v_admin_email, 'ngoccs', 'ITNBK', 'Tin học & Quản trị', '0986041183', 'Admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'Admin', is_active = true, updated_at = now();
  ELSE
    -- Nếu chưa có thì chèn đầy đủ các trường để GoTrue không bị lỗi NULL token
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_admin_email, crypt(v_admin_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"ngoccs","unit":"ITNBK","specialization":"Tin học & Quản trị","phone":"0986041183","role":"Admin"}',
      now(), now(),
      '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_admin_id, v_admin_id,
      format('{"sub":"%s","email":"%s"}', v_admin_id, v_admin_email)::jsonb,
      'email', v_admin_email, now(), now(), now()
    );

    INSERT INTO public.profiles (id, email, full_name, unit, specialization, phone, role, is_active)
    VALUES (v_admin_id, v_admin_email, 'ngoccs', 'ITNBK', 'Tin học & Quản trị', '0986041183', 'Admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'Admin', is_active = true;
  END IF;
END $$;
