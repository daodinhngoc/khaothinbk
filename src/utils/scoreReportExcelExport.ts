import ExcelJS from 'exceljs';
import { 
  ExamConfig, 
  StudentScoreRow, 
  SubjectMetricSummary, 
  UserProfile, 
  ExpertPedagogicalReport 
} from '../types';
import { PeStudentRow } from './specializedSubjectData';

function cleanFileName(str: string): string {
  return str
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

export function getColumnLetter(colIndex: number): string {
  let col = Math.max(1, Math.min(16384, Math.floor(colIndex || 1)));
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod) / 26);
  }
  return letter || 'A';
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
};

const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF475569' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'double', color: { argb: 'FF1E293B' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
};

/**
 * Xuất file Excel Báo cáo Phân tích Điểm thi & Phổ điểm chuẩn đẹp theo tiêu chuẩn
 * quản trị Khảo thí của Bộ Giáo dục & Đào tạo (tương tự Phân hệ Xuất phân công coi thi).
 * 
 * Bao gồm các Sheets:
 * - Sheet 1: Thong_Ke_Muc_Diem_Tung_Lop (Bảng 6 thang điểm chuẩn GDPT 2018 + Tỷ lệ % + Toàn khối + Chữ ký)
 * - Sheet 2: Danh_Sach_Diem_Hoc_Sinh (Danh sách chi tiết từng học sinh kèm phân loại)
 * - Sheet 3: Nhan_Dinh_&_Khuyen_Nghi (Báo cáo khảo thí chuyên gia sư phạm 4 phần)
 */
export async function exportScoreReportExcel(params: {
  subjectName: string;
  subjectMetrics: SubjectMetricSummary;
  scoreRows: StudentScoreRow[];
  config: ExamConfig;
  currentUser?: UserProfile | null;
  expertReport?: ExpertPedagogicalReport | null;
  isEvaluationMode?: boolean;
  peStudentRows?: PeStudentRow[];
}) {
  const {
    subjectName,
    subjectMetrics,
    scoreRows,
    config,
    currentUser,
    expertReport,
    isEvaluationMode = false,
    peStudentRows = []
  } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ Thống Quản Trị Khảo Thí & Phân Tích Điểm Chuẩn GDPT 2018';
  wb.created = new Date();

  const schoolName = config.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM';
  const deptName = config.deptName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
  const unitName = currentUser?.unit || `TỔ CHUYÊN MÔN: ${subjectName.toUpperCase()}`;
  const examCategory = config.examCategory || 'KIỂM TRA ĐỊNH KỲ';
  const subPeriod = config.subPeriod || '';
  const schoolYear = config.schoolYear || '2024 - 2025';
  const todayStr = new Date().toLocaleDateString('vi-VN');

  // =========================================================================
  // SHEET 1: THỐNG KÊ CHI TIẾT THEO LỚP (HOẶC ĐÁNH GIÁ MÔN GDTC ĐẠT/CHƯA ĐẠT)
  // =========================================================================
  if (isEvaluationMode) {
    appendPeEvaluationSheet(wb, {
      subjectName,
      peStudentRows,
      config,
      currentUser,
      schoolName,
      deptName,
      unitName,
      todayStr
    });
  } else {
    appendClassRangeSheet(wb, {
      subjectName,
      subjectMetrics,
      config,
      currentUser,
      schoolName,
      deptName,
      unitName,
      todayStr
    });
  }

  // =========================================================================
  // SHEET 2: DANH SÁCH ĐIỂM CHI TIẾT TỪNG HỌC SINH
  // =========================================================================
  appendStudentScoreListSheet(wb, {
    subjectName,
    scoreRows,
    config,
    schoolName,
    isEvaluationMode,
    peStudentRows
  });

  // =========================================================================
  // SHEET 3: NHẬN ĐỊNH SƯ PHẠM & ĐỀ XUẤT CAN THIỆP CHẤT LƯỢNG (NẾU CÓ)
  // =========================================================================
  if (expertReport) {
    appendExpertReportSheet(wb, {
      subjectName,
      expertReport,
      subjectMetrics,
      config,
      schoolName
    });
  }

  // Ghi buffer và kích hoạt tải file về máy
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `Bao_Cao_Pho_Diem_Chuan_${cleanFileName(subjectName)}_${cleanFileName(examCategory)}_${cleanFileName(schoolYear)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Sheet 1 (Môn tính điểm): Bảng thống kê chi tiết 6 thang điểm theo lớp
 */
function appendClassRangeSheet(
  wb: ExcelJS.Workbook,
  data: {
    subjectName: string;
    subjectMetrics: SubjectMetricSummary;
    config: ExamConfig;
    currentUser?: UserProfile | null;
    schoolName: string;
    deptName: string;
    unitName: string;
    todayStr: string;
  }
) {
  const { subjectName, subjectMetrics, config, currentUser, schoolName, deptName, unitName, todayStr } = data;
  const ws = wb.addWorksheet('Thong_Ke_Muc_Diem_Tung_Lop');
  ws.pageSetup = { 
    paperSize: 9, // A4
    orientation: 'landscape', 
    fitToPage: true, 
    fitToWidth: 1, 
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };

  // --- HÀNG 1: QUỐC HIỆU & ĐƠN VỊ ---
  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = deptName.toUpperCase();
  ws.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: false, color: { argb: 'FF475569' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('D1:R1');
  ws.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell('D1').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  ws.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle' };

  // --- HÀNG 2: TÊN TRƯỜNG & TIÊU NGỮ ---
  ws.mergeCells('A2:C2');
  ws.getCell('A2').value = schoolName.toUpperCase();
  ws.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('D2:R2');
  ws.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell('D2').font = { name: 'Times New Roman', size: 10, italic: true, underline: true, bold: true, color: { argb: 'FF0F172A' } };
  ws.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' };

  // --- HÀNG 3: TỔ CHUYÊN MÔN ---
  ws.mergeCells('A3:C3');
  ws.getCell('A3').value = unitName.toUpperCase();
  ws.getCell('A3').font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF2563EB' } };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  // --- HÀNG 5: TIÊU ĐỀ BẢNG THỐNG KÊ ---
  ws.mergeCells('A5:R5');
  ws.getCell('A5').value = `BẢNG THỐNG KÊ CHI TIẾT ĐIỂM THI / KIỂM TRA ĐỊNH KỲ - MÔN ${subjectName.toUpperCase()}`;
  ws.getCell('A5').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 26;

  // --- HÀNG 6: PHỤ ĐỀ KỲ THI & NĂM HỌC ---
  ws.mergeCells('A6:R6');
  ws.getCell('A6').value = `Kỳ thi: ${config.examCategory} ${config.subPeriod ? `(${config.subPeriod})` : ''}   •   Năm học: ${config.schoolYear}   •   Chuẩn đánh giá năng lực GDPT 2018`;
  ws.getCell('A6').font = { name: 'Times New Roman', size: 11, italic: true, bold: true, color: { argb: 'FF991B1B' } };
  ws.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(6).height = 20;

  // --- HÀNG 7: NGÀY XUẤT BIỂU ---
  ws.mergeCells('A7:R7');
  ws.getCell('A7').value = `(Trích xuất dữ liệu ngày: ${todayStr} - Hệ thống Quản trị Khảo thí & Phân tích Điểm thi)`;
  ws.getCell('A7').font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };

  // --- HÀNG 9-10: BANNER CHỈ SỐ TỔNG QUAN TOÀN KHỐI ---
  ws.mergeCells('A9:R9');
  ws.getCell('A9').value = 'I. CHỈ SỐ TỔNG QUAN PHỔ ĐIỂM TOÀN KHỐI';
  ws.getCell('A9').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A9').alignment = { horizontal: 'left', vertical: 'middle' };

  // Hàng 10: Tóm tắt các chỉ số khảo thí chuẩn xác
  const totalInGrade = subjectMetrics.totalInGrade || subjectMetrics.totalCandidates;
  const regCount = subjectMetrics.registeredCandidates || subjectMetrics.totalCandidates;
  const statMetrics = [
    { label: 'Sĩ số / ĐK', val: `${totalInGrade} / ${regCount}` },
    { label: 'Dự thi (N)', val: `${subjectMetrics.totalCandidates}` },
    { label: 'Vắng thi (VT)', val: `${subjectMetrics.absentCount || 0} (${(subjectMetrics.absentRate || 0).toFixed(1)}%)` },
    { label: 'Điểm TB', val: `${subjectMetrics.mean.toFixed(2)}` },
    { label: 'Độ lệch chuẩn', val: `${subjectMetrics.stdDev.toFixed(2)}` },
    { label: 'Tỷ lệ Trên TB (≥5)', val: `${(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%` },
    { label: 'Khá - Giỏi (≥6.5)', val: `${(subjectMetrics.rateExcellent + subjectMetrics.rateGood).toFixed(1)}%` },
    { label: 'Dưới TB (<5.0)', val: `${subjectMetrics.rateBelowAverage.toFixed(1)}%` },
    { label: 'Liệt (≤1.0)', val: `${subjectMetrics.rateFailed.toFixed(1)}%` },
  ];

  // Vẽ khung chỉ số
  ws.getRow(10).height = 22;
  const colSpans: [string, { label: string; val: string }][] = [
    ['A10:B10', statMetrics[0]],
    ['C10:D10', statMetrics[1]],
    ['E10:F10', statMetrics[2]],
    ['G10:H10', statMetrics[3]],
    ['I10:J10', statMetrics[4]],
    ['K10:L10', statMetrics[5]],
    ['M10:N10', statMetrics[6]],
    ['O10:P10', statMetrics[7]],
    ['Q10:R10', statMetrics[8]],
  ];

  colSpans.forEach(([range, item]) => {
    ws.mergeCells(range);
    const startCell = range.split(':')[0];
    const c = ws.getCell(startCell);
    c.value = `${item.label}: ${item.val}`;
    c.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    c.border = THIN_BORDER;
  });

  // --- HÀNG 12: TIÊU ĐỀ PHẦN II ---
  ws.mergeCells('A12:R12');
  ws.getCell('A12').value = 'II. BẢNG PHÂN BỐ 6 MỨC ĐIỂM THEO TỪNG LỚP HỌC';
  ws.getCell('A12').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A12').alignment = { horizontal: 'left', vertical: 'middle' };

  // --- HÀNG 13 & 14: HEADER 2 TẦNG CHO BẢNG DỮ LIỆU ---
  ws.getRow(13).height = 24;
  ws.getRow(14).height = 20;

  // Header Col A: STT
  ws.mergeCells('A13:A14');
  ws.getCell('A13').value = 'STT';
  
  // Header Col B: Lớp
  ws.mergeCells('B13:B14');
  ws.getCell('B13').value = 'Lớp';

  // Header Col C: Sĩ số
  ws.mergeCells('C13:C14');
  ws.getCell('C13').value = 'Sĩ số';

  // Header Col D-E: 0 - 1.0 (Liệt)
  ws.mergeCells('D13:E13');
  ws.getCell('D13').value = '0 - 1.0 (Liệt)';

  // Header Col F-G: 1.1 - 3.4 (Kém)
  ws.mergeCells('F13:G13');
  ws.getCell('F13').value = '1.1 - 3.4 (Kém)';

  // Header Col H-I: 3.5 - 4.9 (Yếu)
  ws.mergeCells('H13:I13');
  ws.getCell('H13').value = '3.5 - 4.9 (Yếu)';

  // Header Col J-K: 5.0 - 6.4 (Trung bình)
  ws.mergeCells('J13:K13');
  ws.getCell('J13').value = '5.0 - 6.4 (TB)';

  // Header Col L-M: 6.5 - 7.9 (Khá)
  ws.mergeCells('L13:M13');
  ws.getCell('L13').value = '6.5 - 7.9 (Khá)';

  // Header Col N-O: 8.0 - 10.0 (Giỏi)
  ws.mergeCells('N13:O13');
  ws.getCell('N13').value = '8.0 - 10.0 (Giỏi)';

  // Header Col P-Q: Trên TB (≥ 5.0)
  ws.mergeCells('P13:Q13');
  ws.getCell('P13').value = 'Trên TB (≥ 5.0)';

  // Header Col R: Điểm TB
  ws.mergeCells('R13:R14');
  ws.getCell('R13').value = 'Điểm TB';

  // Dòng 14 con: SL và %
  const subCols = [
    { col: 'D', text: 'SL' }, { col: 'E', text: '%' },
    { col: 'F', text: 'SL' }, { col: 'G', text: '%' },
    { col: 'H', text: 'SL' }, { col: 'I', text: '%' },
    { col: 'J', text: 'SL' }, { col: 'K', text: '%' },
    { col: 'L', text: 'SL' }, { col: 'M', text: '%' },
    { col: 'N', text: 'SL' }, { col: 'O', text: '%' },
    { col: 'P', text: 'SL' }, { col: 'Q', text: '%' },
  ];
  subCols.forEach(sc => {
    ws.getCell(`${sc.col}14`).value = sc.text;
  });

  // Style cho toàn bộ Header dòng 13 và 14
  for (let c = 1; c <= 18; c++) {
    const colLetter = getColumnLetter(c);
    
    // Ô dòng 13
    const cell13 = ws.getCell(`${colLetter}13`);
    cell13.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell13.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell13.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell13.border = THIN_BORDER;

    // Ô dòng 14
    const cell14 = ws.getCell(`${colLetter}14`);
    cell14.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell14.alignment = { horizontal: 'center', vertical: 'middle' };
    cell14.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell14.border = THIN_BORDER;
  }

  // --- ĐỔ DỮ LIỆU TỪNG LỚP HỌC ---
  const classRows = subjectMetrics.classRangeStats || [];
  let currentRow = 15;

  classRows.forEach((item, index) => {
    ws.getRow(currentRow).height = 19;
    const isEven = index % 2 === 1;
    const bgRowColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    const rowData: Record<string, any> = {
      A: index + 1,
      B: item.className,
      C: item.totalStudents,
      D: item.count0to1,
      E: item.pct0to1 / 100, // Định dạng % trong Excel
      F: item.count11to34,
      G: item.pct11to34 / 100,
      H: item.count35to49,
      I: item.pct35to49 / 100,
      J: item.count5to64,
      K: item.pct5to64 / 100,
      L: item.count65to79,
      M: item.pct65to79 / 100,
      N: item.count8to10,
      O: item.pct8to10 / 100,
      P: item.countAboveFive,
      Q: item.pctAboveFive / 100,
      R: item.mean
    };

    for (let c = 1; c <= 18; c++) {
      const colLetter = getColumnLetter(c);
      const cell = ws.getCell(`${colLetter}${currentRow}`);
      cell.value = rowData[colLetter];
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = THIN_BORDER;

      // Căn chỉnh
      if (colLetter === 'A' || colLetter === 'B') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colLetter === 'B') cell.font = { name: 'Times New Roman', size: 10, bold: true };
      } else if (['E', 'G', 'I', 'K', 'M', 'O', 'Q'].includes(colLetter)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.0%';
      } else if (colLetter === 'R') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.00';
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }

      // Tô màu nhẹ nhàng theo nhóm dải điểm
      if (['D', 'E'].includes(colLetter) && item.count0to1 > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      } else if (['N', 'O'].includes(colLetter) && item.count8to10 > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF065F46' } };
      } else if (['P', 'Q'].includes(colLetter)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      }
    }

    currentRow++;
  });

  // --- DÒNG TỔNG TOÀN KHỐI ---
  const overall = subjectMetrics.overallRangeStat;
  ws.getRow(currentRow).height = 22;

  const overallRowData: Record<string, any> = {
    A: '',
    B: 'TOÀN KHỐI',
    C: overall ? overall.totalStudents : subjectMetrics.totalCandidates,
    D: overall ? overall.count0to1 : 0,
    E: overall ? overall.pct0to1 / 100 : 0,
    F: overall ? overall.count11to34 : 0,
    G: overall ? overall.pct11to34 / 100 : 0,
    H: overall ? overall.count35to49 : 0,
    I: overall ? overall.pct35to49 / 100 : 0,
    J: overall ? overall.count5to64 : 0,
    K: overall ? overall.pct5to64 / 100 : 0,
    L: overall ? overall.count65to79 : 0,
    M: overall ? overall.pct65to79 / 100 : 0,
    N: overall ? overall.count8to10 : 0,
    O: overall ? overall.pct8to10 / 100 : 0,
    P: overall ? overall.countAboveFive : 0,
    Q: overall ? overall.pctAboveFive / 100 : 0,
    R: overall ? overall.mean : subjectMetrics.mean
  };

  for (let c = 1; c <= 18; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws.getCell(`${colLetter}${currentRow}`);
    cell.value = overallRowData[colLetter];
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = DOUBLE_BOTTOM_BORDER;

    if (colLetter === 'B') {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (['E', 'G', 'I', 'K', 'M', 'O', 'Q'].includes(colLetter)) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '0.0%';
    } else if (colLetter === 'R') {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '0.00';
      cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    } else {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0';
    }
  }

  currentRow += 2;

  // --- GHI CHÚ NGUYÊN TẮC QUY ĐỔI ---
  ws.mergeCells(`A${currentRow}:R${currentRow}`);
  ws.getCell(`A${currentRow}`).value = '* Ghi chú: Thang phân loại theo chuẩn quản trị chuyên môn THPT: (0 - 1.0): Liệt/Báo động đỏ; (1.1 - 3.4): Kém; (3.5 - 4.9): Yếu; (5.0 - 6.4): Trung bình; (6.5 - 7.9): Khá; (8.0 - 10.0): Giỏi/Xuất sắc.';
  ws.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF64748B' } };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };

  currentRow += 2;

  // --- KHỐI CHỮ KÝ 3 CỘT CHUẨN BỘ GIÁO DỤC ---
  // Dòng ngày tháng
  ws.mergeCells(`M${currentRow}:R${currentRow}`);
  ws.getCell(`M${currentRow}`).value = `......, ngày ..... tháng ..... năm 20...`;
  ws.getCell(`M${currentRow}`).font = { name: 'Times New Roman', size: 10, italic: true };
  ws.getCell(`M${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRow++;
  const signTitleRow = currentRow;

  // Cột 1: NGƯỜI LẬP BIỂU
  ws.mergeCells(`A${signTitleRow}:E${signTitleRow}`);
  ws.getCell(`A${signTitleRow}`).value = 'NGƯỜI LẬP BIỂU';
  ws.getCell(`A${signTitleRow}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`A${signTitleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A${signTitleRow + 1}:E${signTitleRow + 1}`);
  ws.getCell(`A${signTitleRow + 1}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`A${signTitleRow + 1}`).font = { name: 'Times New Roman', size: 9, italic: true };
  ws.getCell(`A${signTitleRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Cột 2: TỔ TRƯỞNG CHUYÊN MÔN
  ws.mergeCells(`G${signTitleRow}:L${signTitleRow}`);
  ws.getCell(`G${signTitleRow}`).value = 'TỔ TRƯỞNG CHUYÊN MÔN';
  ws.getCell(`G${signTitleRow}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`G${signTitleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`G${signTitleRow + 1}:L${signTitleRow + 1}`);
  ws.getCell(`G${signTitleRow + 1}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`G${signTitleRow + 1}`).font = { name: 'Times New Roman', size: 9, italic: true };
  ws.getCell(`G${signTitleRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Cột 3: HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG
  ws.mergeCells(`N${signTitleRow}:R${signTitleRow}`);
  ws.getCell(`N${signTitleRow}`).value = 'HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG';
  ws.getCell(`N${signTitleRow}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`N${signTitleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`N${signTitleRow + 1}:R${signTitleRow + 1}`);
  ws.getCell(`N${signTitleRow + 1}`).value = '(Ký duyệt và đóng dấu)';
  ws.getCell(`N${signTitleRow + 1}`).font = { name: 'Times New Roman', size: 9, italic: true };
  ws.getCell(`N${signTitleRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Khoảng trống ký tên
  if (currentUser?.full_name) {
    ws.mergeCells(`A${signTitleRow + 5}:E${signTitleRow + 5}`);
    ws.getCell(`A${signTitleRow + 5}`).value = currentUser.full_name;
    ws.getCell(`A${signTitleRow + 5}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
    ws.getCell(`A${signTitleRow + 5}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // --- CẤU HÌNH ĐỘ RỘNG CỘT ---
  ws.columns = [
    { width: 6 },   // A: STT
    { width: 10 },  // B: Lớp
    { width: 8 },   // C: Sĩ số
    { width: 7.5 }, // D: 0-1 SL
    { width: 8.5 }, // E: 0-1 %
    { width: 7.5 }, // F: 1.1-3.4 SL
    { width: 8.5 }, // G: 1.1-3.4 %
    { width: 7.5 }, // H: 3.5-4.9 SL
    { width: 8.5 }, // I: 3.5-4.9 %
    { width: 7.5 }, // J: 5-6.4 SL
    { width: 8.5 }, // K: 5-6.4 %
    { width: 7.5 }, // L: 6.5-7.9 SL
    { width: 8.5 }, // M: 6.5-7.9 %
    { width: 7.5 }, // N: 8-10 SL
    { width: 8.5 }, // O: 8-10 %
    { width: 8.5 }, // P: Trên TB SL
    { width: 9.5 }, // Q: Trên TB %
    { width: 10 },  // R: Điểm TB
  ];
}

/**
 * Sheet 1 (Môn Đánh giá nhận xét TT22 - GDTC): Đạt / Chưa đạt
 */
function appendPeEvaluationSheet(
  wb: ExcelJS.Workbook,
  data: {
    subjectName: string;
    peStudentRows: PeStudentRow[];
    config: ExamConfig;
    currentUser?: UserProfile | null;
    schoolName: string;
    deptName: string;
    unitName: string;
    todayStr: string;
  }
) {
  const { subjectName, peStudentRows, config, schoolName, deptName, unitName, todayStr } = data;
  const ws = wb.addWorksheet('Danh_Gia_Ket_Qua_GDTC');
  ws.pageSetup = { 
    paperSize: 9, 
    orientation: 'landscape', 
    fitToPage: true, 
    fitToWidth: 1, 
    fitToHeight: 0 
  };

  // Header hành chính
  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = deptName.toUpperCase();
  ws.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: false };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('D1:H1');
  ws.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell('D1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:C2');
  ws.getCell('A2').value = schoolName.toUpperCase();
  ws.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('D2:H2');
  ws.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell('D2').font = { name: 'Times New Roman', size: 10, italic: true, underline: true, bold: true };
  ws.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A4:H4');
  ws.getCell('A4').value = `BẢNG TỔNG HỢP ĐÁNH GIÁ KẾT QUẢ MÔN ${subjectName.toUpperCase()} (ĐẠT / CHƯA ĐẠT)`;
  ws.getCell('A4').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF065F46' } };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 25;

  ws.mergeCells('A5:H5');
  ws.getCell('A5').value = `Đánh giá theo Thông tư 22/2021/TT-BGDĐT   •   Năm học: ${config.schoolYear}   •   Ngày xuất: ${todayStr}`;
  ws.getCell('A5').font = { name: 'Times New Roman', size: 10.5, italic: true, color: { argb: 'FF475569' } };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  // Gom dữ liệu theo lớp
  const classMap = new Map<string, { total: number; pass: number; fail: number; notes: string[] }>();
  peStudentRows.forEach(s => {
    const cls = s.className || 'Khối 12';
    if (!classMap.has(cls)) {
      classMap.set(cls, { total: 0, pass: 0, fail: 0, notes: [] });
    }
    const item = classMap.get(cls)!;
    item.total++;
    if (s.overallResult === 'Đ') item.pass++;
    else item.fail++;
    if (s.teacherComment && !item.notes.includes(s.teacherComment)) item.notes.push(s.teacherComment);
  });

  // Table header
  ws.mergeCells('A7:A8');
  ws.getCell('A7').value = 'STT';
  ws.mergeCells('B7:B8');
  ws.getCell('B7').value = 'Lớp';
  ws.mergeCells('C7:C8');
  ws.getCell('C7').value = 'Sĩ số';
  ws.mergeCells('D7:E7');
  ws.getCell('D7').value = 'KẾT QUẢ: ĐẠT (Đ)';
  ws.getCell('D8').value = 'Số lượng';
  ws.getCell('E8').value = 'Tỷ lệ (%)';
  ws.mergeCells('F7:G7');
  ws.getCell('F7').value = 'KẾT QUẢ: CHƯA ĐẠT (CĐ)';
  ws.getCell('F8').value = 'Số lượng';
  ws.getCell('G8').value = 'Tỷ lệ (%)';
  ws.mergeCells('H7:H8');
  ws.getCell('H7').value = 'Ghi chú & Đề xuất sư phạm';

  for (let c = 1; c <= 8; c++) {
    const colLetter = getColumnLetter(c);
    const c7 = ws.getCell(`${colLetter}7`);
    const c8 = ws.getCell(`${colLetter}8`);
    c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    c7.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c7.alignment = { horizontal: 'center', vertical: 'middle' };
    c7.border = THIN_BORDER;

    c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
    c8.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c8.alignment = { horizontal: 'center', vertical: 'middle' };
    c8.border = THIN_BORDER;
  }

  let rowIdx = 9;
  let stt = 1;
  let grandTotal = 0;
  let grandPass = 0;
  let grandFail = 0;

  classMap.forEach((val, cls) => {
    grandTotal += val.total;
    grandPass += val.pass;
    grandFail += val.fail;

    const pctPass = val.total > 0 ? (val.pass / val.total) : 0;
    const pctFail = val.total > 0 ? (val.fail / val.total) : 0;

    ws.getRow(rowIdx).height = 20;
    ws.getCell(`A${rowIdx}`).value = stt++;
    ws.getCell(`B${rowIdx}`).value = cls;
    ws.getCell(`C${rowIdx}`).value = val.total;
    ws.getCell(`D${rowIdx}`).value = val.pass;
    ws.getCell(`E${rowIdx}`).value = pctPass;
    ws.getCell(`F${rowIdx}`).value = val.fail;
    ws.getCell(`G${rowIdx}`).value = pctFail;
    ws.getCell(`H${rowIdx}`).value = val.notes.slice(0, 2).join('; ') || 'Hoàn thành chương trình RLTT';

    for (let c = 1; c <= 8; c++) {
      const cell = ws.getCell(`${getColumnLetter(c)}${rowIdx}`);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = THIN_BORDER;
      if (['A', 'B'].includes(getColumnLetter(c))) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (['E', 'G'].includes(getColumnLetter(c))) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.0%';
      } else if (getColumnLetter(c) === 'H') cell.alignment = { horizontal: 'left', vertical: 'middle' };
      else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }
    }
    rowIdx++;
  });

  // Hàng toàn khối
  ws.getRow(rowIdx).height = 22;
  ws.getCell(`A${rowIdx}`).value = '';
  ws.getCell(`B${rowIdx}`).value = 'TOÀN KHỐI';
  ws.getCell(`C${rowIdx}`).value = grandTotal;
  ws.getCell(`D${rowIdx}`).value = grandPass;
  ws.getCell(`E${rowIdx}`).value = grandTotal > 0 ? (grandPass / grandTotal) : 0;
  ws.getCell(`F${rowIdx}`).value = grandFail;
  ws.getCell(`G${rowIdx}`).value = grandTotal > 0 ? (grandFail / grandTotal) : 0;
  ws.getCell(`H${rowIdx}`).value = 'Kế hoạch bổ trợ rèn luyện thể lực cuối học kỳ';

  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(`${getColumnLetter(c)}${rowIdx}`);
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = DOUBLE_BOTTOM_BORDER;
    if (['A', 'B'].includes(getColumnLetter(c))) cell.alignment = { horizontal: 'center', vertical: 'middle' };
    else if (['E', 'G'].includes(getColumnLetter(c))) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '0.0%';
    } else if (getColumnLetter(c) === 'H') cell.alignment = { horizontal: 'left', vertical: 'middle' };
    else {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0';
    }
  }

  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 45 }
  ];
}

/**
 * Sheet 2: Danh sách điểm chi tiết từng học sinh kèm xếp loại
 */
function appendStudentScoreListSheet(
  wb: ExcelJS.Workbook,
  data: {
    subjectName: string;
    scoreRows: StudentScoreRow[];
    config: ExamConfig;
    schoolName: string;
    isEvaluationMode?: boolean;
    peStudentRows?: PeStudentRow[];
  }
) {
  const { subjectName, scoreRows, config, schoolName, isEvaluationMode, peStudentRows = [] } = data;
  const ws = wb.addWorksheet('Danh_Sach_Diem_Chi_Tiet');
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToWidth: 1, fitToHeight: 0 };

  // Tiêu đề
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `${schoolName.toUpperCase()} - DANH SÁCH ĐIỂM HỌC SINH MÔN ${subjectName.toUpperCase()}`;
  ws.getCell('A1').font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `Kỳ thi: ${config.examCategory} • Năm học: ${config.schoolYear}`;
  ws.getCell('A2').font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  if (isEvaluationMode && peStudentRows.length > 0) {
    // Header GDTC
    const headers = ['STT', 'SBD', 'Họ và tên', 'Lớp', 'Đánh giá (Đ/CĐ)', 'Nội dung thực hành'];
    ws.getRow(4).height = 22;
    headers.forEach((h, idx) => {
      const cell = ws.getCell(`${getColumnLetter(idx + 1)}4`);
      cell.value = h;
      cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = THIN_BORDER;
    });

    peStudentRows.forEach((r, idx) => {
      const rowIdx = 5 + idx;
      ws.getRow(rowIdx).height = 19;
      ws.getCell(`A${rowIdx}`).value = idx + 1;
      ws.getCell(`B${rowIdx}`).value = r.sbd;
      ws.getCell(`C${rowIdx}`).value = r.fullName;
      ws.getCell(`D${rowIdx}`).value = r.className;
      ws.getCell(`E${rowIdx}`).value = r.overallResult;
      ws.getCell(`F${rowIdx}`).value = r.teacherComment || '';

      for (let c = 1; c <= 6; c++) {
        const cell = ws.getCell(`${getColumnLetter(c)}${rowIdx}`);
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.border = THIN_BORDER;
        if (['A', 'B', 'D', 'E'].includes(getColumnLetter(c))) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });

    ws.columns = [{ width: 6 }, { width: 14 }, { width: 25 }, { width: 12 }, { width: 16 }, { width: 35 }];
    return;
  }

  // Header điểm số bình thường
  const headers = ['STT', 'Số báo danh', 'Họ và tên', 'Lớp', `Điểm ${subjectName}`, 'Xếp loại theo điểm'];
  ws.getRow(4).height = 22;
  headers.forEach((h, idx) => {
    const cell = ws.getCell(`${getColumnLetter(idx + 1)}4`);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN_BORDER;
  });

  // Lấy danh sách học sinh có điểm của môn
  let rowIdx = 5;
  scoreRows.forEach((s, idx) => {
    const rawVal = s.scores[subjectName];
    const scoreVal = typeof rawVal === 'number' ? rawVal : null;
    const examStatus = s.examStatuses?.[subjectName];
    
    let classification = 'Không đăng ký';
    let displayVal: string | number = '-';

    if (scoreVal !== null) {
      displayVal = scoreVal;
      if (scoreVal >= 8.0) classification = 'Giỏi / Xuất sắc';
      else if (scoreVal >= 6.5) classification = 'Khá';
      else if (scoreVal >= 5.0) classification = 'Trung bình';
      else if (scoreVal > 1.0) classification = 'Dưới TB (Cần phụ đạo)';
      else if (scoreVal === 0) classification = 'Điểm 0 (Liệt - Báo động)';
      else classification = 'Liệt (≤ 1.0)';
    } else if (examStatus === 'absent_vt') {
      classification = 'Vắng thi (VT)';
      displayVal = 'VT';
    }

    ws.getRow(rowIdx).height = 19;
    ws.getCell(`A${rowIdx}`).value = idx + 1;
    ws.getCell(`B${rowIdx}`).value = s.sbd;
    ws.getCell(`C${rowIdx}`).value = s.fullName;
    ws.getCell(`D${rowIdx}`).value = s.className;
    ws.getCell(`E${rowIdx}`).value = displayVal;
    ws.getCell(`F${rowIdx}`).value = classification;

    for (let c = 1; c <= 6; c++) {
      const colL = getColumnLetter(c);
      const cell = ws.getCell(`${colL}${rowIdx}`);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = THIN_BORDER;

      if (['A', 'B', 'D'].includes(colL)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colL === 'E') {
        cell.alignment = { horizontal: typeof displayVal === 'number' ? 'right' : 'center', vertical: 'middle' };
        if (typeof displayVal === 'number') {
          cell.numFmt = '0.0';
          if (displayVal <= 1.0) {
            cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF991B1B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          } else if (displayVal < 5.0) {
            cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFDC2626' } };
          } else if (displayVal >= 8.0) {
            cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF059669' } };
          }
        } else if (displayVal === 'VT') {
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFB45309' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    rowIdx++;
  });

  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 25 },
    { width: 12 },
    { width: 16 },
    { width: 22 }
  ];
}

/**
 * Sheet 3: Nhận định chuyên gia sư phạm & Kế hoạch can thiệp 4 phần
 */
function appendExpertReportSheet(
  wb: ExcelJS.Workbook,
  data: {
    subjectName: string;
    expertReport: ExpertPedagogicalReport;
    subjectMetrics: SubjectMetricSummary;
    config: ExamConfig;
    schoolName: string;
  }
) {
  const { subjectName, expertReport, config, schoolName } = data;
  const ws = wb.addWorksheet('Khuyen_Nghi_Su_Pham');
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToWidth: 1, fitToHeight: 0 };

  // Header
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = `${schoolName.toUpperCase()} - BÁO CÁO PHÂN TÍCH KHẢO THÍ SƯ PHẠM`;
  ws.getCell('A1').font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `Môn: ${subjectName}   •   Đợt kiểm tra: ${config.examCategory} (${config.schoolYear})`;
  ws.getCell('A2').font = { name: 'Times New Roman', size: 10, italic: true };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  let row = 4;

  // PHẦN A: TỔNG QUAN
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'PHẦN A. ẤN TƯỢNG VÀ ĐÁNH GIÁ TỔNG QUAN PHỔ ĐIỂM';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  ws.getRow(row).height = 22;
  row++;

  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = expertReport.partA_Overview.generalImpression;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
  ws.getCell(`A${row}`).alignment = { wrapText: true };
  row++;

  expertReport.partA_Overview.highlights.forEach(h => {
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(`A${row}`).value = `• ${h}`;
    ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
    ws.getCell(`A${row}`).alignment = { wrapText: true };
    row++;
  });
  row++;

  // PHẦN B: NÚT THẮT KIẾN THỨC
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'PHẦN B. NÚT THẮT KIẾN THỨC & CẢNH BÁO ĐO LƯỜNG KHẢO THÍ';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  ws.getRow(row).height = 22;
  row++;

  expertReport.partB_Interventions.knowledgeBottlenecks.forEach(b => {
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(`A${row}`).value = `[${b.severity}] ${b.topicOrYccd} (Tỷ lệ làm đúng: ${b.passRate}%): ${b.details}`;
    ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
    ws.getCell(`A${row}`).alignment = { wrapText: true };
    row++;
  });
  row++;

  // PHẦN C: GIẢ THUYẾT SƯ PHẠM
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'PHẦN C. GIẢ THUYẾT SƯ PHẠM VÀ NGUYÊN NHÂN CỐT LÕI';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  ws.getRow(row).height = 22;
  row++;

  expertReport.partC_Hypotheses.learningAndTeachingHypotheses.forEach(h => {
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(`A${row}`).value = `• ${h}`;
    ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
    ws.getCell(`A${row}`).alignment = { wrapText: true };
    row++;
  });
  row++;

  // PHẦN D: KẾ HOẠCH HÀNH ĐỘNG
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'PHẦN D. KẾ HOẠCH HÀNH ĐỘNG SƯ PHẠM CỤ THỂ';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  ws.getRow(row).height = 22;
  row++;

  // Header bảng hành động
  ws.getCell(`A${row}`).value = 'STT';
  ws.getCell(`B${row}`).value = 'Vấn đề trọng tâm';
  ws.getCell(`C${row}`).value = 'Đối tượng học sinh';
  ws.getCell(`D${row}`).value = 'Hành động sư phạm can thiệp';
  for (let c = 1; c <= 4; c++) {
    const cell = ws.getCell(`${getColumnLetter(c)}${row}`);
    cell.font = { name: 'Times New Roman', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = THIN_BORDER;
  }
  row++;

  expertReport.partD_ActionPlan.forEach((plan, idx) => {
    ws.getRow(row).height = 28;
    ws.getCell(`A${row}`).value = idx + 1;
    ws.getCell(`B${row}`).value = plan.issueTarget;
    ws.getCell(`C${row}`).value = plan.studentTargetGroup;
    ws.getCell(`D${row}`).value = plan.pedagogicalAction;

    for (let c = 1; c <= 4; c++) {
      const cell = ws.getCell(`${getColumnLetter(c)}${row}`);
      cell.font = { name: 'Times New Roman', size: 9.5 };
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'middle' };
    }
    row++;
  });

  ws.columns = [
    { width: 6 },
    { width: 28 },
    { width: 22 },
    { width: 50 }
  ];
}
