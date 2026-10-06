import { ExamMatrixItem, ExamYccdItem } from '../types';
import { SAMPLE_CHEMISTRY_MATRIX, SAMPLE_CHEMISTRY_YCCD } from './sampleItemAnalysisData';

export type SubjectCategoryGDPT = 'essay' | 'multiple_choice' | 'evaluation';

export interface SubjectMetadataGDPT {
  name: string;
  shortName: string;
  group: 'Môn Bắt buộc' | 'Khoa học Tự nhiên' | 'Khoa học Xã hội' | 'Công nghệ & Nghệ thuật';
  category: SubjectCategoryGDPT;
  formatDescription: string;
  badgeLabel: string;
  badgeColor: string;
  sampleMatrix: ExamMatrixItem[];
  sampleYccd: ExamYccdItem[];
}

// ============================================================================
// 1. MẪU DỮ LIỆU MÔN NGỮ VĂN (ĐỀ TỰ LUẬN HOÀN TOÀN - CẤU TRÚC 2025 GDPT 2018)
// Phần I: Đọc hiểu (4.0 điểm) - 4 câu
// Phần II: Viết (6.0 điểm) - Câu 1: Đoạn văn NLXH (2.0 điểm), Câu 2: Bài văn NLVH (4.0 điểm)
// ============================================================================
export const SAMPLE_LITERATURE_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'ĐH_C1', topic: 'Kỹ năng Đọc hiểu văn bản', thinkingLevel: 'Biết', maxScore: 0.75, yccdCode: 'YCCD-VAN12-01' },
  { questionNo: 'ĐH_C2', topic: 'Kỹ năng Đọc hiểu văn bản', thinkingLevel: 'Biết', maxScore: 0.75, yccdCode: 'YCCD-VAN12-02' },
  { questionNo: 'ĐH_C3', topic: 'Kỹ năng Đọc hiểu văn bản', thinkingLevel: 'Hiểu', maxScore: 1.00, yccdCode: 'YCCD-VAN12-03' },
  { questionNo: 'ĐH_C4', topic: 'Kỹ năng Đọc hiểu văn bản', thinkingLevel: 'Vận dụng', maxScore: 1.50, yccdCode: 'YCCD-VAN12-04' },
  { questionNo: 'VIET_NLXH', topic: 'Kỹ năng Viết đoạn văn Nghị luận xã hội (200 chữ)', thinkingLevel: 'Vận dụng', maxScore: 2.00, yccdCode: 'YCCD-VAN12-05' },
  { questionNo: 'VIET_NLVH', topic: 'Kỹ năng Viết bài văn Nghị luận văn học so sánh', thinkingLevel: 'Vận dụng cao', maxScore: 4.00, yccdCode: 'YCCD-VAN12-06' },
];

export const SAMPLE_LITERATURE_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-VAN12-01',
    topic: 'Kỹ năng Đọc hiểu',
    description: 'Nhận biết được thể thơ, phương thức biểu đạt, nhân vật trữ tình và các chi tiết hình ảnh trong ngữ liệu mới ngoài SGK.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-VAN12-02',
    topic: 'Kỹ năng Đọc hiểu',
    description: 'Xác định và phân tích tác dụng của các biện pháp tu từ, phong cách ngôn ngữ và phương tiện liên kết câu.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-VAN12-03',
    topic: 'Kỹ năng Đọc hiểu',
    description: 'Hiểu và lí giải được ý nghĩa thông điệp, triết lý nhân sinh mà tác giả gửi gắm qua hình tượng nghệ thuật.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-VAN12-04',
    topic: 'Kỹ năng Đọc hiểu',
    description: 'Rút ra bài học tư tưởng, liên hệ quan điểm của tác giả với bối cảnh xã hội hiện đại và trải nghiệm cá nhân.',
    benchmarkTarget: 60
  },
  {
    code: 'YCCD-VAN12-05',
    topic: 'Kỹ năng Viết văn bản',
    description: 'Viết đoạn văn nghị luận xã hội (khoảng 200 chữ) thể hiện quan điểm sâu sắc, lập luận chặt chẽ, dẫn chứng xác đáng.',
    benchmarkTarget: 65
  },
  {
    code: 'YCCD-VAN12-06',
    topic: 'Kỹ năng Viết văn bản',
    description: 'Viết bài văn nghị luận văn học phân tích, so sánh đánh giá nét đặc sắc nội dung và nghệ thuật của tác phẩm.',
    benchmarkTarget: 55
  }
];

export function generateSampleLiteratureScores(): {
  sbd: string;
  fullName: string;
  className: string;
  itemScores: Record<string, number>;
  totalScore: number;
}[] {
  const students = [
    { sbd: '52830001', name: 'Bùi Đức Anh', cls: '12A1', ability: 0.75 },
    { sbd: '52830002', name: 'Đặng Ngọc Ánh', cls: '12A1', ability: 0.80 },
    { sbd: '52830003', name: 'Hoàng Minh Châu', cls: '12A1', ability: 0.82 },
    { sbd: '52830004', name: 'Lê Tuấn Dũng', cls: '12A2', ability: 0.68 },
    { sbd: '52830005', name: 'Ngô Hải Đăng', cls: '12A2', ability: 0.60 },
    { sbd: '52830006', name: 'Phạm Hương Giang', cls: '12A2', ability: 0.85 },
    { sbd: '52830007', name: 'Trần Gia Huy', cls: '12A3', ability: 0.55 },
    { sbd: '52830008', name: 'Vũ Thảo Linh', cls: '12A3', ability: 0.78 },
    { sbd: '52830009', name: 'Đỗ Quốc Khánh', cls: '12A3', ability: 0.48 },
    { sbd: '52830010', name: 'Nguyễn Diệu Linh', cls: '12A4', ability: 0.72 },
    { sbd: '52830011', name: 'Lý Hoàng Nam', cls: '12A4', ability: 0.65 },
    { sbd: '52830012', name: 'Phan Bảo Ngọc', cls: '12A4', ability: 0.88 },
    { sbd: '52830013', name: 'Tạ Minh Quân', cls: '12A1', ability: 0.62 },
    { sbd: '52830014', name: 'Võ Tuyết Mai', cls: '12A2', ability: 0.90 },
    { sbd: '52830015', name: 'Trịnh Nhật Minh', cls: '12A3', ability: 0.64 },
    { sbd: '52830016', name: 'Dương Yến Nhi', cls: '12A4', ability: 0.74 },
    { sbd: '52830017', name: 'Lương Tuấn Phong', cls: '12A1', ability: 0.70 },
    { sbd: '52830018', name: 'Nguyễn Thành Trung', cls: '12A2', ability: 0.58 },
    { sbd: '52830019', name: 'Bạch Thúy Vy', cls: '12A3', ability: 0.52 },
    { sbd: '52830020', name: 'Hà Xuân Trường', cls: '12A4', ability: 0.66 },
  ];

  return students.map((stu) => {
    const itemScores: Record<string, number> = {};
    const c1 = Number((stu.ability * 0.75 * (0.85 + Math.random() * 0.15)).toFixed(2));
    const c2 = Number((stu.ability * 0.75 * (0.80 + Math.random() * 0.20)).toFixed(2));
    const c3 = Number((stu.ability * 1.00 * (0.75 + Math.random() * 0.25)).toFixed(2));
    const c4 = Number((stu.ability * 1.50 * (0.70 + Math.random() * 0.30)).toFixed(2));
    const nlxh = Number((stu.ability * 2.00 * (0.70 + Math.random() * 0.30)).toFixed(2));
    const nlvh = Number((stu.ability * 4.00 * (0.65 + Math.random() * 0.35)).toFixed(2));

    itemScores['ĐH_C1'] = Math.min(0.75, c1);
    itemScores['ĐH_C2'] = Math.min(0.75, c2);
    itemScores['ĐH_C3'] = Math.min(1.00, c3);
    itemScores['ĐH_C4'] = Math.min(1.50, c4);
    itemScores['VIET_NLXH'] = Math.min(2.00, nlxh);
    itemScores['VIET_NLVH'] = Math.min(4.00, nlvh);

    const total = Object.values(itemScores).reduce((a, b) => a + b, 0);

    return {
      sbd: stu.sbd,
      fullName: stu.name,
      className: stu.cls,
      itemScores,
      totalScore: Number(total.toFixed(1))
    };
  });
}

// ============================================================================
// 2. MẪU DỮ LIỆU MÔN TOÁN HỌC (ĐỀ TRẮC NGHIỆM ĐỊNH DẠNG 2025: PHẦN I, II, III)
// ============================================================================
export const SAMPLE_MATH_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'P1_C01', topic: 'Hàm số và đồ thị đạo hàm', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C02', topic: 'Cực trị của hàm số', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C03', topic: 'Đường tiệm cận của đồ thị', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P1_C04', topic: 'Giá trị lớn nhất, nhỏ nhất', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P1_C05', topic: 'Khảo sát và vẽ đồ thị', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P1_C06', topic: 'Toạ độ vectơ trong không gian', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P1_C07', topic: 'Biểu thức toạ độ các phép toán', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P1_C08', topic: 'Tích vô hướng và ứng dụng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P1_C09', topic: 'Thống kê: Khoảng biến thiên', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P1_C10', topic: 'Phương sai và độ lệch chuẩn', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P1_C11', topic: 'Ứng dụng đạo hàm giải bài toán tối ưu', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P1_C12', topic: 'Mô hình hoá vectơ trong vật lí', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  // Phần II: Trắc nghiệm Đúng/Sai
  { questionNo: 'P2_C1_a', topic: 'Khảo sát sự biến thiên hàm phân thức', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P2_C1_b', topic: 'Tìm tiệm cận đứng và xiên', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-01' },
  { questionNo: 'P2_C1_c', topic: 'Tâm đối xứng của đồ thị', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P2_C1_d', topic: 'Tiếp tuyến đi qua điểm cho trước', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P2_C2_a', topic: 'Hệ trục toạ độ Oxyz không gian', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P2_C2_b', topic: 'Góc giữa hai vectơ không gian', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P2_C2_c', topic: 'Ứng dụng vectơ xác định vị trí máy bay', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P2_C2_d', topic: 'Khoảng cách tối thiểu giữa 2 vật thể', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-TOAN12-03' },
  // Phần III: Trả lời ngắn
  { questionNo: 'P3_C01', topic: 'Tìm vận tốc lớn nhất chuyển động', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P3_C02', topic: 'Dung tích cực đại của hộp chứa', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P3_C03', topic: 'Độ dài vectơ vận tốc tổng hợp', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-03' },
  { questionNo: 'P3_C04', topic: 'Độ lệch chuẩn của mẫu số liệu ghép nhóm', thinkingLevel: 'Hiểu', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-04' },
  { questionNo: 'P3_C05', topic: 'Chi phí tối ưu sản xuất', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-02' },
  { questionNo: 'P3_C06', topic: 'Tầm nhìn từ ngọn hải đăng', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-TOAN12-03' },
];

export const SAMPLE_MATH_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-TOAN12-01',
    topic: 'Tính đơn điệu, cực trị và tiệm cận',
    description: 'Nhận biết và tính toán được tính đơn điệu, các điểm cực trị, giá trị cực trị và đường tiệm cận của hàm số.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-TOAN12-02',
    topic: 'Ứng dụng đạo hàm giải toán thực tế',
    description: 'Vận dụng đạo hàm để giải quyết các bài toán tối ưu hoá thực tế liên quan đến kinh tế, sản xuất, hình học và chuyển động.',
    benchmarkTarget: 60
  },
  {
    code: 'YCCD-TOAN12-03',
    topic: 'Vectơ và toạ độ trong không gian',
    description: 'Sử dụng hệ toạ độ không gian Oxyz và vectơ để mô hình hoá và giải các bài toán vị trí, góc, khoảng cách trong đời sống.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-TOAN12-04',
    topic: 'Các đặc trưng đo mức độ phân tán số liệu ghép nhóm',
    description: 'Tính và giải thích ý nghĩa của khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.',
    benchmarkTarget: 80
  }
];

// ============================================================================
// 3. MẪU DỮ LIỆU MÔN TIẾNG ANH (ĐỀ TRẮC NGHIỆM KHÁCH QUAN 40 CÂU)
// ============================================================================
export const SAMPLE_ENGLISH_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'E_01', topic: 'Phonetics (Pronunciation)', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-ANH12-01' },
  { questionNo: 'E_02', topic: 'Phonetics (Stress syllable)', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-ANH12-01' },
  { questionNo: 'E_03', topic: 'Grammar: Conditional Sentences', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-ANH12-02' },
  { questionNo: 'E_04', topic: 'Vocabulary in Context', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-ANH12-02' },
  { questionNo: 'E_05', topic: 'Social Communication & Interchange', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-ANH12-03' },
  { questionNo: 'E_06', topic: 'Reading Comprehension (Main Idea)', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-ANH12-04' },
  { questionNo: 'E_07', topic: 'Reading Comprehension (Inference)', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-ANH12-04' },
  { questionNo: 'E_08', topic: 'Sentence Rewriting / Meaning', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-ANH12-02' },
  { questionNo: 'E_09', topic: 'Lexical Cloze Test (Collocation)', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-ANH12-02' },
  { questionNo: 'E_10', topic: 'Error Identification', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-ANH12-02' },
  { questionNo: 'E_11', topic: 'Idiomatic Expressions', thinkingLevel: 'Vận dụng cao', maxScore: 0.25, yccdCode: 'YCCD-ANH12-02' },
  { questionNo: 'E_12', topic: 'Complex Text Synthesis', thinkingLevel: 'Vận dụng cao', maxScore: 0.25, yccdCode: 'YCCD-ANH12-04' },
];

export const SAMPLE_ENGLISH_YCCD: ExamYccdItem[] = [
  { code: 'YCCD-ANH12-01', topic: 'Phonetics', description: 'Phát âm đúng phụ âm, nguyên âm và xác định đúng trọng âm từ.', benchmarkTarget: 80 },
  { code: 'YCCD-ANH12-02', topic: 'Lexico-Grammar', description: 'Sử dụng chính xác từ vựng, giới từ và cấu trúc ngữ pháp theo chủ điểm.', benchmarkTarget: 70 },
  { code: 'YCCD-ANH12-03', topic: 'Communication', description: 'Đáp ứng các tình huống giao tiếp thông thường phù hợp văn hóa.', benchmarkTarget: 85 },
  { code: 'YCCD-ANH12-04', topic: 'Reading Comprehension', description: 'Đọc hiểu và trích xuất thông tin, suy luận ý chính trong văn bản.', benchmarkTarget: 65 },
];

// ============================================================================
// 4. MẪU DỮ LIỆU MÔN LỊCH SỬ (ĐỀ TRẮC NGHIỆM CHUẨN 2025: PHẦN I & PHẦN II)
// ============================================================================
export const SAMPLE_HISTORY_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'LS_P1_01', topic: 'Thế giới trong và sau Chiến tranh Lạnh', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P1_02', topic: 'Tổ chức Liên Hợp Quốc và vai trò quốc tế', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P1_03', topic: 'Xu thế phát triển của thế giới sau Chiến tranh Lạnh', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P1_04', topic: 'Tổ chức ASEAN: Quá trình thành lập và phát triển', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P1_05', topic: 'Cách mạng Tháng Tám 1945 và sự ra đời VNDCCH', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-02' },
  { questionNo: 'LS_P1_06', topic: 'Nghệ thuật chớp thời cơ trong Cách mạng Tháng Tám', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-LS12-02' },
  { questionNo: 'LS_P1_07', topic: 'Chiến dịch Điện Biên Phủ 1954 và Hiệp định Giơnevơ', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P1_08', topic: 'Cuộc kháng chiến chống Mỹ cứu nước (1954 - 1975)', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P1_09', topic: 'Đại thắng mùa Xuân 1975 và ý nghĩa lịch sử', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P1_10', topic: 'Đường lối Đổi mới của Đảng từ Đại hội VI (1986)', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-04' },
  { questionNo: 'LS_P1_11', topic: 'Thành tựu và bài học kinh nghiệm công cuộc Đổi mới', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-LS12-04' },
  { questionNo: 'LS_P1_12', topic: 'Lịch sử bảo vệ chủ quyền Biển Đông và hải đảo', thinkingLevel: 'Vận dụng cao', maxScore: 0.25, yccdCode: 'YCCD-LS12-04' },
  // Phần II: Trắc nghiệm Đúng/Sai
  { questionNo: 'LS_P2_C1_a', topic: 'Tác động trật tự thế giới hai cực Ianta', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P2_C1_b', topic: 'Mục tiêu chính sách đối ngoại của các siêu cường', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P2_C1_c', topic: 'Cơ hội và thách thức của Việt Nam khi gia nhập ASEAN', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P2_C1_d', topic: 'Đánh giá tác động toàn cầu hóa với an ninh quốc gia', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-LS12-01' },
  { questionNo: 'LS_P2_C2_a', topic: 'Chủ trương phát động Tổng khởi nghĩa tháng Tám 1945', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-LS12-02' },
  { questionNo: 'LS_P2_C2_b', topic: 'Phân tích nguyên nhân thắng lợi của Cách mạng Tháng Tám', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-02' },
  { questionNo: 'LS_P2_C2_c', topic: 'Bài học đại đoàn kết toàn dân tộc vận dụng hiện nay', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-LS12-02' },
  { questionNo: 'LS_P2_C2_d', topic: 'So sánh tính chất với các cuộc cách mạng thế giới', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-LS12-02' },
  { questionNo: 'LS_P2_C3_a', topic: 'Ý nghĩa Chiến dịch Hồ Chí Minh lịch sử 1975', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P2_C3_b', topic: 'Sự lãnh đạo của Đảng trong kháng chiến chống Mỹ', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P2_C3_c', topic: 'Kết hợp đấu tranh quân sự, chính trị và ngoại giao', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P2_C3_d', topic: 'Tác động của chiến thắng 1975 đến phong trào cách mạng thế giới', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-LS12-03' },
  { questionNo: 'LS_P2_C4_a', topic: 'Bối cảnh lịch sử trước công cuộc Đổi mới 1986', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-LS12-04' },
  { questionNo: 'LS_P2_C4_b', topic: 'Chuyển đổi kinh tế bao cấp sang kinh tế thị trường', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-LS12-04' },
  { questionNo: 'LS_P2_C4_c', topic: 'Bằng chứng lịch sử về chủ quyền Hoàng Sa và Trường Sa', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-LS12-04' },
  { questionNo: 'LS_P2_C4_d', topic: 'Giải pháp ngoại giao hòa bình bảo vệ chủ quyền biển đảo', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-LS12-04' },
];

export const SAMPLE_HISTORY_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-LS12-01',
    topic: 'Thế giới trong và sau Chiến tranh Lạnh',
    description: 'Trình bày và phân tích được trật tự hai cực Ianta, vai trò Liên Hợp Quốc, sự ra đời của ASEAN và xu thế toàn cầu hóa.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-LS12-02',
    topic: 'Cách mạng Tháng Tám và đấu tranh giải phóng dân tộc',
    description: 'Phân tích được thời cơ lịch sử, diễn biến và bài học kinh nghiệm của Cách mạng Tháng Tám 1945 trong bảo vệ Tổ quốc.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-LS12-03',
    topic: 'Hai cuộc kháng chiến chống Pháp và chống Mỹ (1945 - 1975)',
    description: 'Nêu bật các mốc son chiến lược (Điện Biên Phủ 1954, Mậu Thân 1968, Hà Nội 12 ngày đêm 1972, Đại thắng mùa Xuân 1975).',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-LS12-04',
    topic: 'Công cuộc Đổi mới và chủ quyền biển đảo Việt Nam',
    description: 'Hiểu rõ đường lối Đổi mới, hội nhập quốc tế toàn diện và các căn cứ lịch sử, pháp lý bảo vệ chủ quyền Hoàng Sa - Trường Sa.',
    benchmarkTarget: 65
  }
];

// ============================================================================
// 5. MẪU DỮ LIỆU MÔN ĐỊA LÍ (ĐỀ TRẮC NGHIỆM CHUẨN 2025)
// ============================================================================
export const SAMPLE_GEOGRAPHY_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'DL_P1_01', topic: 'Vị trí địa lí và phạm vi lãnh thổ Việt Nam', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P1_02', topic: 'Đặc điểm khí hậu nhiệt đới ẩm gió mùa', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P1_03', topic: 'Thiên nhiên phân hóa đa dạng theo độ cao', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P1_04', topic: 'Quy mô dân số và cơ cấu dân số theo tuổi', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-DL12-02' },
  { questionNo: 'DL_P1_05', topic: 'Đô thị hóa và phân bố dân cư Việt Nam', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-02' },
  { questionNo: 'DL_P1_06', topic: 'Chuyển dịch cơ cấu ngành kinh tế', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-03' },
  { questionNo: 'DL_P1_07', topic: 'Phát triển nông nghiệp sản xuất hàng hóa', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-DL12-03' },
  { questionNo: 'DL_P1_08', topic: 'Cơ cấu ngành công nghiệp và trung tâm công nghiệp', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-03' },
  { questionNo: 'DL_P1_09', topic: 'Phát triển kinh tế vùng Đồng bằng sông Hồng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-04' },
  { questionNo: 'DL_P1_10', topic: 'Phát triển kinh tế vùng Đông Nam Bộ', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-DL12-04' },
  { questionNo: 'DL_P1_11', topic: 'Thích ứng biến đổi khí hậu ở ĐBS Cửu Long', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-DL12-04' },
  { questionNo: 'DL_P1_12', topic: 'Phát triển kinh tế biển đảo và an ninh quốc gia', thinkingLevel: 'Vận dụng cao', maxScore: 0.25, yccdCode: 'YCCD-DL12-04' },
  // Phần II: Đúng/Sai
  { questionNo: 'DL_P2_C1_a', topic: 'Đọc Atlat: Nhận diện hướng địa hình vùng núi', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P2_C1_b', topic: 'Giải thích nguyên nhân sự phân hóa lượng mưa', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P2_C1_c', topic: 'Tác động của thiên tai lũ quét, sạt lở đất', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P2_C1_d', topic: 'Giải pháp bảo vệ tài nguyên rừng đầu nguồn', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-DL12-01' },
  { questionNo: 'DL_P2_C2_a', topic: 'Nhận xét bảng số liệu chuyển dịch cơ cấu GDP', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-DL12-03' },
  { questionNo: 'DL_P2_C2_b', topic: 'Tính toán tốc độ tăng trưởng kinh tế qua các năm', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-DL12-03' },
  { questionNo: 'DL_P2_C2_c', topic: 'Lựa chọn dạng biểu đồ thể hiện quy mô và cơ cấu', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-DL12-03' },
  { questionNo: 'DL_P2_C2_d', topic: 'Phân tích nguyên nhân dịch chuyển dịch vụ logistics', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-DL12-03' },
];

export const SAMPLE_GEOGRAPHY_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-DL12-01',
    topic: 'Vị trí địa lí và thiên nhiên nhiệt đới gió mùa',
    description: 'Xác định tọa độ lãnh thổ, tính chất nhiệt đới ẩm gió mùa và phân hóa thiên nhiên đồi núi - đồng bằng.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-DL12-02',
    topic: 'Địa lí dân cư, đô thị hóa và lao động',
    description: 'Phân tích cơ cấu dân số vàng, quá trình đô thị hóa và giải quyết việc làm cho lực lượng lao động trẻ.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-DL12-03',
    topic: 'Địa lí ngành nông nghiệp, công nghiệp, dịch vụ',
    description: 'Kỹ năng đọc bảng số liệu, vẽ biểu đồ và phân tích chuyển dịch cơ cấu ngành kinh tế theo hướng hiện đại.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-DL12-04',
    topic: 'Địa lí các vùng kinh tế và kinh tế biển đảo',
    description: 'Phân tích thế mạnh kinh tế vùng, sử dụng hợp lý tài nguyên thiên nhiên và chiến lược phát triển kinh tế biển đảo bền vững.',
    benchmarkTarget: 65
  }
];

// ============================================================================
// 6. MẪU DỮ LIỆU MÔN VẬT LÍ (ĐỀ TRẮC NGHIỆM CHUẨN 2025: PHẦN I, II, III)
// ============================================================================
export const SAMPLE_PHYSICS_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'VL_P1_01', topic: 'Mô hình động học phân tử chất khí', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P1_02', topic: 'Nội năng và định luật I nhiệt động lực học', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P1_03', topic: 'Nhiệt dung riêng và nhiệt nóng chảy riêng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P1_04', topic: 'Phương trình trạng thái khí lí tưởng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P1_05', topic: 'Từ trường và đường sức từ', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-VL12-02' },
  { questionNo: 'VL_P1_06', topic: 'Lực từ tác dụng lên đoạn dây dẫn mang dòng điện', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-02' },
  { questionNo: 'VL_P1_07', topic: 'Hiện tượng cảm ứng điện từ và suất điện động', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-02' },
  { questionNo: 'VL_P1_08', topic: 'Cấu tạo hạt nhân và năng lượng liên kết', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-VL12-03' },
  { questionNo: 'VL_P1_09', topic: 'Độ hụt khối và năng lượng tỏa ra trong phản ứng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-03' },
  { questionNo: 'VL_P1_10', topic: 'Hiện tượng phóng xạ và chu kỳ bán rã', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-03' },
  { questionNo: 'VL_P1_11', topic: 'Ứng dụng nhiệt động học trong động cơ nhiệt', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P1_12', topic: 'Ứng dụng từ trường gia tốc hạt cyclotron', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-VL12-02' },
  // Phần II: Đúng/Sai
  { questionNo: 'VL_P2_C1_a', topic: 'Quá trình biến đổi trạng thái đẳng nhiệt', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P2_C1_b', topic: 'Khí lí tưởng dãn nở sinh công', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P2_C1_c', topic: 'Tính nhiệt lượng truyền cho khối khí', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P2_C1_d', topic: 'Đồ thị chu trình nhiệt trong hệ tọa độ p-V', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-VL12-01' },
  // Phần III: Trả lời ngắn
  { questionNo: 'VL_P3_01', topic: 'Tính nhiệt lượng làm nóng chảy 2kg nước đá (kJ)', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P3_02', topic: 'Tính áp suất khí trong bình sau khi tăng nhiệt độ (kPa)', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-VL12-01' },
  { questionNo: 'VL_P3_03', topic: 'Độ lớn lực Loren-xơ tác dụng lên proton (x 10^-14 N)', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-VL12-02' },
  { questionNo: 'VL_P3_04', topic: 'Độ lớn suất điện động cảm ứng xuất hiện trong khung dây (V)', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-VL12-02' },
  { questionNo: 'VL_P3_05', topic: 'Năng lượng tỏa ra của phản ứng phân hạch 1g U235 (x 10^10 J)', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-VL12-03' },
  { questionNo: 'VL_P3_06', topic: 'Thời gian để độ phóng xạ giảm đi 16 lần (ngày)', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-VL12-03' },
];

export const SAMPLE_PHYSICS_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-VL12-01',
    topic: 'Vật lí nhiệt và thuyết động học phân tử chất khí',
    description: 'Hiểu các khái niệm nhiệt dung riêng, nhiệt nóng chảy riêng; vận dụng phương trình trạng thái khí lí tưởng để giải bài toán kỹ thuật.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-VL12-02',
    topic: 'Từ trường và hiện tượng cảm ứng điện từ',
    description: 'Xác định phương, chiều và độ lớn lực từ, lực Loren-xơ; vận dụng định luật Faraday và Lenz trong máy phát điện và động cơ.',
    benchmarkTarget: 65
  },
  {
    code: 'YCCD-VL12-03',
    topic: 'Vật lí hạt nhân và ứng dụng năng lượng',
    description: 'Tính toán năng lượng liên kết, độ hụt khối hạt nhân, vận dụng quy luật phóng xạ và an toàn bức xạ ion hóa.',
    benchmarkTarget: 60
  }
];

// ============================================================================
// 7. MẪU DỮ LIỆU MÔN SINH HỌC (ĐỀ TRẮC NGHIỆM CHUẨN 2025)
// ============================================================================
export const SAMPLE_BIOLOGY_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'SH_P1_01', topic: 'Cấu trúc ADN và cơ chế tái bản', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-SH12-01' },
  { questionNo: 'SH_P1_02', topic: 'Quá trình phiên mã và dịch mã', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-SH12-01' },
  { questionNo: 'SH_P1_03', topic: 'Điều hòa hoạt động gen ở sinh vật nhân sơ (Operon Lac)', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-SH12-01' },
  { questionNo: 'SH_P1_04', topic: 'Đột biến gen: Các dạng đột biến điểm', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-SH12-01' },
  { questionNo: 'SH_P1_05', topic: 'Đột biến cấu trúc và số lượng nhiễm sắc thể', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-SH12-01' },
  { questionNo: 'SH_P1_06', topic: 'Quy luật phân ly độc lập của Mendel', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P1_07', topic: 'Liên kết gen và hoán vị gen', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P1_08', topic: 'Cấu trúc di truyền và cân bằng quần thể Hardy-Weinberg', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P1_09', topic: 'Các nhân tố tiến hóa trong thuyết tiến hóa tổng hợp', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-SH12-03' },
  { questionNo: 'SH_P1_10', topic: 'Chọn lọc tự nhiên và vai trò hình thành loài mới', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-SH12-03' },
  { questionNo: 'SH_P1_11', topic: 'Hệ sinh thái, chuỗi và lưới thức ăn', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-SH12-04' },
  { questionNo: 'SH_P1_12', topic: 'Bảo tồn đa dạng sinh học và phát triển bền vững', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-SH12-04' },
  // Phần II: Đúng/Sai
  { questionNo: 'SH_P2_C1_a', topic: 'Sơ đồ phả hệ xác định bệnh di truyền lặn', thinkingLevel: 'Hiểu', maxScore: 0.10, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P2_C1_b', topic: 'Xác định kiểu gen của các thành viên trong gia đình', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P2_C1_c', topic: 'Tính xác suất sinh con đầu lòng mắc bệnh', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P2_C1_d', topic: 'Tư vấn di truyền y học dựa trên sàng lọc trước sinh', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-SH12-02' },
  // Phần III: Trả lời ngắn
  { questionNo: 'SH_P3_01', topic: 'Tính số nucleotit loại Guanin của gen (nu)', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-SH12-01' },
  { questionNo: 'SH_P3_02', topic: 'Số loại kiểu gen tối đa tạo thành trong quần thể', thinkingLevel: 'Vận dụng', maxScore: 0.50, yccdCode: 'YCCD-SH12-02' },
  { questionNo: 'SH_P3_03', topic: 'Tần số alen A trong quần thể sau 1 thế hệ chọn lọc (%)', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-SH12-03' },
  { questionNo: 'SH_P3_04', topic: 'Tỉ lệ kiểu hình mang 3 tính trạng trội ở đời con (%)', thinkingLevel: 'Vận dụng cao', maxScore: 0.50, yccdCode: 'YCCD-SH12-02' },
];

export const SAMPLE_BIOLOGY_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-SH12-01',
    topic: 'Cơ chế di truyền và biến dị ở cấp độ phân tử & tế bào',
    description: 'Mô tả cơ chế sao chép ADN, phiên mã, dịch mã, điều hòa gen và cơ chế phát sinh đột biến gen, đột biến NST.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-SH12-02',
    topic: 'Quy luật di truyền và di truyền quần thể',
    description: 'Vận dụng các quy luật Mendel, liên kết hoán vị gen và định luật Hardy-Weinberg để giải bài toán xác suất di truyền.',
    benchmarkTarget: 60
  },
  {
    code: 'YCCD-SH12-03',
    topic: 'Tiến hóa sinh học',
    description: 'Phân biệt vai trò của các nhân tố tiến hóa (đột biến, CLTN, di - nhập gen, yếu tố ngẫu nhiên, giao phối không ngẫu nhiên).',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-SH12-04',
    topic: 'Sinh thái học và môi trường sống',
    description: 'Phân tích các mối quan hệ sinh thái, dòng năng lượng trong hệ sinh thái và đề xuất biện pháp bảo tồn thiên nhiên.',
    benchmarkTarget: 80
  }
];

// ============================================================================
// 8. MẪU DỮ LIỆU MÔN TIN HỌC (ĐỀ TRẮC NGHIỆM CHUẨN 2025 THEO QĐ 764/QĐ-BGDĐT)
// Đề 30 câu, thí sinh làm 28 câu = 10.0 điểm:
// - Phần I (24 câu): Trắc nghiệm nhiều lựa chọn (0.25đ / câu = 6.0 điểm)
// - Phần II (6 câu): Trắc nghiệm Đúng/Sai (tối đa 1.0đ / câu = 4.0 điểm)
//   + Câu 1, 2: Bắt buộc chung cho mọi thí sinh
//   + Câu 3, 4: Định hướng Tin học ứng dụng (ICT)
//   + Câu 5, 6: Định hướng Khoa học máy tính (CS)
//   (Thí sinh chọn làm 1 trong 2 định hướng: làm câu 3,4 hoặc câu 5,6)
// - Phần III: KHÔNG CÓ (0 câu)
// ============================================================================
export const SAMPLE_INFORMATICS_MATRIX: ExamMatrixItem[] = [
  // Phần I: 24 câu trắc nghiệm nhiều lựa chọn
  { questionNo: 'TH_P1_01', topic: 'Cú pháp hàm và kiểu dữ liệu danh sách Python', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P1_02', topic: 'Biểu thức logic và câu lệnh rẽ nhánh if-else', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P1_03', topic: 'Vòng lặp for, while và xử lý chuỗi ký tự', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P1_04', topic: 'Thuật toán tìm kiếm tuần tự và nhị phân', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P1_05', topic: 'Thuật toán sắp xếp nổi bọt và sắp xếp chèn', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P1_06', topic: 'Thuật toán sắp xếp nhanh (Quick Sort)', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P1_07', topic: 'Khái niệm và vai trò hệ CSDL quan hệ', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-02' },
  { questionNo: 'TH_P1_08', topic: 'Khóa chính, khóa ngoại và toàn vẹn tham chiếu', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-02' },
  { questionNo: 'TH_P1_09', topic: 'Câu lệnh truy vấn SQL SELECT, FROM, WHERE', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-02' },
  { questionNo: 'TH_P1_10', topic: 'Gộp nhóm dữ liệu SQL GROUP BY và HAVING', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TH12-02' },
  { questionNo: 'TH_P1_11', topic: 'Kết nối bảng trong CSDL với INNER JOIN', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TH12-02' },
  { questionNo: 'TH_P1_12', topic: 'Kiến trúc mạng LAN, WAN và mô hình TCP/IP', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-03' },
  { questionNo: 'TH_P1_13', topic: 'Địa chỉ IPv4, IPv6 và mặt nạ mạng con Subnet', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-03' },
  { questionNo: 'TH_P1_14', topic: 'Giao thức HTTP, HTTPS, DNS và bảo mật web', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-03' },
  { questionNo: 'TH_P1_15', topic: 'An toàn thông tin mạng và phòng chống mã độc', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-03' },
  { questionNo: 'TH_P1_16', topic: 'Mã hóa dữ liệu đối xứng và bất đối xứng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-03' },
  { questionNo: 'TH_P1_17', topic: 'Định dạng tài liệu văn bản và chuẩn hóa văn bản số', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_18', topic: 'Xử lý công thức mảng và hàm dò tìm trong bảng tính', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_19', topic: 'Ứng dụng của trí tuệ nhân tạo (AI) trong thực tiễn', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_20', topic: 'Mô hình học máy và xử lý ngôn ngữ tự nhiên', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_21', topic: 'Vấn đề đạo đức và quyền riêng tư trong xã hội số', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_22', topic: 'Pháp luật bản quyền và sở hữu trí tuệ số', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_23', topic: 'Kỹ năng làm việc cộng tác trên môi trường đám mây', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P1_24', topic: 'Thiết kế hệ thống thông tin hướng dịch vụ', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-TH12-02' },

  // Phần II: 6 câu Đúng/Sai (Mỗi câu tối đa 1.00 điểm)
  // Câu 1, 2: Bắt buộc chung
  { questionNo: 'TH_P2_C01', topic: 'Chủ đề chung (Bắt buộc): Mạng máy tính & An ninh số', thinkingLevel: 'Hiểu', maxScore: 1.00, yccdCode: 'YCCD-TH12-03' },
  { questionNo: 'TH_P2_C02', topic: 'Chủ đề chung (Bắt buộc): Cơ sở dữ liệu quan hệ & Truy vấn SQL', thinkingLevel: 'Vận dụng', maxScore: 1.00, yccdCode: 'YCCD-TH12-02' },
  // Câu 3, 4: Lựa chọn 1 - Tin học ứng dụng (ICT)
  { questionNo: 'TH_P2_C03', topic: 'Tự chọn ICT: Thiết kế đồ họa vector và dàn trang số', thinkingLevel: 'Hiểu', maxScore: 1.00, yccdCode: 'YCCD-TH12-04' },
  { questionNo: 'TH_P2_C04', topic: 'Tự chọn ICT: Tạo trang web tĩnh với HTML5/CSS3 & Biểu mẫu', thinkingLevel: 'Vận dụng', maxScore: 1.00, yccdCode: 'YCCD-TH12-04' },
  // Câu 5, 6: Lựa chọn 2 - Khoa học máy tính (CS)
  { questionNo: 'TH_P2_C05', topic: 'Tự chọn CS: Cấu trúc dữ liệu Ngăn xếp (Stack) & Hàng đợi (Queue)', thinkingLevel: 'Hiểu', maxScore: 1.00, yccdCode: 'YCCD-TH12-01' },
  { questionNo: 'TH_P2_C06', topic: 'Tự chọn CS: Kỹ thuật đệ quy & Thuật toán duyệt đồ thị BFS/DFS', thinkingLevel: 'Vận dụng cao', maxScore: 1.00, yccdCode: 'YCCD-TH12-01' }
];

export const SAMPLE_INFORMATICS_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-TH12-01',
    topic: 'Thuật toán và lập trình ứng dụng với Python',
    description: 'Hiểu và cài đặt được các thuật toán tìm kiếm, sắp xếp; viết hàm đệ quy và cấu trúc dữ liệu mảng/từ điển hiệu quả.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-TH12-02',
    topic: 'Hệ cơ sở dữ liệu quan hệ và SQL',
    description: 'Thiết kế lược đồ bảng, xác định khóa, toàn vẹn dữ liệu và viết câu lệnh truy vấn lọc, gộp nhóm dữ liệu SQL thành thạo.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-TH12-03',
    topic: 'Mạng máy tính và An toàn thông tin số',
    description: 'Hiểu nguyên lí truyền thông tin mạng, phân chia subnet, cấu hình thiết bị mạng và thực thi các biện pháp an ninh mạng.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-TH12-04',
    topic: 'Trí tuệ nhân tạo và Xã hội số',
    description: 'Nhận thức đúng đắn về cơ hội, thách thức của công nghệ AI, quyền riêng tư dữ liệu và tuân thủ pháp luật bản quyền số.',
    benchmarkTarget: 85
  }
];

// ============================================================================
// 9. MẪU DỮ LIỆU MÔN GIÁO DỤC KINH TẾ & PHÁP LUẬT (GDKT&PL)
// ============================================================================
export const SAMPLE_GDKTPL_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'KTPL_P1_01', topic: 'Tăng trưởng và phát triển kinh tế bền vững', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-01' },
  { questionNo: 'KTPL_P1_02', topic: 'Chỉ số phát triển con người (HDI) và GDP bình quân', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-01' },
  { questionNo: 'KTPL_P1_03', topic: 'Lạm phát: Nguyên nhân và tác động đến đời sống', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-01' },
  { questionNo: 'KTPL_P1_04', topic: 'Chính sách kiểm soát lạm phát của Nhà nước', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-01' },
  { questionNo: 'KTPL_P1_05', topic: 'Thất nghiệp và các giải pháp tạo việc làm', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-01' },
  { questionNo: 'KTPL_P1_06', topic: 'Hội nhập kinh tế quốc tế và các hiệp định FTA', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-01' },
  { questionNo: 'KTPL_P1_07', topic: 'Quyền bình đẳng của công dân trước pháp luật', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P1_08', topic: 'Quyền tự do kinh doanh và nghĩa vụ nộp thuế', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P1_09', topic: 'Pháp luật về bảo vệ quyền lợi người tiêu dùng', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P1_10', topic: 'Hành vi cạnh tranh không lành mạnh và xử lý vi phạm', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P1_11', topic: 'Quyền khiếu nại, tố cáo và nghĩa vụ của công dân', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-03' },
  { questionNo: 'KTPL_P1_12', topic: 'Hiến pháp nước CHXHCN Việt Nam và bộ máy nhà nước', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-03' },
  // Phần II: Đúng/Sai (Tình huống pháp luật)
  { questionNo: 'KTPL_P2_C1_a', topic: 'Tình huống: Doanh nghiệp xả thải gây ô nhiễm môi trường', thinkingLevel: 'Biết', maxScore: 0.10, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P2_C1_b', topic: 'Xác định loại trách nhiệm pháp lý doanh nghiệp phải gánh chịu', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P2_C1_c', topic: 'Quyền khởi kiện yêu cầu bồi thường thiệt hại của người dân', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-KTPL12-02' },
  { questionNo: 'KTPL_P2_C1_d', topic: 'Đánh giá hành vi cản trở cơ quan thanh tra kiểm tra', thinkingLevel: 'Vận dụng cao', maxScore: 0.40, yccdCode: 'YCCD-KTPL12-03' },
];

export const SAMPLE_GDKTPL_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-KTPL12-01',
    topic: 'Kinh tế vĩ mô và hội nhập kinh tế quốc tế',
    description: 'Hiểu rõ các chỉ tiêu tăng trưởng kinh tế, nguyên nhân lạm phát, thất nghiệp và chính sách an sinh xã hội.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-KTPL12-02',
    topic: 'Pháp luật trong hoạt động kinh doanh',
    description: 'Nhận biết quyền tự do kinh doanh, nghĩa vụ nộp thuế, bảo vệ người tiêu dùng và trách nhiệm xã hội của doanh nghiệp.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-KTPL12-03',
    topic: 'Quyền và nghĩa vụ cơ bản của công dân',
    description: 'Thực hiện đúng quyền bình đẳng, quyền tự do ngôn luận, quyền khiếu nại tố cáo và sống thượng tôn pháp luật.',
    benchmarkTarget: 80
  }
];

// ============================================================================
// 10. MẪU DỮ LIỆU MÔN GIÁO DỤC THỂ CHẤT (ĐÁNH GIÁ ĐẠT / CHƯA ĐẠT THEO TT 22)
// ============================================================================
export interface PeStudentRow {
  sbd: string;
  fullName: string;
  className: string;
  criteria: {
    kyThuat1: 'Đ' | 'CĐ';  // Xuất phát & Kỹ thuật
    kyThuat2: 'Đ' | 'CĐ';  // Nhảy cao / Bóng chuyền
    theLuc: 'Đ' | 'CĐ';    // Đạt chỉ số tiêu chuẩn RLTT
    yThuc: 'Đ' | 'CĐ';     // Thái độ & An toàn
  };
  overallResult: 'Đ' | 'CĐ';
  teacherComment?: string;
}

export const SAMPLE_PE_DATA: PeStudentRow[] = [
  { sbd: '52830001', fullName: 'Bùi Đức Anh', className: '12A1', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Thực hiện động tác chuẩn xác, thể lực tốt.' },
  { sbd: '52830002', fullName: 'Đặng Ngọc Ánh', className: '12A1', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Tích cực tập luyện, hoàn thành xuất sắc.' },
  { sbd: '52830003', fullName: 'Hoàng Minh Châu', className: '12A1', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Kỹ thuật tốt, đạt chuẩn.' },
  { sbd: '52830004', fullName: 'Lê Tuấn Dũng', className: '12A2', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Nắm vững kỹ thuật động tác.' },
  { sbd: '52830005', fullName: 'Ngô Hải Đăng', className: '12A2', criteria: { kyThuat1: 'CĐ', kyThuat2: 'Đ', theLuc: 'CĐ', yThuc: 'Đ' }, overallResult: 'CĐ', teacherComment: 'Chưa đạt chỉ số sức bền, cần rèn luyện thêm.' },
  { sbd: '52830006', fullName: 'Phạm Hương Giang', className: '12A2', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Thực hiện đúng biên độ động tác.' },
  { sbd: '52830007', fullName: 'Trần Gia Huy', className: '12A3', criteria: { kyThuat1: 'CĐ', kyThuat2: 'CĐ', theLuc: 'CĐ', yThuc: 'Đ' }, overallResult: 'CĐ', teacherComment: 'Kỹ thuật xuất phát sai nhịp, thể lực yếu.' },
  { sbd: '52830008', fullName: 'Vũ Thảo Linh', className: '12A3', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Hoàn thành tốt các nội dung.' },
  { sbd: '52830009', fullName: 'Đỗ Quốc Khánh', className: '12A3', criteria: { kyThuat1: 'Đ', kyThuat2: 'CĐ', theLuc: 'CĐ', yThuc: 'Đ' }, overallResult: 'CĐ', teacherComment: 'Chưa đạt yêu cầu về sức bền chạy cự ly trung bình.' },
  { sbd: '52830010', fullName: 'Nguyễn Diệu Linh', className: '12A4', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Kỹ thuật chuẩn, tinh thần tập luyện tốt.' },
  { sbd: '52830011', fullName: 'Lý Hoàng Nam', className: '12A4', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Thể lực rất tốt, kỹ thuật chuẩn.' },
  { sbd: '52830012', fullName: 'Phan Bảo Ngọc', className: '12A4', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Thực hiện động tác đẹp mắt, đúng nhịp.' },
  { sbd: '52830013', fullName: 'Tạ Minh Quân', className: '12A1', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Đạt yêu cầu các bài tập thực hành.' },
  { sbd: '52830014', fullName: 'Võ Tuyết Mai', className: '12A2', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Nhanh nhẹn, kỹ thuật xuất phát tốt.' },
  { sbd: '52830015', fullName: 'Trịnh Nhật Minh', className: '12A3', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'CĐ', yThuc: 'Đ' }, overallResult: 'CĐ', teacherComment: 'Cần tăng cường rèn luyện sức bền ngoài giờ.' },
  { sbd: '52830016', fullName: 'Dương Yến Nhi', className: '12A4', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Hoàn thành các nội dung đúng kỹ thuật.' },
  { sbd: '52830017', fullName: 'Lương Tuấn Phong', className: '12A1', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Đạt thành tích tốt môn bóng chuyền.' },
  { sbd: '52830018', fullName: 'Nguyễn Thành Trung', className: '12A2', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Kỹ thuật đạt yêu cầu.' },
  { sbd: '52830019', fullName: 'Bạch Thúy Vy', className: '12A3', criteria: { kyThuat1: 'Đ', kyThuat2: 'CĐ', theLuc: 'CĐ', yThuc: 'Đ' }, overallResult: 'CĐ', teacherComment: 'Chưa đạt chỉ số thể lực theo độ tuổi.' },
  { sbd: '52830020', fullName: 'Hà Xuân Trường', className: '12A4', criteria: { kyThuat1: 'Đ', kyThuat2: 'Đ', theLuc: 'Đ', yThuc: 'Đ' }, overallResult: 'Đ', teacherComment: 'Ý thức tự giác và kỹ thuật tốt.' },
];

// ============================================================================
// HÀM SINH DỮ LIỆU ĐIỂM CHI TIẾT TỰ ĐỘNG CHO BẤT KỲ MA TRẬN MÔN HỌC NÀO
// ============================================================================
export function generateItemScoresForMatrix(matrix: ExamMatrixItem[], candidateCount: number = 30): {
  sbd: string;
  fullName: string;
  className: string;
  itemScores: Record<string, number>;
  totalScore: number;
}[] {
  const students = [
    { sbd: '52830001', name: 'Bùi Đức Anh', cls: '12A1', ability: 0.86 },
    { sbd: '52830002', name: 'Đặng Ngọc Ánh', cls: '12A1', ability: 0.92 },
    { sbd: '52830003', name: 'Hoàng Minh Châu', cls: '12A1', ability: 0.78 },
    { sbd: '52830004', name: 'Lê Tuấn Dũng', cls: '12A2', ability: 0.64 },
    { sbd: '52830005', name: 'Ngô Hải Đăng', cls: '12A2', ability: 0.52 },
    { sbd: '52830006', name: 'Phạm Hương Giang', cls: '12A2', ability: 0.80 },
    { sbd: '52830007', name: 'Trần Gia Huy', cls: '12A3', ability: 0.42 },
    { sbd: '52830008', name: 'Vũ Thảo Linh', cls: '12A3', ability: 0.72 },
    { sbd: '52830009', name: 'Đỗ Quốc Khánh', cls: '12A3', ability: 0.34 },
    { sbd: '52830010', name: 'Nguyễn Diệu Linh', cls: '12A4', ability: 0.68 },
    { sbd: '52830011', name: 'Lý Hoàng Nam', cls: '12A4', ability: 0.84 },
    { sbd: '52830012', name: 'Phan Bảo Ngọc', cls: '12A4', ability: 0.90 },
    { sbd: '52830013', name: 'Tạ Minh Quân', cls: '12A1', ability: 0.76 },
    { sbd: '52830014', name: 'Võ Tuyết Mai', cls: '12A2', ability: 0.88 },
    { sbd: '52830015', name: 'Trịnh Nhật Minh', cls: '12A3', ability: 0.58 },
    { sbd: '52830016', name: 'Dương Yến Nhi', cls: '12A4', ability: 0.70 },
    { sbd: '52830017', name: 'Lương Tuấn Phong', cls: '12A1', ability: 0.82 },
    { sbd: '52830018', name: 'Nguyễn Thành Trung', cls: '12A2', ability: 0.62 },
    { sbd: '52830019', name: 'Bạch Thúy Vy', cls: '12A3', ability: 0.48 },
    { sbd: '52830020', name: 'Hà Xuân Trường', cls: '12A4', ability: 0.74 },
  ];

  if (!matrix || matrix.length === 0) return [];

  return students.map((stu, sIdx) => {
    const itemScores: Record<string, number> = {};
    let total = 0;

    // Phân loại nhóm tự chọn (cho môn Tin học): học sinh chẵn chọn ICT (câu 3,4), học sinh lẻ chọn CS (câu 5,6)
    const picksICT = sIdx % 2 === 0;

    matrix.forEach((q, qIndex) => {
      const qNo = q.questionNo.toUpperCase();
      const topicLower = (q.topic || '').toLowerCase();

      // Kiểm tra nếu là câu tự chọn môn Tin học
      const isElectiveICT = qNo === 'TH_P2_C03' || qNo === 'TH_P2_C04' || topicLower.includes('tự chọn ict') || topicLower.includes('tin học ứng dụng');
      const isElectiveCS = qNo === 'TH_P2_C05' || qNo === 'TH_P2_C06' || topicLower.includes('tự chọn cs') || topicLower.includes('khoa học máy tính');

      if (isElectiveICT && !picksICT) {
        // Thí sinh này chọn nhánh CS, không làm nhánh ICT -> bỏ trống
        return;
      }
      if (isElectiveCS && picksICT) {
        // Thí sinh này chọn nhánh ICT, không làm nhánh CS -> bỏ trống
        return;
      }

      let baseDifficulty = 0.5;
      if (q.thinkingLevel === 'Biết') baseDifficulty = 0.85;
      else if (q.thinkingLevel === 'Hiểu') baseDifficulty = 0.70;
      else if (q.thinkingLevel === 'Vận dụng') baseDifficulty = 0.48;
      else if (q.thinkingLevel === 'Vận dụng cao') baseDifficulty = 0.28;

      let prob = stu.ability * 0.6 + baseDifficulty * 0.4;
      
      // Giả lập 1 câu dị biệt (anomaly trap) ở câu thứ 10 hoặc câu vận dụng cao để phân tích sư phạm
      if (qIndex === 9 || qIndex === matrix.length - 2) {
        prob = stu.ability > 0.75 ? 0.35 : 0.50; // Câu có yếu tố đánh đố
      }

      const isCorrect = (Math.random() < Math.min(Math.max(prob, 0.05), 0.98));
      const score = isCorrect ? q.maxScore : 0;
      itemScores[q.questionNo] = score;
      total += score;
    });

    return {
      sbd: stu.sbd,
      fullName: stu.name,
      className: stu.cls,
      itemScores,
      totalScore: Number(Math.min(10.0, total).toFixed(2))
    };
  });
}

// ============================================================================
// 11. DANH MỤC TẤT CẢ CÁC MÔN HỌC ĐỀ XUẤT THEO CHƯƠNG TRÌNH GDPT 2018 (CẤP THPT)
// MỖI MÔN ĐỀU CÓ MA TRẬN VÀ YCCĐ ĐẶC THÙ RIÊNG BIỆT 100%
// ============================================================================
export const GDPT_2018_SUBJECTS: SubjectMetadataGDPT[] = [
  // 1. Nhóm môn Bắt buộc
  {
    name: 'Ngữ văn',
    shortName: 'Văn',
    group: 'Môn Bắt buộc',
    category: 'essay',
    formatDescription: 'Tự luận 100% (Phần I: Đọc hiểu 4.0đ; Phần II: Viết 6.0đ theo rubric)',
    badgeLabel: 'Tự luận rubric',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    sampleMatrix: SAMPLE_LITERATURE_MATRIX,
    sampleYccd: SAMPLE_LITERATURE_YCCD,
  },
  {
    name: 'Toán',
    shortName: 'Toán',
    group: 'Môn Bắt buộc',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm chuẩn 2025 (P.I 12 câu MC; P.II 4 câu Đ/S; P.III 6 câu TLN)',
    badgeLabel: 'Trắc nghiệm 3 phần',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    sampleMatrix: SAMPLE_MATH_MATRIX,
    sampleYccd: SAMPLE_MATH_YCCD,
  },
  {
    name: 'Tiếng Anh',
    shortName: 'Anh',
    group: 'Môn Bắt buộc',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm khách quan đo lường 4 kỹ năng ngôn ngữ và giao tiếp',
    badgeLabel: 'Trắc nghiệm ngoại ngữ',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    sampleMatrix: SAMPLE_ENGLISH_MATRIX,
    sampleYccd: SAMPLE_ENGLISH_YCCD,
  },
  {
    name: 'Lịch sử',
    shortName: 'Sử',
    group: 'Môn Bắt buộc',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm định dạng 2025 (P.I Trắc nghiệm nhiều lựa chọn & P.II Đúng/Sai)',
    badgeLabel: 'Trắc nghiệm KHXH',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    sampleMatrix: SAMPLE_HISTORY_MATRIX,
    sampleYccd: SAMPLE_HISTORY_YCCD,
  },
  {
    name: 'Giáo dục thể chất',
    shortName: 'GDTC',
    group: 'Môn Bắt buộc',
    category: 'evaluation',
    formatDescription: 'Đánh giá bằng nhận xét: Đạt (Đ) / Chưa đạt (CĐ) theo Thông tư 22',
    badgeLabel: 'Đánh giá Đ/CĐ TT22',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sampleMatrix: [],
    sampleYccd: [],
  },

  // 2. Nhóm môn Lựa chọn - Khoa học Tự nhiên
  {
    name: 'Hóa học',
    shortName: 'Hóa',
    group: 'Khoa học Tự nhiên',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm chuẩn 2025 (28 câu: 18 câu MC, 4 câu Đúng/Sai, 6 câu TLN)',
    badgeLabel: 'Trắc nghiệm KHTN',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    sampleMatrix: SAMPLE_CHEMISTRY_MATRIX,
    sampleYccd: SAMPLE_CHEMISTRY_YCCD,
  },
  {
    name: 'Vật lí',
    shortName: 'Lý',
    group: 'Khoa học Tự nhiên',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm định dạng 2025 (Kiến thức cơ học, nhiệt, điện & từ trường)',
    badgeLabel: 'Trắc nghiệm KHTN',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    sampleMatrix: SAMPLE_PHYSICS_MATRIX,
    sampleYccd: SAMPLE_PHYSICS_YCCD,
  },
  {
    name: 'Sinh học',
    shortName: 'Sinh',
    group: 'Khoa học Tự nhiên',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm định dạng 2025 (Di truyền học, sinh thái và tiến hóa)',
    badgeLabel: 'Trắc nghiệm KHTN',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    sampleMatrix: SAMPLE_BIOLOGY_MATRIX,
    sampleYccd: SAMPLE_BIOLOGY_YCCD,
  },

  // 3. Nhóm môn Lựa chọn - Khoa học Xã hội
  {
    name: 'Địa lí',
    shortName: 'Địa',
    group: 'Khoa học Xã hội',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm định dạng 2025 (Khai thác Atlat, bảng số liệu, biểu đồ)',
    badgeLabel: 'Trắc nghiệm KHXH',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    sampleMatrix: SAMPLE_GEOGRAPHY_MATRIX,
    sampleYccd: SAMPLE_GEOGRAPHY_YCCD,
  },
  {
    name: 'GDKT&PL',
    shortName: 'Kinh tế & Pháp luật',
    group: 'Khoa học Xã hội',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm xử lý tình huống pháp luật và kinh tế thị trường',
    badgeLabel: 'Trắc nghiệm KHXH',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    sampleMatrix: SAMPLE_GDKTPL_MATRIX,
    sampleYccd: SAMPLE_GDKTPL_YCCD,
  },

  // 4. Nhóm môn Lựa chọn - Công nghệ & Tin học
  {
    name: 'Tin học',
    shortName: 'Tin',
    group: 'Công nghệ & Nghệ thuật',
    category: 'multiple_choice',
    formatDescription: 'Trắc nghiệm thuật toán, lập trình Python & hệ thống CSDL',
    badgeLabel: 'Trắc nghiệm Công nghệ',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    sampleMatrix: SAMPLE_INFORMATICS_MATRIX,
    sampleYccd: SAMPLE_INFORMATICS_YCCD,
  },
  {
    name: 'Hoạt động trải nghiệm',
    shortName: 'HĐTN',
    group: 'Môn Bắt buộc',
    category: 'evaluation',
    formatDescription: 'Đánh giá phẩm chất, kỹ năng và trách nhiệm cộng đồng (Đạt/Chưa đạt TT22)',
    badgeLabel: 'Đánh giá Đ/CĐ TT22',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sampleMatrix: [],
    sampleYccd: [],
  },
];

// Bản đồ ánh xạ tên gọi môn học linh hoạt (Alias dictionary)
export const SUBJECT_ALIASES: Record<string, string> = {
  'ngữ văn': 'Ngữ văn',
  'ngu van': 'Ngữ văn',
  'văn': 'Ngữ văn',
  'van': 'Ngữ văn',
  'ngữ-văn': 'Ngữ văn',
  'môn văn': 'Ngữ văn',
  'môn ngữ văn': 'Ngữ văn',

  'toán': 'Toán',
  'toan': 'Toán',
  'toán học': 'Toán',
  'toan hoc': 'Toán',
  'môn toán': 'Toán',

  'tiếng anh': 'Tiếng Anh',
  'tieng anh': 'Tiếng Anh',
  'tiếng-anh': 'Tiếng Anh',
  'anh': 'Tiếng Anh',
  'english': 'Tiếng Anh',
  'ngoại ngữ': 'Tiếng Anh',
  'ngoai ngu': 'Tiếng Anh',
  'môn tiếng anh': 'Tiếng Anh',

  'lịch sử': 'Lịch sử',
  'lich su': 'Lịch sử',
  'sử': 'Lịch sử',
  'su': 'Lịch sử',
  'môn lịch sử': 'Lịch sử',
  'môn sử': 'Lịch sử',

  'địa lí': 'Địa lí',
  'địa lý': 'Địa lí',
  'dia li': 'Địa lí',
  'dia ly': 'Địa lí',
  'địa': 'Địa lí',
  'dia': 'Địa lí',
  'môn địa lí': 'Địa lí',
  'môn địa': 'Địa lí',

  'vật lí': 'Vật lí',
  'vật lý': 'Vật lí',
  'vat li': 'Vật lí',
  'vat ly': 'Vật lí',
  'lý': 'Vật lí',
  'lí': 'Vật lí',
  'môn vật lí': 'Vật lí',
  'môn vật lý': 'Vật lí',

  'hóa học': 'Hóa học',
  'hoa hoc': 'Hóa học',
  'hóa': 'Hóa học',
  'hoa': 'Hóa học',
  'môn hóa học': 'Hóa học',
  'môn hóa': 'Hóa học',

  'sinh học': 'Sinh học',
  'sinh hoc': 'Sinh học',
  'sinh': 'Sinh học',
  'môn sinh học': 'Sinh học',
  'môn sinh': 'Sinh học',

  'tin học': 'Tin học',
  'tin hoc': 'Tin học',
  'tin': 'Tin học',
  'it': 'Tin học',
  'môn tin học': 'Tin học',

  'gdkt&pl': 'GDKT&PL',
  'gdktpl': 'GDKT&PL',
  'kinh tế & pháp luật': 'GDKT&PL',
  'kinh tế pháp luật': 'GDKT&PL',
  'giáo dục kinh tế và pháp luật': 'GDKT&PL',
  'gdcd': 'GDKT&PL',
  'giáo dục công dân': 'GDKT&PL',

  'giáo dục thể chất': 'Giáo dục thể chất',
  'gdtc': 'Giáo dục thể chất',
  'thể chất': 'Giáo dục thể chất',
  'thể dục': 'Giáo dục thể chất',

  'hoạt động trải nghiệm': 'Hoạt động trải nghiệm',
  'hdtn': 'Hoạt động trải nghiệm',
  'trải nghiệm': 'Hoạt động trải nghiệm'
};

/**
 * Chuẩn hóa tên môn bất kỳ về tên chính thức theo GDPT 2018
 */
export function normalizeSubjectName(rawName: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();
  
  if (SUBJECT_ALIASES[lower]) {
    return SUBJECT_ALIASES[lower];
  }

  // Thử khớp một phần
  for (const [key, canonical] of Object.entries(SUBJECT_ALIASES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return canonical;
    }
  }

  return trimmed;
}

/**
 * Trả về thông tin siêu dữ liệu khảo thí chuẩn GDPT 2018 cho bất kỳ tên môn nào
 */
export function getSubjectMetadataGDPT(subjectName: string): SubjectMetadataGDPT {
  const normalized = normalizeSubjectName(subjectName);
  const found = GDPT_2018_SUBJECTS.find(s => s.name.toLowerCase() === normalized.toLowerCase());
  if (found) return found;

  const sLower = (subjectName || '').toLowerCase().trim();
  // 1. Môn Ngữ văn
  if (sLower.includes('văn')) {
    return GDPT_2018_SUBJECTS.find(s => s.name === 'Ngữ văn')!;
  }
  // 2. Môn Nhận xét Đạt/Chưa đạt
  if (sLower.includes('thể chất') || sLower.includes('gdtc') || sLower.includes('thể dục') || sLower.includes('quốc phòng')) {
    return GDPT_2018_SUBJECTS.find(s => s.name === 'Giáo dục thể chất')!;
  }
  if (sLower.includes('trải nghiệm') || sLower.includes('hdtn') || sLower.includes('âm nhạc') || sLower.includes('mỹ thuật')) {
    return GDPT_2018_SUBJECTS.find(s => s.name === 'Hoạt động trải nghiệm')!;
  }
  // 3. Môn Toán
  if (sLower.includes('toán')) {
    return GDPT_2018_SUBJECTS.find(s => s.name === 'Toán')!;
  }
  // 4. Môn Ngoại ngữ
  if (sLower.includes('anh') || sLower.includes('ngoại ngữ')) {
    return GDPT_2018_SUBJECTS.find(s => s.name === 'Tiếng Anh')!;
  }

  // 5. Tìm kiếm theo tên
  const matched = GDPT_2018_SUBJECTS.find(s => sLower.includes(s.name.toLowerCase()));
  if (matched) return matched;

  // Mặc định: Trắc nghiệm thông thường
  return {
    name: subjectName,
    shortName: subjectName,
    group: 'Khoa học Tự nhiên',
    category: 'multiple_choice',
    formatDescription: 'Đánh giá bằng điểm số theo thang điểm 10 (Trắc nghiệm hoặc kết hợp)',
    badgeLabel: 'Trắc nghiệm thang 10',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    sampleMatrix: [],
    sampleYccd: [],
  };
}
