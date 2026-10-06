import * as XLSX from 'xlsx';
import { ExamMatrixItem, ExamYccdItem, StudentScoreRow } from '../types';

export interface CandidateRosterItem {
  stt?: number;
  sbd: string;
  fullName: string;
  className: string;
  dob?: string;
}

/**
 * Cấu trúc định dạng đề thi chuẩn hóa theo Quyết định 764/QĐ-BGDĐT của Bộ GD&ĐT từ năm 2025
 */
export interface ExamStructureSpec {
  subjectName: string;
  part1Count: number;                 // Số câu Phần I: Trắc nghiệm 4 lựa chọn (0.25đ/câu)
  part2Count: number;                 // Số câu Phần II: Trắc nghiệm Đúng/Sai (tối đa 1.0đ/câu)
  part3Count: number;                 // Số câu Phần III: Trắc nghiệm Trả lời ngắn (0.5đ hoặc 0.25đ/câu)
  part1ScorePerQuestion: number;      // Thường là 0.25
  part2MaxScorePerQuestion: number;   // 1.00
  part2Elective?: {                   // Cấu trúc tự chọn Phần II (như môn Tin học)
    totalQuestions: number;           // 6 câu
    mandatoryCount: number;           // 2 câu bắt buộc chung (Câu 1, 2)
    electiveGroups: {
      groupName: string;
      questionIndices: number[];      // [3, 4] cho ICT hoặc [5, 6] cho CS
    }[];
  };
  part3ScorePerQuestion: number;      // 0.50 (Toán) hoặc 0.25 (Vật lí, Hóa học, Sinh học) hoặc 0 (các môn không có P3)
  totalQuestionsToGrade: number;      // Số câu tối đa học sinh làm (Toán: 22, Tin: 28, KHTN/KHXH: 28, Anh: 40)
  totalQuestionsInExam: number;       // Số câu có trong đề thi (Toán: 22, Tin: 30, KHTN/KHXH: 28, Anh: 40)
  totalScore: number;                 // 10.0
  formatDescription: string;
}

/**
 * Trả về đặc tả cấu trúc đề thi chính xác theo từng môn học theo Quyết định 764/QĐ-BGDĐT
 */
export function getExamStructureSpec(subjectName: string = 'Toán'): ExamStructureSpec {
  const norm = (subjectName || '').trim().toLowerCase();

  // 1. MÔN TOÁN: 22 câu (12 câu P1 + 4 câu P2 + 6 câu P3)
  if (norm.includes('toán') || norm.includes('toan')) {
    return {
      subjectName: 'Toán',
      part1Count: 12,
      part2Count: 4,
      part3Count: 6,
      part1ScorePerQuestion: 0.25,
      part2MaxScorePerQuestion: 1.00,
      part3ScorePerQuestion: 0.50,
      totalQuestionsToGrade: 22,
      totalQuestionsInExam: 22,
      totalScore: 10.0,
      formatDescription: 'Toán (22 câu: 12 MC + 4 Đ/S + 6 TLN)'
    };
  }

  // 2. MÔN TIN HỌC: 30 câu trong đề, thí sinh làm 28 câu = 10.0đ (24 câu P1 + 6 câu P2: 2 bắt buộc, 4 tự chọn ICT/CS; KHÔNG CÓ P3)
  if (norm.includes('tin') || norm.includes('informatics')) {
    return {
      subjectName: 'Tin học',
      part1Count: 24,
      part2Count: 6,
      part3Count: 0,
      part1ScorePerQuestion: 0.25,
      part2MaxScorePerQuestion: 1.00,
      part2Elective: {
        totalQuestions: 6,
        mandatoryCount: 2,
        electiveGroups: [
          { groupName: 'Tin học ứng dụng (ICT)', questionIndices: [3, 4] },
          { groupName: 'Khoa học máy tính (CS)', questionIndices: [5, 6] }
        ]
      },
      part3ScorePerQuestion: 0,
      totalQuestionsToGrade: 28,
      totalQuestionsInExam: 30,
      totalScore: 10.0,
      formatDescription: 'Tin học (Đề 30 câu, làm 28 câu: 24 MC + 6 Đ/S có tự chọn ICT/CS, không có TLN)'
    };
  }

  // 3. CÁC MÔN KHTN (VẬT LÍ, HÓA HỌC, SINH HỌC): 28 câu (18 câu P1 + 4 câu P2 + 6 câu P3)
  if (
    norm.includes('hóa') || norm.includes('hoa') ||
    norm.includes('lí') || norm.includes('vật lí') || norm.includes('vat ly') || norm.includes('ly') ||
    norm.includes('sinh') || norm.includes('biology')
  ) {
    let cleanName = 'Hóa học';
    if (norm.includes('lí') || norm.includes('ly')) cleanName = 'Vật lí';
    else if (norm.includes('sinh')) cleanName = 'Sinh học';

    return {
      subjectName: cleanName,
      part1Count: 18,
      part2Count: 4,
      part3Count: 6,
      part1ScorePerQuestion: 0.25,
      part2MaxScorePerQuestion: 1.00,
      part3ScorePerQuestion: 0.25,
      totalQuestionsToGrade: 28,
      totalQuestionsInExam: 28,
      totalScore: 10.0,
      formatDescription: `${cleanName} (28 câu: 18 MC + 4 Đ/S + 6 TLN)`
    };
  }

  // 4. CÁC MÔN KHXH & CÔNG NGHỆ (LỊCH SỬ, ĐỊA LÍ, GDKT&PL, CÔNG NGHỆ): 28 câu (24 câu P1 + 4 câu P2; KHÔNG CÓ P3)
  if (
    norm.includes('sử') || norm.includes('su') || norm.includes('lịch sử') ||
    norm.includes('địa') || norm.includes('dia') || norm.includes('địa lí') ||
    norm.includes('kinh tế') || norm.includes('pháp luật') || norm.includes('gdkt') || norm.includes('ktpl') ||
    norm.includes('công nghệ') || norm.includes('cong nghe')
  ) {
    let cleanName = 'Lịch sử';
    if (norm.includes('địa')) cleanName = 'Địa lí';
    else if (norm.includes('kinh tế') || norm.includes('gdkt') || norm.includes('ktpl')) cleanName = 'GDKT&PL';
    else if (norm.includes('công nghệ')) cleanName = 'Công nghệ';

    return {
      subjectName: cleanName,
      part1Count: 24,
      part2Count: 4,
      part3Count: 0,
      part1ScorePerQuestion: 0.25,
      part2MaxScorePerQuestion: 1.00,
      part3ScorePerQuestion: 0,
      totalQuestionsToGrade: 28,
      totalQuestionsInExam: 28,
      totalScore: 10.0,
      formatDescription: `${cleanName} (28 câu: 24 MC + 4 Đ/S, không có TLN)`
    };
  }

  // 5. MÔN NGOẠI NGỮ (TIẾNG ANH): 40 câu trắc nghiệm nhiều lựa chọn (KHÔNG CÓ P2, P3)
  if (norm.includes('anh') || norm.includes('english') || norm.includes('ngoại ngữ') || norm.includes('pháp') || norm.includes('trung')) {
    return {
      subjectName: 'Tiếng Anh',
      part1Count: 40,
      part2Count: 0,
      part3Count: 0,
      part1ScorePerQuestion: 0.25,
      part2MaxScorePerQuestion: 0,
      part3ScorePerQuestion: 0,
      totalQuestionsToGrade: 40,
      totalQuestionsInExam: 40,
      totalScore: 10.0,
      formatDescription: 'Tiếng Anh (40 câu MC nhiều lựa chọn, 0.25đ/câu)'
    };
  }

  // 6. MÔN NGỮ VĂN: Tự luận 100% (Phần I Đọc hiểu 4 câu 4.0đ; Phần II Viết 2 câu 6.0đ)
  if (norm.includes('văn') || norm.includes('van') || norm.includes('literature')) {
    return {
      subjectName: 'Ngữ văn',
      part1Count: 4,
      part2Count: 2,
      part3Count: 0,
      part1ScorePerQuestion: 1.00,
      part2MaxScorePerQuestion: 3.00,
      part3ScorePerQuestion: 0,
      totalQuestionsToGrade: 6,
      totalQuestionsInExam: 6,
      totalScore: 10.0,
      formatDescription: 'Ngữ văn (Tự luận: Phần I Đọc hiểu 4 câu 4.0đ; Phần II Viết 2 câu 6.0đ)'
    };
  }

  // Mặc định: 22 câu (cấu trúc môn Toán)
  return {
    subjectName,
    part1Count: 12,
    part2Count: 4,
    part3Count: 6,
    part1ScorePerQuestion: 0.25,
    part2MaxScorePerQuestion: 1.00,
    part3ScorePerQuestion: 0.50,
    totalQuestionsToGrade: 22,
    totalQuestionsInExam: 22,
    totalScore: 10.0,
    formatDescription: `${subjectName} (Chuẩn 2025: 12 MC + 4 Đ/S + 6 TLN)`
  };
}

/**
 * Tự động nội suy cấu trúc đề thi từ Ma trận đề thi đầu vào theo chuẩn GDPT 2018
 */
export function inferStructureFromMatrix(
  matrix: ExamMatrixItem[],
  fallbackSubject: string = 'Toán'
): ExamStructureSpec {
  if (!matrix || matrix.length === 0) {
    return getExamStructureSpec(fallbackSubject);
  }

  let p1Count = 0;
  let p2Count = 0;
  let p3Count = 0;

  matrix.forEach((item) => {
    const qNo = (item.questionNo || '').toUpperCase();
    const maxScore = item.maxScore || 0;
    
    if (qNo.startsWith('P1') || qNo.startsWith('MC') || qNo.startsWith('E_') || qNo.startsWith('ĐH') || (maxScore === 0.25 && !qNo.startsWith('P3') && !qNo.startsWith('P2'))) {
      p1Count++;
    } else if (qNo.startsWith('P2') || qNo.includes('ĐS') || qNo.includes('DS') || qNo.startsWith('VIET') || maxScore === 1.0 || maxScore === 2.0 || maxScore === 4.0) {
      p2Count++;
    } else if (qNo.startsWith('P3') || qNo.includes('TLN') || maxScore === 0.50 || (maxScore === 0.25 && qNo.startsWith('P3'))) {
      p3Count++;
    } else {
      if (maxScore <= 0.25) p1Count++;
      else if (maxScore <= 1.0) p2Count++;
      else p3Count++;
    }
  });

  const baseSpec = getExamStructureSpec(fallbackSubject);
  const totalInExam = matrix.length;
  const isTinHoc = fallbackSubject.toLowerCase().includes('tin') || (p1Count === 24 && p2Count === 6 && p3Count === 0);

  return {
    ...baseSpec,
    subjectName: fallbackSubject,
    part1Count: p1Count,
    part2Count: p2Count,
    part3Count: p3Count,
    totalQuestionsInExam: totalInExam,
    totalQuestionsToGrade: isTinHoc ? 28 : totalInExam,
    formatDescription: isTinHoc 
      ? 'Tin học (Đề 30 câu, làm 28 câu: 24 MC + 6 Đ/S có tự chọn ICT/CS, không có TLN)'
      : `${fallbackSubject} (${totalInExam} câu: ${p1Count} câu P1 + ${p2Count} câu P2${p3Count > 0 ? ` + ${p3Count} câu P3` : ''})`
  };
}

/**
 * Ma trận 22 câu chuẩn cấu trúc định dạng đề thi tốt nghiệp THPT từ năm 2025 của Bộ GD&ĐT (Môn Toán)
 */
export const MATH_2025_EXAM_MATRIX: ExamMatrixItem[] = [
  // Phần I: 12 câu nhiều lựa chọn
  { questionNo: 'P1_C01', topic: 'Hàm số: Tính đơn điệu', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C02', topic: 'Hàm số: Điểm cực trị đồ thị', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C03', topic: 'Hàm số: Đường tiệm cận đứng, ngang', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C04', topic: 'Hàm số: GTLN - GTNN trên đoạn', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C05', topic: 'Khảo sát hàm số: Nhận dạng bảng biến thiên', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C06', topic: 'Vectơ trong không gian: Tọa độ điểm', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P1_C07', topic: 'Hệ tọa độ Oxyz: Tọa độ vectơ tổng', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P1_C08', topic: 'Hệ tọa độ Oxyz: Tích vô hướng hai vectơ', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P1_C09', topic: 'Thống kê: Khoảng biến thiên mẫu số liệu', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P1_C10', topic: 'Thống kê: Khoảng tứ phân vị mẫu ghép nhóm', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P1_C11', topic: 'Thống kê: Phương sai và độ lệch chuẩn', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P1_C12', topic: 'Ứng dụng thực tế: Độ lệch chuẩn trong sản xuất', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-04' },

  // Phần II: 4 câu Đúng/Sai (Mỗi câu 4 lệnh hỏi)
  { questionNo: 'P2_C01', topic: 'Khảo sát sự biến thiên & Vẽ đồ thị hàm số', thinkingLevel: 'Hiểu', maxScore: 1.00, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P2_C02', topic: 'Ứng dụng đạo hàm giải bài toán tối ưu thực tế', thinkingLevel: 'Vận dụng', maxScore: 1.00, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P2_C03', topic: 'Vectơ & Toạ độ Oxyz trong mô hình không gian', thinkingLevel: 'Vận dụng', maxScore: 1.00, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P2_C04', topic: 'Phân tích số liệu thống kê & Đo mức độ phân tán', thinkingLevel: 'Hiểu', maxScore: 1.00, yccdCode: 'YCCD-TOAN12-04' },

  // Phần III: 6 câu Trả lời ngắn
  { questionNo: 'P3_C01', topic: 'Tìm vận tốc tức thời lớn nhất của chuyển động', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P3_C02', topic: 'Tối ưu hoá thể tích hình hộp chữ nhật', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P3_C03', topic: 'Độ lớn hợp lực của các vectơ trong không gian', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P3_C04', topic: 'Tính giá trị độ lệch chuẩn của số liệu ghép nhóm', thinkingLevel: 'Hiểu', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P3_C05', topic: 'Bài toán kinh tế tối ưu hoá chi phí sản xuất', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P3_C06', topic: 'Khoảng cách giữa hai vật thể chuyển động trong Oxyz', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-03' },
];

/**
 * Bản ghi điểm máy chấm trắc nghiệm
 */
export interface MachineScoreRecord {
  stt: number;
  fullName: string;
  sbd: string;
  examCode: string;
  dob: string;
  className: string;
  score: number | null;
  status: 'present' | 'absent_vt' | 'not_registered';
  answersPart1: string[];
  answersPart2: string[];
  answersPart3: string[];
  gradePart1: number[];
  gradePart2: number[];
  gradePart3: number[];
}

/**
 * Tạo ma trận động thích ứng theo đúng cấu trúc môn học hoặc kế thừa từ ma trận người dùng nạp
 */
export function generateDynamicMatrix(
  subjectName: string,
  spec: ExamStructureSpec,
  existingMatrix?: ExamMatrixItem[]
): ExamMatrixItem[] {
  if (existingMatrix && existingMatrix.length > 0) {
    return existingMatrix;
  }

  const items: ExamMatrixItem[] = [];

  // 1. Phần I
  for (let i = 1; i <= spec.part1Count; i++) {
    const qKey = `P1_C${String(i).padStart(2, '0')}`;
    let thinking: 'Biết' | 'Hiểu' | 'Vận dụng' = 'Biết';
    if (i > spec.part1Count * 0.6) thinking = 'Vận dụng';
    else if (i > spec.part1Count * 0.3) thinking = 'Hiểu';

    items.push({
      questionNo: qKey,
      topic: `${subjectName}: Kiến thức cốt lõi câu ${i}`,
      thinkingLevel: thinking,
      maxScore: spec.part1ScorePerQuestion,
      yccdCode: `YCCD-${subjectName.toUpperCase().slice(0, 3)}-P1`
    });
  }

  // 2. Phần II
  for (let i = 1; i <= spec.part2Count; i++) {
    const qKey = `P2_C${String(i).padStart(2, '0')}`;
    let topicName = `${subjectName}: Câu hỏi Đúng/Sai câu ${i}`;

    if (spec.part2Elective) {
      if (i <= spec.part2Elective.mandatoryCount) {
        topicName = `${subjectName}: Phần chung bắt buộc (Câu ${i})`;
      } else if (i === 3 || i === 4) {
        topicName = `${subjectName}: Tự chọn Tin học ứng dụng ICT (Câu ${i})`;
      } else {
        topicName = `${subjectName}: Tự chọn Khoa học máy tính CS (Câu ${i})`;
      }
    }

    items.push({
      questionNo: qKey,
      topic: topicName,
      thinkingLevel: i % 2 === 1 ? 'Hiểu' : 'Vận dụng',
      maxScore: spec.part2MaxScorePerQuestion,
      yccdCode: `YCCD-${subjectName.toUpperCase().slice(0, 3)}-P2`
    });
  }

  // 3. Phần III (nếu có)
  for (let i = 1; i <= spec.part3Count; i++) {
    const qKey = `P3_C${String(i).padStart(2, '0')}`;
    items.push({
      questionNo: qKey,
      topic: `${subjectName}: Bài toán trả lời ngắn câu ${i}`,
      thinkingLevel: i > 4 ? 'Vận dụng cao' : 'Vận dụng',
      maxScore: spec.part3ScorePerQuestion,
      yccdCode: `YCCD-${subjectName.toUpperCase().slice(0, 3)}-P3`
    });
  }

  return items;
}

/**
 * 24 học sinh mẫu chuẩn để sinh dữ liệu máy chấm trắc nghiệm
 */
const SAMPLE_STUDENT_BASE = [
  { stt: 1, name: 'HOÀNG ĐỨC TRÍ AN', sbd: '52028748', code: '0107', dob: '06/01/2008', cls: '12A1', ability: 0.72 },
  { stt: 2, name: 'LÊ NHẬT HÀ CHÂU', sbd: '52028799', code: '0109', dob: '03/12/2008', cls: '12A1', ability: 0.88 },
  { stt: 3, name: 'ĐẶNG KIM CHI', sbd: '52028803', code: '0108', dob: '22/02/2008', cls: '12A1', ability: 0.75 },
  { stt: 4, name: 'NGUYỄN NGỌC LAN CHI', sbd: '52028805', code: '0107', dob: '30/11/2008', cls: '12A1', ability: 0.70 },
  { stt: 5, name: 'BÙI THỊ BÍCH CHƯ', sbd: '52028811', code: '0111', dob: '30/08/2008', cls: '12A2', ability: 0.62 },
  { stt: 6, name: 'HUỲNH THỊ NGỌC DIỄM', sbd: '52028819', code: '0110', dob: '31/10/2008', cls: '12A2', ability: 0.85 },
  { stt: 7, name: 'TRẦN NGỌC ÁNH DƯƠNG', sbd: '52028822', code: '0112', dob: '15/04/2008', cls: '12A2', ability: 0.78 },
  { stt: 8, name: 'LÊ THỊ BÍCH DUYÊN', sbd: '52028824', code: '0107', dob: '05/09/2008', cls: '12A2', ability: 0.65 },
  { stt: 9, name: 'VÕ HUỲNH NGỌC ĐIỆP', sbd: '52028833', code: '0108', dob: '26/02/2008', cls: '12A3', ability: 0.55 },
  { stt: 10, name: 'HOÀNG TRẦN ANH ĐỨC', sbd: '52028836', code: '0107', dob: '10/05/2008', cls: '12A3', ability: 0.72 },
  { stt: 11, name: 'LÊ HUỲNH ANH ĐỨC', sbd: '52028838', code: '0111', dob: '14/09/2008', cls: '12A3', ability: 0.68 },
  { stt: 12, name: 'LÊ MINH ĐỨC', sbd: '52028842', code: '0110', dob: '28/11/2008', cls: '12A3', ability: 0.80 },
  { stt: 13, name: 'NGUYỄN HUỲNH ĐỨC', sbd: '52028845', code: '0108', dob: '04/07/2008', cls: '12A4', ability: 0.60 },
  { stt: 14, name: 'PHAN LÊ ANH ĐỨC', sbd: '52028848', code: '0109', dob: '18/03/2008', cls: '12A4', ability: 0.82 },
  { stt: 15, name: 'PHAN VĂN ANH ĐỨC', sbd: '52028852', code: '0113', dob: '22/10/2008', cls: '12A4', ability: 0.58 },
  { stt: 16, name: 'NGUYỄN THỊ NGỌC GIÀU', sbd: '52028856', code: '0112', dob: '09/01/2008', cls: '12A4', ability: 0.76 },
  { stt: 17, name: 'TRẦN NGỌC HÂN', sbd: '52028858', code: '0107', dob: '11/03/2008', cls: '12A1', ability: 0.65 },
  { stt: 18, name: 'TRẦN GIA HÂN', sbd: '52028864', code: '0108', dob: '24/09/2008', cls: '12A2', ability: 0.80 },
  { stt: 19, name: 'LÊ NGUYỄN GIA HOÀNG', sbd: '52028886', code: '0111', dob: '08/04/2008', cls: '12A3', ability: 0.64 },
  { stt: 20, name: 'NGÔ THỊ THU HƯƠNG', sbd: '52028893', code: '0110', dob: '17/07/2008', cls: '12A4', ability: 0.70 },
  { stt: 21, name: 'NGUYỄN THANH HUYỀN', sbd: '52028951', code: '0109', dob: '12/05/2008', cls: '12A1', ability: 0.74 },
  { stt: 22, name: 'NGUYỄN ĐĂNG KHOA', sbd: '52028975', code: '0109', dob: '16/06/2008', cls: '12A2', ability: 0.62 },
  { stt: 23, name: 'TRẦN ĐĂNG KHOA', sbd: '52028978', code: '0109', dob: '20/02/2008', cls: '12A3', ability: 0.66 },
  { stt: 24, name: 'PHÙNG THỊ THÙY LINH', sbd: '52029010', code: '0113', dob: '13/08/2008', cls: '12A4', ability: 0.85 }
];

/**
 * Sinh danh sách bản ghi máy chấm chuẩn xác theo cấu trúc của môn học
 */
export function generateSampleMachineRecordsForSubject(subjectName: string = 'Toán'): MachineScoreRecord[] {
  const spec = getExamStructureSpec(subjectName);
  const options = ['A', 'B', 'C', 'D'];
  const dsCombinations = ['DDDD', 'DDDS', 'DDSD', 'DSDD', 'SDDD', 'DDSS', 'DSSD', 'SSDD', 'DSSS', 'SDSS', 'SSDS', 'SSSD'];

  return SAMPLE_STUDENT_BASE.map((stu, sIdx) => {
    // 1. Sinh Phần I
    const answersPart1: string[] = [];
    const gradePart1: number[] = [];
    let p1Points = 0;

    for (let i = 0; i < spec.part1Count; i++) {
      const choice = options[(sIdx * 3 + i * 2) % 4];
      answersPart1.push(choice);
      const isCorrect = (sIdx + i) % 7 !== 0 && (sIdx % 3 !== 0 || i < spec.part1Count * 0.7);
      const val = isCorrect ? 1 : 0;
      gradePart1.push(val);
      if (val === 1) p1Points += spec.part1ScorePerQuestion;
    }

    // 2. Sinh Phần II
    const answersPart2: string[] = [];
    const gradePart2: number[] = [];
    let p2Points = 0;

    // Riêng môn Tin học: 6 câu Đúng/Sai (câu 1, 2 bắt buộc; câu 3, 4 ICT; câu 5, 6 CS)
    const isTinHoc = spec.part2Elective !== undefined;
    const picksICT = sIdx % 2 === 0; // Học sinh chẵn chọn ICT, học sinh lẻ chọn CS

    for (let i = 0; i < spec.part2Count; i++) {
      if (isTinHoc) {
        if (i === 2 || i === 3) {
          // Nhóm ICT: Nếu học sinh không chọn ICT -> để trống 'K' và điểm 0
          if (!picksICT) {
            answersPart2.push('K');
            gradePart2.push(0);
            continue;
          }
        } else if (i === 4 || i === 5) {
          // Nhóm CS: Nếu học sinh không chọn CS -> để trống 'K' và điểm 0
          if (picksICT) {
            answersPart2.push('K');
            gradePart2.push(0);
            continue;
          }
        }
      }

      const ds = dsCombinations[(sIdx + i * 3) % dsCombinations.length];
      answersPart2.push(ds);

      let correctStatements = 3;
      if (stu.ability > 0.8) correctStatements = 4;
      else if (stu.ability > 0.65) correctStatements = (sIdx + i) % 2 === 0 ? 3 : 4;
      else if (stu.ability > 0.55) correctStatements = 2;
      else correctStatements = 1;

      gradePart2.push(correctStatements);

      if (correctStatements === 1) p2Points += 0.10;
      else if (correctStatements === 2) p2Points += 0.25;
      else if (correctStatements === 3) p2Points += 0.50;
      else if (correctStatements >= 4) p2Points += 1.00;
    }

    // 3. Sinh Phần III (nếu có)
    const answersPart3: string[] = [];
    const gradePart3: number[] = [];
    let p3Points = 0;

    for (let i = 0; i < spec.part3Count; i++) {
      const sampleNums = ['1015', '3.14', '360', '840', '2.50', '1980', 'K', '5.2'];
      const ans = sampleNums[(sIdx + i * 2) % sampleNums.length];
      answersPart3.push(ans);

      const isCorrect = ans !== 'K' && (stu.ability > 0.7 && (sIdx + i) % 2 === 0);
      const val = isCorrect ? 1 : 0;
      gradePart3.push(val);
      if (val === 1) p3Points += spec.part3ScorePerQuestion;
    }

    const totalRaw = p1Points + p2Points + p3Points;
    const score = Number(Math.min(10.0, Math.max(0.0, totalRaw)).toFixed(1));

    return {
      stt: stu.stt,
      fullName: stu.name,
      sbd: stu.sbd,
      examCode: stu.code,
      dob: stu.dob,
      className: stu.cls,
      score,
      status: 'present' as const,
      answersPart1,
      answersPart2,
      answersPart3,
      gradePart1,
      gradePart2,
      gradePart3
    };
  });
}

/**
 * Mẫu dữ liệu 24 thí sinh mặc định (Môn Toán) để tương thích ngược
 */
export const SAMPLE_MACHINE_SCORE_RECORDS: MachineScoreRecord[] = generateSampleMachineRecordsForSubject('Toán');

/**
 * Chuyển đổi dữ liệu máy chấm trắc nghiệm sang dạng StudentScoreRow và ItemResponses
 * Hỗ trợ tự động gắn Lớp, Họ tên và Ngày sinh chính xác từ rosterMap (nếu có)
 * Thích ứng 100% cấu trúc của từng môn học (Toán, Tin, Lý, Hóa, Sinh, Sử, Địa, Tiếng Anh...)
 */
export function convertMachineRecordsToSystemData(
  records: MachineScoreRecord[],
  subjectName: string = 'Toán',
  rosterMap?: Map<string, CandidateRosterItem>,
  existingMatrix?: ExamMatrixItem[]
) {
  const spec = getExamStructureSpec(subjectName);
  const matrixItems = generateDynamicMatrix(subjectName, spec, existingMatrix);

  const scoreRows: StudentScoreRow[] = records.map(r => {
    const sbdKey = r.sbd.trim().toLowerCase();
    const cleanKey = sbdKey.replace(/[^a-z0-9]/g, '');
    const matched = rosterMap?.get(sbdKey) || rosterMap?.get(cleanKey);

    // Phân định chính xác 3 trạng thái khảo thí:
    // - 'absent_vt': Chỉ khi có chỉ dấu Vắng thi rõ ràng (r.status === 'absent_vt')
    // - 'present': Khi có điểm thi thực tế hợp lệ (typeof r.score === 'number')
    // - 'not_registered': Học sinh KHÔNG THI / KHÔNG ĐĂNG KÝ môn này (r.score === null và không ghi vắng)
    const effectiveStatus: 'present' | 'absent_vt' | 'not_registered' = 
      r.status === 'absent_vt' 
        ? 'absent_vt' 
        : (typeof r.score === 'number' && !isNaN(r.score) 
            ? 'present' 
            : 'not_registered');
    const effectiveScore: number | null = effectiveStatus === 'present' ? r.score : null;

    // 1. Ưu tiên số 1 TUYỆT ĐỐI cho Lớp trích xuất trực tiếp từ file kết quả (r.className)
    // Tuyệt đối không để matched?.className từ danh sách phòng thi hay mẫu ngầm ghi đè lên lớp thật trong file điểm!
    const finalClassName = (r.className && r.className !== 'Toàn khối')
      ? r.className
      : (matched?.className || 'Toàn khối');

    // 2. Họ và tên: Ưu tiên tên thực tế trong file nếu có
    const hasRealName = r.fullName && r.fullName.trim() !== '' && !r.fullName.startsWith('Thí sinh ');
    const finalFullName = hasRealName ? r.fullName : (matched?.fullName || r.fullName);

    return {
      stt: r.stt,
      sbd: r.sbd,
      fullName: finalFullName,
      className: finalClassName,
      dob: matched?.dob || r.dob || '',
      scores: {
        [subjectName]: effectiveScore
      },
      examStatuses: {
        [subjectName]: effectiveStatus
      }
    };
  });

  // CHỈ đưa học sinh thực sự dự thi vào itemResponses (học sinh vắng thi TUYỆT ĐỐI KHÔNG đưa vào để không làm sai lệch P và D)
  const itemResponses = records
    .filter(r => r.score !== null && r.status !== 'absent_vt')
    .map(r => {
      const sbdKey = r.sbd.trim().toLowerCase();
      const cleanKey = sbdKey.replace(/[^a-z0-9]/g, '');
      const matched = rosterMap?.get(sbdKey) || rosterMap?.get(cleanKey);

      const finalClassName = (r.className && r.className !== 'Toàn khối')
        ? r.className
        : (matched?.className || 'Toàn khối');
      const hasRealName = r.fullName && r.fullName.trim() !== '' && !r.fullName.startsWith('Thí sinh ');
      const finalFullName = hasRealName ? r.fullName : (matched?.fullName || r.fullName);

      const itemScores: Record<string, number> = {};

      // 1. Phần I: Điểm = 0.25 nếu đúng 1, 0 nếu sai 0
      const p1Count = r.gradePart1 ? r.gradePart1.length : spec.part1Count;
      for (let i = 0; i < p1Count; i++) {
        const qKey = `P1_C${String(i + 1).padStart(2, '0')}`;
        itemScores[qKey] = r.gradePart1?.[i] === 1 ? spec.part1ScorePerQuestion : 0;
      }

      // 2. Phần II: Quy đổi thang điểm Đúng/Sai chuẩn Bộ GD&ĐT:
      // Đúng 1 ý = 0.10đ; 2 ý = 0.25đ; 3 ý = 0.50đ; 4 ý = 1.00đ
      // ĐẶC BIỆT: Với môn có phần tự chọn (Tin học ICT vs CS), nếu thí sinh không chọn phần thi đó (được đánh dấu 'K'),
      // TUYỆT ĐỐI KHÔNG gán điểm 0 để không làm sai lệch phân tích câu hỏi của phần tự chọn!
      const p2Count = r.gradePart2 ? r.gradePart2.length : spec.part2Count;
      for (let i = 0; i < p2Count; i++) {
        const qKey = `P2_C${String(i + 1).padStart(2, '0')}`;
        // Nếu câu hỏi tự chọn không được thí sinh lựa chọn ('K' hoặc không làm do khác định hướng ICT/CS)
        if (r.answersPart2 && (r.answersPart2[i] === 'K' || r.answersPart2[i] === '')) {
          const isTinElective = spec.part2Elective && i >= spec.part2Elective.mandatoryCount;
          if (isTinElective) {
            continue; // Bỏ qua, không gán 0 điểm vào câu hỏi tự chọn mà học sinh không đăng ký
          }
        }

        const correctCount = r.gradePart2?.[i] || 0;
        let scorePart2 = 0;
        if (correctCount === 1) scorePart2 = 0.10;
        else if (correctCount === 2) scorePart2 = 0.25;
        else if (correctCount === 3) scorePart2 = 0.50;
        else if (correctCount >= 4) scorePart2 = 1.00;
        itemScores[qKey] = scorePart2;
      }

      // 3. Phần III: Điểm trả lời ngắn (0.50đ cho Toán, 0.25đ cho KHTN)
      const p3Count = r.gradePart3 ? r.gradePart3.length : spec.part3Count;
      for (let i = 0; i < p3Count; i++) {
        const qKey = `P3_C${String(i + 1).padStart(2, '0')}`;
        itemScores[qKey] = r.gradePart3?.[i] === 1 ? spec.part3ScorePerQuestion : 0;
      }

      return {
        sbd: r.sbd,
        fullName: finalFullName,
        className: finalClassName,
        itemScores,
        totalScore: r.score ?? 0
      };
    });

  return {
    scoreRows,
    itemResponses,
    matrixItems
  };
}

/**
 * Tải file Excel mẫu đúng y hệt cấu trúc máy chấm trắc nghiệm theo môn học được chọn
 */
export function downloadMachineScoreExcelTemplate(subjectName: string = 'Toán') {
  const spec = getExamStructureSpec(subjectName);
  const sampleRecords = generateSampleMachineRecordsForSubject(subjectName);

  // Xây dựng Header động (Đã tích hợp sẵn cột Lớp)
  const headers: string[] = ['STT', 'Họ và tên', 'SBD', 'Lớp', 'Mã đề', 'Ngày Sinh', 'Điểm thi'];

  // 1. Bài làm Phần I
  for (let i = 1; i <= spec.part1Count; i++) {
    headers.push(spec.part1Count > 12 ? `P1_${i}` : `${i}`);
  }

  // 2. Bài làm Phần II (nếu có)
  for (let i = 1; i <= spec.part2Count; i++) {
    if (spec.part2Elective) {
      if (i <= spec.part2Elective.mandatoryCount) headers.push(`P2_${i}_Chung`);
      else if (i === 3 || i === 4) headers.push(`P2_${i}_ICT`);
      else headers.push(`P2_${i}_CS`);
    } else {
      headers.push(`P2_${i}`);
    }
  }

  // 3. Bài làm Phần III (nếu có)
  for (let i = 1; i <= spec.part3Count; i++) {
    headers.push(`P3_${i}`);
  }

  // 4. Kết quả Phần I
  for (let i = 1; i <= spec.part1Count; i++) {
    headers.push(`KQ_P1_${i}`);
  }

  // 5. Kết quả Phần II
  for (let i = 1; i <= spec.part2Count; i++) {
    if (spec.part2Elective) {
      if (i <= spec.part2Elective.mandatoryCount) headers.push(`KQ_P2_${i}_Chung`);
      else if (i === 3 || i === 4) headers.push(`KQ_P2_${i}_ICT`);
      else headers.push(`KQ_P2_${i}_CS`);
    } else {
      headers.push(`KQ_P2_${i}`);
    }
  }

  // 6. Kết quả Phần III
  for (let i = 1; i <= spec.part3Count; i++) {
    headers.push(`KQ_P3_${i}`);
  }

  // Xây dựng các hàng dữ liệu (Bao gồm cột Lớp mẫu: 12A1, 12A2, 12A3, 12A4)
  const rows = sampleRecords.map(r => [
    r.stt,
    r.fullName,
    r.sbd,
    r.className || '12A1',
    r.examCode,
    r.dob,
    r.score !== null ? r.score : '',
    ...r.answersPart1,
    ...r.answersPart2,
    ...r.answersPart3,
    ...r.gradePart1,
    ...r.gradePart2,
    ...r.gradePart3
  ]);

  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Thêm độ rộng cột tự động
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 26 }, // Họ và tên
    { wch: 12 }, // SBD
    { wch: 10 }, // Lớp
    { wch: 8 },  // Mã đề
    { wch: 12 }, // Ngày Sinh
    { wch: 10 }, // Điểm thi
    ...Array(spec.part1Count).fill({ wch: 5 }),
    ...Array(spec.part2Count).fill({ wch: 7 }),
    ...Array(spec.part3Count).fill({ wch: 8 }),
    ...Array(spec.part1Count).fill({ wch: 5 }),
    ...Array(spec.part2Count).fill({ wch: 5 }),
    ...Array(spec.part3Count).fill({ wch: 5 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KetQuaMayCham');

  const cleanSubject = subjectName.replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '_');
  XLSX.writeFile(wb, `Mau_May_Cham_Trac_Nghiem_GDPT2018_${cleanSubject}.xlsx`);
}

/**
 * THUẬT TOÁN TỰ ĐỘNG NỘI SUY CẤU TRÚC ĐỀ THI TỪ FILE MÁY CHẤM TRẮC NGHIỆM (ADAPTIVE SCANNER)
 * Hệ thống tự động quét header và kiểu dữ liệu mẫu để nhận diện số câu P1, P2, P3
 * Không bao giờ bị lệch cột dù nạp môn Tin học, Hóa, Sử, Anh hay Toán!
 */
export function parseUploadedMachineScoreExcel(
  wb: XLSX.WorkBook,
  rosterMap?: Map<string, CandidateRosterItem>,
  subjectName: string = 'Toán',
  existingMatrix?: ExamMatrixItem[]
): {
  records: MachineScoreRecord[];
  scoreRows: StudentScoreRow[];
  itemResponses: any[];
  matrixItems: ExamMatrixItem[];
} {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error('File Excel không có dữ liệu sheet');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File Excel rỗng hoặc không có dữ liệu dòng học sinh');
  }

  // 1. Tự động dò tìm dòng Header thông minh (Header Auto-Scan)
  let headerRowIndex = 0;
  let maxHeaderScore = -1;

  for (let i = 0; i < Math.min(12, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row)) continue;

    let score = 0;
    row.forEach((cell: any) => {
      const s = String(cell || '').trim().toLowerCase();
      if (!s) return;
      if (s === 'sbd' || s.includes('số báo danh') || s.includes('so bao danh') || s.includes('mã hs') || s.includes('mshs')) score += 3;
      if (s.includes('họ') || s.includes('tên') || s.includes('hoten')) score += 3;
      if (s === 'lớp' || s === 'lop' || s.includes('lớp học') || s.includes('tên lớp') || s === 'class' || s.includes('khối/lớp')) score += 3;
      if (s.includes('điểm') || s.includes('diem') || s === 'score' || s === 'total') score += 2;
      if (s.includes('mã đề') || s.includes('made') || s.includes('đề thi')) score += 2;
      if (s === 'stt' || s === 'tt') score += 1;
      if (s.startsWith('p1_') || s.startsWith('p2_') || s.startsWith('kq_') || s.startsWith('câu')) score += 2;
    });

    if (score > maxHeaderScore) {
      maxHeaderScore = score;
      headerRowIndex = i;
    }
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const candidateDataRows = rawRows.slice(headerRowIndex + 1).filter(r => r && Array.isArray(r) && r.length >= 3);

  if (candidateDataRows.length === 0) {
    throw new Error('Không tìm thấy bản ghi học sinh nào trong file máy chấm!');
  }

  // 2. Tự động ánh xạ chỉ số các cột thông tin học sinh (Semantic Column Mapping)
  let colSTT = -1;
  let colFullName = -1;
  let colFirstName = -1;
  let colLastName = -1;
  let colSBD = -1;
  let colClass = -1;
  let colExamCode = -1;
  let colDOB = -1;
  let colScore = -1;
  let colNote = -1;

  headerRow.forEach((cell: any, idx: number) => {
    const s = String(cell || '').trim().toLowerCase();
    if (!s) return;

    if (colSTT === -1 && (s === 'stt' || s === 'tt' || s === 'số tt' || s === 'stt.')) {
      colSTT = idx;
    } else if (colSBD === -1 && (s === 'sbd' || s.includes('số báo danh') || s.includes('so bao danh') || s.includes('mã hs') || s.includes('mshs') || s.includes('mã thí sinh') || s.includes('mã học sinh') || s.includes('mã định danh'))) {
      colSBD = idx;
    } else if (colFullName === -1 && (s.includes('họ và tên') || s.includes('họ tên') || s.includes('họ & tên') || s.includes('tên học sinh') || s.includes('tên thí sinh') || s === 'thí sinh' || s === 'học sinh')) {
      colFullName = idx;
    } else if (colFirstName === -1 && (s === 'họ' || s === 'họ đệm' || s === 'họ lót' || s === 'ho dem')) {
      colFirstName = idx;
    } else if (colLastName === -1 && (s === 'tên' || s === 'ten') && !s.includes('lớp') && !s.includes('trường')) {
      colLastName = idx;
    } else if (colClass === -1 && (s === 'lớp' || s === 'lop' || s.includes('lớp học') || s.includes('tên lớp') || s === 'class' || s.includes('khối/lớp') || s.includes('chi đoàn') || s.includes('lớp sinh hoạt'))) {
      colClass = idx;
    } else if (colExamCode === -1 && (s.includes('mã đề') || s.includes('made') || s.includes('mã đề thi') || s === 'đề' || s === 'mã bài thi')) {
      colExamCode = idx;
    } else if (colDOB === -1 && (s.includes('ngày sinh') || s.includes('ngaysinh') || s === 'dob' || s.includes('năm sinh'))) {
      colDOB = idx;
    } else if (colScore === -1 && (s.includes('điểm thi') || s.includes('tổng điểm') || s.includes('điểm tổng') || s.includes('diem thi') || s.includes('tong diem') || s === 'điểm' || s === 'diem' || s === 'score' || s === 'total') && !s.startsWith('p1_') && !s.startsWith('p2_') && !s.startsWith('kq_') && !s.startsWith('câu')) {
      colScore = idx;
    } else if (colNote === -1 && (s.includes('ghi chú') || s.includes('ghichu') || s.includes('trạng thái') || s.includes('trangthai') || s === 'note')) {
      colNote = idx;
    }
  });

  // Heuristic Scan nếu chưa dò thấy cột Lớp qua header:
  if (colClass === -1) {
    const knownMeta = new Set([colSTT, colFullName, colFirstName, colLastName, colSBD, colExamCode, colDOB, colScore, colNote]);
    const maxCols = Math.max(...candidateDataRows.slice(0, 15).map(r => r.length));
    const classPattern = /^(10|11|12)\s*([A-Za-z0-9]+)$/i;

    for (let c = 0; c < Math.min(maxCols, 12); c++) {
      if (knownMeta.has(c)) continue;
      let matchCount = 0;
      let totalNonEmpty = 0;

      for (let rIdx = 0; rIdx < Math.min(15, candidateDataRows.length); rIdx++) {
        const val = String(candidateDataRows[rIdx][c] || '').trim();
        if (val) {
          totalNonEmpty++;
          if (classPattern.test(val)) matchCount++;
        }
      }

      if (totalNonEmpty >= 3 && (matchCount / totalNonEmpty) >= 0.5) {
        colClass = c;
        break;
      }
    }
  }

  // Dự phòng vị trí chuẩn nếu file không có dòng header văn bản rõ ràng:
  if (colSBD === -1 && colScore === -1) {
    colSTT = 0;
    colFullName = 1;
    colSBD = 2;
    colExamCode = 3;
    colDOB = 4;
    colScore = 5;
    if (headerRow.length >= 7 && colClass === -1) {
      colClass = 3;
      colExamCode = 4;
      colDOB = 5;
      colScore = 6;
    }
  }

  // Xác định vị trí bắt đầu của các cột câu hỏi / bài làm:
  const recognizedMetaCols = [colSTT, colFullName, colFirstName, colLastName, colSBD, colClass, colExamCode, colDOB, colScore, colNote].filter(c => c >= 0);
  const questionStartCol = recognizedMetaCols.length > 0 ? (Math.max(...recognizedMetaCols) + 1) : 6;

  // Lọc các hàng dữ liệu hợp lệ:
  const dataRows = candidateDataRows.filter(r => {
    if (!r || r.length < 3) return false;
    const hasSbd = colSBD >= 0 && String(r[colSBD] || '').trim() !== '';
    const hasName = colFullName >= 0 && String(r[colFullName] || '').trim() !== '';
    return hasSbd || hasName || r.length >= questionStartCol;
  });

  if (dataRows.length === 0) {
    throw new Error('Không tìm thấy bản ghi học sinh nào trong file máy chấm!');
  }

  // 3. Tự động xác định đặc tả cấu trúc môn học mục tiêu
  const defaultSpec = getExamStructureSpec(subjectName);

  // Kiểm tra tổng số cột thực tế sau các cột thông tin
  const sampleRow = dataRows[0] || [];
  const totalItemCols = Math.max(0, sampleRow.length - questionStartCol);

  // Phân tích cấu trúc câu hỏi:
  // Nếu số cột khớp chính xác với 2 * (N1 + N2 + N3) của môn học:
  let part1Count = defaultSpec.part1Count;
  let part2Count = defaultSpec.part2Count;
  let part3Count = defaultSpec.part3Count;

  // Thuật toán quét nội suy thông minh:
  if (totalItemCols > 0) {
    let detectedP1 = 0;
    let detectedP2 = 0;
    let detectedP3 = 0;

    const sampleAnswers: string[] = [];
    for (let c = questionStartCol; c < sampleRow.length; c++) {
      sampleAnswers.push(String(sampleRow[c] || '').trim().toUpperCase());
    }

    // Nửa đầu là bài làm, nửa sau là kết quả điểm
    const halfCols = Math.floor(sampleAnswers.length / 2);
    const answerSlice = sampleAnswers.slice(0, halfCols);

    // Đếm từng loại câu trả lời
    let p1Found = 0;
    let p2Found = 0;
    let p3Found = 0;

    for (const ans of answerSlice) {
      if (ans === 'A' || ans === 'B' || ans === 'C' || ans === 'D') {
        p1Found++;
      } else if (ans.length === 4 && (ans.includes('D') || ans.includes('S') || ans.includes('Đ'))) {
        p2Found++;
      } else if (ans !== '' && ans !== '-') {
        p3Found++;
      }
    }

    // Nếu phát hiện rõ ràng cấu trúc thực tế:
    if (p1Found > 0 && (p1Found + p2Found + p3Found) === halfCols) {
      detectedP1 = p1Found;
      detectedP2 = p2Found;
      detectedP3 = p3Found;
      part1Count = detectedP1;
      part2Count = detectedP2;
      part3Count = detectedP3;
    } else if (totalItemCols === 2 * (defaultSpec.part1Count + defaultSpec.part2Count + defaultSpec.part3Count)) {
      // Khớp hoàn hảo với đặc tả chuẩn môn học
      part1Count = defaultSpec.part1Count;
      part2Count = defaultSpec.part2Count;
      part3Count = defaultSpec.part3Count;
    }
  }

  // 4. Đọc dữ liệu từng dòng học sinh
  const records: MachineScoreRecord[] = [];

  dataRows.forEach((row, idx) => {
    const stt = colSTT >= 0 ? (parseInt(String(row[colSTT])) || (idx + 1)) : (idx + 1);

    let fullNameRaw = `Thí sinh ${idx + 1}`;
    if (colFullName >= 0 && row[colFullName]) {
      fullNameRaw = String(row[colFullName]).trim();
    } else if (colLastName >= 0 && row[colLastName]) {
      const fName = colFirstName >= 0 ? String(row[colFirstName] || '').trim() : '';
      const lName = String(row[colLastName] || '').trim();
      fullNameRaw = `${fName} ${lName}`.trim() || `Thí sinh ${idx + 1}`;
    }

    const sbd = colSBD >= 0 ? String(row[colSBD] || `SBD${String(idx + 1).padStart(4, '0')}`).trim() : `SBD${String(idx + 1).padStart(4, '0')}`;
    const examCode = colExamCode >= 0 ? String(row[colExamCode] || '0101').trim() : '0101';
    const dobRaw = colDOB >= 0 ? String(row[colDOB] || '').trim() : '';

    // TRÍCH XUẤT CỘT LỚP TRỰC TIẾP TỪ FILE KẾT QUẢ
    let rawClass = '';
    if (colClass >= 0 && row[colClass] !== undefined && row[colClass] !== null) {
      rawClass = String(row[colClass]).trim();
    }

    // Chuẩn hóa tên lớp: '12 a 1' -> '12A1', 'lớp 12A1' -> '12A1'
    let className = 'Toàn khối';
    if (rawClass) {
      const cleanClass = rawClass.replace(/^lớp\s*/i, '').replace(/^lop\s*/i, '').replace(/\s+/g, '').toUpperCase();
      className = cleanClass || rawClass;
    }

    // Tự động đối chiếu thông tin từ danh sách học sinh theo SBD (dự phòng)
    const sbdKey = sbd.toLowerCase();
    const cleanKey = sbdKey.replace(/[^a-z0-9]/g, '');
    const matched = rosterMap?.get(sbdKey) || rosterMap?.get(cleanKey);

    if (className === 'Toàn khối' && matched?.className) {
      className = matched.className;
    }
    const fullName = (matched?.fullName && matched.fullName.length > 2 && (!fullNameRaw || fullNameRaw.startsWith('Thí sinh'))) ? matched.fullName : fullNameRaw;
    const dob = matched?.dob || dobRaw;

    // Phân tích kỹ ô điểm thi
    const rawScoreCell = colScore >= 0 ? row[colScore] : null;
    const rawScoreStr = rawScoreCell === undefined || rawScoreCell === null ? '' : String(rawScoreCell).trim();
    const rawScoreUpper = rawScoreStr.toUpperCase();

    // Con trỏ cột bắt đầu đọc bài làm
    let colPointer = questionStartCol;
    let validAnswersCount = 0;

    // 1. Bài làm Phần I
    const answersPart1: string[] = [];
    for (let c = 0; c < part1Count; c++) {
      const a = String(row[colPointer] || '-').trim();
      answersPart1.push(a);
      if (a !== '' && a !== '-' && a !== 'K' && a !== 'null' && a !== 'undefined') {
        validAnswersCount++;
      }
      colPointer++;
    }

    // 2. Bài làm Phần II
    const answersPart2: string[] = [];
    for (let c = 0; c < part2Count; c++) {
      const a = String(row[colPointer] || '-').trim();
      answersPart2.push(a);
      if (a !== '' && a !== '-' && a !== 'K' && a !== 'null' && a !== 'undefined') {
        validAnswersCount++;
      }
      colPointer++;
    }

    // 3. Bài làm Phần III
    const answersPart3: string[] = [];
    for (let c = 0; c < part3Count; c++) {
      const a = String(row[colPointer] || 'K').trim();
      answersPart3.push(a);
      if (a !== '' && a !== '-' && a !== 'K' && a !== 'null' && a !== 'undefined') {
        validAnswersCount++;
      }
      colPointer++;
    }

    // Con trỏ cột bắt đầu đọc kết quả chấm
    // 4. Kết quả Phần I (1 hoặc 0)
    let calculatedP1 = 0;
    const gradePart1: number[] = [];
    for (let c = 0; c < part1Count; c++) {
      const rawCell = row[colPointer];
      const v = parseInt(String(rawCell));
      const g = isNaN(v) ? (answersPart1[c] && answersPart1[c] !== '-' && answersPart1[c] !== 'K' ? 1 : 0) : v;
      gradePart1.push(g);
      if (g === 1) calculatedP1 += defaultSpec.part1ScorePerQuestion;
      colPointer++;
    }

    // 5. Kết quả Phần II (0 đến 4 ý đúng)
    let calculatedP2 = 0;
    const gradePart2: number[] = [];
    for (let c = 0; c < part2Count; c++) {
      const rawCell = row[colPointer];
      const v = parseInt(String(rawCell));
      const g = isNaN(v) ? 0 : Math.min(Math.max(v, 0), 4);
      gradePart2.push(g);
      if (g === 1) calculatedP2 += 0.10;
      else if (g === 2) calculatedP2 += 0.25;
      else if (g === 3) calculatedP2 += 0.50;
      else if (g >= 4) calculatedP2 += 1.00;
      colPointer++;
    }

    // 6. Kết quả Phần III (1 hoặc 0)
    let calculatedP3 = 0;
    const gradePart3: number[] = [];
    for (let c = 0; c < part3Count; c++) {
      const rawCell = row[colPointer];
      const v = parseInt(String(rawCell));
      const g = isNaN(v) ? 0 : v;
      gradePart3.push(g);
      if (g === 1) calculatedP3 += defaultSpec.part3ScorePerQuestion;
      colPointer++;
    }

    // Xác định chuẩn xác: Học sinh Vắng thi (VT), Bỏ trống hay Có mặt (present)
    const isExplicitAbsent = 
      rawScoreUpper === 'VT' || 
      rawScoreUpper === 'V' || 
      rawScoreUpper === 'VẮNG' || 
      rawScoreUpper === 'VANG' || 
      rawScoreUpper.includes('VẮNG') || 
      rawScoreUpper.includes('VANG') ||
      rawScoreUpper === 'KDT' ||
      rawScoreUpper.includes('KHÔNG THI') ||
      rawScoreUpper.includes('KHONG THI') ||
      rawScoreUpper.includes('CHƯA THI') ||
      rawScoreUpper.includes('CHUA THI') ||
      rawScoreUpper.includes('BỎ THI') ||
      rawScoreUpper.includes('BO THI') ||
      rawScoreUpper.includes('HOÃN') ||
      rawScoreUpper.includes('MIỄN') ||
      rawScoreUpper === 'MT' ||
      rawScoreUpper.includes('NGHỈ') ||
      rawScoreUpper.includes('NGHI');

    const isScoreCellEmpty = rawScoreStr === '' || rawScoreStr === '-' || rawScoreUpper === 'NULL' || rawScoreUpper === 'UNDEFINED';

    let score: number | null = null;
    let status: 'present' | 'absent_vt' | 'not_registered' = 'present';

    if (isExplicitAbsent) {
      // 1. CÓ CHỈ DẤU VẮNG THI RÕ RÀNG (Ghi chú / Ô điểm ghi VT, V, VẮNG, HOÃN, BỎ THI...):
      score = null;
      status = 'absent_vt';
    } else if (isScoreCellEmpty && validAnswersCount === 0) {
      // 2. Ô ĐIỂM TRỐNG VÀ KHÔNG CÓ BÀI LÀM: Học sinh KHÔNG THI / KHÔNG ĐĂNG KÝ THI môn này!
      // (Ví dụ học sinh ban KHXH không thi môn Hóa học khi nạp danh sách cả khối)
      // TUYỆT ĐỐI KHÔNG gán là Vắng thi (VT) để không làm méo mó danh sách và tỷ lệ vắng thi!
      score = null;
      status = 'not_registered';
    } else {
      const parsedNum = parseFloat(rawScoreStr.replace(',', '.'));
      if (!isNaN(parsedNum)) {
        // Có điểm số ghi rõ ràng (kể cả số 0, 0.0 thực tế từ bài làm)
        score = parsedNum;
        status = 'present';
      } else if (validAnswersCount > 0) {
        // Cột điểm để trống nhưng có câu trả lời thực tế -> Tính tổng từ các câu
        score = Number(Math.min(10.0, calculatedP1 + calculatedP2 + calculatedP3).toFixed(2));
        status = 'present';
      } else {
        score = null;
        status = 'not_registered';
      }
    }

    records.push({
      stt,
      fullName,
      sbd,
      examCode,
      dob,
      className,
      score,
      status,
      answersPart1,
      answersPart2,
      answersPart3,
      gradePart1,
      gradePart2,
      gradePart3
    });
  });

  const adaptedSpec: ExamStructureSpec = {
    ...defaultSpec,
    part1Count,
    part2Count,
    part3Count
  };

  const converted = convertMachineRecordsToSystemData(records, subjectName, rosterMap, existingMatrix);

  return {
    records,
    scoreRows: converted.scoreRows,
    itemResponses: converted.itemResponses,
    matrixItems: converted.matrixItems
  };
}

/**
 * Tái liên kết nhanh bản ghi máy chấm đã nạp với file Danh sách Thí sinh (Lớp, SBD)
 * Không cần người dùng phải nạp lại file kết quả máy chấm
 */
export function relinkMachineRecordsWithRoster(
  records: MachineScoreRecord[],
  rosterMap: Map<string, CandidateRosterItem>,
  subjectName: string = 'Toán',
  existingMatrix?: ExamMatrixItem[]
) {
  const updatedRecords: MachineScoreRecord[] = records.map(r => {
    const sbdKey = r.sbd.trim().toLowerCase();
    const cleanKey = sbdKey.replace(/[^a-z0-9]/g, '');
    const matched = rosterMap.get(sbdKey) || rosterMap.get(cleanKey);

    return {
      ...r,
      className: (r.className && r.className !== 'Toàn khối') ? r.className : (matched?.className || 'Toàn khối'),
      fullName: (matched?.fullName && matched.fullName.length > 2 && (!r.fullName || r.fullName.startsWith('Thí sinh'))) ? matched.fullName : r.fullName,
      dob: matched?.dob || r.dob
    };
  });

  const converted = convertMachineRecordsToSystemData(updatedRecords, subjectName, rosterMap, existingMatrix);
  return {
    records: updatedRecords,
    scoreRows: converted.scoreRows,
    itemResponses: converted.itemResponses,
    matrixItems: converted.matrixItems
  };
}

/**
 * Hàm phân tích file Excel Danh sách Thí sinh (STT, SBD, Họ và tên, Lớp, Ngày sinh)
 */
export function parseCandidateRosterExcel(wb: XLSX.WorkBook): CandidateRosterItem[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('File Excel rỗng!');
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);
  if (!rawRows || rawRows.length === 0) {
    throw new Error('File danh sách thí sinh không có dòng dữ liệu!');
  }

  const items: CandidateRosterItem[] = [];
  rawRows.forEach((r, idx) => {
    // Tìm SBD
    let sbd = '';
    for (const k of Object.keys(r)) {
      const lk = k.trim().toLowerCase();
      if (
        lk === 'sbd' ||
        lk === 'số báo danh' ||
        lk === 'so bao danh' ||
        lk === 'mã hs' ||
        lk === 'ma hs' ||
        lk === 'mã thí sinh' ||
        lk === 'mshs' ||
        lk === 'số_báo_danh'
      ) {
        sbd = String(r[k]).trim();
        break;
      }
    }
    if (!sbd) {
      const foundKey = Object.keys(r).find(k => k.trim().toLowerCase().includes('sbd'));
      if (foundKey) sbd = String(r[foundKey]).trim();
    }
    if (!sbd) return;

    // Tìm Họ và tên
    let fullName = '';
    for (const k of Object.keys(r)) {
      const lk = k.trim().toLowerCase();
      if (
        lk === 'họ và tên' ||
        lk === 'họ tên' ||
        lk === 'hoten' ||
        lk === 'tên' ||
        lk === 'họ va tên' ||
        lk === 'họ_và_tên'
      ) {
        fullName = String(r[k]).trim();
        break;
      }
    }
    if (!fullName) {
      const foundNameKey = Object.keys(r).find(k => {
        const l = k.trim().toLowerCase();
        return l.includes('họ') || l.includes('tên');
      });
      if (foundNameKey) fullName = String(r[foundNameKey]).trim();
      else fullName = `Thí sinh ${idx + 1}`;
    }

    // Tìm Lớp
    let className = '';
    for (const k of Object.keys(r)) {
      const lk = k.trim().toLowerCase();
      if (lk === 'lớp' || lk === 'lop' || lk === 'lớp học' || lk === 'class') {
        className = String(r[k]).trim();
        break;
      }
    }
    if (!className) {
      const foundClassKey = Object.keys(r).find(k => k.trim().toLowerCase().includes('lớp') || k.trim().toLowerCase().includes('lop'));
      if (foundClassKey) className = String(r[foundClassKey]).trim();
      else className = '12A1';
    }

    // Tìm Ngày sinh
    let dob = '';
    for (const k of Object.keys(r)) {
      const lk = k.trim().toLowerCase();
      if (lk === 'ngày sinh' || lk === 'ngaysinh' || lk === 'năm sinh' || lk === 'ngay sinh' || lk === 'ngày_sinh') {
        dob = String(r[k]).trim();
        break;
      }
    }

    // Tìm STT
    let stt = idx + 1;
    for (const k of Object.keys(r)) {
      const lk = k.trim().toLowerCase();
      if (lk === 'stt' || lk === 'tt') {
        const v = parseInt(String(r[k]));
        if (!isNaN(v)) stt = v;
        break;
      }
    }

    items.push({
      stt,
      sbd,
      fullName,
      className,
      dob
    });
  });

  return items;
}

/**
 * Tải file Excel mẫu Danh sách Thí sinh theo Lớp (gồm 5 cột: STT, SBD, Họ và tên, Lớp, Ngày sinh)
 */
export function downloadCandidateRosterTemplate() {
  const headers = ['STT', 'SBD', 'Họ và tên', 'Lớp', 'Ngày sinh'];
  const rows = [
    [1, '52028748', 'HOÀNG ĐỨC TRÍ AN', '12A1', '06/01/2008'],
    [2, '52028799', 'LÊ NHẬT HÀ CHÂU', '12A1', '03/12/2008'],
    [3, '52028803', 'ĐẶNG KIM CHI', '12A1', '22/02/2008'],
    [4, '52028805', 'NGUYỄN NGỌC LAN CHI', '12A1', '30/11/2008'],
    [5, '52028811', 'BÙI THỊ BÍCH CHƯ', '12A2', '30/08/2008'],
    [6, '52028819', 'HUỲNH THỊ NGỌC DIỄM', '12A2', '31/10/2008'],
    [7, '52028822', 'TRẦN NGỌC ÁNH DƯƠNG', '12A2', '15/04/2008'],
    [8, '52028824', 'LÊ THỊ BÍCH DUYÊN', '12A2', '05/09/2008'],
    [9, '52028833', 'VÕ HUỲNH NGỌC ĐIỆP', '12A3', '26/02/2008'],
    [10, '52028836', 'HOÀNG TRẦN ANH ĐỨC', '12A3', '10/05/2008'],
    [11, '52028838', 'LÊ HUỲNH ANH ĐỨC', '12A3', '14/09/2008'],
    [12, '52028842', 'LÊ MINH ĐỨC', '12A3', '28/11/2008'],
    [13, '52028845', 'NGUYỄN HUỲNH ĐỨC', '12A4', '04/07/2008'],
    [14, '52028848', 'PHAN LÊ ANH ĐỨC', '12A4', '18/03/2008'],
    [15, '52028852', 'PHAN VĂN ANH ĐỨC', '12A4', '22/10/2008'],
    [16, '52028856', 'NGUYỄN THỊ NGỌC GIÀU', '12A4', '09/01/2008'],
    [17, '52028858', 'TRẦN NGỌC HÂN', '12A5', '11/03/2008'],
    [18, '52028864', 'TRẦN GIA HÂN', '12A5', '24/09/2008'],
    [19, '52028886', 'LÊ NGUYỄN GIA HOÀNG', '12A5', '08/04/2008'],
    [20, '52028893', 'NGÔ THỊ THU HƯƠNG', '12A5', '17/07/2008'],
    [21, '52028951', 'NGUYỄN THANH HUYỀN', '12A6', '12/05/2008'],
    [22, '52028975', 'NGUYỄN ĐĂNG KHOA', '12A6', '16/06/2008'],
    [23, '52028978', 'TRẦN ĐĂNG KHOA', '12A6', '20/02/2008'],
    [24, '52029010', 'PHÙNG THỊ THÙY LINH', '12A6', '13/08/2008']
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachThiSinh');
  XLSX.writeFile(wb, 'Mau_Danh_Sach_Thi_Sinh_Theo_Lop.xlsx');
}
