import ExcelJS from 'exceljs';
import { InvigilatorPlanResult, ExamSession, Invigilator } from '../types/invigilator';
import { cleanSubjectName, formatSessionShortLabel } from './invigilatorAlgorithm';
import { buildGeneralAnnouncementData } from './generalAnnouncementHelper';

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

/**
 * Xuất toàn bộ kế hoạch phân công giám thị ra file Excel đầy đủ 4 Sheets:
 * - Sheet 1: Lịch_Tổng_Quát_Bảo_Mật (Đầy đủ ma trận phân công, nhóm màu, bảo mật số phòng)
 * - Sheet 2: Lịch_Phân_Công_Từng_Phòng (Kèm Bảng Giám sát & Bảng Giám thị dự phòng theo từng buổi)
 * - Sheet 3: Hội_Đồng_&_Giám_Sát (Dán cửa phòng Hội đồng: Ban Điều hành + Lịch thi cụ thể)
 * - Sheet 4: Thống_Kê_Chấm_Công (Tổng hợp số ca thực tế + Cột Ký nhận thanh toán chế độ)
 */
export async function exportInvigilatorPlanExcel(
  plan: InvigilatorPlanResult,
  sessions: ExamSession[],
  invigilators: Invigilator[] = [],
  schoolName: string = 'TRƯỜNG THPT',
  examName: string = 'KỲ THI KHẢO SÁT CHẤT LƯỢNG KẾT HỢP THI THỬ TỐT NGHIỆP THPT',
  academicYear: string = 'NĂM HỌC 2025 - 2026',
  customDutyOverrides?: Record<string, Record<string, boolean>>
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ Thống Xếp Phòng & Phân Công Giám Thị THPT';
  wb.created = new Date();

  const isSurveyMock = plan.mode === 'survey_mock';
  const isDual = isSurveyMock && (plan.invigilatorsPerRoom ?? (plan.sessions.some(s => s.roomAssignments.some(r => Boolean(r.invigilator2))) ? 2 : 1)) === 2;
  const modeTitle = isSurveyMock
    ? (isDual ? 'THI THỬ / KHẢO SÁT (2 GIÁM THỊ / PHÒNG)' : 'THI THỬ / KHẢO SÁT (1 GIÁM THỊ / PHÒNG)')
    : 'KIỂM TRA ĐỊNH KỲ (1 GIÁM THỊ / PHÒNG)';

  // =========================================================================
  // SHEET 1: LỊCH PHÂN CÔNG TỔNG QUÁT THEO BUỔI (BẢO MẬT PHÒNG THI)
  // =========================================================================
  appendGeneralAnnouncementSheet(wb, plan, sessions, invigilators, schoolName, examName, academicYear, customDutyOverrides);

  // =========================================================================
  // SHEET 2: LỊCH PHÂN CÔNG CHI TIẾT TỪNG PHÒNG THI (DÁN BẢNG THÔNG BÁO)
  // =========================================================================
  const ws1 = wb.addWorksheet('Lịch_Phân_Công_Từng_Phòng');
  ws1.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Dòng 1: Quốc hiệu - Tiêu ngữ & Trường
  ws1.mergeCells('A1:C1');
  ws1.getCell('A1').value = schoolName.toUpperCase();
  ws1.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('D1:G1');
  ws1.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws1.getCell('D1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws1.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng 2: Phụ đề đơn vị & Tiêu ngữ
  ws1.mergeCells('A2:C2');
  ws1.getCell('A2').value = 'HỘI ĐỒNG COI THI';
  ws1.getCell('A2').font = { name: 'Times New Roman', size: 10, bold: true };
  ws1.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('D2:G2');
  ws1.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws1.getCell('D2').font = { name: 'Times New Roman', size: 10, italic: true, underline: true };
  ws1.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng 4: Tiêu đề chính
  ws1.mergeCells('A4:G4');
  ws1.getCell('A4').value = `BẢNG PHÂN CÔNG GIÁM THỊ COI THI - ${modeTitle}`;
  ws1.getCell('A4').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws1.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(4).height = 25;

  // Dòng 5: Tên kỳ thi & Năm học
  ws1.mergeCells('A5:G5');
  ws1.getCell('A5').value = `${examName.toUpperCase()}   -   ${academicYear.toUpperCase()}`;
  ws1.getCell('A5').font = { name: 'Times New Roman', size: 11.5, bold: true, color: { argb: 'FFC00000' } };
  ws1.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(5).height = 20;

  ws1.mergeCells('A6:G6');
  ws1.getCell('A6').value = `(Ngày xuất biểu: ${new Date().toLocaleDateString('vi-VN')} - Niêm yết tại Bảng thông báo Hội đồng thi)`;
  ws1.getCell('A6').font = { name: 'Times New Roman', size: 10, italic: true };
  ws1.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

  let curRow = 8;

  // Lần lượt từng buổi thi
  plan.sessions.forEach((session, sIdx) => {
    // 1. BANNER BUỔI THI
    ws1.mergeCells(`A${curRow}:G${curRow}`);
    const sCell = ws1.getCell(`A${curRow}`);
    const cleanSubj = cleanSubjectName(session.subjectName);
    sCell.value = `${session.sessionName.toUpperCase()} - MÔN: ${cleanSubj.toUpperCase()}  |  NGÀY THI: ${session.date}  |  GIỜ THI: ${session.shiftTime}`;
    sCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    sCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws1.getRow(curRow).height = 24;
    curRow++;

    // 2. MỤC I: CÁN BỘ GIÁM SÁT HÀNH LANG PHÒNG THI
    const supervisors = session.supervisors || [];
    if (supervisors.length > 0) {
      ws1.mergeCells(`A${curRow}:G${curRow}`);
      const supHeaderCell = ws1.getCell(`A${curRow}`);
      supHeaderCell.value = `I. CÁN BỘ GIÁM SÁT HÀNH LANG PHÒNG THI (${supervisors.length} cán bộ)`;
      supHeaderCell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF6B21A8' } };
      supHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      supHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      ws1.getRow(curRow).height = 20;
      curRow++;

      // Table Header Giám sát
      const supTableHeader = ws1.getRow(curRow);
      supTableHeader.height = 22;
      const supHeaders = ['STT', 'Mã CB', 'Họ và tên Cán bộ Giám sát', 'Đơn vị / Tổ CM', 'Môn giảng dạy', 'Khu vực hành lang phụ trách', 'Ký nhận'];
      supHeaders.forEach((h, idx) => {
        const c = supTableHeader.getCell(idx + 1);
        c.value = h;
        c.font = { name: 'Times New Roman', size: 10, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      curRow++;

      // Table Rows Giám sát
      supervisors.forEach((sup, supIdx) => {
        const row = ws1.getRow(curRow);
        row.height = 20;
        row.getCell(1).value = supIdx + 1;
        row.getCell(2).value = sup.code;
        row.getCell(3).value = sup.fullName;
        row.getCell(4).value = sup.schoolOrDept;
        row.getCell(5).value = sup.subject;
        row.getCell(6).value = sup.note || `Giám sát hành lang Khu vực ${supIdx + 1}`;
        row.getCell(7).value = '';

        for (let c = 1; c <= 7; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          if (c === 1 || c === 2 || c === 7) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
          }
        }
        curRow++;
      });
      curRow++; // Cách 1 dòng
    }

    // 3. MỤC II: CÁN BỘ GIÁM THỊ DỰ PHÒNG TẠI HỘI ĐỒNG
    const reserves = session.reserveInvigilators || [];
    if (reserves.length > 0) {
      ws1.mergeCells(`A${curRow}:G${curRow}`);
      const resHeaderCell = ws1.getCell(`A${curRow}`);
      resHeaderCell.value = `II. CÁN BỘ GIÁM THỊ DỰ PHÒNG TẠI HỘI ĐỒNG THI (${reserves.length} cán bộ)`;
      resHeaderCell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0369A1' } };
      resHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      resHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      ws1.getRow(curRow).height = 20;
      curRow++;

      // Table Header Dự phòng
      const resTableHeader = ws1.getRow(curRow);
      resTableHeader.height = 22;
      const resHeaders = ['STT', 'Mã CB', 'Họ và tên Giám thị dự phòng', 'Đơn vị / Tổ CM', 'Môn giảng dạy', 'Số điện thoại liên hệ', 'Ký nhận'];
      resHeaders.forEach((h, idx) => {
        const c = resTableHeader.getCell(idx + 1);
        c.value = h;
        c.font = { name: 'Times New Roman', size: 10, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      curRow++;

      // Table Rows Dự phòng
      reserves.forEach((res, resIdx) => {
        const row = ws1.getRow(curRow);
        row.height = 20;
        row.getCell(1).value = resIdx + 1;
        row.getCell(2).value = res.code;
        row.getCell(3).value = res.fullName;
        row.getCell(4).value = res.schoolOrDept;
        row.getCell(5).value = res.subject;
        row.getCell(6).value = res.phone || '-';
        row.getCell(7).value = '';

        for (let c = 1; c <= 7; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          if (c === 1 || c === 2 || c === 7) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
          }
        }
        curRow++;
      });
      curRow++; // Cách 1 dòng
    }

    // 4. MỤC III: BẢNG PHÂN CÔNG GIÁM THỊ COI THI PHÒNG THI CHÍNH THỨC
    ws1.mergeCells(`A${curRow}:G${curRow}`);
    const roomSecHeader = ws1.getCell(`A${curRow}`);
    roomSecHeader.value = `III. PHÂN CÔNG GIÁM THỊ COI THI PHÒNG CHÍNH THỨC (${session.roomAssignments.length} phòng)`;
    roomSecHeader.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    roomSecHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    roomSecHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
    ws1.getRow(curRow).height = 20;
    curRow++;

    // Header bảng phòng
    const headerRow = ws1.getRow(curRow);
    const headers = isDual
      ? ['STT', 'Phòng thi', 'Giám thị 1 (Họ tên)', 'Đơn vị / Tổ', 'Giám thị 2 (Họ tên)', 'Đơn vị / Tổ', 'Ký nhận']
      : ['STT', 'Phòng thi', 'Giám thị coi thi (Họ tên)', 'Đơn vị / Tổ CM', 'Môn giảng dạy', 'Số điện thoại', 'Ký nhận'];

    headers.forEach((h, idx) => {
      const c = headerRow.getCell(idx + 1);
      c.value = h;
      c.font = { name: 'Times New Roman', size: 10, bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 24;
    curRow++;

    // Dữ liệu từng phòng
    session.roomAssignments.forEach((room, rIdx) => {
      const row = ws1.getRow(curRow);
      row.height = 20;

      if (isDual) {
        row.getCell(1).value = rIdx + 1;
        row.getCell(2).value = room.roomLabel;
        row.getCell(3).value = room.invigilator1?.fullName || '';
        row.getCell(4).value = room.invigilator1?.schoolOrDept || '';
        row.getCell(5).value = room.invigilator2?.fullName || '';
        row.getCell(6).value = room.invigilator2?.schoolOrDept || '';
        row.getCell(7).value = '';
      } else {
        row.getCell(1).value = rIdx + 1;
        row.getCell(2).value = room.roomLabel;
        row.getCell(3).value = room.invigilator1?.fullName || '';
        row.getCell(4).value = room.invigilator1?.schoolOrDept || '';
        row.getCell(5).value = room.invigilator1?.subject || '';
        row.getCell(6).value = room.invigilator1?.phone || '';
        row.getCell(7).value = '';
      }

      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (c === 1 || c === 2 || c === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
        }
      }
      curRow++;
    });

    // Cán bộ Lãnh đạo & Thư ký trực ca theo đúng buổi thi này
    const generalData = buildGeneralAnnouncementData(plan, sessions, invigilators, schoolName, examName, academicYear, customDutyOverrides);
    const shiftInfo = generalData.shifts.find(sh => sh.sessionIds.includes(session.sessionId));
    const shiftKey = shiftInfo?.shiftKey || '';
    const shiftSecs = generalData.rows.filter(r => r.groupType === 'leadership' && Boolean(r.shiftDuties[shiftKey]) && (r.role.includes('Thư ký') || r.code.startsWith('TK')));
    const shiftLdrs = generalData.rows.filter(r => r.groupType === 'leadership' && Boolean(r.shiftDuties[shiftKey]) && (r.role.includes('Chủ tịch') || r.role.includes('Phó Chủ tịch') || r.code.startsWith('BGH') || r.note.toLowerCase().includes('hiệu trưởng')));

    const sessionSecName = shiftSecs[0]?.fullName || invigilators.find(i => i.role === 'Thư ký')?.fullName || '';
    const sessionLdrName = shiftLdrs[0]?.fullName || invigilators.find(i => i.role === 'Chủ tịch' || i.role === 'Phó Chủ tịch')?.fullName || '';
    const sessionLdrRole = shiftLdrs[0]?.role || 'Lãnh đạo trực ca';

    curRow++;
    ws1.mergeCells(`A${curRow}:C${curRow}`);
    const secCell = ws1.getCell(`A${curRow}`);
    secCell.value = `THƯ KÝ TRỰC CA: ${sessionSecName || '(Ký và ghi rõ họ tên)'}`;
    secCell.font = { name: 'Times New Roman', size: 10, italic: true, bold: true, color: { argb: 'FF1E3A8A' } };
    secCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };

    ws1.mergeCells(`D${curRow}:G${curRow}`);
    const ldrCell = ws1.getCell(`D${curRow}`);
    ldrCell.value = `LÃNH ĐẠO TRỰC HỘI ĐỒNG (${sessionLdrRole.toUpperCase()}): ${sessionLdrName || '(Ký và đóng dấu)'}`;
    ldrCell.font = { name: 'Times New Roman', size: 10, italic: true, bold: true, color: { argb: 'FF1E3A8A' } };
    ldrCell.alignment = { horizontal: 'right', vertical: 'middle' };

    curRow += 2; // Cách dòng giữa các buổi
  });

  // Chữ ký cuối Sheet 2
  const president = invigilators.find(i => i.role === 'Chủ tịch') || invigilators.find(i => i.note?.toLowerCase().includes('hiệu trưởng'));
  const mainSec = invigilators.find(i => i.role === 'Thư ký');

  curRow += 1;
  ws1.mergeCells(`A${curRow}:C${curRow}`);
  ws1.getCell(`A${curRow}`).value = 'THƯ KÝ HỘI ĐỒNG THI';
  ws1.getCell(`A${curRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws1.getCell(`A${curRow}`).alignment = { horizontal: 'center' };

  ws1.mergeCells(`E${curRow}:G${curRow}`);
  ws1.getCell(`E${curRow}`).value = 'CHỦ TỊCH HỘI ĐỒNG THI';
  ws1.getCell(`E${curRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws1.getCell(`E${curRow}`).alignment = { horizontal: 'center' };

  curRow += 4;
  ws1.mergeCells(`A${curRow}:C${curRow}`);
  ws1.getCell(`A${curRow}`).value = mainSec?.fullName || '';
  ws1.getCell(`A${curRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws1.getCell(`A${curRow}`).alignment = { horizontal: 'center' };

  ws1.mergeCells(`E${curRow}:G${curRow}`);
  ws1.getCell(`E${curRow}`).value = president?.fullName || '';
  ws1.getCell(`E${curRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws1.getCell(`E${curRow}`).alignment = { horizontal: 'center' };

  ws1.columns = [
    { width: 8 },
    { width: 14 },
    { width: 28 },
    { width: 24 },
    { width: 28 },
    { width: 24 },
    { width: 16 }
  ];

  // =========================================================================
  // SHEET 3: DANH SÁCH ĐIỀU HÀNH HỘI ĐỒNG THI & LỊCH THI CÁC BUỔI (DÁN CỬA PHÒNG HỘI ĐỒNG)
  // =========================================================================
  const ws2 = wb.addWorksheet('Hội_Đồng_&_Giám_Sát');
  ws2.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Quốc hiệu - Tiêu ngữ & Trường
  ws2.mergeCells('A1:C1');
  ws2.getCell('A1').value = schoolName.toUpperCase();
  ws2.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws2.getCell('A1').alignment = { horizontal: 'center' };

  ws2.mergeCells('D1:F1');
  ws2.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws2.getCell('D1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws2.getCell('D1').alignment = { horizontal: 'center' };

  ws2.mergeCells('A2:C2');
  ws2.getCell('A2').value = 'HỘI ĐỒNG COI THI';
  ws2.getCell('A2').font = { name: 'Times New Roman', size: 10, bold: true };
  ws2.getCell('A2').alignment = { horizontal: 'center' };

  ws2.mergeCells('D2:F2');
  ws2.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws2.getCell('D2').font = { name: 'Times New Roman', size: 10, italic: true, underline: true };
  ws2.getCell('D2').alignment = { horizontal: 'center' };

  // Tiêu đề
  ws2.mergeCells('A4:F4');
  ws2.getCell('A4').value = `DANH SÁCH BAN ĐIỀU HÀNH, THƯ KÝ & GIÁM SÁT HỘI ĐỒNG COI THI`;
  ws2.getCell('A4').font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  ws2.getCell('A4').alignment = { horizontal: 'center' };
  ws2.getRow(4).height = 24;

  ws2.mergeCells('A5:F5');
  ws2.getCell('A5').value = `${examName.toUpperCase()}   -   ${academicYear.toUpperCase()}`;
  ws2.getCell('A5').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFC00000' } };
  ws2.getCell('A5').alignment = { horizontal: 'center' };

  ws2.mergeCells('A6:F6');
  ws2.getCell('A6').value = `(Niêm yết công khai tại Cửa phòng Hội đồng Điểm thi)`;
  ws2.getCell('A6').font = { name: 'Times New Roman', size: 10, italic: true };
  ws2.getCell('A6').alignment = { horizontal: 'center' };

  let rowIdxCouncil = 8;

  // PHẦN I: DANH SÁCH BAN ĐIỀU HÀNH & GIÁM SÁT
  ws2.mergeCells(`A${rowIdxCouncil}:F${rowIdxCouncil}`);
  ws2.getCell(`A${rowIdxCouncil}`).value = 'I. BAN LÃNH ĐẠO, THƯ KÝ VÀ CÁN BỘ HỘI ĐỒNG COI THI';
  ws2.getCell(`A${rowIdxCouncil}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
  ws2.getRow(rowIdxCouncil).height = 22;
  rowIdxCouncil++;

  const nonRoomInvs = invigilators.filter(i => i.role && i.role !== 'Giám thị');
  const councilList = nonRoomInvs.length > 0 ? nonRoomInvs : invigilators.filter(i => (i.quotaOffset ?? 0) <= -50);

  const cHeaderRow = ws2.getRow(rowIdxCouncil);
  const cHeaders = ['STT', 'Mã GV', 'Họ và tên', 'Nhiệm vụ trong Hội đồng', 'Đơn vị / Tổ CM', 'Ghi chú cụ thể'];
  cHeaders.forEach((h, idx) => {
    const c = cHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Times New Roman', size: 10, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  cHeaderRow.height = 24;
  rowIdxCouncil++;

  councilList.forEach((member, mIdx) => {
    const r = ws2.getRow(rowIdxCouncil);
    r.height = 22;
    r.getCell(1).value = mIdx + 1;
    r.getCell(2).value = member.code;
    r.getCell(3).value = member.fullName;
    r.getCell(4).value = member.role || 'Ủy viên';
    r.getCell(5).value = member.schoolOrDept;
    r.getCell(6).value = member.note || member.phone || '';

    for (let c = 1; c <= 6; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (c === 1 || c === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      }
    }
    rowIdxCouncil++;
  });

  rowIdxCouncil += 2;

  // PHẦN II: KẾ HOẠCH & LỊCH THI CỤ THỂ CỦA CÁC BUỔI THI
  ws2.mergeCells(`A${rowIdxCouncil}:F${rowIdxCouncil}`);
  ws2.getCell(`A${rowIdxCouncil}`).value = 'II. KẾ HOẠCH & LỊCH THI CỤ THỂ CỦA CÁC BUỔI THI';
  ws2.getCell(`A${rowIdxCouncil}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
  ws2.getRow(rowIdxCouncil).height = 22;
  rowIdxCouncil++;

  const sHeaderRow = ws2.getRow(rowIdxCouncil);
  const sHeaders = ['STT', 'Tên buổi thi', 'Môn thi', 'Ngày thi', 'Thời gian làm bài', 'Số phòng thi'];
  sHeaders.forEach((h, idx) => {
    const c = sHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Times New Roman', size: 10, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  sHeaderRow.height = 24;
  rowIdxCouncil++;

  sessions.forEach((s, sIdx) => {
    const r = ws2.getRow(rowIdxCouncil);
    r.height = 22;
    r.getCell(1).value = sIdx + 1;
    r.getCell(2).value = s.sessionName;
    r.getCell(3).value = cleanSubjectName(s.subjectName);
    r.getCell(4).value = s.date;
    r.getCell(5).value = s.shiftTime;
    r.getCell(6).value = `${s.numRooms} phòng (GS: ${s.numSupervisors ?? Math.ceil(s.numRooms / 4)}, DP: ${s.numReserves ?? 2})`;

    for (let c = 1; c <= 6; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (c === 1 || c === 4 || c === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      }
    }
    rowIdxCouncil++;
  });

  // Chữ ký Sheet 3
  rowIdxCouncil += 2;
  ws2.mergeCells(`A${rowIdxCouncil}:C${rowIdxCouncil}`);
  ws2.getCell(`A${rowIdxCouncil}`).value = 'THƯ KÝ HỘI ĐỒNG THI';
  ws2.getCell(`A${rowIdxCouncil}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws2.getCell(`A${rowIdxCouncil}`).alignment = { horizontal: 'center' };

  ws2.mergeCells(`D${rowIdxCouncil}:F${rowIdxCouncil}`);
  ws2.getCell(`D${rowIdxCouncil}`).value = 'CHỦ TỊCH HỘI ĐỒNG THI';
  ws2.getCell(`D${rowIdxCouncil}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws2.getCell(`D${rowIdxCouncil}`).alignment = { horizontal: 'center' };

  ws2.columns = [
    { width: 6 },
    { width: 14 },
    { width: 28 },
    { width: 24 },
    { width: 26 },
    { width: 34 }
  ];

  // =========================================================================
  // SHEET 4: BẢNG THỐNG KÊ SỐ CA COI THI & THANH TOÁN CHẾ ĐỘ THÙ LAO
  // =========================================================================
  const ws3 = wb.addWorksheet('Thống_Kê_Chấm_Công');
  ws3.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Quốc hiệu - Tiêu ngữ & Trường
  ws3.mergeCells('A1:C1');
  ws3.getCell('A1').value = schoolName.toUpperCase();
  ws3.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws3.getCell('A1').alignment = { horizontal: 'center' };

  ws3.mergeCells('E1:H1');
  ws3.getCell('E1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws3.getCell('E1').font = { name: 'Times New Roman', size: 11, bold: true };
  ws3.getCell('E1').alignment = { horizontal: 'center' };

  ws3.mergeCells('A2:C2');
  ws3.getCell('A2').value = 'HỘI ĐỒNG COI THI';
  ws3.getCell('A2').font = { name: 'Times New Roman', size: 10, bold: true };
  ws3.getCell('A2').alignment = { horizontal: 'center' };

  ws3.mergeCells('E2:H2');
  ws3.getCell('E2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws3.getCell('E2').font = { name: 'Times New Roman', size: 10, italic: true, underline: true };
  ws3.getCell('E2').alignment = { horizontal: 'center' };

  // Tiêu đề
  ws3.mergeCells('A4:H4');
  ws3.getCell('A4').value = `BẢNG TỔNG HỢP SỐ CA COI THI VÀ THANH TOÁN CHẾ ĐỘ THÙ LAO`;
  ws3.getCell('A4').font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  ws3.getCell('A4').alignment = { horizontal: 'center' };
  ws3.getRow(4).height = 24;

  ws3.mergeCells('A5:H5');
  ws3.getCell('A5').value = `${examName.toUpperCase()}   -   ${academicYear.toUpperCase()}`;
  ws3.getCell('A5').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFC00000' } };
  ws3.getCell('A5').alignment = { horizontal: 'center' };

  const hRow3 = ws3.getRow(7);
  const headers3 = ['STT', 'Mã GV', 'Họ và tên', 'Đơn vị / Tổ CM', 'Môn dạy', 'Số ca phân công', 'Chi tiết các ca làm nhiệm vụ', 'Ký nhận thanh toán'];
  headers3.forEach((h, idx) => {
    const c = hRow3.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Times New Roman', size: 10, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  hRow3.height = 26;

  let rowIdx3 = 8;
  plan.stats.forEach((st, idx) => {
    const r = ws3.getRow(rowIdx3);
    r.height = 22;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = st.code;
    r.getCell(3).value = st.fullName;
    r.getCell(4).value = st.schoolOrDept;
    r.getCell(5).value = st.subject;
    r.getCell(6).value = st.totalAssigned;

    // Chi tiết phòng coi / giám sát / dự phòng (không lặp ca tiếp nối để tránh rối như coi 3 ca)
    const detailsStr = st.sessionDetails.map(d => {
      const sPrefix = formatSessionShortLabel(d.sessionName);
      if (d.role === 'Giám sát') return `${sPrefix}: Giám sát`;
      if (d.role === 'Dự phòng') return `${sPrefix}: Dự phòng`;
      return `${sPrefix}: P${String(d.roomNo).padStart(2, '0')}`;
    }).join(' | ');
    r.getCell(7).value = detailsStr || 'Không có ca';
    r.getCell(8).value = ''; // Cột Ký nhận

    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (c === 1 || c === 2 || c === 6 || c === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      }
    }
    rowIdx3++;
  });

  // Chữ ký Sheet 4
  rowIdx3 += 2;
  ws3.mergeCells(`A${rowIdx3}:B${rowIdx3}`);
  ws3.getCell(`A${rowIdx3}`).value = 'NGƯỜI LẬP BIỂU';
  ws3.getCell(`A${rowIdx3}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws3.getCell(`A${rowIdx3}`).alignment = { horizontal: 'center' };

  ws3.mergeCells(`D${rowIdx3}:E${rowIdx3}`);
  ws3.getCell(`D${rowIdx3}`).value = 'THƯ KÝ HỘI ĐỒNG THI';
  ws3.getCell(`D${rowIdx3}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws3.getCell(`D${rowIdx3}`).alignment = { horizontal: 'center' };

  ws3.mergeCells(`G${rowIdx3}:H${rowIdx3}`);
  ws3.getCell(`G${rowIdx3}`).value = 'CHỦ TỊCH HỘI ĐỒNG THI';
  ws3.getCell(`G${rowIdx3}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws3.getCell(`G${rowIdx3}`).alignment = { horizontal: 'center' };

  ws3.columns = [
    { width: 6 },
    { width: 12 },
    { width: 26 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 46 },
    { width: 18 }
  ];

  // Tải file về trình duyệt
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${cleanFileName(examName)}_${cleanFileName(academicYear)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Thêm Sheet Lịch Coi Thi Tổng Quát (Bảo Mật Số Phòng) vào Workbook ExcelJS
 */
export function appendGeneralAnnouncementSheet(
  wb: ExcelJS.Workbook,
  plan: InvigilatorPlanResult,
  sessions: ExamSession[],
  invigilators: Invigilator[] = [],
  schoolName: string = 'TRƯỜNG THPT',
  examName: string = 'KỲ THI KHẢO SÁT CHẤT LƯỢNG KẾT HỢP THI THỬ TỐT NGHIỆP THPT',
  academicYear: string = 'NĂM HỌC 2025 - 2026',
  customDutyOverrides?: Record<string, Record<string, boolean>>
) {
  const data = buildGeneralAnnouncementData(plan, sessions, invigilators, schoolName, examName, academicYear, customDutyOverrides);
  const ws = wb.addWorksheet('Lịch_Tổng_Quát_Bảo_Mật');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const totalCols = Math.max(8, 6 + (data.shifts ? data.shifts.length : 0) + 2); // STT, Mã, Tên, Đơn vị, Môn, Chức vụ + N shifts + Tổng buổi + Ghi chú
  const endColLetter = getColumnLetter(totalCols);
  const midColIndex = Math.floor(totalCols / 2);
  const midColLetter = getColumnLetter(midColIndex);
  const nextColLetter = getColumnLetter(midColIndex + 1);

  // 1. Quốc hiệu - Tiêu ngữ & Đơn vị (Dòng 1 & 2)
  ws.mergeCells(`A1:${midColLetter}1`);
  const schoolCell = ws.getCell('A1');
  schoolCell.value = schoolName.toUpperCase();
  schoolCell.font = { name: 'Times New Roman', size: 11, bold: true };
  schoolCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${nextColLetter}1:${endColLetter}1`);
  const nationalCell = ws.getCell(`${nextColLetter}1`);
  nationalCell.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  nationalCell.font = { name: 'Times New Roman', size: 11, bold: true };
  nationalCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A2:${midColLetter}2`);
  const councilCell = ws.getCell('A2');
  councilCell.value = 'HỘI ĐỒNG COI THI';
  councilCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
  councilCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${nextColLetter}2:${endColLetter}2`);
  const mottoCell = ws.getCell(`${nextColLetter}2`);
  mottoCell.value = 'Độc lập - Tự do - Hạnh phúc';
  mottoCell.font = { name: 'Times New Roman', size: 10, italic: true, underline: true };
  mottoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Tiêu đề chính (Dòng 4)
  ws.mergeCells(`A4:${endColLetter}4`);
  const t1 = ws.getCell('A4');
  t1.value = 'DANH SÁCH CÁN BỘ LÃNH ĐẠO, THƯ KÝ, GIÁM SÁT VÀ GIÁM THỊ COI THI';
  t1.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF002060' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 25;

  // 3. Phụ đề kỳ thi & năm học (Dòng 5)
  ws.mergeCells(`A5:${endColLetter}5`);
  const t2 = ws.getCell('A5');
  t2.value = `${examName.toUpperCase()}   -   ${academicYear.toUpperCase()}`;
  t2.font = { name: 'Times New Roman', size: 11.5, bold: true, color: { argb: 'FFC00000' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 20;

  // Dòng 6 để trống
  ws.getRow(6).height = 8;

  // 4. Tiêu đề cột (Dòng 7)
  const headerRow = ws.getRow(7);
  headerRow.height = 36;

  const headers = [
    'STT',
    'Mã GV',
    'Họ và tên',
    'Đơn vị / Tổ CM',
    'Môn giảng dạy',
    'Nhiệm vụ HĐ thi',
    ...data.shifts.map(s => s.fullHeader),
    'Tổng số buổi',
    'Ghi chú phân công'
  ];

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Độ rộng các cột
  ws.getColumn(1).width = 6;   // STT
  ws.getColumn(2).width = 11;  // Mã GV
  ws.getColumn(3).width = 25;  // Họ và tên
  ws.getColumn(4).width = 22;  // Đơn vị / Tổ CM
  ws.getColumn(5).width = 18;  // Môn giảng dạy
  ws.getColumn(6).width = 18;  // Nhiệm vụ HĐ thi

  data.shifts.forEach((_, sIdx) => {
    ws.getColumn(7 + sIdx).width = 19; // Buổi thi
  });

  ws.getColumn(7 + data.shifts.length).width = 14;     // Tổng số buổi
  ws.getColumn(8 + data.shifts.length).width = 24;     // Ghi chú

  // 5. Đổ dữ liệu từng hàng (từ Dòng 8)
  let curRow = 8;

  data.rows.forEach(r => {
    const row = ws.getRow(curRow);
    row.height = 22;

    let rowBgColor = 'FFFFFFFF';
    if (r.groupType === 'leadership') {
      rowBgColor = 'FFFFFF00'; // Vàng tươi chuẩn hình mẫu
    } else if (r.groupType === 'supervisor') {
      rowBgColor = 'FFF3E8FF'; // Tím nhạt chuẩn hình mẫu
    } else if (r.groupType === 'support') {
      rowBgColor = 'FFE0F2FE'; // Xanh ngọc / sky nhạt cho Khảo thí & Phục vụ
    }

    const rowFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: rowBgColor }
    };

    const cellBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };

    // Cột 1: STT
    const c1 = row.getCell(1);
    c1.value = r.stt;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.font = { name: 'Times New Roman', size: 10, bold: r.groupType === 'leadership' };

    // Cột 2: Mã GV
    const c2 = row.getCell(2);
    c2.value = r.code;
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    if (r.groupType === 'supervisor') {
      c2.font = { name: 'Times New Roman', size: 10, bold: true, italic: true, color: { argb: 'FFDC2626' } };
    } else if (r.groupType === 'support') {
      c2.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0369A1' } };
    } else {
      c2.font = { name: 'Times New Roman', size: 10, bold: r.groupType === 'leadership' };
    }

    // Cột 3: Họ và tên
    const c3 = row.getCell(3);
    c3.value = r.fullName;
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    c3.font = { name: 'Times New Roman', size: 10.5, bold: r.groupType === 'leadership' || r.groupType === 'support' };

    // Cột 4: Đơn vị / Tổ CM
    const c4 = row.getCell(4);
    c4.value = r.schoolOrDept;
    c4.alignment = { horizontal: 'left', vertical: 'middle' };
    c4.font = { name: 'Times New Roman', size: 10 };

    // Cột 5: Môn giảng dạy
    const c5 = row.getCell(5);
    c5.value = r.subject;
    c5.alignment = { horizontal: 'left', vertical: 'middle' };
    c5.font = { name: 'Times New Roman', size: 10 };

    // Cột 6: Nhiệm vụ HĐ thi
    const c6 = row.getCell(6);
    c6.value = r.role;
    c6.alignment = { horizontal: 'center', vertical: 'middle' };
    c6.font = {
      name: 'Times New Roman',
      size: 10,
      bold: true,
      color: {
        argb: r.groupType === 'leadership'
          ? 'FF4C1D95'
          : (r.groupType === 'supervisor'
            ? 'FF6B21A8'
            : (r.groupType === 'support'
              ? 'FF0369A1'
              : 'FF334155'))
      }
    };

    // Các cột Buổi thi (Đánh dấu x nếu có nhiệm vụ, TUYỆT ĐỐI BẢO MẬT SỐ PHÒNG)
    data.shifts.forEach((s, sIdx) => {
      const colIdx = 7 + sIdx;
      const cShift = row.getCell(colIdx);
      const hasDuty = Boolean(r.shiftDuties[s.shiftKey]);
      cShift.value = hasDuty ? 'x' : '';
      cShift.alignment = { horizontal: 'center', vertical: 'middle' };
      cShift.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    });

    // Cột Tổng số buổi
    const cTot = row.getCell(7 + data.shifts.length);
    cTot.value = r.totalDuties > 0 ? r.totalDuties : '';
    cTot.alignment = { horizontal: 'center', vertical: 'middle' };
    cTot.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };

    // Cột Ghi chú phân công
    const cNote = row.getCell(8 + data.shifts.length);
    cNote.value = r.note;
    cNote.alignment = { horizontal: 'left', vertical: 'middle' };
    cNote.font = { name: 'Times New Roman', size: 9.5, italic: true };

    // Áp dụng định dạng ô (border & fill) cho toàn bộ hàng
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = rowFill;
      cell.border = cellBorder;
    }

    curRow++;
  });

  // Chữ ký xác nhận cuối bảng
  curRow += 2;
  const sigRow = ws.getRow(curRow);
  sigRow.height = 20;

  const leftCol = Math.min(3, Math.max(1, totalCols));
  const leftSigCell = sigRow.getCell(leftCol);
  leftSigCell.value = 'THƯ KÝ HỘI ĐỒNG THI';
  leftSigCell.font = { name: 'Times New Roman', size: 11, bold: true };
  leftSigCell.alignment = { horizontal: 'center' };

  const rightCol = Math.max(leftCol + 1, totalCols - 1);
  const rightSigCell = sigRow.getCell(rightCol);
  rightSigCell.value = 'CHỦ TỊCH HỘI ĐỒNG THI';
  rightSigCell.font = { name: 'Times New Roman', size: 11, bold: true };
  rightSigCell.alignment = { horizontal: 'center' };

  // Họ tên Thư ký & Chủ tịch dưới chữ ký
  const president = invigilators.find(i => i.role === 'Chủ tịch') || invigilators.find(i => i.note?.toLowerCase().includes('hiệu trưởng'));
  const mainSec = invigilators.find(i => i.role === 'Thư ký');
  const nameRow = ws.getRow(curRow + 4);
  nameRow.height = 20;

  const leftNameCell = nameRow.getCell(leftCol);
  leftNameCell.value = mainSec?.fullName || '';
  leftNameCell.font = { name: 'Times New Roman', size: 11, bold: true };
  leftNameCell.alignment = { horizontal: 'center' };

  const rightNameCell = nameRow.getCell(rightCol);
  rightNameCell.value = president?.fullName || '';
  rightNameCell.font = { name: 'Times New Roman', size: 11, bold: true };
  rightNameCell.alignment = { horizontal: 'center' };
}

/**
 * Xuất file Excel ĐỘC LẬP: Bảng Danh sách Tổng quát theo Buổi (Bảo Mật Phòng Thi)
 * Định dạng chuẩn xác 100% theo mẫu công bố cho Hội đồng giáo viên
 */
export async function exportGeneralInvigilatorAnnouncementExcel(
  plan: InvigilatorPlanResult,
  sessions: ExamSession[],
  invigilators: Invigilator[] = [],
  schoolName: string = 'TRƯỜNG THPT',
  examName: string = 'KỲ THI KHẢO SÁT CHẤT LƯỢNG KẾT HỢP THI THỬ TỐT NGHIỆP THPT',
  academicYear: string = 'NĂM HỌC 2025 - 2026',
  customDutyOverrides?: Record<string, Record<string, boolean>>
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ Thống Xếp Phòng & Phân Công Giám Thị THPT';
  wb.created = new Date();

  appendGeneralAnnouncementSheet(wb, plan, sessions, invigilators, schoolName, examName, academicYear, customDutyOverrides);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `Danh_Sach_Tong_Quat_Bao_Mat_${cleanFileName(examName)}_${cleanFileName(academicYear)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
