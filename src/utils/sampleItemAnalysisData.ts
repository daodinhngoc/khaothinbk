import { ExamMatrixItem, ExamYccdItem, StudentScoreRow } from '../types';

/**
 * File 2 Mẫu: Ma trận câu hỏi đề kiểm tra Hóa học 12 (CT GDPT 2018)
 * Gồm 28 câu trắc nghiệm nhiều lựa chọn và 4 câu đúng/sai theo cấu trúc đề thi 2025 mới của Bộ GD&ĐT
 */
export const SAMPLE_CHEMISTRY_MATRIX: ExamMatrixItem[] = [
  { questionNo: 'C1', topic: 'Este - Lipit', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-01' },
  { questionNo: 'C2', topic: 'Este - Lipit', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-01' },
  { questionNo: 'C3', topic: 'Este - Lipit', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-02' },
  { questionNo: 'C4', topic: 'Este - Lipit', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-HOA12-03' },
  { questionNo: 'C5', topic: 'Xà phòng & Chất giặt rửa', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-04' },
  { questionNo: 'C6', topic: 'Xà phòng & Chất giặt rửa', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-05' },
  { questionNo: 'C7', topic: 'Carbohydrate (Glucose, Fructose)', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-06' },
  { questionNo: 'C8', topic: 'Carbohydrate (Saccharose, Tinh bột)', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-07' },
  { questionNo: 'C9', topic: 'Carbohydrate (Cellulose)', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-07' },
  { questionNo: 'C10', topic: 'Carbohydrate', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-HOA12-08' },
  { questionNo: 'C11', topic: 'Amine & Amino acid', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-09' },
  { questionNo: 'C12', topic: 'Amine & Amino acid', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-10' },
  { questionNo: 'C13', topic: 'Peptide & Protein', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-11' },
  { questionNo: 'C14', topic: 'Peptide & Protein', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-HOA12-12' },
  { questionNo: 'C15', topic: 'Polymer & Vật liệu polymer', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-13' },
  { questionNo: 'C16', topic: 'Polymer & Vật liệu polymer', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-14' },
  { questionNo: 'C17', topic: 'Pin điện & Điện phân', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-15' },
  { questionNo: 'C18', topic: 'Pin điện & Điện phân', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-HOA12-16' },
  { questionNo: 'C19', topic: 'Đại cương Kim loại', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-17' },
  { questionNo: 'C20', topic: 'Đại cương Kim loại', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-18' },
  { questionNo: 'C21', topic: 'Kim loại nhóm IA, IIA, Al', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-19' },
  { questionNo: 'C22', topic: 'Kim loại nhóm IA, IIA, Al', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-20' },
  { questionNo: 'C23', topic: 'Sắt & Hợp chất của Sắt', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-21' },
  { questionNo: 'C24', topic: 'Sắt & Hợp chất của Sắt', thinkingLevel: 'Vận dụng cao', maxScore: 0.25, yccdCode: 'YCCD-HOA12-22' },
  { questionNo: 'C25', topic: 'Hóa học và Môi trường', thinkingLevel: 'Biết', maxScore: 0.25, yccdCode: 'YCCD-HOA12-23' },
  { questionNo: 'C26', topic: 'Thí nghiệm thực hành Hóa học', thinkingLevel: 'Hiểu', maxScore: 0.25, yccdCode: 'YCCD-HOA12-24' },
  { questionNo: 'C27', topic: 'Thí nghiệm thực hành Hóa học', thinkingLevel: 'Vận dụng', maxScore: 0.25, yccdCode: 'YCCD-HOA12-24' },
  { questionNo: 'C28', topic: 'Bài toán tổng hợp Hóa học 12', thinkingLevel: 'Vận dụng cao', maxScore: 0.25, yccdCode: 'YCCD-HOA12-25' },
];

/**
 * File 3 Mẫu: Danh mục Yêu cầu cần đạt (YCCĐ) theo Chương trình GDPT 2018 môn Hóa học 12
 */
export const SAMPLE_CHEMISTRY_YCCD: ExamYccdItem[] = [
  {
    code: 'YCCD-HOA12-01',
    topic: 'Este - Lipit',
    description: 'Nêu được khái niệm về este, cấu trúc phân tử và tính chất vật lí cơ bản của este.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-HOA12-02',
    topic: 'Este - Lipit',
    description: 'Giải thích được phản ứng thủy phân este trong môi trường axit và môi trường kiềm (xà phòng hóa).',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-HOA12-03',
    topic: 'Este - Lipit',
    description: 'Tính toán hiệu suất phản ứng este hóa hoặc thành phần hỗn hợp este đơn/đa chức.',
    benchmarkTarget: 60
  },
  {
    code: 'YCCD-HOA12-04',
    topic: 'Xà phòng & Chất giặt rửa',
    description: 'Nêu được thành phần của xà phòng và cơ chế tẩy rửa của phân tử chất giặt rửa tổng hợp.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-HOA12-05',
    topic: 'Xà phòng & Chất giặt rửa',
    description: 'So sánh được ưu điểm, nhược điểm của xà phòng và chất giặt rửa tổng hợp trong nước cứng.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-HOA12-06',
    topic: 'Carbohydrate (Glucose, Fructose)',
    description: 'Nêu được tính chất hóa học đặc trưng của glucose và fructose (phản ứng tráng bạc, khử Cu(OH)2).',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-HOA12-07',
    topic: 'Carbohydrate (Saccharose, Tinh bột)',
    description: 'Phân biệt cấu tạo của tinh bột và cellulose; giải thích phản ứng màu của tinh bột với iodine.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-HOA12-08',
    topic: 'Carbohydrate',
    description: 'Vận dụng giải bài toán lên men glucose điều chế ancol ethylic hoặc phản ứng thủy phân polysaccharide.',
    benchmarkTarget: 65
  },
  {
    code: 'YCCD-HOA12-09',
    topic: 'Amine & Amino acid',
    description: 'Nhận biết được đặc điểm cấu tạo của amine, so sánh tính base của amine với ammonia.',
    benchmarkTarget: 75
  },
  {
    code: 'YCCD-HOA12-10',
    topic: 'Amine & Amino acid',
    description: 'Giải thích tính lưỡng tính của amino acid và phản ứng trùng ngưng tạo peptide.',
    benchmarkTarget: 65
  },
  {
    code: 'YCCD-HOA12-11',
    topic: 'Peptide & Protein',
    description: 'Phân tích được liên kết peptide và phản ứng màu biuret của peptide, protein.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-HOA12-12',
    topic: 'Peptide & Protein',
    description: 'Giải được bài toán thủy phân hoàn toàn hoặc không hoàn toàn oligopeptide đơn giản.',
    benchmarkTarget: 50
  },
  {
    code: 'YCCD-HOA12-13',
    topic: 'Polymer & Vật liệu polymer',
    description: 'Phân loại được các polymer thiên nhiên, nhân tạo, tổng hợp và phương pháp điều chế.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-HOA12-14',
    topic: 'Polymer & Vật liệu polymer',
    description: 'Viết được phương trình hóa học của phản ứng trùng hợp và trùng ngưng một số monome thông dụng.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-HOA12-15',
    topic: 'Pin điện & Điện phân',
    description: 'Giải thích được nguyên tắc hoạt động của pin Galvani và quá trình điện phân dung dịch có màng ngăn.',
    benchmarkTarget: 60
  },
  {
    code: 'YCCD-HOA12-16',
    topic: 'Pin điện & Điện phân',
    description: 'Vận dụng định luật bảo toàn electron và công thức Faraday để tính toán sản phẩm điện phân.',
    benchmarkTarget: 55
  },
  {
    code: 'YCCD-HOA12-17',
    topic: 'Đại cương Kim loại',
    description: 'Nêu được tính chất vật lí chung của kim loại và giải thích bằng sự có mặt của electron tự do.',
    benchmarkTarget: 85
  },
  {
    code: 'YCCD-HOA12-18',
    topic: 'Đại cương Kim loại',
    description: 'Xác định thứ tự phản ứng oxi hóa - khử của kim loại và ion kim loại dựa vào dãy điện hóa.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-HOA12-19',
    topic: 'Kim loại nhóm IA, IIA, Al',
    description: 'Nhận biết hiện tượng thí nghiệm phản ứng của Na, K, Ca, Ba, Al với nước và dung dịch kiềm.',
    benchmarkTarget: 80
  },
  {
    code: 'YCCD-HOA12-20',
    topic: 'Kim loại nhóm IA, IIA, Al',
    description: 'Giải thích tính lưỡng tính của Al2O3, Al(OH)3 và ứng dụng trong thực tiễn đời sống.',
    benchmarkTarget: 65
  },
  {
    code: 'YCCD-HOA12-21',
    topic: 'Sắt & Hợp chất của Sắt',
    description: 'Phân tích các phản ứng của hợp chất Fe(II) và Fe(III) với các chất oxi hóa hoặc khử thông dụng.',
    benchmarkTarget: 65
  },
  {
    code: 'YCCD-HOA12-22',
    topic: 'Sắt & Hợp chất của Sắt',
    description: 'Giải quyết bài toán hỗn hợp sắt và các oxide tác dụng với dung dịch axit có tính oxi hóa mạnh (HNO3).',
    benchmarkTarget: 50
  },
  {
    code: 'YCCD-HOA12-23',
    topic: 'Hóa học và Môi trường',
    description: 'Đề xuất biện pháp giảm thiểu ô nhiễm không khí (mưa axit, hiệu ứng nhà kính) từ hoạt động công nghiệp.',
    benchmarkTarget: 85
  },
  {
    code: 'YCCD-HOA12-24',
    topic: 'Thí nghiệm thực hành Hóa học',
    description: 'Mô tả và giải thích được các bước thực hành thí nghiệm an toàn, chính xác trong phòng thí nghiệm.',
    benchmarkTarget: 70
  },
  {
    code: 'YCCD-HOA12-25',
    topic: 'Bài toán tổng hợp Hóa học 12',
    description: 'Vận dụng tổng hợp kiến thức hóa học vô cơ và hữu cơ để giải quyết bài toán định lượng phức hợp.',
    benchmarkTarget: 45
  }
];

/**
 * Tạo dữ liệu điểm chi tiết từng câu hỏi (Item-level responses) của môn Hóa học cho 40 học sinh
 * Giúp tự động tính Độ khó P và Độ phân biệt D cho từng câu hỏi
 */
export function generateSampleItemScores(candidateCount: number = 40): {
  sbd: string;
  fullName: string;
  className: string;
  itemScores: Record<string, number>; // C1 -> 0.25 hoặc 0
  totalScore: number;
}[] {
  const students = [
    { sbd: '52830001', name: 'Bùi Đức Anh', cls: '12A1', ability: 0.85 },
    { sbd: '52830002', name: 'Đặng Ngọc Ánh', cls: '12A1', ability: 0.90 },
    { sbd: '52830003', name: 'Hoàng Minh Châu', cls: '12A1', ability: 0.78 },
    { sbd: '52830004', name: 'Lê Tuấn Dũng', cls: '12A2', ability: 0.62 },
    { sbd: '52830005', name: 'Ngô Hải Đăng', cls: '12A2', ability: 0.48 },
    { sbd: '52830006', name: 'Phạm Hương Giang', cls: '12A2', ability: 0.75 },
    { sbd: '52830007', name: 'Trần Gia Huy', cls: '12A3', ability: 0.38 },
    { sbd: '52830008', name: 'Vũ Thảo Linh', cls: '12A3', ability: 0.68 },
    { sbd: '52830009', name: 'Đỗ Quốc Khánh', cls: '12A3', ability: 0.32 },
    { sbd: '52830010', name: 'Nguyễn Diệu Linh', cls: '12A4', ability: 0.64 },
    { sbd: '52830011', name: 'Lý Hoàng Nam', cls: '12A4', ability: 0.82 },
    { sbd: '52830012', name: 'Phan Bảo Ngọc', cls: '12A4', ability: 0.88 },
    { sbd: '52830013', name: 'Tạ Minh Quân', cls: '12A1', ability: 0.76 },
    { sbd: '52830014', name: 'Võ Tuyết Mai', cls: '12A2', ability: 0.84 },
    { sbd: '52830015', name: 'Trịnh Nhật Minh', cls: '12A3', ability: 0.52 },
    { sbd: '52830016', name: 'Dương Yến Nhi', cls: '12A4', ability: 0.70 },
    { sbd: '52830017', name: 'Lương Tuấn Phong', cls: '12A1', ability: 0.84 },
    { sbd: '52830018', name: 'Nguyễn Thành Trung', cls: '12A2', ability: 0.58 },
    { sbd: '52830019', name: 'Bạch Thúy Vy', cls: '12A3', ability: 0.42 },
    { sbd: '52830020', name: 'Hà Xuân Trường', cls: '12A4', ability: 0.74 },
    { sbd: '52830021', name: 'Trương Quốc Bảo', cls: '12A1', ability: 0.86 },
    { sbd: '52830022', name: 'Ngô Thúy Hằng', cls: '12A1', ability: 0.80 },
    { sbd: '52830023', name: 'Lê Gia Khiêm', cls: '12A2', ability: 0.65 },
    { sbd: '52830024', name: 'Đoàn Thu Trang', cls: '12A2', ability: 0.72 },
    { sbd: '52830025', name: 'Nguyễn Phúc Lâm', cls: '12A3', ability: 0.45 },
    { sbd: '52830026', name: 'Hoàng Ngọc Diệp', cls: '12A3', ability: 0.55 },
    { sbd: '52830027', name: 'Vũ Đăng Khoa', cls: '12A4', ability: 0.66 },
    { sbd: '52830028', name: 'Phạm Minh Tú', cls: '12A4', ability: 0.78 },
    { sbd: '52830029', name: 'Nguyễn Hữu Đạt', cls: '12A1', ability: 0.92 },
    { sbd: '52830030', name: 'Lê Thị Cẩm Tú', cls: '12A2', ability: 0.60 },
  ];

  return students.map((stu) => {
    const itemScores: Record<string, number> = {};
    let total = 0;

    SAMPLE_CHEMISTRY_MATRIX.forEach((q) => {
      // Xác suất làm đúng câu hỏi dựa trên năng lực của học sinh và mức độ tư duy câu hỏi
      let baseDifficulty = 0.5;
      if (q.thinkingLevel === 'Biết') baseDifficulty = 0.85;
      else if (q.thinkingLevel === 'Hiểu') baseDifficulty = 0.70;
      else if (q.thinkingLevel === 'Vận dụng') baseDifficulty = 0.48;
      else if (q.thinkingLevel === 'Vận dụng cao') baseDifficulty = 0.28;

      // Giả lập câu C18 bị lỗi đáp án (Distractor anomaly) dẫn tới phân biệt D thấp/âm nhẹ để AI phát hiện
      let prob = stu.ability * 0.6 + baseDifficulty * 0.4;
      if (q.questionNo === 'C18') {
        // Câu hỏi bị đánh đố: Học sinh giỏi dễ bị bẫy hơn học sinh trung bình
        prob = stu.ability > 0.75 ? 0.35 : 0.45;
      }

      // Ngưỡng đạt điểm câu hỏi
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
      totalScore: Number(total.toFixed(2))
    };
  });
}
