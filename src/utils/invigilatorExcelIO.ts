import ExcelJS from 'exceljs';
import { Invigilator, InvigilatorRole, ExamSession } from '../types/invigilator';

/**
 * Tải File Excel Mẫu Danh Sách Hội Đồng & Giám Thị
 */
export async function downloadInvigilatorTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ Thống Phân Công Giám Thị THPT';
  wb.created = new Date();

  const ws = wb.addWorksheet('Danh_Sach_Hoi_Dong');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Tiêu đề hướng dẫn
  ws.mergeCells('A1:I1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'DANH SÁCH CÁN BỘ LÃNH ĐẠO, THƯ KÝ, GIÁM SÁT VÀ GIÁM THỊ COI THI';
  titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:I2');
  const noteCell = ws.getCell('A2');
  noteCell.value = '* Lưu ý: Cột "Nhiệm vụ HĐ thi" gồm: Chủ tịch, Phó Chủ tịch, Thư ký, Giám sát, Khảo thí - Hỗ trợ, Giám thị, Y tế, Bảo vệ. Cột "Số ca giảm trừ": điền -2 (chấm Văn), -1 (chấm Toán), 0 (bình thường), hoặc "Miễn coi".';
  noteCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF64748B' } };
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Header các cột
  const headers = [
    'STT',
    'Mã GV',
    'Họ và tên',
    'Đơn vị / Tổ CM',
    'Môn giảng dạy',
    'Nhiệm vụ HĐ thi',
    'Số ca giảm trừ',
    'Số điện thoại',
    'Ghi chú phân công'
  ];

  const headerRow = ws.getRow(4);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 26;

  // Dữ liệu mẫu chuẩn
  const sampleData = [
    [1, 'BGH01', 'Nguyễn Văn Thắng', 'BGH - THPT Nguyễn Huệ', 'Toán', 'Chủ tịch', 'Miễn coi', '0912.345.678', 'Hiệu trưởng - Chủ tịch Hội đồng'],
    [2, 'BGH02', 'Trần Thị Mai', 'BGH - THPT Nguyễn Huệ', 'Ngữ văn', 'Phó Chủ tịch', 'Miễn coi', '0913.456.789', 'Phó Hiệu trưởng - Phụ trách CSVC'],
    [3, 'TK01', 'Lê Hoàng Nam', 'Tổ Tin - Văn phòng', 'Tin học', 'Thư ký', 'Miễn coi', '0988.123.456', 'Thư ký 1 - Tổng hợp số liệu, máy tính'],
    [4, 'TK02', 'Phạm Thị Lan', 'Tổ Ngoại ngữ', 'Tiếng Anh', 'Thư ký', 'Miễn coi', '0977.234.567', 'Thư ký 2 - Bàn giao đề thi, bài thi'],
    [5, 'GS01', 'Vũ Quốc Đạt', 'Tổ GDTC - QPAN', 'GDTC', 'Giám sát', 'Miễn coi', '0905.112.233', 'Giám sát hành lang Dãy A (P01 - P12)'],
    [6, 'GS02', 'Mai Văn Long', 'Tổ GDTC - QPAN', 'GDTC', 'Giám sát', 'Miễn coi', '0906.223.344', 'Giám sát hành lang Dãy B (P13 - P24)'],
    [7, 'KT01', 'Nguyễn Thanh Tùng', 'Tổ Tin học', 'Tin học', 'Khảo thí - Hỗ trợ', 'Miễn coi', '0978.889.901', 'Trực đề & hỗ trợ kỹ thuật khảo thí'],
    [8, 'GV01', 'Nguyễn Văn An', 'THPT Nguyễn Huệ', 'Toán', 'Giám thị', '-1', '0934.111.001', 'Chấm tự luận Toán'],
    [9, 'GV02', 'Trần Thị Bích', 'THPT Nguyễn Huệ', 'Toán', 'Giám thị', '-1', '0934.111.002', 'Chấm tự luận Toán'],
    [10, 'GV03', 'Đặng Thanh Giang', 'THPT Nguyễn Huệ', 'Ngữ văn', 'Giám thị', '-2', '0934.111.006', 'Chấm tự luận Ngữ văn'],
    [11, 'GV04', 'Bùi Thị Hạnh', 'THPT Nguyễn Huệ', 'Ngữ văn', 'Giám thị', '-2', '0934.111.007', 'Chấm tự luận Ngữ văn'],
    [12, 'GV05', 'Lê Hoàng Cường', 'THPT Nguyễn Huệ', 'Vật lí', 'Giám thị', '0', '0934.111.003', 'Coi đủ định mức'],
    [13, 'GV06', 'Phạm Minh Đức', 'THPT Nguyễn Huệ', 'Hóa học', 'Giám thị', '0', '0934.111.004', 'Coi đủ định mức'],
    [14, 'GV07', 'Hoàng Thị Dung', 'THPT Nguyễn Huệ', 'Sinh học', 'Giám thị', '0', '0934.111.005', 'Coi đủ định mức'],
    [15, 'GV08', 'Ngô Văn Hùng', 'THPT Nguyễn Huệ', 'Lịch sử', 'Giám thị', '0', '0934.111.008', 'Coi đủ định mức'],
    [16, 'GV09', 'Đỗ Thị Hương', 'THPT Nguyễn Huệ', 'Địa lí', 'Giám thị', '0', '0934.111.009', 'Coi đủ định mức'],
    [17, 'GV10', 'Dương Văn Khoa', 'THPT Nguyễn Huệ', 'Tiếng Anh', 'Giám thị', '0', '0934.111.010', 'Coi đủ định mức'],
    [18, 'YT01', 'Hoàng Văn Cường', 'Nhân viên Y tế', 'Y tế', 'Y tế', 'Miễn coi', '0945.678.901', 'Trực sơ cấp cứu y tế'],
    [19, 'BV01', 'Nguyễn Đình Dũng', 'Nhân viên Bảo vệ', 'Bảo vệ', 'Bảo vệ', 'Miễn coi', '0918.789.012', 'An ninh trật tự vòng ngoài']
  ];

  sampleData.forEach((rowVals, rIdx) => {
    const row = ws.getRow(5 + rIdx);
    row.height = 21;
    rowVals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (cIdx === 0 || cIdx === 1 || cIdx === 5 || cIdx === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      }

      // Tô màu nhẹ cho các vai trò lãnh đạo
      if (cIdx === 5) {
        const roleStr = String(val).toLowerCase();
        if (roleStr.includes('chủ tịch')) {
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF6B21A8' } };
        } else if (roleStr.includes('thư ký')) {
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
        } else if (roleStr.includes('giám sát')) {
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF92400E' } };
        }
      }
    });
  });

  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 24 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 34 }
  ];

  // Tải file về
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mau_Danh_Sach_Hoi_Dong_Giam_Thi_2025.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Helper an toàn lấy ô cell từ row ExcelJS, tránh tuyệt đối lỗi out of bounds (cột < 1 hoặc > 16384)
 */
export function safeGetCell(row: ExcelJS.Row | null | undefined, colIdx: number): ExcelJS.Cell | null {
  if (!row || typeof colIdx !== 'number' || !Number.isInteger(colIdx) || colIdx < 1 || colIdx > 16384) {
    return null;
  }
  try {
    return row.getCell(colIdx);
  } catch {
    return null;
  }
}

/**
 * Helper an toàn trích xuất chuỗi văn bản từ ô ExcelJS (xử lý triệt để richText, formula result, hyperlink, number, Date)
 */
export function getCellValueAsString(cell: any): string {
  if (!cell) return '';
  const val = cell.value;
  if (val === null || val === undefined) return '';

  // Chuỗi thông thường
  if (typeof val === 'string') {
    return val.replace(/\u00A0/g, ' ').trim();
  }

  // Số hoặc boolean
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val).trim();
  }

  // Đối tượng Date
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Đối tượng phức hợp trong ExcelJS
  if (typeof val === 'object') {
    // 1. Dạng richText: { richText: [ { text: "..." }, ... ] }
    if (Array.isArray(val.richText)) {
      return val.richText
        .map((item: any) => (item && item.text ? String(item.text) : ''))
        .join('')
        .replace(/\u00A0/g, ' ')
        .trim();
    }

    // 2. Dạng kết quả công thức: { formula: "...", result: "..." }
    if (val.result !== undefined && val.result !== null) {
      if (typeof val.result === 'object' && Array.isArray(val.result.richText)) {
        return val.result.richText
          .map((item: any) => (item && item.text ? String(item.text) : ''))
          .join('')
          .replace(/\u00A0/g, ' ')
          .trim();
      }
      return String(val.result).replace(/\u00A0/g, ' ').trim();
    }

    // 3. Dạng Hyperlink / Text
    if (val.text !== undefined && val.text !== null) {
      return String(val.text).replace(/\u00A0/g, ' ').trim();
    }
  }

  return String(val).replace(/\u00A0/g, ' ').trim();
}

/**
 * Chuẩn hóa viết hoa chữ cái đầu (Title Case) cho tên tiếng Việt nếu người dùng nhập toàn chữ HOA hoặc toàn chữ thường
 */
export function standardizeVietnameseName(rawName: string): string {
  if (!rawName) return '';
  const clean = rawName.replace(/\s+/g, ' ').trim();
  // Nếu là viết hoa toàn bộ (VD: "NGUYỄN VĂN AN") hoặc viết thường toàn bộ (VD: "nguyễn văn an")
  if (clean === clean.toUpperCase() || clean === clean.toLowerCase()) {
    return clean
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return clean;
}

/**
 * Chuẩn hóa số điện thoại (bù số 0 bị mất khi lưu dạng số trong Excel, định dạng dạng 09xx.xxx.xxx)
 */
export function standardizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 9 && ['3', '5', '7', '8', '9'].includes(digits[0])) {
    const full = '0' + digits;
    return `${full.slice(0, 4)}.${full.slice(4, 7)}.${full.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
  }
  return rawPhone.trim();
}

/**
 * Chuẩn hóa tên môn giảng dạy theo danh mục các môn chuẩn của trường THPT
 */
export function standardizeSubjectName(rawSubject: string, deptHint = ''): string {
  const norm = rawSubject ? rawSubject.toLowerCase().replace(/[\s_]+/g, ' ').trim() : '';

  if (norm.includes('toán')) return 'Toán';
  if (norm.includes('văn') || norm.includes('ngữ văn')) return 'Ngữ văn';
  if (norm.includes('vật lí') || norm.includes('vật lý') || norm === 'lí' || norm === 'lý') return 'Vật lí';
  if (norm.includes('hóa')) return 'Hóa học';
  if (norm.includes('sinh')) return 'Sinh học';
  if (norm.includes('sử') || norm.includes('lịch sử')) return 'Lịch sử';
  if (norm.includes('địa') || norm.includes('địa lí') || norm.includes('địa lý')) return 'Địa lí';
  if (norm.includes('anh') || norm.includes('ngoại ngữ') || norm.includes('tiếng anh')) return 'Tiếng Anh';
  if (norm.includes('tin') || norm.includes('tin học') || norm.includes('cntt')) return 'Tin học';
  if (norm.includes('công nghệ') || norm === 'cn' || norm.includes('ktcn') || norm.includes('ktnn')) return 'Công nghệ';
  if (norm.includes('gdcd') || norm.includes('công dân') || norm.includes('pháp luật') || norm.includes('gdkt')) return 'GDCD';
  if (norm.includes('thể dục') || norm.includes('gdtc') || norm.includes('thể chất')) return 'GDTC';
  if (norm.includes('quốc phòng') || norm.includes('qpan') || norm.includes('gdqp')) return 'GDQP-AN';
  if (norm.includes('âm nhạc') || norm.includes('nhạc')) return 'Âm nhạc';
  if (norm.includes('mỹ thuật') || norm.includes('hội họa')) return 'Mỹ thuật';

  // Nếu ô môn trống, suy luận thông minh từ Tổ chuyên môn / Đơn vị
  if (!norm && deptHint) {
    const dLower = deptHint.toLowerCase();
    if (dLower.includes('văn')) return 'Ngữ văn';
    if (dLower.includes('toán')) return 'Toán';
    if (dLower.includes('ngoại ngữ') || dLower.includes('tiếng anh')) return 'Tiếng Anh';
    if (dLower.includes('lí') || dLower.includes('vật lí') || dLower.includes('vật lý')) return 'Vật lí';
    if (dLower.includes('hóa')) return 'Hóa học';
    if (dLower.includes('sinh')) return 'Sinh học';
    if (dLower.includes('sử')) return 'Lịch sử';
    if (dLower.includes('địa')) return 'Địa lí';
    if (dLower.includes('tin')) return 'Tin học';
    if (dLower.includes('thể dục') || dLower.includes('gdtc')) return 'GDTC';
    if (dLower.includes('qpan') || dLower.includes('quốc phòng')) return 'GDQP-AN';
    if (dLower.includes('xã hội')) return 'Lịch sử';
    if (dLower.includes('tự nhiên')) return 'Toán';
  }

  return rawSubject ? rawSubject.trim() : 'Toán';
}

export interface ImportInvigilatorResult {
  invigilators: Invigilator[];
  totalImported: number;
  rolesSummary: Record<string, number>;
  exemptCount: number;
  reductionCount: number;
  warnings: string[];
}

/**
 * Đọc file Excel người dùng tải lên và chuyển đổi thành danh sách Invigilator[]
 * Rà soát kỹ lưỡng: hỗ trợ gộp 2 cột Họ lót + Tên, tự động phát hiện dòng header, chống nhầm lẫn chức vụ,
 * chuẩn hóa số ca giảm trừ (chấm bài tự luận), chuẩn hóa số điện thoại và môn chuyên môn.
 */
export async function importInvigilatorsFromExcel(file: File): Promise<ImportInvigilatorResult> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  if (!wb.worksheets || wb.worksheets.length === 0) {
    throw new Error('File Excel không có trang tính (Sheet) nào.');
  }

  // 1. Tự động chọn Sheet có dữ liệu danh sách Hội đồng thi phù hợp nhất
  let bestSheet = wb.worksheets[0];
  let maxScore = -1;

  for (const sheet of wb.worksheets) {
    let sheetScore = 0;
    const maxRowToCheck = Math.min(sheet.rowCount, 15);
    for (let r = 1; r <= maxRowToCheck; r++) {
      const row = sheet.getRow(r);
      row.eachCell(cell => {
        const str = getCellValueAsString(cell).toLowerCase();
        if (str.includes('họ') || str.includes('tên')) sheetScore += 3;
        if (str.includes('giáo viên') || str.includes('cán bộ')) sheetScore += 2;
        if (str.includes('giám thị') || str.includes('hội đồng')) sheetScore += 2;
        if (str.includes('nhiệm vụ') || str.includes('chức vụ')) sheetScore += 2;
        if (str.includes('đơn vị') || str.includes('chuyên môn')) sheetScore += 1;
      });
    }
    if (sheetScore > maxScore) {
      maxScore = sheetScore;
      bestSheet = sheet;
    }
  }

  const ws = bestSheet;

  // 2. Tìm dòng header và xác định các cột chính xác
  let headerRowIndex = -1;
  let isTwoRowHeader = false;

  let colCode = -1;
  let colFullName = -1;
  let colLastName = -1;
  let colFirstName = -1;
  let colUnit = -1;
  let colSubject = -1;
  let colRole = -1;
  let colQuota = -1;
  let colPhone = -1;
  let colNote = -1;
  let quotaHeaderName = '';

  const maxScanRows = Math.min(ws.rowCount, 25);
  let bestHeaderScore = 0;

  for (let r = 1; r <= maxScanRows; r++) {
    const row = ws.getRow(r);
    const nextRow = r < ws.rowCount ? ws.getRow(r + 1) : null;

    let tempCode = -1;
    let tempFullName = -1;
    let tempLastName = -1;
    let tempFirstName = -1;
    let tempUnit = -1;
    let tempSubject = -1;
    let tempRole = -1;
    let tempQuota = -1;
    let tempPhone = -1;
    let tempNote = -1;
    let tempQuotaName = '';

    const maxCol = Math.max(row.cellCount || 0, 15);

    for (let c = 1; c <= maxCol; c++) {
      const val1 = getCellValueAsString(row.getCell(c)).toLowerCase();
      const val2 = nextRow ? getCellValueAsString(nextRow.getCell(c)).toLowerCase() : '';
      const combined = `${val1} ${val2}`.trim();

      // Kiểm tra Mã GV / Mã Cán bộ
      if (
        combined.includes('mã gv') ||
        combined.includes('mã cb') ||
        combined.includes('mã cbgv') ||
        combined.includes('mã giáo viên') ||
        combined.includes('mã cán bộ') ||
        combined.includes('mã định danh') ||
        val1 === 'mã' ||
        val1 === 'mã số'
      ) {
        if (!combined.includes('mã môn') && !combined.includes('mã trường') && !combined.includes('mã phòng')) {
          tempCode = c;
        }
      }

      // Họ và tên (gộp chung)
      if (
        combined.includes('họ và tên') ||
        combined.includes('họ tên') ||
        combined.includes('họ & tên') ||
        combined.includes('họ và tên gv') ||
        combined.includes('họ và tên giáo viên')
      ) {
        tempFullName = c;
      }

      // Họ và tên đệm (khi tách cột)
      if (
        combined.includes('họ và tên đệm') ||
        combined.includes('họ và chữ lót') ||
        combined.includes('họ và đệm') ||
        combined.includes('họ & đệm') ||
        combined.includes('họ lót') ||
        combined.includes('họ đệm') ||
        val1 === 'họ' ||
        val1 === 'họ đệm'
      ) {
        tempLastName = c;
      }

      // Tên (khi tách cột)
      const isFirstNameStrict =
        val1 === 'tên' ||
        val1 === 'tên gv' ||
        val1 === 'tên cb' ||
        val1 === 'tên giáo viên' ||
        val2 === 'tên' ||
        val2 === 'tên gv';
      const isNotOtherName =
        !combined.includes('họ và tên') &&
        !combined.includes('tên trường') &&
        !combined.includes('tên đơn vị') &&
        !combined.includes('tên tổ') &&
        !combined.includes('tên môn') &&
        !combined.includes('tên lớp') &&
        !combined.includes('tên bài thi') &&
        !combined.includes('tên kỳ thi') &&
        !combined.includes('tên buổi');

      if (isFirstNameStrict && isNotOtherName) {
        tempFirstName = c;
      }

      // Đơn vị / Trường / Tổ chuyên môn
      if (
        combined.includes('đơn vị') ||
        combined.includes('trường') ||
        combined.includes('tổ chuyên môn') ||
        combined.includes('tổ cm') ||
        combined.includes('đơn vị công tác') ||
        combined.includes('bộ phận') ||
        val1 === 'tổ' ||
        val1 === 'tổ bộ môn'
      ) {
        tempUnit = c;
      }

      // Môn giảng dạy / Chuyên môn
      if (
        combined.includes('môn giảng dạy') ||
        combined.includes('môn dạy') ||
        combined.includes('chuyên môn') ||
        combined.includes('môn thi') ||
        val1 === 'môn' ||
        val1 === 'môn học'
      ) {
        if (!combined.includes('tổ chuyên môn') && !combined.includes('nhóm chuyên môn')) {
          tempSubject = c;
        }
      }

      // Ghi chú
      if (
        combined.includes('ghi chú') ||
        combined.includes('nội dung') ||
        combined.includes('lưu ý') ||
        combined.includes('note')
      ) {
        tempNote = c;
      }

      // Nhiệm vụ Hội đồng / Chức danh / Vai trò
      // QUAN TRỌNG: Không nhận nhầm cột 'Ghi chú phân công' hoặc cột ghi chú sang Nhiệm vụ/Chức vụ!
      const isNoteColumn = combined.includes('ghi chú') || combined.includes('lưu ý') || combined.includes('note');
      if (!isNoteColumn) {
        if (
          combined.includes('nhiệm vụ') ||
          combined.includes('vai trò') ||
          combined.includes('chức vụ') ||
          combined.includes('chức danh') ||
          combined.includes('hội đồng thi') ||
          combined.includes('hđ thi') ||
          combined.includes('vị trí') ||
          (combined.includes('phân công') && !combined.includes('ghi chú'))
        ) {
          tempRole = c;
        }
      }

      // Số ca giảm trừ / Định mức
      if (
        combined.includes('giảm trừ') ||
        combined.includes('định mức') ||
        combined.includes('ca giảm') ||
        combined.includes('số ca giảm') ||
        combined.includes('miễn giảm') ||
        combined.includes('số ca trừ') ||
        combined.includes('ca bớt') ||
        combined.includes('định mức coi')
      ) {
        tempQuota = c;
        tempQuotaName = combined;
      }

      // Điện thoại
      if (
        combined.includes('điện thoại') ||
        combined.includes('sđt') ||
        combined.includes('phone') ||
        combined.includes('di động') ||
        combined.includes('dđ') ||
        combined.includes('liên hệ')
      ) {
        tempPhone = c;
      }
    }

    // Tính điểm tin cậy cho dòng header này
    let currentScore = 0;
    if (tempFullName > 0 || (tempLastName > 0 && tempFirstName > 0)) currentScore += 5;
    if (tempRole > 0) currentScore += 3;
    if (tempCode > 0) currentScore += 2;
    if (tempUnit > 0) currentScore += 2;
    if (tempSubject > 0) currentScore += 2;
    if (tempQuota > 0) currentScore += 2;

    if (currentScore > bestHeaderScore && currentScore >= 4) {
      bestHeaderScore = currentScore;
      headerRowIndex = r;
      colCode = tempCode;
      colFullName = tempFullName;
      colLastName = tempLastName;
      colFirstName = tempFirstName;
      colUnit = tempUnit;
      colSubject = tempSubject;
      colRole = tempRole;
      colQuota = tempQuota;
      colPhone = tempPhone;
      colNote = tempNote;
      quotaHeaderName = tempQuotaName;

      // Kiểm tra xem dòng tiếp theo có phải là dòng header phụ không
      isTwoRowHeader = false;
      if (nextRow) {
        const sampleCol = tempFirstName > 0 ? tempFirstName : (tempFullName > 0 ? tempFullName : 2);
        const sampleText = getCellValueAsString(safeGetCell(nextRow, sampleCol)).toLowerCase();
        if (sampleText.includes('tên') || sampleText.includes('họ') || sampleText.includes('1') === false) {
          // Dòng r+1 có thể chứa chữ tên
          if (tempLastName > 0 && tempFirstName > 0) {
            const firstNameCell = safeGetCell(nextRow, tempFirstName);
            if (getCellValueAsString(firstNameCell).toLowerCase() === 'tên') {
              isTwoRowHeader = true;
            }
          }
        }
      }
    }
  }

  // Nếu không tìm thấy header bằng tự động phân tích, áp dụng cấu trúc mặc định theo Template chuẩn
  if (headerRowIndex === -1) {
    headerRowIndex = 4;
    colCode = 2;
    colFullName = 3;
    colUnit = 4;
    colSubject = 5;
    colRole = 6;
    colQuota = 7;
    colPhone = 8;
    colNote = 9;
  }

  const dataStartRow = headerRowIndex + (isTwoRowHeader ? 2 : 1);
  const invigilators: Invigilator[] = [];
  const rolesSummary: Record<string, number> = {};
  const warnings: string[] = [];
  let exemptCount = 0;
  let reductionCount = 0;

  for (let r = dataStartRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    // 1. Trích xuất Họ và tên (Xử lý cả dạng gộp và dạng tách 2 cột)
    let fullName = '';
    if (colLastName > 0 && colFirstName > 0) {
      const lName = getCellValueAsString(safeGetCell(row, colLastName));
      const fName = getCellValueAsString(safeGetCell(row, colFirstName));
      fullName = `${lName} ${fName}`.trim();
    } else if (colFullName > 0) {
      fullName = getCellValueAsString(safeGetCell(row, colFullName)).trim();
    } else if (colLastName > 0) {
      fullName = getCellValueAsString(safeGetCell(row, colLastName)).trim();
    } else if (colFirstName > 0) {
      fullName = getCellValueAsString(safeGetCell(row, colFirstName)).trim();
    }

    if (!fullName) continue;

    // Lọc bỏ các dòng tiêu đề lặp lại, dòng tổng kết hoặc dòng chữ ký chân trang
    const lowerName = fullName.toLowerCase();
    if (
      lowerName.includes('họ và tên') ||
      lowerName.includes('họ tên') ||
      lowerName.includes('tổng cộng') ||
      lowerName.includes('tổng số') ||
      lowerName.includes('người lập') ||
      lowerName.includes('hiệu trưởng') ||
      lowerName.includes('chủ tịch hội đồng') ||
      lowerName.includes('ngày ...') ||
      lowerName.includes('tháng ...') ||
      lowerName.includes('năm ...') ||
      lowerName.startsWith('stt') ||
      lowerName.startsWith('mã gv') ||
      fullName.length < 2
    ) {
      continue;
    }

    // Bỏ qua nếu dòng này toàn là số hoặc ký tự đặc biệt
    if (/^[\d\s.,;:\-_/\\]+$/.test(fullName)) {
      continue;
    }

    // Chuẩn hóa viết hoa chữ cái đầu cho tên
    fullName = standardizeVietnameseName(fullName);

    // 2. Mã cán bộ
    let code = colCode > 0 ? getCellValueAsString(safeGetCell(row, colCode)).trim() : '';
    if (!code) {
      code = `GV${String(invigilators.length + 1).padStart(2, '0')}`;
    }

    // 3. Đơn vị / Trường / Tổ chuyên môn
    let schoolOrDept = colUnit > 0 ? getCellValueAsString(safeGetCell(row, colUnit)).trim() : '';
    if (!schoolOrDept) {
      schoolOrDept = 'THPT Nguyễn Huệ';
    }

    // 4. Môn giảng dạy
    const rawSubject = colSubject > 0 ? getCellValueAsString(safeGetCell(row, colSubject)).trim() : '';
    const subject = standardizeSubjectName(rawSubject, schoolOrDept);

    // 5. Nhiệm vụ trong Hội đồng coi thi
    const rawRole = colRole > 0 ? getCellValueAsString(safeGetCell(row, colRole)).trim() : '';
    const rawNote = colNote > 0 ? getCellValueAsString(safeGetCell(row, colNote)).trim() : '';
    const rawQuotaStr = colQuota > 0 ? getCellValueAsString(safeGetCell(row, colQuota)).trim() : '';

    let role: InvigilatorRole = 'Giám thị';
    const roleLower = rawRole.toLowerCase();
    const noteLower = rawNote.toLowerCase();

    // NGUYÊN TẮC BẤT DI BẤT DỊCH: Ưu tiên nhận diện rõ ràng Giám thị coi thi trước
    if (
      roleLower.includes('giám thị') ||
      roleLower.includes('coi thi') ||
      roleLower.includes('cbct') ||
      roleLower.includes('gvc') ||
      roleLower.includes('giáo viên coi') ||
      roleLower.includes('cb coi thi') ||
      roleLower.includes('cán bộ coi thi')
    ) {
      role = 'Giám thị';
    } else if (
      roleLower.includes('phó chủ tịch') ||
      roleLower.includes('p.chủ tịch') ||
      roleLower.includes('p. chủ tịch') ||
      roleLower.includes('phó trưởng điểm') ||
      roleLower.includes('phó ban') ||
      roleLower.includes('pht') ||
      roleLower.includes('phó hiệu trưởng') ||
      roleLower.includes('pct')
    ) {
      role = 'Phó Chủ tịch';
    } else if (
      (roleLower.includes('chủ tịch') ||
        roleLower.includes('trưởng điểm') ||
        roleLower.includes('hiệu trưởng') ||
        roleLower.includes('ht') ||
        roleLower.includes('trưởng ban')) &&
      !roleLower.includes('phó')
    ) {
      role = 'Chủ tịch';
    } else if (
      roleLower.includes('thư ký') ||
      roleLower.includes('thu ky') ||
      roleLower.includes('thư kí') ||
      roleLower.includes('tk') ||
      roleLower.includes('thư ký hđ')
    ) {
      role = 'Thư ký';
    } else if (
      roleLower.includes('giám sát') ||
      roleLower.includes('cbgs') ||
      roleLower.includes('hành lang') ||
      roleLower.includes('thanh tra') ||
      roleLower.includes('ban giám sát')
    ) {
      role = 'Giám sát';
    } else if (
      roleLower.includes('khảo thí') ||
      roleLower.includes('khao thi') ||
      roleLower.includes('hỗ trợ') ||
      roleLower.includes('ho tro') ||
      roleLower.includes('trực đề') ||
      roleLower.includes('in sao') ||
      roleLower.includes('kỹ thuật') ||
      roleLower.includes('cntt') ||
      roleLower.includes('máy tính') ||
      roleLower.includes('thiết bị')
    ) {
      role = 'Khảo thí - Hỗ trợ';
    } else if (
      roleLower.includes('y tế') ||
      roleLower.includes('y te') ||
      roleLower.includes('bác sĩ') ||
      roleLower.includes('sơ cấp cứu')
    ) {
      role = 'Y tế';
    } else if (
      roleLower.includes('bảo vệ') ||
      roleLower.includes('bao ve') ||
      roleLower.includes('công an') ||
      roleLower.includes('an ninh') ||
      roleLower.includes('bv')
    ) {
      role = 'Bảo vệ';
    } else if (
      roleLower.includes('phục vụ') ||
      roleLower.includes('phuc vu') ||
      roleLower.includes('lao công') ||
      roleLower.includes('tạp vụ') ||
      roleLower.includes('hậu cần') ||
      roleLower.includes('pv')
    ) {
      role = 'Phục vụ';
    } else {
      // Mặc định cho mọi giáo viên, ủy viên, thành viên là Giám thị coi thi
      role = 'Giám thị';
    }

    // Bổ sung nhận diện dự phòng theo Mã cán bộ hoặc Ghi chú nếu role vẫn là 'Giám thị'
    const codeUpper = (code || '').toUpperCase();
    if (role === 'Giám thị') {
      if (codeUpper.startsWith('BGH01') || noteLower.includes('hiệu trưởng') || noteLower.includes('chủ tịch')) {
        role = 'Chủ tịch';
      } else if (codeUpper.startsWith('BGH') || noteLower.includes('phó hiệu trưởng') || noteLower.includes('phó chủ tịch')) {
        role = 'Phó Chủ tịch';
      } else if (codeUpper.startsWith('TK') || noteLower.includes('thư ký') || noteLower.includes('thu ky')) {
        role = 'Thư ký';
      } else if (codeUpper.startsWith('GS') || noteLower.includes('giám sát')) {
        role = 'Giám sát';
      } else if (codeUpper.startsWith('KT') || noteLower.includes('khảo thí') || noteLower.includes('trực đề')) {
        role = 'Khảo thí - Hỗ trợ';
      } else if (codeUpper.startsWith('YT') || noteLower.includes('y tế')) {
        role = 'Y tế';
      } else if (codeUpper.startsWith('BV') || noteLower.includes('bảo vệ')) {
        role = 'Bảo vệ';
      } else if (codeUpper.startsWith('PV') || noteLower.includes('phục vụ')) {
        role = 'Phục vụ';
      }
    }

    // 6. Xử lý Định mức & Số ca giảm trừ (Tránh đảo chiều số ca giảm trừ)
    let quotaOffset = 0;
    const isExemptRole =
      role === 'Chủ tịch' ||
      role === 'Phó Chủ tịch' ||
      role === 'Thư ký' ||
      role === 'Giám sát' ||
      role === 'Khảo thí - Hỗ trợ' ||
      role === 'Y tế' ||
      role === 'Bảo vệ' ||
      role === 'Phục vụ';

    if (isExemptRole) {
      quotaOffset = -99;
      exemptCount++;
    } else {
      const combinedQuotaStr = `${rawQuotaStr} ${rawNote}`.toLowerCase();

      // Kiểm tra miễn coi thi hoàn toàn
      if (
        combinedQuotaStr.includes('miễn') ||
        combinedQuotaStr.includes('không coi') ||
        combinedQuotaStr.includes('thai sản') ||
        combinedQuotaStr.includes('nghỉ đẻ') ||
        combinedQuotaStr.includes('ốm') ||
        combinedQuotaStr.includes('bgh') ||
        combinedQuotaStr.includes('con nhỏ') ||
        combinedQuotaStr.includes('miễn coi')
      ) {
        quotaOffset = -99;
        exemptCount++;
      } else if (rawQuotaStr) {
        // Có nhập dữ liệu ở cột Giảm trừ
        const cleanVal = rawQuotaStr.toLowerCase();
        const numberMatches = cleanVal.match(/[-+]?\d+(\.\d+)?/);

        if (numberMatches) {
          const parsed = Number(numberMatches[0]);
          if (!isNaN(parsed)) {
            // Nếu có dấu âm rõ ràng: -1, -2
            if (cleanVal.includes('-')) {
              quotaOffset = -Math.abs(parsed);
            }
            // Nếu có từ ngữ giảm / bớt / trừ / chấm thi hoặc tiêu đề cột là "giảm"
            else if (
              cleanVal.includes('giảm') ||
              cleanVal.includes('bớt') ||
              cleanVal.includes('trừ') ||
              cleanVal.includes('chấm') ||
              quotaHeaderName.includes('giảm') ||
              quotaHeaderName.includes('trừ') ||
              quotaHeaderName.includes('bớt')
            ) {
              quotaOffset = -Math.abs(parsed);
            }
            // Nếu có từ ngữ tăng / cộng / nhận thêm
            else if (cleanVal.includes('tăng') || cleanVal.includes('cộng') || cleanVal.includes('thêm')) {
              quotaOffset = Math.abs(parsed);
            }
            // Nếu người dùng nhập số nguyên âm hoặc dương
            else {
              quotaOffset = parsed;
            }
          }
        }
      }

      // Nếu ô số ca giảm trừ để trống nhưng ở cột ghi chú có ghi chấm bài thi tự luận
      if (quotaOffset === 0) {
        if (noteLower.includes('chấm văn') || noteLower.includes('chấm tự luận văn') || noteLower.includes('chấm thi văn') || noteLower.includes('giảm 2')) {
          quotaOffset = -2;
        } else if (noteLower.includes('chấm toán') || noteLower.includes('chấm tự luận toán') || noteLower.includes('giảm 1')) {
          quotaOffset = -1;
        } else if (noteLower.includes('chấm thi') || noteLower.includes('chấm bài')) {
          quotaOffset = -1;
        }
      }

      if (quotaOffset < 0 && quotaOffset > -50) {
        reductionCount++;
      }
    }

    // 7. Số điện thoại
    const rawPhone = colPhone > 0 ? getCellValueAsString(safeGetCell(row, colPhone)) : '';
    const phone = standardizePhoneNumber(rawPhone);

    // 8. Ghi chú
    const note = rawNote;

    rolesSummary[role] = (rolesSummary[role] || 0) + 1;

    invigilators.push({
      id: 'gv_' + Date.now() + '_' + r + '_' + Math.random().toString(36).substr(2, 6),
      code,
      fullName,
      schoolOrDept,
      subject,
      role,
      quotaOffset,
      phone,
      note,
      isAvailable: true
    });
  }

  // Kiểm tra cảnh báo nếu không có Giám thị nào
  const examInvCount = invigilators.filter(i => (i.role || 'Giám thị') === 'Giám thị').length;
  if (examInvCount === 0 && invigilators.length > 0) {
    warnings.push('Chưa có cán bộ nào giữ vai trò "Giám thị" coi thi trực tiếp. Vui lòng kiểm tra lại cột Nhiệm vụ.');
  }

  return {
    invigilators,
    totalImported: invigilators.length,
    rolesSummary,
    exemptCount,
    reductionCount,
    warnings
  };
}

/**
 * Hàm hỗ trợ tính toán thời gian từ giờ bắt đầu và số phút
 */
function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const match = timeStr.match(/(\d{1,2})[:hH](\d{1,2})/);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  let mins = parseInt(match[2], 10);
  const totalMins = hours * 60 + mins + minutesToAdd;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}h${String(newMins).padStart(2, '0')}`;
}

/**
 * Tải File Excel Mẫu Kế Hoạch & Lịch Thi (Buổi, Ngày, Môn, Thời gian, Thời gian nghỉ)
 */
export async function downloadExamSessionTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ Thống Phân Công Giám Thị THPT';
  wb.created = new Date();

  const ws = wb.addWorksheet('Lich_Thi');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Tiêu đề
  ws.mergeCells('A1:I1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'KẾ HOẠCH & LỊCH THI CÁC BUỔI / CA THI';
  titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:K2');
  const noteCell = ws.getCell('A2');
  noteCell.value = '* Hướng dẫn: Nếu một buổi thi nhiều môn (VD: Toán + Tiếng Anh hoặc KHTN 3 môn), hãy ghi cùng "Tên buổi thi". Hệ thống sẽ tự động ghép môn và tự tính toán thời gian làm bài + thời gian nghỉ chuyển môn!';
  noteCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } };
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Header các cột
  const headers = [
    'STT',
    'Tên buổi thi',
    'Ngày thi',
    'Môn thi',
    'Giờ bắt đầu',
    'Thời gian làm bài (phút)',
    'Nghỉ giữa môn (phút)',
    'Số phòng thi',
    'Số Giám sát',
    'Số Dự phòng',
    'Ghi chú tổ chức'
  ];

  const headerRow = ws.getRow(4);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 26;

  // Dữ liệu mẫu (mô tả cả trường hợp 1 môn/buổi, 2 môn/buổi, 3 môn/buổi)
  const sampleRows = [
    [1, 'Buổi 1 (Sáng Ngày 1)', '2025-06-25', 'Ngữ văn', '07:30', 120, 0, 24, 6, 2, 'Thi tự luận 120 phút'],
    [2, 'Buổi 2 (Sáng Ngày 2)', '2025-06-26', 'Toán', '07:30', 90, 25, 24, 6, 2, 'Môn 1 trong buổi - nghỉ 25 phút chuyển môn'],
    [3, 'Buổi 2 (Sáng Ngày 2)', '2025-06-26', 'Tiếng Anh', '09:25', 60, 0, 24, 6, 2, 'Môn 2 trong buổi - Giám thị giữ nguyên phòng'],
    [4, 'Buổi 3 (Sáng Ngày 3)', '2025-06-27', 'Vật lí', '07:30', 50, 15, 24, 6, 2, 'Tổ hợp KHTN - Môn 1'],
    [5, 'Buổi 3 (Sáng Ngày 3)', '2025-06-27', 'Hóa học', '08:35', 50, 15, 24, 6, 2, 'Tổ hợp KHTN - Môn 2'],
    [6, 'Buổi 3 (Sáng Ngày 3)', '2025-06-27', 'Sinh học', '09:40', 50, 0, 24, 6, 2, 'Tổ hợp KHTN - Môn 3']
  ];

  sampleRows.forEach((vals, rIdx) => {
    const row = ws.getRow(5 + rIdx);
    row.height = 22;
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (cIdx === 0 || cIdx === 2 || cIdx === 4 || cIdx === 5 || cIdx === 6 || cIdx === 7 || cIdx === 8 || cIdx === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      }
    });
  });

  // Điều chỉnh độ rộng cột
  ws.columns = [
    { width: 7 },   // STT
    { width: 26 },  // Tên buổi
    { width: 14 },  // Ngày thi
    { width: 16 },  // Môn thi
    { width: 14 },  // Giờ bắt đầu
    { width: 22 },  // Thời gian làm bài
    { width: 20 },  // Nghỉ giữa môn
    { width: 14 },  // Số phòng
    { width: 15 },  // Số giám sát
    { width: 15 },  // Số dự phòng
    { width: 30 },  // Ghi chú
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mau_Ke_Hoach_Lich_Thi_Cac_Buoi_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Đọc file Excel Lịch thi và chuyển đổi thành danh sách ExamSession hoàn chỉnh
 */
export async function importExamSessionsFromExcel(file: File): Promise<{
  sessions: ExamSession[];
  totalImported: number;
}> {
  const wb = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await wb.xlsx.load(arrayBuffer);

  const ws = wb.worksheets[0];
  if (!ws) {
    throw new Error('File Excel không có trang tính dữ liệu (Sheet trống).');
  }

  // Tự động tìm dòng tiêu đề cột
  let headerRowIndex = 4;
  let colSession = 2;
  let colDate = 3;
  let colSubject = 4;
  let colStart = 5;
  let colDuration = 6;
  let colBreak = 7;
  let colRooms = 8;
  let colSupervisors = 0;
  let colReserves = 0;
  let colStartRoom = 0;

  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const row = ws.getRow(r);
    let matchedCount = 0;
    row.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').toLowerCase();
      if (val.includes('buổi') || val.includes('ca thi') || val.includes('tên buổi')) { colSession = colNumber; matchedCount++; }
      if (val.includes('ngày') || val.includes('date')) { colDate = colNumber; matchedCount++; }
      if (val.includes('môn') || val.includes('subject')) { colSubject = colNumber; matchedCount++; }
      if (val.includes('bắt đầu') || val.includes('giờ') || val.includes('start')) { colStart = colNumber; matchedCount++; }
      if (val.includes('làm bài') || val.includes('thời gian') || val.includes('phút')) { colDuration = colNumber; matchedCount++; }
      if (val.includes('nghỉ') || val.includes('chuyển môn')) { colBreak = colNumber; matchedCount++; }
      if (val.includes('giám sát') || val.includes('supervisor')) { colSupervisors = colNumber; }
      else if (val.includes('dự phòng') || val.includes('reserve')) { colReserves = colNumber; }
      else if (val.includes('phòng bắt đầu') || val.includes('phòng đầu') || val.includes('từ phòng') || val.includes('start room')) { colStartRoom = colNumber; }
      else if (val.includes('phòng') || val.includes('room')) { colRooms = colNumber; matchedCount++; }
    });
    if (matchedCount >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  // Cấu trúc nhóm các môn theo Tên Buổi thi
  interface RawSessionEntry {
    sessionName: string;
    date: string;
    subject: string;
    startTime: string;
    duration: number;
    breakTime: number;
    numRooms: number;
    numSupervisors?: number;
    numReserves?: number;
    startRoomNumber: number;
  }

  const rawEntries: RawSessionEntry[] = [];

  for (let r = headerRowIndex + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawSessionName = colSession > 0 ? safeGetCell(row, colSession)?.value : null;
    const rawSubject = colSubject > 0 ? safeGetCell(row, colSubject)?.value : null;
    if (!rawSessionName && !rawSubject) continue;

    const sessionName = String(rawSessionName || '').trim();
    const subject = String(rawSubject || '').trim();
    if (!sessionName && !subject) continue;
    if (sessionName.toLowerCase().includes('tên buổi') || subject.toLowerCase().includes('môn thi')) continue;

    // Xử lý ngày
    let dateStr = '';
    if (colDate > 0) {
      const dateCellVal = safeGetCell(row, colDate)?.value;
      if (dateCellVal instanceof Date) {
        dateStr = dateCellVal.toISOString().slice(0, 10);
      } else if (dateCellVal) {
        const rawStr = String(dateCellVal).trim();
        // nếu định dạng dd/mm/yyyy
        const parts = rawStr.split(/[/-]/);
        if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          dateStr = rawStr;
        }
      }
    }
    if (!dateStr) {
      dateStr = new Date().toISOString().slice(0, 10);
    }

    // Giờ bắt đầu
    let startTime = '07:30';
    if (colStart > 0) {
      const sVal = safeGetCell(row, colStart)?.value;
      if (sVal instanceof Date) {
        startTime = `${String(sVal.getHours()).padStart(2, '0')}:${String(sVal.getMinutes()).padStart(2, '0')}`;
      } else if (sVal) {
        startTime = String(sVal).trim();
      }
    }

    // Thời gian làm bài (phút)
    let duration = 90;
    if (colDuration > 0) {
      const dCell = safeGetCell(row, colDuration);
      if (dCell && dCell.value !== null && dCell.value !== undefined) {
        const durNum = Number(String(dCell.value).replace(/[^0-9]/g, ''));
        if (!isNaN(durNum) && durNum > 0) duration = durNum;
      }
    }

    // Thời gian nghỉ giữa môn (phút)
    let breakTime = 0;
    if (colBreak > 0) {
      const bCell = safeGetCell(row, colBreak);
      if (bCell && bCell.value !== null && bCell.value !== undefined) {
        const brkNum = Number(String(bCell.value).replace(/[^0-9]/g, ''));
        if (!isNaN(brkNum) && brkNum >= 0) breakTime = brkNum;
      }
    }

    // Số phòng thi
    let numRooms = 24;
    if (colRooms > 0) {
      const rCell = safeGetCell(row, colRooms);
      if (rCell && rCell.value !== null && rCell.value !== undefined) {
        const roomNum = Number(String(rCell.value).replace(/[^0-9]/g, ''));
        if (!isNaN(roomNum) && roomNum > 0) numRooms = roomNum;
      }
    }

    // Số Giám sát
    let numSupervisors = Math.max(1, Math.ceil(numRooms / 4));
    if (colSupervisors > 0) {
      const supCell = safeGetCell(row, colSupervisors);
      if (supCell && supCell.value !== null && supCell.value !== undefined) {
        const supNum = Number(String(supCell.value).replace(/[^0-9]/g, ''));
        if (!isNaN(supNum) && supNum >= 0) numSupervisors = supNum;
      }
    }

    // Số Dự phòng
    let numReserves = 2;
    if (colReserves > 0) {
      const resCell = safeGetCell(row, colReserves);
      if (resCell && resCell.value !== null && resCell.value !== undefined) {
        const resNum = Number(String(resCell.value).replace(/[^0-9]/g, ''));
        if (!isNaN(resNum) && resNum >= 0) numReserves = resNum;
      }
    }

    // Phòng bắt đầu
    let startRoomNumber = 1;
    if (colStartRoom > 0) {
      const srCell = safeGetCell(row, colStartRoom);
      if (srCell && srCell.value !== null && srCell.value !== undefined) {
        const sRoomNum = Number(String(srCell.value).replace(/[^0-9]/g, ''));
        if (!isNaN(sRoomNum) && sRoomNum > 0) startRoomNumber = sRoomNum;
      }
    }

    rawEntries.push({
      sessionName: sessionName || `Buổi thi ${rawEntries.length + 1}`,
      date: dateStr,
      subject: subject || 'Chưa đặt tên',
      startTime,
      duration,
      breakTime,
      numRooms,
      numSupervisors,
      numReserves,
      startRoomNumber
    });
  }

  // Nhóm các môn theo Tên Buổi thi liên tiếp
  const groupedSessions: ExamSession[] = [];
  let currentGroup: RawSessionEntry[] = [];
  let currentSessionKey = '';

  const processCurrentGroup = (group: RawSessionEntry[]) => {
    if (group.length === 0) return;
    const first = group[0];
    const sessionName = first.sessionName;
    const date = first.date;
    const numRooms = Math.max(...group.map(g => g.numRooms));
    const numSupervisors = first.numSupervisors ?? Math.max(1, Math.ceil(numRooms / 4));
    const numReserves = first.numReserves ?? 2;
    const startRoomNumber = first.startRoomNumber || 1;

    // Tổng hợp môn thi
    const subjectNames = group.map(g => g.subject).filter(Boolean);
    const combinedSubject = subjectNames.join(' + ');

    // Tính toán thời gian bắt đầu, thời gian kết thúc và mô tả
    const initialStart = first.startTime.replace(':', 'h');
    let currentTime = first.startTime;
    const partsTimeline: string[] = [];

    group.forEach((item, idx) => {
      const endM = addMinutesToTimeString(currentTime, item.duration);
      partsTimeline.push(`${item.subject} ${item.duration}p`);
      if (item.breakTime > 0 && idx < group.length - 1) {
        partsTimeline.push(`nghỉ ${item.breakTime}p`);
        currentTime = addMinutesToTimeString(endM, item.breakTime).replace('h', ':');
      } else {
        currentTime = endM.replace('h', ':');
      }
    });

    const finalEnd = currentTime.replace(':', 'h');
    let shiftTime = '';
    if (group.length === 1) {
      shiftTime = `${initialStart} - ${finalEnd}`;
    } else {
      shiftTime = `${initialStart} - ${finalEnd} (${partsTimeline.join(', ')})`;
    }

    groupedSessions.push({
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      sessionName,
      subjectName: combinedSubject,
      date,
      shiftTime,
      numRooms,
      numSupervisors,
      numReserves,
      startRoomNumber
    });
  };

  rawEntries.forEach(entry => {
    if (entry.sessionName !== currentSessionKey) {
      if (currentGroup.length > 0) {
        processCurrentGroup(currentGroup);
      }
      currentGroup = [entry];
      currentSessionKey = entry.sessionName;
    } else {
      currentGroup.push(entry);
    }
  });

  if (currentGroup.length > 0) {
    processCurrentGroup(currentGroup);
  }

  return {
    sessions: groupedSessions,
    totalImported: groupedSessions.length
  };
}

