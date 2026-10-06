import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Edit3, Upload, Download, Database, Cloud, 
  CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Search,
  FileSpreadsheet, Users, GraduationCap, Copy, Check, Terminal, ExternalLink, ShieldCheck, Sparkles, Filter, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExamSeason, StudentExamScoreRecord, UserProfile } from '../../types';

interface ExamScoreManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  activeExamCategory?: string;
  activeSchoolYear?: string;
}

export const ExamScoreManagementModal: React.FC<ExamScoreManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeExamCategory = 'Thi thử / Khảo sát',
  activeSchoolYear = '2026-2027'
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'upload' | 'view_scores' | 'sql_guide'>('upload');
  
  // Danh sách kỳ thi
  const [exams, setExams] = useState<ExamSeason[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(false);
  const [isSavingExam, setIsSavingExam] = useState<boolean>(false);

  // Form tạo kỳ thi mới
  const [newTitle, setNewTitle] = useState<string>('Kỳ thi Khảo sát Năng lực Lớp 12 (Lần 1)');
  const [newYear, setNewYear] = useState<string>(activeSchoolYear);
  const [newType, setNewType] = useState<string>(activeExamCategory);
  const [newSubject, setNewSubject] = useState<string>('Tổng hợp các môn');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newIsPublished, setNewIsPublished] = useState<boolean>(true);
  const [showCreateExamForm, setShowCreateExamForm] = useState<boolean>(false);

  // Danh sách điểm thi của kỳ thi đang chọn
  const [examResults, setExamResults] = useState<StudentExamScoreRecord[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Trạng thái thông báo & upload
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; subjects: string[] } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // SQL Script cho Supabase
  const supabaseSqlScript = `-- ==============================================================================
-- HỆ THỐNG TRA CỨU ĐIỂM THI HỌC SINH TỔNG HỢP CÁC MÔN (SUPABASE DATABASE SCHEMA)
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
  exam_type TEXT NOT NULL DEFAULT 'Thi thử / Khảo sát',
  subject TEXT NOT NULL DEFAULT 'Tổng hợp các môn',
  exam_date TEXT DEFAULT to_char(now(), 'YYYY-MM-DD'),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_exams_published ON public.exams(is_published);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);

-- 3. Tạo bảng Kết quả bài thi của Thí sinh (Lưu đa môn linh hoạt)
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
  average_score NUMERIC(5, 2) DEFAULT NULL,
  subjects_count INTEGER DEFAULT 0,
  subject_scores JSONB DEFAULT '{}'::jsonb,
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

-- 4. Bật Row Level Security (RLS)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published exams" ON public.exams;
CREATE POLICY "Public can view published exams"
  ON public.exams FOR SELECT
  USING (is_published = true);

-- Mở quyền quản lý kỳ thi và nạp điểm cho Quản trị viên
DROP POLICY IF EXISTS "Cho phep quan ly ky thi" ON public.exams;
CREATE POLICY "Cho phep quan ly ky thi"
  ON public.exams FOR ALL
  USING (true)
  WITH CHECK (true);

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

  -- 3. Trả về kết quả
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
      'average_score', v_result.average_score,
      'subjects_count', v_result.subjects_count,
      'subject_scores', v_result.subject_scores,
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
`;

  // Lấy danh sách kỳ thi
  const fetchExams = async () => {
    setIsLoadingExams(true);
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.success && Array.isArray(data.exams)) {
        setExams(data.exams);
        if (data.exams.length > 0 && !selectedExamId) {
          setSelectedExamId(data.exams[0].id);
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách kỳ thi:', err);
    } finally {
      setIsLoadingExams(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExams();
    }
  }, [isOpen]);

  // Lấy danh sách điểm của kỳ thi đang chọn
  const fetchResults = async (examId: string) => {
    if (!examId) return;
    setIsLoadingResults(true);
    try {
      const res = await fetch(`/api/admin/exam-results/${examId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setExamResults(data.results);
      } else {
        setExamResults([]);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách điểm:', err);
      setExamResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchResults(selectedExamId);
    }
  }, [selectedExamId]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tạo kỳ thi mới
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Vui lòng nhập tên kỳ thi', 'error');
      return;
    }

    setIsSavingExam(true);
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          academic_year: newYear,
          exam_type: newType,
          subject: newSubject,
          exam_date: newDate,
          is_published: newIsPublished
        })
      });

      const data = await res.json();
      if (data.success) {
        const isCloud = data.source === 'supabase';
        showToast(
          isCloud 
            ? 'Đã lưu kỳ thi thành công lên CSDL Supabase Cloud!' 
            : 'Đã lưu kỳ thi vào bộ nhớ cục bộ (Sẵn sàng nạp điểm)!', 
          'success'
        );
        setNewTitle('Kỳ thi Khảo sát Năng lực Lớp 12 (Lần 1)');
        setShowCreateExamForm(false);
        await fetchExams();
        if (data.exam?.id) {
          setSelectedExamId(data.exam.id);
        }
      } else {
        showToast(data.error || 'Lỗi khi tạo kỳ thi', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi máy chủ', 'error');
    } finally {
      setIsSavingExam(false);
    }
  };

  // Bật/Tắt công bố kỳ thi (Toggle is_published)
  const handleTogglePublish = async (exam: ExamSeason) => {
    try {
      const nextPublished = !exam.is_published;
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exam,
          is_published: nextPublished
        })
      });

      const data = await res.json();
      if (data.success) {
        setExams(prev => prev.map(e => e.id === exam.id ? { ...e, is_published: nextPublished } : e));
        showToast(
          nextPublished ? `Đã mở công bố kỳ thi "${exam.title}" cho học sinh tra cứu!` : `Đã tạm ẩn kỳ thi "${exam.title}"!`,
          'success'
        );
      }
    } catch (err: any) {
      showToast('Không thể cập nhật trạng thái kỳ thi', 'error');
    }
  };

  // Xóa kỳ thi
  const handleDeleteExam = async (examId: string, title: string) => {
    if (!window.confirm(`Thầy/Cô có chắc chắn muốn xóa kỳ thi "${title}" và toàn bộ dữ liệu điểm của kỳ thi này không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/exams/${examId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa kỳ thi thành công!', 'success');
        await fetchExams();
        if (selectedExamId === examId) {
          setSelectedExamId('');
          setExamResults([]);
        }
      }
    } catch (err: any) {
      showToast('Lỗi khi xóa kỳ thi', 'error');
    }
  };

  // Tải file mẫu Excel chuẩn theo đúng ảnh của Thầy/Cô (có cột CCCD)
  const handleDownloadTemplate = () => {
    const headers = [
      'TT', 'CCCD', 'Họ và tên', 'SBD', 'Lớp', 'Ngày Sinh', 
      'Toán', 'Lý', 'Hóa', 'Sinh', 'Tin', 'CNCN', 'CNNN', 'Sử', 'Địa', 'GDKT PL', 'Tiếng Anh', 'Ghi chú'
    ];

    const sampleRows = [
      [1, '038209009347', 'Lê Đức Anh', '52830017', '12A1', '17/09/2009', 6.0, '', '', '', '', '', '', 8.5, 4.9, '', '', '2'],
      [2, '064209007023', 'Nguyễn Tuấn Anh', '52830027', '12A1', '05/04/2009', 4.4, '', '', '', '', '', '', 5.5, 3.9, '', '', '2'],
      [3, '034209003842', 'Đặng Văn Bảo', '52830038', '12A1', '18/10/2009', 4.0, '', '', '', '', '', '', 4.8, 3.3, '', '', '2'],
      [4, '064209014183', 'Nguyễn Hoàng Gia Bảo', '52830044', '12A1', '16/02/2009', 4.1, '', '', '', '', '', '', 6.5, 7.0, '', '', '2'],
      [5, '033309000311', 'Phạm Băng Băng', '52830052', '12A1', '28/01/2009', 4.8, '', '', '', '', '', '', 9.3, 7.8, '', '', '2'],
      [6, '064209005399', 'Dương Trọng Bằng', '52830050', '12A1', '19/01/2009', 2.0, '', '', '', '', '', '', 6.5, '', 6.1, '', '2'],
      [7, '064209009923', 'Đỗ Minh Bo', '52830058', '12A1', '16/10/2009', 2.5, '', '', '', '', '', '', 3.8, 2.5, '', '', '2'],
      [8, '064207001683', 'Huỳnh Tiến Đạt', '52830112', '12A1', '27/12/2007', 2.1, '', '', '', '', '', '', 5.5, '', 5.1, '', '2'],
      [9, '064309006145', 'Phan Thị Bích Hằng', '52830142', '12A1', '06/02/2009', 4.0, '', '', '', '', '', '', 5.8, 6.3, '', '', '2'],
      [10, '064309005376', 'Trần Gia Hân', '52830151', '12A1', '11/02/2009', 4.0, '', '', '', '', '', '', 7.4, '', '', 4.3, '2'],
      [11, '064209009189', 'Lê Đình Hiếu', '52830165', '12A1', '22/03/2009', 3.8, '', '', '', '', '', '', 7.8, 4.3, '', '', '2'],
      [12, '066309013472', 'Trần Thị Mai Hoa', '52830168', '12A1', '01/01/2009', 2.4, '', '', '', '', '', '', 4.8, '', 9.3, '', '2'],
      [13, '064209011492', 'Lê Bảo Khang', '52830214', '12A1', '01/08/2009', 4.1, '', '', '', '', '', '', 7.8, 4.2, '', '', '2'],
      [14, '064309004693', 'Trần Trúc Lam', '52830235', '12A1', '15/07/2009', 2.1, '', '', '', '', '', '', 3.9, '', 6.0, '', '2'],
      [15, '049209016820', 'Huỳnh Tiến Lộc', '52830266', '12A1', '10/07/2009', 3.0, '', '', '', '', '', '', 6.9, 5.7, '', '', '2']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 6 },  // TT
      { wch: 16 }, // CCCD
      { wch: 24 }, // Họ và tên
      { wch: 12 }, // SBD
      { wch: 8 },  // Lớp
      { wch: 12 }, // Ngày Sinh
      { wch: 8 },  // Toán
      { wch: 8 },  // Lý
      { wch: 8 },  // Hóa
      { wch: 8 },  // Sinh
      { wch: 8 },  // Tin
      { wch: 8 },  // CNCN
      { wch: 8 },  // CNNN
      { wch: 8 },  // Sử
      { wch: 8 },  // Địa
      { wch: 9 },  // GDKT PL
      { wch: 10 }, // Tiếng Anh
      { wch: 10 }  // Ghi chú
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Tong_Hop');
    XLSX.writeFile(wb, `Mau_Nhap_Diem_Tong_Hop_CCCD.xlsx`);
  };

  // Upload duy nhất 1 file Excel bảng điểm tổng hợp đa môn (Co giãn động theo số môn)
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedExamId) {
      showToast('Vui lòng chọn một kỳ thi trước khi nạp file điểm!', 'error');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

        if (!rawRows || rawRows.length < 2) {
          showToast('File Excel không có dữ liệu!', 'error');
          setIsUploading(false);
          return;
        }

        // Tự động tìm dòng header (dòng có chứa 'cccd' hoặc 'sbd' hoặc 'họ và tên')
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
          const row = rawRows[i];
          if (row && row.some(cell => {
            const s = String(cell || '').toLowerCase().trim();
            return s.includes('cccd') || s.includes('sbd') || s.includes('họ và tên') || s.includes('họ tên');
          })) {
            headerRowIdx = i;
            break;
          }
        }

        const rawHeaders = rawRows[headerRowIdx] || [];
        const normalizedHeaders = rawHeaders.map(h => String(h || '').trim());

        // Tìm các cột thông tin cố định
        const colTT = normalizedHeaders.findIndex(h => h.toLowerCase() === 'tt' || h.toLowerCase() === 'stt');
        const colCccd = normalizedHeaders.findIndex(h => h.toLowerCase().includes('cccd') || h.toLowerCase().includes('định danh'));
        const colName = normalizedHeaders.findIndex(h => h.toLowerCase().includes('tên') || h.toLowerCase().includes('họ'));
        const colSbd = normalizedHeaders.findIndex(h => h.toLowerCase().includes('sbd') || h.toLowerCase().includes('báo danh'));
        const colClass = normalizedHeaders.findIndex(h => h.toLowerCase().includes('lớp') || h.toLowerCase() === 'lop');
        const colDob = normalizedHeaders.findIndex(h => h.toLowerCase().includes('sinh') || h.toLowerCase().includes('ngày sinh'));
        const colNotes = normalizedHeaders.findIndex(h => h.toLowerCase().includes('ghi chú') || h.toLowerCase().includes('nhận xét'));

        // CÁC CỘT CÒN LẠI ĐỀU LÀ CỘT MÔN THI ĐỘNG (Dynamic Subject Columns)
        const fixedCols = new Set([colTT, colCccd, colName, colSbd, colClass, colDob, colNotes].filter(idx => idx >= 0));
        const subjectColIndices: { index: number; name: string }[] = [];

        normalizedHeaders.forEach((name, idx) => {
          if (!fixedCols.has(idx) && name.length > 0 && !name.toLowerCase().includes('stt') && !name.toLowerCase().includes('ghi chú')) {
            subjectColIndices.push({ index: idx, name });
          }
        });

        const detectedSubjectNames = subjectColIndices.map(s => s.name);

        const parsedRecords: StudentExamScoreRecord[] = [];

        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          const sbdVal = colSbd >= 0 ? String(row[colSbd] || '').trim() : '';
          const nameVal = colName >= 0 ? String(row[colName] || '').trim() : '';
          const cccdVal = colCccd >= 0 ? String(row[colCccd] || '').trim() : '';

          if (!sbdVal && !nameVal) continue;

          // Đọc điểm của từng môn động
          const studentSubjectScores: Record<string, number | string | null> = {};
          let validScoresSum = 0;
          let validScoresCount = 0;

          subjectColIndices.forEach(({ index, name }) => {
            const rawVal = row[index];
            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
              const strVal = String(rawVal).trim();
              if (strVal.toLowerCase() === 'vt' || strVal.toLowerCase() === 'vắng') {
                studentSubjectScores[name] = 'VT';
              } else {
                const num = parseFloat(strVal.replace(',', '.'));
                if (!isNaN(num)) {
                  studentSubjectScores[name] = num;
                  validScoresSum += num;
                  validScoresCount++;
                }
              }
            }
          });

          const averageScore = validScoresCount > 0 ? parseFloat((validScoresSum / validScoresCount).toFixed(2)) : null;
          const totalScore = averageScore !== null ? averageScore : 0;

          parsedRecords.push({
            exam_id: selectedExamId,
            sbd: sbdVal,
            cccd: cccdVal || `0382090${String(r).padStart(5, '0')}`,
            full_name: nameVal || `Thí sinh ${sbdVal}`,
            class_name: colClass >= 0 && row[colClass] ? String(row[colClass]).trim() : '12A1',
            dob: colDob >= 0 && row[colDob] ? String(row[colDob]).trim() : '',
            exam_code: 'Chính thức',
            room_name: '',
            total_score: totalScore,
            average_score: averageScore,
            subjects_count: validScoresCount,
            subject_scores: studentSubjectScores,
            notes: colNotes >= 0 && row[colNotes] ? String(row[colNotes]).trim() : `Đã dự thi ${validScoresCount} môn`
          });
        }

        if (parsedRecords.length === 0) {
          showToast('Không đọc được thí sinh nào từ file Excel!', 'error');
          setIsUploading(false);
          return;
        }

        const res = await fetch('/api/admin/upload-exam-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: selectedExamId,
            results: parsedRecords
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          let parsedErr = 'Lỗi nạp điểm từ máy chủ';
          try {
            const errJson = JSON.parse(errText);
            parsedErr = errJson.error || parsedErr;
          } catch {
            if (res.status === 413 || errText.includes('PayloadTooLarge') || errText.includes('too large')) {
              parsedErr = 'Dung lượng file dữ liệu quá lớn vượt quá giới hạn!';
            }
          }
          showToast(parsedErr, 'error');
          setIsUploading(false);
          return;
        }

        const data = await res.json();
        if (data.success) {
          setUploadStats({
            total: parsedRecords.length,
            subjects: detectedSubjectNames
          });
          showToast(`Đã nạp thành công ${parsedRecords.length} thí sinh với ${detectedSubjectNames.length} môn học vào CSDL!`, 'success');
          await fetchResults(selectedExamId);
          await fetchExams();
          setActiveTab('view_scores');
        } else {
          showToast(data.error || 'Lỗi nạp điểm', 'error');
        }
      } catch (err: any) {
        showToast('Lỗi phân tích file Excel: ' + (err?.message || ''), 'error');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Xóa 1 bản ghi điểm
  const handleDeleteScore = async (resultId: string, studentName: string) => {
    if (!window.confirm(`Thầy/Cô có muốn xóa điểm của học sinh "${studentName}" không?`)) return;

    try {
      const res = await fetch(`/api/admin/exam-results/${resultId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setExamResults(prev => prev.filter(r => r.id !== resultId));
        showToast('Đã xóa bài thi thành công!', 'success');
        await fetchExams();
      }
    } catch {
      showToast('Lỗi khi xóa bài thi', 'error');
    }
  };

  const copySqlCode = () => {
    navigator.clipboard.writeText(supabaseSqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  // Lọc kết quả điểm theo tìm kiếm và lớp
  const uniqueClasses = Array.from(new Set(examResults.map(r => r.class_name).filter(Boolean))).sort();
  const filteredResults = examResults.filter(r => {
    const matchClass = classFilter === 'all' || r.class_name === classFilter;
    const matchSearch = !searchStudent.trim() || 
      r.full_name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      r.sbd.toLowerCase().includes(searchStudent.toLowerCase()) ||
      r.cccd.toLowerCase().includes(searchStudent.toLowerCase());
    return matchClass && matchSearch;
  });

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>QUẢN LÝ KỲ THI & TRA CỨU ĐIỂM THI ĐA MÔN</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400/20 text-emerald-300 font-mono border border-emerald-400/30">
                  Chuẩn hóa CCCD
                </span>
              </h2>
              <p className="text-xs text-blue-100 opacity-90">
                Nạp duy nhất 1 file Excel Bảng điểm tổng hợp các môn • Học sinh tra cứu bằng SBD + CCCD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast thông báo */}
        {toastMessage && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-rose-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 text-xs font-bold overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Nạp File Bảng Điểm (.xlsx)</span>
          </button>

          <button
            onClick={() => setActiveTab('view_scores')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'view_scores'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Danh sách Điểm đã nạp ({examResults.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'exams'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>3. Quản lý Kỳ thi & Công bố ({exams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sql_guide')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'sql_guide'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>4. Mã SQL Supabase</span>
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: NẠP DUY NHẤT 1 FILE EXCEL BẢNG ĐIỂM TỔNG HỢP CÁC MÔN */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              
              {/* Chọn Kỳ thi tiếp nhận dữ liệu */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Chọn Kỳ thi / Bài kiểm tra nhận bảng điểm:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.academic_year}) - Hiện có {e.total_candidates || 0} bài thi
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateExamForm(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo Kỳ thi mới</span>
                </button>
              </div>

              {/* KHUNG IMPORT DUY NHẤT – CHUẨN HÓA FILE PHẲNG CÓ CỘT CCCD */}
              <div className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-slate-50 rounded-2xl p-6 sm:p-8 text-center transition-all space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Nạp Bảng Điểm Tổng Hợp Các Môn (.xlsx / .xls)
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                    Hệ thống tự động đọc <strong>Cột CCCD (Mật khẩu)</strong>, <strong>SBD (Tài khoản)</strong>, Họ tên, Lớp và <strong>tất cả các môn học có trong file</strong> (Toán, Lý, Hóa, Sinh, Tin, CNCN, CNNN, Sử, Địa, GDKT PL, Tiếng Anh...).
                  </p>
                </div>

                {/* Các nút hành động chính */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <label className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Đang phân tích và nạp điểm...' : 'Chọn file Excel nạp điểm'}</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleUploadExcel}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Tải file Excel mẫu chuẩn (Có cột CCCD)</span>
                  </button>
                </div>

                {/* Thống kê sau khi nạp */}
                {uploadStats && (
                  <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 text-left max-w-xl mx-auto space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Nạp thành công {uploadStats.total} thí sinh!</span>
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Đã nhận diện {uploadStats.subjects.length} môn thi: <strong>{uploadStats.subjects.join(', ')}</strong>.
                    </div>
                  </div>
                )}
              </div>

              {/* Bảng minh họa cấu trúc chuẩn */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Quy ước cấu trúc File Excel chuẩn hóa:</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-[11px] border border-slate-200 bg-white">
                    <thead className="bg-amber-100 font-bold text-slate-800">
                      <tr>
                        <th className="p-1.5 border border-slate-200">TT</th>
                        <th className="p-1.5 border border-slate-200 bg-yellow-200 text-blue-900">CCCD (Mật khẩu)</th>
                        <th className="p-1.5 border border-slate-200">Họ và tên</th>
                        <th className="p-1.5 border border-slate-200 bg-yellow-200 text-blue-900">SBD (Tài khoản)</th>
                        <th className="p-1.5 border border-slate-200">Lớp</th>
                        <th className="p-1.5 border border-slate-200">Ngày Sinh</th>
                        <th className="p-1.5 border border-slate-200 bg-emerald-100">Toán</th>
                        <th className="p-1.5 border border-slate-200 bg-emerald-100">Lý</th>
                        <th className="p-1.5 border border-slate-200 bg-emerald-100">Hóa</th>
                        <th className="p-1.5 border border-slate-200 bg-emerald-100">... (Môn khác)</th>
                        <th className="p-1.5 border border-slate-200">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 font-mono">
                      <tr>
                        <td className="p-1 border border-slate-200">1</td>
                        <td className="p-1 border border-slate-200 font-bold text-slate-800">038209009347</td>
                        <td className="p-1 border border-slate-200 font-sans text-left">Lê Đức Anh</td>
                        <td className="p-1 border border-slate-200 font-bold text-blue-700">52830017</td>
                        <td className="p-1 border border-slate-200 font-sans">12A1</td>
                        <td className="p-1 border border-slate-200">17/09/2009</td>
                        <td className="p-1 border border-slate-200 font-bold text-emerald-700">6.0</td>
                        <td className="p-1 border border-slate-200 text-slate-300">—</td>
                        <td className="p-1 border border-slate-200 text-slate-300">—</td>
                        <td className="p-1 border border-slate-200 font-sans text-slate-400">Sử (8.5), Địa (4.9)</td>
                        <td className="p-1 border border-slate-200 font-sans">2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  * Ô để trống = Học sinh không học/không thi môn này • Ô có chữ <strong>VT</strong> = Vắng thi • Ô có số = Điểm thi.
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: XEM DANH SÁCH ĐIỂM ĐÃ NẠP CỦA KỲ THI */}
          {activeTab === 'view_scores' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.total_candidates || 0} bài)
                      </option>
                    ))}
                  </select>

                  {uniqueClasses.length > 0 && (
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="all">Tất cả các lớp ({uniqueClasses.length} lớp)</option>
                      {uniqueClasses.map(c => (
                        <option key={c} value={c}>Lớp {c}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Tìm theo tên, SBD, CCCD..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bảng điểm chi tiết */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10">STT</th>
                        <th className="py-2.5 px-3">SBD (Tài khoản)</th>
                        <th className="py-2.5 px-3">Họ và tên</th>
                        <th className="py-2.5 px-3">Lớp</th>
                        <th className="py-2.5 px-3">CCCD (Mật khẩu)</th>
                        <th className="py-2.5 px-3">Các môn đã dự thi</th>
                        <th className="py-2.5 px-3 text-right">Điểm TB</th>
                        <th className="py-2.5 px-3 text-right w-16">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {isLoadingResults ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic font-sans">
                            Đang tải danh sách điểm từ CSDL...
                          </td>
                        </tr>
                      ) : filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic font-sans">
                            Chưa có dữ liệu bài thi nào trong kỳ thi này. Thầy/Cô hãy chuyển sang Tab 1 "Nạp File Bảng Điểm (.xlsx)".
                          </td>
                        </tr>
                      ) : (
                        filteredResults.map((r, idx) => {
                          const scoresObj = r.subject_scores || {};
                          const scoreEntries = Object.entries(scoresObj).filter(([_, v]) => v !== null && v !== undefined && v !== '');

                          return (
                            <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-blue-700">{r.sbd}</td>
                              <td className="py-2 px-3 font-bold font-sans text-slate-900">{r.full_name}</td>
                              <td className="py-2 px-3 font-sans text-slate-700 font-semibold">{r.class_name}</td>
                              <td className="py-2 px-3 text-slate-600 font-bold">{r.cccd}</td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1 font-sans text-[11px]">
                                  {scoreEntries.length === 0 ? (
                                    <span className="text-slate-400 italic">Chưa có điểm môn</span>
                                  ) : (
                                    scoreEntries.map(([subj, val]) => (
                                      <span
                                        key={subj}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                          val === 'VT' || val === 'Vắng'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-blue-50 text-blue-800 border-blue-200'
                                        }`}
                                      >
                                        {subj}: <strong>{val}</strong>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-black text-slate-900 text-sm">
                                {r.average_score !== null && r.average_score !== undefined
                                  ? r.average_score.toFixed(2)
                                  : r.total_score.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {r.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteScore(r.id!, r.full_name)}
                                    className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    title="Xóa bài thi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN LÝ KỲ THI & CÔNG BỐ */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quản lý Đợt thi & Trạng thái Công bố Tra cứu</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Học sinh chỉ tra cứu được các kỳ thi đang bật trạng thái <strong>"Đang công bố"</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateExamForm(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo kỳ thi mới</span>
                </button>
              </div>

              {/* Bảng danh sách kỳ thi */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Tên kỳ thi / Kiểm tra</th>
                      <th className="py-2.5 px-3">Năm học</th>
                      <th className="py-2.5 px-3 text-center">Nguồn CSDL</th>
                      <th className="py-2.5 px-3 text-center">Số bài thi</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái Tra cứu</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          Chưa có kỳ thi nào trong hệ thống.
                        </td>
                      </tr>
                    ) : (
                      exams.map((ex) => (
                        <tr 
                          key={ex.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            selectedExamId === ex.id ? 'bg-blue-50/60 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ex.title}</div>
                            <div className="text-[11px] text-slate-400">{ex.exam_type} • {ex.exam_date || 'Chưa đặt ngày'}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono">{ex.academic_year}</td>
                          <td className="py-3 px-3 text-center">
                            {ex.id && ex.id.length === 36 && ex.id.includes('-') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Đã lưu trên CSDL Supabase Cloud">
                                <Cloud className="w-3 h-3 text-emerald-600" />
                                <span>Supabase</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Đang lưu tại bộ đệm máy chủ">
                                <Database className="w-3 h-3 text-amber-600" />
                                <span>Cục bộ</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono">
                              {ex.total_candidates || 0} bài
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(ex)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                ex.is_published
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300'
                              }`}
                              title={ex.is_published ? 'Bấm để Tạm ẩn tra cứu' : 'Bấm để Mở công bố tra cứu'}
                            >
                              <span className={`w-2 h-2 rounded-full ${ex.is_published ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              <span>{ex.is_published ? 'Đang công bố' : 'Tạm ẩn'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExamId(ex.id);
                                setActiveTab('upload');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Chuyển sang tab Nạp file bảng điểm"
                            >
                              Nạp điểm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExamId(ex.id);
                                setActiveTab('view_scores');
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Xem điểm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(ex.id, ex.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Xóa kỳ thi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HƯỚNG DẪN SQL CHO SUPABASE */}
          {activeTab === 'sql_guide' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 space-y-2">
                <div className="font-bold flex items-center gap-2 text-sm text-indigo-950">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>3 Bước khởi tạo bảng Tra cứu Điểm Đa Môn trên Supabase:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 leading-relaxed">
                  <li>Đăng nhập <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">Supabase Dashboard</a> và mở Project trường của Thầy/Cô.</li>
                  <li>Nhìn sang cột menu bên trái, chọn mục <strong>SQL Editor</strong> rồi bấm <strong>New query</strong>.</li>
                  <li>Bấm nút <strong>"Copy toàn bộ mã SQL"</strong> bên dưới, dán vào ô soạn thảo rồi bấm nút <strong>RUN</strong>.</li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-xs font-mono">
                  <span>supabase_schema_score_lookup.sql</span>
                  <button
                    type="button"
                    onClick={copySqlCode}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-sans font-semibold transition-colors cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Đã copy vào bộ nhớ tạm!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy toàn bộ mã SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-b-xl text-[11px] font-mono overflow-x-auto max-h-[45vh] leading-relaxed border-t border-slate-700">
                  {supabaseSqlScript}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Hỗ trợ nạp file bảng điểm phẳng có cột CCCD • Tự động nhận diện động không giới hạn số môn thi.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* POPUP TẠO KỲ THI MỚI (Mở được từ cả Tab 1 và Tab 3) */}
      {showCreateExamForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Tạo Kỳ thi / Đợt kiểm tra mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateExamForm(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-5 space-y-4 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Tên Kỳ thi / Đợt kiểm tra (*):</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Kỳ thi Khảo sát Năng lực Lớp 12 (Lần 1)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Loại kỳ thi:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Thi thử / Khảo sát">Thi thử / Khảo sát</option>
                    <option value="Kiểm tra định kỳ">Kiểm tra định kỳ</option>
                    <option value="Thi học kỳ">Thi học kỳ</option>
                    <option value="Kiểm tra thường xuyên">Kiểm tra thường xuyên</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Năm học:</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="2026-2027"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Phạm vi môn thi:</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Tổng hợp các môn"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ngày thi / Tổ chức:</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsPublished}
                    onChange={(e) => setNewIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">
                    Mở công bố ngay cho học sinh tra cứu sau khi tạo
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateExamForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingExam}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingExam ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Lưu kỳ thi lên CSDL</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
