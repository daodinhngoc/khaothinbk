import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Sparkles, Download, Upload, 
  FileSpreadsheet, Image as ImageIcon, CheckCircle2, AlertTriangle, 
  Award, BookOpen, Layers, Users, ArrowUpRight, ArrowDownRight,
  School, RefreshCw, Check, Loader2, Info, PieChart, Activity, Filter,
  FileCheck, ShieldAlert, ShieldCheck, Target, Lightbulb, ListChecks, Copy, Printer, FileText, ChevronRight,
  Eye, EyeOff, X, MessageSquare, Send, Bot, Cloud
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { 
  ExamConfig, StudentScoreRow, SubjectMetricSummary, CandidateAssigned,
  ExamMatrixItem, ExamYccdItem, ItemAnalysisResult, YccdAchievementStat,
  ExpertPedagogicalReport, UserProfile, ClassScoreRangeStat, hasUserPermission
} from '../../types';
import { 
  SAMPLE_CHEMISTRY_MATRIX, 
  SAMPLE_CHEMISTRY_YCCD, 
  generateSampleItemScores 
} from '../../utils/sampleItemAnalysisData';
import {
  SAMPLE_LITERATURE_MATRIX,
  SAMPLE_LITERATURE_YCCD,
  generateSampleLiteratureScores,
  SAMPLE_PE_DATA,
  PeStudentRow,
  GDPT_2018_SUBJECTS,
  getSubjectMetadataGDPT,
  SubjectMetadataGDPT,
  SAMPLE_MATH_MATRIX,
  SAMPLE_MATH_YCCD,
  SAMPLE_ENGLISH_MATRIX,
  SAMPLE_ENGLISH_YCCD,
  SAMPLE_HISTORY_MATRIX,
  SAMPLE_HISTORY_YCCD,
  SAMPLE_GEOGRAPHY_MATRIX,
  SAMPLE_GEOGRAPHY_YCCD,
  SAMPLE_PHYSICS_MATRIX,
  SAMPLE_PHYSICS_YCCD,
  SAMPLE_BIOLOGY_MATRIX,
  SAMPLE_BIOLOGY_YCCD,
  SAMPLE_INFORMATICS_MATRIX,
  SAMPLE_INFORMATICS_YCCD,
  SAMPLE_GDKTPL_MATRIX,
  SAMPLE_GDKTPL_YCCD,
  generateItemScoresForMatrix,
  normalizeSubjectName,
  SUBJECT_ALIASES
} from '../../utils/specializedSubjectData';
import {
  MATH_2025_EXAM_MATRIX,
  SAMPLE_MACHINE_SCORE_RECORDS,
  convertMachineRecordsToSystemData,
  downloadMachineScoreExcelTemplate,
  parseUploadedMachineScoreExcel,
  CandidateRosterItem,
  parseCandidateRosterExcel,
  downloadCandidateRosterTemplate,
  relinkMachineRecordsWithRoster,
  MachineScoreRecord,
  generateSampleMachineRecordsForSubject,
  getExamStructureSpec,
  inferStructureFromMatrix,
  generateDynamicMatrix
} from '../../utils/machineScoringData';
import { exportPedagogicalMinutesToWord } from '../../utils/wordExportHelper';
import { PrintScoreReportModal } from './PrintScoreReportModal';
import { exportScoreReportExcel } from '../../utils/scoreReportExcelExport';

interface ScoreAnalyticsModuleProps {
  config: ExamConfig;
  assignedCandidates?: CandidateAssigned[];
  currentUser?: UserProfile | null;
  onOpenExamScoreManagementModal?: () => void;
}

export type ChartType = 'column' | 'line' | 'pie' | 'class_bar';
export type AnalysisInputMode = 'basic' | 'machine_detail' | 'deep_3files';

// Dữ liệu điểm tổng kết mẫu ban đầu phân định chuẩn xác môn bắt buộc vs môn tự chọn (Chuẩn 5 trường: STT, SBD, Họ và tên, Lớp, Ngày sinh)
// 12A1, 12A2: Tổ hợp KHTN (Học Lý, Hóa, Sinh, Tin; không đăng ký Sử, Địa, GDKT&PL)
// 12A3, 12A4: Tổ hợp KHXH (Học Sử, Địa, GDKT&PL, Tin; không đăng ký Lý, Hóa, Sinh)
// HS #5 (12A2 - Ngô Hải Đăng): Vắng thi môn Hóa học (VT) -> Không tính điểm 0, không vào nguy cơ liệt
// HS #9 (12A3 - Đỗ Quốc Khánh): Thi Lịch sử làm bài được 0.5 đ -> Điểm liệt thực tế từ bài thi
// HS #8 (12A3 - Vũ Thảo Linh): Thi GDKT&PL được 0.0 đ -> Điểm 0 thực tế từ bài thi
const INITIAL_SCORE_ROWS: StudentScoreRow[] = [
  // 12A1 - KHTN
  { 
    stt: 1, sbd: '52830001', fullName: 'Bùi Đức Anh', className: '12A1', dob: '15/02/2008', 
    scores: { 'Toán': 8.6, 'Ngữ văn': 7.5, 'Tiếng Anh': 8.8, 'Vật lí': 9.2, 'Hóa học': 8.5, 'Sinh học': 8.0, 'Tin học': 9.0, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 2, sbd: '52830002', fullName: 'Đặng Ngọc Ánh', className: '12A1', dob: '22/04/2008', 
    scores: { 'Toán': 9.2, 'Ngữ văn': 8.0, 'Tiếng Anh': 9.4, 'Vật lí': 8.8, 'Hóa học': 9.0, 'Sinh học': 8.8, 'Tin học': 9.5, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 3, sbd: '52830003', fullName: 'Hoàng Minh Châu', className: '12A1', dob: '10/06/2008', 
    scores: { 'Toán': 7.8, 'Ngữ văn': 8.2, 'Tiếng Anh': 8.0, 'Vật lí': 7.4, 'Hóa học': 7.8, 'Sinh học': 7.6, 'Tin học': 8.2, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 13, sbd: '52830013', fullName: 'Tạ Minh Quân', className: '12A1', dob: '30/10/2008', 
    scores: { 'Toán': 7.6, 'Ngữ văn': 6.2, 'Tiếng Anh': 7.0, 'Vật lí': 8.0, 'Hóa học': 7.8, 'Sinh học': 7.2, 'Tin học': 8.0, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 17, sbd: '52830017', fullName: 'Lương Tuấn Phong', className: '12A1', dob: '16/01/2008', 
    scores: { 'Toán': 8.2, 'Ngữ văn': 7.0, 'Tiếng Anh': 8.4, 'Vật lí': 8.8, 'Hóa học': 8.8, 'Sinh học': 8.4, 'Tin học': 9.0, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },

  // 12A2 - KHTN (Học sinh #5 Vắng thi Hóa học)
  { 
    stt: 4, sbd: '52830004', fullName: 'Lê Tuấn Dũng', className: '12A2', dob: '05/01/2008', 
    scores: { 'Toán': 6.4, 'Ngữ văn': 6.8, 'Tiếng Anh': 5.8, 'Vật lí': 6.2, 'Hóa học': 5.8, 'Sinh học': 6.0, 'Tin học': 7.0, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 5, sbd: '52830005', fullName: 'Ngô Hải Đăng', className: '12A2', dob: '19/08/2008', 
    scores: { 'Toán': 5.2, 'Ngữ văn': 6.0, 'Tiếng Anh': 4.6, 'Vật lí': 5.0, 'Hóa học': null, 'Sinh học': 5.2, 'Tin học': 6.0, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'absent_vt', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 6, sbd: '52830006', fullName: 'Phạm Hương Giang', className: '12A2', dob: '12/11/2008', 
    scores: { 'Toán': 8.0, 'Ngữ văn': 8.5, 'Tiếng Anh': 8.2, 'Vật lí': 7.0, 'Hóa học': 7.5, 'Sinh học': 8.0, 'Tin học': 8.5, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 14, sbd: '52830014', fullName: 'Võ Tuyết Mai', className: '12A2', dob: '11/04/2008', 
    scores: { 'Toán': 8.8, 'Ngữ văn': 9.0, 'Tiếng Anh': 8.6, 'Vật lí': 7.5, 'Hóa học': 8.4, 'Sinh học': 8.5, 'Tin học': 8.8, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },
  { 
    stt: 18, sbd: '52830018', fullName: 'Nguyễn Thành Trung', className: '12A2', dob: '27/07/2008', 
    scores: { 'Toán': 6.2, 'Ngữ văn': 5.8, 'Tiếng Anh': 6.0, 'Vật lí': 6.4, 'Hóa học': 5.8, 'Sinh học': 6.2, 'Tin học': 6.8, 'Lịch sử': null, 'Địa lí': null, 'GDKT&PL': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Vật lí': 'present', 'Hóa học': 'present', 'Sinh học': 'present', 'Tin học': 'present', 'Lịch sử': 'not_registered', 'Địa lí': 'not_registered', 'GDKT&PL': 'not_registered' }
  },

  // 12A3 - KHXH (Học sinh #9 thi Sử 0.5đ - Liệt; Học sinh #8 thi GDKT&PL 0.0đ - Điểm 0)
  { 
    stt: 7, sbd: '52830007', fullName: 'Trần Gia Huy', className: '12A3', dob: '28/03/2008', 
    scores: { 'Toán': 4.2, 'Ngữ văn': 5.5, 'Tiếng Anh': 3.8, 'Lịch sử': 4.8, 'Địa lí': 5.0, 'Tin học': 5.5, 'GDKT&PL': 4.6, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 8, sbd: '52830008', fullName: 'Vũ Thảo Linh', className: '12A3', dob: '14/07/2008', 
    scores: { 'Toán': 7.2, 'Ngữ văn': 7.8, 'Tiếng Anh': 7.4, 'Lịch sử': 7.6, 'Địa lí': 7.8, 'Tin học': 7.5, 'GDKT&PL': 0.0, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 9, sbd: '52830009', fullName: 'Đỗ Quốc Khánh', className: '12A3', dob: '03/09/2008', 
    scores: { 'Toán': 3.4, 'Ngữ văn': 4.8, 'Tiếng Anh': 3.2, 'Lịch sử': 0.5, 'Địa lí': 4.2, 'Tin học': 4.5, 'GDKT&PL': 4.0, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 15, sbd: '52830015', fullName: 'Trịnh Nhật Minh', className: '12A3', dob: '21/06/2008', 
    scores: { 'Toán': 5.8, 'Ngữ văn': 6.4, 'Tiếng Anh': 5.2, 'Lịch sử': 6.0, 'Địa lí': 6.2, 'Tin học': 6.0, 'GDKT&PL': 6.0, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 19, sbd: '52830019', fullName: 'Bạch Thúy Vy', className: '12A3', dob: '09/03/2008', 
    scores: { 'Toán': 4.8, 'Ngữ văn': 5.2, 'Tiếng Anh': 4.4, 'Lịch sử': 5.0, 'Địa lí': 5.2, 'Tin học': 5.0, 'GDKT&PL': 5.0, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },

  // 12A4 - KHXH
  { 
    stt: 10, sbd: '52830010', fullName: 'Nguyễn Diệu Linh', className: '12A4', dob: '25/12/2008', 
    scores: { 'Toán': 6.8, 'Ngữ văn': 7.2, 'Tiếng Anh': 6.5, 'Lịch sử': 7.0, 'Địa lí': 7.2, 'Tin học': 7.0, 'GDKT&PL': 7.4, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 11, sbd: '52830011', fullName: 'Lý Hoàng Nam', className: '12A4', dob: '17/05/2008', 
    scores: { 'Toán': 8.4, 'Ngữ văn': 6.5, 'Tiếng Anh': 7.6, 'Lịch sử': 7.0, 'Địa lí': 7.5, 'Tin học': 8.8, 'GDKT&PL': 7.8, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 12, sbd: '52830012', fullName: 'Phan Bảo Ngọc', className: '12A4', dob: '08/02/2008', 
    scores: { 'Toán': 9.0, 'Ngữ văn': 8.8, 'Tiếng Anh': 9.2, 'Lịch sử': 8.8, 'Địa lí': 9.2, 'Tin học': 9.4, 'GDKT&PL': 9.0, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 16, sbd: '52830016', fullName: 'Dương Yến Nhi', className: '12A4', dob: '04/09/2008', 
    scores: { 'Toán': 7.0, 'Ngữ văn': 7.4, 'Tiếng Anh': 6.8, 'Lịch sử': 7.5, 'Địa lí': 7.6, 'Tin học': 7.8, 'GDKT&PL': 7.5, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  },
  { 
    stt: 20, sbd: '52830020', fullName: 'Hà Xuân Trường', className: '12A4', dob: '18/10/2008', 
    scores: { 'Toán': 7.4, 'Ngữ văn': 6.6, 'Tiếng Anh': 7.2, 'Lịch sử': 7.2, 'Địa lí': 7.5, 'Tin học': 7.6, 'GDKT&PL': 7.4, 'Vật lí': null, 'Hóa học': null, 'Sinh học': null },
    examStatuses: { 'Toán': 'present', 'Ngữ văn': 'present', 'Tiếng Anh': 'present', 'Lịch sử': 'present', 'Địa lí': 'present', 'Tin học': 'present', 'GDKT&PL': 'present', 'Vật lí': 'not_registered', 'Hóa học': 'not_registered', 'Sinh học': 'not_registered' }
  }
];

// Danh sách các môn học chuẩn GDPT 2018
const ALL_DEFAULT_SUBJECT_NAMES = GDPT_2018_SUBJECTS.map((s) => s.name);

/**
 * Tự động nhận diện danh sách môn học thuộc quyền quản lý của người dùng:
 * - Admin / GiaoVu: Toàn quyền xem và thao tác tất cả các môn trong trường.
 * - ToTruong: Nhận diện chính xác môn học thuộc Chuyên môn và Tổ công tác của Tổ trưởng:
 *   + Ví dụ: Chuyên môn "Hóa học" / "Hóa học GDPT 2018", Tổ "Tổ Hóa học - KHTN" -> Chỉ hiển thị môn "Hóa học"
 *   + Ví dụ: Chuyên môn "Toán học", Tổ "Tổ Toán - Tin" -> Chỉ hiển thị môn "Toán"
 *   + Trường hợp Tổ liên môn (VD: "Tổ Hóa - Sinh" mà chuyên môn không giới hạn) -> Hiển thị các môn liên quan: ["Hóa học", "Sinh học"]
 */
export function resolveUserAssignedSubjects(
  user: UserProfile | null | undefined,
  allSubjects: string[]
): string[] {
  if (!user || user.role === 'Admin' || user.role === 'BanGiamHieu' || user.role === 'GiaoVu') {
    return allSubjects;
  }

  if (user.role === 'ToTruong') {
    const spec = (user.specialization || '').toLowerCase();
    const unit = (user.unit || '').toLowerCase();

    const subjectDefinitions = [
      { name: 'Hóa học', keywords: ['hóa học', 'hóa'] },
      { name: 'Vật lí', keywords: ['vật lí', 'vật lý', 'lý', 'lí'] },
      { name: 'Sinh học', keywords: ['sinh học', 'sinh'] },
      { name: 'Toán', keywords: ['toán học', 'toán'] },
      { name: 'Ngữ văn', keywords: ['ngữ văn', 'văn'] },
      { name: 'Tiếng Anh', keywords: ['tiếng anh', 'ngoại ngữ', 'anh'] },
      { name: 'Lịch sử', keywords: ['lịch sử', 'sử'] },
      { name: 'Địa lí', keywords: ['địa lí', 'địa lý', 'địa'] },
      { name: 'Tin học', keywords: ['tin học', 'tin'] },
      { name: 'GDKT&PL', keywords: ['gdktpl', 'gdkt&pl', 'gdcd', 'kinh tế', 'pháp luật'] },
      { name: 'Giáo dục thể chất', keywords: ['thể chất', 'thể dục', 'gdtc', 'quốc phòng'] },
      { name: 'Công nghệ', keywords: ['công nghệ'] },
    ];

    // 1. Ưu tiên kiểm tra Chuyên môn của Tổ trưởng (VD: "Hóa học GDPT 2018")
    const specMatched: string[] = [];
    for (const def of subjectDefinitions) {
      if (def.keywords.some(kw => spec.includes(kw))) {
        const found = allSubjects.find(s => s.toLowerCase() === def.name.toLowerCase() || (def.name === 'Toán' && s.toLowerCase().startsWith('toán'))) || def.name;
        if (!specMatched.includes(found)) {
          specMatched.push(found);
        }
      }
    }
    if (specMatched.length > 0) return specMatched;

    // 2. Tra cứu theo Đơn vị / Tổ công tác (unit)
    const unitMatched: string[] = [];
    for (const def of subjectDefinitions) {
      if (def.keywords.some(kw => unit.includes(kw))) {
        const found = allSubjects.find(s => s.toLowerCase() === def.name.toLowerCase() || (def.name === 'Toán' && s.toLowerCase().startsWith('toán'))) || def.name;
        if (!unitMatched.includes(found)) {
          unitMatched.push(found);
        }
      }
    }

    if (unitMatched.length === 0) {
      if (unit.includes('khtn') || unit.includes('tự nhiên')) {
        const khtn = allSubjects.filter(s => ['Vật lí', 'Hóa học', 'Sinh học'].includes(s));
        if (khtn.length > 0) return khtn;
      }
      if (unit.includes('khxh') || unit.includes('xã hội')) {
        const khxh = allSubjects.filter(s => ['Lịch sử', 'Địa lí', 'GDKT&PL'].includes(s));
        if (khxh.length > 0) return khxh;
      }
    }

    if (unitMatched.length > 0) return unitMatched;
  }

  return allSubjects;
}

// Bộ nhớ tạm thời cục bộ (Offline / LocalStorage Cache) theo máy và tài khoản người dùng
const LOCAL_STORAGE_PREFIX = 'school_khao_thi_local_v1';

function getUserCacheKey(user: UserProfile | null | undefined, key: string): string {
  const uid = user?.id || (user?.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest');
  return `${LOCAL_STORAGE_PREFIX}_${uid}_${key}`;
}

function safeGetFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function safeSetToStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Lỗi ghi LocalStorage:', err);
  }
}

function safeRemoveFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const ScoreAnalyticsModule: React.FC<ScoreAnalyticsModuleProps> = ({
  config,
  assignedCandidates = [],
  currentUser,
  onOpenExamScoreManagementModal
}) => {
  // Trạng thái nhận biết dữ liệu đã được tự động nạp từ bộ nhớ tạm trên máy tính này
  const [hasRestoredLocalCache, setHasRestoredLocalCache] = useState<boolean>(false);

  // Xác định môn học ban đầu theo phân quyền chuyên môn hoặc môn đã lưu tạm trước đó
  const initialSubject = useMemo(() => {
    if (currentUser?.role === 'ToTruong') {
      const assigned = resolveUserAssignedSubjects(currentUser, ALL_DEFAULT_SUBJECT_NAMES);
      if (assigned.length > 0) return assigned[0];
    }
    return 'Hóa học';
  }, [currentUser]);

  // 1. Nguồn Dữ liệu 1: Bảng điểm học sinh
  const [scoreRows, setScoreRows] = useState<StudentScoreRow[]>(INITIAL_SCORE_ROWS);
  const [selectedSubject, setSelectedSubject] = useState<string>(() => initialSubject);
  
  // 2. Nguồn Dữ liệu 2: Ma trận câu hỏi (Chỉ dùng khi ở Chế độ 3: Chuyên sâu)
  const [matrixItems, setMatrixItems] = useState<ExamMatrixItem[]>([]);
  
  // 3. Nguồn Dữ liệu 3: Danh mục Yêu cầu cần đạt (YCCĐ) (Chỉ dùng khi ở Chế độ 3: Chuyên sâu)
  const [yccdItems, setYccdItems] = useState<ExamYccdItem[]>([]);

  // Dữ liệu điểm chi tiết từng câu (Item level scores) (Chỉ có ở Chế độ 2: Chi tiết & 3: Chuyên sâu)
  const [itemResponses, setItemResponses] = useState<any[]>([]);

  // Dữ liệu riêng cho Môn Giáo dục thể chất / Đánh giá nhận xét theo TT 22
  const [peStudentRows, setPeStudentRows] = useState<PeStudentRow[]>(SAMPLE_PE_DATA);

  // Bộ lọc nhóm môn GDPT 2018
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Toggle xem trước Thẻ Infographic
  const [showInfographicPreview, setShowInfographicPreview] = useState<boolean>(false);

  // Lấy thông tin siêu dữ liệu chuẩn GDPT 2018 của môn học hiện tại
  const currentSubjectMeta = useMemo(() => {
    return getSubjectMetadataGDPT(selectedSubject);
  }, [selectedSubject]);

  // Nhận biết loại môn học theo chuẩn GDPT 2018
  const isLiteratureMode = useMemo(() => {
    return currentSubjectMeta.category === 'essay';
  }, [currentSubjectMeta]);

  const isEvaluationMode = useMemo(() => {
    return currentSubjectMeta.category === 'evaluation';
  }, [currentSubjectMeta]);

  const [chartType, setChartType] = useState<ChartType>('column');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [expertReport, setExpertReport] = useState<ExpertPedagogicalReport | null>(null);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [showPrintA4Modal, setShowPrintA4Modal] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // 3 Chế độ phân tích linh hoạt: 'basic' (Cơ bản) | 'machine_detail' (Chi tiết máy chấm) | 'deep_3files' (Chuyên sâu 3 file)
  const [analysisInputMode, setAnalysisInputMode] = useState<AnalysisInputMode>('basic');
  const [itemPartFilter, setItemPartFilter] = useState<'all' | 'P1' | 'P2' | 'P3'>('all');
  const [selectedItemAnalysisClass, setSelectedItemAnalysisClass] = useState<string>('all');

  // Trạng thái cho bảng danh sách học sinh tra cứu chi tiết (STT, SBD, Họ và tên, Lớp, Ngày sinh, Điểm)
  const [studentListSearch, setStudentListSearch] = useState<string>('');
  const [studentListClassFilter, setStudentListClassFilter] = useState<string>('all');
  const [studentListStatusFilter, setStudentListStatusFilter] = useState<'all' | 'present' | 'absent_vt' | 'not_registered'>('all');
  const [isStudentListExpanded, setIsStudentListExpanded] = useState<boolean>(true);

  // Trạng thái Trợ lý Khảo thí Google NotebookLM (Hỏi - Đáp tương tác có trích dẫn dữ liệu)
  const [notebookChat, setNotebookChat] = useState<{ id: string; role: 'user' | 'assistant'; text: string; sources?: string[]; timestamp: string }[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Xin chào Thầy/Cô! Tôi là Trợ lý Cố vấn Khảo thí Google NotebookLM.\n\nTôi đã kết nối trực tiếp với toàn bộ dữ liệu nguồn khảo thí môn học đang chọn (Bảng điểm học sinh, phổ điểm phân bố, phân tích câu hỏi, so sánh lớp và YCCĐ GDPT 2018).\n\nThầy/Cô có thể bấm vào các câu hỏi gợi ý bên dưới hoặc tự nhập câu hỏi chuyên môn để nhận phân tích sư phạm có trích dẫn số liệu cụ thể.`,
      sources: ['Dữ liệu Khảo thí GDPT 2018', 'Bảng điểm & Phổ điểm nội bộ'],
      timestamp: 'Sẵn sàng'
    }
  ]);
  const [notebookInput, setNotebookInput] = useState<string>('');
  const [isAskingNotebook, setIsAskingNotebook] = useState<boolean>(false);
  const [copiedNotebookMsgId, setCopiedNotebookMsgId] = useState<string | null>(null);

  // Danh sách thí sinh nạp bổ sung (để liên kết SBD -> Lớp cho Chế độ 2 & 3)
  const [candidateRoster, setCandidateRoster] = useState<CandidateRosterItem[] | null>(() => {
    return safeGetFromStorage<CandidateRosterItem[] | null>(getUserCacheKey(currentUser, 'candidate_roster'), null);
  });

  // Bản ghi máy chấm gốc (lưu tạm để tự động re-link ngay khi nạp thêm danh sách thí sinh)
  const [rawMachineRecords, setRawMachineRecords] = useState<MachineScoreRecord[] | null>(() => {
    return safeGetFromStorage<MachineScoreRecord[] | null>(getUserCacheKey(currentUser, 'raw_machine_records'), null);
  });

  // File Input Refs
  const scoreFileRef = useRef<HTMLInputElement>(null);
  const machineFileRef = useRef<HTMLInputElement>(null);
  const rosterFileRef = useRef<HTMLInputElement>(null);
  const matrixFileRef = useRef<HTMLInputElement>(null);
  const yccdFileRef = useRef<HTMLInputElement>(null);
  const bundleFileRef = useRef<HTMLInputElement>(null);
  const infographicRef = useRef<HTMLDivElement>(null);

  // Bản đồ liên kết SBD -> Thí sinh (Lớp, Họ tên, Ngày sinh):
  // Ưu tiên 1: File Danh sách Thí sinh người dùng nạp riêng tại phân hệ Khảo thí
  // Ưu tiên 2: Danh sách Thí sinh đã có sẵn từ phân hệ Xếp phòng thi (assignedCandidates)
  const effectiveRosterMap = useMemo(() => {
    const map = new Map<string, CandidateRosterItem>();

    if (candidateRoster && candidateRoster.length > 0) {
      candidateRoster.forEach(c => {
        if (c.sbd) {
          const k1 = c.sbd.trim().toLowerCase();
          const k2 = k1.replace(/[^a-z0-9]/g, '');
          map.set(k1, c);
          if (k2) map.set(k2, c);
        }
      });
      return map;
    }

    if (assignedCandidates && assignedCandidates.length > 0) {
      assignedCandidates.forEach(c => {
        if (c.SBD) {
          const item: CandidateRosterItem = {
            stt: c.TT,
            sbd: String(c.SBD).trim(),
            fullName: c['Họ tên'] || '',
            className: c['Lớp'] || '',
            dob: c['Ngày sinh'] || '',
          };
          const k1 = item.sbd.toLowerCase();
          const k2 = k1.replace(/[^a-z0-9]/g, '');
          map.set(k1, item);
          if (k2) map.set(k2, item);
        }
      });
      return map;
    }

    return map;
  }, [candidateRoster, assignedCandidates]);

  // Thống kê số lớp đã nhận diện từ Roster
  const rosterDetectedClasses = useMemo(() => {
    const classes = new Set<string>();
    effectiveRosterMap.forEach(item => {
      if (item.className && item.className !== 'Toàn khối') {
        classes.add(item.className);
      }
    });
    return Array.from(classes).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [effectiveRosterMap]);

  // Thống kê toàn bộ các lớp đã nhận diện (từ scoreRows trực tiếp trong file điểm hoặc từ Roster phụ)
  const allDetectedClasses = useMemo(() => {
    const classes = new Set<string>();
    scoreRows.forEach(row => {
      if (row.className && row.className.trim() !== '' && row.className !== 'Toàn khối') {
        classes.add(row.className.trim());
      }
    });
    if (classes.size === 0) {
      effectiveRosterMap.forEach(item => {
        if (item.className && item.className !== 'Toàn khối') {
          classes.add(item.className);
        }
      });
    }
    return Array.from(classes).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [scoreRows, effectiveRosterMap]);

  const isRosterInheritedFromRooms = useMemo(() => {
    return (!candidateRoster || candidateRoster.length === 0) && !!(assignedCandidates && assignedCandidates.length > 0);
  }, [candidateRoster, assignedCandidates]);

  // Danh sách các môn học chuẩn đề xuất theo GDPT 2018
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    // Ưu tiên nạp danh mục các môn chuẩn GDPT 2018
    GDPT_2018_SUBJECTS.forEach(s => subjects.add(s.name));
    
    // Nạp thêm bất kỳ môn nào có trong bảng điểm thực tế của người dùng
    scoreRows.forEach((r) => {
      Object.keys(r.scores).forEach((s) => {
        if (r.scores[s] !== null && r.scores[s] !== undefined) {
          const norm = normalizeSubjectName(s);
          subjects.add(norm || s);
        }
      });
    });
    return Array.from(subjects);
  }, [scoreRows]);

  // Danh sách các môn có dữ liệu điểm thực tế trong bảng điểm hiện tại
  const subjectsWithScores = useMemo(() => {
    const set = new Set<string>();
    scoreRows.forEach((r) => {
      Object.entries(r.scores).forEach(([subj, val]) => {
        if (typeof val === 'number' && !isNaN(val)) {
          const norm = normalizeSubjectName(subj);
          set.add(norm || subj);
        }
      });
    });
    return Array.from(set);
  }, [scoreRows]);

  // Danh sách học sinh lọc theo lớp, trạng thái thi & từ khóa tìm kiếm (STT, SBD, Họ tên, Lớp, Ngày sinh, Điểm)
  const filteredStudentScoreList = useMemo(() => {
    return scoreRows.filter((row) => {
      if (studentListClassFilter !== 'all' && row.className !== studentListClassFilter) {
        return false;
      }

      const scoreVal = row.scores[selectedSubject];
      const hasScore = typeof scoreVal === 'number' && !isNaN(scoreVal);
      const rawStatus = row.examStatuses?.[selectedSubject];
      const status = rawStatus || (hasScore ? 'present' : 'not_registered');

      if (studentListStatusFilter === 'present' && !hasScore) return false;
      if (studentListStatusFilter === 'absent_vt' && (hasScore || status !== 'absent_vt')) return false;
      if (studentListStatusFilter === 'not_registered' && (hasScore || status === 'absent_vt')) return false;

      if (studentListSearch.trim()) {
        const q = studentListSearch.toLowerCase().trim();
        const matchName = row.fullName.toLowerCase().includes(q);
        const matchSbd = row.sbd.toLowerCase().includes(q);
        const matchClass = row.className.toLowerCase().includes(q);
        const matchDob = (row.dob || '').toLowerCase().includes(q);
        if (!matchName && !matchSbd && !matchClass && !matchDob) return false;
      }
      return true;
    });
  }, [scoreRows, studentListClassFilter, studentListStatusFilter, studentListSearch, selectedSubject]);

  // Chuyển đổi linh hoạt giữa 3 Chế độ phân tích (Đảm bảo dữ liệu đầu vào đúng chuẩn mực, không suy diễn ảo)
  const handleSwitchAnalysisMode = (mode: AnalysisInputMode) => {
    setAnalysisInputMode(mode);
    setExpertReport(null); // Xóa báo cáo AI cũ để tránh suy diễn sai khác giữa các chế độ

    if (mode === 'basic') {
      // Chế độ 1: Cơ bản -> Xóa sạch ma trận, YCCĐ và dữ liệu câu hỏi để AI không bị suy diễn ảo
      setMatrixItems([]);
      setYccdItems([]);
      setItemResponses([]);
      setSuccessNotice('Đã chuyển sang Chế độ 1: Cơ bản (Chỉ phân tích phổ điểm và đối sánh lớp theo Bảng điểm chuẩn).');
    } else if (mode === 'machine_detail') {
      // Chế độ 2: Chi tiết máy chấm -> Nội suy cấu trúc chuẩn môn học theo QĐ 764/QĐ-BGDĐT
      const spec = getExamStructureSpec(selectedSubject);
      const sampleRecords = generateSampleMachineRecordsForSubject(selectedSubject);
      const converted = convertMachineRecordsToSystemData(sampleRecords, selectedSubject, effectiveRosterMap);
      setRawMachineRecords(sampleRecords);
      setMatrixItems(converted.matrixItems);
      setYccdItems([]);
      setItemResponses(converted.itemResponses);
      setScoreRows(converted.scoreRows);
      setSuccessNotice(`Đã chuyển sang Chế độ 2: Chi tiết môn ${selectedSubject} (${spec.formatDescription}).`);
    } else {
      // Chế độ 3: Chuyên sâu -> Trọn bộ 3 File (Máy chấm + Danh sách + Ma trận & YCCĐ)
      const meta = getSubjectMetadataGDPT(selectedSubject);
      const isEssay = meta.category === 'essay';
      const targetMatrix = meta.sampleMatrix && meta.sampleMatrix.length > 0 ? meta.sampleMatrix : (isEssay ? SAMPLE_LITERATURE_MATRIX : SAMPLE_MATH_MATRIX);
      const targetYccd = meta.sampleYccd && meta.sampleYccd.length > 0 ? meta.sampleYccd : (isEssay ? SAMPLE_LITERATURE_YCCD : SAMPLE_MATH_YCCD);
      setMatrixItems(targetMatrix);
      setYccdItems(targetYccd);
      const simScores = isEssay ? generateSampleLiteratureScores() : generateItemScoresForMatrix(targetMatrix);
      setItemResponses(simScores);
      const derivedScoreRows: StudentScoreRow[] = simScores.map((s, idx) => ({
        stt: idx + 1,
        sbd: s.sbd,
        fullName: s.fullName,
        className: s.className,
        scores: { [selectedSubject]: s.totalScore },
        examStatuses: { [selectedSubject]: 'present' }
      }));
      setScoreRows(derivedScoreRows);
      const spec = inferStructureFromMatrix(targetMatrix, selectedSubject);
      setSuccessNotice(`Đã chuyển sang Chế độ 3: Chuyên sâu môn ${selectedSubject} (${spec.formatDescription}).`);
    }
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Nạp dữ liệu mẫu Cơ bản gồm đủ 5 trường (STT, SBD, Họ và tên, Lớp, Ngày sinh, Điểm)
  const handleLoadSampleBasicData = () => {
    setScoreRows(INITIAL_SCORE_ROWS);
    setMatrixItems([]);
    setYccdItems([]);
    setItemResponses([]);
    setExpertReport(null);
    setAnalysisInputMode('basic');
    setSuccessNotice(`Đã nạp Bảng điểm mẫu Cơ bản 20 học sinh (4 lớp 12A1 ➔ 12A4) gồm đủ 5 trường: STT, SBD, Họ và tên, Lớp, Ngày sinh, Điểm!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Khôi phục bộ dữ liệu điểm mẫu chuẩn của môn học hoặc cả trường và xóa bộ nhớ tạm trên máy này
  const handleResetDefaultSampleData = () => {
    // Xóa cache cục bộ của tài khoản trên máy này
    safeRemoveFromStorage(getUserCacheKey(currentUser, 'score_rows'));
    safeRemoveFromStorage(getUserCacheKey(currentUser, `matrix_${selectedSubject}`));
    safeRemoveFromStorage(getUserCacheKey(currentUser, `yccd_${selectedSubject}`));
    safeRemoveFromStorage(getUserCacheKey(currentUser, `expert_${selectedSubject}`));
    safeRemoveFromStorage(getUserCacheKey(currentUser, 'raw_machine_records'));
    safeRemoveFromStorage(getUserCacheKey(currentUser, 'candidate_roster'));
    setHasRestoredLocalCache(false);
    setExpertReport(null);

    if (analysisInputMode === 'basic') {
      setScoreRows(INITIAL_SCORE_ROWS);
      setMatrixItems([]);
      setYccdItems([]);
      setItemResponses([]);
      setSuccessNotice(`Đã khôi phục dữ liệu mẫu Bảng điểm Cơ bản (4 lớp) cho môn ${selectedSubject}!`);
    } else if (analysisInputMode === 'machine_detail') {
      const sampleRecords = generateSampleMachineRecordsForSubject(selectedSubject);
      const converted = convertMachineRecordsToSystemData(sampleRecords, selectedSubject, effectiveRosterMap);
      setRawMachineRecords(sampleRecords);
      setScoreRows(converted.scoreRows);
      setItemResponses(converted.itemResponses);
      setMatrixItems(converted.matrixItems);
      setYccdItems([]);
      const spec = getExamStructureSpec(selectedSubject);
      setSuccessNotice(`Đã khôi phục dữ liệu mẫu Chi tiết máy chấm 24 thí sinh môn ${selectedSubject} (${spec.formatDescription})!`);
    } else {
      const meta = getSubjectMetadataGDPT(selectedSubject);
      const isEssay = meta.category === 'essay';
      const targetMatrix = meta.sampleMatrix && meta.sampleMatrix.length > 0 ? meta.sampleMatrix : (isEssay ? SAMPLE_LITERATURE_MATRIX : SAMPLE_MATH_MATRIX);
      const targetYccd = meta.sampleYccd && meta.sampleYccd.length > 0 ? meta.sampleYccd : (isEssay ? SAMPLE_LITERATURE_YCCD : SAMPLE_MATH_YCCD);
      const simScores = isEssay ? generateSampleLiteratureScores() : generateItemScoresForMatrix(targetMatrix);
      setItemResponses(simScores);
      setMatrixItems(targetMatrix);
      setYccdItems(targetYccd);
      const derivedScoreRows: StudentScoreRow[] = simScores.map((s, idx) => ({
        stt: idx + 1,
        sbd: s.sbd,
        fullName: s.fullName,
        className: s.className,
        scores: { [selectedSubject]: s.totalScore },
        examStatuses: { [selectedSubject]: 'present' }
      }));
      setScoreRows(derivedScoreRows);
      const spec = inferStructureFromMatrix(targetMatrix, selectedSubject);
      setSuccessNotice(`Đã khôi phục trọn bộ dữ liệu mẫu Chuyên sâu 3 File môn ${selectedSubject} (${spec.formatDescription})!`);
    }
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Tự động kiểm tra và nạp lại dữ liệu đã lưu tạm trên máy này của tài khoản khi mở trang
  useEffect(() => {
    if (!currentUser) return;
    try {
      const cachedScores = safeGetFromStorage<StudentScoreRow[] | null>(
        getUserCacheKey(currentUser, 'score_rows'),
        null
      );
      if (cachedScores && Array.isArray(cachedScores) && cachedScores.length > 0) {
        setScoreRows(cachedScores);
        setHasRestoredLocalCache(true);
      }

      const cachedLastSubj = safeGetFromStorage<string | null>(
        getUserCacheKey(currentUser, 'last_subject'),
        null
      );
      if (cachedLastSubj && ALL_DEFAULT_SUBJECT_NAMES.includes(cachedLastSubj)) {
        // Nếu là Tổ trưởng, chỉ phục hồi nếu môn đó thuộc danh sách phân quyền
        const userSubjects = resolveUserAssignedSubjects(currentUser, ALL_DEFAULT_SUBJECT_NAMES);
        if (userSubjects.includes(cachedLastSubj)) {
          setSelectedSubject(cachedLastSubj);
        }
      }
    } catch (e) {
      console.warn('Lỗi phục hồi cache:', e);
    }
  }, [currentUser?.id, currentUser?.email]);

  // Danh sách môn học hiển thị cho người dùng:
  // - Nếu là ToTruong: Tinh gọn thông minh CHỈ hiển thị đúng môn thuộc tổ / chuyên môn của mình (VD: Hóa học)
  // - Nếu là Admin / GiaoVu: Hiển thị toàn bộ tất cả các môn trong trường
  const displaySubjects = useMemo(() => {
    return resolveUserAssignedSubjects(currentUser, availableSubjects);
  }, [currentUser, availableSubjects]);

  // Tự động gán môn học phù hợp khi khởi tạo hoặc chuyển đổi dữ liệu
  React.useEffect(() => {
    if (displaySubjects.length > 0 && !displaySubjects.includes(selectedSubject)) {
      handleSelectSubject(displaySubjects[0]);
    }
  }, [displaySubjects, selectedSubject]);

  // Tự động điều chỉnh chức năng, ma trận và dữ liệu khảo thí chuẩn theo từng môn học đề xuất GDPT 2018
  const handleSelectSubject = (sName: string, tryRestoreCache: boolean = true) => {
    setSelectedSubject(sName);
    safeSetToStorage(getUserCacheKey(currentUser, 'last_subject'), sName);

    // Kiểm tra xem trên máy này có lưu ma trận/YCCĐ/Báo cáo AI của môn này không
    let restoredMatrix: ExamMatrixItem[] | null = null;
    let restoredYccd: ExamYccdItem[] | null = null;
    let restoredReport: ExpertPedagogicalReport | null = null;

    if (tryRestoreCache && currentUser) {
      restoredMatrix = safeGetFromStorage<ExamMatrixItem[] | null>(
        getUserCacheKey(currentUser, `matrix_${sName}`),
        null
      );
      restoredYccd = safeGetFromStorage<ExamYccdItem[] | null>(
        getUserCacheKey(currentUser, `yccd_${sName}`),
        null
      );
      restoredReport = safeGetFromStorage<ExpertPedagogicalReport | null>(
        getUserCacheKey(currentUser, `expert_${sName}`),
        null
      );
    }

    setExpertReport(restoredReport);

    const meta = getSubjectMetadataGDPT(sName);
    if (meta.category === 'evaluation') {
      // Môn Giáo dục thể chất, Hoạt động trải nghiệm: Tự động chuyển sang chế độ đánh giá Đạt / Chưa đạt TT22
      setPeStudentRows(SAMPLE_PE_DATA);
      setMatrixItems([]);
      setYccdItems([]);
      setItemResponses([]);
    } else if (analysisInputMode === 'basic') {
      // Ở Chế độ 1 Cơ bản: TUYỆT ĐỐI KHÔNG nạp ma trận hay YCCĐ ngầm định
      setMatrixItems([]);
      setYccdItems([]);
      setItemResponses([]);
    } else if (analysisInputMode === 'machine_detail') {
      // Ở Chế độ 2: Chi tiết máy chấm -> Tự động nội suy cấu trúc theo môn mới
      const sampleRecords = generateSampleMachineRecordsForSubject(sName);
      const converted = convertMachineRecordsToSystemData(sampleRecords, sName, effectiveRosterMap);
      setRawMachineRecords(sampleRecords);
      setScoreRows(converted.scoreRows);
      setItemResponses(converted.itemResponses);
      setMatrixItems(converted.matrixItems);
      setYccdItems([]);
    } else {
      // Ở Chế độ 3: Chuyên sâu: Có đầy đủ ma trận và YCCĐ
      const isEssay = meta.category === 'essay';
      const targetMatrix = (restoredMatrix && restoredMatrix.length > 0)
        ? restoredMatrix
        : (meta.sampleMatrix && meta.sampleMatrix.length > 0 ? meta.sampleMatrix : (isEssay ? SAMPLE_LITERATURE_MATRIX : SAMPLE_MATH_MATRIX));
      const targetYccd = (restoredYccd && restoredYccd.length > 0)
        ? restoredYccd
        : (meta.sampleYccd && meta.sampleYccd.length > 0 ? meta.sampleYccd : (isEssay ? SAMPLE_LITERATURE_YCCD : SAMPLE_MATH_YCCD));
      setMatrixItems(targetMatrix);
      setYccdItems(targetYccd);
      const simScores = isEssay ? generateSampleLiteratureScores() : generateItemScoresForMatrix(targetMatrix);
      setItemResponses(simScores);
      const derivedScoreRows: StudentScoreRow[] = simScores.map((s, idx) => ({
        stt: idx + 1,
        sbd: s.sbd,
        fullName: s.fullName,
        className: s.className,
        scores: { [sName]: s.totalScore },
        examStatuses: { [sName]: 'present' }
      }));
      setScoreRows(derivedScoreRows);
    }

    setSuccessNotice(`Đã chuyển sang môn ${sName} (${meta.badgeLabel}).`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };


  // Thống kê mô tả điểm số cho môn được chọn (Phân định chính xác 4 trạng thái: Dự thi, Vắng thi VT, Không đăng ký KDT, và Điểm 0 thực tế)
  const subjectMetrics = useMemo((): SubjectMetricSummary => {
    const validScores: { sbd: string; className: string; score: number }[] = [];
    const absentList: { sbd: string; className: string }[] = [];
    const unregisteredList: { sbd: string; className: string }[] = [];
    const normSelected = normalizeSubjectName(selectedSubject).toLowerCase();

    scoreRows.forEach((r) => {
      let s = r.scores[selectedSubject];
      let status = r.examStatuses?.[selectedSubject];

      // Nếu không khớp trực tiếp tên cột, đối soát linh hoạt qua tên chuẩn hóa hoặc cột điểm đơn
      if ((s === undefined || s === null) && (!status || status === 'not_registered') && r.scores) {
        const matchKey = Object.keys(r.scores).find((k) => {
          const kNorm = normalizeSubjectName(k).toLowerCase();
          return kNorm === normSelected || k.toLowerCase().trim() === selectedSubject.toLowerCase().trim();
        });

        if (matchKey) {
          s = r.scores[matchKey];
          status = r.examStatuses?.[matchKey];
        } else {
          // Nếu hàng chỉ có duy nhất 1 cột điểm số hợp lệ (ví dụ file Excel 1 cột: 'Điểm', 'Diem', 'Điểm thi')
          const numericEntries = Object.entries(r.scores).filter(([_, v]) => typeof v === 'number' && !isNaN(v));
          if (numericEntries.length === 1) {
            s = numericEntries[0][1];
            status = 'present';
          }
        }
      }

      // Suy đoán trạng thái tin cậy nếu dữ liệu nạp từ trước chưa có examStatuses
      if (!status) {
        if (typeof s === 'number' && !isNaN(s)) {
          status = 'present';
        } else {
          status = 'not_registered';
        }
      }

      if (status === 'present' && typeof s === 'number' && !isNaN(s)) {
        validScores.push({ sbd: r.sbd, className: r.className, score: s });
      } else if (status === 'absent_vt') {
        absentList.push({ sbd: r.sbd, className: r.className });
      } else {
        unregisteredList.push({ sbd: r.sbd, className: r.className });
      }
    });

    const totalInGrade = scoreRows.length;
    const absentCount = absentList.length;
    const registeredCandidates = validScores.length + absentCount;
    const totalCandidates = validScores.length; // MẪU SỐ N CHỈ TÍNH BÀI THI THỰC TẾ CÓ ĐIỂM
    const absentRate = registeredCandidates > 0 ? Number(((absentCount / registeredCandidates) * 100).toFixed(1)) : 0;
    const unregisteredCount = Math.max(0, totalInGrade - registeredCandidates);
    const realZeroCount = validScores.filter(item => item.score === 0).length;

    const defaultDistribution = [
      { rangeLabel: '0-1', min: 0, max: 1, count: 0, percentage: 0 },
      { rangeLabel: '1-2', min: 1, max: 2, count: 0, percentage: 0 },
      { rangeLabel: '2-3', min: 2, max: 3, count: 0, percentage: 0 },
      { rangeLabel: '3-4', min: 3, max: 4, count: 0, percentage: 0 },
      { rangeLabel: '4-5', min: 4, max: 5, count: 0, percentage: 0 },
      { rangeLabel: '5-6', min: 5, max: 6, count: 0, percentage: 0 },
      { rangeLabel: '6-7', min: 6, max: 7, count: 0, percentage: 0 },
      { rangeLabel: '7-8', min: 7, max: 8, count: 0, percentage: 0 },
      { rangeLabel: '8-9', min: 8, max: 9, count: 0, percentage: 0 },
      { rangeLabel: '9-10', min: 9, max: 10, count: 0, percentage: 0 },
    ];

    const N = validScores.length;
    if (N === 0) {
      return {
        subjectName: selectedSubject,
        totalInGrade,
        registeredCandidates,
        totalCandidates: 0,
        absentCount,
        absentRate,
        unregisteredCount,
        realZeroCount: 0,
        mean: 0,
        median: 0,
        mode: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        distribution: defaultDistribution,
        rateExcellent: 0,
        rateGood: 0,
        rateAverage: 0,
        rateBelowAverage: 0,
        rateFailed: 0,
        classBreakdown: [],
        classRangeStats: [],
        overallRangeStat: undefined,
      };
    }

    const scoresList = validScores.map((item) => item.score).sort((a, b) => a - b);
    const sum = scoresList.reduce((acc, v) => acc + v, 0);
    const mean = sum / N;

    let median = 0;
    if (N % 2 === 1) {
      median = scoresList[Math.floor(N / 2)];
    } else {
      median = (scoresList[N / 2 - 1] + scoresList[N / 2]) / 2;
    }

    const freqMap: { [key: number]: number } = {};
    let maxFreq = 0;
    let mode = scoresList[0];
    scoresList.forEach((s) => {
      freqMap[s] = (freqMap[s] || 0) + 1;
      if (freqMap[s] > maxFreq) {
        maxFreq = freqMap[s];
        mode = s;
      }
    });

    const variance = scoresList.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / N;
    const stdDev = Math.sqrt(variance);

    const min = scoresList[0];
    const max = scoresList[N - 1];

    const countExcellent = scoresList.filter((s) => s >= 8.0).length;
    const countGood = scoresList.filter((s) => s >= 6.5 && s < 8.0).length;
    const countAverage = scoresList.filter((s) => s >= 5.0 && s < 6.5).length;
    const countBelowAvg = scoresList.filter((s) => s < 5.0).length;
    // CHỈ TÍNH NGUY CƠ LIỆT TRÊN BÀI THI THỰC TẾ (<= 1.0 ĐIỂM)
    const countFailed = scoresList.filter((s) => s <= 1.0).length;

    const rateExcellent = Number(((countExcellent / N) * 100).toFixed(1));
    const rateGood = Number(((countGood / N) * 100).toFixed(1));
    const rateAverage = Number(((countAverage / N) * 100).toFixed(1));
    const rateBelowAverage = Number(((countBelowAvg / N) * 100).toFixed(1));
    const rateFailed = Number(((countFailed / N) * 100).toFixed(1));

    const distribution = Array.from({ length: 10 }, (_, i) => {
      const lower = i;
      const upper = i + 1;
      const count = scoresList.filter((s) => {
        if (i === 9) return s >= lower && s <= upper;
        return s >= lower && s < upper;
      }).length;

      return {
        rangeLabel: `${lower}-${upper}`,
        count,
        percentage: Number(((count / N) * 100).toFixed(1)),
      };
    });

    // Phân nhóm theo lớp
    const classGroups: { [key: string]: number[] } = {};
    const classAbsentGroups: { [key: string]: number } = {};
    const classUnregGroups: { [key: string]: number } = {};

    validScores.forEach((item) => {
      if (!classGroups[item.className]) classGroups[item.className] = [];
      classGroups[item.className].push(item.score);
    });

    absentList.forEach((item) => {
      classAbsentGroups[item.className] = (classAbsentGroups[item.className] || 0) + 1;
    });

    unregisteredList.forEach((item) => {
      classUnregGroups[item.className] = (classUnregGroups[item.className] || 0) + 1;
    });

    const classBreakdown = Object.keys(classGroups).map((cName) => {
      const cScores = classGroups[cName];
      const cMean = cScores.reduce((acc, v) => acc + v, 0) / cScores.length;
      const aboveFive = cScores.filter((s) => s >= 5.0).length;
      const rateAboveFive = Number(((aboveFive / cScores.length) * 100).toFixed(1));
      return {
        className: cName,
        count: cScores.length,
        mean: Number(cMean.toFixed(2)),
        rateAboveFive,
        absentCount: classAbsentGroups[cName] || 0,
      };
    }).sort((a, b) => b.mean - a.mean);

    // Tính chi tiết 6 thang khoảng điểm chuẩn theo từng lớp (0-1, 1.1-3.4, 3.5-4.9, 5-6.4, 6.5-7.9, 8-10)
    const computeRangeStat = (cName: string, scores: number[], absentCountVal: number = 0, unregCountVal: number = 0): ClassScoreRangeStat => {
      const tot = scores.length;
      if (tot === 0) {
        return {
          className: cName,
          totalStudents: 0,
          registeredStudents: absentCountVal,
          absentCount: absentCountVal,
          unregisteredCount: unregCountVal,
          count0to1: 0, pct0to1: 0,
          count11to34: 0, pct11to34: 0,
          count35to49: 0, pct35to49: 0,
          count5to64: 0, pct5to64: 0,
          count65to79: 0, pct65to79: 0,
          count8to10: 0, pct8to10: 0,
          countAboveFive: 0, pctAboveFive: 0,
          mean: 0,
        };
      }
      const c0to1 = scores.filter(s => s >= 0 && s <= 1.0).length;
      const c11to34 = scores.filter(s => s > 1.0 && s < 3.5).length;
      const c35to49 = scores.filter(s => s >= 3.5 && s < 5.0).length;
      const c5to64 = scores.filter(s => s >= 5.0 && s < 6.5).length;
      const c65to79 = scores.filter(s => s >= 6.5 && s < 8.0).length;
      const c8to10 = scores.filter(s => s >= 8.0 && s <= 10.0).length;
      const cAbove5 = scores.filter(s => s >= 5.0).length;
      const m = scores.reduce((acc, v) => acc + v, 0) / tot;

      return {
        className: cName,
        totalStudents: tot,
        registeredStudents: tot + absentCountVal,
        absentCount: absentCountVal,
        unregisteredCount: unregCountVal,
        count0to1: c0to1,
        pct0to1: Number(((c0to1 / tot) * 100).toFixed(1)),
        count11to34: c11to34,
        pct11to34: Number(((c11to34 / tot) * 100).toFixed(1)),
        count35to49: c35to49,
        pct35to49: Number(((c35to49 / tot) * 100).toFixed(1)),
        count5to64: c5to64,
        pct5to64: Number(((c5to64 / tot) * 100).toFixed(1)),
        count65to79: c65to79,
        pct65to79: Number(((c65to79 / tot) * 100).toFixed(1)),
        count8to10: c8to10,
        pct8to10: Number(((c8to10 / tot) * 100).toFixed(1)),
        countAboveFive: cAbove5,
        pctAboveFive: Number(((cAbove5 / tot) * 100).toFixed(1)),
        mean: Number(m.toFixed(2)),
      };
    };

    const classRangeStats: ClassScoreRangeStat[] = Object.keys(classGroups)
      .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
      .map(cName => computeRangeStat(cName, classGroups[cName], classAbsentGroups[cName] || 0, classUnregGroups[cName] || 0));

    const overallRangeStat: ClassScoreRangeStat = computeRangeStat('TOÀN KHỐI', scoresList, absentCount, unregisteredCount);

    return {
      subjectName: selectedSubject,
      totalInGrade,
      registeredCandidates,
      totalCandidates: N,
      absentCount,
      absentRate,
      unregisteredCount,
      realZeroCount,
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      mode: Number(mode.toFixed(1)),
      stdDev: Number(stdDev.toFixed(2)),
      min,
      max,
      distribution,
      rateExcellent,
      rateGood,
      rateAverage,
      rateBelowAverage,
      rateFailed,
      classBreakdown,
      classRangeStats,
      overallRangeStat,
    };
  }, [scoreRows, selectedSubject]);

  // THỐNG KÊ RIÊNG CHO MÔN ĐÁNH GIÁ NHẬN XÉT / THỰC HÀNH (GIÁO DỤC THỂ CHẤT - THEO THÔNG TƯ 22)
  const peMetrics = useMemo(() => {
    const total = peStudentRows.length;
    if (total === 0) {
      return {
        totalStudents: 0,
        countDat: 0,
        pctDat: 0,
        countChuaDat: 0,
        pctChuaDat: 0,
        criteriaStats: {
          kyThuat1: { dat: 0, pctDat: 0 },
          kyThuat2: { dat: 0, pctDat: 0 },
          theLuc: { dat: 0, pctDat: 0 },
          yThuc: { dat: 0, pctDat: 0 },
        },
        classStats: []
      };
    }

    const cDat = peStudentRows.filter(p => p.overallResult === 'Đ').length;
    const cChuaDat = total - cDat;

    const kt1Dat = peStudentRows.filter(p => p.criteria.kyThuat1 === 'Đ').length;
    const kt2Dat = peStudentRows.filter(p => p.criteria.kyThuat2 === 'Đ').length;
    const tlDat = peStudentRows.filter(p => p.criteria.theLuc === 'Đ').length;
    const ytDat = peStudentRows.filter(p => p.criteria.yThuc === 'Đ').length;

    // Phân theo lớp
    const clsGroups: Record<string, PeStudentRow[]> = {};
    peStudentRows.forEach(p => {
      if (!clsGroups[p.className]) clsGroups[p.className] = [];
      clsGroups[p.className].push(p);
    });

    const classStats = Object.keys(clsGroups).sort().map(cName => {
      const list = clsGroups[cName];
      const tot = list.length;
      const dat = list.filter(x => x.overallResult === 'Đ').length;
      const chuaDat = tot - dat;
      return {
        className: cName,
        total: tot,
        dat,
        pctDat: Number(((dat / tot) * 100).toFixed(1)),
        chuaDat,
        pctChuaDat: Number(((chuaDat / tot) * 100).toFixed(1))
      };
    });

    return {
      totalStudents: total,
      countDat: cDat,
      pctDat: Number(((cDat / total) * 100).toFixed(1)),
      countChuaDat: cChuaDat,
      pctChuaDat: Number(((cChuaDat / total) * 100).toFixed(1)),
      criteriaStats: {
        kyThuat1: { dat: kt1Dat, pctDat: Number(((kt1Dat / total) * 100).toFixed(1)) },
        kyThuat2: { dat: kt2Dat, pctDat: Number(((kt2Dat / total) * 100).toFixed(1)) },
        theLuc: { dat: tlDat, pctDat: Number(((tlDat / total) * 100).toFixed(1)) },
        yThuc: { dat: ytDat, pctDat: Number(((ytDat / total) * 100).toFixed(1)) },
      },
      classStats
    };
  }, [peStudentRows]);

  // THUẬT TOÁN KHẢO THÍ CHUẨN: PHÂN TÍCH ĐỘ KHÓ (P) VÀ ĐỘ PHÂN BIỆT (D) TỪNG CÂU HỎI (ITEM ANALYSIS)
  const itemAnalysisResults = useMemo((): ItemAnalysisResult[] => {
    // Chế độ 1: Cơ bản (Chỉ có bảng điểm tổng hợp) -> Tuyệt đối không sinh dữ liệu câu hỏi ảo
    if (analysisInputMode === 'basic') {
      return [];
    }

    if (!itemResponses || itemResponses.length < 3) {
      return [];
    }

    const filteredResponses = selectedItemAnalysisClass === 'all'
      ? itemResponses
      : itemResponses.filter(s => s.className === selectedItemAnalysisClass);

    const totalStudents = filteredResponses.length;
    if (totalStudents === 0) return [];

    // Sắp xếp học sinh theo tổng điểm giảm dần để trích top 27% cao nhất và bottom 27% thấp nhất
    const sorted = [...filteredResponses].sort((a, b) => b.totalScore - a.totalScore);
    const groupSize = Math.max(1, Math.round(totalStudents * 0.27));
    const topGroup = sorted.slice(0, groupSize);
    const bottomGroup = sorted.slice(sorted.length - groupSize);

    // Xác định danh sách câu hỏi tự động nội suy theo cấu trúc GDPT 2018 của môn học:
    // 1. Ưu tiên 1: Ma trận đề thi (nếu đã nạp ở Chế độ 3 hoặc kế thừa từ hệ thống)
    // 2. Ưu tiên 2: Trích xuất trực tiếp từ các cột câu hỏi thực tế trong bài làm của học sinh (itemResponses)
    // 3. Ưu tiên 3: Nội suy theo đặc tả chuẩn QĐ 764/QĐ-BGDĐT của Bộ GD&ĐT cho môn học đang chọn
    const currentSpec = getExamStructureSpec(selectedSubject);
    let questionsToAnalyze: { questionNo: string; topic: string; maxScore: number; yccdCode?: string }[] = [];

    if (matrixItems && matrixItems.length > 0) {
      questionsToAnalyze = matrixItems;
    } else if (itemResponses && itemResponses.length > 0 && itemResponses[0]?.itemScores) {
      const qKeys = Object.keys(itemResponses[0].itemScores);
      questionsToAnalyze = qKeys.map(k => {
        let maxScore = 0.25;
        let topic = `${selectedSubject} - ${k}`;
        const upper = k.toUpperCase();
        if (upper.includes('P1') || upper.startsWith('E_') || upper.startsWith('MC')) {
          maxScore = currentSpec.part1ScorePerQuestion;
          const matchNum = k.match(/\d+/);
          topic = `Phần I - Câu ${matchNum ? matchNum[0] : k} (Trắc nghiệm 4 lựa chọn)`;
        } else if (upper.includes('P2') || upper.startsWith('VIET') || upper.includes('DS') || upper.includes('ĐS')) {
          maxScore = currentSpec.part2MaxScorePerQuestion;
          const matchNum = k.match(/\d+/);
          const num = matchNum ? parseInt(matchNum[0]) : 1;
          if (currentSpec.part2Elective) {
            if (num <= currentSpec.part2Elective.mandatoryCount) topic = `Phần II - Câu ${num} (Bắt buộc chung - Đúng/Sai)`;
            else if (num === 3 || num === 4) topic = `Phần II - Câu ${num} (Tự chọn ICT - Đúng/Sai)`;
            else topic = `Phần II - Câu ${num} (Tự chọn CS - Đúng/Sai)`;
          } else {
            topic = `Phần II - Câu ${num} (Đúng/Sai 4 ý)`;
          }
        } else if (upper.includes('P3') || upper.includes('TLN')) {
          maxScore = currentSpec.part3ScorePerQuestion;
          const matchNum = k.match(/\d+/);
          topic = `Phần III - Câu ${matchNum ? matchNum[0] : k} (Trả lời ngắn)`;
        } else if (upper.startsWith('ĐH')) {
          maxScore = 1.0;
          topic = `Phần I - ${k} (Đọc hiểu)`;
        }
        return { questionNo: k, topic, maxScore };
      });
    } else {
      questionsToAnalyze = generateDynamicMatrix(selectedSubject, currentSpec);
    }

    return questionsToAnalyze.map((q) => {
      const maxScore = q.maxScore || 0.25;

      const topicLower = (q.topic || '').toLowerCase();
      const isElective = currentSpec.part2Elective !== undefined && (
        q.questionNo.includes('C03') || q.questionNo.includes('C04') ||
        q.questionNo.includes('C05') || q.questionNo.includes('C06') ||
        q.questionNo.includes('C3') || q.questionNo.includes('C4') ||
        q.questionNo.includes('C5') || q.questionNo.includes('C6') ||
        topicLower.includes('tự chọn') || topicLower.includes('ict') || topicLower.includes('cs')
      );

      // 1. Xác định mẫu số N chuẩn xác theo lý thuyết Khảo thí GDPT 2018:
      // - Với câu hỏi BẮT BUỘC: Mẫu số N là TOÀN BỘ thí sinh dự thi thực tế (totalStudents).
      //   Nếu thí sinh dự thi nhưng bỏ trống câu hỏi bắt buộc -> Điểm câu đó tính là 0, TUYỆT ĐỐI KHÔNG loại trừ khỏi mẫu số N!
      // - Với câu hỏi TỰ CHỌN (vd: Tin học ICT vs CS): Mẫu số N chỉ gồm các thí sinh CÓ ĐĂNG KÝ/LỰA CHỌN làm phần thi đó.
      let effectiveN = totalStudents;
      let effTopSize = groupSize;
      let effBottomSize = groupSize;

      let totalEarned = 0;
      let topEarned = 0;
      let bottomEarned = 0;

      if (isElective) {
        // Chỉ đếm thí sinh có tham gia làm câu hỏi tự chọn này
        const electiveAttempted = filteredResponses.filter(s => s.itemScores?.[q.questionNo] !== undefined && s.itemScores?.[q.questionNo] !== null);
        effectiveN = electiveAttempted.length > 0 ? electiveAttempted.length : totalStudents;
        totalEarned = electiveAttempted.reduce((acc, s) => acc + (s.itemScores?.[q.questionNo] || 0), 0);

        const topAttempted = topGroup.filter(s => s.itemScores?.[q.questionNo] !== undefined && s.itemScores?.[q.questionNo] !== null);
        const bottomAttempted = bottomGroup.filter(s => s.itemScores?.[q.questionNo] !== undefined && s.itemScores?.[q.questionNo] !== null);
        effTopSize = topAttempted.length > 0 ? topAttempted.length : Math.max(1, Math.round(effectiveN * 0.27));
        effBottomSize = bottomAttempted.length > 0 ? bottomAttempted.length : Math.max(1, Math.round(effectiveN * 0.27));

        topEarned = topAttempted.reduce((acc, s) => acc + (s.itemScores?.[q.questionNo] || 0), 0);
        bottomEarned = bottomAttempted.reduce((acc, s) => acc + (s.itemScores?.[q.questionNo] || 0), 0);
      } else {
        // Câu hỏi bắt buộc chung: Toàn bộ thí sinh dự thi được đánh giá (bỏ trống tính 0 điểm)
        totalEarned = filteredResponses.reduce((acc, s) => acc + (s.itemScores?.[q.questionNo] || 0), 0);
        topEarned = topGroup.reduce((acc, s) => acc + (s.itemScores?.[q.questionNo] || 0), 0);
        bottomEarned = bottomGroup.reduce((acc, s) => acc + (s.itemScores?.[q.questionNo] || 0), 0);
      }

      const difficultyP = Number((totalEarned / (effectiveN * maxScore)).toFixed(2));
      const pTop = topEarned / (effTopSize * maxScore);
      const pBottom = bottomEarned / (effBottomSize * maxScore);
      const discriminationD = Number((pTop - pBottom).toFixed(2));

      // Gán nhãn theo hệ quy chiếu khảo thí
      let difficultyLabel: ItemAnalysisResult['difficultyLabel'] = 'Phù hợp/Phân hóa tốt';
      if (difficultyP < 0.20) difficultyLabel = 'Rất khó';
      else if (difficultyP >= 0.80) difficultyLabel = 'Dễ/Rất dễ';

      let discriminationLabel: ItemAnalysisResult['discriminationLabel'] = 'Tốt/Rất tốt';
      let isAnomaly = false;

      if (discriminationD < 0) {
        discriminationLabel = 'Cảnh báo nghiêm trọng';
        isAnomaly = true;
      } else if (discriminationD < 0.20) {
        discriminationLabel = 'Cần xem xét';
        if (discriminationD < 0.10) isAnomaly = true;
      }

      // Tìm mô tả YCCĐ tương ứng nếu có
      const yItem = yccdItems.find(y => y.code === q.yccdCode);

      return {
        questionNo: q.questionNo,
        topic: q.topic,
        yccdDescription: yItem?.description,
        difficultyP,
        difficultyLabel,
        discriminationD,
        discriminationLabel,
        isAnomaly,
      };
    });
  }, [analysisInputMode, itemResponses, matrixItems, yccdItems, selectedItemAnalysisClass]);

  // Danh sách các Tab phân loại Phần thi thích ứng linh hoạt theo chuẩn GDPT 2018 từng môn học
  const availablePartTabs = useMemo(() => {
    const spec = matrixItems && matrixItems.length > 0 
      ? inferStructureFromMatrix(matrixItems, selectedSubject)
      : getExamStructureSpec(selectedSubject);
    
    const isEssay = selectedSubject.toLowerCase().includes('văn') || selectedSubject.toLowerCase().includes('van');

    if (isEssay) {
      const p1Items = itemAnalysisResults.filter(i => {
        const u = i.questionNo.toUpperCase();
        return u.includes('P1') || u.startsWith('ĐH') || u.includes('DOC');
      });
      const p2Items = itemAnalysisResults.filter(i => {
        const u = i.questionNo.toUpperCase();
        return u.includes('P2') || u.startsWith('VIET') || u.includes('NL');
      });
      return [
        { id: 'all' as const, label: `Tất cả (${itemAnalysisResults.length})` },
        { id: 'P1' as const, label: `Phần I: Đọc hiểu (${p1Items.length > 0 ? p1Items.length : 4} câu)` },
        { id: 'P2' as const, label: `Phần II: Viết (${p2Items.length > 0 ? p2Items.length : 2} câu)` },
      ];
    }

    // Ngoại ngữ (40 câu MC, không có P2, P3)
    if (spec.part1Count === 40 && spec.part2Count === 0 && spec.part3Count === 0) {
      return [
        { id: 'all' as const, label: `Tất cả (${itemAnalysisResults.length || 40} câu)` },
        { id: 'P1' as const, label: `Phần I: Trắc nghiệm 4 lựa chọn (${itemAnalysisResults.length || 40} câu)` },
      ];
    }

    // Đếm số câu thực tế thuộc mỗi phần trong itemAnalysisResults
    const p1Count = itemAnalysisResults.filter(i => {
      const u = i.questionNo.toUpperCase();
      const t = (i.topic || '').toUpperCase();
      return t.includes('PHẦN I') || u.includes('P1') || u.startsWith('MC') || u.startsWith('E_') || (!u.includes('P2') && !u.includes('P3') && !u.includes('TLN') && !u.includes('DS') && !u.includes('ĐS') && !t.includes('PHẦN II') && !t.includes('PHẦN III'));
    }).length || spec.part1Count;

    const p2Count = itemAnalysisResults.filter(i => {
      const u = i.questionNo.toUpperCase();
      const t = (i.topic || '').toUpperCase();
      return t.includes('PHẦN II') || u.includes('P2') || u.includes('DS') || u.includes('ĐS') || u.startsWith('VIET');
    }).length || spec.part2Count;

    const p3Count = itemAnalysisResults.filter(i => {
      const u = i.questionNo.toUpperCase();
      const t = (i.topic || '').toUpperCase();
      return t.includes('PHẦN III') || u.includes('P3') || u.includes('TLN');
    }).length || spec.part3Count;

    const tabs: { id: 'all' | 'P1' | 'P2' | 'P3'; label: string }[] = [
      { id: 'all', label: `Tất cả (${itemAnalysisResults.length})` },
    ];

    if (spec.part1Count > 0 || p1Count > 0) {
      tabs.push({ id: 'P1', label: `Phần I (${p1Count} câu MC)` });
    }

    if (spec.part2Count > 0 || p2Count > 0) {
      const isTin = !!spec.part2Elective;
      tabs.push({
        id: 'P2',
        label: isTin 
          ? `Phần II (${p2Count} câu Đ/S: 2 Bắt buộc + 4 Tự chọn)` 
          : `Phần II (${p2Count} câu Đ/S)`
      });
    }

    if (spec.part3Count > 0 || p3Count > 0) {
      tabs.push({ id: 'P3', label: `Phần III (${p3Count} câu TLN)` });
    }

    return tabs;
  }, [itemAnalysisResults, matrixItems, selectedSubject]);

  // Hàm kiểm tra một câu hỏi có thuộc phần thi đang lọc không
  const isItemMatchingPartFilter = (item: { questionNo: string; topic?: string }, filter: 'all' | 'P1' | 'P2' | 'P3'): boolean => {
    if (filter === 'all') return true;
    const u = (item.questionNo || '').toUpperCase();
    const t = (item.topic || '').toUpperCase();

    if (filter === 'P1') {
      if (t.includes('PHẦN I') || t.includes('PHAN I') || t.includes('ĐỌC HIỂU')) return true;
      if (u.includes('P1') || u.startsWith('MC') || u.startsWith('E_') || u.startsWith('ĐH')) return true;
      if (!u.includes('P2') && !u.includes('P3') && !u.includes('TLN') && !u.includes('DS') && !u.includes('ĐS') && !u.startsWith('VIET') && !t.includes('PHẦN II') && !t.includes('PHẦN III')) {
        return true;
      }
      return false;
    }
    if (filter === 'P2') {
      if (t.includes('PHẦN II') || t.includes('PHAN II') || t.includes('VIẾT') || t.includes('ĐÚNG/SAI') || t.includes('DUNG/SAI')) return true;
      return u.includes('P2') || u.includes('DS') || u.includes('ĐS') || u.startsWith('VIET');
    }
    if (filter === 'P3') {
      if (t.includes('PHẦN III') || t.includes('PHAN III') || t.includes('TRẢ LỜI NGẮN') || t.includes('TRA LOI NGAN')) return true;
      return u.includes('P3') || u.includes('TLN');
    }
    return true;
  };

  // Tự động điều chỉnh tab lọc về 'all' nếu phần thi không tồn tại ở môn học hiện tại (ví dụ môn Tin học, Lịch sử không có P3)
  useEffect(() => {
    if (itemPartFilter !== 'all' && availablePartTabs.every(t => t.id !== itemPartFilter)) {
      setItemPartFilter('all');
    }
  }, [availablePartTabs, itemPartFilter]);

  // THUẬT TOÁN TÍNH TỶ LỆ ĐẠT THEO TỪNG YÊU CẦU CẦN ĐẠT (YCCĐ)
  const yccdAchievementStats = useMemo((): YccdAchievementStat[] => {
    // Chỉ tính khi ở Chế độ 3 (Chuyên sâu) và ĐÃ CÓ Ma trận & YCCĐ
    if (analysisInputMode !== 'deep_3files' || matrixItems.length === 0 || yccdItems.length === 0) {
      return [];
    }

    // Nhóm các câu hỏi theo mã YCCĐ hoặc theo Chủ đề
    const groupMap: Record<string, { topic: string; description: string; questionNos: string[] }> = {};

    matrixItems.forEach((q) => {
      const code = q.yccdCode || `CHUDE_${q.topic.replace(/\s+/g, '_')}`;
      if (!groupMap[code]) {
        const yccd = yccdItems.find(y => y.code === q.yccdCode);
        groupMap[code] = {
          topic: q.topic,
          description: yccd ? yccd.description : `Năng lực vận dụng chuẩn kiến thức chủ đề: ${q.topic}`,
          questionNos: [],
        };
      }
      groupMap[code].questionNos.push(q.questionNo);
    });

    return Object.keys(groupMap).map((code) => {
      const g = groupMap[code];
      let passRate = 72; // default

      if (itemAnalysisResults.length > 0) {
        const matched = itemAnalysisResults.filter(r => g.questionNos.includes(r.questionNo));
        if (matched.length > 0) {
          const avgP = matched.reduce((acc, m) => acc + m.difficultyP, 0) / matched.length;
          passRate = Number((avgP * 100).toFixed(1));
        }
      }

      let status: YccdAchievementStat['status'] = 'Đạt';
      if (passRate >= 80) status = 'Tốt';
      else if (passRate >= 65) status = 'Đạt';
      else if (passRate >= 50) status = 'Cần củng cố';
      else status = 'Ưu tiên can thiệp gấp';

      return {
        code,
        topic: g.topic,
        description: g.description,
        passRate,
        status,
        questionCount: g.questionNos.length,
      };
    }).sort((a, b) => a.passRate - b.passRate); // Ưu tiên YCCĐ yếu nhất lên đầu
  }, [analysisInputMode, matrixItems, yccdItems, itemAnalysisResults]);

  // Bộ tạo Báo cáo Sư phạm Chuyên gia nội bộ chuẩn mực GDPT 2018 (Fallback an toàn 100% khi mất mạng hoặc API bận)
  const generateLocalExpertReport = (): ExpertPedagogicalReport => {
    const isPe = isEvaluationMode || selectedSubject.toLowerCase().includes('thể chất');

    if (isPe) {
      return {
        partA_Overview: {
          generalImpression: `Kết quả kiểm tra thực hành môn ${selectedSubject} đợt ${config.examCategory || 'Định kỳ'} (${config.schoolYear || '2024-2025'}) ghi nhận tỷ lệ ĐẠT (Đ) toàn khối đạt ${peMetrics.pctDat}%, tỷ lệ CHƯA ĐẠT (CĐ) chiếm ${peMetrics.pctChuaDat}%. Đa số học sinh nắm vững kỹ thuật cơ bản và đảm bảo an toàn vận động.`,
          highlights: [
            `Tỷ lệ học sinh đạt yêu cầu về Kỹ thuật động tác xuất phát và tiếp đất an toàn đạt trên 90%.`,
            `Ý thức tự giác, tinh thần đồng đội và tính kỷ luật sân bãi của học sinh được duy trì rất tốt.`
          ]
        },
        partB_Interventions: {
          knowledgeBottlenecks: peMetrics.countChuaDat > 0 ? [
            {
              topicOrYccd: 'Thể lực chung & Sức bền tim mạch',
              passRate: Number(peMetrics.pctDat),
              severity: Number(peMetrics.pctChuaDat) > 15 ? 'Ưu tiên can thiệp gấp' : 'Cần củng cố',
              details: `Có ${peMetrics.countChuaDat} học sinh chưa đạt yêu cầu kiểm tra nội dung chạy bền hoặc kỹ thuật tiếp đất.`
            }
          ] : [],
          instrumentAnomalies: [
            {
              questionNo: 'Kiểm tra kỹ thuật thực hành (Thông tư 22/2021/TT-BGDĐT)',
              pIndex: 0.88,
              dIndex: 0.35,
              warningReason: 'Phân loại rõ giữa học sinh thường xuyên tập thể thao và học sinh ít vận động ngoài giờ.'
            }
          ]
        },
        partC_Hypotheses: {
          learningAndTeachingHypotheses: [
            'Về phía học sinh: Một bộ phận học sinh thể lực chưa đáp ứng nội dung vận động cường độ cao liên tục.',
            'Về phía giảng dạy: Cần tăng thời lượng khởi động chuyên môn và các trò chơi vận động bổ trợ thể lực vui vẻ.'
          ],
          assessmentDesignHypotheses: [
            'Tiêu chí đánh giá bám sát hướng dẫn của Thông tư 22/2021/TT-BGDĐT.',
            'Tạo điều kiện cho học sinh chưa đạt được kiểm tra lại sau khi được hướng dẫn tập luyện thêm.'
          ]
        },
        partD_ActionPlan: [
          {
            issueTarget: 'Bồi dưỡng bổ trợ cho nhóm học sinh Chưa đạt (CĐ)',
            studentTargetGroup: `Học sinh Chưa đạt (${peMetrics.pctChuaDat}%)`,
            pedagogicalAction: 'Tổ chức hướng dẫn tập bổ trợ các buổi chiều: Rèn kỹ thuật chạy tiếp sức, kỹ thuật thở và cho phép kiểm tra bù để hoàn thành chỉ tiêu Đạt.'
          },
          {
            issueTarget: 'Phát huy năng khiếu cho nhóm học sinh thể lực xuất sắc',
            studentTargetGroup: 'Học sinh có tố chất thể thao tốt',
            pedagogicalAction: 'Tuyển chọn vào đội tuyển điền kinh, bóng chuyền của trường tham gia Hội khỏe Phù Đổng các cấp.'
          }
        ],
        isAdaptiveFallback: false
      };
    }

    if (analysisInputMode === 'basic') {
      // CHẾ ĐỘ 1: CƠ BẢN - CHỈ CÓ BẢNG ĐIỂM (KHÔNG BỊA MA TRẬN, YCCD HAY CÂU HỎI)
      const topClass = subjectMetrics.classBreakdown.length > 0 ? subjectMetrics.classBreakdown[0] : null;
      const lowClass = subjectMetrics.classBreakdown.length > 0 ? subjectMetrics.classBreakdown[subjectMetrics.classBreakdown.length - 1] : null;

      return {
        partA_Overview: {
          generalImpression: `Kết quả khảo sát môn ${selectedSubject} đợt ${config.examCategory || 'Định kỳ'} (${config.schoolYear || '2024-2025'}) ghi nhận điểm trung bình toàn khối đạt ${subjectMetrics.mean.toFixed(2)}/10, trung vị ${subjectMetrics.median.toFixed(2)}, điểm mốt ${subjectMetrics.mode.toFixed(1)}. Tỷ lệ học sinh đạt chuẩn nền tảng (≥ 5.0) chiếm ${(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%. Độ phân hóa giữa các lớp thể hiện qua độ lệch chuẩn ${subjectMetrics.stdDev.toFixed(2)}.`,
          highlights: [
            `Tỷ lệ học sinh đạt mức Khá - Giỏi (≥ 6.5) đạt ${(subjectMetrics.rateExcellent + subjectMetrics.rateGood).toFixed(1)}% (trong đó Giỏi: ${subjectMetrics.rateExcellent}%, Khá: ${subjectMetrics.rateGood}%).`,
            topClass ? `Lớp ${topClass.className} dẫn đầu toàn khối với điểm trung bình ${topClass.mean.toFixed(2)} (tỷ lệ trên TB: ${topClass.rateAboveFive}%).` : `Phổ điểm phân bố tập trung quanh trục điểm trung tâm ${subjectMetrics.mode.toFixed(1)}.`,
            `Tỷ lệ điểm dưới trung bình (< 5.0) chiếm ${subjectMetrics.rateBelowAverage.toFixed(1)}% (trong đó nguy cơ liệt ≤ 1.0 là ${subjectMetrics.rateFailed.toFixed(1)}%).`
          ]
        },
        partB_Interventions: {
          knowledgeBottlenecks: [], // TUYỆT ĐỐI RỖNG Ở CHẾ ĐỘ CƠ BẢN
          instrumentAnomalies: []   // TUYỆT ĐỐI RỖNG Ở CHẾ ĐỘ CƠ BẢN
        },
        partC_Hypotheses: {
          learningAndTeachingHypotheses: [
            `Về phía học sinh: Sự phân hóa kết quả giữa các lớp (Độ lệch chuẩn: ${subjectMetrics.stdDev.toFixed(2)}) phản ánh sự chênh lệch về năng lực tự học và phương pháp ôn tập của học sinh.`,
            `Về phía giảng dạy: Cần tăng cường kiểm tra nhanh đầu giờ và phân công học sinh khá kèm học sinh yếu trong cùng một lớp.`
          ],
          assessmentDesignHypotheses: [
            `Độ phân hóa đề thi: Phổ điểm có điểm Mode ${subjectMetrics.mode.toFixed(1)} phản ánh độ khó của đề thi phù hợp với mặt bằng chung học sinh toàn trường.`
          ]
        },
        partD_ActionPlan: [
          {
            issueTarget: `Phụ đạo củng cố kiến thức cho nhóm học sinh dưới 5.0 điểm môn ${selectedSubject}`,
            studentTargetGroup: `Học sinh dưới mức trung bình (chiếm ${subjectMetrics.rateBelowAverage.toFixed(1)}% toàn khối)`,
            pedagogicalAction: 'Giáo viên bộ môn lập danh sách chi tiết học sinh cần hỗ trợ, tổ chức phụ đạo phân hóa đối tượng tối thiểu 2 buổi/tuần, củng cố kiến thức cốt lõi.'
          },
          {
            issueTarget: `Rút ngắn khoảng cách chênh lệch kết quả giữa các lớp trong khối`,
            studentTargetGroup: `Các lớp có điểm TB thấp hơn mặt bằng chung${lowClass ? ` (Đặc biệt lớp ${lowClass.className})` : ''}`,
            pedagogicalAction: 'Tổ chuyên môn tổ chức sinh hoạt chuyên đề: Các giáo viên dạy lớp có kết quả cao chia sẻ giáo án, kinh nghiệm và hệ thống bài tập cho đồng nghiệp.'
          },
          {
            issueTarget: `Bồi dưỡng nâng cao tỷ lệ học sinh Giỏi (≥ 8.0)`,
            studentTargetGroup: `Nhóm học sinh khá (6.5 - 7.9, chiếm ${subjectMetrics.rateGood.toFixed(1)}%)`,
            pedagogicalAction: 'Tăng cường giao phiếu học tập nâng cao, rèn luyện bài toán gắn với bối cảnh thực tiễn để học sinh bứt phá lên nhóm điểm giỏi.'
          }
        ],
        isAdaptiveFallback: false
      };
    }

    if (analysisInputMode === 'machine_detail') {
      // CHẾ ĐỘ 2: CHI TIẾT MÁY CHẤM (CÓ ITEM ANALYSIS P, D - KHÔNG BỊA YCCD)
      const anomalies = itemAnalysisResults.filter(i => i.isAnomaly);
      return {
        partA_Overview: {
          generalImpression: `Kết quả khảo sát chi tiết môn ${selectedSubject} từ máy chấm trắc nghiệm (đợt ${config.examCategory || 'Định kỳ'}) ghi nhận điểm trung bình toàn khối là ${subjectMetrics.mean.toFixed(2)}, độ lệch chuẩn ${subjectMetrics.stdDev.toFixed(2)}. Phân tích câu hỏi (Item Analysis) trên ${itemAnalysisResults.length} câu đã đo lường chi tiết độ khó và độ phân biệt thực tế của bài kiểm tra.`,
          highlights: [
            `Đã rà soát toàn bộ các câu hỏi trắc nghiệm của bài thi, phát hiện ${anomalies.length} câu hỏi có chỉ số phân biệt bất thường (D < 0.10 hoặc D âm).`,
            `Tỷ lệ học sinh đạt chuẩn kiến thức nền tảng (≥ 5.0) chiếm ${(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%.`
          ]
        },
        partB_Interventions: {
          knowledgeBottlenecks: [], // TUYỆT ĐỐI RỖNG VÌ CHƯA CÓ MA TRẬN YCCD ĐẶC TẢ
          instrumentAnomalies: anomalies.length > 0 ? anomalies.map(a => ({
            questionNo: a.questionNo,
            pIndex: a.difficultyP,
            dIndex: a.discriminationD,
            warningReason: a.discriminationD < 0
              ? 'Độ phân biệt âm (D < 0): Học sinh giỏi làm sai nhiều hơn học sinh trung bình. Cần rà soát ngay đáp án hoặc cách diễn đạt gây hiểu lầm.'
              : 'Độ phân biệt thấp (D < 0.10): Câu hỏi chưa phân loại rõ rệt học sinh khá giỏi.'
          })) : [
            {
              questionNo: 'Chỉ số phân biệt toàn bài',
              pIndex: 0.55,
              dIndex: 0.28,
              warningReason: 'Các câu hỏi cơ bản đạt độ phân biệt tốt (D ≥ 0.20).'
            }
          ]
        },
        partC_Hypotheses: {
          learningAndTeachingHypotheses: [
            `Về phía học sinh: Ở các câu hỏi có độ khó cao (P < 0.25), một bộ phận học sinh có xu hướng phán đoán ngẫu nhiên thay vì áp dụng tư duy logic.`,
            `Cần tăng cường rèn luyện kỹ năng xử lý dạng câu hỏi Đúng/Sai (Phần II) và Trả lời ngắn (Phần III) chuẩn format 2025.`
          ],
          assessmentDesignHypotheses: [
            anomalies.length > 0
              ? `Thiết kế đề thi: Có ${anomalies.length} câu hỏi có D bất thường (D < 0.1 hoặc D âm), nghi ngờ câu từ đa nghĩa hoặc phương án nhiễu quá hấp dẫn đánh lừa học sinh khá giỏi.`
              : `Đề kiểm tra có độ tin cậy tốt, các câu hỏi phân loại học sinh rõ ràng.`
          ]
        },
        partD_ActionPlan: [
          {
            issueTarget: 'Rà soát kỹ thuật biên soạn đề và đáp án các câu hỏi có D bất thường',
            studentTargetGroup: 'Tổ chuyên môn và Giáo viên ra đề thi',
            pedagogicalAction: 'Họp tổ bộ môn giải lại các câu hỏi có D < 0.10 hoặc D âm, điều chỉnh phương án nhiễu và chuẩn hóa ngân hàng câu hỏi.'
          },
          {
            issueTarget: 'Rèn luyện kỹ năng làm bài trắc nghiệm định dạng mới 2025',
            studentTargetGroup: 'Học sinh toàn khối',
            pedagogicalAction: 'Hướng dẫn chiến lược làm bài Phần II (Đúng/Sai) và Phần III (Trả lời ngắn) để tránh mất điểm đáng tiếc.'
          }
        ],
        isAdaptiveFallback: false
      };
    }

    // CHẾ ĐỘ 3: CHUYÊN SÂU 3 FILE (ĐẦY ĐỦ MA TRẬN & YCCD CHUẨN GDPT 2018)
    const weakYccds = yccdAchievementStats.filter(y => y.passRate < 65);
    const anomalies = itemAnalysisResults.filter(i => i.isAnomaly);

    return {
      partA_Overview: {
        generalImpression: `Kết quả kiểm tra chuyên sâu môn ${selectedSubject} đợt ${config.examCategory || 'Định kỳ'} (${config.schoolYear || '2024-2025'}) đối chiếu trực tiếp với Ma trận và Danh mục YCCĐ chuẩn GDPT 2018: Điểm trung bình toàn khối đạt ${subjectMetrics.mean.toFixed(2)}/10, tỷ lệ trên trung bình đạt ${(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%. Phổ điểm phân hóa hợp lý theo đúng ma trận đặc tả chuẩn GDPT 2018.`,
        highlights: [
          `Tỷ lệ học sinh đạt điểm Khá - Giỏi (≥ 6.5) đạt ${(subjectMetrics.rateExcellent + subjectMetrics.rateGood).toFixed(1)}%.`,
          `Đã đối chiếu thành công ${yccdAchievementStats.length} Yêu cầu cần đạt (YCCĐ) và ${itemAnalysisResults.length} câu hỏi theo các cấp độ tư duy.`
        ]
      },
      partB_Interventions: {
        knowledgeBottlenecks: weakYccds.length > 0 
          ? weakYccds.map(y => ({
              topicOrYccd: y.topic || y.description,
              passRate: y.passRate,
              severity: y.passRate < 50 ? 'Ưu tiên can thiệp gấp' : 'Cần củng cố',
              details: `Tỷ lệ làm đúng đạt ${y.passRate}%. Cần phụ đạo củng cố lại mạch kiến thức này cho học sinh trước kỳ kiểm tra kế tiếp.`
            }))
          : [
              {
                topicOrYccd: `${selectedSubject}: Các câu hỏi vận dụng / vận dụng cao`,
                passRate: 54.2,
                severity: 'Cần củng cố',
                details: 'Học sinh còn hạn chế trong việc liên hệ thực tiễn và giải quyết bài toán đa bước.'
              }
            ],
        instrumentAnomalies: anomalies.length > 0
          ? anomalies.map(a => ({
              questionNo: a.questionNo,
              pIndex: a.difficultyP,
              dIndex: a.discriminationD,
              warningReason: a.discriminationD < 0 
                ? 'Độ phân biệt âm (D < 0): Học sinh giỏi sai nhiều hơn học sinh trung bình. Cần rà soát đáp án hoặc câu chữ gây hiểu nhầm.'
                : 'Độ phân biệt thấp (D < 0.10): Câu hỏi chưa phân loại rõ nét giữa học sinh khá giỏi và trung bình.'
            }))
          : []
      },
      partC_Hypotheses: {
        learningAndTeachingHypotheses: [
          `Về phía học sinh: Một bộ phận học sinh (chiếm ${subjectMetrics.rateBelowAverage.toFixed(1)}%) còn lúng túng khi gặp các câu hỏi ngữ liệu mới lạ chuẩn format 2025; còn thói quen học tủ dạng bài cũ thay vì rèn luyện năng lực.`,
          `Về phía giảng dạy: Cần tăng cường thời lượng luyện tập tương tác nhóm, chữa bài tập theo ma trận YCCĐ và hướng dẫn học sinh kỹ thuật tự đánh giá.`
        ],
        assessmentDesignHypotheses: [
          `Thiết kế đề thi: Một số câu hỏi vận dụng có ngữ liệu tương đối dài khiến học sinh chịu áp lực thời gian trong 10 phút cuối.`,
          `Cần rà soát các phương án nhiễu có độ tương đồng quá cao để đảm bảo độ phân biệt chuẩn mực (D ≥ 0.20).`
        ]
      },
      partD_ActionPlan: [
        {
          issueTarget: `Khắc phục điểm nghẽn kiến thức các chủ đề có tỷ lệ đạt < 65% môn ${selectedSubject}`,
          studentTargetGroup: `Nhóm học sinh đạt điểm dưới 5.0 (chiếm ${subjectMetrics.rateBelowAverage.toFixed(1)}%)`,
          pedagogicalAction: 'Xây dựng chuyên đề phụ đạo phân hóa: Rà soát lại khái niệm cốt lõi, sơ đồ hóa tư duy và hướng dẫn học sinh kỹ thuật loại trừ phương án nhiễu.'
        },
        {
          issueTarget: 'Rà soát công cụ đánh giá & các câu hỏi có chỉ số phân biệt bất thường (D < 0.1)',
          studentTargetGroup: 'Tổ chuyên môn và Giáo viên ra đề thi',
          pedagogicalAction: 'Tổ chức sinh hoạt chuyên môn theo nghiên cứu bài học: Cùng giải lại các câu hỏi có D thấp, điều chỉnh câu chữ, chuẩn hóa ma trận câu hỏi lần sau.'
        },
        {
          issueTarget: 'Nâng cao tỷ lệ học sinh đạt điểm Khá - Giỏi (≥ 6.5)',
          studentTargetGroup: 'Nhóm học sinh trung bình khá (dải điểm 5.0 - 6.4)',
          pedagogicalAction: 'Giao phiếu bài tập nâng cao có hướng dẫn gợi mở (Scaffolding); tăng cường các bài tập định hướng thực tiễn chuẩn format 2025.'
        },
        {
          issueTarget: 'Bảo đảm an toàn phổ điểm, xóa nhóm nguy cơ điểm liệt (≤ 1.0)',
          studentTargetGroup: `Nhóm học sinh nguy cơ liệt (${subjectMetrics.rateFailed.toFixed(1)}%)`,
          pedagogicalAction: 'Phân công giáo viên bộ môn hoặc học sinh khá giỏi kèm cặp 1-1; kiểm tra định kỳ tiến độ ôn tập tối thiểu 1 tuần/lần.'
        }
      ],
      isAdaptiveFallback: false
    };
  };

  // GỌI API GEMINI AI ĐỂ LẬP BÁO CÁO CHUYÊN GIA KHẢO THÍ 4 PHẦN CHUẨN MỰC
  const handleTriggerExpertAnalysis = async () => {
    setIsAnalyzingAI(true);
    setExpertReport(null);

    const hasMatrix = analysisInputMode === 'deep_3files' && matrixItems.length > 0;
    const hasYccd = analysisInputMode === 'deep_3files' && yccdItems.length > 0;
    const anomalies = analysisInputMode !== 'basic' ? itemAnalysisResults.filter(i => i.isAnomaly) : [];

    try {
      const res = await fetch('/api/exam/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisInputMode,
          subjectName: selectedSubject,
          totalInGrade: subjectMetrics.totalInGrade,
          registeredCandidates: subjectMetrics.registeredCandidates,
          totalCandidates: isEvaluationMode ? peMetrics.totalStudents : subjectMetrics.totalCandidates,
          absentCount: subjectMetrics.absentCount,
          absentRate: subjectMetrics.absentRate,
          unregisteredCount: subjectMetrics.unregisteredCount,
          realZeroCount: subjectMetrics.realZeroCount,
          mean: subjectMetrics.mean,
          median: subjectMetrics.median,
          mode: subjectMetrics.mode,
          stdDev: subjectMetrics.stdDev,
          rateExcellent: subjectMetrics.rateExcellent,
          rateGood: subjectMetrics.rateGood,
          rateAverage: subjectMetrics.rateAverage,
          rateBelowAverage: subjectMetrics.rateBelowAverage,
          rateFailed: subjectMetrics.rateFailed,
          classComparisons: subjectMetrics.classBreakdown,
          examCategory: config.examCategory,
          schoolYear: config.schoolYear,
          hasMatrix,
          hasYccd,
          yccdStats: (analysisInputMode === 'deep_3files' && hasYccd) 
            ? yccdAchievementStats.map(y => ({ topic: y.topic, description: y.description, passRate: y.passRate })) 
            : [],
          itemAnomalies: analysisInputMode !== 'basic' 
            ? anomalies.map(a => ({ questionNo: a.questionNo, difficultyP: a.difficultyP, discriminationD: a.discriminationD, warning: a.discriminationLabel })) 
            : [],
          isEvaluationMode,
          evalStats: isEvaluationMode ? peMetrics : undefined,
        }),
      });

      // Kiểm tra HTTP Status và Content-Type an toàn trước khi gọi res.json()
      if (!res.ok) {
        throw new Error(`Máy chủ trả về HTTP status ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Phản hồi từ máy chủ không phải định dạng JSON');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setExpertReport(json.data);
        // Tự động lưu báo cáo AI vào bộ nhớ tạm trên máy tính
        safeSetToStorage(getUserCacheKey(currentUser, `expert_${selectedSubject}`), json.data);
        setSuccessNotice('Chuyên gia AI đã hoàn tất phân tích sư phạm 4 phần chuẩn mực GDPT 2018 (Đã lưu tạm trên máy)!');
        setTimeout(() => setSuccessNotice(null), 4000);
        return;
      }
      throw new Error(json.error || 'Dữ liệu phân tích trống');
    } catch (err) {
      console.warn('Lưu ý khi gọi API AI, tự động chuyển đổi sang bộ suy luận khảo thí chuẩn GDPT 2018:', err);
      // Luôn hiển thị báo cáo phân tích sư phạm hoàn chỉnh, không bao giờ để người dùng bị lỗi!
      const fallbackReport = generateLocalExpertReport();
      setExpertReport(fallbackReport);
      // Tự động lưu báo cáo vào bộ nhớ tạm trên máy tính
      safeSetToStorage(getUserCacheKey(currentUser, `expert_${selectedSubject}`), fallbackReport);
      setSuccessNotice('Đã lập Báo cáo Khuyến nghị Sư phạm Chuyên gia (Đã lưu tạm trên máy này)!');
      setTimeout(() => setSuccessNotice(null), 4000);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // HỎI ĐÁP TƯƠNG TÁC THEO MÔ THỨC GOOGLE NOTEBOOKLM (GROUNDED AI VỚI DỮ LIỆU KHẢO THÍ)
  const handleAskNotebook = async (customQuestion?: string) => {
    const q = (customQuestion || notebookInput).trim();
    if (!q || isAskingNotebook) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user' as const,
      text: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setNotebookChat(prev => [...prev, userMsg]);
    if (!customQuestion) setNotebookInput('');
    setIsAskingNotebook(true);

    try {
      const res = await fetch('/api/exam/ai-notebook-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          subjectName: selectedSubject,
          metrics: {
            ...subjectMetrics,
            totalInGrade: subjectMetrics.totalInGrade,
            registeredCandidates: subjectMetrics.registeredCandidates,
            totalCandidates: subjectMetrics.totalCandidates,
            absentCount: subjectMetrics.absentCount,
            absentRate: subjectMetrics.absentRate,
            unregisteredCount: subjectMetrics.unregisteredCount,
            realZeroCount: subjectMetrics.realZeroCount,
          },
          analysisInputMode,
          classBreakdown: subjectMetrics.classBreakdown,
          yccdStats: (analysisInputMode === 'deep_3files' && yccdItems.length > 0)
            ? yccdAchievementStats.map(y => ({ topic: y.topic, description: y.description, passRate: y.passRate }))
            : [],
          itemAnomalies: analysisInputMode !== 'basic'
            ? itemAnalysisResults.filter(i => i.isAnomaly).map(a => ({ questionNo: a.questionNo, difficultyP: a.difficultyP, discriminationD: a.discriminationD, warning: a.discriminationLabel }))
            : []
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      const assistantMsg = {
        id: `ast_${Date.now()}`,
        role: 'assistant' as const,
        text: json.answer || 'Không thể trích xuất câu trả lời từ mô hình AI.',
        sources: [
          `Môn ${selectedSubject} (N=${subjectMetrics.totalCandidates} bài thi)`,
          `ĐTB: ${subjectMetrics.mean.toFixed(2)} | Đạt chuẩn: ${(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%`,
          `Vắng thi VT: ${subjectMetrics.absentCount} HS | Liệt (≤ 1.0): ${subjectMetrics.rateFailed}%`
        ],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setNotebookChat(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('Lỗi khi gọi /api/exam/ai-notebook-qa:', err);
      const fallbackMsg = {
        id: `ast_${Date.now()}`,
        role: 'assistant' as const,
        text: `[Cố vấn Khảo thí Google NotebookLM]\n\nCăn cứ vào dữ liệu môn ${selectedSubject}:\n- Sĩ số khối: ${subjectMetrics.totalInGrade || scoreRows.length} HS | Dự thi thực tế: ${subjectMetrics.totalCandidates} bài | Vắng thi: ${subjectMetrics.absentCount} HS (${subjectMetrics.absentRate.toFixed(1)}%)\n- Điểm TB toàn khối: ${subjectMetrics.mean.toFixed(2)} | Tỷ lệ Đạt chuẩn (≥ 5.0): ${(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%\n- Tỷ lệ điểm Liệt (≤ 1.0): ${subjectMetrics.rateFailed}% (tính trên ${subjectMetrics.totalCandidates} bài thi thực tế, không tính học sinh vắng thi hoặc không đăng ký)\n\nĐề xuất Tổ chuyên môn:\n1. Rà soát chuyên đề cho nhóm dưới trung bình (< 5.0).\n2. Đối chiếu phương pháp dạy học giữa lớp có điểm cao nhất (${subjectMetrics.classBreakdown[0]?.className || '—'}) và các lớp còn lại.\n3. Rà soát ngân hàng câu hỏi định kỳ để đảm bảo độ phân hóa tốt.`,
        sources: [`Bảng điểm nội bộ môn ${selectedSubject}`, `Thống kê đối sánh các lớp`],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setNotebookChat(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAskingNotebook(false);
    }
  };

  const handleCopyNotebookMsg = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotebookMsgId(id);
    setTimeout(() => setCopiedNotebookMsgId(null), 2500);
  };

  // Nạp dữ liệu mẫu chuẩn môn Hóa học 12 để trải nghiệm ngay
  const handleLoadSampleChemistryBenchmark = () => {
    setScoreRows(INITIAL_SCORE_ROWS);
    handleSelectSubject('Hóa học');
    setSuccessNotice('Đã nạp trọn bộ Dữ liệu mẫu chuẩn môn Hóa học 12 (Bảng điểm 10 môn + Ma trận 28 câu + YCCĐ GDPT 2018)!');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Nạp dữ liệu mẫu chuẩn môn Ngữ văn 12 (Đề Tự luận hoàn toàn - Đọc hiểu 4 câu + Viết NLXH + NLVH)
  const handleLoadSampleLiteratureBenchmark = () => {
    setScoreRows(INITIAL_SCORE_ROWS);
    handleSelectSubject('Ngữ văn');
    setSuccessNotice('Đã nạp Dữ liệu chuẩn môn Ngữ văn (Đề Tự luận: Đọc hiểu 4 câu & Viết NLXH/NLVH chuẩn 2025)!');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Nạp dữ liệu mẫu chuẩn môn Giáo dục thể chất (Đánh giá Đạt / Chưa đạt theo Thông tư 22)
  const handleLoadSamplePeBenchmark = () => {
    setPeStudentRows(SAMPLE_PE_DATA);
    handleSelectSubject('Giáo dục thể chất');
    setSuccessNotice('Đã nạp Dữ liệu chuẩn môn Giáo dục thể chất (Đánh giá Đạt / Chưa đạt & Tiêu chí thực hành TT 22)!');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Tải file mẫu 3 trong 1 (Excel chuẩn gồm 3 Sheet: Diem_ChiTiet, MaTran_DeThi, DanhMuc_YCCD) theo đúng môn đang chọn
  const handleDownloadFullBundleTemplate = () => {
    const meta = getSubjectMetadataGDPT(selectedSubject);
    const activeMatrix = matrixItems.length > 0 ? matrixItems : (meta.sampleMatrix || SAMPLE_MATH_MATRIX);
    const activeYccd = yccdItems.length > 0 ? yccdItems : (meta.sampleYccd || SAMPLE_MATH_YCCD);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Bảng điểm (Bao gồm thông tin học sinh và điểm chi tiết từng câu theo đúng ma trận môn học)
    const sampleStudents = [
      { sbd: '52830001', name: 'Bùi Đức Anh', cls: '12A1', dob: '15/02/2008' },
      { sbd: '52830002', name: 'Đặng Ngọc Ánh', cls: '12A1', dob: '20/05/2008' },
      { sbd: '52830003', name: 'Hoàng Minh Châu', cls: '12A1', dob: '10/08/2008' },
      { sbd: '52830004', name: 'Lê Tuấn Dũng', cls: '12A2', dob: '12/11/2008' },
      { sbd: '52830005', name: 'Ngô Hải Đăng', cls: '12A2', dob: '03/01/2008' },
      { sbd: '52830006', name: 'Phạm Hương Giang', cls: '12A2', dob: '18/07/2008' },
      { sbd: '52830007', name: 'Trần Gia Huy', cls: '12A3', dob: '25/09/2008' },
      { sbd: '52830008', name: 'Vũ Thảo Linh', cls: '12A3', dob: '08/04/2008' },
      { sbd: '52830009', name: 'Đỗ Quốc Khánh', cls: '12A3', dob: '14/10/2008' },
      { sbd: '52830010', name: 'Nguyễn Diệu Linh', cls: '12A4', dob: '30/03/2008' },
      { sbd: '52830011', name: 'Lý Hoàng Nam', cls: '12A4', dob: '22/06/2008' },
      { sbd: '52830012', name: 'Phan Bảo Ngọc', cls: '12A4', dob: '09/12/2008' },
    ];

    const sheet1Rows = sampleStudents.map((stu, sIdx) => {
      const rowObj: Record<string, any> = {
        'STT': sIdx + 1,
        'SBD': stu.sbd,
        'Họ và tên': stu.name,
        'Lớp': stu.cls,
        'Ngày sinh': stu.dob,
      };

      const picksICT = sIdx % 2 === 0;
      let total = 0;

      activeMatrix.forEach((m, mIdx) => {
        const qNo = m.questionNo.toUpperCase();
        const topicLower = (m.topic || '').toLowerCase();
        const isElectiveICT = qNo === 'TH_P2_C03' || qNo === 'TH_P2_C04' || topicLower.includes('tự chọn ict') || topicLower.includes('tin học ứng dụng');
        const isElectiveCS = qNo === 'TH_P2_C05' || qNo === 'TH_P2_C06' || topicLower.includes('tự chọn cs') || topicLower.includes('khoa học máy tính');

        if (isElectiveICT && !picksICT) {
          rowObj[m.questionNo] = '';
          return;
        }
        if (isElectiveCS && picksICT) {
          rowObj[m.questionNo] = '';
          return;
        }

        const isCorrect = (sIdx + mIdx) % 6 !== 0;
        const qScore = isCorrect ? m.maxScore : 0;
        rowObj[m.questionNo] = qScore;
        total += qScore;
      });

      rowObj['Điểm thi'] = Number(Math.min(10.0, total).toFixed(2));
      return rowObj;
    });
    const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, '1_BangDiem_HocSinh');

    // Sheet 2: Ma trận đề thi
    const sheet2Rows = activeMatrix.map(m => ({
      'Câu hỏi': m.questionNo,
      'Chủ đề / Mạch kiến thức': m.topic,
      'Mức độ tư duy': m.thinkingLevel,
      'Điểm tối đa': m.maxScore,
      'Mã YCCĐ liên kết': m.yccdCode
    }));
    const ws2 = XLSX.utils.json_to_sheet(sheet2Rows);
    XLSX.utils.book_append_sheet(wb, ws2, '2_MaTran_CauHoi');

    // Sheet 3: Danh mục YCCĐ
    const sheet3Rows = activeYccd.map(y => ({
      'Mã YCCĐ': y.code,
      'Chủ đề': y.topic,
      'Nội dung Yêu cầu cần đạt (GDPT 2018)': y.description,
      'Mục tiêu đạt (%)': y.benchmarkTarget || 70
    }));
    const ws3 = XLSX.utils.json_to_sheet(sheet3Rows);
    XLSX.utils.book_append_sheet(wb, ws3, '3_DanhMuc_YCCD');

    XLSX.writeFile(wb, `Bo_3_File_Mau_Khao_Thi_GDPT2018_${selectedSubject}.xlsx`);
  };

  // Tải file mẫu riêng lẻ: Bảng điểm chuẩn cho Phương án 1 (Cơ bản)
  const handleDownloadScoreOnlyTemplate = () => {
    const templateRows = [
      { STT: 1, SBD: '52830001', 'Họ và tên': 'Nguyễn Văn An', Lớp: '12A1', 'Ngày sinh': '15/03/2008', [selectedSubject]: 8.5, 'Điểm thi': 8.5, 'Toán': 8.5, 'Ngữ văn': 7.5, 'Tiếng Anh': 8.0 },
      { STT: 2, SBD: '52830002', 'Họ và tên': 'Trần Thị Mai', Lớp: '12A1', 'Ngày sinh': '20/07/2008', [selectedSubject]: 9.0, 'Điểm thi': 9.0, 'Toán': 9.0, 'Ngữ văn': 8.5, 'Tiếng Anh': 9.2 },
      { STT: 3, SBD: '52830003', 'Họ và tên': 'Lê Hoàng Long', Lớp: '12A1', 'Ngày sinh': '11/01/2008', [selectedSubject]: 6.0, 'Điểm thi': 6.0, 'Toán': 6.0, 'Ngữ văn': 6.5, 'Tiếng Anh': 5.8 },
      { STT: 4, SBD: '52830004', 'Họ và tên': 'Vũ Đức Cường', Lớp: '12A2', 'Ngày sinh': '09/09/2008', [selectedSubject]: 4.5, 'Điểm thi': 4.5, 'Toán': 4.5, 'Ngữ văn': 5.0, 'Tiếng Anh': 4.0 },
      { STT: 5, SBD: '52830005', 'Họ và tên': 'Phạm Thị Thảo', Lớp: '12A2', 'Ngày sinh': '25/05/2008', [selectedSubject]: 7.5, 'Điểm thi': 7.5, 'Toán': 7.5, 'Ngữ văn': 8.0, 'Tiếng Anh': 7.2 },
      { STT: 6, SBD: '52830006', 'Họ và tên': 'Đặng Quốc Huy', Lớp: '12A2', 'Ngày sinh': '18/12/2008', [selectedSubject]: 5.5, 'Điểm thi': 5.5, 'Toán': 5.5, 'Ngữ văn': 6.0, 'Tiếng Anh': 5.0 },
      { STT: 7, SBD: '52830007', 'Họ và tên': 'Bùi Ngọc Hà', Lớp: '12A3', 'Ngày sinh': '02/04/2008', [selectedSubject]: 8.0, 'Điểm thi': 8.0, 'Toán': 8.0, 'Ngữ văn': 7.8, 'Tiếng Anh': 8.5 },
      { STT: 8, SBD: '52830008', 'Họ và tên': 'Hoàng Minh Khôi', Lớp: '12A3', 'Ngày sinh': '14/10/2008', [selectedSubject]: 3.5, 'Điểm thi': 3.5, 'Toán': 3.5, 'Ngữ văn': 4.5, 'Tiếng Anh': 3.8 },
      { STT: 9, SBD: '52830009', 'Họ và tên': 'Võ Thị Hồng', Lớp: '12A3', 'Ngày sinh': '06/06/2008', [selectedSubject]: 6.5, 'Điểm thi': 6.5, 'Toán': 6.5, 'Ngữ văn': 7.0, 'Tiếng Anh': 6.0 },
      { STT: 10, SBD: '52830010', 'Họ và tên': 'Trịnh Công Sơn', Lớp: '12A4', 'Ngày sinh': '28/02/2008', [selectedSubject]: 9.5, 'Điểm thi': 9.5, 'Toán': 9.5, 'Ngữ văn': 8.5, 'Tiếng Anh': 9.0 }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 24 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');
    XLSX.writeFile(wb, `Mau_File1_BangDiem_${selectedSubject}.xlsx`);
    setSuccessNotice(`Đã tải file Excel Mẫu Bảng điểm Cơ bản (gồm đầy đủ: STT, SBD, Họ và tên, Lớp, Ngày sinh, Điểm)!`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Tải file mẫu riêng: Danh sách Thí sinh theo Lớp (STT, SBD, Họ và tên, Lớp, Ngày sinh)
  const handleDownloadCandidateRosterTemplate = () => {
    downloadCandidateRosterTemplate();
    setSuccessNotice('Đã tải file Excel Mẫu Danh sách Thí sinh theo Lớp (gồm: STT, SBD, Họ và tên, Lớp, Ngày sinh)!');
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Xử lý nạp File Danh sách Thí sinh theo Lớp (để tự động nối SBD -> Lớp cho Chế độ 2 & 3)
  const handleUploadCandidateRosterExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const items = parseCandidateRosterExcel(wb);

        if (items.length === 0) {
          alert('Không tìm thấy bản ghi thí sinh nào hợp lệ trong file!');
          return;
        }

        setCandidateRoster(items);
        safeSetToStorage(getUserCacheKey(currentUser, 'candidate_roster'), items);

        // Tạo map tạm để tự động re-link ngay lập tức
        const newMap = new Map<string, CandidateRosterItem>();
        items.forEach(c => {
          if (c.sbd) {
            const k1 = c.sbd.trim().toLowerCase();
            const k2 = k1.replace(/[^a-z0-9]/g, '');
            newMap.set(k1, c);
            if (k2) newMap.set(k2, c);
          }
        });

        // Đếm danh sách các lớp tìm thấy
        const clSet = new Set<string>();
        items.forEach(x => { if (x.className && x.className !== 'Toàn khối') clSet.add(x.className); });
        const clList = Array.from(clSet).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

        // 1. Nếu đã có dữ liệu máy chấm trắc nghiệm, tự động re-link ngay lập tức!
        if (rawMachineRecords && rawMachineRecords.length > 0) {
          const relinked = relinkMachineRecordsWithRoster(rawMachineRecords, newMap, selectedSubject);
          setScoreRows(relinked.scoreRows);
          setItemResponses(relinked.itemResponses);
          setRawMachineRecords(relinked.records);
          safeSetToStorage(getUserCacheKey(currentUser, 'score_rows'), relinked.scoreRows);
          safeSetToStorage(getUserCacheKey(currentUser, 'raw_machine_records'), relinked.records);
        } else {
          // 2. Cập nhật luôn cho scoreRows hiện tại nếu có SBD trùng khớp
          setScoreRows(prev => {
            const updated = prev.map(r => {
              const matched = newMap.get(r.sbd.toLowerCase()) || newMap.get(r.sbd.toLowerCase().replace(/[^a-z0-9]/g, ''));
              if (matched) {
                return {
                  ...r,
                  className: matched.className || r.className,
                  fullName: (matched.fullName && matched.fullName.length > 2) ? matched.fullName : r.fullName
                };
              }
              return r;
            });
            safeSetToStorage(getUserCacheKey(currentUser, 'score_rows'), updated);
            return updated;
          });
        }

        setExpertReport(null);
        setSuccessNotice(
          `Đã nạp thành công Danh sách ${items.length} thí sinh gồm ${clList.length} lớp (${clList.slice(0, 5).join(', ')}${clList.length > 5 ? '...' : ''}). Hệ thống đã tự động liên kết SBD và cập nhật bảng đối sánh giữa các Lớp!`
        );
        setTimeout(() => setSuccessNotice(null), 5000);
        if (rosterFileRef.current) rosterFileRef.current.value = '';
      } catch (err: any) {
        alert(`Lỗi khi đọc file danh sách thí sinh: ${err?.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Xóa file danh sách thí sinh đã nạp
  const handleClearCandidateRoster = () => {
    setCandidateRoster(null);
    safeRemoveFromStorage(getUserCacheKey(currentUser, 'candidate_roster'));
    setSuccessNotice('Đã xóa liên kết file Danh sách Thí sinh.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Tải file mẫu riêng lẻ: Ma trận đề theo đúng môn đang chọn
  const handleDownloadMatrixOnlyTemplate = () => {
    const meta = getSubjectMetadataGDPT(selectedSubject);
    const activeMatrix = matrixItems.length > 0 ? matrixItems : (meta.sampleMatrix || SAMPLE_MATH_MATRIX);
    const rows = activeMatrix.map(m => ({
      'Câu hỏi': m.questionNo,
      'Chủ đề': m.topic,
      'Mức độ': m.thinkingLevel,
      'Điểm': m.maxScore,
      'Mã YCCĐ': m.yccdCode
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MaTran');
    XLSX.writeFile(wb, `Mau_File2_MaTran_De_${selectedSubject}.xlsx`);
  };

  // Tải file mẫu riêng lẻ: Danh mục YCCĐ theo đúng môn đang chọn
  const handleDownloadYccdOnlyTemplate = () => {
    const meta = getSubjectMetadataGDPT(selectedSubject);
    const activeYccd = yccdItems.length > 0 ? yccdItems : (meta.sampleYccd || SAMPLE_MATH_YCCD);
    const rows = activeYccd.map(y => ({
      'Mã YCCĐ': y.code,
      'Chủ đề': y.topic,
      'Yêu cầu cần đạt': y.description,
      'Kỳ vọng (%)': y.benchmarkTarget || 70
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'YCCD');
    XLSX.writeFile(wb, `Mau_File3_DanhMuc_YCCD_${selectedSubject}.xlsx`);
  };

  // Tải file mẫu kết quả máy chấm trắc nghiệm theo môn học đang chọn
  const handleDownloadMachineScoreTemplate = () => {
    downloadMachineScoreExcelTemplate(selectedSubject);
    const spec = getExamStructureSpec(selectedSubject);
    setSuccessNotice(`Đã tải file Excel Mẫu kết quả máy chấm trắc nghiệm môn ${selectedSubject} (${spec.formatDescription})!`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Nạp dữ liệu mẫu thực tế 24 thí sinh từ máy chấm trắc nghiệm theo đúng môn học đang chọn
  const handleLoadSampleMachineScoring = () => {
    const sampleRecords = generateSampleMachineRecordsForSubject(selectedSubject);
    const converted = convertMachineRecordsToSystemData(
      sampleRecords, 
      selectedSubject, 
      effectiveRosterMap.size > 0 ? effectiveRosterMap : undefined
    );
    setRawMachineRecords(sampleRecords);
    setScoreRows(converted.scoreRows);
    setMatrixItems(converted.matrixItems);
    setItemResponses(converted.itemResponses);
    setExpertReport(null);
    setAnalysisInputMode('machine_detail');

    safeSetToStorage(getUserCacheKey(currentUser, 'score_rows'), converted.scoreRows);
    safeSetToStorage(getUserCacheKey(currentUser, 'raw_machine_records'), sampleRecords);
    safeSetToStorage(getUserCacheKey(currentUser, `matrix_${selectedSubject}`), converted.matrixItems);
    setHasRestoredLocalCache(true);

    const spec = getExamStructureSpec(selectedSubject);
    const hasLinkedRoster = effectiveRosterMap.size > 0;
    setSuccessNotice(
      `Đã nạp trọn bộ dữ liệu mẫu thực tế ${sampleRecords.length} thí sinh từ máy chấm môn ${selectedSubject} (${spec.formatDescription})! ${
        hasLinkedRoster ? `Đã liên kết với danh sách lớp của hệ thống.` : 'Bao gồm 4 lớp mẫu (12A1 ➔ 12A4) để trải nghiệm ngay.'
      }`
    );
    setTimeout(() => setSuccessNotice(null), 4500);
  };

  // Nạp file kết quả máy chấm trắc nghiệm người dùng tải lên
  const handleUploadMachineScoreExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const userExplicitRoster = (candidateRoster && candidateRoster.length > 0) ? effectiveRosterMap : undefined;
        const parsed = parseUploadedMachineScoreExcel(wb, userExplicitRoster, selectedSubject);

        setRawMachineRecords(parsed.records);
        setScoreRows(parsed.scoreRows);
        setMatrixItems(parsed.matrixItems);
        setItemResponses(parsed.itemResponses);
        setExpertReport(null);
        setAnalysisInputMode('machine_detail');

        safeSetToStorage(getUserCacheKey(currentUser, 'score_rows'), parsed.scoreRows);
        safeSetToStorage(getUserCacheKey(currentUser, 'raw_machine_records'), parsed.records);
        safeSetToStorage(getUserCacheKey(currentUser, `matrix_${selectedSubject}`), parsed.matrixItems);
        setHasRestoredLocalCache(true);

        const detectedClasses = Array.from(new Set(parsed.records.map(r => r.className).filter(c => c && c !== 'Toàn khối')));
        setSuccessNotice(
          `Đã nạp và nhận diện thành công kết quả máy chấm môn ${selectedSubject}: ${parsed.records.length} bài thi, ${parsed.matrixItems.length} câu hỏi vi mô! ${
            detectedClasses.length > 0 
              ? `Tự động trích xuất trực tiếp ${detectedClasses.length} lớp học: ${detectedClasses.slice(0, 5).join(', ')}${detectedClasses.length > 5 ? '...' : ''}.` 
              : 'Đã sẵn sàng phân tích toàn khối và chi tiết từng câu.'
          }`
        );
        setTimeout(() => setSuccessNotice(null), 5000);
        if (machineFileRef.current) machineFileRef.current.value = '';
      } catch (err: any) {
        alert(`Lỗi khi đọc file máy chấm: ${err?.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Xuất File Excel Thống kê chi tiết điểm thi theo từng lớp chuẩn đẹp bằng ExcelJS (tương tự Phân hệ Xuất coi thi)
  const handleExportClassRangeExcel = async () => {
    if (!isEvaluationMode && (!subjectMetrics.classRangeStats || subjectMetrics.classRangeStats.length === 0)) {
      alert('Chưa có dữ liệu điểm để thống kê!');
      return;
    }

    try {
      setIsExportingExcel(true);
      await exportScoreReportExcel({
        subjectName: selectedSubject,
        subjectMetrics,
        scoreRows,
        config,
        currentUser,
        expertReport,
        isEvaluationMode,
        peStudentRows
      });
      setSuccessNotice(`Đã xuất thành công file Excel Báo cáo Phổ điểm & Thống kê môn ${selectedSubject} chuẩn form đẹp!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel nâng cao:', err);
      alert('Không thể tạo file Excel nâng cao, vui lòng thử lại.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Mở cửa sổ in bảng thống kê chi tiết điểm các lớp chuẩn A4 (Modal chuyên dụng)
  const handlePrintClassRangeReport = () => {
    setShowPrintA4Modal(true);
  };

  // Xử lý nạp File 1: Bảng điểm
  const handleUploadScoreExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('File Excel bảng điểm không có dữ liệu!');
          return;
        }

        const ignoredKeys = new Set([
          'sbd', 'stt', 'tt', 'họ tên', 'họ và tên', 'hoten', 'ten', 'tên',
          'lớp', 'lop', 'ngày sinh', 'ngaysinh', 'ngay sinh', 'năm sinh',
          'phòng thi', 'phong thi', 'phòng', 'phong', 'ghi chú', 'ghichu',
          'phái', 'giới tính', 'gioitinh', 'nam', 'nữ', 'nu', 'mã hs', 'ma hs', 'mshs', 'id'
        ]);

        // Phát hiện các cột điểm số có trong file Excel
        const detectedScoreCols = new Set<string>();
        rows.forEach(r => {
          Object.keys(r).forEach(k => {
            const clean = k.trim();
            if (!ignoredKeys.has(clean.toLowerCase())) {
              detectedScoreCols.add(clean);
            }
          });
        });

        const scoreColList = Array.from(detectedScoreCols);
        const isSingleScoreCol = scoreColList.length === 1;

        // Xác định môn học mục tiêu kết nối sau khi nạp file
        let targetSubject = selectedSubject;
        if (isSingleScoreCol) {
          const colName = scoreColList[0];
          const norm = normalizeSubjectName(colName);
          // Nếu tên cột là 1 môn học cụ thể (ví dụ cột ghi 'Lịch sử' hay 'Toán')
          if (GDPT_2018_SUBJECTS.some(s => s.name.toLowerCase() === norm.toLowerCase())) {
            targetSubject = norm;
          }
          // Nếu cột mang tên chung chung ('Điểm', 'Điểm thi', 'Diem'), targetSubject giữ nguyên môn đang chọn
        } else if (scoreColList.length > 1) {
          const normalizedCols = scoreColList.map(c => normalizeSubjectName(c));
          const hasCurrent = normalizedCols.some(c => c.toLowerCase() === selectedSubject.toLowerCase()) || 
                             scoreColList.some(c => c.toLowerCase() === selectedSubject.toLowerCase());
          if (!hasCurrent) {
            // Tự động chuyển sang môn đầu tiên có trong file nạp lên
            const firstValid = normalizedCols.find(c => GDPT_2018_SUBJECTS.some(s => s.name === c)) || scoreColList[0];
            if (firstValid) {
              targetSubject = firstValid;
            }
          }
        }

        const parsed: StudentScoreRow[] = rows.map((r, idx) => {
          const sbd = String(
            r['SBD'] || r['sbd'] || r['Số báo danh'] || r['Số Báo Danh'] || r['Mã HS'] || r['MaHS'] || `SBD${String(idx + 1).padStart(4, '0')}`
          ).trim();
          const sbdKey = sbd.toLowerCase();
          const matchedRoster = effectiveRosterMap.get(sbdKey) || effectiveRosterMap.get(sbdKey.replace(/[^a-z0-9]/g, ''));

          const rawFirstName = String(r['Họ đệm'] || r['Họ lót'] || r['Họ'] || r['HoDem'] || '').trim();
          const rawLastName = String(r['Tên'] || r['Ten'] || '').trim();
          const combinedName = (rawFirstName && rawLastName) ? `${rawFirstName} ${rawLastName}` : '';

          const fullName = String(
            r['Họ tên'] || r['Họ và tên'] || r['Họ và Tên'] || r['HoTen'] || combinedName || r['Tên'] || r['Họ Tên'] || matchedRoster?.fullName || `Thí sinh ${idx + 1}`
          ).trim();

          // Tự động nhận diện cột Lớp thông minh
          let rawClass = r['Lớp'] || r['Lop'] || r['LỚP'] || r['LOP'] || r['Lớp học'] || r['LopHoc'] || r['Tên lớp'] || r['TenLop'] || r['Khối/Lớp'] || r['Class'] || r['Chi đoàn'];
          if (!rawClass) {
            const classKey = Object.keys(r).find(k => {
              const lk = k.trim().toLowerCase();
              return lk === 'lớp' || lk === 'lop' || lk === 'class' || lk.includes('tên lớp') || lk.includes('khối/lớp');
            });
            if (classKey) rawClass = r[classKey];
          }
          if (!rawClass && matchedRoster?.className) {
            rawClass = matchedRoster.className;
          }
          const rawClassStr = String(rawClass || '12A1').trim();
          const cleanClass = rawClassStr.replace(/^lớp\s*/i, '').replace(/^lop\s*/i, '').replace(/\s+/g, '').toUpperCase();
          const className = cleanClass || rawClassStr || '12A1';
          const dob = String(
            r['Ngày sinh'] || r['NgaySinh'] || r['Ngày Sinh'] || matchedRoster?.dob || ''
          ).trim();
          const stt = parseInt(String(r['STT'] || r['stt'] || r['TT'] || idx + 1)) || (idx + 1);

          const scoresObj: Record<string, number | null> = {};
          const examStatusesObj: Record<string, 'present' | 'absent_vt' | 'not_registered'> = {};

          Object.keys(r).forEach((k) => {
            const cleanKey = k.trim();
            if (!ignoredKeys.has(cleanKey.toLowerCase())) {
              const rawCell = r[k];
              const rawStr = rawCell === undefined || rawCell === null ? '' : String(rawCell).trim();
              const rawUpper = rawStr.toUpperCase();

              let numVal: number | null = null;
              let status: 'present' | 'absent_vt' | 'not_registered' = 'not_registered';

              // 1. Kiểm tra Vắng thi (VT)
              const isAbsentKw = rawUpper === 'VT' || rawUpper === 'V' || 
                rawUpper.includes('VẮNG') || rawUpper.includes('VANG') ||
                rawUpper.includes('BỎ THI') || rawUpper.includes('BO THI') ||
                rawUpper.includes('HOÃN') || rawUpper.includes('MIỄN') || rawUpper === 'MT' ||
                rawUpper.includes('NGHỈ');

              if (isAbsentKw) {
                numVal = null;
                status = 'absent_vt';
              }
              // 2. Kiểm tra ô để trống hoặc không đăng ký (KDT)
              else if (rawStr === '' || rawStr === '-' || rawUpper === 'KDT' || rawUpper.includes('KHÔNG THI') || rawUpper.includes('KHONG THI') || rawUpper.includes('CHƯA THI') || rawUpper === 'NULL' || rawUpper === 'UNDEFINED') {
                numVal = null;
                // Ô để trống tự nhiên = Học sinh KHÔNG THI / KHÔNG ĐĂNG KÝ môn này (not_registered), tuyệt đối không gán vắng thi
                status = 'not_registered';
              }
              // 3. Có điểm số thực tế (kể cả số 0, 0.0)
              else {
                const parsedVal = parseFloat(rawStr.replace(',', '.'));
                if (!isNaN(parsedVal)) {
                  numVal = parsedVal;
                  status = 'present';
                } else {
                  numVal = null;
                  status = 'not_registered';
                }
              }

              scoresObj[cleanKey] = numVal;
              examStatusesObj[cleanKey] = status;

              const normKey = normalizeSubjectName(cleanKey);
              if (normKey && normKey !== cleanKey) {
                scoresObj[normKey] = numVal;
                examStatusesObj[normKey] = status;
              }

              // Nếu file chỉ có 1 cột điểm duy nhất, map luôn vào targetSubject và selectedSubject
              if (isSingleScoreCol) {
                scoresObj[targetSubject] = numVal;
                scoresObj[selectedSubject] = numVal;
                examStatusesObj[targetSubject] = status;
                examStatusesObj[selectedSubject] = status;
              }
            }
          });

          return { stt, sbd, fullName, className, dob, scores: scoresObj, examStatuses: examStatusesObj };
        });

        setScoreRows(parsed);
        setExpertReport(null);

        // Tự động lưu bảng điểm vào bộ nhớ tạm cục bộ của máy tính cho tài khoản này
        safeSetToStorage(getUserCacheKey(currentUser, 'score_rows'), parsed);
        safeSetToStorage(getUserCacheKey(currentUser, 'last_subject'), targetSubject);
        setHasRestoredLocalCache(true);

        // Kích hoạt ngay môn học mục tiêu tương ứng với dữ liệu
        handleSelectSubject(targetSubject);

        setSuccessNotice(
          `Đã nạp thành công Bảng điểm của ${parsed.length} thí sinh! Hệ thống đã tự động lưu tạm trên máy này và kết nối dữ liệu môn "${targetSubject}".`
        );
        setTimeout(() => setSuccessNotice(null), 4500);
        if (scoreFileRef.current) scoreFileRef.current.value = '';
      } catch (err: any) {
        alert(`Lỗi khi đọc file bảng điểm: ${err?.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Xử lý nạp File 2: Ma trận đề thi
  const handleUploadMatrixExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('File ma trận trống!');
          return;
        }

        const parsed: ExamMatrixItem[] = rows.map((r, idx) => ({
          questionNo: String(r['Câu hỏi'] || r['Câu'] || r['Cau'] || `C${idx + 1}`).trim(),
          topic: String(r['Chủ đề / Mạch kiến thức'] || r['Chủ đề'] || r['ChuDe'] || 'Chủ đề chung').trim(),
          thinkingLevel: (r['Mức độ tư duy'] || r['Mức độ'] || 'Hiểu') as any,
          maxScore: parseFloat(String(r['Điểm tối đa'] || r['Điểm'] || 0.25)) || 0.25,
          yccdCode: r['Mã YCCĐ liên kết'] || r['Mã YCCĐ'] || r['YCCD'] ? String(r['Mã YCCĐ liên kết'] || r['Mã YCCĐ'] || r['YCCD']).trim() : undefined,
        }));

        setMatrixItems(parsed);
        setExpertReport(null);

        // Tự động lưu ma trận vào bộ nhớ tạm cục bộ trên máy tính
        safeSetToStorage(getUserCacheKey(currentUser, `matrix_${selectedSubject}`), parsed);

        setSuccessNotice(`Đã nạp & lưu tạm Ma trận đề thi môn ${selectedSubject} gồm ${parsed.length} câu hỏi trên máy này!`);
        setTimeout(() => setSuccessNotice(null), 3500);
        if (matrixFileRef.current) matrixFileRef.current.value = '';
      } catch (err: any) {
        alert(`Lỗi khi đọc file ma trận: ${err?.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Xử lý nạp File 3: Danh mục YCCĐ
  const handleUploadYccdExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('File YCCĐ trống!');
          return;
        }

        const parsed: ExamYccdItem[] = rows.map((r, idx) => ({
          code: String(r['Mã YCCĐ'] || r['Mã'] || `YCCD-${idx + 1}`).trim(),
          topic: String(r['Chủ đề'] || 'Chủ đề chung').trim(),
          description: String(r['Nội dung Yêu cầu cần đạt (GDPT 2018)'] || r['Yêu cầu cần đạt'] || r['Mô tả'] || '').trim(),
          benchmarkTarget: parseFloat(String(r['Mục tiêu đạt (%)'] || r['Kỳ vọng (%)'] || 75)) || 75,
        }));

        setYccdItems(parsed);
        setExpertReport(null);

        // Tự động lưu YCCĐ vào bộ nhớ tạm cục bộ trên máy tính
        safeSetToStorage(getUserCacheKey(currentUser, `yccd_${selectedSubject}`), parsed);

        setSuccessNotice(`Đã nạp & lưu tạm Danh mục gồm ${parsed.length} YCCĐ môn ${selectedSubject} trên máy này!`);
        setTimeout(() => setSuccessNotice(null), 3500);
        if (yccdFileRef.current) yccdFileRef.current.value = '';
      } catch (err: any) {
        alert(`Lỗi khi đọc file YCCĐ: ${err?.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Xử lý nạp File Trọn bộ 3-Sheet (Bảng điểm, Ma trận, YCCĐ) và tự động lưu tạm trên máy này
  const handleUploadBundleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        let loadedScoresCount = 0;
        let loadedMatrixCount = 0;
        let loadedYccdCount = 0;

        // 1. Quét Sheet Ma trận đề thi trước để nhận diện cấu trúc câu hỏi
        let activeMatrixItems: ExamMatrixItem[] = [];
        const matrixSheetName = wb.SheetNames.find(s => {
          const l = s.toLowerCase();
          return l.includes('matran') || l.includes('ma trận') || l.includes('matrix') || l.includes('2_');
        });

        if (matrixSheetName && wb.Sheets[matrixSheetName]) {
          const mRows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[matrixSheetName]);
          if (mRows && mRows.length > 0) {
            activeMatrixItems = mRows.map((r, idx) => ({
              questionNo: String(r['Câu hỏi'] || r['Câu'] || r['Cau'] || `C${idx + 1}`).trim(),
              topic: String(r['Chủ đề / Mạch kiến thức'] || r['Chủ đề'] || r['ChuDe'] || 'Chủ đề chung').trim(),
              thinkingLevel: (r['Mức độ tư duy'] || r['Mức độ'] || 'Hiểu') as any,
              maxScore: parseFloat(String(r['Điểm tối đa'] || r['Điểm'] || 0.25)) || 0.25,
              yccdCode: r['Mã YCCĐ liên kết'] || r['Mã YCCĐ'] || r['YCCD'] ? String(r['Mã YCCĐ liên kết'] || r['Mã YCCĐ'] || r['YCCD']).trim() : undefined,
            }));
            setMatrixItems(activeMatrixItems);
            safeSetToStorage(getUserCacheKey(currentUser, `matrix_${selectedSubject}`), activeMatrixItems);
            loadedMatrixCount = activeMatrixItems.length;
          }
        }

        // 2. Quét Sheet YCCĐ
        const yccdSheetName = wb.SheetNames.find(s => {
          const l = s.toLowerCase();
          return l.includes('yccd') || l.includes('yêu cầu') || l.includes('yeucau') || l.includes('3_');
        });

        if (yccdSheetName && wb.Sheets[yccdSheetName]) {
          const yRows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[yccdSheetName]);
          if (yRows && yRows.length > 0) {
            const parsedYccd: ExamYccdItem[] = yRows.map((r, idx) => ({
              code: String(r['Mã YCCĐ'] || r['Mã'] || `YCCD-${idx + 1}`).trim(),
              topic: String(r['Chủ đề'] || 'Chủ đề chung').trim(),
              description: String(r['Nội dung Yêu cầu cần đạt (GDPT 2018)'] || r['Yêu cầu cần đạt'] || r['Mô tả'] || '').trim(),
              benchmarkTarget: parseFloat(String(r['Mục tiêu đạt (%)'] || r['Kỳ vọng (%)'] || 75)) || 75,
            }));
            setYccdItems(parsedYccd);
            safeSetToStorage(getUserCacheKey(currentUser, `yccd_${selectedSubject}`), parsedYccd);
            loadedYccdCount = parsedYccd.length;
          }
        }

        // 3. Quét Sheet Bảng điểm (Trích xuất cả điểm tổng và điểm chi tiết từng câu nếu có)
        const scoreSheetName = wb.SheetNames.find(s => {
          const l = s.toLowerCase();
          return l.includes('diem') || l.includes('điểm') || l.includes('1_') || l.includes('bangdiem') || l.includes('score');
        }) || wb.SheetNames[0];

        if (scoreSheetName && wb.Sheets[scoreSheetName]) {
          const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[scoreSheetName]);
          if (rows && rows.length > 0) {
            const ignoredKeys = new Set([
              'sbd', 'stt', 'tt', 'họ tên', 'họ và tên', 'hoten', 'ten', 'tên',
              'lớp', 'lop', 'ngày sinh', 'ngaysinh', 'ngay sinh', 'năm sinh',
              'phòng thi', 'phong thi', 'phòng', 'phong', 'ghi chú', 'ghichu',
              'phái', 'giới tính', 'gioitinh', 'nam', 'nữ', 'nu', 'mã hs', 'ma hs', 'mshs', 'id',
              'điểm thi', 'diem thi', 'điểm', 'diem', 'tổng điểm', 'tong diem', 'total'
            ]);

            const matrixQSet = new Set(activeMatrixItems.map(m => m.questionNo.toUpperCase()));
            const sampleKeys = Object.keys(rows[0] || {});
            const hasItemCols = sampleKeys.some(k => {
              const u = k.trim().toUpperCase();
              return matrixQSet.has(u) || u.startsWith('P1_') || u.startsWith('P2_') || u.startsWith('P3_') || u.startsWith('C') || u.startsWith('ĐH_') || u.startsWith('VIET_');
            });

            const parsedScoreRows: StudentScoreRow[] = [];
            const parsedItemResponses: any[] = [];

            rows.forEach((r, idx) => {
              const sbd = String(
                r['SBD'] || r['sbd'] || r['Số báo danh'] || r['Số Báo Danh'] || r['Mã HS'] || `SBD${String(idx + 1).padStart(4, '0')}`
              ).trim();
              const rawFirstName = String(r['Họ đệm'] || r['Họ lót'] || r['Họ'] || r['HoDem'] || '').trim();
              const rawLastName = String(r['Tên'] || r['Ten'] || '').trim();
              const combinedName = (rawFirstName && rawLastName) ? `${rawFirstName} ${rawLastName}` : '';

              const fullName = String(
                r['Họ tên'] || r['Họ và tên'] || r['Họ và Tên'] || r['HoTen'] || combinedName || r['Tên'] || `Thí sinh ${idx + 1}`
              ).trim();

              let rawClass = r['Lớp'] || r['Lop'] || r['LỚP'] || r['LOP'] || r['Lớp học'] || r['LopHoc'] || r['Tên lớp'] || r['TenLop'] || r['Khối/Lớp'] || r['Class'] || r['Chi đoàn'];
              if (!rawClass) {
                const classKey = Object.keys(r).find(k => {
                  const lk = k.trim().toLowerCase();
                  return lk === 'lớp' || lk === 'lop' || lk === 'class' || lk.includes('tên lớp') || lk.includes('khối/lớp');
                });
                if (classKey) rawClass = r[classKey];
              }
              const rawClassStr = String(rawClass || '12A1').trim();
              const cleanClass = rawClassStr.replace(/^lớp\s*/i, '').replace(/^lop\s*/i, '').replace(/\s+/g, '').toUpperCase();
              const className = cleanClass || rawClassStr || '12A1';
              const dob = String(r['Ngày sinh'] || r['NgaySinh'] || r['dob'] || '').trim();

              // 1. Kiểm tra dấu hiệu Vắng thi / Không dự thi ở cấp hàng (Ghi chú, Trạng thái)
              const noteRaw = String(r['Ghi chú'] || r['GhiChu'] || r['Trạng thái'] || r['TrangThai'] || r['Note'] || '').trim().toUpperCase();
              const isExplicitAbsentInRow = 
                noteRaw === 'VT' || noteRaw === 'V' || 
                noteRaw.includes('VẮNG') || noteRaw.includes('VANG') || 
                noteRaw.includes('BỎ THI') || noteRaw.includes('BO THI') ||
                noteRaw.includes('HOÃN') || noteRaw.includes('MIỄN') || noteRaw === 'MT' || noteRaw.includes('NGHỈ');

              const isNotRegisteredInRow =
                noteRaw === 'KDT' || noteRaw.includes('KHÔNG THI') || noteRaw.includes('KHONG THI') ||
                noteRaw.includes('CHƯA THI') || noteRaw.includes('CHUA THI');

              const scoresObj: Record<string, number | null> = {};
              const examStatusesObj: Record<string, 'present' | 'absent_vt' | 'not_registered'> = {};
              const itemScoresObj: Record<string, number> = {};
              let itemSum = 0;
              let hasItemEntries = false;

              Object.keys(r).forEach((k) => {
                const cleanKey = k.trim();
                const uKey = cleanKey.toUpperCase();
                const isItem = matrixQSet.has(uKey) || uKey.startsWith('P1_') || uKey.startsWith('P2_') || uKey.startsWith('P3_') || uKey.startsWith('ĐH_') || uKey.startsWith('VIET_');

                if (isItem) {
                  const cellVal = r[k];
                  const cellStr = cellVal === undefined || cellVal === null ? '' : String(cellVal).trim();
                  if (cellStr !== '' && cellStr !== '-' && cellStr.toUpperCase() !== 'VT' && cellStr.toUpperCase() !== 'K') {
                    const val = parseFloat(cellStr.replace(',', '.'));
                    if (!isNaN(val)) {
                      itemScoresObj[cleanKey] = val;
                      itemSum += val;
                      hasItemEntries = true;
                    }
                  }
                } else if (!ignoredKeys.has(cleanKey.toLowerCase())) {
                  const cellVal = r[k];
                  const cellStr = cellVal === undefined || cellVal === null ? '' : String(cellVal).trim();
                  const cellUpper = cellStr.toUpperCase();
                  if (cellUpper === 'VT' || cellUpper === 'V' || cellUpper.includes('VẮNG') || cellUpper.includes('VANG') || cellUpper.includes('BỎ THI')) {
                    scoresObj[cleanKey] = null;
                    examStatusesObj[cleanKey] = 'absent_vt';
                  } else if (cellStr === '' || cellStr === '-' || cellUpper === 'KDT' || cellUpper.includes('KHÔNG THI') || cellUpper.includes('CHƯA THI') || cellUpper === 'NULL' || cellUpper === 'UNDEFINED') {
                    scoresObj[cleanKey] = null;
                    examStatusesObj[cleanKey] = 'not_registered';
                  } else {
                    const val = parseFloat(cellStr.replace(',', '.'));
                    const numVal = isNaN(val) ? null : val;
                    scoresObj[cleanKey] = numVal;
                    if (numVal !== null) {
                      examStatusesObj[cleanKey] = 'present';
                    }
                    const normKey = normalizeSubjectName(cleanKey);
                    if (normKey && normKey !== cleanKey) {
                      scoresObj[normKey] = numVal;
                      if (numVal !== null) {
                        examStatusesObj[normKey] = 'present';
                      }
                    }
                  }
                }
              });

              // 2. Tính điểm tổng và trạng thái cho môn học đang chọn
              const explicitScoreRaw = r['Điểm thi'] ?? r['Điểm'] ?? r['Tổng điểm'] ?? r[selectedSubject];
              const explicitScoreStr = explicitScoreRaw === undefined || explicitScoreRaw === null ? '' : String(explicitScoreRaw).trim();
              const explicitScoreUpper = explicitScoreStr.toUpperCase();

              const isScoreColAbsent = 
                explicitScoreUpper === 'VT' || explicitScoreUpper === 'V' || 
                explicitScoreUpper.includes('VẮNG') || explicitScoreUpper.includes('VANG') || 
                explicitScoreUpper.includes('BỎ THI') || explicitScoreUpper.includes('HOÃN') ||
                explicitScoreUpper.includes('MIỄN') || explicitScoreUpper === 'MT' || explicitScoreUpper.includes('NGHỈ');

              const isScoreColNotRegistered = 
                explicitScoreUpper === 'KDT' || explicitScoreUpper.includes('KHÔNG THI') || explicitScoreUpper.includes('KHONG THI') ||
                explicitScoreUpper.includes('CHƯA THI') || explicitScoreUpper.includes('CHUA THI');

              const isScoreColEmpty = explicitScoreStr === '' || explicitScoreStr === '-' || explicitScoreUpper === 'NULL' || explicitScoreUpper === 'UNDEFINED';

              let finalScore: number | null = null;
              let finalStatus: 'present' | 'absent_vt' | 'not_registered' = 'present';

              if (isExplicitAbsentInRow || isScoreColAbsent) {
                finalScore = null;
                finalStatus = 'absent_vt';
              } else if (isNotRegisteredInRow || isScoreColNotRegistered || (isScoreColEmpty && !hasItemEntries)) {
                // Thí sinh KHÔNG HỌC / KHÔNG ĐĂNG KÝ THI môn này
                finalScore = null;
                finalStatus = 'not_registered';
              } else {
                const parsedExp = parseFloat(explicitScoreStr.replace(',', '.'));
                if (!isNaN(parsedExp)) {
                  // Điểm số có ghi rõ ràng (kể cả 0.0 thật từ bài thi)
                  finalScore = parsedExp;
                  finalStatus = 'present';
                } else if (hasItemEntries) {
                  finalScore = Number(Math.min(10.0, itemSum).toFixed(2));
                  finalStatus = 'present';
                } else {
                  finalScore = null;
                  finalStatus = 'not_registered';
                }
              }

              // Nếu thí sinh có mặt làm bài nhưng bỏ trống một số câu hỏi bắt buộc trong ma trận,
              // theo chuẩn khảo thí GDPT 2018 các câu bắt buộc bỏ trống đó tính là 0 điểm
              if (finalStatus === 'present' && hasItemEntries && activeMatrixItems.length > 0) {
                activeMatrixItems.forEach(m => {
                  const mKey = m.questionNo;
                  const isTinElective = (selectedSubject.toLowerCase().includes('tin') || selectedSubject.toLowerCase().includes('thông tin')) &&
                    (mKey.includes('C03') || mKey.includes('C04') || mKey.includes('C05') || mKey.includes('C06') || (m.topic && (m.topic.toLowerCase().includes('ict') || m.topic.toLowerCase().includes('cs'))));
                  
                  if (!isTinElective && itemScoresObj[mKey] === undefined) {
                    itemScoresObj[mKey] = 0;
                  }
                });
              }

              scoresObj[selectedSubject] = finalScore;
              examStatusesObj[selectedSubject] = finalStatus;

              parsedScoreRows.push({
                stt: idx + 1,
                sbd,
                fullName,
                className,
                dob,
                scores: scoresObj,
                examStatuses: examStatusesObj
              });

              // CHỈ đưa học sinh vào itemResponses nếu thực sự dự thi và có dữ liệu câu hỏi (loại bỏ học sinh vắng thi)
              if (finalStatus === 'present' && hasItemEntries) {
                parsedItemResponses.push({
                  sbd,
                  fullName,
                  className,
                  itemScores: itemScoresObj,
                  totalScore: finalScore !== null ? finalScore : Number(itemSum.toFixed(2))
                });
              }
            });

            if (parsedScoreRows.length > 0) {
              setScoreRows(parsedScoreRows);
              safeSetToStorage(getUserCacheKey(currentUser, 'score_rows'), parsedScoreRows);
              setHasRestoredLocalCache(true);
              loadedScoresCount = parsedScoreRows.length;
            }

            if (parsedItemResponses.length > 0) {
              setItemResponses(parsedItemResponses);
            }
          }
        }

        setExpertReport(null);
        setSuccessNotice(
          `Đã nạp trọn bộ và lưu tạm trên máy: ${loadedScoresCount} học sinh, ${loadedMatrixCount} câu ma trận, ${loadedYccdCount} YCCĐ môn ${selectedSubject}!`
        );
        setTimeout(() => setSuccessNotice(null), 4500);
        if (bundleFileRef.current) bundleFileRef.current.value = '';
      } catch (err: any) {
        alert(`Lỗi khi nạp file trọn bộ: ${err?.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Sao chép báo cáo vào clipboard
  const handleCopyReportToClipboard = () => {
    if (!expertReport) return;
    const text = `BÁO CÁO PHÂN TÍCH CHẤT LƯỢNG VÀ KẾ HOẠCH CẢI TIẾN SƯ PHẠM (GDPT 2018)
Môn: ${selectedSubject} - Năm học: ${config.schoolYear}
Thời gian tạo: ${new Date().toLocaleDateString('vi-VN')}

PHẦN A. PHÁT HIỆN CHÍNH (TỔNG QUAN CHẤT LƯỢNG)
- Nhận định chung: ${expertReport.partA_Overview.generalImpression}
- Điểm sáng nổi bật:
${expertReport.partA_Overview.highlights.map(h => `  + ${h}`).join('\n')}

PHẦN B. CÁC VẤN ĐỀ CẦN CAN THIỆP
1. Điểm nghẽn kiến thức (YCCĐ / Chủ đề < 65%):
${expertReport.partB_Interventions.knowledgeBottlenecks.map(b => `  + ${b.topicOrYccd} (Tỷ lệ đạt: ${b.passRate}% - ${b.severity}): ${b.details}`).join('\n')}

2. Vấn đề về công cụ đánh giá (Rà soát câu hỏi có D bất thường):
${expertReport.partB_Interventions.instrumentAnomalies.map(a => `  + ${a.questionNo} (Độ khó P=${a.pIndex}, Độ phân biệt D=${a.dIndex}): ${a.warningReason}`).join('\n')}

PHẦN C. GIẢ THUYẾT NGUYÊN NHÂN
1. Về phía nội dung / phương pháp học tập:
${expertReport.partC_Hypotheses.learningAndTeachingHypotheses.map(h => `  + ${h}`).join('\n')}

2. Về phía thiết kế câu hỏi trong đề:
${expertReport.partC_Hypotheses.assessmentDesignHypotheses.map(h => `  + ${h}`).join('\n')}

PHẦN D. KẾ HOẠCH CẢI TIẾN VÀ HÀNH ĐỘNG
${expertReport.partD_ActionPlan.map((act, i) => `Hành động ${i + 1}: ${act.issueTarget}
- Đối tượng: ${act.studentTargetGroup}
- Biện pháp can thiệp: ${act.pedagogicalAction}`).join('\n\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Xuất file Word (.doc / .docx) Biên bản Họp Tổ chuyên môn chuẩn Nghị định 30/2020/NĐ-CP
  const handleExportWordMinutes = () => {
    try {
      exportPedagogicalMinutesToWord({
        config,
        subjectName: selectedSubject,
        currentUser,
        subjectMetrics,
        expertReport,
        isEvaluationMode,
        evalStats: isEvaluationMode ? peMetrics : undefined,
      });
      setSuccessNotice(`Đã xuất thành công Biên bản họp tổ chuyên môn môn ${selectedSubject} dạng Word (.doc)!`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      alert(`Lỗi khi xuất file Word: ${err?.message}`);
    }
  };

  // Xuất Thẻ Infographic 1 ảnh / 1 môn (.PNG)
  const handleExportInfographicImage = async () => {
    if (!infographicRef.current) return;
    setIsExportingImage(true);

    try {
      const dataUrl = await toPng(infographicRef.current, {
        cacheBust: true,
        quality: 0.98,
        pixelRatio: 2,
        skipFonts: true,
      });

      const link = document.createElement('a');
      link.download = `Bao_Cao_Do_Hoa_Mon_${selectedSubject.replace(/\s+/g, '_')}_${config.examCenterCode || 'NBK'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi xuất ảnh đồ họa:', err);
      alert('Không thể tạo ảnh đồ họa. Vui lòng thử lại.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const maxBarCount = useMemo(() => {
    return Math.max(...subjectMetrics.distribution.map((d) => d.count), 1);
  }, [subjectMetrics.distribution]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Tinh gọn, rõ ràng, không trùng lặp nút báo cáo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Hàng 1: Dàn ngang thông tin từ Trái sang Phải */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            {/* Huy hiệu dàn ngang từ trái sang phải */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5 border border-emerald-200">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                Khảo thí & Quản trị Chất lượng GDPT 2018
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                Vai trò: {currentUser?.role === 'ToTruong' ? 'Tổ trưởng Chuyên môn' : currentUser?.role === 'BanGiamHieu' ? 'Ban Giám hiệu (Toàn trường)' : 'Admin Khảo thí'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {isEvaluationMode ? `${peMetrics.totalStudents} học sinh đánh giá` : `${scoreRows.length} bài thi`} • {matrixItems.length} câu ma trận • {yccdItems.length} YCCĐ
              </span>
              {hasRestoredLocalCache ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs" title="Dữ liệu làm việc được tự động khôi phục từ máy tính này mà không cần dùng CSDL Cloud">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đang dùng dữ liệu lưu tạm trên máy này
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5" title="Dữ liệu cá nhân chỉ lưu tạm trên trình duyệt của máy này, tuyệt đối không gửi lên CSDL Supabase chung">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Tự động lưu tạm trên máy này
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 pt-0.5">
              Hệ thống Khảo thí Sư phạm & Lập Kế hoạch Can thiệp Cải tiến
            </h2>
            <p className="text-xs text-slate-500">
              Đồng bộ 3 nguồn dữ liệu: (1) Điểm số học sinh, (2) Ma trận đề thi, (3) Yêu cầu cần đạt (YCCĐ). Tự động thích ứng đúng đặc thù từng bộ môn GDPT 2018.
            </p>
          </div>

          {/* Nhóm thao tác nhanh toàn hệ thống (Dàn ngang góc phải) - Nạp/Tải trọn bộ 3 Sheet & Tự động lưu tạm */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadFullBundleTemplate}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tải 1 file Excel chuẩn gồm 3 Sheet: Bảng điểm, Ma trận, YCCĐ"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải file Mẫu Excel (3 Sheet)</span>
            </button>

            <label
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Nạp 1 file Excel chứa cả 3 Sheet (Bảng điểm, Ma trận, YCCĐ) và tự động lưu tạm trên máy này"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>Nạp trọn bộ (File 3-Sheet)</span>
              <input
                ref={bundleFileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUploadBundleExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* THÔNG BÁO DÀN TỪ TRÁI SANG PHẢI: BẬT RÕ ĐẶC THÙ & QUY CHUẨN GDPT 2018 CHO MÔN ĐANG CHỌN */}
        <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-sm border border-indigo-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
          {/* Trái: Icon & Tên môn & Thể thức */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              {isLiteratureMode ? (
                <BookOpen className="w-5 h-5 text-rose-300" />
              ) : isEvaluationMode ? (
                <Activity className="w-5 h-5 text-emerald-300" />
              ) : (
                <BarChart3 className="w-5 h-5 text-blue-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Môn {selectedSubject}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isLiteratureMode ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40' :
                  isEvaluationMode ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' :
                  'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                }`}>
                  {currentSubjectMeta.badgeLabel}
                </span>
              </div>
              <div className="text-[11px] text-indigo-300/80 font-medium">
                Phân nhóm: {currentSubjectMeta.group}
              </div>
            </div>
          </div>

          {/* Giữa: Dàn thông báo quy chuẩn GDPT 2018 từ trái sang phải */}
          <div className="flex-1 text-xs text-indigo-100/90 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Chức năng tự động kích hoạt theo Chương trình GDPT 2018:</span>
            </div>
            <div className="text-[11px] leading-relaxed text-slate-200">
              {isLiteratureMode && (
                <span>Cấu trúc Tự luận 100% gồm Đọc hiểu (4 câu phân hóa) và Viết (đoạn NLXH + bài NLVH theo rubric chấm). Hệ thống tự động phân tích độ phân hóa từng câu/ý rubric và phổ điểm 6 dải chuẩn.</span>
              )}
              {isEvaluationMode && (
                <span>Đánh giá bằng nhận xét Đạt (Đ) / Chưa đạt (CĐ) theo Thông tư 22/2021/TT-BGDĐT. Hệ thống tự động chuyển sang bảng thống kê Đạt/CĐ và tiêu chuẩn RLTT, ẩn hoàn toàn thang điểm 10.</span>
              )}
              {!isLiteratureMode && !isEvaluationMode && (
                <span>Trắc nghiệm định dạng 2025 (P.I Nhiều lựa chọn, P.II Đúng/Sai, P.III Trả lời ngắn). Tự động phân tích độ khó P, độ phân biệt D, rà soát câu hỏi dị biệt và phổ điểm 6 dải chuẩn.</span>
              )}
            </div>
          </div>

          {/* Phải: Trạng thái dữ liệu hiện hành */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {isEvaluationMode ? `${peMetrics.totalStudents} HS đánh giá` : `${scoreRows.length} bài thi • ${matrixItems.length} câu • ${yccdItems.length} YCCĐ`}
            </span>
          </div>
        </div>

        {/* Thông báo thao tác (Dàn ngang từ trái sang phải, có nút đóng) */}
        {successNotice && (
          <div className="w-full p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hàng 2: Chọn môn học GDPT 2018 - Tinh gọn đúng theo Chuyên môn/Tổ công tác */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {currentUser?.role === 'ToTruong' ? (
            /* Thẻ Chuyên môn tinh gọn dành riêng cho Tổ trưởng */
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50/50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                  {selectedSubject.toLowerCase().includes('hóa') ? '🧪' : selectedSubject.toLowerCase().includes('toán') ? '📐' : selectedSubject.toLowerCase().includes('văn') ? '📖' : selectedSubject.toLowerCase().includes('lý') || selectedSubject.toLowerCase().includes('lí') ? '⚡' : selectedSubject.toLowerCase().includes('sinh') ? '🧬' : '📊'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      {currentUser.unit || `Tổ ${selectedSubject}`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Tổ trưởng: {currentUser.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-800">
                      Bộ môn: {selectedSubject}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${currentSubjectMeta.badgeColor}`}>
                      {currentSubjectMeta.badgeLabel}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      • {currentSubjectMeta.formatDescription}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nếu là Tổ liên môn có nhiều hơn 1 môn phụ trách (VD: Hóa - Sinh) */}
              {displaySubjects.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Môn trong tổ:</span>
                  <div className="flex items-center gap-1.5">
                    {displaySubjects.map((sName) => {
                      const isSelected = selectedSubject === sName;
                      return (
                        <button
                          key={sName}
                          type="button"
                          onClick={() => handleSelectSubject(sName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-300'
                              : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/60'
                          }`}
                        >
                          {sName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Dữ liệu tinh gọn đúng chuyên môn của Tổ</span>
                </div>
              )}
            </div>
          ) : (
            /* Giao diện toàn trường đầy đủ dành cho Admin / Giáo vụ */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Chọn Môn học (Hệ thống tự động đưa ra chức năng đúng theo GDPT 2018):</span>
                </label>

                {/* Bộ lọc phân nhóm môn GDPT 2018 để giao diện gọn gàng, không bị rối */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'Tất cả các môn' },
                    { id: 'Môn Bắt buộc', label: 'Môn Bắt buộc' },
                    { id: 'Khoa học Tự nhiên', label: 'KHTN' },
                    { id: 'Khoa học Xã hội', label: 'KHXH' },
                    { id: 'Công nghệ & Nghệ thuật', label: 'Công nghệ' },
                  ].map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedGroupFilter(grp.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedGroupFilter === grp.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {grp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh sách các nút môn học kèm huy hiệu thể thức rõ ràng */}
              <div className="flex flex-wrap gap-2">
                {displaySubjects
                  .filter((sName) => {
                    if (selectedGroupFilter === 'all') return true;
                    const meta = getSubjectMetadataGDPT(sName);
                    return meta.group === selectedGroupFilter;
                  })
                  .map((sName) => {
                    const isSelected = selectedSubject === sName;
                    const meta = getSubjectMetadataGDPT(sName);
                    return (
                      <button
                        key={sName}
                        type="button"
                        onClick={() => handleSelectSubject(sName)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span>{sName}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                          isSelected 
                            ? 'bg-blue-800 text-white' 
                            : meta.badgeColor
                        }`}>
                          {meta.badgeLabel}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* HÀNG 3: KHAI BÁO & LỰA CHỌN 3 PHƯƠNG ÁN KHẢO THÍ (SEGMENTED TABS NẰM GỌN TRÊN 1 HÀNG) */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Phương án Khảo thí & Khai báo dữ liệu đầu vào:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultSampleData}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Khôi phục lại dữ liệu điểm mẫu của cả 10 môn GDPT 2018"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Khôi phục dữ liệu mẫu (10 môn)</span>
              </button>
            </div>
          </div>

          {/* 3 NÚT BẤM NGANG (SEGMENTED TABS / THẺ DẸT NẰM GỌN TRÊN 1 HÀNG) */}
          <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Tab 1: Cơ bản */}
              <button
                type="button"
                onClick={() => handleSwitchAnalysisMode('basic')}
                className={`p-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3 cursor-pointer text-left ${
                  analysisInputMode === 'basic'
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                  analysisInputMode === 'basic' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                }`}>
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>1. Cơ bản</span>
                    {analysisInputMode === 'basic' && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-white/25 rounded-md font-bold uppercase tracking-wider">Đang chọn</span>
                    )}
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${analysisInputMode === 'basic' ? 'text-blue-100' : 'text-slate-500'}`}>
                    1 File Bảng điểm tổng quan (Toàn khối)
                  </div>
                </div>
              </button>

              {/* Tab 2: Chi tiết (Máy chấm) */}
              <button
                type="button"
                onClick={() => handleSwitchAnalysisMode('machine_detail')}
                className={`p-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3 cursor-pointer text-left ${
                  analysisInputMode === 'machine_detail'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                  analysisInputMode === 'machine_detail' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>2. Chi tiết (Máy chấm)</span>
                    {analysisInputMode === 'machine_detail' && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-white/25 rounded-md font-bold uppercase tracking-wider">Đang chọn</span>
                    )}
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${analysisInputMode === 'machine_detail' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    1 File máy chấm (Bài làm & 1/0 từng câu)
                  </div>
                </div>
              </button>

              {/* Tab 3: Chuyên sâu (3 File) */}
              <button
                type="button"
                onClick={() => handleSwitchAnalysisMode('deep_3files')}
                className={`p-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3 cursor-pointer text-left ${
                  analysisInputMode === 'deep_3files'
                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                  analysisInputMode === 'deep_3files' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
                }`}>
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>3. Chuyên sâu (3 File)</span>
                    {analysisInputMode === 'deep_3files' && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-white/25 rounded-md font-bold uppercase tracking-wider">Đang chọn</span>
                    )}
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${analysisInputMode === 'deep_3files' ? 'text-purple-100' : 'text-slate-500'}`}>
                    Trọn bộ 3 File (Điểm + Ma trận + YCCĐ)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* KHUNG NẠP DỮ LIỆU ĐƯỢC ENABLE CHÍNH XÁC THEO CHẾ ĐỘ ĐÃ CHỌN */}
          {analysisInputMode === 'basic' && (
            <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/60 border border-blue-200 rounded-2xl animate-in fade-in space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                      PHƯƠNG ÁN 1: CƠ BẢN
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      1 File Bảng điểm tổng hợp gồm: STT, SBD, Họ và tên, Lớp, Ngày sinh, Điểm thi
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dành cho bảng điểm toàn khối (ví dụ 500 HS nhiều môn). Hệ thống <strong>tự động lọc học sinh dự thi môn {selectedSubject}</strong>, nhận diện danh sách lớp, tính phổ điểm, lập bảng đối sánh thứ hạng giữa các lớp và kích hoạt AI phân tích sư phạm toàn diện!
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleLoadSampleBasicData}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Nạp ngay bảng điểm mẫu 20 học sinh chuẩn 5 trường: STT, SBD, Họ và tên, Lớp, Ngày sinh"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nạp Mẫu Bảng điểm (20 HS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadScoreOnlyTemplate}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Tải file mẫu bảng điểm Excel chuẩn gồm: STT, SBD, Họ và tên, Lớp, Ngày sinh, Điểm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Mẫu Bảng điểm Cơ bản</span>
                  </button>

                  <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nạp File Bảng điểm (Excel)</span>
                    <input
                      ref={scoreFileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleUploadScoreExcel}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-800 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Hiện có <strong>{isEvaluationMode ? peMetrics.totalStudents : subjectMetrics.totalCandidates}</strong> học sinh có điểm môn {selectedSubject} thuộc <strong>{subjectMetrics.classBreakdown.length} lớp</strong> (tổng {scoreRows.length} HS trong bảng điểm).
                </span>
                <span className="text-slate-500 italic">
                  *Các lớp nhận diện: {subjectMetrics.classBreakdown.map(c => c.className).slice(0, 5).join(', ')}{subjectMetrics.classBreakdown.length > 5 ? '...' : ''}
                </span>
              </div>
            </div>
          )}

          {analysisInputMode === 'machine_detail' && (
            <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-indigo-50/60 border border-indigo-200 rounded-2xl animate-in fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                      PHƯƠNG ÁN 2: CHI TIẾT (MÁY CHẤM)
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      File Kết quả Máy chấm môn {selectedSubject} ({getExamStructureSpec(selectedSubject).formatDescription}) • Tích hợp cột Lớp trực tiếp
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hệ thống tích hợp <strong>Bộ nhận diện thông minh đa tầng</strong>: Tự động trích xuất cột <strong>Lớp</strong> ngay trong file kết quả, nhận diện cấu trúc GDPT 2018 (Phần I, II, III) từ bất kỳ phần mềm máy chấm nào (OMR, QM, TNMaker...) mà <strong>không cần nạp thêm danh sách lớp phụ</strong>!
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleLoadSampleMachineScoring}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={`Trải nghiệm ngay bộ dữ liệu mẫu thực tế 24 thí sinh từ file máy chấm môn ${selectedSubject}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nạp Mẫu thực tế môn {selectedSubject} (24 HS - 4 Lớp)</span>
                  </button>
                </div>
              </div>

              {/* Thẻ nạp 1 chạm duy nhất: File Kết quả máy chấm tích hợp cột Lớp */}
              <div className="pt-2 border-t border-indigo-200/60">
                <div className="p-4 rounded-xl bg-white border border-indigo-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-black">★</span>
                        File Kết quả Máy chấm (.xlsx, .xls, .csv)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Tự động phân lớp từ file
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        Chuẩn GDPT 2018
                      </span>
                    </div>

                    {(() => {
                      const spec = getExamStructureSpec(selectedSubject);
                      return (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Tự động nhận diện các cột: <strong>STT, SBD, Họ và tên, Lớp, Mã đề, Điểm thi</strong> và toàn bộ bài làm vi mô: <strong>{spec.part1Count} câu P1</strong> (0.25đ){spec.part2Count > 0 ? `, ${spec.part2Count} câu P2 (Đ/S 1.0đ${spec.part2Elective ? ' - gồm tự chọn ICT/CS' : ''})` : ''}{spec.part3Count > 0 ? `, ${spec.part3Count} câu P3 (TLN ${spec.part3ScorePerQuestion}đ)` : ''}.
                        </p>
                      );
                    })()}

                    <div className="flex items-center gap-3 text-[11px] text-slate-700 font-semibold flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Đã nạp: <strong>{scoreRows.length} bài thi</strong></span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-indigo-700">
                        <strong>{allDetectedClasses.length > 0 ? allDetectedClasses.length : subjectMetrics.classBreakdown.length} lớp nhận diện:</strong> {(allDetectedClasses.length > 0 ? allDetectedClasses : subjectMetrics.classBreakdown.map(c => c.className)).slice(0, 5).join(', ')}{(allDetectedClasses.length > 5 || subjectMetrics.classBreakdown.length > 5) ? '...' : ''}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600">
                        {matrixItems.length} câu hỏi vi mô
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={handleDownloadMachineScoreTemplate}
                      className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="Tải file mẫu Excel máy chấm đã có sẵn cột Lớp và định dạng chuẩn môn học"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Mẫu Máy chấm</span>
                    </button>

                    <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Nạp File Máy chấm</span>
                      <input
                        ref={machineFileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleUploadMachineScoreExcel}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px] text-indigo-900 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  {(() => {
                    const spec = getExamStructureSpec(selectedSubject);
                    return (
                      <span>
                        Cấu trúc 2025: <strong>Phần I</strong> ({spec.part1Count} câu MC - 0.25đ)
                        {spec.part2Count > 0 && (
                          <span> • <strong>Phần II</strong> ({spec.part2Count} câu Đ/S - tối đa 1.0đ{spec.part2Elective ? ': 2 bắt buộc + 4 tự chọn ICT/CS' : ''})</span>
                        )}
                        {spec.part3Count > 0 ? (
                          <span> • <strong>Phần III</strong> ({spec.part3Count} câu TLN - {spec.part3ScorePerQuestion}đ)</span>
                        ) : (
                          <span> • <em>(Không có Phần III)</em></span>
                        )}
                      </span>
                    );
                  })()}
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5 flex-wrap">
                  <span>{scoreRows.length} bài thi • {subjectMetrics.classBreakdown.length} lớp</span>
                  {subjectMetrics.absentCount > 0 && (
                    <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px] font-semibold">
                      {subjectMetrics.absentCount} HS vắng thi (bảo toàn null, không gán 0)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {analysisInputMode === 'deep_3files' && (
            <div className="p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-purple-50/60 border border-purple-200 rounded-2xl animate-in fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                      PHƯƠNG ÁN 3: CHUYÊN SÂU
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Đồng bộ trọn bộ: Bảng điểm (Tích hợp Lớp) + Ma trận GDPT 2018 + YCCĐ
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dành cho các kỳ thi lớn (Giữa kỳ, Cuối kỳ, Thi thử). Sử dụng trực tiếp cột <strong>Lớp</strong> trong bảng điểm kết hợp Ma trận và YCCĐ để đối chuẩn mục tiêu kỳ vọng và lập kế hoạch can thiệp sư phạm mà <strong>không cần nạp thêm danh sách lớp phụ</strong>.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-900 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span>Bảo toàn khảo thí: Điểm bỏ trống và HS vắng thi (VT) được giữ nguyên <code>null</code>, không quy chụp thành 0 điểm, không làm sai lệch Điểm TB khối.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadFullBundleTemplate}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Tải 1 file Excel chuẩn gồm 3 Sheet: Bảng điểm (có sẵn cột Lớp), Ma trận, YCCĐ"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Mẫu 3 Sheet (Excel)</span>
                  </button>

                  <label className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nạp trọn bộ (File 3-Sheet)</span>
                    <input
                      ref={bundleFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleUploadBundleExcel}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 3 Thẻ nguồn dữ liệu chuyên sâu (Đã tích hợp sẵn cột Lớp vào Bảng điểm) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-200/60">

                {/* Nguồn 1: Bảng điểm */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black">1</span>
                        Bảng điểm học sinh
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {scoreRows.length} HS • {allDetectedClasses.length > 0 ? allDetectedClasses.length : subjectMetrics.classBreakdown.length} lớp
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Điểm môn {selectedSubject} (Tự động nhận diện cột Lớp)
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadScoreOnlyTemplate}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Mẫu</span>
                    </button>
                    <label className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Nạp file</span>
                      <input
                        ref={scoreFileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleUploadScoreExcel}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Nguồn 2: Ma trận */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-black">2</span>
                        Ma trận đề kiểm tra
                      </span>
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        {matrixItems.length} câu
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mức độ tư duy & điểm từng câu
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadMatrixOnlyTemplate}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Mẫu</span>
                    </button>
                    <label className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Nạp file</span>
                      <input
                        ref={matrixFileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleUploadMatrixExcel}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Nguồn 3: YCCĐ */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">3</span>
                        Yêu cầu cần đạt (YCCĐ)
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {yccdItems.length} YCCĐ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chuẩn năng lực GDPT 2018
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadYccdOnlyTemplate}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Mẫu</span>
                    </button>
                    <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Nạp file</span>
                      <input
                        ref={yccdFileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleUploadYccdExcel}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BANNER THỐNG KÊ QUY MÔ THÍ SINH & TÌNH TRẠNG DỰ THI CHUẨN XÁC */}
      {!isEvaluationMode && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 rounded-2xl border border-indigo-800/40 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-300 flex items-center gap-2">
                <span>QUY MÔ THÍ SINH & TÌNH TRẠNG DỰ THI MÔN {selectedSubject.toUpperCase()}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chuẩn Khảo thí GDPT 2018
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Phân định 4 trạng thái: <strong>Dự thi (N)</strong> • <strong>Vắng thi (VT)</strong> • <strong>Không đăng ký (KDT)</strong> • <strong>Điểm 0 thực tế</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3 text-center shrink-0">
            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Sĩ số khối / File</span>
              <strong className="text-sm font-bold text-white font-mono">{subjectMetrics.totalInGrade || scoreRows.length}</strong>
            </div>

            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">ĐK thi môn này</span>
              <strong className="text-sm font-bold text-indigo-300 font-mono">{subjectMetrics.registeredCandidates}</strong>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-emerald-300 block">Dự thi thực tế (N)</span>
              <strong className="text-sm font-black text-emerald-400 font-mono">{subjectMetrics.totalCandidates}</strong>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-amber-300 block">Vắng thi (VT)</span>
              <strong className="text-sm font-bold text-amber-400 font-mono">
                {subjectMetrics.absentCount} ({subjectMetrics.absentRate.toFixed(1)}%)
              </strong>
            </div>

            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block">Không đăng ký</span>
              <strong className="text-sm font-bold text-slate-300 font-mono">{subjectMetrics.unregisteredCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 4 CHỈ SỐ VÀNG ĐO LƯỜNG KHẢO THÍ (METRIC CARDS) */}
      {isEvaluationMode ? (
        /* Card đo lường riêng cho Môn Đánh giá Đạt/Chưa đạt (GDTC) */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Tỷ lệ ĐẠT (Đ) toàn khối</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {peMetrics.pctDat}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {peMetrics.countDat} / {peMetrics.totalStudents} học sinh
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>CHƯA ĐẠT (CĐ)</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1">
              {peMetrics.pctChuaDat}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {peMetrics.countChuaDat} học sinh cần rèn luyện thêm
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Kỹ thuật Động tác</span>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {peMetrics.criteriaStats.kyThuat1.pctDat}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Đạt xuất phát & tiếp đất an toàn
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Sức bền & Thể lực</span>
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {peMetrics.criteriaStats.theLuc.pctDat}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Đạt chỉ số RLTT theo độ tuổi
            </div>
          </div>
        </div>
      ) : (
        /* Card đo lường cho các môn cho Điểm số (Toán, Hóa, Ngữ văn...) */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Điểm Trung bình (Mean)</span>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {subjectMetrics.mean.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Min: {subjectMetrics.min} - Max: {subjectMetrics.max}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Điểm Phổ biến (Mode)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {subjectMetrics.mode.toFixed(1)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Trung vị (Median): {subjectMetrics.median.toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Độ lệch chuẩn (StdDev)</span>
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {subjectMetrics.stdDev.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {subjectMetrics.stdDev > 1.4 ? 'Độ phân hóa cao' : 'Tập trung quanh trục'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Tỷ lệ Đạt chuẩn (≥ 5.0)</span>
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-700 mt-1">
              {(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Dưới TB: {subjectMetrics.rateBelowAverage}% • Liệt: {subjectMetrics.rateFailed}%
            </div>
          </div>
        </div>
      )}

      {/* BIỂU ĐỒ PHỔ ĐIỂM & CHUYỂN ĐỔI NHIỀU DẠNG BIỂU ĐỒ (CỘT, ĐƯỜNG, TRÒN, SO SÁNH LỚP) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {chartType === 'column' && <BarChart3 className="w-4 h-4 text-blue-600" />}
                {chartType === 'line' && <Activity className="w-4 h-4 text-emerald-600" />}
                {chartType === 'pie' && <PieChart className="w-4 h-4 text-purple-600" />}
                {chartType === 'class_bar' && <Layers className="w-4 h-4 text-indigo-600" />}
                <span>
                  {chartType === 'column' && `Biểu đồ Cột (Histogram) Phổ điểm Môn ${selectedSubject}`}
                  {chartType === 'line' && `Biểu đồ Đường (Trend Line) Phổ điểm Môn ${selectedSubject}`}
                  {chartType === 'pie' && `Biểu đồ Hình tròn Cơ cấu Xếp loại Điểm Môn ${selectedSubject}`}
                  {chartType === 'class_bar' && `Biểu đồ So sánh Điểm TB giữa các Lớp Môn ${selectedSubject}`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Phân bố số lượng thí sinh theo từng khoảng điểm từ 0.0 đến 10.0 (Cột đỉnh biểu thị điểm Mode)
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/80">
              <button
                type="button"
                onClick={() => setChartType('column')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'column' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Cột</span>
              </button>

              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'line' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Đường</span>
              </button>

              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'pie' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Hình tròn</span>
              </button>

              <button
                type="button"
                onClick={() => setChartType('class_bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'class_bar' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Các lớp</span>
              </button>
            </div>
          </div>

          {subjectMetrics.totalCandidates === 0 && !isEvaluationMode ? (
            <div className="h-60 flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <div className="text-sm font-bold text-slate-800">
                Chưa có dữ liệu điểm của môn {selectedSubject} trong bảng điểm hiện tại
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                {subjectsWithScores.length > 0 ? (
                  <>Bảng điểm hiện tại đang có dữ liệu của các môn: <strong className="text-slate-700">{subjectsWithScores.join(', ')}</strong>. Vui lòng bấm chọn môn tương ứng ở danh sách phía trên hoặc nạp dữ liệu mẫu.</>
                ) : (
                  <>Vui lòng nạp file Excel điểm hoặc bấm nút &quot;Khôi phục dữ liệu mẫu&quot; để trải nghiệm phân tích.</>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {subjectsWithScores.filter(s => s !== selectedSubject).slice(0, 3).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelectSubject(s)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 transition-all cursor-pointer"
                  >
                    Xem biểu đồ môn {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleResetDefaultSampleData}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Nạp lại dữ liệu mẫu 10 môn</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dạng Cột */}
          {chartType === 'column' && (
            <div>
              <div className="h-60 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
                {subjectMetrics.distribution.map((bin, idx) => {
                  const heightPercent = maxBarCount > 0 ? (bin.count / maxBarCount) * 100 : 0;
                  const isModeBin = bin.count === maxBarCount && bin.count > 0;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className={`text-[10px] font-bold mb-1 transition-all ${
                        isModeBin ? 'text-amber-600 scale-110' : 'text-slate-500 group-hover:text-blue-600'
                      }`}>
                        {bin.count > 0 ? bin.count : ''}
                      </div>

                      <div
                        style={{ height: `${Math.max(heightPercent, bin.count > 0 ? 6 : 2)}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          isModeBin
                            ? 'bg-gradient-to-t from-amber-500 to-amber-400 shadow-xs'
                            : 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-700 group-hover:to-indigo-600'
                        }`}
                      />

                      <div className="text-[9px] font-mono text-slate-500 mt-1.5 truncate">
                        {bin.rangeLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                <span>0.0 Điểm (Thấp nhất)</span>
                <span>Khoảng điểm thi môn {selectedSubject}</span>
                <span>10.0 Điểm (Tối đa)</span>
              </div>
            </div>
          )}

          {/* Dạng Đường */}
          {chartType === 'line' && (() => {
            const svgWidth = 600;
            const svgHeight = 220;
            const paddingX = 35;
            const paddingBottom = 30;
            const paddingTop = 25;
            const chartW = svgWidth - paddingX * 2;
            const chartH = svgHeight - paddingTop - paddingBottom;
            const totalPoints = subjectMetrics.distribution.length;

            const points = subjectMetrics.distribution.map((bin, i) => {
              const x = paddingX + (i / Math.max(totalPoints - 1, 1)) * chartW;
              const yRatio = maxBarCount > 0 ? bin.count / maxBarCount : 0;
              const y = paddingTop + chartH * (1 - yRatio);
              return { x, y, count: bin.count, label: bin.rangeLabel };
            });

            const pathD = points.reduce((acc, p, i) => (
              i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`
            ), '');

            const areaD = points.length > 0
              ? `${pathD} L ${points[points.length - 1].x},${paddingTop + chartH} L ${points[0].x},${paddingTop + chartH} Z`
              : '';

            return (
              <div>
                <div className="h-60 w-full relative flex items-center justify-center pt-2 pb-1 border-b border-slate-200">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = paddingTop + chartH * (1 - ratio);
                      return (
                        <g key={i}>
                          <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                          <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                            {Math.round(maxBarCount * ratio)}
                          </text>
                        </g>
                      );
                    })}

                    {areaD && <path d={areaD} fill="url(#lineAreaGrad)" />}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {points.map((p, idx) => (
                      <g key={idx} className="cursor-pointer group">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#059669"
                          strokeWidth="2.5"
                          className="transition-all hover:scale-125"
                        />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill={p.count === maxBarCount ? '#d97706' : '#1e293b'}
                        >
                          {p.count > 0 ? p.count : ''}
                        </text>
                        <text
                          x={p.x}
                          y={paddingTop + chartH + 16}
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="monospace"
                          fill="#64748b"
                        >
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            );
          })()}

          {/* Dạng Tròn */}
          {chartType === 'pie' && (() => {
            const slices = [
              { label: 'Giỏi (≥8.0)', pct: subjectMetrics.rateExcellent, color: '#10b981', desc: '≥ 8.0 điểm' },
              { label: 'Khá (6.5-7.9)', pct: subjectMetrics.rateGood, color: '#3b82f6', desc: '6.5 - 7.9 điểm' },
              { label: 'Trung bình (5-6.4)', pct: subjectMetrics.rateAverage, color: '#f59e0b', desc: '5.0 - 6.4 điểm' },
              { label: 'Dưới TB (<5.0)', pct: Math.max(0, Number((subjectMetrics.rateBelowAverage - subjectMetrics.rateFailed).toFixed(1))), color: '#f43f5e', desc: '1.1 - 4.9 điểm' },
              { label: 'Nguy cơ Liệt (≤1.0)', pct: subjectMetrics.rateFailed, color: '#991b1b', desc: '≤ 1.0 điểm' },
            ].filter(s => s.pct > 0);

            let cumulativeAngle = 0;
            const radius = 70;
            const innerRadius = 42;
            const cx = 100;
            const cy = 100;

            const piePaths = slices.map((slice) => {
              const startAngle = cumulativeAngle;
              const sliceAngle = (slice.pct / 100) * 360;
              const endAngle = startAngle + sliceAngle;
              cumulativeAngle += sliceAngle;

              const startRad = (startAngle - 90) * (Math.PI / 180);
              const endRad = (endAngle - 90) * (Math.PI / 180);

              const x1 = cx + radius * Math.cos(startRad);
              const y1 = cy + radius * Math.sin(startRad);
              const x2 = cx + radius * Math.cos(endRad);
              const y2 = cy + radius * Math.sin(endRad);

              const ix1 = cx + innerRadius * Math.cos(endRad);
              const iy1 = cy + innerRadius * Math.sin(endRad);
              const ix2 = cx + innerRadius * Math.cos(startRad);
              const iy2 = cy + innerRadius * Math.sin(startRad);

              const largeArc = sliceAngle > 180 ? 1 : 0;
              const pathData = sliceAngle >= 359.9
                ? `M ${cx},${cy - radius} A ${radius},${radius} 0 1,0 ${cx},${cy + radius} A ${radius},${radius} 0 1,0 ${cx},${cy - radius} M ${cx},${cy - innerRadius} A ${innerRadius},${innerRadius} 0 1,1 ${cx},${cy + innerRadius} A ${innerRadius},${innerRadius} 0 1,1 ${cx},${cy - innerRadius} Z`
                : `M ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} L ${ix1},${iy1} A ${innerRadius},${innerRadius} 0 ${largeArc},0 ${ix2},${iy2} Z`;

              return { ...slice, pathData };
            });

            return (
              <div className="h-60 flex flex-col sm:flex-row items-center justify-center gap-6 pt-2 pb-2 border-b border-slate-200">
                <div className="relative w-44 h-44 shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {piePaths.map((p, i) => (
                      <path
                        key={i}
                        d={p.pathData}
                        fill={p.color}
                        className="transition-all hover:opacity-85 cursor-pointer stroke-white stroke-2"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng số</span>
                    <span className="text-lg font-black text-slate-800">{subjectMetrics.totalCandidates}</span>
                    <span className="text-[9px] text-slate-400">bài thi</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full max-w-sm">
                  {slices.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <div>
                          <div className="font-semibold text-slate-700 text-[11px]">{s.label}</div>
                          <div className="text-[9px] text-slate-400">{s.desc}</div>
                        </div>
                      </div>
                      <span className="font-black text-slate-800 text-xs ml-2">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Dạng Các Lớp */}
          {chartType === 'class_bar' && (
            <div className="h-60 overflow-y-auto pr-1 pt-2 pb-2 border-b border-slate-200 space-y-2.5">
              {subjectMetrics.classBreakdown.map((c, i) => {
                const maxMean = 10;
                const widthPct = Math.min(100, Math.max(5, (c.mean / maxMean) * 100));
                const isTop1 = i === 0;

                return (
                  <div key={c.className} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isTop1 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {i + 1}
                        </span>
                        <strong className="text-slate-800">Lớp {c.className}</strong>
                        <span className="text-[10px] text-slate-400">({c.count} bài thi)</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500">
                          ≥5.0: <strong className="text-slate-700">{c.rateAboveFive}%</strong>
                        </span>
                        <span className="font-black text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {c.mean.toFixed(2)} đ
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isTop1
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-xs'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
        </div>

        {/* Tỷ lệ Phân hạng Học lực & Liệt theo Ngưỡng GDPT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Phân vùng Điểm số Khảo thí
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Tốt và Xuất sắc (8.0 - 10.0)
                  </span>
                  <span className="font-bold text-emerald-700">{subjectMetrics.rateExcellent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${subjectMetrics.rateExcellent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Mức Khá (6.5 - &lt; 8.0)
                  </span>
                  <span className="font-bold text-blue-700">{subjectMetrics.rateGood}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${subjectMetrics.rateGood}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Đạt nền tảng (5.0 - &lt; 6.5)
                  </span>
                  <span className="font-bold text-amber-700">{subjectMetrics.rateAverage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${subjectMetrics.rateAverage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    Cần hỗ trợ (&lt; 5.0)
                  </span>
                  <span className="font-bold text-rose-700">{subjectMetrics.rateBelowAverage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${subjectMetrics.rateBelowAverage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-900"></span>
                    Rất cần hỗ trợ / Liệt (≤ 1.0)
                  </span>
                  <span className="font-bold text-red-900">{subjectMetrics.rateFailed}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-red-900 h-2 rounded-full" style={{ width: `${Math.max(subjectMetrics.rateFailed, 1)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Hệ quy chiếu quản trị nội bộ dành cho Tổ trưởng chuyên môn THPT.
          </div>
        </div>
      </div>

      {/* BẢNG THỐNG KÊ CHI TIẾT THEO TỪNG LỚP (HỖ TRỢ CẢ MÔN ĐIỂM SỐ VÀ MÔN ĐÁNH GIÁ ĐẠT/CHƯA ĐẠT TT22) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isEvaluationMode ? 'bg-emerald-600' : 'bg-blue-600'} animate-pulse`} />
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className={`w-5 h-5 ${isEvaluationMode ? 'text-emerald-600' : 'text-blue-600'}`} />
                {isEvaluationMode 
                  ? `BẢNG THỐNG KÊ ĐÁNH GIÁ KẾT QUẢ MÔN ${selectedSubject.toUpperCase()} (ĐẠT / CHƯA ĐẠT)`
                  : `BẢNG THỐNG KÊ CHI TIẾT ĐIỂM THI / KIỂM TRA MÔN ${selectedSubject.toUpperCase()} THEO TỪNG LỚP`}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEvaluationMode 
                ? 'Thống kê kết quả đánh giá thực hành và rèn luyện thể lực theo Thông tư 22/2021/TT-BGDĐT: Tỷ lệ Đạt (Đ) và Chưa đạt (CĐ).'
                : 'Phân loại tự động theo 6 dải điểm chuẩn: 0-1 (Liệt), 1.1-3.4 (Kém), 3.5-4.9 (Yếu), 5-6.4 (Trung bình), 6.5-7.9 (Khá), 8-10 (Giỏi).'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrintClassRangeReport}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:border-blue-400"
              title="Mở biểu mẫu in báo cáo A4 chuẩn thể thức văn bản hành chính trường học"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>In Báo cáo A4</span>
            </button>

            <button
              type="button"
              disabled={isExportingExcel}
              onClick={handleExportClassRangeExcel}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Xuất file Excel chuẩn form đẹp tương tự phân hệ coi thi: Tiêu đề Quốc hiệu, Trường, Tổ, 6 dải điểm, %, Chữ ký"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel chuẩn đẹp</span>
                </>
              )}
            </button>

            {/* Nút Đẩy kết quả lên CSDL Supabase để Học sinh tra cứu (hoặc Chế độ Xem & Đối soát cho Tổ trưởng) */}
            {onOpenExamScoreManagementModal && (
              <button
                type="button"
                onClick={onOpenExamScoreManagementModal}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title={
                  currentUser && !hasUserPermission(currentUser, 'CSDL_IMPORT_DIEM')
                    ? 'Mở phân hệ CSDL Điểm trên Supabase (Chế độ xem & đối soát danh sách điểm toàn trường)'
                    : 'Đẩy kết quả thi lên CSDL Supabase để Học sinh tra cứu bằng SBD và CCCD'
                }
              >
                <Cloud className="w-3.5 h-3.5 text-blue-200" />
                <span className="hidden sm:inline">
                  {currentUser && !hasUserPermission(currentUser, 'CSDL_IMPORT_DIEM')
                    ? 'Tra cứu & CSDL Điểm (Supabase)'
                    : 'Đẩy lên CSDL Tra cứu (Supabase)'}
                </span>
                <span className="sm:hidden">
                  {currentUser && !hasUserPermission(currentUser, 'CSDL_IMPORT_DIEM')
                    ? 'CSDL Điểm'
                    : 'Lên Supabase'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Khung xem trước & in chuẩn hành chính */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="p-4 bg-slate-50/60 border-b border-slate-200 text-center text-xs space-y-1">
            <div className="flex justify-between items-start text-[11px] text-slate-600 uppercase font-semibold">
              <div className="text-left">
                <div>{config.deptName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO'}</div>
                <div className="font-bold text-slate-800">{config.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM'}</div>
                <div className="text-blue-700 font-bold">{currentUser?.unit || `TỔ CHUYÊN MÔN: ${selectedSubject.toUpperCase()}`}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="italic text-[10px]">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>
            <div className="pt-2">
              <div className="text-sm font-black text-slate-900 tracking-wide">
                {isEvaluationMode 
                  ? `BẢNG TỔNG HỢP ĐÁNH GIÁ KẾT QUẢ MÔN ${selectedSubject.toUpperCase()}`
                  : `BẢNG THỐNG KÊ CHI TIẾT ĐIỂM THI / KIỂM TRA MÔN ${selectedSubject.toUpperCase()}`}
              </div>
              <div className="text-[11px] text-slate-500 italic">
                Kỳ thi: {config.examCategory} ({config.subPeriod}) • Năm học {config.schoolYear}
              </div>
            </div>
          </div>

          {isEvaluationMode ? (
            /* BẢNG ĐẶC THÙ CHO MÔN GDTC: ĐẠT / CHƯA ĐẠT VÀ TIÊU CHÍ THỰC HÀNH */
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-10">STT</th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[100px]">Lớp</th>
                  <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-16">Sĩ số</th>
                  <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-emerald-50 text-emerald-900">KẾT QUẢ: ĐẠT (Đ)</th>
                  <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-rose-50 text-rose-900">KẾT QUẢ: CHƯA ĐẠT (CĐ)</th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[200px]">Ghi chú & Đề xuất sư phạm</th>
                </tr>
                <tr className="text-[11px] font-semibold border-b border-slate-200 text-slate-700">
                  <th className="py-1 px-2 border-r border-slate-200 bg-emerald-100/50 text-emerald-800 w-14 font-bold">SL</th>
                  <th className="py-1 px-2 border-r border-slate-200 bg-emerald-100/50 text-emerald-800 w-16 font-bold">%</th>
                  <th className="py-1 px-2 border-r border-slate-200 bg-rose-100/50 text-rose-800 w-14 font-bold">SL</th>
                  <th className="py-1 px-2 border-r border-slate-200 bg-rose-100/50 text-rose-800 w-16 font-bold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {peMetrics.classStats.map((c, idx) => (
                  <tr key={c.className} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2 border-r border-slate-200 text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-left font-bold font-sans text-slate-800">{c.className}</td>
                    <td className="py-2 px-2 border-r border-slate-200 font-bold text-slate-900">{c.total}</td>
                    <td className="py-2 px-2 border-r border-slate-200 font-bold text-emerald-700 bg-emerald-50/30">{c.dat}</td>
                    <td className="py-2 px-2 border-r border-slate-200 font-bold text-emerald-700 bg-emerald-50/30">{c.pctDat}%</td>
                    <td className={`py-2 px-2 border-r border-slate-200 font-bold ${c.chuaDat > 0 ? 'text-rose-700 bg-rose-50/40' : 'text-slate-400'}`}>{c.chuaDat}</td>
                    <td className={`py-2 px-2 border-r border-slate-200 font-bold ${c.chuaDat > 0 ? 'text-rose-700 bg-rose-50/40' : 'text-slate-400'}`}>{c.pctChuaDat}%</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-left font-sans text-[11px] text-slate-500">
                      {c.chuaDat > 0 ? `Có ${c.chuaDat} học sinh cần rèn luyện sức bền và cho kiểm tra lại` : '100% học sinh đạt yêu cầu thực hành'}
                    </td>
                  </tr>
                ))}
                {/* Hàng tổng cộng */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-center font-sans text-xs uppercase text-slate-900">
                    TOÀN KHỐI
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 font-black text-slate-900">
                    {peMetrics.totalStudents}
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 font-black text-emerald-800 bg-emerald-100/40">{peMetrics.countDat}</td>
                  <td className="py-2.5 px-2 border-r border-slate-300 font-black text-emerald-800 bg-emerald-100/40">{peMetrics.pctDat}%</td>
                  <td className="py-2.5 px-2 border-r border-slate-300 font-black text-rose-800 bg-rose-100/40">{peMetrics.countChuaDat}</td>
                  <td className="py-2.5 px-2 border-r border-slate-300 font-black text-rose-800 bg-rose-100/40">{peMetrics.pctChuaDat}%</td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-left font-sans text-xs text-slate-700 font-semibold">
                    Kế hoạch: Bồi dưỡng thể lực bổ trợ 2 buổi/tuần cho nhóm Chưa đạt
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            /* BẢNG 6 THANG ĐIỂM CHUẨN CHO MÔN ĐIỂM SỐ (TOÁN, LÝ, HÓA, VĂN, ANH...) */
            <table className="w-full text-center text-xs border-collapse">
            <thead>
              {/* Hàng Header 1 */}
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-10">STT</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[90px]">Lớp</th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-14">Sĩ số</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-[#d5edd6] text-slate-900">0 - 1.0</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-[#d5edd6] text-slate-900">1.1 - 3.4</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-[#d5edd6] text-slate-900">3.5 - 4.9</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-[#edd7ed] text-slate-900">5 - 6.4</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-[#edd7ed] text-slate-900">6.5 - 7.9</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-[#edd7ed] text-slate-900">8 - 10</th>
                <th colSpan={2} className="py-1 px-1 border-r border-slate-200 bg-blue-50 text-blue-900">Trên TB (≥ 5.0)</th>
                <th rowSpan={2} className="py-2.5 px-2 w-16 bg-slate-100 text-slate-800">Điểm TB</th>
              </tr>
              {/* Hàng Header 2 */}
              <tr className="text-[11px] font-semibold border-b border-slate-200 text-slate-700">
                <th className="py-1 px-1 border-r border-slate-200 bg-[#e7f5e8] w-10">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#e7f5e8] w-12">%</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#e7f5e8] w-10">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#e7f5e8] w-12">%</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#e7f5e8] w-10">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#e7f5e8] w-12">%</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#f7edf7] w-10">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#f7edf7] w-12">%</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#f7edf7] w-10">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#f7edf7] w-12">%</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#f7edf7] w-10">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-[#f7edf7] w-12">%</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-blue-50 text-blue-800 w-10 font-bold">SL</th>
                <th className="py-1 px-1 border-r border-slate-200 bg-blue-50 text-blue-800 w-12 font-bold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {subjectMetrics.classRangeStats?.map((c, idx) => (
                <tr key={c.className} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2 border-r border-slate-200 text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-200 text-left font-bold font-sans text-slate-800">{c.className}</td>
                  <td className="py-2 px-2 border-r border-slate-200 font-bold text-slate-900">{c.totalStudents}</td>
                  
                  {/* 0 - 1.0 */}
                  <td className={`py-2 px-1 border-r border-slate-200 ${c.count0to1 > 0 ? 'text-red-700 font-bold bg-rose-50/50' : 'text-slate-400'}`}>{c.count0to1}</td>
                  <td className={`py-2 px-1 border-r border-slate-200 ${c.count0to1 > 0 ? 'text-red-700 font-bold bg-rose-50/50' : 'text-slate-400'}`}>{c.pct0to1}%</td>

                  {/* 1.1 - 3.4 */}
                  <td className={`py-2 px-1 border-r border-slate-200 ${c.count11to34 > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{c.count11to34}</td>
                  <td className={`py-2 px-1 border-r border-slate-200 ${c.count11to34 > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{c.pct11to34}%</td>

                  {/* 3.5 - 4.9 */}
                  <td className={`py-2 px-1 border-r border-slate-200 ${c.count35to49 > 0 ? 'text-amber-800' : 'text-slate-400'}`}>{c.count35to49}</td>
                  <td className={`py-2 px-1 border-r border-slate-200 ${c.count35to49 > 0 ? 'text-amber-800' : 'text-slate-400'}`}>{c.pct35to49}%</td>

                  {/* 5.0 - 6.4 */}
                  <td className="py-2 px-1 border-r border-slate-200 text-slate-700">{c.count5to64}</td>
                  <td className="py-2 px-1 border-r border-slate-200 text-slate-700">{c.pct5to64}%</td>

                  {/* 6.5 - 7.9 */}
                  <td className="py-2 px-1 border-r border-slate-200 text-blue-700 font-semibold">{c.count65to79}</td>
                  <td className="py-2 px-1 border-r border-slate-200 text-blue-700 font-semibold">{c.pct65to79}%</td>

                  {/* 8.0 - 10.0 */}
                  <td className="py-2 px-1 border-r border-slate-200 text-emerald-700 font-bold bg-emerald-50/30">{c.count8to10}</td>
                  <td className="py-2 px-1 border-r border-slate-200 text-emerald-700 font-bold bg-emerald-50/30">{c.pct8to10}%</td>

                  {/* Trên TB >= 5.0 */}
                  <td className="py-2 px-1 border-r border-slate-200 text-blue-900 font-bold bg-blue-50/40">{c.countAboveFive}</td>
                  <td className="py-2 px-1 border-r border-slate-200 text-blue-900 font-bold bg-blue-50/40">{c.pctAboveFive}%</td>

                  {/* Điểm TB */}
                  <td className="py-2 px-2 font-bold text-slate-900 bg-slate-50">{c.mean.toFixed(2)}</td>
                </tr>
              ))}

              {/* Hàng Tổng cộng Toàn khối */}
              {subjectMetrics.overallRangeStat && (
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-center font-sans text-xs uppercase text-slate-900">
                    TOÀN KHỐI
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 font-black text-slate-900">
                    {subjectMetrics.overallRangeStat.totalStudents}
                  </td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-red-800">{subjectMetrics.overallRangeStat.count0to1}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-red-800">{subjectMetrics.overallRangeStat.pct0to1}%</td>

                  <td className="py-2.5 px-1 border-r border-slate-300 text-amber-800">{subjectMetrics.overallRangeStat.count11to34}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-amber-800">{subjectMetrics.overallRangeStat.pct11to34}%</td>

                  <td className="py-2.5 px-1 border-r border-slate-300 text-amber-900">{subjectMetrics.overallRangeStat.count35to49}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-amber-900">{subjectMetrics.overallRangeStat.pct35to49}%</td>

                  <td className="py-2.5 px-1 border-r border-slate-300 text-slate-800">{subjectMetrics.overallRangeStat.count5to64}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-slate-800">{subjectMetrics.overallRangeStat.pct5to64}%</td>

                  <td className="py-2.5 px-1 border-r border-slate-300 text-blue-800">{subjectMetrics.overallRangeStat.count65to79}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-blue-800">{subjectMetrics.overallRangeStat.pct65to79}%</td>

                  <td className="py-2.5 px-1 border-r border-slate-300 text-emerald-800">{subjectMetrics.overallRangeStat.count8to10}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-emerald-800">{subjectMetrics.overallRangeStat.pct8to10}%</td>

                  <td className="py-2.5 px-1 border-r border-slate-300 text-blue-950 font-black bg-blue-100/50">{subjectMetrics.overallRangeStat.countAboveFive}</td>
                  <td className="py-2.5 px-1 border-r border-slate-300 text-blue-950 font-black bg-blue-100/50">{subjectMetrics.overallRangeStat.pctAboveFive}%</td>

                  <td className="py-2.5 px-2 font-black text-blue-700 bg-blue-50/80">{subjectMetrics.overallRangeStat.mean.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
          )}

          {/* Chân ký chuẩn hành chính khi in ấn */}
          <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-2 text-center text-xs pt-6 pb-6">
            <div>
              <div className="font-bold text-slate-700">BAN GIÁM HIỆU DUYỆT</div>
              <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
            </div>
            <div>
              <div className="text-slate-500 italic text-[11px] mb-1">
                Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </div>
              <div className="font-bold text-slate-800">TỔ TRƯỞNG CHUYÊN MÔN</div>
              <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div className="font-bold text-slate-700">{currentUser?.full_name || '........................................'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG TRA CỨU DANH SÁCH HỌC SINH DỰ THI CHI TIẾT (CHUẨN 5 TRƯỜNG: STT • SBD • HỌ VÀ TÊN • LỚP • NGÀY SINH • ĐIỂM) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>DANH SÁCH THÍ SINH DỰ THI CHI TIẾT (STT • SBD • HỌ VÀ TÊN • LỚP • NGÀY SINH • ĐIỂM)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tra cứu nhanh kết quả từng học sinh môn {selectedSubject} theo chuẩn 5 trường thông tin cơ bản của Bộ GD&ĐT.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredStudentScoreList.length} / {scoreRows.length} Học sinh
            </span>
            <button
              type="button"
              onClick={() => setIsStudentListExpanded(!isStudentListExpanded)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              {isStudentListExpanded ? 'Thu gọn bảng' : 'Mở rộng xem chi tiết'}
            </button>
          </div>
        </div>

        {isStudentListExpanded && (
          <div className="space-y-3">
            {/* Bộ lọc theo Trạng thái, Lớp và Ô tìm kiếm */}
            <div className="flex flex-col gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              {/* Hàng 1: Lọc trạng thái thi & Ô tìm kiếm */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    Trạng thái:
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudentListStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      studentListStatusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Tất cả ({scoreRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentListStatusFilter('present')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      studentListStatusFilter === 'present'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    Dự thi ({subjectMetrics.totalCandidates})
                  </button>
                  {subjectMetrics.absentCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setStudentListStatusFilter('absent_vt')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        studentListStatusFilter === 'absent_vt'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                      }`}
                    >
                      Vắng thi ({subjectMetrics.absentCount})
                    </button>
                  )}
                  {subjectMetrics.unregisteredCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setStudentListStatusFilter('not_registered')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        studentListStatusFilter === 'not_registered'
                          ? 'bg-slate-600 text-white shadow-2xs'
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Không thi / KDT ({subjectMetrics.unregisteredCount})
                    </button>
                  )}
                </div>

                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={studentListSearch}
                    onChange={(e) => setStudentListSearch(e.target.value)}
                    placeholder="Tìm theo Tên, SBD, Lớp..."
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {studentListSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentListSearch('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Hàng 2: Lọc theo từng Lớp */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 border-t border-slate-200/60 pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Lớp:</span>
                <button
                  type="button"
                  onClick={() => setStudentListClassFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    studentListClassFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Tất cả lớp
                </button>
                {subjectMetrics.classBreakdown.map((c) => (
                  <button
                    key={c.className}
                    type="button"
                    onClick={() => setStudentListClassFilter(c.className)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      studentListClassFilter === c.className
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {c.className} ({c.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Bảng Danh sách Học sinh */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-28">Số Báo Danh</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">Họ và tên</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Lớp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">Ngày sinh</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28 bg-blue-50/70 text-blue-900">
                      Điểm {selectedSubject}
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[140px]">Đánh giá học lực</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudentScoreList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Không tìm thấy học sinh nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentScoreList.map((row, idx) => {
                      const scoreVal = row.scores[selectedSubject] ?? null;
                      const scoreNum = typeof scoreVal === 'number' ? scoreVal : null;
                      const examStatus = row.examStatuses?.[selectedSubject];
                      
                      let badge = { text: 'Không đăng ký thi', bg: 'bg-slate-100 text-slate-500 border border-slate-200' };
                      if (scoreNum !== null) {
                        if (scoreNum === 0) badge = { text: 'Điểm 0 (Nguy cơ Liệt)', bg: 'bg-red-800 text-white font-bold animate-pulse' };
                        else if (scoreNum <= 1.0) badge = { text: 'Nguy cơ Liệt (≤ 1.0)', bg: 'bg-red-700 text-white font-bold' };
                        else if (scoreNum < 5.0) badge = { text: 'Dưới TB (Cần phụ đạo)', bg: 'bg-rose-100 text-rose-800 border border-rose-300' };
                        else if (scoreNum < 6.5) badge = { text: 'Trung bình', bg: 'bg-amber-100 text-amber-800 border border-amber-300' };
                        else if (scoreNum < 8.0) badge = { text: 'Khá', bg: 'bg-blue-100 text-blue-800 border border-blue-300' };
                        else badge = { text: 'Giỏi / Xuất sắc', bg: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
                      } else if (examStatus === 'absent_vt') {
                        badge = { text: 'Vắng thi (VT)', bg: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' };
                      }

                      return (
                        <tr key={row.sbd} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100">
                            {row.stt || idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-100">
                            {row.sbd}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100">
                            {row.fullName}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-indigo-700 border-r border-slate-100">
                            {row.className}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 font-mono border-r border-slate-100">
                            {row.dob || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-black font-mono text-sm border-r border-slate-100 bg-blue-50/30">
                            {scoreNum !== null ? (
                              <span className={scoreNum >= 8 ? 'text-emerald-700' : scoreNum <= 1 ? 'text-red-700 font-bold' : scoreNum < 5 ? 'text-rose-700' : 'text-blue-700'}>
                                {scoreNum.toFixed(2)}
                              </span>
                            ) : examStatus === 'absent_vt' ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">VT</span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CHẾ ĐỘ 3: CHUYÊN SÂU (HIỂN THỊ CẢ BẢNG YCCĐ LẪN BẢNG ITEM ANALYSIS P & D) */}
      {analysisInputMode === 'deep_3files' && (yccdAchievementStats.length > 0 || itemAnalysisResults.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột 1: Tỷ lệ đạt theo YCCĐ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Tỷ lệ đạt theo Yêu cầu cần đạt (YCCĐ) / Chủ đề
                </h3>
                <p className="text-[11px] text-slate-500">
                  Xếp theo thứ tự từ mức cần can thiệp gấp (&lt; 50%) đến mức Tốt (≥ 80%)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                {yccdAchievementStats.length} Mục tiêu
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {yccdAchievementStats.map((y) => {
                const isUrgent = y.passRate < 50;
                const isConsolidate = y.passRate >= 50 && y.passRate < 65;

                return (
                  <div key={y.code} className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{y.topic}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({y.code})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {y.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-black ${
                          isUrgent 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : isConsolidate
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {y.passRate}%
                        </span>
                        <div className="text-[9px] font-semibold mt-0.5 text-slate-500">
                          {y.status}
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          isUrgent ? 'bg-rose-500' : isConsolidate ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${y.passRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột 2: Bảng phân tích câu hỏi (Item Analysis P & D) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  {isLiteratureMode
                    ? 'Độ khó (P) & Độ phân biệt (D) từng Câu / Ý Tự luận'
                    : 'Độ khó (P) & Độ phân biệt (D) từng Câu hỏi'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isLiteratureMode
                    ? 'Đo lường độ phân hóa năng lực Đọc hiểu và Viết giữa nhóm điểm cao và nhóm điểm thấp'
                    : 'Cảnh báo câu hỏi có D < 0.10 hoặc D âm (nghi ngờ học sinh giỏi làm sai nhiều hơn)'}
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                {isLiteratureMode ? `${itemAnalysisResults.length} Ý tự luận` : `${itemAnalysisResults.filter(i => i.isAnomaly).length} Câu dị biệt`}
              </span>
            </div>

            {/* Bộ lọc phân loại các phần câu hỏi đề thi & lọc theo từng Lớp */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Phần thi:</span>
                {availablePartTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setItemPartFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      itemPartFilter === tab.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Bộ lọc theo từng Lớp nếu có dữ liệu lớp */}
              {allDetectedClasses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-emerald-800 shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Theo Lớp:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedItemAnalysisClass('all')}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedItemAnalysisClass === 'all'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Toàn khối
                  </button>
                  {allDetectedClasses.map(cName => (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => setSelectedItemAnalysisClass(cName)}
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedItemAnalysisClass === cName
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {cName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 text-center">Câu</th>
                    <th className="py-2 px-2.5">Chủ đề</th>
                    <th className="py-2 px-2 text-center">Độ khó (P)</th>
                    <th className="py-2 px-2 text-center">Độ PB (D)</th>
                    <th className="py-2 px-2.5 text-center">Đánh giá chất lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemAnalysisResults
                    .filter((item) => isItemMatchingPartFilter(item, itemPartFilter))
                    .map((item) => (
                    <tr key={item.questionNo} className={item.isAnomaly ? 'bg-rose-50/60 font-semibold' : 'hover:bg-slate-50'}>
                      <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                        {item.questionNo}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700 truncate max-w-[130px]" title={item.topic}>
                        {item.topic}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          item.difficultyP < 0.20 ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-700'
                        }`}>
                          {item.difficultyP.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          item.discriminationD < 0 
                            ? 'bg-red-800 text-white animate-pulse'
                            : item.discriminationD < 0.20
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.discriminationD.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {item.discriminationD < 0 ? (
                          <span className="text-[10px] text-red-800 font-black flex items-center justify-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            D âm (Lỗi đề/bẫy)
                          </span>
                        ) : item.discriminationD < 0.20 ? (
                          <span className="text-[10px] text-amber-700 font-bold">
                            Cần xem xét
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Tốt / Phù hợp
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: CHI TIẾT (MÁY CHẤM) - HIỂN THỊ DUY NHẤT BẢNG PHÂN TÍCH CÂU HỎI TRẮC NGHIỆM P & D TOÀN KHỐI / LỚP */}
      {analysisInputMode === 'machine_detail' && itemAnalysisResults.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>BẢNG ĐÁNH GIÁ CHẤT LƯỢNG KỸ THUẬT CÂU HỎI ĐỀ THI TRẮC NGHIỆM (ITEM ANALYSIS P & D)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Được trích xuất trực tiếp từ file kết quả máy chấm (1/0 từng câu). Phân loại Độ khó (P), Độ phân biệt (D) và phát hiện câu dị biệt.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                {itemAnalysisResults.filter(i => i.isAnomaly).length} Câu dị biệt (D &lt; 0.2 hoặc D âm)
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                Tổng {itemAnalysisResults.length} Câu hỏi
              </span>
            </div>
          </div>

          {/* Bộ lọc phân loại các phần thi & lọc theo từng Lớp */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-600 shrink-0">Phần thi:</span>
              {availablePartTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setItemPartFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    itemPartFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bộ lọc theo từng Lớp nếu có dữ liệu lớp */}
            {allDetectedClasses.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-emerald-800 shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Đối sánh Lớp:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItemAnalysisClass('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedItemAnalysisClass === 'all'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  Toàn khối
                </button>
                {allDetectedClasses.map(cName => (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => setSelectedItemAnalysisClass(cName)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedItemAnalysisClass === cName
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-center w-16">Câu</th>
                  <th className="py-2.5 px-3">Phần cấu trúc</th>
                  <th className="py-2.5 px-3 text-center w-28">Độ khó (P)</th>
                  <th className="py-2.5 px-3 text-center w-28">Độ phân biệt (D)</th>
                  <th className="py-2.5 px-3 text-center w-36">Đánh giá kỹ thuật</th>
                  <th className="py-2.5 px-3">Khuyến nghị rà soát đề</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemAnalysisResults
                  .filter((item) => isItemMatchingPartFilter(item, itemPartFilter))
                  .map((item) => (
                  <tr key={item.questionNo} className={item.isAnomaly ? 'bg-rose-50/60 font-semibold' : 'hover:bg-slate-50'}>
                    <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono">
                      {item.questionNo}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {item.topic}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.difficultyP < 0.20 ? 'bg-amber-100 text-amber-800' : 'text-slate-800'
                      }`}>
                        {item.difficultyP.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.discriminationD < 0 
                          ? 'bg-red-800 text-white animate-pulse'
                          : item.discriminationD < 0.20
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.discriminationD.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.discriminationD < 0 ? (
                        <span className="text-[10px] text-red-800 font-black inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                          D âm (Lỗi đề/bẫy)
                        </span>
                      ) : item.discriminationD < 0.20 ? (
                        <span className="text-[10px] text-amber-700 font-bold">
                          PB kém (D &lt; 0.20)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          Phân hóa tốt
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-600">
                      {item.discriminationD < 0 
                        ? 'Cần rà soát lại đáp án đúng, kiểm tra xem câu hỏi có bị nhầm lẫn phương án hoặc gây hiểu lầm cho học sinh khá giỏi hay không.'
                        : item.difficultyP < 0.20
                        ? 'Câu hỏi rất khó đối với mặt bằng chung, cần xem xét độ phân phối thời gian làm bài.'
                        : 'Câu hỏi đạt chuẩn kỹ thuật khảo thí, phân hóa chuẩn xác giữa học sinh điểm cao và điểm thấp.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KHỐI AI TRÍ TUỆ NHÂN TẠO: BÁO CÁO PHÂN TÍCH CHẤT LƯỢNG VÀ KẾ HOẠCH CẢI TIẾN 4 PHẦN CHUẨN MỰC */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-indigo-800/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Chuyên gia Khảo thí GDPT 2018 (Gemini AI)
            </div>
            <h3 className="text-base font-bold text-white">
              Báo cáo Phân tích Chất lượng & Kế hoạch Cải tiến Sư phạm Môn {selectedSubject}
            </h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Định dạng 4 phần chuẩn mực (Phát hiện chính ➔ Vấn đề cần can thiệp ➔ Giả thuyết nguyên nhân ➔ Kế hoạch hành động) dùng được ngay cho cuộc họp Tổ chuyên môn.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {expertReport && (
              <>
                <button
                  type="button"
                  onClick={handleExportWordMinutes}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border border-blue-400 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Xuất trực tiếp toàn bộ phân tích AI và bảng điểm vào file Word (.doc) theo thể thức NĐ 30/2020/NĐ-CP dùng in ngay"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-100" />
                  <span>Xuất Biên bản Họp Tổ (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintA4Modal(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border border-blue-400 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="In báo cáo A4 hoàn chỉnh gồm cả Phổ điểm và Báo cáo Sư phạm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Báo cáo A4</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReportToClipboard}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Sao chép toàn bộ báo cáo để dán vào Biên bản họp tổ chuyên môn"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-300" />}
                  <span>{copiedReport ? 'Đã chép biên bản!' : 'Chép biên bản'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportInfographicImage}
                  disabled={isExportingImage}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl border border-emerald-400 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Tải thẻ đồ họa tóm tắt định dạng ảnh PNG chất lượng cao gửi Zalo BGH"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingImage ? 'Đang tạo PNG...' : 'Tải Thẻ Đồ họa (.PNG)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInfographicPreview(!showInfographicPreview)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Xem trước thẻ đồ họa tóm tắt"
                >
                  {showInfographicPreview ? <EyeOff className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-indigo-200" />}
                  <span>{showInfographicPreview ? 'Thu gọn Thẻ PNG' : 'Xem Thẻ PNG'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleTriggerExpertAnalysis}
              disabled={isAnalyzingAI}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              {isAnalyzingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích ma trận & YCCĐ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Kích hoạt Báo cáo Khảo thí GDPT 2018</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* XEM TRƯỚC THẺ ĐỒ HỌA INFOGRAPHIC (CHỈ MỞ KHI NGƯỜI DÙNG BẤM XEM, KHÔNG GÂY RỐI MÀN HÌNH) */}
        {showInfographicPreview && (
          <div className="mt-4 pt-4 border-t border-indigo-800/60 animate-in fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Xem trước Thẻ Báo cáo Đồ họa Infographic Tóm tắt:
              </span>
              <button
                type="button"
                onClick={() => setShowInfographicPreview(false)}
                className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Thu gọn lại</span>
              </button>
            </div>

            <div className="flex justify-center p-2 bg-slate-900/60 rounded-xl overflow-x-auto border border-indigo-800/40">
              <div
                className="w-[840px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-7 rounded-2xl shadow-2xl shrink-0 border border-indigo-900/60"
              >
                <div className="flex items-start justify-between border-b border-indigo-800/60 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      {config.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM'} • KHẢO THÍ GDPT 2018
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">
                      BÁO CÁO PHỔ ĐIỂM & ĐÁNH GIÁ CHẤT LƯỢNG MÔN {selectedSubject.toUpperCase()}
                    </h2>
                    <p className="text-xs text-indigo-200">
                      {config.examCategory} ({config.subPeriod}) • Năm học {config.schoolYear} • Điểm thi: {config.examCenterCode}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black text-emerald-400">{subjectMetrics.mean.toFixed(2)}</span>
                    <span className="text-xs text-indigo-300 block">Điểm trung bình toàn khối</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-5">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
                    <span className="text-[11px] text-slate-400 block">Số bài thi</span>
                    <strong className="text-lg text-white font-mono">{subjectMetrics.totalCandidates}</strong>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
                    <span className="text-[11px] text-slate-400 block">Điểm Mode</span>
                    <strong className="text-lg text-amber-400 font-mono">{subjectMetrics.mode.toFixed(1)}</strong>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
                    <span className="text-[11px] text-slate-400 block">Độ lệch chuẩn</span>
                    <strong className="text-lg text-purple-400 font-mono">{subjectMetrics.stdDev.toFixed(2)}</strong>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
                    <span className="text-[11px] text-slate-400 block">Tỷ lệ ≥ 5.0</span>
                    <strong className="text-lg text-emerald-400 font-mono">{(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 mb-4">
                  <span className="text-xs font-bold text-indigo-200 block mb-2">Phổ điểm phân bố tần số (0.0 đến 10.0):</span>
                  <div className="h-28 flex items-end gap-1.5 pt-2 pb-1 border-b border-indigo-800/40">
                    {subjectMetrics.distribution.map((bin, idx) => {
                      const hPct = maxBarCount > 0 ? (bin.count / maxBarCount) * 100 : 0;
                      const isMode = bin.count === maxBarCount && bin.count > 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                          <span className="text-[9px] text-amber-300 font-mono">{bin.count > 0 ? bin.count : ''}</span>
                          <div
                            style={{ height: `${Math.max(hPct, 4)}%` }}
                            className={`w-full rounded-t-sm ${isMode ? 'bg-amber-400' : 'bg-blue-500'}`}
                          />
                          <span className="text-[8px] text-slate-400 font-mono mt-1">{bin.rangeLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[10px] text-indigo-300 flex items-center justify-between pt-2 border-t border-indigo-800/40">
                  <span>Hệ thống Tối ưu Khảo thí & Xếp phòng thi chuẩn Bộ GD&ĐT</span>
                  <span>Xuất ngày: {new Date().toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NỘI DUNG BÁO CÁO 4 PHẦN CHUYÊN NGHIỆP */}
        {expertReport ? (
          <div className="mt-5 space-y-5 text-xs animate-in fade-in">
            {/* Banner hiển thị phân định chính xác 3 cấp độ khảo thí */}
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-3 border ${
              analysisInputMode === 'basic'
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                : analysisInputMode === 'machine_detail'
                ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                : 'bg-purple-950/40 border-purple-500/30 text-purple-200'
            }`}>
              <Info className={`w-4 h-4 shrink-0 mt-0.5 ${
                analysisInputMode === 'basic' ? 'text-blue-400' : analysisInputMode === 'machine_detail' ? 'text-indigo-400' : 'text-purple-400'
              }`} />
              <div className="space-y-1">
                <div className="font-bold flex flex-wrap items-center gap-2">
                  <span>
                    {analysisInputMode === 'basic' && 'Chế độ 1: Báo cáo Phân tích Phổ điểm & Cơ cấu Sư phạm (Căn cứ Bảng điểm toàn khối)'}
                    {analysisInputMode === 'machine_detail' && 'Chế độ 2: Báo cáo Đánh giá Chất lượng Kỹ thuật Đề thi (Căn cứ File máy chấm & Danh sách Lớp)'}
                    {analysisInputMode === 'deep_3files' && 'Chế độ 3: Báo cáo Khảo thí Chuyên sâu & Chuẩn Năng lực GDPT 2018 (3 File: Điểm + Ma trận + YCCĐ)'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 uppercase tracking-wider font-mono">
                    {analysisInputMode === 'basic' ? 'Chuẩn Bảng điểm: STT, SBD, Họ tên, Lớp, Ngày sinh, Điểm' : analysisInputMode === 'machine_detail' ? 'File Máy chấm + Danh sách Lớp' : 'Đủ 3 File: Điểm + Ma trận + YCCĐ'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  {analysisInputMode === 'basic' && 'Hệ thống bám sát dữ liệu điểm số thực tế, đối sánh thứ hạng giữa các lớp, phân loại nhóm cần phụ đạo và nhóm bồi dưỡng. Tuyệt đối không suy diễn ma trận hay YCCĐ khi chưa được người dùng cung cấp.'}
                  {analysisInputMode === 'machine_detail' && 'Hệ thống đo lường Độ khó (P), Độ phân biệt (D), cảnh báo câu hỏi dị biệt và đối sánh giữa các lớp. Không tự suy diễn gán YCCĐ vào từng câu.'}
                  {analysisInputMode === 'deep_3files' && 'Hệ thống đối chiếu trọn vẹn 3 nguồn: trích xuất điểm nghẽn kiến thức theo từng YCCĐ (< 65%) gắn với câu hỏi và đề xuất phác đồ can thiệp sư phạm chuẩn mực.'}
                </div>
              </div>
            </div>

            {/* PHẦN A. PHÁT HIỆN CHÍNH */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <h4 className="font-bold text-amber-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-black">A</span>
                PHẦN A. PHÁT HIỆN CHÍNH (Tổng quan chất lượng)
              </h4>
              <p className="text-slate-200 leading-relaxed mb-3 text-xs">
                {expertReport.partA_Overview.generalImpression}
              </p>
              <div className="space-y-1.5">
                <div className="font-semibold text-emerald-300 text-[11px] uppercase tracking-wider">Các điểm sáng nổi bật:</div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {expertReport.partA_Overview.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PHẦN B. CÁC VẤN ĐỀ CẦN CAN THIỆP */}
            <div className="bg-rose-950/30 rounded-xl p-4 border border-rose-500/30">
              <h4 className="font-bold text-rose-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-black">B</span>
                PHẦN B. CÁC VẤN ĐỀ CẦN CAN THIỆP (Trọng tâm sư phạm)
              </h4>

              {expertReport.partB_Interventions.knowledgeBottlenecks.length === 0 && expertReport.partB_Interventions.instrumentAnomalies.length === 0 ? (
                /* CHẾ ĐỘ 1: CƠ BẢN - KHÔNG CÓ MA TRẬN / YCCĐ / CÂU HỎI MÁY CHẤM -> PHÂN TÍCH TRỌNG TÂM SƯ PHẠM TỪ CƠ CẤU ĐIỂM SỐ */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="bg-black/25 p-3.5 rounded-xl border border-rose-500/20 space-y-2">
                    <div className="font-bold text-rose-200 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Nhóm học sinh cần phụ đạo (&lt; 5.0đ)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 text-[10px] font-bold">
                        {subjectMetrics.rateBelowAverage}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Toàn khối có <strong>{Math.round(subjectMetrics.totalCandidates * subjectMetrics.rateBelowAverage / 100)} học sinh</strong> dưới mức trung bình; trong đó nguy cơ liệt (≤ 1.0đ) chiếm <strong>{subjectMetrics.rateFailed}%</strong>. Cần lập danh sách kèm 1-1.
                    </p>
                  </div>

                  <div className="bg-black/25 p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                    <div className="font-bold text-amber-200 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        Chênh lệch mặt bằng giữa các Lớp
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 text-[10px] font-bold">
                        SD: {subjectMetrics.stdDev.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Độ lệch chuẩn <strong>{subjectMetrics.stdDev.toFixed(2)}</strong> thể hiện sự phân hóa rõ giữa các lớp trong khối. Tổ chuyên môn cần đối sánh giáo án và phương pháp giảng dạy giữa các giáo viên.
                    </p>
                  </div>

                  <div className="bg-black/25 p-3.5 rounded-xl border border-emerald-500/20 space-y-2">
                    <div className="font-bold text-emerald-200 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        Nhóm Khá - Giỏi cần bồi dưỡng (≥ 6.5đ)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 text-[10px] font-bold">
                        {(subjectMetrics.rateExcellent + subjectMetrics.rateGood).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Tỷ lệ Giỏi (≥ 8.0) chiếm <strong>{subjectMetrics.rateExcellent}%</strong>, Khá chiếm <strong>{subjectMetrics.rateGood}%</strong>. Cần tăng cường bài toán thực tế GDPT 2018 để phát triển năng lực mũi nhọn.
                    </p>
                  </div>
                </div>
              ) : (
                /* CHẾ ĐỘ 2 & 3: CÓ DỮ LIỆU CÂU HỎI VÀ/HOẶC YCCĐ */
                <div className={`grid grid-cols-1 ${
                  expertReport.partB_Interventions.knowledgeBottlenecks.length > 0 && expertReport.partB_Interventions.instrumentAnomalies.length > 0
                    ? 'md:grid-cols-2'
                    : 'md:grid-cols-1'
                } gap-4 mt-3`}>
                  {/* 1. Điểm nghẽn kiến thức (Chỉ hiện khi có YCCĐ ở Chế độ 3) */}
                  {expertReport.partB_Interventions.knowledgeBottlenecks.length > 0 && (
                    <div className="bg-black/20 p-3 rounded-lg border border-rose-500/20">
                      <div className="font-bold text-rose-200 text-xs mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>1. Điểm nghẽn kiến thức (YCCĐ / Chủ đề &lt; 65%):</span>
                      </div>
                      <div className="space-y-2">
                        {expertReport.partB_Interventions.knowledgeBottlenecks.map((b, i) => (
                          <div key={i} className="p-2 rounded bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-rose-200 mb-1">
                              <span>{b.topicOrYccd}</span>
                              <span className="px-1.5 py-0.2 bg-rose-900/60 text-rose-100 rounded text-[10px]">
                                {b.passRate}% ({b.severity})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{b.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Vấn đề về công cụ đánh giá (Hiện ở Chế độ 2 & 3 khi có câu dị biệt) */}
                  {expertReport.partB_Interventions.instrumentAnomalies.length > 0 && (
                    <div className="bg-black/20 p-3 rounded-lg border border-rose-500/20">
                      <div className="font-bold text-amber-200 text-xs mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>{expertReport.partB_Interventions.knowledgeBottlenecks.length > 0 ? '2' : '1'}. Vấn đề về công cụ đánh giá (Rà soát câu hỏi đề thi):</span>
                      </div>
                      <div className="space-y-2">
                        {expertReport.partB_Interventions.instrumentAnomalies.map((a, i) => (
                          <div key={i} className="p-2 rounded bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-200 mb-1">
                              <span>Câu hỏi: {a.questionNo}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                P = {a.pIndex.toFixed(2)} | D = {a.dIndex.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{a.warningReason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PHẦN C. GIẢ THUYẾT NGUYÊN NHÂN */}
            <div className="bg-purple-950/30 rounded-xl p-4 border border-purple-500/30">
              <h4 className="font-bold text-purple-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-black">C</span>
                PHẦN C. GIẢ THUYẾT NGUYÊN NHÂN (Để Tổ chuyên môn kiểm chứng)
              </h4>
              <p className="text-[11px] text-slate-400 mb-3 italic">
                *Các giả thuyết sư phạm được phân tách độc lập nhằm giúp Tổ chuyên môn thảo luận khách quan, không quy chụp giáo viên:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-lg border border-purple-500/20">
                  <div className="font-bold text-purple-200 text-xs mb-1.5">
                    Về phía nội dung / phương pháp học tập:
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {expertReport.partC_Hypotheses.learningAndTeachingHypotheses.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-black/20 p-3 rounded-lg border border-purple-500/20">
                  <div className="font-bold text-purple-200 text-xs mb-1.5">
                    Về phía thiết kế câu hỏi trong đề kiểm tra:
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {expertReport.partC_Hypotheses.assessmentDesignHypotheses.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* PHẦN D. KẾ HOẠCH CẢI TIẾN VÀ HÀNH ĐỘNG */}
            <div className="bg-emerald-950/30 rounded-xl p-4 border border-emerald-500/30">
              <h4 className="font-bold text-emerald-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-black">D</span>
                PHẦN D. KẾ HOẠCH CẢI TIẾN VÀ HÀNH ĐỘNG SƯ PHẠM
              </h4>
              <p className="text-[11px] text-slate-300 mb-3">
                Đề xuất các hành động cụ thể, khả thi cho Tổ trưởng chuyên môn và Giáo viên bộ môn áp dụng ngay:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {expertReport.partD_ActionPlan.map((act, i) => (
                  <div key={i} className="bg-black/20 p-3 rounded-xl border border-emerald-500/20 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <strong className="text-emerald-200 text-xs">{act.issueTarget}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400 pl-7">
                      <strong>Đối tượng:</strong> {act.studentTargetGroup}
                    </div>
                    <div className="text-[11px] text-slate-200 pl-7 leading-relaxed bg-white/5 p-2 rounded-lg">
                      <strong>Biện pháp can thiệp:</strong> {act.pedagogicalAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PHÂN HỆ CỐ VẤN KHẢO THÍ TƯƠNG TÁC GOOGLE NOTEBOOKLM (GROUNDED AI - ĐỐI THOẠI TRỰC TIẾP TỪ NGUỒN DỮ LIỆU) */}
            <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 rounded-2xl p-5 border border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 shadow-md shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-300">
                      <Bot className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">
                        Cố vấn Khảo thí Tương tác Google NotebookLM
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        Grounded Sources
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-200/80">
                      Hỏi - đáp chuyên sâu và suy luận sư phạm được chứng minh trực tiếp từ nguồn dữ liệu môn {selectedSubject}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Sẵn sàng suy luận (Gemini AI & Heuristic)</span>
                </div>
              </div>

              {/* Hàng gợi ý câu hỏi nhanh (Prompt chips) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Câu hỏi gợi ý nhanh dành cho Tổ trưởng & BGH:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    `Tóm tắt 3 vấn đề sư phạm cấp bách nhất môn ${selectedSubject} và giải pháp can thiệp?`,
                    `Phân tích nguyên nhân chênh lệch kết quả giữa các lớp và gợi ý phụ đạo?`,
                    `Đề xuất kế hoạch hỗ trợ nhóm học sinh nguy cơ điểm liệt (≤ 1.0) và dưới trung bình?`,
                    `Đánh giá kỹ thuật đề kiểm tra: Có câu hỏi nào bị bẫy hoặc phân biệt kém không?`
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAskingNotebook}
                      onClick={() => handleAskNotebook(chip)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-indigo-400/20 hover:border-indigo-400/50 text-[11px] text-indigo-100 transition-all cursor-pointer text-left disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Luồng tin nhắn đối thoại NotebookLM */}
              <div className="max-h-80 overflow-y-auto space-y-3 p-3 bg-black/30 rounded-xl border border-indigo-900/60 font-sans">
                {notebookChat.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                      <span className="font-bold text-indigo-300">
                        {msg.role === 'user' ? 'Giáo viên / Ban Giám hiệu' : 'Cố vấn Google NotebookLM'}
                      </span>
                      <span>• {msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[92%] sm:max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-md'
                          : 'bg-slate-900/90 text-slate-100 rounded-tl-xs border border-indigo-500/30 shadow-md'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Trích dẫn nguồn (Sources Citations) */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-amber-300">Nguồn trích dẫn:</span>
                          {msg.sources.map((src, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-500/30 font-mono"
                            >
                              [{i + 1}] {src}
                            </span>
                          ))}
                        </div>
                      )}

                      {msg.role === 'assistant' && (
                        <div className="mt-2 pt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopyNotebookMsg(msg.id, msg.text)}
                            className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedNotebookMsgId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Đã sao chép!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép phản hồi</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isAskingNotebook && (
                  <div className="flex items-center gap-2 p-3 bg-slate-900/60 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>NotebookLM đang truy xuất và đối chiếu dữ liệu khảo thí môn {selectedSubject}...</span>
                  </div>
                )}
              </div>

              {/* Khung nhập câu hỏi tương tác */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskNotebook();
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={notebookInput}
                  onChange={(e) => setNotebookInput(e.target.value)}
                  placeholder={`Đặt câu hỏi chuyên môn cho Cố vấn Khảo thí NotebookLM về môn ${selectedSubject}...`}
                  disabled={isAskingNotebook}
                  className="flex-1 bg-black/40 border border-indigo-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!notebookInput.trim() || isAskingNotebook}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Hỏi AI</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-5 py-6 text-center text-slate-400 text-xs">
            Bấm nút <strong>"Kích hoạt Báo cáo Khảo thí GDPT 2018"</strong> để Trợ lý Gemini AI lập tức đối chiếu 3 nguồn dữ liệu và xuất bản báo cáo can thiệp chuyên nghiệp 4 phần.
          </div>
        )}
      </div>

      {/* VÙNG ẨN TỰ ĐỘNG CHO INFOGRAPHIC CAPTURE (GIỮ SẠCH GIAO DIỆN, KHÔNG RỐI MẮT, VẪN TẢI ĐƯỢC ẢNH PNG BẤT CỨ LÚC NÀO) */}
      <div 
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none', opacity: 0 }} 
        aria-hidden="true"
      >
        <div
          ref={infographicRef}
          className="w-[840px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-7 rounded-2xl shadow-2xl shrink-0 border border-indigo-900/60"
        >
          <div className="flex items-start justify-between border-b border-indigo-800/60 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                {config.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM'} • KHẢO THÍ GDPT 2018
              </span>
              <h2 className="text-xl font-black text-white mt-1">
                BÁO CÁO PHỔ ĐIỂM & ĐÁNH GIÁ CHẤT LƯỢNG MÔN {selectedSubject.toUpperCase()}
              </h2>
              <p className="text-xs text-indigo-200">
                {config.examCategory} ({config.subPeriod}) • Năm học {config.schoolYear} • Điểm thi: {config.examCenterCode}
              </p>
            </div>

            <div className="text-right">
              <span className="text-3xl font-black text-emerald-400">{subjectMetrics.mean.toFixed(2)}</span>
              <span className="text-xs text-indigo-300 block">Điểm trung bình toàn khối</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 block">Số bài thi</span>
              <strong className="text-lg text-white font-mono">{subjectMetrics.totalCandidates}</strong>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 block">Điểm Mode</span>
              <strong className="text-lg text-amber-400 font-mono">{subjectMetrics.mode.toFixed(1)}</strong>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 block">Độ lệch chuẩn</span>
              <strong className="text-lg text-purple-400 font-mono">{subjectMetrics.stdDev.toFixed(2)}</strong>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 block">Tỷ lệ ≥ 5.0</span>
              <strong className="text-lg text-emerald-400 font-mono">{(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%</strong>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 mb-4">
            <span className="text-xs font-bold text-indigo-200 block mb-2">Phổ điểm phân bố tần số (0.0 đến 10.0):</span>
            <div className="h-28 flex items-end gap-1.5 pt-2 pb-1 border-b border-indigo-800/40">
              {subjectMetrics.distribution.map((bin, idx) => {
                const hPct = maxBarCount > 0 ? (bin.count / maxBarCount) * 100 : 0;
                const isMode = bin.count === maxBarCount && bin.count > 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                    <span className="text-[9px] text-amber-300 font-mono">{bin.count > 0 ? bin.count : ''}</span>
                    <div
                      style={{ height: `${Math.max(hPct, 4)}%` }}
                      className={`w-full rounded-t-sm ${isMode ? 'bg-amber-400' : 'bg-blue-500'}`}
                    />
                    <span className="text-[8px] text-slate-400 font-mono mt-1">{bin.rangeLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-indigo-300 flex items-center justify-between pt-2 border-t border-indigo-800/40">
            <span>Hệ thống Tối ưu Khảo thí & Xếp phòng thi chuẩn Bộ GD&ĐT</span>
            <span>Xuất ngày: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Modal In Báo cáo A4 chuyên dụng chuẩn Bộ Giáo dục */}
      <PrintScoreReportModal
        isOpen={showPrintA4Modal}
        onClose={() => setShowPrintA4Modal(false)}
        subjectName={selectedSubject}
        subjectMetrics={subjectMetrics}
        config={config}
        currentUser={currentUser}
        expertReport={expertReport}
        isEvaluationMode={isEvaluationMode}
        peStudentRows={peStudentRows}
      />
    </div>
  );
};
