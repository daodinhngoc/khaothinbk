-- ==============================================================================
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

-- Tự động bổ sung các cột điểm đa môn nếu bảng đã được tạo từ trước:
ALTER TABLE public.student_exam_results ADD COLUMN IF NOT EXISTS average_score NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.student_exam_results ADD COLUMN IF NOT EXISTS subjects_count INTEGER DEFAULT 0;
ALTER TABLE public.student_exam_results ADD COLUMN IF NOT EXISTS subject_scores JSONB DEFAULT '{}'::jsonb;

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
