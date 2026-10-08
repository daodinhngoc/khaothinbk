import React, { useState } from 'react';
import { X, Copy, Check, Database, Key, ShieldCheck, ExternalLink, Terminal, Users, GraduationCap } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeSqlTab, setActiveSqlTab] = useState<'score_lookup' | 'users'>('score_lookup');

  if (!isOpen) return null;

  const scoreLookupSql = `-- ==============================================================================
-- HỆ THỐNG TRA CỨU ĐIỂM THI HỌC SINH (SUPABASE DATABASE SCHEMA)
-- Hỗ trợ: Tra cứu SBD + CCCD ngay tại màn hình đăng nhập & Quản lý điểm bởi Admin
-- ==============================================================================

-- 1. Bật extension pgcrypto và uuid-ossp (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tạo bảng Quản lý Kỳ thi / Bài kiểm tra
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  exam_type TEXT NOT NULL DEFAULT 'Kiểm tra định kỳ',
  subject TEXT NOT NULL DEFAULT 'Tất cả các môn',
  exam_date TEXT DEFAULT to_char(now(), 'YYYY-MM-DD'),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_exams_published ON public.exams(is_published);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);

-- 3. Tạo bảng Kết quả bài thi của Thí sinh
CREATE TABLE IF NOT EXISTS public.student_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  sbd TEXT NOT NULL,
  cccd TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  dob TEXT DEFAULT '',
  exam_code TEXT DEFAULT '',
  room_name TEXT DEFAULT '',
  total_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  part1_score NUMERIC(5, 2) DEFAULT NULL,
  part2_score NUMERIC(5, 2) DEFAULT NULL,
  part3_score NUMERIC(5, 2) DEFAULT NULL,
  item_responses JSONB DEFAULT '[]'::jsonb,
  class_rank INTEGER DEFAULT NULL,
  grade_rank INTEGER DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_exam_student UNIQUE (exam_id, sbd)
);

CREATE INDEX IF NOT EXISTS idx_student_results_exam ON public.student_exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_results_sbd ON public.student_exam_results(sbd);
CREATE INDEX IF NOT EXISTS idx_student_results_cccd ON public.student_exam_results(cccd);
CREATE INDEX IF NOT EXISTS idx_student_results_class ON public.student_exam_results(class_name);

-- 4. Bật Row Level Security (RLS) để bảo vệ điểm số học sinh
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_results ENABLE ROW LEVEL SECURITY;

-- Policy: Mọi người (kể cả khách / học sinh chưa đăng nhập) được xem danh sách kỳ thi ĐÃ CÔNG BỐ
DROP POLICY IF EXISTS "Public can view published exams" ON public.exams;
CREATE POLICY "Public can view published exams"
  ON public.exams FOR SELECT
  USING (is_published = true);

-- Policy: Quản trị viên / Cán bộ quản lý toàn quyền Kỳ thi và Nạp điểm
DROP POLICY IF EXISTS "Cho phep quan ly ky thi" ON public.exams;
CREATE POLICY "Cho phep quan ly ky thi"
  ON public.exams FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Quản lý kết quả bài thi học sinh
DROP POLICY IF EXISTS "Cho phep quan ly diem thi" ON public.student_exam_results;
CREATE POLICY "Cho phep quan ly diem thi"
  ON public.student_exam_results FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. FUNCTION & RPC: Tra cứu điểm an toàn cho Học sinh bằng SBD + CCCD
CREATE OR REPLACE FUNCTION public.lookup_student_score(
  p_exam_id UUID,
  p_sbd TEXT,
  p_cccd TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam RECORD;
  v_result RECORD;
  v_clean_sbd TEXT;
  v_clean_cccd TEXT;
BEGIN
  v_clean_sbd := trim(p_sbd);
  v_clean_cccd := trim(p_cccd);

  -- 1. Kiểm tra kỳ thi có tồn tại và đang mở công bố không
  SELECT * INTO v_exam
  FROM public.exams
  WHERE id = p_exam_id AND is_published = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kỳ thi này không tồn tại hoặc chưa được nhà trường công bố kết quả.'
    );
  END IF;

  -- 2. Tra cứu điểm số khớp cả SBD và CCCD (không phân biệt hoa thường)
  SELECT * INTO v_result
  FROM public.student_exam_results
  WHERE exam_id = p_exam_id
    AND lower(trim(sbd)) = lower(v_clean_sbd)
    AND lower(trim(cccd)) = lower(v_clean_cccd);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Không tìm thấy kết quả. Vui lòng kiểm tra lại chính xác Số báo danh và Số CCCD/Định danh.'
    );
  END IF;

  -- 3. Trả về kết quả (che bớt CCCD để bảo vệ riêng tư: vd 038******123)
  RETURN jsonb_build_object(
    'success', true,
    'student', jsonb_build_object(
      'id', v_result.id,
      'sbd', v_result.sbd,
      'cccd_masked', CASE 
        WHEN length(v_result.cccd) >= 6 THEN 
          substring(v_result.cccd from 1 for 3) || '******' || substring(v_result.cccd from length(v_result.cccd) - 2)
        ELSE '***'
      END,
      'full_name', v_result.full_name,
      'class_name', v_result.class_name,
      'dob', v_result.dob,
      'exam_code', v_result.exam_code,
      'room_name', v_result.room_name,
      'total_score', v_result.total_score,
      'part1_score', v_result.part1_score,
      'part2_score', v_result.part2_score,
      'part3_score', v_result.part3_score,
      'item_responses', v_result.item_responses,
      'class_rank', v_result.class_rank,
      'grade_rank', v_result.grade_rank,
      'notes', v_result.notes
    ),
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'academic_year', v_exam.academic_year,
      'exam_type', v_exam.exam_type,
      'subject', v_exam.subject,
      'exam_date', v_exam.exam_date
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_student_score(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_student_score(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_student_score(UUID, TEXT, TEXT) TO service_role;

-- 6. DỮ LIỆU MẪU BAN ĐẦU ĐỂ TRẢI NGHIỆM TRA CỨU NGAY
INSERT INTO public.exams (id, title, academic_year, exam_type, subject, exam_date, is_published)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'Kiểm tra Giữa kỳ 1 - Môn Toán 12 (GDPT 2018)',
  '2026-2027',
  'Kiểm tra định kỳ',
  'Toán học',
  to_char(now(), 'YYYY-MM-DD'),
  true
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  is_published = true;

INSERT INTO public.student_exam_results (
  exam_id, sbd, cccd, full_name, class_name, dob, exam_code, room_name, total_score, part1_score, part2_score, part3_score, class_rank, grade_rank, notes
) VALUES 
(
  '11111111-2222-3333-4444-555555555555',
  '52830001',
  '038206001234',
  'Nguyễn Văn An',
  '12A1',
  '15/03/2008',
  '101',
  'Phòng 01',
  8.75,
  3.00,
  3.50,
  2.25,
  1,
  3,
  'Làm bài rất tốt, câu trắc nghiệm đúng 100%, câu trả lời ngắn giải quyết tốt.'
),
(
  '11111111-2222-3333-4444-555555555555',
  '52830002',
  '038206005678',
  'Trần Thị Bích',
  '12A1',
  '20/07/2008',
  '102',
  'Phòng 01',
  7.50,
  2.75,
  2.50,
  2.25,
  2,
  12,
  'Cần chú ý thêm dạng bài Đúng/Sai phần mệnh đề b và d.'
),
(
  '11111111-2222-3333-4444-555555555555',
  '52830003',
  '038206009999',
  'Lê Hoàng Long',
  '12A2',
  '02/11/2008',
  '101',
  'Phòng 02',
  9.25,
  3.00,
  4.00,
  2.25,
  1,
  1,
  'Thủ khoa khối! Bài làm xuất sắc, tư duy logic nhanh và chính xác.'
)
ON CONFLICT (exam_id, sbd) DO NOTHING;
`;

  const userManagementSql = `-- ==============================================================================
-- HỆ THỐNG QUẢN LÝ & XẾP PHÒNG THI - SUPABASE DATABASE SCHEMA
-- Bảng phân quyền người dùng (Admin, BanGiamHieu, GiaoVu, ToTruong, GiaoVien)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  specialization TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'GiaoVien',
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tự động bổ sung cột permissions nếu bảng profiles đã tồn tại từ trước:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('Admin', 'BanGiamHieu', 'GiaoVu', 'ToTruong', 'GiaoVien'));

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

DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role');
`;

  const currentActiveSql = activeSqlTab === 'score_lookup' ? scoreLookupSql : userManagementSql;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentActiveSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Hướng dẫn Cấu hình CSDL Supabase</h3>
              <p className="text-xs text-slate-500">Khởi tạo các bảng và thiết lập quyền truy cập trên Supabase Cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 leading-relaxed">
          {/* Trạng thái hiện tại */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isSupabaseConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <p className="font-bold">
                Trạng thái: {isSupabaseConfigured ? '🟢 Đã kết nối Supabase Cloud' : '🟡 Chế độ Thử nghiệm nội bộ (Local Mode)'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {isSupabaseConfigured
                  ? 'Hệ thống đang lưu trữ và xác thực trực tiếp trên đám mây Supabase an toàn.'
                  : 'Hệ thống đang hoạt động trơn tru với bộ nhớ cục bộ. Thầy/Cô có thể chạy mã SQL dưới đây vào Supabase để kích hoạt đồng bộ đám mây toàn trường.'}
              </p>
            </div>
          </div>

          {/* Chọn Tab đoạn mã SQL */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">Chọn gói cấu hình SQL cần chạy:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveSqlTab('score_lookup')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeSqlTab === 'score_lookup'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>1. Tra cứu Điểm & Kỳ thi (Học sinh)</span>
                </div>
                <div className="text-[11px] font-normal text-slate-500 mt-1">
                  Tạo bảng <code className="text-blue-700">exams</code>, <code className="text-blue-700">student_exam_results</code> & hàm tra cứu an toàn SBD + CCCD
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSqlTab('users')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeSqlTab === 'users'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>2. Phân quyền Người dùng & Cán bộ</span>
                </div>
                <div className="text-[11px] font-normal text-slate-500 mt-1">
                  Tạo bảng <code className="text-indigo-700">profiles</code>, phân quyền 5 vai trò trường học & tài khoản Admin
                </div>
              </button>
            </div>
          </div>

          {/* Các bước triển khai */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Chạy mã SQL trong Supabase Dashboard (Chỉ cần làm 1 lần):</span>
            </h4>
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Mở <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> &rarr; vào <b>SQL Editor</b> &rarr; nhấn <b>New Query</b> &rarr; dán đoạn code dưới đây và bấm <b>Run</b>:
              </p>
              <div className="relative bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="sticky top-0 float-right flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-all shadow-md cursor-pointer z-10"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép toàn bộ mã SQL'}</span>
                </button>
                <pre className="pr-4 pt-2 text-[11px] text-emerald-400 leading-relaxed">{currentActiveSql}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">File script có sẵn tại: <code className="font-mono text-slate-700">/supabase_score_lookup_schema.sql</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
