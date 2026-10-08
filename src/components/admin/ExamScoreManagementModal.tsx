import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Plus, Trash2, Edit3, Upload, Download, Database, Cloud, 
  CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Search,
  FileSpreadsheet, Users, GraduationCap, Copy, Check, Terminal, ExternalLink, ShieldCheck, Sparkles, Filter, BookOpen,
  Image as ImageIcon, Folder, FolderUp, ZoomIn, ZoomOut, RotateCw, AlertTriangle, CheckCheck,
  HardDrive, Settings, Zap, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExamSeason, StudentExamScoreRecord, UserProfile, hasUserPermission } from '../../types';
import { exportMultiSubjectStatisticsExcel } from '../../utils/scoreStatisticsExcelExport';
import { FilterRemedialStudentsModal } from './FilterRemedialStudentsModal';

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
  // Xác định thẩm quyền chi tiết của tài khoản hiện tại
  const canImportScores = currentUser ? hasUserPermission(currentUser, 'CSDL_IMPORT_DIEM') : false;
  const canManageExams = currentUser ? hasUserPermission(currentUser, 'CSDL_QUAN_LY_KY_THI') : false;
  const canSyncImages = currentUser ? hasUserPermission(currentUser, 'CSDL_DONG_BO_ANH') : false;
  const canViewSql = currentUser ? (currentUser.role === 'Admin' || hasUserPermission(currentUser, 'QUAN_TRI_TAI_KHOAN')) : false;

  // Nếu người dùng không có quyền nạp điểm (ví dụ Tổ trưởng), mặc định mở vào Tab 2 (Xem điểm & Lọc thống kê)
  const [activeTab, setActiveTab] = useState<'upload' | 'view_scores' | 'paper_images' | 'exams' | 'sql_guide'>(
    canImportScores ? 'upload' : 'view_scores'
  );

  useEffect(() => {
    if (!canImportScores && activeTab === 'upload') {
      setActiveTab('view_scores');
    }
  }, [canImportScores]);
  
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
  const [showRemedialFilterModal, setShowRemedialFilterModal] = useState<boolean>(false);
  const [isExportingStats, setIsExportingStats] = useState<boolean>(false);

  // State Quản lý Sửa điểm & Thêm thí sinh thi bù / phúc khảo
  const [editingStudent, setEditingStudent] = useState<StudentExamScoreRecord | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState<boolean>(false);
  const [editSbd, setEditSbd] = useState<string>('');
  const [editFullName, setEditFullName] = useState<string>('');
  const [editClassName, setEditClassName] = useState<string>('');
  const [editCccd, setEditCccd] = useState<string>('');
  const [editDob, setEditDob] = useState<string>('');
  const [editSubjectScores, setEditSubjectScores] = useState<{ subject: string; score: string }[]>([]);
  const [isSavingStudentScore, setIsSavingStudentScore] = useState<boolean>(false);
  const [editScoreError, setEditScoreError] = useState<string | null>(null);

  // Trạng thái thông báo & upload
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; subjects: string[] } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Quản lý ảnh bài thi scan
  const [selectedPaperSubject, setSelectedPaperSubject] = useState<string>('Ngữ văn');
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');
  const [paperUploadMode, setPaperUploadMode] = useState<'folder' | 'subject'>('folder');
  const [stagedPapers, setStagedPapers] = useState<{
    file: File;
    fileName: string;
    relativePath: string;
    sbd: string;
    subject: string;
    matchedStudent?: StudentExamScoreRecord;
    status: 'ready' | 'not_in_exam' | 'invalid_sbd';
  }[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [isUploadingPapers, setIsUploadingPapers] = useState<boolean>(false);
  const [uploadPaperProgress, setUploadPaperProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentSubject: string;
  } | null>(null);

  // Modal xem trước ảnh bài thi trong Admin (Lightbox)
  const [previewAdminPaper, setPreviewAdminPaper] = useState<{
    url: string;
    subject: string;
    sbd: string;
    studentName: string;
    className: string;
  } | null>(null);
  const [adminZoomLevel, setAdminZoomLevel] = useState<number>(1);
  const [adminRotation, setAdminRotation] = useState<number>(0);

  // Bộ lọc danh sách ảnh bài thi đã nạp
  const [gallerySubjectFilter, setGallerySubjectFilter] = useState<string>('all');
  const [gallerySearch, setGallerySearch] = useState<string>('');
  const [isDeletingPapers, setIsDeletingPapers] = useState<boolean>(false);
  const [isSyncingStorage, setIsSyncingStorage] = useState<boolean>(false);

  // Cấu hình Bucket & Nén ảnh (Giải pháp giải quyết triệt để giới hạn 50MB)
  const [bucketMode, setBucketMode] = useState<'per_subject' | 'custom' | 'shared'>('per_subject');
  const [customBucketName, setCustomBucketName] = useState<string>('');
  const [enableCompression, setEnableCompression] = useState<boolean>(true);
  const [compressionMode, setCompressionMode] = useState<'standard' | 'high' | 'none'>('standard');
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      'item_responses', v_result.item_responses,
      'paper_images', v_result.paper_images,
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

  // Lấy danh sách bucket trên Supabase Storage
  const fetchBuckets = async () => {
    try {
      const res = await fetch('/api/admin/storage/buckets');
      const data = await res.json();
      if (data.success && Array.isArray(data.buckets)) {
        setAvailableBuckets(data.buckets.map((b: any) => b.name));
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách buckets:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExams();
      fetchBuckets();
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
        // Đồng bộ số lượng thí sinh chính xác vào kỳ thi để dropdown và giao diện khớp 100%
        setExams(prev => prev.map(e => e.id === examId ? { ...e, total_candidates: data.results.length } : e));
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
    if (!canManageExams) {
      showToast('🔒 Bị khóa: Bạn không có quyền tạo kỳ thi mới (cần quyền CSDL_QUAN_LY_KY_THI).', 'error');
      return;
    }
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
    if (!canManageExams) {
      showToast('🔒 Bị khóa: Bạn không có quyền thay đổi trạng thái công bố kỳ thi.', 'error');
      return;
    }
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
    if (!canManageExams) {
      showToast('🔒 Bị khóa: Bạn không có quyền xóa kỳ thi trên CSDL.', 'error');
      return;
    }
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

    if (!canImportScores) {
      showToast('🔒 Bị khóa: Bạn không có quyền nạp điểm vào CSDL (cần quyền CSDL_IMPORT_DIEM).', 'error');
      e.target.value = '';
      return;
    }

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

  // Mở popup chỉnh sửa điểm cho 1 học sinh (Đính chính điểm, phúc khảo, thi bù)
  const handleOpenEditStudent = (student: StudentExamScoreRecord) => {
    setEditingStudent(student);
    setIsCreatingStudent(false);
    setEditSbd(student.sbd || '');
    setEditFullName(student.full_name || '');
    setEditClassName(student.class_name || '');
    setEditCccd(student.cccd || '');
    setEditDob(student.dob || '');

    const scoresObj = student.subject_scores || {};
    const list: { subject: string; score: string }[] = [];
    Object.entries(scoresObj).forEach(([sub, scoreVal]) => {
      list.push({ subject: sub, score: scoreVal !== undefined && scoreVal !== null ? String(scoreVal) : '' });
    });
    if (list.length === 0) {
      list.push({ subject: 'Toán', score: '' });
    }
    setEditSubjectScores(list);
    setEditScoreError(null);
  };

  // Mở popup thêm mới thí sinh thi bù (Chưa có trong danh sách nạp trước đó)
  const handleOpenCreateStudent = () => {
    setEditingStudent(null);
    setIsCreatingStudent(true);
    setEditSbd('');
    setEditFullName('');
    setEditClassName(classFilter !== 'all' ? classFilter : '12A1');
    setEditCccd('');
    setEditDob('');
    setEditSubjectScores([
      { subject: 'Toán', score: '' },
      { subject: 'Ngữ văn', score: '' }
    ]);
    setEditScoreError(null);
  };

  // Thêm dòng môn thi mới trong form sửa/thêm
  const handleAddSubjectRow = () => {
    const commonSubjects = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học', 'GDKTPL', 'Công nghệ'];
    const existing = new Set(editSubjectScores.map(s => s.subject));
    const nextSub = commonSubjects.find(s => !existing.has(s)) || 'Môn khác';
    setEditSubjectScores(prev => [...prev, { subject: nextSub, score: '' }]);
  };

  // Xóa 1 dòng môn thi
  const handleRemoveSubjectRow = (index: number) => {
    setEditSubjectScores(prev => prev.filter((_, idx) => idx !== index));
  };

  // Thay đổi điểm hoặc tên môn
  const handleSubjectScoreChange = (index: number, field: 'subject' | 'score', val: string) => {
    setEditSubjectScores(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));
  };

  // Tính Điểm TB xem trước trực tiếp khi người dùng nhập điểm
  const calculatedPreviewStats = useMemo(() => {
    let total = 0;
    let count = 0;
    editSubjectScores.forEach(it => {
      const num = parseFloat(it.score);
      if (!isNaN(num) && num >= 0 && num <= 10) {
        total += num;
        count++;
      }
    });
    const avg = count > 0 ? (total / count).toFixed(2) : '0.00';
    return {
      average: avg,
      total: total.toFixed(2),
      count
    };
  }, [editSubjectScores]);

  // Lưu chỉnh sửa hoặc thêm mới điểm học sinh lên Supabase Cloud
  const handleSaveStudentScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canImportScores && !canManageExams) {
      showToast('🔒 Bị khóa: Bạn không có quyền chỉnh sửa dữ liệu điểm trên CSDL.', 'error');
      return;
    }
    if (!editSbd.trim() || !editFullName.trim()) {
      setEditScoreError('Vui lòng nhập đầy đủ Số báo danh (SBD) và Họ và tên thí sinh.');
      return;
    }

    const cleanMap: Record<string, number> = {};
    for (const it of editSubjectScores) {
      if (it.subject.trim()) {
        const num = parseFloat(it.score);
        if (!isNaN(num)) {
          if (num < 0 || num > 10) {
            setEditScoreError(`Điểm môn "${it.subject}" không hợp lệ (phải nằm trong khoảng từ 0.0 đến 10.0).`);
            return;
          }
          cleanMap[it.subject.trim()] = Math.round(num * 100) / 100;
        }
      }
    }

    setIsSavingStudentScore(true);
    setEditScoreError(null);

    try {
      if (isCreatingStudent) {
        // Thêm mới thí sinh thi bù
        const res = await fetch('/api/admin/exam-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: selectedExamId,
            sbd: editSbd.trim(),
            full_name: editFullName.trim(),
            class_name: editClassName.trim(),
            dob: editDob.trim(),
            cccd: editCccd.trim(),
            subject_scores: cleanMap
          })
        });
        const data = await res.json();
        if (data.success && data.record) {
          showToast(`Đã bổ sung thí sinh "${editFullName.trim()}" vào kỳ thi và CSDL Supabase!`, 'success');
          setExamResults(prev => [data.record, ...prev]);
          setEditingStudent(null);
          setIsCreatingStudent(false);
          await fetchExams();
        } else {
          setEditScoreError(data.error || 'Lỗi khi thêm mới thí sinh');
        }
      } else if (editingStudent) {
        // Cập nhật điểm cho thí sinh đã có
        const res = await fetch(`/api/admin/exam-results/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: selectedExamId,
            sbd: editSbd.trim(),
            full_name: editFullName.trim(),
            class_name: editClassName.trim(),
            dob: editDob.trim(),
            cccd: editCccd.trim(),
            subject_scores: cleanMap
          })
        });
        const data = await res.json();
        if (data.success && data.record) {
          showToast(`Đã cập nhật điểm thí sinh "${editFullName.trim()}" thành công lên CSDL Supabase!`, 'success');
          setExamResults(prev => prev.map(r => r.id === editingStudent.id ? { ...r, ...data.record } : r));
          setEditingStudent(null);
          setIsCreatingStudent(false);
        } else {
          setEditScoreError(data.error || 'Lỗi khi cập nhật điểm thí sinh');
        }
      }
    } catch (err: any) {
      setEditScoreError(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSavingStudentScore(false);
    }
  };

  // Xóa 1 bản ghi điểm
  const handleDeleteScore = async (resultId: string, studentName: string) => {
    if (!canImportScores && !canManageExams) {
      showToast('🔒 Bị khóa: Bạn không có quyền xóa dữ liệu bài thi trên CSDL.', 'error');
      return;
    }
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

  // Bóc tách SBD từ tên file: "52830012 - Hoàng Nhật Anh.jpg" -> "52830012"
  const parseSbdFromFilename = (fileName: string): string => {
    const base = fileName.split(/[\\/]/).pop() || fileName;
    const clean = base.trim();
    const dashParts = clean.split('-');
    if (dashParts.length > 1) {
      const firstDigits = dashParts[0].trim().replace(/\D/g, '');
      if (firstDigits.length >= 4) return firstDigits;
    }
    const match = clean.match(/\b\d{4,12}\b/);
    if (match) return match[0];
    const leading = clean.match(/^\d+/);
    if (leading && leading[0].length >= 4) return leading[0];
    return clean.replace(/\D/g, '');
  };

  // Nhận diện môn học từ đường dẫn thư mục: "Ngữ văn/52830012.jpg" -> "Ngữ văn"
  const detectSubjectFromPath = (relativePath: string, fallbackSubject: string): string => {
    if (!relativePath) return fallbackSubject;
    const parts = relativePath.split(/[\\/]/).filter(Boolean);
    if (parts.length > 1) {
      const parentFolder = parts[parts.length - 2].trim();
      if (parentFolder) return parentFolder;
    }
    return fallbackSubject;
  };

  // Xử lý khi chọn file hoặc thư mục ảnh bài thi
  const handleFilesSelected = (files: FileList | null, isFolderMode: boolean) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const stagedList: typeof stagedPapers = [];
    const currentSubject = customSubjectInput.trim() || selectedPaperSubject;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) continue;

      const relPath = (f as any).webkitRelativePath || f.name;
      const subject = isFolderMode 
        ? detectSubjectFromPath(relPath, currentSubject)
        : currentSubject;

      const sbd = parseSbdFromFilename(f.name);
      const matched = sbd ? examResults.find(r => String(r.sbd).trim().toLowerCase() === sbd.toLowerCase()) : undefined;

      let status: 'ready' | 'not_in_exam' | 'invalid_sbd' = 'ready';
      if (!sbd) {
        status = 'invalid_sbd';
      } else if (!matched) {
        status = 'not_in_exam';
      }

      stagedList.push({
        file: f,
        fileName: f.name,
        relativePath: relPath,
        sbd,
        subject,
        matchedStudent: matched,
        status
      });
    }

    setStagedPapers(stagedList);
    setIsProcessingFiles(false);
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Hàm nén ảnh thông minh trên Canvas (giảm 95% dung lượng: từ 3MB xuống ~70KB mà vẫn nét 100%)
  const compressImage = (file: File, maxWidth = 1400, quality = 0.78): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        fileToDataUrl(file).then(resolve);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          } else {
            resolve(e.target?.result as string || '');
          }
        };
        img.onerror = () => resolve(e.target?.result as string || '');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Bắt đầu nạp hàng loạt ảnh bài thi lên Supabase (Hỗ trợ nén ảnh & phân tách Bucket)
  const handleStartUploadPapers = async () => {
    if (!canSyncImages) {
      showToast('🔒 Bị khóa: Bạn không có quyền nạp ảnh bài thi lên Supabase Storage (cần quyền CSDL_DONG_BO_ANH).', 'error');
      return;
    }
    if (!selectedExamId) {
      showToast('Vui lòng chọn kỳ thi trước khi nạp ảnh bài thi!', 'error');
      return;
    }
    if (stagedPapers.length === 0) {
      showToast('Chưa có tệp ảnh nào được chọn!', 'error');
      return;
    }

    const validItems = stagedPapers.filter(p => p.status !== 'invalid_sbd');
    if (validItems.length === 0) {
      showToast('Không có tệp ảnh nào hợp lệ để tải lên!', 'error');
      return;
    }

    setIsUploadingPapers(true);
    setUploadPaperProgress({ current: 0, total: validItems.length, percent: 0, currentSubject: '' });

    const CHUNK_SIZE = 6;
    let totalUploaded = 0;
    let totalMatched = 0;
    const failedFiles: string[] = [];

    try {
      for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
        const chunk = validItems.slice(i, i + CHUNK_SIZE);

        const currentSubject = chunk[0]?.subject || selectedPaperSubject;
        setUploadPaperProgress({
          current: i,
          total: validItems.length,
          percent: Math.round((i / validItems.length) * 100),
          currentSubject: `Môn ${currentSubject} (${i + 1}-${Math.min(i + chunk.length, validItems.length)}/${validItems.length})`
        });

        // Chuẩn bị và nén ảnh song song
        const preparedPapers = await Promise.all(
          chunk.map(async (item) => {
            let dataUrl = '';
            try {
              if (enableCompression && compressionMode !== 'none') {
                const maxWidth = compressionMode === 'high' ? 1800 : 1350;
                const quality = compressionMode === 'high' ? 0.85 : 0.75;
                dataUrl = await compressImage(item.file, maxWidth, quality);
              } else {
                dataUrl = await fileToDataUrl(item.file);
              }
            } catch {
              dataUrl = await fileToDataUrl(item.file);
            }
            return {
              fileName: item.fileName,
              subject: item.subject,
              dataUrl
            };
          })
        );

        // Gửi chunk lên máy chủ kèm cơ chế tự động thử lại (Retry) nếu chập chờn mạng
        let chunkSuccess = false;
        let attempt = 0;
        while (!chunkSuccess && attempt < 3) {
          attempt++;
          try {
            const res = await fetch(`/api/admin/exams/${selectedExamId}/upload-papers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: currentSubject,
                bucketMode,
                customBucket: customBucketName.trim(),
                papers: preparedPapers
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                totalUploaded += data.uploadedCount || chunk.length;
                totalMatched += data.matchedCount || 0;
                chunkSuccess = true;
              } else {
                throw new Error(data.error || 'Server error');
              }
            } else {
              throw new Error(`HTTP ${res.status}`);
            }
          } catch (chunkErr) {
            if (attempt >= 3) {
              console.warn(`Lỗi gửi chunk ${i} sau 3 lần thử:`, chunkErr);
              chunk.forEach(c => failedFiles.push(c.fileName));
            } else {
              // Nghỉ 1 giây trước khi thử lại
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }

      setUploadPaperProgress({
        current: validItems.length,
        total: validItems.length,
        percent: 100,
        currentSubject: 'Hoàn tất!'
      });

      if (failedFiles.length === 0) {
        showToast(`Đã nạp thành công toàn bộ ${totalUploaded} ảnh bài thi lên Supabase Storage (${totalMatched} bài khớp hồ sơ)!`, 'success');
      } else {
        showToast(`Đã nạp thành công ${totalUploaded}/${validItems.length} ảnh (${failedFiles.length} file bị gián đoạn mạng)`, 'error');
      }

      setStagedPapers([]);
      await fetchResults(selectedExamId);
      await fetchExams();
      await fetchBuckets();
    } catch (err: any) {
      showToast('Lỗi khi tải ảnh lên Supabase: ' + (err?.message || ''), 'error');
    } finally {
      setIsUploadingPapers(false);
      setUploadPaperProgress(null);
    }
  };

  // Xóa ảnh của 1 học sinh theo môn
  const handleDeleteStudentPaper = async (sbd: string, subject: string, studentName: string) => {
    if (!canSyncImages) {
      showToast('🔒 Bị khóa: Bạn không có quyền xóa ảnh bài thi (cần quyền CSDL_DONG_BO_ANH).', 'error');
      return;
    }
    if (!window.confirm(`Thầy/Cô có chắc chắn muốn xóa ảnh bài thi môn ${subject} của học sinh "${studentName}" (SBD: ${sbd})?`)) return;

    try {
      const res = await fetch(`/api/admin/exams/${selectedExamId}/papers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sbd, subject })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa ảnh bài thi môn ${subject} của SBD ${sbd}!`, 'success');
        // Cập nhật ngay trên bộ nhớ để giao diện phản hồi tức thì
        setExamResults(prev => prev.map(r => {
          if (r.sbd !== sbd) return r;
          let updatedItemResponses = Array.isArray(r.item_responses) ? [...r.item_responses] : [];
          const idx = updatedItemResponses.findIndex((it: any) => it && (it.type === 'paper_images' || it.paper_images));
          if (idx >= 0 && updatedItemResponses[idx].data) {
            delete updatedItemResponses[idx].data[subject];
          }
          let updatedPaperImgs = { ...(r.paper_images || {}) };
          delete updatedPaperImgs[subject];
          return {
            ...r,
            item_responses: updatedItemResponses,
            paper_images: updatedPaperImgs
          };
        }));
        await fetchResults(selectedExamId);
      } else {
        showToast(data.error || 'Lỗi khi xóa ảnh bài thi', 'error');
      }
    } catch {
      showToast('Lỗi khi xóa ảnh bài thi', 'error');
    }
  };

  // Xóa toàn bộ ảnh của 1 môn trong kỳ thi (Tối ưu phản hồi tức thì và dọn dẹp Storage)
  const handleDeleteAllPapersOfSubject = async (subject: string) => {
    if (!canSyncImages) {
      showToast('🔒 Bị khóa: Bạn không có quyền xóa ảnh bài thi (cần quyền CSDL_DONG_BO_ANH).', 'error');
      return;
    }
    if (!window.confirm(`CẢNH BÁO: Thầy/Cô có chắc chắn muốn xóa TOÀN BỘ ảnh bài thi môn "${subject}" của tất cả thí sinh trong kỳ thi này không?\n\n(Hành động này sẽ xóa cả dữ liệu trong bảng điểm và giải phóng dung lượng trên Supabase Storage).`)) return;

    setIsDeletingPapers(true);
    try {
      const res = await fetch(`/api/admin/exams/${selectedExamId}/papers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa sạch toàn bộ ảnh bài thi môn "${subject}" và dọn dẹp Storage thành công!`, 'success');
        
        // Cập nhật tức thì React state để badge và bảng điểm đổi ngay lập tức
        setExamResults(prev => prev.map(r => {
          let updatedItemResponses = Array.isArray(r.item_responses) ? [...r.item_responses] : [];
          const idx = updatedItemResponses.findIndex((it: any) => it && (it.type === 'paper_images' || it.paper_images));
          if (idx >= 0 && updatedItemResponses[idx].data) {
            delete updatedItemResponses[idx].data[subject];
          }
          let updatedPaperImgs = { ...(r.paper_images || {}) };
          delete updatedPaperImgs[subject];
          return {
            ...r,
            item_responses: updatedItemResponses,
            paper_images: updatedPaperImgs
          };
        }));

        setGallerySubjectFilter('all');
        await fetchResults(selectedExamId);
      } else {
        showToast(data.error || 'Lỗi khi xóa ảnh', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xóa ảnh', 'error');
    } finally {
      setIsDeletingPapers(false);
    }
  };

  // Quét & Tự động đồng bộ toàn bộ ảnh từ các Bucket Storage trên Supabase vào CSDL
  const handleSyncStoragePapers = async () => {
    if (!canSyncImages) {
      showToast('🔒 Bị khóa: Bạn không có quyền đồng bộ ảnh từ Storage (cần quyền CSDL_DONG_BO_ANH).', 'error');
      return;
    }
    if (!selectedExamId) {
      showToast('Vui lòng chọn kỳ thi trước khi đồng bộ ảnh!', 'error');
      return;
    }
    setIsSyncingStorage(true);
    try {
      const res = await fetch(`/api/admin/exams/${selectedExamId}/sync-storage-papers`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã đồng bộ thành công ${data.totalFiles} ảnh bài thi!`, 'success');
        await fetchResults(selectedExamId);
        await fetchExams();
        await fetchBuckets();
      } else {
        showToast(data.error || 'Lỗi khi đồng bộ ảnh từ Storage', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi đồng bộ ảnh', 'error');
    } finally {
      setIsSyncingStorage(false);
    }
  };

  // Danh sách toàn bộ ảnh bài thi đã nạp trong kỳ thi đang chọn
  const uploadedPapersList = useMemo(() => {
    const list: {
      sbd: string;
      fullName: string;
      className: string;
      subject: string;
      url: string;
      studentId?: string;
    }[] = [];

    examResults.forEach(r => {
      let pImgs = r.paper_images || {};
      if (Object.keys(pImgs).length === 0 && Array.isArray(r.item_responses)) {
        const pMeta = r.item_responses.find((it: any) => it && (it.type === 'paper_images' || it.paper_images));
        if (pMeta) {
          pImgs = pMeta.data || pMeta.paper_images || {};
        }
      }
      Object.entries(pImgs).forEach(([subj, url]) => {
        if (url) {
          list.push({
            sbd: r.sbd,
            fullName: r.full_name,
            className: r.class_name,
            subject: subj,
            url,
            studentId: r.id
          });
        }
      });
    });

    return list;
  }, [examResults]);

  // Danh sách các môn đã có ảnh
  const existingPaperSubjects = useMemo(() => {
    return Array.from(new Set(uploadedPapersList.map(p => p.subject))).sort();
  }, [uploadedPapersList]);

  // Danh sách các môn thi thực tế có trong kỳ thi
  const detectedExamSubjects = useMemo(() => {
    const set = new Set<string>();
    examResults.forEach(r => {
      const scores = r.subject_scores || {};
      Object.keys(scores).forEach(k => {
        if (k && k !== 'total' && k !== 'avg') set.add(k);
      });
      if (Array.isArray(r.item_responses)) {
        const sm = r.item_responses.find((it: any) => it && (it.type === 'subject_scores' || it.data));
        if (sm && sm.data) {
          Object.keys(sm.data).forEach(k => { if (k) set.add(k); });
        }
      }
    });
    if (set.size === 0) {
      return ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'GDKTPL', 'Tin học'];
    }
    return Array.from(set).sort();
  }, [examResults]);

  // Xuất Báo cáo Thống kê Phổ điểm Đa Sheet
  const handleExportMultiSubjectStatistics = async () => {
    if (examResults.length === 0) {
      showToast('Chưa có dữ liệu học sinh để xuất thống kê!', 'error');
      return;
    }
    const currentExam = exams.find(e => e.id === selectedExamId);
    setIsExportingStats(true);
    try {
      await exportMultiSubjectStatisticsExcel({
        examTitle: currentExam?.title || 'Kỳ thi',
        academicYear: currentExam?.academic_year || activeSchoolYear,
        subjects: detectedExamSubjects,
        allStudents: examResults
      });
      showToast('Đã xuất thành công file Excel Báo cáo Phổ điểm đa Sheet!', 'success');
    } catch (err: any) {
      showToast('Lỗi xuất file Excel: ' + (err?.message || ''), 'error');
    } finally {
      setIsExportingStats(false);
    }
  };

  // Bộ lọc danh sách ảnh bài thi đã nạp
  const filteredUploadedPapers = useMemo(() => {
    return uploadedPapersList.filter(p => {
      const matchSubject = gallerySubjectFilter === 'all' || p.subject === gallerySubjectFilter;
      const matchSearch = !gallerySearch.trim() ||
        p.fullName.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        p.sbd.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        p.className.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        p.subject.toLowerCase().includes(gallerySearch.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [uploadedPapersList, gallerySubjectFilter, gallerySearch]);

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
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Nạp File Bảng Điểm (.xlsx)</span>
            {!canImportScores && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold flex items-center gap-0.5" title="Bị khóa quyền nạp dữ liệu vào CSDL">
                <Lock className="w-2.5 h-2.5" /> Bị khóa
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('view_scores')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'view_scores'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Danh sách Điểm đã nạp ({examResults.length})</span>
            {!canImportScores && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                Xem & Lọc điểm
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('paper_images')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'paper_images'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            <span className="flex items-center gap-1.5">
              <span>3. Nạp & Quản lý Ảnh Bài Thi (Scan)</span>
              {!canSyncImages ? (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold flex items-center gap-0.5" title="Chỉ xem ảnh bài thi, không có quyền nạp/xóa CSDL">
                  <Lock className="w-2.5 h-2.5" /> Chỉ xem
                </span>
              ) : uploadedPapersList.length > 0 ? (
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-mono font-bold">
                  {uploadedPapersList.length}
                </span>
              ) : null}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'exams'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>4. Quản lý Kỳ thi & Công bố ({exams.length})</span>
            {!canManageExams && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold flex items-center gap-0.5" title="Chỉ xem danh sách kỳ thi, không có quyền tạo/xóa/đổi công bố">
                <Lock className="w-2.5 h-2.5" /> Chỉ xem
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!canViewSql) {
                showToast('🔒 Chỉ Quản trị viên (Admin) mới có quyền truy cập mã SQL Supabase.', 'error');
                return;
              }
              setActiveTab('sql_guide');
            }}
            className={`py-2.5 px-4 border-b-2 rounded-t-lg flex items-center gap-2 transition-colors cursor-pointer ${
              !canViewSql
                ? 'border-transparent text-slate-400 hover:text-slate-500 opacity-60'
                : activeTab === 'sql_guide'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 font-semibold'
            }`}
            title={!canViewSql ? '🔒 Bị khóa: Chỉ dành riêng cho Quản trị viên hệ thống' : 'Mã SQL Supabase'}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>5. Mã SQL Supabase</span>
            {!canViewSql && (
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Admin
              </span>
            )}
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: NẠP DUY NHẤT 1 FILE EXCEL BẢNG ĐIỂM TỔNG HỢP CÁC MÔN */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              
              {/* Cảnh báo khi người dùng không có quyền nạp điểm */}
              {!canImportScores && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                  <div className="p-1.5 bg-amber-200/80 rounded-xl text-amber-900 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-amber-900 text-sm">
                      Chức năng Nạp Điểm CSDL đang bị khóa (Chế độ Chỉ xem):
                    </div>
                    <div className="text-amber-800 leading-relaxed">
                      Tài khoản của Thầy/Cô chỉ có thẩm quyền <strong>Xem danh sách, Tra cứu & Lọc thống kê điểm</strong>. Thao tác nạp file hoặc ghi đè CSDL điểm toàn trường yêu cầu quyền <code>CSDL_IMPORT_DIEM</code> (chỉ dành cho Quản trị viên / Ban Giám hiệu / Giáo vụ) nhằm bảo vệ an toàn toàn vẹn dữ liệu kết quả thi.
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={!canManageExams}
                  onClick={() => {
                    if (!canManageExams) {
                      showToast('🔒 Bị khóa: Bạn không có quyền tạo kỳ thi mới.', 'error');
                      return;
                    }
                    setShowCreateExamForm(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm ${
                    !canManageExams
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer'
                  }`}
                  title={!canManageExams ? '🔒 Bị khóa: Cần quyền CSDL_QUAN_LY_KY_THI' : 'Tạo kỳ thi mới'}
                >
                  {!canManageExams ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Plus className="w-4 h-4" />}
                  <span>+ Tạo Kỳ thi mới</span>
                </button>
              </div>

              {/* KHUNG IMPORT DUY NHẤT – CHUẨN HÓA FILE PHẲNG CÓ CỘT CCCD */}
              <div className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all space-y-4 ${
                !canImportScores
                  ? 'border-slate-300 bg-slate-50/80'
                  : 'border-blue-300 hover:border-blue-500 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-slate-50'
              }`}>
                <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${
                  !canImportScores ? 'bg-slate-400 text-white shadow-slate-400/20' : 'bg-blue-600 text-white shadow-blue-500/30'
                }`}>
                  {!canImportScores ? <Lock className="w-7 h-7" /> : <FileSpreadsheet className="w-7 h-7" />}
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
                  <label className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    !canImportScores
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 cursor-pointer'
                  }`}>
                    {!canImportScores ? <Lock className="w-4 h-4 text-slate-500" /> : <Upload className="w-4 h-4" />}
                    <span>
                      {!canImportScores
                        ? '🔒 Đã khóa nạp điểm (Chỉ xem thống kê)'
                        : isUploading
                          ? 'Đang phân tích và nạp điểm...'
                          : 'Chọn file Excel nạp điểm'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleUploadExcel}
                      disabled={isUploading || !canImportScores}
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 flex-1">
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

                  <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    {filteredResults.length} / {examResults.length} thí sinh
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      placeholder="Tìm theo tên, SBD, CCCD..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* Nút 1: Xuất Báo cáo Phổ điểm Đa Sheet */}
                  <button
                    type="button"
                    disabled={examResults.length === 0 || isExportingStats}
                    onClick={handleExportMultiSubjectStatistics}
                    className="px-3 py-2 bg-indigo-700 hover:bg-indigo-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                    title="Xuất file Excel gồm nhiều Sheet (mỗi môn 1 Sheet) trình bày chuẩn in A4 ngang"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                    <span>{isExportingStats ? 'Đang xuất...' : 'Xuất Báo cáo Phổ điểm (Đa Sheet)'}</span>
                  </button>

                  {/* Nút 2: Lọc DS Phụ đạo / Bồi dưỡng theo ngưỡng điểm */}
                  <button
                    type="button"
                    disabled={examResults.length === 0}
                    onClick={() => setShowRemedialFilterModal(true)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                    title="Lọc học sinh theo môn và ngưỡng điểm (< 5.0 phụ đạo, >= 8.0 bồi dưỡng) và xuất Excel"
                  >
                    <Filter className="w-4 h-4 text-emerald-200" />
                    <span>Lọc DS Phụ đạo / Bồi dưỡng</span>
                  </button>

                  {/* Nút 3: Bổ sung Thí sinh thi bù / Phúc khảo */}
                  <button
                    type="button"
                    disabled={!canImportScores && !canManageExams}
                    onClick={() => {
                      if (!canImportScores && !canManageExams) {
                        showToast('🔒 Bị khóa: Bạn không có quyền thêm mới thí sinh thi bù (cần quyền CSDL_IMPORT_DIEM hoặc CSDL_QUAN_LY_KY_THI).', 'error');
                        return;
                      }
                      handleOpenCreateStudent();
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                      !canImportScores && !canManageExams
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white cursor-pointer'
                    }`}
                    title={
                      !canImportScores && !canManageExams
                        ? '🔒 Bị khóa: Bạn chỉ có quyền Xem/Lọc điểm, không có quyền bổ sung thí sinh vào CSDL'
                        : 'Bổ sung thí sinh thi bù hoặc đính chính điểm trực tiếp không cần tải lại file'
                    }
                  >
                    {!canImportScores && !canManageExams ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>+ Thêm Thí sinh thi bù</span>
                  </button>
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
                        <th className="py-2.5 px-3 text-center">Bài thi scan</th>
                        <th className="py-2.5 px-3 text-right">Điểm TB</th>
                        <th className="py-2.5 px-3 text-right w-20">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {isLoadingResults ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 italic font-sans">
                            Đang tải danh sách điểm từ CSDL...
                          </td>
                        </tr>
                      ) : filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 italic font-sans">
                            Chưa có dữ liệu bài thi nào trong kỳ thi này. Thầy/Cô hãy chuyển sang Tab 1 "Nạp File Bảng Điểm (.xlsx)".
                          </td>
                        </tr>
                      ) : (
                        filteredResults.map((r, idx) => {
                          const scoresObj = r.subject_scores || {};
                          const scoreEntries = Object.entries(scoresObj).filter(([_, v]) => v !== null && v !== undefined && v !== '');

                          // Trích xuất ảnh bài thi scan
                          let pImgs = r.paper_images || {};
                          if (Object.keys(pImgs).length === 0 && Array.isArray(r.item_responses)) {
                            const pMeta = r.item_responses.find((it: any) => it && (it.type === 'paper_images' || it.paper_images));
                            if (pMeta) {
                              pImgs = pMeta.data || pMeta.paper_images || {};
                            }
                          }
                          const pEntries = Object.entries(pImgs).filter(([_, u]) => Boolean(u));

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
                              <td className="py-2 px-3 text-center font-sans">
                                {pEntries.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewAdminPaper({
                                        url: pEntries[0][1],
                                        subject: pEntries[0][0],
                                        sbd: r.sbd,
                                        studentName: r.full_name,
                                        className: r.class_name
                                      });
                                      setAdminZoomLevel(1);
                                      setAdminRotation(0);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                    title={pEntries.map(([s]) => s).join(', ')}
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                    <span>{pEntries.length} môn</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-slate-900 text-sm">
                                {r.average_score !== null && r.average_score !== undefined
                                  ? r.average_score.toFixed(2)
                                  : r.total_score.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {r.id && (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      disabled={!canImportScores && !canManageExams}
                                      onClick={() => {
                                        if (!canImportScores && !canManageExams) {
                                          showToast('🔒 Bị khóa: Bạn không có quyền sửa điểm thí sinh (cần quyền CSDL_IMPORT_DIEM hoặc CSDL_QUAN_LY_KY_THI).', 'error');
                                          return;
                                        }
                                        handleOpenEditStudent(r);
                                      }}
                                      className={`p-1 rounded transition-colors ${
                                        !canImportScores && !canManageExams
                                          ? 'text-slate-300 cursor-not-allowed opacity-25'
                                          : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer'
                                      }`}
                                      title={
                                        !canImportScores && !canManageExams
                                          ? '🔒 Bị khóa: Bạn chỉ có quyền Xem/Lọc điểm, không có quyền sửa điểm CSDL'
                                          : 'Sửa điểm học sinh / Phúc khảo'
                                      }
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canImportScores && !canManageExams}
                                      onClick={() => {
                                        if (!canImportScores && !canManageExams) {
                                          showToast('🔒 Bị khóa: Bạn không có quyền xóa dữ liệu bài thi trên CSDL.', 'error');
                                          return;
                                        }
                                        handleDeleteScore(r.id!, r.full_name);
                                      }}
                                      className={`p-1 rounded transition-colors ${
                                        !canImportScores && !canManageExams
                                          ? 'text-slate-300 cursor-not-allowed opacity-25'
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                      }`}
                                      title={
                                        !canImportScores && !canManageExams
                                          ? '🔒 Bị khóa: Bạn chỉ có quyền Xem/Lọc điểm, không có quyền xóa bài thi CSDL'
                                          : 'Xóa bài thi'
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
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

          {/* TAB 3: NẠP & QUẢN LÝ ẢNH BÀI THI SCAN */}
          {activeTab === 'paper_images' && (
            <div className="space-y-6">
              
              {/* Cảnh báo khi người dùng không có quyền nạp/xóa ảnh bài thi */}
              {!canSyncImages && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                  <div className="p-1.5 bg-amber-200/80 rounded-xl text-amber-900 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-amber-900 text-sm">
                      Chức năng Nạp & Quản lý Ảnh đang ở trạng thái Khóa (Chỉ xem đối soát):
                    </div>
                    <div className="text-amber-800 leading-relaxed">
                      Tài khoản của Thầy/Cô chỉ có quyền <strong>Xem và đối soát ảnh bài thi scan</strong> của học sinh. Thao tác tải ảnh mới lên hoặc xóa ảnh trên Supabase Storage yêu cầu quyền <code>CSDL_DONG_BO_ANH</code> (dành riêng cho Quản trị viên / Ban Giám hiệu / Giáo vụ).
                    </div>
                  </div>
                </div>
              )}

              {/* Header điều hướng kỳ thi & Thống kê tổng quan */}
              <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 p-4 rounded-xl border border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                      <ImageIcon className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-indigo-950">
                      Nạp & Quản lý Ảnh Phiếu Trả lời / Bài thi Scan của Thí sinh
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-800">
                    Ảnh bài thi được tự động đồng bộ lên <strong>Supabase Storage</strong> và hiển thị trực tiếp khi học sinh tra cứu điểm số.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isSyncingStorage || !canSyncImages}
                    onClick={() => {
                      if (!canSyncImages) {
                        showToast('🔒 Bị khóa: Bạn không có quyền đồng bộ ảnh từ Storage.', 'error');
                        return;
                      }
                      handleSyncStoragePapers();
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                      !canSyncImages
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white cursor-pointer'
                    }`}
                    title={!canSyncImages ? '🔒 Bị khóa: Cần quyền CSDL_DONG_BO_ANH' : 'Quét toàn bộ ảnh trong các Bucket Storage trên Supabase và liên kết tự động vào hồ sơ thí sinh'}
                  >
                    {!canSyncImages ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>🔒 Khóa đồng bộ Storage</span>
                      </>
                    ) : isSyncingStorage ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang đồng bộ từ Storage...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Quét & Đồng bộ ảnh từ Storage</span>
                      </>
                    )}
                  </button>

                  <div className="text-right">
                    <label className="block text-[11px] font-bold text-slate-600">Đang chọn Kỳ thi:</label>
                    <select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    >
                      {exams.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.title} ({e.total_candidates || 0} bài)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4 Thẻ chỉ số khảo thí */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Tổng thí sinh</div>
                  <div className="text-xl font-black font-mono text-slate-800 mt-1">{examResults.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">trong danh sách kỳ thi</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-indigo-700 uppercase">Đã có ảnh scan</div>
                  <div className="text-xl font-black font-mono text-indigo-900 mt-1">
                    {new Set(uploadedPapersList.map(p => p.sbd)).size}
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-0.5">học sinh có bài thi scan</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-blue-700 uppercase">Tổng ảnh bài thi</div>
                  <div className="text-xl font-black font-mono text-blue-900 mt-1">{uploadedPapersList.length}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    {existingPaperSubjects.length > 0 ? `${existingPaperSubjects.length} môn có ảnh` : 'Chưa có môn nào'}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Nơi lưu trữ</div>
                  <div className="text-sm font-bold text-emerald-900 mt-1 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Supabase Storage</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5 font-mono truncate" title={bucketMode === 'per_subject' ? 'Tự tách Bucket riêng theo Môn' : bucketMode === 'custom' ? `Bucket: ${customBucketName || 'Tùy biến'}` : 'Bucket: exam-papers'}>
                    {bucketMode === 'per_subject' ? '⚡ Tự tách theo Môn' : bucketMode === 'custom' ? `📁 ${customBucketName || 'Tùy chọn'}` : '📦 exam-papers'}
                  </div>
                </div>
              </div>

              {/* BẢNG CẤU HÌNH BUCKET & NÉN ẢNH (GIẢI QUYẾT TRIỆT ĐỂ GIỚI HẠN 50MB) */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Cấu hình Phân vùng Bucket & Nén ảnh (Giải quyết giới hạn 50MB)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Đã tối ưu hóa
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Linh hoạt tách bucket độc lập theo từng môn hoặc nén ảnh thông minh trước khi tải lên Cloud.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    <button
                      type="button"
                      disabled={isSyncingStorage}
                      onClick={handleSyncStoragePapers}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Quét và liên kết tự động tất cả ảnh bài thi từ Supabase Storage"
                    >
                      {isSyncingStorage ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Đang đồng bộ...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-amber-300" />
                          <span>⚡ Đồng bộ từ Storage</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={fetchBuckets}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                      title="Làm mới danh sách Buckets trên Supabase"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Làm mới danh sách Bucket</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Cột 1: Chiến lược phân tách Bucket */}
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <span>1. Chiến lược Lưu trữ Bucket trên Supabase</span>
                    </label>

                    <div className="space-y-2">
                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        bucketMode === 'per_subject'
                          ? 'bg-indigo-600/25 border-indigo-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="bucketMode"
                          value="per_subject"
                          checked={bucketMode === 'per_subject'}
                          onChange={() => setBucketMode('per_subject')}
                          className="mt-0.5 text-indigo-500 focus:ring-0"
                        />
                        <div className="space-y-0.5 text-xs">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>⚡ Tự động tạo Bucket riêng theo từng Môn (Khuyên dùng)</span>
                            <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black rounded text-[9px]">TỐI ƯU NHẤT</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Mỗi môn lưu ở 1 bucket độc lập: <code className="text-amber-300 font-mono">exam-toan</code>, <code className="text-amber-300 font-mono">exam-ngu-van</code>, <code className="text-amber-300 font-mono">exam-tieng-anh</code>... Các môn không tranh chấp dung lượng nhau!
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        bucketMode === 'custom'
                          ? 'bg-indigo-600/25 border-indigo-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="bucketMode"
                          value="custom"
                          checked={bucketMode === 'custom'}
                          onChange={() => setBucketMode('custom')}
                          className="mt-0.5 text-indigo-500 focus:ring-0"
                        />
                        <div className="space-y-1 text-xs w-full">
                          <div className="font-bold text-white">📁 Chọn hoặc nhập Bucket tùy biến (VD: KS12_L1_Toan)</div>
                          <p className="text-[11px] text-slate-300">
                            Thầy/Cô chỉ định bucket cụ thể đã tạo trên Supabase hoặc gõ tên mới.
                          </p>

                          {bucketMode === 'custom' && (
                            <div className="pt-1.5 space-y-1.5">
                              {availableBuckets.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-300 shrink-0">Bucket có sẵn:</span>
                                  <select
                                    value={availableBuckets.includes(customBucketName) ? customBucketName : ''}
                                    onChange={(e) => setCustomBucketName(e.target.value)}
                                    className="bg-slate-800 border border-slate-600 text-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono w-full focus:outline-none"
                                  >
                                    <option value="">-- Chọn bucket từ Supabase --</option>
                                    {availableBuckets.map(b => (
                                      <option key={b} value={b}>{b}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <input
                                type="text"
                                value={customBucketName}
                                onChange={(e) => setCustomBucketName(e.target.value)}
                                placeholder="Gõ tên bucket (VD: KS12_L1_Toan hoặc exam-khoi12)..."
                                className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-indigo-400"
                              />
                            </div>
                          )}
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        bucketMode === 'shared'
                          ? 'bg-indigo-600/25 border-indigo-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="bucketMode"
                          value="shared"
                          checked={bucketMode === 'shared'}
                          onChange={() => setBucketMode('shared')}
                          className="mt-0.5 text-indigo-500 focus:ring-0"
                        />
                        <div className="space-y-0.5 text-xs">
                          <div className="font-bold text-white">📦 Gom chung vào 1 Bucket duy nhất (exam-papers)</div>
                          <p className="text-[11px] text-slate-300">
                            Tất cả các môn lưu chung một bucket, phù hợp khi số lượng thí sinh ít (&lt; 200 bài).
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Cột 2: Tự động nén ảnh thông minh trước khi tải */}
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>2. Nén ảnh Tự động trên Trình duyệt (Client-side)</span>
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableCompression}
                            onChange={(e) => setEnableCompression(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Nén ảnh ngay trên trình duyệt trước khi đẩy lên Cloud: giảm từ <strong className="text-rose-300">3MB - 5MB</strong> xuống còn <strong className="text-emerald-300">~180KB - 250KB</strong> (tiết kiệm <strong className="text-emerald-300">93%</strong> dung lượng) nhưng vẫn giữ nguyên độ sắc nét để đọc rõ bài viết và ô tô trắc nghiệm.
                      </p>

                      {enableCompression ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setCompressionMode('standard')}
                            className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                              compressionMode === 'standard'
                                ? 'bg-emerald-500/20 border-emerald-400 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="text-xs font-bold text-emerald-300">Nén Chuẩn (Khuyên dùng)</div>
                            <div className="text-[10px] text-slate-300 mt-0.5">Rộng 1350px • ~180-250KB / ảnh</div>
                            <div className="text-[9px] text-emerald-400 font-mono mt-1">50MB chứa ~250 bài thi</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCompressionMode('high')}
                            className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                              compressionMode === 'high'
                                ? 'bg-indigo-500/30 border-indigo-400 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="text-xs font-bold text-indigo-300">Chất lượng Cao</div>
                            <div className="text-[10px] text-slate-300 mt-0.5">Rộng 1800px • ~350-450KB / ảnh</div>
                            <div className="text-[9px] text-indigo-400 font-mono mt-1">50MB chứa ~120 bài thi</div>
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Đang tắt nén: Ảnh gốc từ máy scan (3-8MB) sẽ tải lên trực tiếp, dễ chạm giới hạn dung lượng!</span>
                        </div>
                      )}
                    </div>

                    {/* Thanh minh họa so sánh dung lượng thực tế */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-300 font-bold">
                        <span>💡 Hiệu quả khảo thí:</span>
                        <span className="text-emerald-400">1GB chứa được ~5.000 bài thi</span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        Khi nén chuẩn: Trường có 600 học sinh thi 1 môn chỉ tốn khoảng <strong>120MB</strong> thay vì 1.8GB!
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHU VỰC NẠP ẢNH BÀI THI MỚI */}
              <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-indigo-200 space-y-4">
                
                {/* Switcher chế độ nạp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Phương thức nạp ảnh bài thi:</span>
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setPaperUploadMode('folder')}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          paperUploadMode === 'folder'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Tải Thư mục (Tự nhận diện Môn)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperUploadMode('subject')}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          paperUploadMode === 'subject'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn Môn + Tải nhiều file</span>
                      </button>
                    </div>
                  </div>

                  {paperUploadMode === 'subject' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Môn thi:</label>
                      <select
                        value={selectedPaperSubject}
                        onChange={(e) => {
                          setSelectedPaperSubject(e.target.value);
                          if (e.target.value !== 'other') setCustomSubjectInput('');
                        }}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      >
                        <option value="Ngữ văn">Ngữ văn</option>
                        <option value="Toán">Toán</option>
                        <option value="Tiếng Anh">Tiếng Anh</option>
                        <option value="Vật lí">Vật lí</option>
                        <option value="Hóa học">Hóa học</option>
                        <option value="Sinh học">Sinh học</option>
                        <option value="Lịch sử">Lịch sử</option>
                        <option value="Địa lí">Địa lí</option>
                        <option value="Tin học">Tin học</option>
                        <option value="GDKTPL">GDKTPL / GDCD</option>
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="other">+ Nhập tên môn khác</option>
                      </select>
                      {selectedPaperSubject === 'other' && (
                        <input
                          type="text"
                          value={customSubjectInput}
                          onChange={(e) => setCustomSubjectInput(e.target.value)}
                          placeholder="Nhập tên môn..."
                          className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold w-32 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Hướng dẫn chi tiết & Vùng bấm chọn */}
                <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/80">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Quy tắc đặt tên file & thư mục (Tự động hóa 100%):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>
                      <strong>Tên file ảnh:</strong> Hệ thống tự động nhận dạng SBD từ tên file, hỗ trợ: 
                      <code className="mx-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-mono font-bold">52830012 - Hoàng Nhật Anh.jpg</code>, 
                      <code className="mx-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-mono font-bold">52830017-Le Duc Anh.png</code>, 
                      <code className="mx-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-mono font-bold">52830052.jpg</code>.
                    </li>
                    {paperUploadMode === 'folder' ? (
                      <li>
                        <strong>Tên thư mục:</strong> Thầy/Cô chỉ cần gom ảnh vào thư mục mang tên môn học (ví dụ: thư mục <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-mono font-bold">Ngữ văn/</code>, <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-mono font-bold">Toán/</code>, <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-mono font-bold">Tiếng Anh/</code>...). Hệ thống sẽ tự động phân loại đúng từng môn!
                      </li>
                    ) : (
                      <li>
                        <strong>Chế độ tải theo Môn:</strong> Tất cả các ảnh được chọn sẽ được gán cho môn <strong className="text-indigo-700">{customSubjectInput.trim() || selectedPaperSubject}</strong> và tự động ghép đúng với từng thí sinh trong kỳ thi.
                      </li>
                    )}
                    <li>
                      <strong>Định dạng hỗ trợ:</strong> <span className="font-mono font-bold">.jpg, .jpeg, .png, .webp</span> (Dung lượng tự động tối ưu hóa khi tải lên).
                    </li>
                  </ul>
                </div>

                {/* Nút bấm chọn tệp/thư mục */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4">
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files, true)}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files, false)}
                  />

                  {paperUploadMode === 'folder' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canSyncImages) {
                          showToast('🔒 Bị khóa: Bạn không có quyền nạp ảnh bài thi.', 'error');
                          return;
                        }
                        folderInputRef.current?.click();
                      }}
                      disabled={isProcessingFiles || isUploadingPapers || !canSyncImages}
                      className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        !canSyncImages
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                          : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-600/20 cursor-pointer hover:scale-[1.02]'
                      }`}
                      title={!canSyncImages ? '🔒 Bị khóa: Cần quyền CSDL_DONG_BO_ANH' : 'Chọn Thư mục ảnh bài thi'}
                    >
                      {!canSyncImages ? <Lock className="w-4 h-4 text-slate-500" /> : <FolderUp className="w-4 h-4" />}
                      <span>{!canSyncImages ? '🔒 Khóa nạp ảnh (Chỉ xem)' : 'Chọn Thư mục ảnh bài thi (Folder Upload)'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canSyncImages) {
                          showToast('🔒 Bị khóa: Bạn không có quyền nạp ảnh bài thi.', 'error');
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      disabled={isProcessingFiles || isUploadingPapers || !canSyncImages}
                      className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        !canSyncImages
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/20 cursor-pointer hover:scale-[1.02]'
                      }`}
                      title={!canSyncImages ? '🔒 Bị khóa: Cần quyền CSDL_DONG_BO_ANH' : 'Chọn nhiều tệp ảnh bài thi'}
                    >
                      {!canSyncImages ? <Lock className="w-4 h-4 text-slate-500" /> : <Upload className="w-4 h-4" />}
                      <span>{!canSyncImages ? '🔒 Khóa nạp ảnh (Chỉ xem)' : `Chọn nhiều tệp ảnh bài thi môn ${customSubjectInput.trim() || selectedPaperSubject}`}</span>
                    </button>
                  )}
                </div>

                {/* BẢNG ĐỐI SOÁT & XEM TRƯỚC FILE CHỜ TẢI (STAGED PAPERS) */}
                {stagedPapers.length > 0 && (
                  <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Kết quả nhận diện: {stagedPapers.length} tệp ảnh đã chọn
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {stagedPapers.filter(p => p.status === 'ready').length} khớp chính xác thí sinh
                        </span>
                        {stagedPapers.some(p => p.status === 'not_in_exam') && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {stagedPapers.filter(p => p.status === 'not_in_exam').length} chưa có trong kỳ thi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStagedPapers([])}
                          disabled={isUploadingPapers}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Hủy chọn
                        </button>
                        <button
                          type="button"
                          onClick={handleStartUploadPapers}
                          disabled={isUploadingPapers || stagedPapers.filter(p => p.status === 'ready').length === 0 || !canSyncImages}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                            !canSyncImages
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer'
                          }`}
                        >
                          {isUploadingPapers ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tải lên Cloud...</span>
                            </>
                          ) : (
                            <>
                              <Cloud className="w-3.5 h-3.5" />
                              <span>Bắt đầu Tải lên Supabase Storage ({stagedPapers.filter(p => p.status === 'ready').length} bài)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Thanh tiến trình upload */}
                    {isUploadingPapers && uploadPaperProgress && (
                      <div className="space-y-1.5 pt-2 border-t border-indigo-200/80">
                        <div className="flex justify-between text-xs font-bold text-indigo-900">
                          <span>Đang nạp ảnh: {uploadPaperProgress.current} / {uploadPaperProgress.total} bài thi ({uploadPaperProgress.currentSubject})</span>
                          <span>{uploadPaperProgress.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadPaperProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bảng danh sách file chờ tải */}
                    <div className="max-h-48 overflow-y-auto border border-indigo-200 rounded-lg bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">STT</th>
                            <th className="py-2 px-3">Tên file gốc</th>
                            <th className="py-2 px-3">Môn thi</th>
                            <th className="py-2 px-3 font-mono">SBD nhận diện</th>
                            <th className="py-2 px-3">Khớp Thí sinh</th>
                            <th className="py-2 px-3 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {stagedPapers.slice(0, 50).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-sans text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-sans text-slate-800 font-medium truncate max-w-[200px]" title={item.fileName}>
                                {item.fileName}
                              </td>
                              <td className="py-1.5 px-3 font-sans font-bold text-indigo-700">{item.subject}</td>
                              <td className="py-1.5 px-3 font-bold text-blue-700">{item.sbd || '—'}</td>
                              <td className="py-1.5 px-3 font-sans">
                                {item.matchedStudent ? (
                                  <span className="font-bold text-slate-900">
                                    {item.matchedStudent.full_name} <span className="text-slate-500 font-normal">({item.matchedStudent.class_name})</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-600 italic">Không có trong kỳ thi</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans">
                                {item.status === 'ready' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    ✅ Sẵn sàng nạp
                                  </span>
                                ) : item.status === 'not_in_exam' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    ⚠️ Thiếu SBD trong kỳ thi
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    ❌ Sai định dạng
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {stagedPapers.length > 50 && (
                        <div className="py-2 text-center text-xs text-slate-500 italic bg-slate-50 border-t border-slate-200">
                          ... và {stagedPapers.length - 50} tệp ảnh khác
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* THƯ VIỆN & DANH SÁCH ẢNH BÀI THI ĐÃ NẠP */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">Lọc theo môn:</span>
                    <select
                      value={gallerySubjectFilter}
                      onChange={(e) => setGallerySubjectFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    >
                      <option value="all">Tất cả các môn ({uploadedPapersList.length} bài)</option>
                      {existingPaperSubjects.map(s => {
                        const count = uploadedPapersList.filter(p => p.subject === s).length;
                        return (
                          <option key={s} value={s}>Môn {s} ({count} bài)</option>
                        );
                      })}
                    </select>

                    {gallerySubjectFilter !== 'all' && (
                      <button
                        type="button"
                        disabled={isDeletingPapers || !canSyncImages}
                        onClick={() => {
                          if (!canSyncImages) {
                            showToast('🔒 Bị khóa: Bạn không có quyền xóa ảnh bài thi.', 'error');
                            return;
                          }
                          handleDeleteAllPapersOfSubject(gallerySubjectFilter);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          !canSyncImages
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-40'
                            : 'bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 cursor-pointer'
                        }`}
                        title={!canSyncImages ? '🔒 Bị khóa: Không có quyền xóa ảnh bài thi' : `Xóa toàn bộ ảnh bài thi môn ${gallerySubjectFilter}`}
                      >
                        {isDeletingPapers ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            <span>Đang xóa sạch môn {gallerySubjectFilter}...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa toàn bộ môn {gallerySubjectFilter}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={gallerySearch}
                      onChange={(e) => setGallerySearch(e.target.value)}
                      placeholder="Tìm theo tên, SBD, lớp..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bảng danh sách ảnh đã nạp */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-10">STT</th>
                          <th className="py-2.5 px-3 w-16 text-center">Ảnh scan</th>
                          <th className="py-2.5 px-3 font-mono">SBD</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Lớp</th>
                          <th className="py-2.5 px-3">Môn thi</th>
                          <th className="py-2.5 px-3 text-right w-28">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {filteredUploadedPapers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 italic font-sans">
                              {uploadedPapersList.length === 0
                                ? 'Chưa có ảnh bài thi nào trong kỳ thi này. Thầy/Cô hãy chọn Thư mục hoặc Tệp ảnh bên trên để nạp.'
                                : 'Không tìm thấy bài thi nào phù hợp với bộ lọc.'}
                            </td>
                          </tr>
                        ) : (
                          filteredUploadedPapers.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3 text-center">
                                <img
                                  src={item.url}
                                  alt={`Bài thi ${item.subject} - SBD ${item.sbd}`}
                                  className="w-9 h-9 object-cover rounded-lg border border-slate-200 shadow-2xs mx-auto cursor-pointer hover:scale-110 transition-transform"
                                  onClick={() => {
                                    setPreviewAdminPaper({
                                      url: item.url,
                                      subject: item.subject,
                                      sbd: item.sbd,
                                      studentName: item.fullName,
                                      className: item.className
                                    });
                                    setAdminZoomLevel(1);
                                    setAdminRotation(0);
                                  }}
                                />
                              </td>
                              <td className="py-2 px-3 font-bold text-blue-700">{item.sbd}</td>
                              <td className="py-2 px-3 font-bold font-sans text-slate-900">{item.fullName}</td>
                              <td className="py-2 px-3 font-sans text-slate-700 font-semibold">{item.className}</td>
                              <td className="py-2 px-3 font-sans">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  {item.subject}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right space-x-1 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewAdminPaper({
                                      url: item.url,
                                      subject: item.subject,
                                      sbd: item.sbd,
                                      studentName: item.fullName,
                                      className: item.className
                                    });
                                    setAdminZoomLevel(1);
                                    setAdminRotation(0);
                                  }}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xem ảnh phóng to"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={item.url}
                                  download={`BaiThi_${item.subject}_${item.sbd}.jpg`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Tải ảnh về máy"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  disabled={!canSyncImages}
                                  onClick={() => {
                                    if (!canSyncImages) {
                                      showToast('🔒 Bị khóa: Bạn không có quyền xóa ảnh bài thi.', 'error');
                                      return;
                                    }
                                    handleDeleteStudentPaper(item.sbd, item.subject, item.fullName);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    !canSyncImages
                                      ? 'text-slate-300 cursor-not-allowed opacity-25'
                                      : 'text-slate-400 hover:text-rose-600 cursor-pointer'
                                  }`}
                                  title={!canSyncImages ? '🔒 Bị khóa: Không có quyền xóa ảnh bài thi' : 'Xóa ảnh bài thi này'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: QUẢN LÝ KỲ THI & CÔNG BỐ */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              
              {/* Cảnh báo khi người dùng không có quyền quản lý kỳ thi */}
              {!canManageExams && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                  <div className="p-1.5 bg-amber-200/80 rounded-xl text-amber-900 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-amber-900 text-sm">
                      Chức năng Quản lý Kỳ thi đang ở trạng thái Khóa (Chỉ xem):
                    </div>
                    <div className="text-amber-800 leading-relaxed">
                      Tài khoản của Thầy/Cô chỉ có thẩm quyền <strong>Xem danh sách đợt thi & trạng thái công bố</strong>. Thao tác Tạo mới, Xóa kỳ thi hoặc Bật/Tắt công bố kết quả yêu cầu quyền <code>CSDL_QUAN_LY_KY_THI</code> (chỉ dành cho Quản trị viên / Ban Giám hiệu / Giáo vụ).
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quản lý Đợt thi & Trạng thái Công bố Tra cứu</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Học sinh chỉ tra cứu được các kỳ thi đang bật trạng thái <strong>"Đang công bố"</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canManageExams}
                  onClick={() => {
                    if (!canManageExams) {
                      showToast('🔒 Bị khóa: Bạn không có quyền tạo kỳ thi mới.', 'error');
                      return;
                    }
                    setShowCreateExamForm(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                    !canManageExams
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer'
                  }`}
                  title={!canManageExams ? '🔒 Bị khóa: Cần quyền CSDL_QUAN_LY_KY_THI' : 'Tạo kỳ thi mới'}
                >
                  {!canManageExams ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Plus className="w-4 h-4" />}
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
                              disabled={!canManageExams}
                              onClick={() => {
                                if (!canManageExams) {
                                  showToast('🔒 Bị khóa: Bạn không có quyền thay đổi trạng thái công bố.', 'error');
                                  return;
                                }
                                handleTogglePublish(ex);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                !canManageExams
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                  : ex.is_published
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 cursor-pointer'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300 cursor-pointer'
                              }`}
                              title={
                                !canManageExams
                                  ? '🔒 Bị khóa: Không có quyền đổi trạng thái công bố'
                                  : ex.is_published ? 'Bấm để Tạm ẩn tra cứu' : 'Bấm để Mở công bố tra cứu'
                              }
                            >
                              <span className={`w-2 h-2 rounded-full ${ex.is_published ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              <span>{ex.is_published ? 'Đang công bố' : 'Tạm ẩn'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              disabled={!canImportScores}
                              onClick={() => {
                                if (!canImportScores) {
                                  showToast('🔒 Bị khóa: Bạn không có quyền nạp điểm.', 'error');
                                  return;
                                }
                                setSelectedExamId(ex.id);
                                setActiveTab('upload');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                !canImportScores
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-40'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer'
                              }`}
                              title={!canImportScores ? '🔒 Bị khóa quyền nạp điểm' : 'Chuyển sang tab Nạp file bảng điểm'}
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
                              disabled={!canManageExams}
                              onClick={() => {
                                if (!canManageExams) {
                                  showToast('🔒 Bị khóa: Bạn không có quyền xóa kỳ thi.', 'error');
                                  return;
                                }
                                handleDeleteExam(ex.id, ex.title);
                              }}
                              className={`p-1 rounded-lg transition-colors ${
                                !canManageExams
                                  ? 'text-slate-300 cursor-not-allowed opacity-25'
                                  : 'text-slate-400 hover:text-rose-600 cursor-pointer'
                              }`}
                              title={!canManageExams ? '🔒 Bị khóa: Không có quyền xóa kỳ thi' : 'Xóa kỳ thi'}
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

          {/* TAB 5: HƯỚNG DẪN SQL CHO SUPABASE (CHỈ DÀNH CHO ADMIN) */}
          {activeTab === 'sql_guide' && (
            <div className="space-y-4">
              {!canViewSql ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full mx-auto flex items-center justify-center shadow-inner">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Mã SQL CSDL Supabase đang bị khóa</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Khu vực này chứa mã DDL khởi tạo bảng và script cấu hình bảo mật trực tiếp trên máy chủ CSDL Supabase Cloud. Chức năng này chỉ dành riêng cho <strong>Quản trị viên hệ thống (Admin)</strong>.
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
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
                  disabled={isSavingExam || !canManageExams}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                    !canManageExams
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 cursor-pointer'
                  }`}
                >
                  {!canManageExams ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>🔒 Không có quyền tạo kỳ thi</span>
                    </>
                  ) : isSavingExam ? (
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

      {/* POPUP CHỈNH SỬA ĐIỂM HOẶC BỔ SUNG THÍ SINH THI BÙ */}
      {(editingStudent || isCreatingStudent) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm">
                    {isCreatingStudent ? 'Bổ sung Thí sinh thi bù / Phúc khảo' : `Chỉnh sửa điểm: ${editFullName || editSbd}`}
                  </h3>
                  <p className="text-[11px] text-blue-100 opacity-90">
                    Cập nhật đồng bộ Supabase Cloud & tự động tính lại Điểm Trung Bình
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setIsCreatingStudent(false);
                  setEditScoreError(null);
                }}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentScore} className="p-5 overflow-y-auto space-y-4 text-xs text-slate-800 flex-1">
              {editScoreError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editScoreError}</span>
                </div>
              )}

              {/* Thông tin định danh học sinh */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Thông tin Thí sinh</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số báo danh (SBD) (*):
                    </label>
                    <input
                      type="text"
                      required
                      value={editSbd}
                      onChange={(e) => setEditSbd(e.target.value)}
                      placeholder="VD: 52830001"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-blue-700 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ và tên thí sinh (*):
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="VD: Nguyễn Văn An"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Lớp:
                    </label>
                    <input
                      type="text"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      placeholder="VD: 12A1"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số CCCD / Mã định danh:
                    </label>
                    <input
                      type="text"
                      value={editCccd}
                      onChange={(e) => setEditCccd(e.target.value)}
                      placeholder="VD: 038209001234"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Ngày sinh (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      placeholder="VD: 15/08/2008"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Điểm các môn thi */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Điểm các môn thi ({editSubjectScores.length} môn)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubjectRow}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm môn thi</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editSubjectScores.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={row.subject}
                        onChange={(e) => handleSubjectScoreChange(idx, 'subject', e.target.value)}
                        placeholder="Tên môn thi"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                      />
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="10"
                          value={row.score}
                          onChange={(e) => handleSubjectScoreChange(idx, 'score', e.target.value)}
                          placeholder="Điểm (0-10)"
                          className="w-full bg-blue-50/50 border border-blue-200 rounded px-2 py-1 text-xs font-mono font-bold text-blue-900 focus:bg-white focus:outline-none text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectRow(idx)}
                        disabled={editSubjectScores.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Xóa môn này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Khung tóm tắt tính toán tự động Điểm TB */}
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between">
                  <div className="text-xs text-blue-900">
                    <span className="font-bold">Tổng số môn:</span>{' '}
                    <span className="font-mono font-bold">{calculatedPreviewStats.count} môn</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="font-bold">Tổng điểm:</span>{' '}
                    <span className="font-mono font-bold">{calculatedPreviewStats.total}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-blue-700 font-bold uppercase block">Điểm TB tự động:</span>
                    <span className="text-base font-black text-indigo-900 font-mono">
                      {calculatedPreviewStats.average}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setIsCreatingStudent(false);
                    setEditScoreError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudentScore || (!canImportScores && !canManageExams)}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStudentScore ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu lên Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{isCreatingStudent ? 'Lưu Thí sinh mới' : 'Cập nhật điểm'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP XEM PHÓNG TO ẢNH BÀI THI SCAN TRONG ADMIN */}
      {previewAdminPaper && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[95vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col text-white">
            
            {/* Header Toolbar */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Ảnh bài thi môn: {previewAdminPaper.subject}</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] rounded-full font-mono">
                      SBD: {previewAdminPaper.sbd}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Thí sinh: <strong className="text-slate-200">{previewAdminPaper.studentName}</strong> • Lớp: {previewAdminPaper.className}
                  </p>
                </div>
              </div>

              {/* Công cụ Phóng to / Thu nhỏ / Xoay / Tải về / Đóng */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAdminZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Phóng to (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Thu nhỏ (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminRotation(prev => (prev + 90) % 360)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Xoay ảnh 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <a
                  href={previewAdminPaper.url}
                  download={`BaiThi_${previewAdminPaper.subject}_${previewAdminPaper.sbd}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  title="Tải ảnh về máy"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAdminPaper(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Khung hiển thị ảnh */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/60 min-h-[50vh]">
              <div 
                className="transition-transform duration-200 origin-center flex items-center justify-center"
                style={{ 
                  transform: `scale(${adminZoomLevel}) rotate(${adminRotation}deg)`
                }}
              >
                <img
                  src={previewAdminPaper.url}
                  alt={`Bài thi môn ${previewAdminPaper.subject}`}
                  className="max-h-[72vh] max-w-full rounded-lg shadow-2xl object-contain border border-slate-700 select-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Độ thu phóng: {Math.round(adminZoomLevel * 100)}% • Góc xoay: {adminRotation}°</span>
              <button
                type="button"
                onClick={() => {
                  setAdminZoomLevel(1);
                  setAdminRotation(0);
                }}
                className="hover:underline text-indigo-400 cursor-pointer"
              >
                Đặt lại ban đầu (Reset)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LỌC DANH SÁCH PHỤ ĐẠO / BỒI DƯỠNG */}
      <FilterRemedialStudentsModal
        isOpen={showRemedialFilterModal}
        onClose={() => setShowRemedialFilterModal(false)}
        examTitle={exams.find(e => e.id === selectedExamId)?.title || 'Kỳ thi'}
        academicYear={exams.find(e => e.id === selectedExamId)?.academic_year || activeSchoolYear}
        students={examResults}
        availableSubjects={detectedExamSubjects}
        availableClasses={uniqueClasses}
      />
    </div>
  );
};
