import ExcelJS from 'exceljs';
import { StudentExamScoreRecord } from '../types';

/**
 * Tải xuống một Blob dưới dạng file Excel
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ScoreDistributionClassStats {
  className: string;
  totalStudents: number;
  lietCount: number; // 0 - 1.0
  lietPct: number;
  kemCount: number;  // 1.1 - 3.4
  kemPct: number;
  yeuCount: number;  // 3.5 - 4.9
  yeuPct: number;
  duoiTbCount: number; // < 5.0
  duoiTbPct: number;
  tbCount: number;   // 5.0 - 6.4
  tbPct: number;
  khaCount: number;  // 6.5 - 7.9
  khaPct: number;
  gioiCount: number; // 8.0 - 10.0
  gioiPct: number;
  trenTbCount: number; // >= 5.0
  trenTbPct: number;
  avgScore: number;
}

/**
 * Tính toán thống kê phổ điểm theo lớp cho một môn cụ thể
 */
export function calculateSubjectClassStats(
  subject: string,
  allStudents: StudentExamScoreRecord[]
): {
  classStats: ScoreDistributionClassStats[];
  totalGradeStats: ScoreDistributionClassStats;
} {
  // Gom nhóm học sinh theo lớp
  const classMap = new Map<string, StudentExamScoreRecord[]>();
  allStudents.forEach(st => {
    const cName = String(st.class_name || 'Khác').trim();
    if (!classMap.has(cName)) classMap.set(cName, []);
    classMap.get(cName)!.push(st);
  });

  // Sắp xếp danh sách lớp tự nhiên (12A1, 12A2, ...)
  const sortedClasses = Array.from(classMap.keys()).sort((a, b) =>
    a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' })
  );

  const parseScore = (st: StudentExamScoreRecord): number | null => {
    const scores = st.subject_scores || {};
    let val = scores[subject];
    if (val === undefined || val === null || val === '') {
      // Thử tìm theo alias nếu tên môn lệch
      const subLower = subject.trim().toLowerCase();
      for (const [k, v] of Object.entries(scores)) {
        if (k.trim().toLowerCase() === subLower) { val = v; break; }
      }
    }
    if (val === 'VT' || val === 'Vắng' || val === undefined || val === null || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const computeStatsForList = (name: string, students: StudentExamScoreRecord[]): ScoreDistributionClassStats => {
    let validScores: number[] = [];
    students.forEach(st => {
      const s = parseScore(st);
      if (s !== null) validScores.push(s);
    });

    const total = validScores.length;
    if (total === 0) {
      return {
        className: name,
        totalStudents: 0,
        lietCount: 0, lietPct: 0,
        kemCount: 0, kemPct: 0,
        yeuCount: 0, yeuPct: 0,
        duoiTbCount: 0, duoiTbPct: 0,
        tbCount: 0, tbPct: 0,
        khaCount: 0, khaPct: 0,
        gioiCount: 0, gioiPct: 0,
        trenTbCount: 0, trenTbPct: 0,
        avgScore: 0
      };
    }

    let liet = 0; // 0 - 1.0
    let kem = 0;  // > 1.0 và <= 3.4
    let yeu = 0;  // > 3.4 và < 5.0
    let tb = 0;   // >= 5.0 và <= 6.4
    let kha = 0;  // > 6.4 và <= 7.9
    let gioi = 0; // > 7.9 và <= 10.0
    let sum = 0;

    validScores.forEach(score => {
      sum += score;
      if (score <= 1.0) {
        liet++;
      } else if (score <= 3.4) {
        kem++;
      } else if (score < 5.0) {
        yeu++;
      }

      if (score >= 5.0 && score <= 6.4) {
        tb++;
      } else if (score > 6.4 && score <= 7.9) {
        kha++;
      } else if (score > 7.9) {
        gioi++;
      }
    });

    const duoiTb = liet + kem + yeu;
    const trenTb = tb + kha + gioi;
    const avg = parseFloat((sum / total).toFixed(2));

    return {
      className: name,
      totalStudents: total,
      lietCount: liet,
      lietPct: parseFloat(((liet / total) * 100).toFixed(1)),
      kemCount: kem,
      kemPct: parseFloat(((kem / total) * 100).toFixed(1)),
      yeuCount: yeu,
      yeuPct: parseFloat(((yeu / total) * 100).toFixed(1)),
      duoiTbCount: duoiTb,
      duoiTbPct: parseFloat(((duoiTb / total) * 100).toFixed(1)),
      tbCount: tb,
      tbPct: parseFloat(((tb / total) * 100).toFixed(1)),
      khaCount: kha,
      khaPct: parseFloat(((kha / total) * 100).toFixed(1)),
      gioiCount: gioi,
      gioiPct: parseFloat(((gioi / total) * 100).toFixed(1)),
      trenTbCount: trenTb,
      trenTbPct: parseFloat(((trenTb / total) * 100).toFixed(1)),
      avgScore: avg
    } as ScoreDistributionClassStats;
  };

  const classStats: ScoreDistributionClassStats[] = [];
  sortedClasses.forEach(cName => {
    const stats = computeStatsForList(cName, classMap.get(cName)!);
    if (stats.totalStudents > 0) {
      classStats.push(stats);
    }
  });

  const totalGradeStats = computeStatsForList('TOÀN KHỐI', allStudents);

  return { classStats, totalGradeStats };
}

/**
 * 1. Xuất file Excel Báo cáo Thống kê Phổ điểm Đa Sheet (mỗi môn là 1 Sheet)
 */
export async function exportMultiSubjectStatisticsExcel(params: {
  examTitle: string;
  academicYear?: string;
  subjects: string[];
  allStudents: StudentExamScoreRecord[];
  schoolName?: string;
}) {
  const {
    examTitle,
    academicYear = '2026-2027',
    subjects,
    allStudents,
    schoolName = 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM'
  } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Quản lý Khảo thí & Điểm số';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Tạo style chuẩn cho bảng biểu
  const navyFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1B365D' } // Navy blue
  };

  const lightBlueFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEBF2FA' }
  };

  const totalRowFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E8F5' }
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF475569' } },
    left: { style: 'thin', color: { argb: 'FF475569' } },
    bottom: { style: 'thin', color: { argb: 'FF475569' } },
    right: { style: 'thin', color: { argb: 'FF475569' } }
  };

  // Duyệt từng môn để tạo 1 Sheet
  subjects.forEach(subject => {
    const { classStats, totalGradeStats } = calculateSubjectClassStats(subject, allStudents);
    if (totalGradeStats.totalStudents === 0 && classStats.length === 0) return;

    // Tên sheet Excel tối đa 31 ký tự và không chứa ký tự đặc biệt
    const cleanSheetName = subject.replace(/[\/\\?*:[\]]/g, '').slice(0, 30);
    const ws = workbook.addWorksheet(cleanSheetName, {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });

    // 1. Tiêu đề hành chính
    ws.mergeCells('A1:E1');
    ws.getCell('A1').value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
    ws.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: false };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:E2');
    ws.getCell('A2').value = schoolName.toUpperCase();
    ws.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: true };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.mergeCells('P1:T1');
    ws.getCell('P1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    ws.getCell('P1').font = { name: 'Times New Roman', size: 10, bold: true };
    ws.getCell('P1').alignment = { horizontal: 'center' };

    ws.mergeCells('P2:T2');
    ws.getCell('P2').value = 'Độc lập - Tự do - Hạnh phúc';
    ws.getCell('P2').font = { name: 'Times New Roman', size: 10, italic: true };
    ws.getCell('P2').alignment = { horizontal: 'center' };

    // 2. Tiêu đề Bảng
    ws.mergeCells('A4:T4');
    ws.getCell('A4').value = `BẢNG THỐNG KÊ KẾT QUẢ ĐIỂM THI MÔN ${subject.toUpperCase()} THEO LỚP`;
    ws.getCell('A4').font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
    ws.getCell('A4').alignment = { horizontal: 'center' };

    ws.mergeCells('A5:T5');
    ws.getCell('A5').value = `Kỳ thi: ${examTitle} — Năm học: ${academicYear}`;
    ws.getCell('A5').font = { name: 'Times New Roman', size: 11, italic: true, bold: false };
    ws.getCell('A5').alignment = { horizontal: 'center' };

    // 3. Header bảng 2 tầng (Dòng 7 và 8)
    const headerRow1 = 7;
    const headerRow2 = 8;

    // Tầng 1: Cột đơn STT, Lớp, Sĩ số
    ws.mergeCells(`A${headerRow1}:A${headerRow2}`);
    ws.getCell(`A${headerRow1}`).value = 'STT';

    ws.mergeCells(`B${headerRow1}:B${headerRow2}`);
    ws.getCell(`B${headerRow1}`).value = 'Lớp';

    ws.mergeCells(`C${headerRow1}:C${headerRow2}`);
    ws.getCell(`C${headerRow1}`).value = 'Sĩ số';

    // Các dải điểm (gộp 2 cột SL và %)
    ws.mergeCells(`D${headerRow1}:E${headerRow1}`);
    ws.getCell(`D${headerRow1}`).value = '0 - 1.0 (Liệt)';

    ws.mergeCells(`F${headerRow1}:G${headerRow1}`);
    ws.getCell(`F${headerRow1}`).value = '1.1 - 3.4 (Kém)';

    ws.mergeCells(`H${headerRow1}:I${headerRow1}`);
    ws.getCell(`H${headerRow1}`).value = '3.5 - 4.9 (Yếu)';

    ws.mergeCells(`J${headerRow1}:K${headerRow1}`);
    ws.getCell(`J${headerRow1}`).value = 'Dưới TB (< 5.0)';

    ws.mergeCells(`L${headerRow1}:M${headerRow1}`);
    ws.getCell(`L${headerRow1}`).value = '5.0 - 6.4 (TB)';

    ws.mergeCells(`N${headerRow1}:O${headerRow1}`);
    ws.getCell(`N${headerRow1}`).value = '6.5 - 7.9 (Khá)';

    ws.mergeCells(`P${headerRow1}:Q${headerRow1}`);
    ws.getCell(`P${headerRow1}`).value = '8.0 - 10.0 (Giỏi)';

    ws.mergeCells(`R${headerRow1}:S${headerRow1}`);
    ws.getCell(`R${headerRow1}`).value = 'Trên TB (≥ 5.0)';

    ws.mergeCells(`T${headerRow1}:T${headerRow2}`);
    ws.getCell(`T${headerRow1}`).value = 'Điểm TB';

    // Tầng 2: SL và %
    const subHeaders = ['SL', '%', 'SL', '%', 'SL', '%', 'SL', '%', 'SL', '%', 'SL', '%', 'SL', '%', 'SL', '%'];
    const colLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'];
    colLetters.forEach((col, idx) => {
      ws.getCell(`${col}${headerRow2}`).value = subHeaders[idx];
    });

    // Định dạng giao diện cho Header 2 tầng (Navy Blue)
    for (let r = headerRow1; r <= headerRow2; r++) {
      ws.getRow(r).height = 24;
      for (let c = 1; c <= 20; c++) {
        const cell = ws.getRow(r).getCell(c);
        cell.fill = navyFill;
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = headerBorder;
      }
    }

    // 4. Đổ dữ liệu từng lớp
    let currentRow = 9;
    classStats.forEach((st, idx) => {
      const row = ws.getRow(currentRow);
      row.height = 20;

      row.getCell(1).value = idx + 1; // STT
      row.getCell(2).value = st.className; // Lớp
      row.getCell(3).value = st.totalStudents; // Sĩ số

      row.getCell(4).value = st.lietCount;
      row.getCell(5).value = st.lietPct / 100;

      row.getCell(6).value = st.kemCount;
      row.getCell(7).value = st.kemPct / 100;

      row.getCell(8).value = st.yeuCount;
      row.getCell(9).value = st.yeuPct / 100;

      row.getCell(10).value = st.duoiTbCount;
      row.getCell(11).value = st.duoiTbPct / 100;

      row.getCell(12).value = st.tbCount;
      row.getCell(13).value = st.tbPct / 100;

      row.getCell(14).value = st.khaCount;
      row.getCell(15).value = st.khaPct / 100;

      row.getCell(16).value = st.gioiCount;
      row.getCell(17).value = st.gioiPct / 100;

      row.getCell(18).value = st.trenTbCount;
      row.getCell(19).value = st.trenTbPct / 100;

      row.getCell(20).value = st.avgScore;

      // Căn chỉnh & định dạng ô
      for (let c = 1; c <= 20; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Định dạng cột tỷ lệ phần trăm
        if ([5, 7, 9, 11, 13, 15, 17, 19].includes(c)) {
          cell.numFmt = '0.0%';
        }
        // Định dạng điểm trung bình
        if (c === 20) {
          cell.numFmt = '0.00';
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
        }
        // In đậm tên lớp
        if (c === 2) {
          cell.font = { name: 'Times New Roman', size: 10, bold: true };
        }
      }

      currentRow++;
    });

    // 5. Dòng Tổng kết TOÀN KHỐI
    const totalRow = ws.getRow(currentRow);
    totalRow.height = 24;

    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'TOÀN KHỐI';
    totalRow.getCell(3).value = totalGradeStats.totalStudents;

    totalRow.getCell(4).value = totalGradeStats.lietCount;
    totalRow.getCell(5).value = totalGradeStats.lietPct / 100;

    totalRow.getCell(6).value = totalGradeStats.kemCount;
    totalRow.getCell(7).value = totalGradeStats.kemPct / 100;

    totalRow.getCell(8).value = totalGradeStats.yeuCount;
    totalRow.getCell(9).value = totalGradeStats.yeuPct / 100;

    totalRow.getCell(10).value = totalGradeStats.duoiTbCount;
    totalRow.getCell(11).value = totalGradeStats.duoiTbPct / 100;

    totalRow.getCell(12).value = totalGradeStats.tbCount;
    totalRow.getCell(13).value = totalGradeStats.tbPct / 100;

    totalRow.getCell(14).value = totalGradeStats.khaCount;
    totalRow.getCell(15).value = totalGradeStats.khaPct / 100;

    totalRow.getCell(16).value = totalGradeStats.gioiCount;
    totalRow.getCell(17).value = totalGradeStats.gioiPct / 100;

    totalRow.getCell(18).value = totalGradeStats.trenTbCount;
    totalRow.getCell(19).value = totalGradeStats.trenTbPct / 100;

    totalRow.getCell(20).value = totalGradeStats.avgScore;

    for (let c = 1; c <= 20; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = totalRowFill;
      cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1B365D' } },
        bottom: { style: 'double', color: { argb: 'FF1B365D' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if ([5, 7, 9, 11, 13, 15, 17, 19].includes(c)) {
        cell.numFmt = '0.0%';
      }
      if (c === 20) {
        cell.numFmt = '0.00';
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1D4ED8' } };
      }
    }

    // 6. Khu vực Ký duyệt & Thời gian
    const signRow = currentRow + 3;
    ws.mergeCells(`A${signRow}:E${signRow}`);
    ws.getCell(`A${signRow}`).value = 'NGƯỜI LẬP BIỂU';
    ws.getCell(`A${signRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
    ws.getCell(`A${signRow}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`H${signRow}:L${signRow}`);
    ws.getCell(`H${signRow}`).value = 'TỔ TRƯỞNG CHUYÊN MÔN';
    ws.getCell(`H${signRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
    ws.getCell(`H${signRow}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`P${signRow - 1}:T${signRow - 1}`);
    const today = new Date();
    ws.getCell(`P${signRow - 1}`).value = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
    ws.getCell(`P${signRow - 1}`).font = { name: 'Times New Roman', size: 10, italic: true };
    ws.getCell(`P${signRow - 1}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`P${signRow}:T${signRow}`);
    ws.getCell(`P${signRow}`).value = 'HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG';
    ws.getCell(`P${signRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
    ws.getCell(`P${signRow}`).alignment = { horizontal: 'center' };

    // Độ rộng các cột chuẩn để in vừa vặn khổ A4 Landscape
    const colWidths = [
      6,   // A: STT
      10,  // B: Lớp
      8,   // C: Sĩ số
      6, 8, // D-E: Liệt (SL, %)
      6, 8, // F-G: Kém
      6, 8, // H-I: Yếu
      6, 8, // J-K: Dưới TB
      6, 8, // L-M: TB
      6, 8, // N-O: Khá
      6, 8, // P-Q: Giỏi
      6, 8, // R-S: Trên TB
      10   // T: Điểm TB
    ];
    colWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `Thong_Ke_Pho_Diem_${examTitle.replace(/[\s/]/g, '_')}.xlsx`);
}

/**
 * 2. Xuất danh sách học sinh theo môn và ngưỡng điểm (Dạy phụ đạo / Bồi dưỡng HSG)
 */
export async function exportFilteredStudentsExcel(params: {
  examTitle: string;
  academicYear?: string;
  subject: string;
  filterType: 'below' | 'above_equal' | 'range';
  threshold: number;
  maxThreshold?: number;
  classFilter?: string; // 'all' hoặc tên lớp cụ thể
  students: StudentExamScoreRecord[];
  schoolName?: string;
}) {
  const {
    examTitle,
    academicYear = '2026-2027',
    subject,
    filterType,
    threshold,
    maxThreshold = 10,
    classFilter = 'all',
    students,
    schoolName = 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM'
  } = params;

  // Lọc học sinh theo môn và điều kiện điểm
  const filtered = students.filter(st => {
    if (classFilter !== 'all' && String(st.class_name || '').trim() !== classFilter) {
      return false;
    }

    const scores = st.subject_scores || {};
    let val = scores[subject];
    if (val === undefined || val === null || val === '') {
      const subLower = subject.trim().toLowerCase();
      for (const [k, v] of Object.entries(scores)) {
        if (k.trim().toLowerCase() === subLower) { val = v; break; }
      }
    }
    if (val === 'VT' || val === 'Vắng' || val === undefined || val === null || val === '') return false;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(num)) return false;

    if (filterType === 'below') {
      return num < threshold;
    } else if (filterType === 'above_equal') {
      return num >= threshold;
    } else if (filterType === 'range') {
      return num >= threshold && num <= maxThreshold;
    }
    return true;
  });

  // Sắp xếp theo Lớp rồi theo Tên/Điểm
  filtered.sort((a, b) => {
    const classComp = String(a.class_name || '').localeCompare(String(b.class_name || ''), 'vi', { numeric: true });
    if (classComp !== 0) return classComp;
    const scoreA = parseFloat(String(a.subject_scores?.[subject] || 0));
    const scoreB = parseFloat(String(b.subject_scores?.[subject] || 0));
    return scoreA - scoreB;
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(`DS_${subject}_${filterType}`, {
    pageSetup: {
      orientation: 'portrait',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  // Tiêu đề hành chính
  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
  ws.getCell('A1').font = { name: 'Times New Roman', size: 10 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:C2');
  ws.getCell('A2').value = schoolName.toUpperCase();
  ws.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: true };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('F1:I1');
  ws.getCell('F1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell('F1').font = { name: 'Times New Roman', size: 10, bold: true };
  ws.getCell('F1').alignment = { horizontal: 'center' };

  ws.mergeCells('F2:I2');
  ws.getCell('F2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell('F2').font = { name: 'Times New Roman', size: 10, italic: true };
  ws.getCell('F2').alignment = { horizontal: 'center' };

  // Tiêu đề danh sách
  let titleText = `DANH SÁCH HỌC SINH CẦN PHỤ ĐẠO MÔN ${subject.toUpperCase()} (ĐIỂM < ${threshold})`;
  if (filterType === 'above_equal') {
    titleText = `DANH SÁCH HỌC SINH BỒI DƯỠNG MÔN ${subject.toUpperCase()} (ĐIỂM ≥ ${threshold})`;
  } else if (filterType === 'range') {
    titleText = `DANH SÁCH HỌC SINH MÔN ${subject.toUpperCase()} (ĐIỂM TỪ ${threshold} ĐẾN ${maxThreshold})`;
  }

  ws.mergeCells('A4:I4');
  ws.getCell('A4').value = titleText;
  ws.getCell('A4').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A4').alignment = { horizontal: 'center' };

  ws.mergeCells('A5:I5');
  ws.getCell('A5').value = `Kỳ thi: ${examTitle} — Năm học: ${academicYear} ${classFilter !== 'all' ? `— Lớp: ${classFilter}` : '— Toàn khối'}`;
  ws.getCell('A5').font = { name: 'Times New Roman', size: 10.5, italic: true };
  ws.getCell('A5').alignment = { horizontal: 'center' };

  ws.mergeCells('A6:I6');
  ws.getCell('A6').value = `(Tổng số: ${filtered.length} học sinh)`;
  ws.getCell('A6').font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FFB91C1C' } };
  ws.getCell('A6').alignment = { horizontal: 'center' };

  // Header Bảng
  const headerRow = 8;
  const headers = ['STT', 'SBD', 'Họ và tên', 'Lớp', 'Ngày sinh', 'Số CCCD', `Điểm ${subject}`, 'Xếp loại', 'Ký nhận / Điểm danh các buổi học'];
  ws.getRow(headerRow).height = 26;

  headers.forEach((h, idx) => {
    const cell = ws.getRow(headerRow).getCell(idx + 1);
    cell.value = h;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' } // Navy Blue
    };
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'thin', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // Đổ dữ liệu
  let currentRow = 9;
  filtered.forEach((st, idx) => {
    const row = ws.getRow(currentRow);
    row.height = 22;

    const rawScore = st.subject_scores?.[subject];
    const numScore = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore).replace(',', '.'));

    let rankLabel = 'Yếu';
    if (numScore <= 1.0) rankLabel = 'Liệt';
    else if (numScore <= 3.4) rankLabel = 'Kém';
    else if (numScore < 5.0) rankLabel = 'Yếu';
    else if (numScore <= 6.4) rankLabel = 'Trung bình';
    else if (numScore <= 7.9) rankLabel = 'Khá';
    else rankLabel = 'Giỏi';

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = st.sbd;
    row.getCell(3).value = st.full_name;
    row.getCell(4).value = st.class_name;
    row.getCell(5).value = st.dob || '';
    row.getCell(6).value = st.cccd || '';
    row.getCell(7).value = isNaN(numScore) ? rawScore : numScore;
    row.getCell(8).value = rankLabel;
    row.getCell(9).value = ''; // Cột trống cho giáo viên điểm danh / học sinh ký tên

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (c === 2) {
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      }
      if (c === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      }
      if (c === 7) {
        cell.numFmt = '0.00';
        cell.font = {
          name: 'Times New Roman',
          size: 10.5,
          bold: true,
          color: { argb: numScore < 5.0 ? 'FFDC2626' : (numScore >= 8.0 ? 'FF16A34A' : 'FF1D4ED8') }
        };
      }
    }

    currentRow++;
  });

  // Chữ ký phía dưới
  const signRow = currentRow + 2;
  ws.mergeCells(`A${signRow}:C${signRow}`);
  ws.getCell(`A${signRow}`).value = 'GIÁO VIÊN BỘ MÔN';
  ws.getCell(`A${signRow}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`A${signRow}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`D${signRow}:F${signRow}`);
  ws.getCell(`D${signRow}`).value = 'TỔ TRƯỞNG CHUYÊN MÔN';
  ws.getCell(`D${signRow}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`D${signRow}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`G${signRow - 1}:I${signRow - 1}`);
  const today = new Date();
  ws.getCell(`G${signRow - 1}`).value = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  ws.getCell(`G${signRow - 1}`).font = { name: 'Times New Roman', size: 10, italic: true };
  ws.getCell(`G${signRow - 1}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`G${signRow}:I${signRow}`);
  ws.getCell(`G${signRow}`).value = 'BAN GIÁM HIỆU DUYỆT';
  ws.getCell(`G${signRow}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`G${signRow}`).alignment = { horizontal: 'center' };

  // Set widths
  ws.getColumn(1).width = 6;  // STT
  ws.getColumn(2).width = 12; // SBD
  ws.getColumn(3).width = 24; // Họ tên
  ws.getColumn(4).width = 10; // Lớp
  ws.getColumn(5).width = 13; // Ngày sinh
  ws.getColumn(6).width = 16; // CCCD
  ws.getColumn(7).width = 12; // Điểm
  ws.getColumn(8).width = 12; // Xếp loại
  ws.getColumn(9).width = 28; // Ký nhận / Điểm danh

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `DS_${subject}_${filterType === 'below' ? 'Phu_Dao_Duoi_' + threshold : 'Diem_' + threshold}_${classFilter}.xlsx`;
  downloadBlob(blob, filename);
}
