import ExcelJS from 'exceljs';
import { CandidateAssigned, ColumnDefinition, ExamConfig, RoomAssignmentModel, SeatingPattern } from '../types';
import { getRoomCode, getRoomDisplayLabel } from './optimizer';
import { calculateFitWidths, DEFAULT_ATTENDANCE_COLUMNS, DEFAULT_OVERALL_COLUMNS } from './columnDefaults';
import { calculateExamPaperMatrix, isSubjectRegistered, normalizeSubjectName } from './subjectHelper';
import { computeRoomDeskMatrix, groupDesksByRow } from './seatingHelper';

/**
 * Hàm chuyển đổi số thứ tự cột 1-based thành chữ cái Excel (1 -> A, 8 -> H, 27 -> AA...)
 */
function getColLetter(colIdx1Based: number): string {
  let temp = Math.max(1, Math.min(16384, Math.floor(colIdx1Based || 1)));
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter || 'A';
}

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

/**
 * Sắp xếp thí sinh trong phòng thi theo đúng nghiệp vụ bốc thăm sơ đồ của Bộ:
 * - Đối với ca thi tự chọn (Ca 1 / Ca 2): Gom các môn thi trong ca thành từng nhóm môn liền nhau (tiện phát đề & thu bài);
 *   trong mỗi nhóm môn sắp xếp SBD từ nhỏ đến lớn.
 * - Đối với 2 môn bắt buộc (Ngữ văn / Toán): Toàn phòng cùng 1 môn, sắp xếp SBD từ nhỏ đến lớn (1..24).
 * - Đối với bảng tổng hợp tổ hợp môn: Gom theo tổ hợp môn, trong mỗi tổ hợp SBD từ nhỏ đến lớn.
 */
export function sortCandidatesInRoomForShift(
  candidates: CandidateAssigned[],
  subjectKey?: 'TC1' | 'TC2' | 'M1' | 'M2' | 'ToHop_ChuanHoa' | string,
  sortSbdAscending?: boolean
): CandidateAssigned[] {
  return [...candidates].sort((a, b) => {
    // Nếu bật công tắc: Sắp xếp số báo danh trong phòng thi tăng dần (Phương án 2)
    if (sortSbdAscending) {
      const sbdA = String(a.SBD || '').trim();
      const sbdB = String(b.SBD || '').trim();
      return sbdA.localeCompare(sbdB, undefined, { numeric: true, sensitivity: 'base' });
    }

    // Mặc định (khi tắt công tắc): Phân nhóm môn / tổ hợp trong phòng nếu không phải môn bắt buộc chung
    if (subjectKey && subjectKey !== 'M1' && subjectKey !== 'M2' && subjectKey !== 'Ngữ văn' && subjectKey !== 'Toán') {
      let subjA = '';
      let subjB = '';
      if (subjectKey === 'ToHop_ChuanHoa') {
        subjA = String(a.ToHop_ChuanHoa || `${a.TC1 || ''} - ${a.TC2 || ''}`).trim();
        subjB = String(b.ToHop_ChuanHoa || `${b.TC1 || ''} - ${b.TC2 || ''}`).trim();
      } else {
        subjA = String((a as any)[subjectKey] || '').trim();
        subjB = String((b as any)[subjectKey] || '').trim();
      }

      if (subjA !== subjB) {
        return subjA.localeCompare(subjB, 'vi');
      }
    }

    // Trong cùng môn / tổ hợp: Sắp xếp SBD từ nhỏ đến lớn
    const sbdA = String(a.SBD || '').trim();
    const sbdB = String(b.SBD || '').trim();
    return sbdA.localeCompare(sbdB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Xuất File 1: Danh sách chia phòng tổng thể (Hỗ trợ cấu hình cột tùy biến)
 */
export async function exportOverallListExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig,
  customColumns?: ColumnDefinition[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Danh_Sach_Tong_The', {
    views: [{ showGridLines: true }]
  });

  // Xác định danh sách cột được bật
  const activeCols = (customColumns && customColumns.length > 0 ? customColumns : DEFAULT_OVERALL_COLUMNS).filter(
    c => c.enabled !== false
  );

  // Định nghĩa các cột với độ rộng phân bổ tự động
  worksheet.columns = activeCols.map(col => ({
    header: col.headerName,
    key: col.id,
    width: Math.max(8, Math.round((col.widthWeight || 1.5) * 8))
  }));

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Deep navy blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Thêm dữ liệu từng thí sinh
  candidates.forEach((cand, idx) => {
    const rowData: Record<string, any> = {};

    activeCols.forEach(col => {
      let val = '';
      if (col.fieldKey === 'Phòng thi') {
        val = getRoomDisplayLabel(cand['Phòng thi'], config.startRoomCode);
      } else if (col.fieldKey && cand[col.fieldKey] !== undefined) {
        val = cand[col.fieldKey];
      } else if (col.defaultValue !== undefined) {
        val = col.defaultValue;
      }
      rowData[col.id] = val;
    });

    const row = worksheet.addRow(rowData);
    row.height = 20;
    const isEven = idx % 2 === 1;

    row.eachCell((cell, colNumber) => {
      const colDef = activeCols[colNumber - 1];
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      // Căn lề theo cấu hình cột
      const align = colDef ? colDef.align : 'center';
      cell.alignment = { vertical: 'middle', horizontal: align };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'File1_Danh_Sach_Chia_Phong_Tong_The.xlsx');
}

/**
 * Xuất File 2 & 3: Mẫu "Phiếu thu bài thi / Danh sách dán phòng" cho CA 1 và CA 2
 * Hỗ trợ tùy biến cột, tự động chia độ rộng fit vừa khít 1 trang A4
 */
export async function exportAttendanceSheetsExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig,
  shiftName: 'CA 1' | 'CA 2',
  subjectKey: 'TC1' | 'TC2',
  customColumns?: ColumnDefinition[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  // Xác định các cột in ấn được kích hoạt
  const activeCols = (customColumns && customColumns.length > 0 ? customColumns : DEFAULT_ATTENDANCE_COLUMNS).filter(
    c => c.enabled !== false
  );
  const totalColsCount = Math.max(1, activeCols.length);
  const endColLetter = getColLetter(totalColsCount);

  // Tính độ rộng cột tự động fit trang A4 (Portrait ~85 ký tự)
  const fitCols = calculateFitWidths(activeCols, 85);

  // Điểm chia nửa header quốc hiệu / sở GD
  const halfColIdx = Math.max(1, Math.floor(totalColsCount / 2));
  const halfColLetter = getColLetter(halfColIdx);
  const nextColLetter = getColLetter(Math.min(totalColsCount, halfColIdx + 1));

  // Gom nhóm thí sinh theo từng phòng
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const roomNo = c['Phòng thi'];
    if (!roomsMap.has(roomNo)) {
      roomsMap.set(roomNo, []);
    }
    roomsMap.get(roomNo)!.push(c);
  });

  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  sortedRooms.forEach((roomNo) => {
    const roomCandidates = sortCandidatesInRoomForShift(roomsMap.get(roomNo) || [], subjectKey, config.sortSbdAscendingInRoom ?? true);
    const roomCode = getRoomCode(roomNo, config.startRoomCode);
    const sheetTitle = `P_${roomCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 31);
    const ws = workbook.addWorksheet(sheetTitle, {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: totalColsCount > 9 ? 'landscape' : 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3
        }
      }
    });

    // Thiết lập độ rộng cột tự động co giãn vừa vặn
    ws.columns = fitCols.map((fc, i) => ({
      key: `col_${i + 1}`,
      width: fc.width
    }));

    // -------------------------------------------------------------
    // 1. PHẦN HEADER: QUỐC HIỆU, TIÊU NGỮ & ĐƠN VỊ
    // -------------------------------------------------------------
    // Dòng 1: Tên Sở GD&ĐT và Quốc hiệu
    ws.mergeCells(`A1:${halfColLetter}1`);
    const cellA1 = ws.getCell('A1');
    cellA1.value = config.deptName ? config.deptName.trim().toUpperCase() : '';
    cellA1.font = { name: 'Times New Roman', size: 10, bold: true };
    cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${nextColLetter}1:${endColLetter}1`);
    const cellE1 = ws.getCell(`${nextColLetter}1`);
    cellE1.value = (config.countryTitle !== undefined ? config.countryTitle.trim() : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase();
    cellE1.font = { name: 'Times New Roman', size: 10, bold: true };
    cellE1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Dòng 2: Đơn vị trường & Tiêu ngữ
    ws.mergeCells(`A2:${halfColLetter}2`);
    const cellA2 = ws.getCell('A2');
    cellA2.value = config.schoolName ? config.schoolName.trim().toUpperCase() : '';
    cellA2.font = { name: 'Times New Roman', size: 9.5, bold: true, underline: true };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${nextColLetter}2:${endColLetter}2`);
    const cellE2 = ws.getCell(`${nextColLetter}2`);
    cellE2.value = config.mottoTitle !== undefined ? config.mottoTitle.trim() : 'Độc lập - Tự do - Hạnh phúc';
    cellE2.font = { name: 'Times New Roman', size: 9.5, bold: true, underline: true };
    cellE2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Dòng 4: TIÊU ĐỀ CHÍNH
    ws.mergeCells(`A4:${endColLetter}4`);
    const cellA4 = ws.getCell('A4');
    cellA4.value = 'DANH SÁCH THÍ SINH DÁN PHÒNG & PHIẾU THU BÀI THI';
    cellA4.font = { name: 'Times New Roman', size: 13, bold: true };
    cellA4.alignment = { horizontal: 'center', vertical: 'middle' };

    // Dòng 5: Kỳ thi & Ca thi
    const examFullTitle = `${config.examCategory} (${config.subPeriod})`;
    ws.mergeCells(`A5:${endColLetter}5`);
    const cellA5 = ws.getCell('A5');
    cellA5.value = `KỲ THI: ${examFullTitle.toUpperCase()} - ${shiftName} (${config.schoolYear})`;
    cellA5.font = { name: 'Times New Roman', size: 10.5, bold: true };
    cellA5.alignment = { horizontal: 'center', vertical: 'middle' };

    // Lấy danh sách các môn thi trong phòng
    const uniqueSubjects = Array.from(new Set(roomCandidates.map(c => c[subjectKey]))).filter(Boolean);
    const subjectsStr = uniqueSubjects.join(', ');
    const isMultiSubjectRoom = uniqueSubjects.length > 1;

    // Dòng 6: Điểm thi, Phòng thi, Môn thi
    ws.mergeCells(`A6:${endColLetter}6`);
    const cellA6 = ws.getCell('A6');
    cellA6.value = `Điểm thi: ${config.examCenterCode}   |   Phòng thi số: ${roomCode}   |   Môn thi: ${subjectsStr || 'Theo tổ hợp'}`;
    cellA6.font = { name: 'Times New Roman', size: 10.5, bold: true };
    cellA6.alignment = { horizontal: 'center', vertical: 'middle' };

    // -------------------------------------------------------------
    // 2. PHẦN BẢNG DỮ LIỆU THÍ SINH THEO CỘT ĐỘNG
    // -------------------------------------------------------------
    const startRow = 8;
    const headerRow = ws.getRow(startRow);
    headerRow.height = 26;

    activeCols.forEach((colDef, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = colDef.headerName;
      cell.font = { name: 'Times New Roman', size: 10, bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    let currentRowIndex = startRow + 1;

    roomCandidates.forEach((cand, candIdx) => {
      const row = ws.getRow(currentRowIndex);
      row.height = 22;

      activeCols.forEach((colDef, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let val = '';

        if (colDef.id === 'att_stt' || colDef.fieldKey === 'STT_Phong') {
          val = String(candIdx + 1);
        } else if (colDef.id === 'att_sbd' || colDef.fieldKey === 'SBD') {
          val = String(cand.SBD || '');
        } else if (colDef.id === 'att_hoten' || colDef.fieldKey === 'Họ tên') {
          val = String(cand['Họ tên'] || '');
        } else if (colDef.id === 'att_ngaysinh' || colDef.fieldKey === 'Ngày sinh') {
          val = String(cand['Ngày sinh'] || '');
        } else if (colDef.id === 'att_lop' || colDef.fieldKey === 'Lớp') {
          val = String(cand.Lớp || '');
        } else if (colDef.id === 'att_made' || colDef.headerName.toLowerCase().includes('mã đề')) {
          // Luôn để trống cho Giám thị ghi số mã đề/số tờ khi thu bài
          val = '';
        } else if (colDef.id === 'att_kynop' || colDef.headerName.toLowerCase().includes('ký nộp')) {
          // Luôn để trống cho thí sinh ký nộp bài
          val = '';
        } else if (colDef.id === 'att_ghichu' || colDef.headerName.toLowerCase().includes('ghi chú')) {
          // Môn tự chọn (CA 1 / CA 2): Thống nhất 100% TẤT CẢ các phòng (kể cả phòng 1 môn hay phòng ghép)
          // ĐỀU GHI RÕ môn thi của ca hiện tại theo subjectKey (TC1 hoặc TC2)
          const currentSubj = cand[subjectKey] || '';
          let noteVal = currentSubj ? `Môn: ${currentSubj}` : '';

          // Lấy thêm ghi chú hành chính nếu có từ file gốc (loại trừ các tên môn cũ bị sót)
          const rawNote = colDef.fieldKey && cand[colDef.fieldKey] ? String(cand[colDef.fieldKey]).trim() : '';
          const isStaleSubjectNote = rawNote && (
            rawNote.toLowerCase().includes('vật lí') ||
            rawNote.toLowerCase().includes('vật lý') ||
            rawNote.toLowerCase().includes('hóa học') ||
            rawNote.toLowerCase().includes('sinh học') ||
            rawNote.toLowerCase().includes('lịch sử') ||
            rawNote.toLowerCase().includes('địa lí') ||
            rawNote.toLowerCase().includes('địa lý') ||
            rawNote.toLowerCase().includes('gdkt') ||
            rawNote.toLowerCase().includes('tin học') ||
            rawNote.toLowerCase().includes('công nghệ') ||
            rawNote.toLowerCase().startsWith('môn:')
          );
          const cleanAdminNote = isStaleSubjectNote ? '' : rawNote;
          if (cleanAdminNote) {
            noteVal = noteVal ? `${noteVal} (${cleanAdminNote})` : cleanAdminNote;
          }
          val = noteVal;
        } else if (colDef.fieldKey && cand[colDef.fieldKey] !== undefined) {
          // Nếu cấu hình cột trỏ vào TC1/TC2, tự động đồng bộ theo môn của ca thi hiện tại
          if (colDef.fieldKey === 'TC1' || colDef.fieldKey === 'TC2' || colDef.id === 'TC1' || colDef.id === 'TC2') {
            val = String(cand[subjectKey] || '');
          } else {
            val = String(cand[colDef.fieldKey]);
          }
        } else if (colDef.defaultValue !== undefined) {
          val = colDef.defaultValue;
        }

        cell.value = val;
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        cell.alignment = { horizontal: colDef.align || 'center', vertical: 'middle' };
      });

      currentRowIndex++;
    });

    // -------------------------------------------------------------
    // 3. PHẦN FOOTER: THỐNG KÊ, NHẮC NHỞ & FORM CHỮ KÝ
    // -------------------------------------------------------------
    const totalInRoom = roomCandidates.length;

    // Dòng tổng hợp số lượng
    const sumRowIdx = currentRowIndex + 1;
    ws.mergeCells(`A${sumRowIdx}:${endColLetter}${sumRowIdx}`);
    const sumCell = ws.getCell(`A${sumRowIdx}`);
    sumCell.value = `- Tổng số thí sinh theo danh sách phòng thi: ${String(totalInRoom).padStart(2, '0')} thí sinh.`;
    sumCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
    sumCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Dòng kiểm đếm
    const countRowIdx = sumRowIdx + 1;
    ws.mergeCells(`A${countRowIdx}:${endColLetter}${countRowIdx}`);
    const countCell = ws.getCell(`A${countRowIdx}`);
    countCell.value = '- Số thí sinh có mặt: .......... | Số thí sinh vắng: .......... (Số báo danh vắng: .......................................)';
    countCell.font = { name: 'Times New Roman', size: 10, bold: true };
    countCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Dòng lưu ý giám thị
    const noteRowIdx = countRowIdx + 1;
    ws.mergeCells(`A${noteRowIdx}:${endColLetter}${noteRowIdx}`);
    const noteCell = ws.getCell(`A${noteRowIdx}`);
    noteCell.value = '* Lưu ý: Giám thị kiểm tra kỹ SBD, số tờ giấy thi và yêu cầu thí sinh ký nộp bài đầy đủ trước khi rời phòng thi.';
    noteCell.font = { name: 'Times New Roman', size: 9.5, italic: true };
    noteCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Ngày tháng năm (Tùy biến dateLine)
    const dateRowIdx = noteRowIdx + 2;
    const dateStartCol = Math.max(1, totalColsCount - 2);
    const dateStr = config.dateLine !== undefined
      ? config.dateLine.trim()
      : (config.locationName && config.locationName.trim()
          ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
          : 'Ngày ..... tháng ..... năm 20.....');

    if (dateStr) {
      ws.mergeCells(`${getColLetter(dateStartCol)}${dateRowIdx}:${endColLetter}${dateRowIdx}`);
      const dateCell = ws.getCell(`${getColLetter(dateStartCol)}${dateRowIdx}`);
      dateCell.value = dateStr;
      dateCell.font = { name: 'Times New Roman', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Tiêu đề chữ ký 2 Giám thị (Chỉ hiện khi có dữ liệu, để trống thì ẩn cả phần ký)
    const sigTitleRowIdx = dateRowIdx + 1;
    const sigSubRowIdx = sigTitleRowIdx + 1;
    const sig1End = Math.max(1, Math.min(3, halfColIdx));

    const sup1Text = (config.supervisor1Title ?? '').trim();
    if (sup1Text) {
      ws.mergeCells(`A${sigTitleRowIdx}:${getColLetter(sig1End)}${sigTitleRowIdx}`);
      const sig1Title = ws.getCell(`A${sigTitleRowIdx}`);
      sig1Title.value = sup1Text.toUpperCase();
      sig1Title.font = { name: 'Times New Roman', size: 10, bold: true };
      sig1Title.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`A${sigSubRowIdx}:${getColLetter(sig1End)}${sigSubRowIdx}`);
      const sig1Sub = ws.getCell(`A${sigSubRowIdx}`);
      sig1Sub.value = '(Ký và ghi rõ họ tên)';
      sig1Sub.font = { name: 'Times New Roman', size: 9, italic: true };
      sig1Sub.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const sup2Text = (config.supervisor2Title ?? '').trim();
    if (sup2Text) {
      ws.mergeCells(`${getColLetter(dateStartCol)}${sigTitleRowIdx}:${endColLetter}${sigTitleRowIdx}`);
      const sig2Title = ws.getCell(`${getColLetter(dateStartCol)}${sigTitleRowIdx}`);
      sig2Title.value = sup2Text.toUpperCase();
      sig2Title.font = { name: 'Times New Roman', size: 10, bold: true };
      sig2Title.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`${getColLetter(dateStartCol)}${sigSubRowIdx}:${endColLetter}${sigSubRowIdx}`);
      const sig2Sub = ws.getCell(`${getColLetter(dateStartCol)}${sigSubRowIdx}`);
      sig2Sub.value = '(Ký và ghi rõ họ tên)';
      sig2Sub.font = { name: 'Times New Roman', size: 9, italic: true };
      sig2Sub.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  const filename = shiftName === 'CA 1' 
    ? 'File2_Phieu_Thu_Bai_CA1_TC1.xlsx' 
    : 'File3_Phieu_Thu_Bai_CA2_TC2.xlsx';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

/**
 * Xuất Bảng Thống kê Theo Ca (CA 1 hoặc CA 2):
 * Cấu trúc gồm: TT; Phòng; Các môn; Tổng số thí sinh
 * Có tiêu đề kỳ thi đầy đủ như danh sách thu bài.
 */
export async function exportShiftSummaryExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig,
  shiftName: 'CA 1' | 'CA 2',
  subjectKey: 'TC1' | 'TC2'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const ws = workbook.addWorksheet(`Thong_Ke_${shiftName.replace(' ', '')}`, {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.6, right: 0.5, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 }
    }
  });

  // Thiết lập 4 cột chuẩn
  ws.columns = [
    { key: 'col1', width: 8 },   // TT
    { key: 'col2', width: 18 },  // Phòng
    { key: 'col3', width: 44 },  // Các môn
    { key: 'col4', width: 22 },  // Tổng số thí sinh
  ];

  // 1. Header Quốc hiệu & Tiêu ngữ
  ws.mergeCells('A1:B1');
  const cA1 = ws.getCell('A1');
  cA1.value = (config.deptName || '').toUpperCase();
  cA1.font = { name: 'Times New Roman', size: 11, bold: true };
  cA1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('C1:D1');
  const cC1 = ws.getCell('C1');
  cC1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cC1.font = { name: 'Times New Roman', size: 11, bold: true };
  cC1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:B2');
  const cA2 = ws.getCell('A2');
  cA2.value = (config.schoolName || '').toUpperCase();
  cA2.font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
  cA2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('C2:D2');
  const cC2 = ws.getCell('C2');
  cC2.value = 'Độc lập - Tự do - Hạnh phúc';
  cC2.font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
  cC2.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Tiêu đề chính
  const examFullTitle = `${config.examCategory || ''} (${config.subPeriod || ''})`;
  ws.mergeCells('A4:D4');
  const cA4 = ws.getCell('A4');
  cA4.value = `BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG - ${shiftName}`;
  cA4.font = { name: 'Times New Roman', size: 13, bold: true };
  cA4.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A5:D5');
  const cA5 = ws.getCell('A5');
  const shiftSubjectTitle = subjectKey === 'TC1' ? 'MÔN TỰ CHỌN 1' : subjectKey === 'TC2' ? 'MÔN TỰ CHỌN 2' : (subjectKey || '');
  cA5.value = `KỲ THI: ${examFullTitle.toUpperCase()} - MÔN THI: ${shiftSubjectTitle} (${config.schoolYear || ''})`;
  cA5.font = { name: 'Times New Roman', size: 11, bold: true };
  cA5.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A6:D6');
  const cA6 = ws.getCell('A6');
  cA6.value = `Điểm thi: ${config.examCenterCode}   |   Hội đồng coi thi: ${config.schoolName}`;
  cA6.font = { name: 'Times New Roman', size: 11, italic: true };
  cA6.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Table Header
  const startRow = 8;
  const headers = ['TT', 'Phòng', 'Các môn', 'Tổng số thí sinh'];
  const hRow = ws.getRow(startRow);
  hRow.height = 26;

  headers.forEach((hText, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = hText;
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 4. Data rows
  // Gom nhóm thí sinh theo phòng
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const r = c['Phòng thi'];
    if (!roomsMap.has(r)) roomsMap.set(r, []);
    roomsMap.get(r)!.push(c);
  });

  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);
  let currentRow = startRow + 1;
  const overallSubjectCounts: Record<string, number> = {};

  sortedRooms.forEach((roomNo, idx) => {
    const roomCandidates = roomsMap.get(roomNo) || [];
    const subjMap: Record<string, number> = {};

    roomCandidates.forEach(cand => {
      const s = cand[subjectKey] || 'Chưa rõ';
      subjMap[s] = (subjMap[s] || 0) + 1;
      overallSubjectCounts[s] = (overallSubjectCounts[s] || 0) + 1;
    });

    const subjectsDetail = Object.entries(subjMap)
      .map(([s, count]) => `${s} (${count})`)
      .join(', ');

    const row = ws.getRow(currentRow);
    row.height = 22;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = getRoomDisplayLabel(roomNo, config.startRoomCode);
    row.getCell(3).value = subjectsDetail;
    row.getCell(4).value = roomCandidates.length;

    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (c === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    currentRow++;
  });

  // 5. Total Row
  const totalRow = ws.getRow(currentRow);
  totalRow.height = 24;
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = 'TỔNG CỘNG';
  totalRow.getCell(3).value = Object.entries(overallSubjectCounts)
    .map(([s, count]) => `${s}: ${count}`)
    .join(', ');
  totalRow.getCell(4).value = candidates.length;

  for (let c = 1; c <= 4; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    if (c === 3) {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }
  currentRow++;

  // 6. Signatures
  const dateRowIdx = currentRow + 2;
  const dateStr = config.dateLine !== undefined
    ? config.dateLine.trim()
    : (config.locationName && config.locationName.trim()
        ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
        : 'Ngày ..... tháng ..... năm 20.....');

  if (dateStr) {
    ws.mergeCells(`C${dateRowIdx}:D${dateRowIdx}`);
    const dCell = ws.getCell(`C${dateRowIdx}`);
    dCell.value = dateStr;
    dCell.font = { name: 'Times New Roman', size: 10, italic: true };
    dCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const sigTitleRowIdx = dateRowIdx + 1;
  const sigSubRowIdx = sigTitleRowIdx + 1;

  ws.mergeCells(`A${sigTitleRowIdx}:B${sigTitleRowIdx}`);
  const s1Title = ws.getCell(`A${sigTitleRowIdx}`);
  s1Title.value = 'NGƯỜI LẬP BẢNG';
  s1Title.font = { name: 'Times New Roman', size: 10, bold: true };
  s1Title.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A${sigSubRowIdx}:B${sigSubRowIdx}`);
  const s1Sub = ws.getCell(`A${sigSubRowIdx}`);
  s1Sub.value = '(Ký và ghi rõ họ tên)';
  s1Sub.font = { name: 'Times New Roman', size: 10, italic: true };
  s1Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  const leadLabel = (config.leaderTitle ?? 'CHỦ TỊCH HỘI ĐỒNG / TRƯỞNG ĐIỂM THI').trim();
  if (leadLabel) {
    ws.mergeCells(`C${sigTitleRowIdx}:D${sigTitleRowIdx}`);
    const s2Title = ws.getCell(`C${sigTitleRowIdx}`);
    s2Title.value = leadLabel.toUpperCase();
    s2Title.font = { name: 'Times New Roman', size: 10, bold: true };
    s2Title.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`C${sigSubRowIdx}:D${sigSubRowIdx}`);
    const s2Sub = ws.getCell(`C${sigSubRowIdx}`);
    s2Sub.value = '(Ký, đóng dấu và ghi rõ họ tên)';
    s2Sub.font = { name: 'Times New Roman', size: 10, italic: true };
    s2Sub.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const filename = `Bang_Thong_Ke_Phong_Thi_${shiftName.replace(' ', '')}_${subjectKey}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

import { getRoomSubjects } from './subjectHelper';

/**
 * XUẤT PHIẾU THU BÀI THI TẤT CẢ CÁC MÔN VÀO 1 TRANG (KHỔ A4 NGANG)
 * Cấu trúc chuẩn theo hình ảnh người dùng:
 * - Hàng 1: TT | SBD | Họ và tên | Ngày sinh | Lớp | [Học sinh ký nộp bài (merge ngang)] | Ghi chú
 * - Hàng 2: Các môn thi (Cố định 4 môn bắt buộc: Ngữ văn, Toán, Lịch sử, Tiếng Anh + các môn tự chọn theo mã Nhóm)
 */
export async function exportMultiSubjectAttendanceExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig,
  _defaultSubjectsList?: string[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  // Nhóm thí sinh theo phòng thi
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) {
      roomsMap.set(rNo, []);
    }
    roomsMap.get(rNo)!.push(c);
  });

  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  sortedRooms.forEach(roomNo => {
    const roomStudents = roomsMap.get(roomNo) || [];
    const roomLabel = getRoomDisplayLabel(roomNo, config.startRoomCode);
    const sheetName = `P${String(roomNo).padStart(2, '0')}`;
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    // Lấy danh sách môn thi riêng và mã nhóm cho phòng thi này
    const { subjects, groupLabel } = getRoomSubjects(roomStudents, config);

    // Cột cố định: 1=TT, 2=SBD, 3=Họ và tên, 4=Ngày sinh, 5=Lớp
    // Cột môn: 6 .. (5 + subjects.length)
    // Cột Ghi chú: (6 + subjects.length)
    const totalCols = 5 + subjects.length + 1;
    const startSubjCol = 6;
    const endSubjCol = 5 + subjects.length;
    const noteCol = totalCols;
    const endColLetter = getColLetter(totalCols);

    // Cài đặt trang in A4 ngang vừa khít 1 trang
    ws.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.3,
        bottom: 0.3,
        header: 0,
        footer: 0
      }
    };

    // Đặt độ rộng cột tối ưu phủ kín 100% bề ngang trang in A4 Ngang (~170 đơn vị)
    // Cột Họ và tên mở rộng 30 đơn vị để hiển thị trọn vẹn họ tên 4-5 từ không bị co ép
    ws.getColumn(1).width = 5.5;  // TT
    ws.getColumn(2).width = 13.5; // SBD
    ws.getColumn(3).width = 30;   // Họ và tên
    ws.getColumn(4).width = 13;   // Ngày sinh
    ws.getColumn(5).width = 8.5;  // Lớp
    ws.getColumn(noteCol).width = 11; // Ghi chú

    // Độ rộng các cột môn thi: chia đều phần chiều rộng còn lại (~89 đơn vị)
    const remainingWidth = 89;
    const subjWidth = Math.max(9, Math.round((remainingWidth / Math.max(1, subjects.length)) * 10) / 10);
    for (let c = startSubjCol; c <= endSubjCol; c++) {
      ws.getColumn(c).width = subjWidth;
    }

    // Header cấp trên (Đơn vị & Quốc hiệu)
    // Dòng 1: Đơn vị
    const leftHeaderEndCol = Math.min(5, Math.max(3, Math.floor(totalCols / 2) - 1));
    const leftHeaderLetter = getColLetter(leftHeaderEndCol);
    const rightHeaderStartLetter = getColLetter(leftHeaderEndCol + 1);

    ws.mergeCells(`A1:${leftHeaderLetter}1`);
    const uCell = ws.getCell('A1');
    uCell.value = config.deptName ? config.deptName.trim().toUpperCase() : '';
    uCell.font = { name: 'Times New Roman', size: 10, bold: true };
    uCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 16;

    ws.mergeCells(`${rightHeaderStartLetter}1:${endColLetter}1`);
    const qCell = ws.getCell(`${rightHeaderStartLetter}1`);
    qCell.value = (config.countryTitle !== undefined ? config.countryTitle.trim() : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase();
    qCell.font = { name: 'Times New Roman', size: 10, bold: true };
    qCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Dòng 2: Trường & Độc lập tự do
    ws.mergeCells(`A2:${leftHeaderLetter}2`);
    const sCell = ws.getCell('A2');
    sCell.value = config.schoolName ? config.schoolName.trim().toUpperCase() : '';
    sCell.font = { name: 'Times New Roman', size: 10, bold: true };
    sCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 16;

    ws.mergeCells(`${rightHeaderStartLetter}2:${endColLetter}2`);
    const qSubCell = ws.getCell(`${rightHeaderStartLetter}2`);
    qSubCell.value = config.mottoTitle !== undefined ? config.mottoTitle.trim() : 'Độc lập - Tự do - Hạnh phúc';
    qSubCell.font = { name: 'Times New Roman', size: 10, italic: true };
    qSubCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Dòng 3: Tiêu đề lớn
    ws.mergeCells(`A3:${endColLetter}3`);
    const tCell = ws.getCell('A3');
    tCell.value = (config.sheetTitle !== undefined && config.sheetTitle.trim())
      ? config.sheetTitle.trim().toUpperCase()
      : 'DANH SÁCH THÍ SINH VÀ PHIẾU THU BÀI THI TỔNG HỢP CÁC MÔN';
    tCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 22;

    // Dòng 4: Thông tin phòng thi & kỳ thi (Có thêm Mã nhóm ở cuối theo yêu cầu)
    ws.mergeCells(`A4:${endColLetter}4`);
    const subCell = ws.getCell('A4');
    const groupSuffix = groupLabel ? `  |  Mã nhóm: ${groupLabel}` : '';
    subCell.value = `Kỳ thi: ${config.examCategory} (${config.subPeriod}) - Năm học: ${config.schoolYear}  |  ${roomLabel.toUpperCase()}  |  Sĩ số: ${roomStudents.length} thí sinh${groupSuffix}`;
    subCell.font = { name: 'Times New Roman', size: 10.5, italic: true, bold: true };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(4).height = 16;

    // Bắt đầu bảng dữ liệu 2 tầng từ Dòng 5 (liền mạch, không để dòng trống gây thừa chiều cao)
    const rH1 = 5;
    const rH2 = 6;
    ws.getRow(rH1).height = 18;
    ws.getRow(rH2).height = 18;

    // Merge các cột cố định
    ws.mergeCells(`A${rH1}:A${rH2}`);
    ws.getCell(`A${rH1}`).value = 'TT';

    ws.mergeCells(`B${rH1}:B${rH2}`);
    ws.getCell(`B${rH1}`).value = 'SBD';

    ws.mergeCells(`C${rH1}:C${rH2}`);
    ws.getCell(`C${rH1}`).value = 'Họ và tên';

    ws.mergeCells(`D${rH1}:D${rH2}`);
    ws.getCell(`D${rH1}`).value = 'Ngày sinh';

    ws.mergeCells(`E${rH1}:E${rH2}`);
    ws.getCell(`E${rH1}`).value = 'Lớp';

    // Merge tiêu đề "Học sinh ký nộp bài" vắt ngang qua tất cả các cột môn
    const startSubjLetter = getColLetter(startSubjCol);
    const endSubjLetter = getColLetter(endSubjCol);
    ws.mergeCells(`${startSubjLetter}${rH1}:${endSubjLetter}${rH1}`);
    const signHeadCell = ws.getCell(`${startSubjLetter}${rH1}`);
    signHeadCell.value = 'Học sinh ký nộp bài';

    // Dòng rH2: Điền tên các môn thi (4 môn bắt buộc + môn tự chọn của nhóm)
    subjects.forEach((subj, sIdx) => {
      const colLetter = getColLetter(startSubjCol + sIdx);
      ws.getCell(`${colLetter}${rH2}`).value = subj;
    });

    // Merge cột Ghi chú
    const noteColLetter = getColLetter(noteCol);
    ws.mergeCells(`${noteColLetter}${rH1}:${noteColLetter}${rH2}`);
    ws.getCell(`${noteColLetter}${rH1}`).value = 'Ghi chú';

    // Định dạng viền và phông chữ cho Header 2 tầng (Tất cả căn chính giữa)
    for (let r = rH1; r <= rH2; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: 'Times New Roman', size: 9.5, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' } // Slate-100
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    // Đổ dữ liệu thí sinh từ Dòng 7 (ngay sau 2 dòng tiêu đề bảng 5 và 6)
    const candCount = roomStudents.length;
    // Tự động tinh chỉnh chiều cao dòng theo sĩ số phòng để luôn chuẩn 1 trang A4 không bị co tỷ lệ
    const dataRowHeight = candCount <= 20 ? 16.5 : candCount <= 24 ? 15 : candCount <= 28 ? 13.8 : 12.5;

    let currentRow = 7;
    roomStudents.forEach((cand, idx) => {
      const row = ws.getRow(currentRow);
      row.height = dataRowHeight;

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = cand.SBD || '';
      row.getCell(3).value = cand['Họ tên'] || cand['Họ và tên'] || '';
      row.getCell(4).value = cand['Ngày sinh'] || '';
      row.getCell(5).value = cand['Lớp'] || '';

      // Định dạng căn lề và font chữ
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Times New Roman', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };

        if (c === 3) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      currentRow++;
    });

    // Đệm nhẹ giữa bảng và khối chữ ký
    ws.getRow(currentRow).height = 6;

    // Phần chân trang ký tên (Tùy biến linh hoạt: Có nhập thì hiện, để trống thì ẩn hoàn toàn cả tiêu đề và phần ký)
    const sigRow1 = currentRow + 1;
    ws.getRow(sigRow1).height = 15;

    // Phân bổ 3 cột ký tên theo chiều ngang
    const b1End = Math.max(2, Math.floor(totalCols * 0.33));
    const b2Start = b1End + 1;
    const b2End = Math.max(b2Start + 1, Math.floor(totalCols * 0.66));
    const b3Start = b2End + 1;
    const b3End = Math.max(b3Start, totalCols);

    // Ngày tháng và địa danh ở phía trên cột Trưởng điểm thi (tùy biến dateLine)
    const dateStr = config.dateLine !== undefined
      ? config.dateLine.trim()
      : (config.locationName && config.locationName.trim()
          ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
          : 'Ngày ..... tháng ..... năm 20.....');

    if (dateStr) {
      ws.mergeCells(`${getColLetter(b3Start)}${sigRow1}:${getColLetter(b3End)}${sigRow1}`);
      const dCell = ws.getCell(`${getColLetter(b3Start)}${sigRow1}`);
      dCell.value = dateStr;
      dCell.font = { name: 'Times New Roman', size: 9.5, italic: true };
      dCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const sigRow2 = sigRow1 + 1;
    const sigRow3 = sigRow2 + 1;
    const sigRow4 = sigRow3 + 1;
    ws.getRow(sigRow2).height = 16;
    ws.getRow(sigRow3).height = 13;
    ws.getRow(sigRow4).height = 28; // Khoảng trống ký tên vừa vặn không làm tràn trang

    // Cán bộ coi thi 1: Chỉ hiện khi có dữ liệu
    const sup1Label = (config.supervisor1Title ?? '').trim();
    if (sup1Label) {
      ws.mergeCells(`A${sigRow2}:${getColLetter(b1End)}${sigRow2}`);
      const g1 = ws.getCell(`A${sigRow2}`);
      g1.value = sup1Label.toUpperCase();
      g1.font = { name: 'Times New Roman', size: 9.5, bold: true };
      g1.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`A${sigRow3}:${getColLetter(b1End)}${sigRow3}`);
      const sub1 = ws.getCell(`A${sigRow3}`);
      sub1.value = '(Ký và ghi rõ họ tên)';
      sub1.font = { name: 'Times New Roman', size: 8.5, italic: true };
      sub1.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Cán bộ coi thi 2: Chỉ hiện khi có dữ liệu
    const sup2Label = (config.supervisor2Title ?? '').trim();
    if (sup2Label) {
      ws.mergeCells(`${getColLetter(b2Start)}${sigRow2}:${getColLetter(b2End)}${sigRow2}`);
      const g2 = ws.getCell(`${getColLetter(b2Start)}${sigRow2}`);
      g2.value = sup2Label.toUpperCase();
      g2.font = { name: 'Times New Roman', size: 9.5, bold: true };
      g2.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`${getColLetter(b2Start)}${sigRow3}:${getColLetter(b2End)}${sigRow3}`);
      const sub2 = ws.getCell(`${getColLetter(b2Start)}${sigRow3}`);
      sub2.value = '(Ký và ghi rõ họ tên)';
      sub2.font = { name: 'Times New Roman', size: 8.5, italic: true };
      sub2.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Trưởng điểm thi / Hiệu trưởng: Chỉ hiện khi có dữ liệu
    const leadLabel = (config.leaderTitle ?? '').trim();
    if (leadLabel) {
      ws.mergeCells(`${getColLetter(b3Start)}${sigRow2}:${getColLetter(b3End)}${sigRow2}`);
      const g3 = ws.getCell(`${getColLetter(b3Start)}${sigRow2}`);
      g3.value = leadLabel.toUpperCase();
      g3.font = { name: 'Times New Roman', size: 9.5, bold: true };
      g3.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`${getColLetter(b3Start)}${sigRow3}:${getColLetter(b3End)}${sigRow3}`);
      const sub3 = ws.getCell(`${getColLetter(b3Start)}${sigRow3}`);
      sub3.value = '(Ký, đóng dấu và ghi rõ họ tên)';
      sub3.font = { name: 'Times New Roman', size: 8.5, italic: true };
      sub3.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  const filename = `Phieu_Thu_Bai_Thi_Tat_Ca_Cac_Mon_A4.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

/**
 * Chia phòng cho 2 môn bắt buộc (Toán & Ngữ văn - M1 & M2):
 * - Phương án 1 (MẶC ĐỊNH - Chuẩn 100% Bộ GD&ĐT): 1 Thí sinh = 1 SBD & 1 Phòng thi cố định toàn kỳ thi.
 *   Giữ nguyên 100% Phòng thi và STT_Phong đã được xếp tối ưu theo thuật toán Rolling-Fit 2.0.
 * - Phương án 2 (Tách 2 giai đoạn): Văn & Toán xếp cuốn chiếu theo SBD Alphabet tăng dần.
 */
export function getCompulsoryCandidateAssignments(
  candidates: CandidateAssigned[],
  maxPerRoom: number = 24,
  model: RoomAssignmentModel = 'moet_fixed'
): { assignedCandidates: CandidateAssigned[]; totalRooms: number } {
  if (model === 'two_phase_split') {
    const sorted = [...candidates].sort((a, b) => {
      const sbdA = String(a.SBD || '').trim();
      const sbdB = String(b.SBD || '').trim();
      return sbdA.localeCompare(sbdB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const total = sorted.length;
    const totalRooms = total > 0 ? Math.ceil(total / maxPerRoom) : 0;

    const assigned: CandidateAssigned[] = sorted.map((cand, idx) => {
      const roomNo = Math.floor(idx / maxPerRoom) + 1;
      const seqInRoom = (idx % maxPerRoom) + 1;
      return {
        ...cand,
        'Phòng thi': roomNo,
        STT_Phong: seqInRoom,
        TT: idx + 1,
      };
    });

    return { assignedCandidates: assigned, totalRooms };
  }

  // PHƯƠNG ÁN 1 (MẶC ĐỊNH - CHUẨN 100% BỘ GD&ĐT):
  // Thí sinh cố định 1 SBD, 1 Phòng thi duy nhất suốt toàn bộ kỳ thi từ Văn, Toán đến TC1, TC2!
  const rooms = Array.from(new Set(candidates.map(c => c['Phòng thi']))).filter(Boolean);
  const totalRooms = rooms.length > 0 ? Math.max(...rooms) : 0;
  return { assignedCandidates: candidates, totalRooms };
}

/**
 * Xuất File Phiếu thu bài môn bắt buộc (Ngữ văn: M1 hoặc Toán: M2):
 * - Nếu là Chuẩn Bộ GD&ĐT (Phương án 1): Giữ nguyên phòng thi cố định của từng thí sinh, đồng bộ với Ca 1 & Ca 2.
 * - Nếu là Tách 2 giai đoạn (Phương án 2): Chia phòng theo SBD Alphabet tuần tự.
 */
export async function exportCompulsoryAttendanceExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig,
  subjectName: 'Ngữ văn' | 'Toán',
  subjectKey: 'M1' | 'M2',
  customColumns?: ColumnDefinition[]
) {
  const model = config.roomAssignmentModel || 'moet_fixed';
  const { assignedCandidates } = getCompulsoryCandidateAssignments(candidates, config.maxPerRoom || 24, model);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const activeCols = (customColumns && customColumns.length > 0 ? customColumns : DEFAULT_ATTENDANCE_COLUMNS).filter(
    c => c.enabled !== false
  );
  const totalColsCount = Math.max(1, activeCols.length);
  const endColLetter = getColLetter(totalColsCount);
  const fitCols = calculateFitWidths(activeCols, 85);

  const halfColIdx = Math.max(1, Math.floor(totalColsCount / 2));
  const halfColLetter = getColLetter(halfColIdx);
  const nextColLetter = getColLetter(Math.min(totalColsCount, halfColIdx + 1));

  const roomsMap = new Map<number, CandidateAssigned[]>();
  assignedCandidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) roomsMap.set(rNo, []);
    roomsMap.get(rNo)!.push(c);
  });

  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  sortedRooms.forEach((roomNo) => {
    const roomCandidates = sortCandidatesInRoomForShift(roomsMap.get(roomNo) || [], 'M1', config.sortSbdAscendingInRoom ?? true);
    const roomCode = getRoomCode(roomNo, config.startRoomCode);
    const sheetTitle = `P_${roomCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 31);
    const ws = workbook.addWorksheet(sheetTitle, {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: totalColsCount > 9 ? 'landscape' : 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3
        }
      }
    });

    ws.columns = fitCols.map((fc, i) => ({
      key: `col_${i + 1}`,
      width: fc.width
    }));

    // Header
    ws.mergeCells(`A1:${halfColLetter}1`);
    const cellA1 = ws.getCell('A1');
    cellA1.value = config.deptName ? config.deptName.trim().toUpperCase() : '';
    cellA1.font = { name: 'Times New Roman', size: 10, bold: true };
    cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${nextColLetter}1:${endColLetter}1`);
    const cellE1 = ws.getCell(`${nextColLetter}1`);
    cellE1.value = (config.countryTitle !== undefined ? config.countryTitle.trim() : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase();
    cellE1.font = { name: 'Times New Roman', size: 10, bold: true };
    cellE1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`A2:${halfColLetter}2`);
    const cellA2 = ws.getCell('A2');
    cellA2.value = config.schoolName ? config.schoolName.trim().toUpperCase() : '';
    cellA2.font = { name: 'Times New Roman', size: 9.5, bold: true, underline: true };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${nextColLetter}2:${endColLetter}2`);
    const cellE2 = ws.getCell(`${nextColLetter}2`);
    cellE2.value = config.mottoTitle !== undefined ? config.mottoTitle.trim() : 'Độc lập - Tự do - Hạnh phúc';
    cellE2.font = { name: 'Times New Roman', size: 9.5, bold: true, underline: true };
    cellE2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tiêu đề
    ws.mergeCells(`A4:${endColLetter}4`);
    const cellA4 = ws.getCell('A4');
    cellA4.value = 'DANH SÁCH THÍ SINH DÁN PHÒNG & PHIẾU THU BÀI THI';
    cellA4.font = { name: 'Times New Roman', size: 13, bold: true };
    cellA4.alignment = { horizontal: 'center', vertical: 'middle' };

    const examFullTitle = `${config.examCategory} (${config.subPeriod})`;
    ws.mergeCells(`A5:${endColLetter}5`);
    const cellA5 = ws.getCell('A5');
    cellA5.value = `KỲ THI: ${examFullTitle.toUpperCase()} - MÔN BẮT BUỘC: ${subjectName.toUpperCase()} (${config.schoolYear})`;
    cellA5.font = { name: 'Times New Roman', size: 10.5, bold: true };
    cellA5.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`A6:${endColLetter}6`);
    const cellA6 = ws.getCell('A6');
    cellA6.value = `Điểm thi: ${config.examCenterCode}   |   Phòng thi số: ${roomCode}   |   Môn thi: ${subjectName}`;
    cellA6.font = { name: 'Times New Roman', size: 10.5, bold: true };
    cellA6.alignment = { horizontal: 'center', vertical: 'middle' };

    // Bảng dữ liệu
    const startRow = 8;
    const headerRow = ws.getRow(startRow);
    headerRow.height = 26;

    activeCols.forEach((colDef, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = colDef.headerName;
      cell.font = { name: 'Times New Roman', size: 10, bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    let currentRowIndex = startRow + 1;

    roomCandidates.forEach((cand, candIdx) => {
      const row = ws.getRow(currentRowIndex);
      row.height = 22;

      activeCols.forEach((colDef, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let val = '';

        if (colDef.id === 'att_stt' || colDef.fieldKey === 'STT_Phong') {
          val = String(candIdx + 1);
        } else if (colDef.id === 'att_sbd' || colDef.fieldKey === 'SBD') {
          val = String(cand.SBD || '');
        } else if (colDef.id === 'att_hoten' || colDef.fieldKey === 'Họ tên') {
          val = String(cand['Họ tên'] || '');
        } else if (colDef.id === 'att_ngaysinh' || colDef.fieldKey === 'Ngày sinh') {
          val = String(cand['Ngày sinh'] || '');
        } else if (colDef.id === 'att_lop' || colDef.fieldKey === 'Lớp') {
          val = String(cand.Lớp || '');
        } else if (colDef.id === 'att_made' || colDef.headerName.toLowerCase().includes('mã đề')) {
          // Luôn để trống cho Giám thị ghi số mã đề/số tờ khi thu bài
          val = '';
        } else if (colDef.id === 'att_kynop' || colDef.headerName.toLowerCase().includes('ký nộp')) {
          // Luôn để trống cho thí sinh ký nộp bài
          val = '';
        } else if (colDef.id === 'att_ghichu' || colDef.headerName.toLowerCase().includes('ghi chú')) {
          // Môn Bắt buộc (Ngữ văn, Toán): 100% thí sinh cùng thi chung 1 môn, tiêu đề đã ghi rõ
          // Cột Ghi chú để trống hoàn toàn để tránh thừa thãi (chỉ ghi chú hành chính nếu có)
          const rawNote = colDef.fieldKey && cand[colDef.fieldKey] ? String(cand[colDef.fieldKey]).trim() : '';
          const isStaleSubjectNote = rawNote && (
            rawNote.toLowerCase().includes('văn') ||
            rawNote.toLowerCase().includes('toán') ||
            rawNote.toLowerCase().includes('vật lí') ||
            rawNote.toLowerCase().includes('hóa học') ||
            rawNote.toLowerCase().startsWith('môn:')
          );
          val = isStaleSubjectNote ? '' : rawNote;
        } else if (colDef.fieldKey && cand[colDef.fieldKey] !== undefined) {
          val = String(cand[colDef.fieldKey]);
        } else if (colDef.defaultValue !== undefined) {
          val = colDef.defaultValue;
        }

        cell.value = val;
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        cell.alignment = { horizontal: colDef.align || 'center', vertical: 'middle' };
      });

      currentRowIndex++;
    });

    // Footer
    const totalInRoom = roomCandidates.length;
    const sumRowIdx = currentRowIndex + 1;
    ws.mergeCells(`A${sumRowIdx}:${endColLetter}${sumRowIdx}`);
    const sumCell = ws.getCell(`A${sumRowIdx}`);
    sumCell.value = `- Tổng số thí sinh theo danh sách phòng thi: ${String(totalInRoom).padStart(2, '0')} thí sinh.`;
    sumCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
    sumCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const countRowIdx = sumRowIdx + 1;
    ws.mergeCells(`A${countRowIdx}:${endColLetter}${countRowIdx}`);
    const countCell = ws.getCell(`A${countRowIdx}`);
    countCell.value = '- Số thí sinh có mặt: .......... | Số thí sinh vắng: .......... (Số báo danh vắng: .......................................)';
    countCell.font = { name: 'Times New Roman', size: 10, bold: true };
    countCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const noteRowIdx = countRowIdx + 1;
    ws.mergeCells(`A${noteRowIdx}:${endColLetter}${noteRowIdx}`);
    const noteCell = ws.getCell(`A${noteRowIdx}`);
    noteCell.value = '* Lưu ý: Giám thị kiểm tra kỹ SBD, số tờ giấy thi và yêu cầu thí sinh ký nộp bài đầy đủ trước khi rời phòng thi.';
    noteCell.font = { name: 'Times New Roman', size: 9.5, italic: true };
    noteCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const dateRowIdx = noteRowIdx + 2;
    const dateStartCol = Math.max(1, totalColsCount - 2);
    const dateStr = config.dateLine !== undefined
      ? config.dateLine.trim()
      : (config.locationName && config.locationName.trim()
          ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
          : 'Ngày ..... tháng ..... năm 20.....');

    if (dateStr) {
      ws.mergeCells(`${getColLetter(dateStartCol)}${dateRowIdx}:${endColLetter}${dateRowIdx}`);
      const dateCell = ws.getCell(`${getColLetter(dateStartCol)}${dateRowIdx}`);
      dateCell.value = dateStr;
      dateCell.font = { name: 'Times New Roman', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const sigTitleRowIdx = dateRowIdx + 1;
    const sigSubRowIdx = sigTitleRowIdx + 1;
    const sig1End = Math.max(1, Math.min(3, halfColIdx));

    const sup1Text = (config.supervisor1Title ?? '').trim();
    if (sup1Text) {
      ws.mergeCells(`A${sigTitleRowIdx}:${getColLetter(sig1End)}${sigTitleRowIdx}`);
      const sig1Title = ws.getCell(`A${sigTitleRowIdx}`);
      sig1Title.value = sup1Text.toUpperCase();
      sig1Title.font = { name: 'Times New Roman', size: 10, bold: true };
      sig1Title.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`A${sigSubRowIdx}:${getColLetter(sig1End)}${sigSubRowIdx}`);
      const sig1Sub = ws.getCell(`A${sigSubRowIdx}`);
      sig1Sub.value = '(Ký và ghi rõ họ tên)';
      sig1Sub.font = { name: 'Times New Roman', size: 9, italic: true };
      sig1Sub.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const sup2Text = (config.supervisor2Title ?? '').trim();
    if (sup2Text) {
      ws.mergeCells(`${getColLetter(dateStartCol)}${sigTitleRowIdx}:${endColLetter}${sigTitleRowIdx}`);
      const sig2Title = ws.getCell(`${getColLetter(dateStartCol)}${sigTitleRowIdx}`);
      sig2Title.value = sup2Text.toUpperCase();
      sig2Title.font = { name: 'Times New Roman', size: 10, bold: true };
      sig2Title.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(`${getColLetter(dateStartCol)}${sigSubRowIdx}:${endColLetter}${sigSubRowIdx}`);
      const sig2Sub = ws.getCell(`${getColLetter(dateStartCol)}${sigSubRowIdx}`);
      sig2Sub.value = '(Ký và ghi rõ họ tên)';
      sig2Sub.font = { name: 'Times New Roman', size: 9, italic: true };
      sig2Sub.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  const filename = subjectName === 'Ngữ văn'
    ? 'File1_Phieu_Thu_Bai_NguVan.xlsx'
    : 'File1_Phieu_Thu_Bai_Toan.xlsx';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

/**
 * Xuất Bảng Thống kê Môn bắt buộc (Toán - Ngữ văn)
 * Bang_Thong_Ke_Mon_Chung.xlsx
 * Cấu trúc: TT, Phòng, Môn thi, Tổng số thí sinh
 */
export async function exportCompulsoryShiftSummaryExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig
) {
  const model = config.roomAssignmentModel || 'moet_fixed';
  const { assignedCandidates } = getCompulsoryCandidateAssignments(candidates, config.maxPerRoom || 24, model);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Thong_Ke_Mon_Chung', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.6, right: 0.5, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 }
    }
  });

  ws.columns = [
    { key: 'col1', width: 8 },   // TT
    { key: 'col2', width: 18 },  // Phòng
    { key: 'col3', width: 44 },  // Các môn
    { key: 'col4', width: 22 },  // Tổng số thí sinh
  ];

  // 1. Header
  ws.mergeCells('A1:B1');
  const cA1 = ws.getCell('A1');
  cA1.value = (config.deptName || '').toUpperCase();
  cA1.font = { name: 'Times New Roman', size: 11, bold: true };
  cA1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('C1:D1');
  const cC1 = ws.getCell('C1');
  cC1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cC1.font = { name: 'Times New Roman', size: 11, bold: true };
  cC1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:B2');
  const cA2 = ws.getCell('A2');
  cA2.value = (config.schoolName || '').toUpperCase();
  cA2.font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
  cA2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('C2:D2');
  const cC2 = ws.getCell('C2');
  cC2.value = 'Độc lập - Tự do - Hạnh phúc';
  cC2.font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
  cC2.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Tiêu đề
  const examFullTitle = `${config.examCategory || ''} (${config.subPeriod || ''})`;
  ws.mergeCells('A4:D4');
  const cA4 = ws.getCell('A4');
  cA4.value = `BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG`;
  cA4.font = { name: 'Times New Roman', size: 13, bold: true };
  cA4.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A5:D5');
  const cA5 = ws.getCell('A5');
  cA5.value = `KỲ THI: ${examFullTitle.toUpperCase()} - MÔN BẮT BUỘC: TOÁN & NGỮ VĂN (${config.schoolYear || ''})`;
  cA5.font = { name: 'Times New Roman', size: 11, bold: true };
  cA5.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A6:D6');
  const cA6 = ws.getCell('A6');
  cA6.value = `Điểm thi: ${config.examCenterCode}   |   Hội đồng coi thi: ${config.schoolName}`;
  cA6.font = { name: 'Times New Roman', size: 11, italic: true };
  cA6.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Table Header
  const startRow = 8;
  const headers = ['TT', 'Phòng', 'Các môn', 'Tổng số thí sinh'];
  const hRow = ws.getRow(startRow);
  hRow.height = 26;

  headers.forEach((hText, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = hText;
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  const roomsMap = new Map<number, CandidateAssigned[]>();
  assignedCandidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) roomsMap.set(rNo, []);
    roomsMap.get(rNo)!.push(c);
  });

  let currentRow = startRow + 1;
  let totalCandidatesCount = 0;
  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  sortedRooms.forEach((rNo, idx) => {
    const rCand = roomsMap.get(rNo) || [];
    const count = rCand.length;
    totalCandidatesCount += count;
    const roomCode = getRoomCode(rNo, config.startRoomCode);

    const row = ws.getRow(currentRow);
    row.height = 22;

    const c1 = row.getCell(1);
    c1.value = idx + 1;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };

    const c2 = row.getCell(2);
    c2.value = `Phòng ${roomCode}`;
    c2.alignment = { horizontal: 'center', vertical: 'middle' };

    const c3 = row.getCell(3);
    c3.value = 'Ngữ văn, Toán';
    c3.alignment = { horizontal: 'center', vertical: 'middle' };

    const c4 = row.getCell(4);
    c4.value = count;
    c4.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let col = 1; col <= 4; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    currentRow++;
  });

  // Dòng tổng kết
  const totalRow = ws.getRow(currentRow);
  totalRow.height = 24;
  ws.mergeCells(`A${currentRow}:C${currentRow}`);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'TỔNG CỘNG:';
  totalLabel.font = { name: 'Times New Roman', size: 11, bold: true };
  totalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const totalVal = totalRow.getCell(4);
  totalVal.value = totalCandidatesCount;
  totalVal.font = { name: 'Times New Roman', size: 11, bold: true };
  totalVal.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let col = 1; col <= 4; col++) {
    const cell = totalRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // 4. Footer & Form chữ ký
  const dateRowIdx = currentRow + 2;
  const dateStr = config.dateLine !== undefined
    ? config.dateLine.trim()
    : (config.locationName && config.locationName.trim()
        ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
        : 'Ngày ..... tháng ..... năm 20.....');

  if (dateStr) {
    ws.mergeCells(`C${dateRowIdx}:D${dateRowIdx}`);
    const dateCell = ws.getCell(`C${dateRowIdx}`);
    dateCell.value = dateStr;
    dateCell.font = { name: 'Times New Roman', size: 11, italic: true };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const sigRow1 = dateRowIdx + 1;
  const sigRow2 = sigRow1 + 1;

  ws.mergeCells(`A${sigRow1}:B${sigRow1}`);
  const s1 = ws.getCell(`A${sigRow1}`);
  s1.value = 'NGƯỜI LẬP BẢNG';
  s1.font = { name: 'Times New Roman', size: 11, bold: true };
  s1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A${sigRow2}:B${sigRow2}`);
  const sub1 = ws.getCell(`A${sigRow2}`);
  sub1.value = '(Ký và ghi rõ họ tên)';
  sub1.font = { name: 'Times New Roman', size: 10, italic: true };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };

  const leadLabel = (config.leaderTitle ?? '').trim() || 'TRƯỞNG ĐIỂM THI';
  ws.mergeCells(`C${sigRow1}:D${sigRow1}`);
  const s2 = ws.getCell(`C${sigRow1}`);
  s2.value = leadLabel.toUpperCase();
  s2.font = { name: 'Times New Roman', size: 11, bold: true };
  s2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`C${sigRow2}:D${sigRow2}`);
  const sub2 = ws.getCell(`C${sigRow2}`);
  sub2.value = '(Ký, đóng dấu và ghi rõ họ tên)';
  sub2.font = { name: 'Times New Roman', size: 10, italic: true };
  sub2.alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'Bang_Thong_Ke_Mon_Chung.xlsx');
}

/**
 * Xuất Bảng Ma trận số lượng đề thi theo từng phòng thi (Dành riêng cho Ban In sao đề thi & Điểm thi)
 * Chuẩn Bộ GD&ĐT: Giúp in sao chính xác số lượng từng môn cho từng phòng thi.
 */
export async function exportExamPaperMatrixExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig
) {
  const matrix = calculateExamPaperMatrix(candidates, config.startRoomCode);
  const { subjects, rooms, totalsBySubject, totalCandidates } = matrix;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Ma_Tran_So_Luong_De_Thi', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    }
  });

  // Số lượng cột: TT (1) + Phòng (2) + Sĩ số (3) + Các môn (N) + Tổng lượt thi (1)
  const totalCols = 3 + subjects.length + 1;
  const endColLetter = getColLetter(totalCols);

  // Định nghĩa độ rộng các cột
  const colWidths: { key: string; width: number }[] = [
    { key: 'tt', width: 6 },
    { key: 'room', width: 14 },
    { key: 'totalInRoom', width: 11 },
  ];
  subjects.forEach((s, idx) => {
    colWidths.push({ key: `subj_${idx}`, width: Math.max(10, Math.min(14, s.length * 1.3)) });
  });
  colWidths.push({ key: 'totalExams', width: 14 });
  ws.columns = colWidths;

  // 1. Header cấp trên
  const halfCol = Math.max(2, Math.floor(totalCols / 2));
  const halfLetter = getColLetter(halfCol);
  const nextLetter = getColLetter(halfCol + 1);

  ws.mergeCells(`A1:${halfLetter}1`);
  const cA1 = ws.getCell('A1');
  cA1.value = config.deptName ? config.deptName.trim().toUpperCase() : '';
  cA1.font = { name: 'Times New Roman', size: 10.5, bold: true };
  cA1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${nextLetter}1:${endColLetter}1`);
  const cR1 = ws.getCell(`${nextLetter}1`);
  cR1.value = (config.countryTitle !== undefined ? config.countryTitle.trim() : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase();
  cR1.font = { name: 'Times New Roman', size: 10.5, bold: true };
  cR1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A2:${halfLetter}2`);
  const cA2 = ws.getCell('A2');
  cA2.value = config.schoolName ? config.schoolName.trim().toUpperCase() : '';
  cA2.font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
  cA2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${nextLetter}2:${endColLetter}2`);
  const cR2 = ws.getCell(`${nextLetter}2`);
  cR2.value = config.mottoTitle !== undefined ? config.mottoTitle.trim() : 'Độc lập - Tự do - Hạnh phúc';
  cR2.font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
  cR2.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Tiêu đề chính
  ws.mergeCells(`A4:${endColLetter}4`);
  const cA4 = ws.getCell('A4');
  cA4.value = 'BẢNG MA TRẬN SỐ LƯỢNG ĐỀ THI & THÍ SINH DỰ THI THEO TỪNG PHÒNG';
  cA4.font = { name: 'Times New Roman', size: 13.5, bold: true, color: { argb: 'FF1E3A8A' } };
  cA4.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A5:${endColLetter}5`);
  const cA5 = ws.getCell('A5');
  const examFullTitle = `${config.examCategory} (${config.subPeriod})`;
  cA5.value = `KỲ THI: ${examFullTitle.toUpperCase()} - NĂM HỌC: ${config.schoolYear}  |  BAN IN SAO ĐỀ THI & ĐIỂM THI: ${config.examCenterCode}`;
  cA5.font = { name: 'Times New Roman', size: 11, bold: true };
  cA5.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A6:${endColLetter}6`);
  const cA6 = ws.getCell('A6');
  cA6.value = `(Căn cứ số lượng đăng ký thực tế của thí sinh tại từng phòng thi cố định để in sao đóng gói đề thi)`;
  cA6.font = { name: 'Times New Roman', size: 10, italic: true };
  cA6.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Tiêu đề bảng ma trận
  const startRow = 8;
  const hRow = ws.getRow(startRow);
  hRow.height = 28;

  hRow.getCell(1).value = 'TT';
  hRow.getCell(2).value = 'Phòng thi';
  hRow.getCell(3).value = 'Sĩ số phòng';

  subjects.forEach((s, idx) => {
    hRow.getCell(4 + idx).value = s;
  });
  hRow.getCell(totalCols).value = 'Tổng số đề';

  for (let c = 1; c <= totalCols; c++) {
    const cell = hRow.getCell(c);
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Deep Navy
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // 4. Đổ dữ liệu từng phòng
  let currentRow = startRow + 1;
  let grandTotalExamPapers = 0;

  rooms.forEach((r, rIdx) => {
    const row = ws.getRow(currentRow);
    row.height = 20;

    row.getCell(1).value = r.tt;
    row.getCell(2).value = r.roomName;
    row.getCell(3).value = r.totalCandidates;

    let roomExamCount = 0;
    subjects.forEach((s, sIdx) => {
      const count = r.countsBySubject[s] || 0;
      roomExamCount += count;
      const cell = row.getCell(4 + sIdx);
      cell.value = count > 0 ? count : '-';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (count > 0) {
        cell.font = { name: 'Times New Roman', size: 10.5, bold: true };
      }
    });

    grandTotalExamPapers += roomExamCount;
    const totalCell = row.getCell(totalCols);
    totalCell.value = roomExamCount;
    totalCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Format viền và căn lề các ô cơ bản
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

    const isEven = rIdx % 2 === 1;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      if (!cell.font) cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    }

    currentRow++;
  });

  // 5. Dòng Tổng cộng
  const totalRow = ws.getRow(currentRow);
  totalRow.height = 25;
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'TỔNG CỘNG TOÀN TRƯỜNG:';
  totalLabel.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  totalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  totalRow.getCell(3).value = totalCandidates;
  totalRow.getCell(3).font = { name: 'Times New Roman', size: 11, bold: true };
  totalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

  subjects.forEach((s, sIdx) => {
    const tCell = totalRow.getCell(4 + sIdx);
    tCell.value = totalsBySubject[s] || 0;
    tCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1D4ED8' } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const grandCell = totalRow.getCell(totalCols);
  grandCell.value = grandTotalExamPapers;
  grandCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF15803D' } };
  grandCell.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= totalCols; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' } // Slate-200
    };
    cell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' }
    };
  }

  // 6. Chữ ký
  const dateRowIdx = currentRow + 2;
  const dateStr = config.dateLine !== undefined
    ? config.dateLine.trim()
    : (config.locationName && config.locationName.trim()
        ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
        : 'Ngày ..... tháng ..... năm 20.....');

  if (dateStr) {
    const sigDateStartCol = Math.max(totalCols - 3, halfCol + 1);
    ws.mergeCells(`${getColLetter(sigDateStartCol)}${dateRowIdx}:${endColLetter}${dateRowIdx}`);
    const dCell = ws.getCell(`${getColLetter(sigDateStartCol)}${dateRowIdx}`);
    dCell.value = dateStr;
    dCell.font = { name: 'Times New Roman', size: 10.5, italic: true };
    dCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const sig1Row = dateRowIdx + 1;
  const sig2Row = sig1Row + 1;

  ws.mergeCells(`A${sig1Row}:${getColLetter(Math.min(4, halfCol))}${sig1Row}`);
  const s1 = ws.getCell(`A${sig1Row}`);
  s1.value = 'NGƯỜI LẬP BẢNG';
  s1.font = { name: 'Times New Roman', size: 10.5, bold: true };
  s1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A${sig2Row}:${getColLetter(Math.min(4, halfCol))}${sig2Row}`);
  const sub1 = ws.getCell(`A${sig2Row}`);
  sub1.value = '(Ký và ghi rõ họ tên)';
  sub1.font = { name: 'Times New Roman', size: 9.5, italic: true };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };

  const sigLeaderCol = Math.max(totalCols - 3, halfCol + 1);
  const leadLabel = (config.leaderTitle ?? '').trim() || 'TRƯỞNG ĐIỂM THI';
  ws.mergeCells(`${getColLetter(sigLeaderCol)}${sig1Row}:${endColLetter}${sig1Row}`);
  const s2 = ws.getCell(`${getColLetter(sigLeaderCol)}${sig1Row}`);
  s2.value = leadLabel.toUpperCase();
  s2.font = { name: 'Times New Roman', size: 10.5, bold: true };
  s2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${getColLetter(sigLeaderCol)}${sig2Row}:${endColLetter}${sig2Row}`);
  const sub2 = ws.getCell(`${getColLetter(sigLeaderCol)}${sig2Row}`);
  sub2.value = '(Ký, đóng dấu và ghi rõ họ tên)';
  sub2.font = { name: 'Times New Roman', size: 9.5, italic: true };
  sub2.alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'Bang_Ma_Tran_So_Luong_De_Thi_Theo_Phong.xlsx');
}

/**
 * Xuất Toàn bộ Phiếu thu bài & Danh sách dán phòng CỐ ĐỊNH CHUẨN BỘ GD&ĐT (Cả 4 môn trong 1 file Excel)
 * File gồm N sheet (tương ứng từng phòng thi cố định từ 1 đến N).
 * Mỗi sheet hiển thị đầy đủ thông tin thí sinh, các môn thi M1 (Văn), M2 (Toán), Ca 1 (TC1), Ca 2 (TC2),
 * và các ô ký nộp bài cho từng buổi thi tương ứng.
 */
export async function exportMOETFixedRoomsAttendanceExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) roomsMap.set(rNo, []);
    roomsMap.get(rNo)!.push(c);
  });

  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  sortedRooms.forEach((rNo) => {
    const roomCandidates = sortCandidatesInRoomForShift(roomsMap.get(rNo) || [], 'ToHop_ChuanHoa', config.sortSbdAscendingInRoom ?? true);
    const roomCode = getRoomCode(rNo, config.startRoomCode);
    const sheetTitle = `P_${roomCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 31);

    const ws = workbook.addWorksheet(sheetTitle, {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
      }
    });

    // 10 Cột tối ưu khổ A4 ngang:
    // 1: TT (5.5) | 2: SBD (13) | 3: Họ và tên (28) | 4: Ngày sinh (12) | 5: Lớp (8)
    // 6: Ngữ văn (Ký nộp) (14) | 7: Toán (Ký nộp) (14) | 8: Ca 1 (Môn + Ký) (20) | 9: Ca 2 (Môn + Ký) (20) | 10: Ghi chú (10)
    ws.columns = [
      { key: 'col_tt', width: 5.5 },
      { key: 'col_sbd', width: 13 },
      { key: 'col_hoten', width: 27 },
      { key: 'col_ngaysinh', width: 12 },
      { key: 'col_lop', width: 8.5 },
      { key: 'col_m1', width: 15 },
      { key: 'col_m2', width: 15 },
      { key: 'col_tc1', width: 22 },
      { key: 'col_tc2', width: 22 },
      { key: 'col_ghichu', width: 11 }
    ];

    const totalCols = 10;
    const endColLetter = 'J';

    // Header cấp trên
    ws.mergeCells('A1:E1');
    const uCell = ws.getCell('A1');
    uCell.value = config.deptName ? config.deptName.trim().toUpperCase() : '';
    uCell.font = { name: 'Times New Roman', size: 10, bold: true };
    uCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('F1:J1');
    const qCell = ws.getCell('F1');
    qCell.value = (config.countryTitle !== undefined ? config.countryTitle.trim() : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase();
    qCell.font = { name: 'Times New Roman', size: 10, bold: true };
    qCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A2:E2');
    const sCell = ws.getCell('A2');
    sCell.value = config.schoolName ? config.schoolName.trim().toUpperCase() : '';
    sCell.font = { name: 'Times New Roman', size: 9.5, bold: true, underline: true };
    sCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('F2:J2');
    const qSubCell = ws.getCell('F2');
    qSubCell.value = config.mottoTitle !== undefined ? config.mottoTitle.trim() : 'Độc lập - Tự do - Hạnh phúc';
    qSubCell.font = { name: 'Times New Roman', size: 9.5, bold: true, underline: true };
    qSubCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tiêu đề chính
    ws.mergeCells('A4:J4');
    const tCell = ws.getCell('A4');
    tCell.value = 'DANH SÁCH THÍ SINH DÁN PHÒNG & PHIẾU THU BÀI THI TỔNG HỢP';
    tCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A5:J5');
    const subCell = ws.getCell('A5');
    const examFullTitle = `${config.examCategory} (${config.subPeriod})`;
    subCell.value = `KỲ THI: ${examFullTitle.toUpperCase()} - NĂM HỌC: ${config.schoolYear}  |  PHÒNG THI: ${roomCode}  |  SĨ SỐ: ${roomCandidates.length} THÍ SINH`;
    subCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A6:J6');
    const noticeCell = ws.getCell('A6');
    noticeCell.value = `Điểm thi: ${config.examCenterCode}   |   Hội đồng coi thi: ${config.schoolName}   |   (Phòng thi & Số báo danh cố định cho tất cả các buổi thi)`;
    noticeCell.font = { name: 'Times New Roman', size: 10, italic: true };
    noticeCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tiêu đề bảng 2 tầng
    const rH1 = 8;
    const rH2 = 9;
    ws.getRow(rH1).height = 18;
    ws.getRow(rH2).height = 20;

    // Merge các cột thông tin
    ws.mergeCells(`A${rH1}:A${rH2}`);
    ws.getCell(`A${rH1}`).value = 'TT';
    ws.mergeCells(`B${rH1}:B${rH2}`);
    ws.getCell(`B${rH1}`).value = 'SBD';
    ws.mergeCells(`C${rH1}:C${rH2}`);
    ws.getCell(`C${rH1}`).value = 'Họ và tên thí sinh';
    ws.mergeCells(`D${rH1}:D${rH2}`);
    ws.getCell(`D${rH1}`).value = 'Ngày sinh';
    ws.mergeCells(`E${rH1}:E${rH2}`);
    ws.getCell(`E${rH1}`).value = 'Lớp';

    // Merge phần Ký nộp bài
    ws.mergeCells(`F${rH1}:I${rH1}`);
    const signHead = ws.getCell(`F${rH1}`);
    signHead.value = 'Chữ ký thí sinh nộp bài thi theo từng buổi thi';

    ws.getCell(`F${rH2}`).value = 'Môn 1 (Ngữ văn)';
    ws.getCell(`G${rH2}`).value = 'Môn 2 (Toán)';
    ws.getCell(`H${rH2}`).value = 'Ca 1 (Tự chọn 1)';
    ws.getCell(`I${rH2}`).value = 'Ca 2 (Tự chọn 2)';

    ws.mergeCells(`J${rH1}:J${rH2}`);
    ws.getCell(`J${rH1}`).value = 'Ghi chú';

    for (let r = rH1; r <= rH2; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: 'Times New Roman', size: 9.5, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    // Đổ dữ liệu từng thí sinh
    let currentRow = 10;
    const dataRowHeight = roomCandidates.length <= 20 ? 17 : roomCandidates.length <= 24 ? 15.5 : 13.8;

    roomCandidates.forEach((cand, cIdx) => {
      const row = ws.getRow(currentRow);
      row.height = dataRowHeight;

      row.getCell(1).value = cIdx + 1;
      row.getCell(2).value = String(cand.SBD || '');
      row.getCell(3).value = String(cand['Họ tên'] || '');
      row.getCell(4).value = String(cand['Ngày sinh'] || '');
      row.getCell(5).value = String(cand.Lớp || '');

      // M1 (Ngữ văn)
      const hasM1 = isSubjectRegistered(cand.M1);
      row.getCell(6).value = hasM1 ? '' : '---';

      // M2 (Toán)
      const hasM2 = isSubjectRegistered(cand.M2);
      row.getCell(7).value = hasM2 ? '' : '---';

      // Ca 1 (TC1)
      const hasTC1 = isSubjectRegistered(cand.TC1);
      row.getCell(8).value = hasTC1 ? `[${normalizeSubjectName(cand.TC1)}]` : '---';

      // Ca 2 (TC2)
      const hasTC2 = isSubjectRegistered(cand.TC2);
      row.getCell(9).value = hasTC2 ? `[${normalizeSubjectName(cand.TC2)}]` : '---';

      // Ghi chú
      const isFreeCandidate = !hasM1 || !hasM2 || !hasTC1 || !hasTC2;
      row.getCell(10).value = isFreeCandidate ? 'TS tự do' : '';

      // Formatting
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      const isEven = cIdx % 2 === 1;
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Times New Roman', size: 9.5 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        }
      }

      currentRow++;
    });

    // Thống kê cuối bảng
    const statsRow = ws.getRow(currentRow);
    statsRow.height = 18;
    ws.mergeCells(`A${currentRow}:J${currentRow}`);
    const statsCell = statsRow.getCell(1);
    statsCell.value = `Tổng số thí sinh theo danh sách phòng: ${roomCandidates.length}  |  Thí sinh có mặt: .........  |  Thí sinh vắng mặt: ......... (Số báo danh vắng: ........................................................)`;
    statsCell.font = { name: 'Times New Roman', size: 9.5, italic: true };
    statsCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Footer Chữ ký 2 Giám thị
    const dateRowIdx = currentRow + 1;
    const dateStr = config.dateLine !== undefined
      ? config.dateLine.trim()
      : (config.locationName && config.locationName.trim()
          ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
          : 'Ngày ..... tháng ..... năm 20.....');

    if (dateStr) {
      ws.mergeCells(`G${dateRowIdx}:J${dateRowIdx}`);
      const dCell = ws.getCell(`G${dateRowIdx}`);
      dCell.value = dateStr;
      dCell.font = { name: 'Times New Roman', size: 9.5, italic: true };
      dCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const sigRow1 = dateRowIdx + 1;
    const sigRow2 = sigRow1 + 1;

    ws.mergeCells(`B${sigRow1}:D${sigRow1}`);
    const sup1 = ws.getCell(`B${sigRow1}`);
    sup1.value = (config.supervisor1Title || 'GIÁM THỊ 1').toUpperCase();
    sup1.font = { name: 'Times New Roman', size: 9.5, bold: true };
    sup1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`B${sigRow2}:D${sigRow2}`);
    const sub1 = ws.getCell(`B${sigRow2}`);
    sub1.value = '(Ký và ghi rõ họ tên)';
    sub1.font = { name: 'Times New Roman', size: 9, italic: true };
    sub1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`G${sigRow1}:J${sigRow1}`);
    const sup2 = ws.getCell(`G${sigRow1}`);
    sup2.value = (config.supervisor2Title || 'GIÁM THỊ 2').toUpperCase();
    sup2.font = { name: 'Times New Roman', size: 9.5, bold: true };
    sup2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`G${sigRow2}:J${sigRow2}`);
    const sub2 = ws.getCell(`G${sigRow2}`);
    sub2.value = '(Ký và ghi rõ họ tên)';
    sub2.font = { name: 'Times New Roman', size: 9, italic: true };
    sub2.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const filename = 'File_Phieu_Thu_Bai_Va_Dan_Phong_Chuan_Bo.xlsx';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

/**
 * Xuất Sơ đồ Bố trí Số Báo Danh & Chỗ ngồi (TẤT CẢ CÁC PHÒNG 1 LƯỢT)
 * - Sheet 1: Danh sách Tổng hợp SBD & Vị trí Bàn thi toàn trường
 * - Sheet 2..N+1: Mô phỏng trực quan 4 Dãy x 6 Hàng bàn thi từng phòng, chuẩn in A4 Dọc
 */
export async function exportSeatingChartAllRoomsExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig,
  pattern: SeatingPattern = 'ziczac_horizontal',
  patternName: string = 'Ziczac ngang xuôi (Trái sang Phải từng hàng)',
  subjectName: string = 'Toán / Ngữ văn'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  // Gom nhóm thí sinh theo phòng thi
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) roomsMap.set(rNo, []);
    roomsMap.get(rNo)!.push(c);
  });
  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  // 1. SHEET TỔNG HỢP TOÀN BỘ SBD VÀ VỊ TRÍ CHỖ NGỒI TOÀN TRƯỜNG
  const masterSheet = workbook.addWorksheet('Tong_Hop_SBD_Va_Ban_Thi', {
    views: [{ showGridLines: true }]
  });

  masterSheet.columns = [
    { header: 'TT', key: 'tt', width: 6 },
    { header: 'Phòng', key: 'phong', width: 10 },
    { header: 'Mã phòng', key: 'ma_phong', width: 12 },
    { header: 'STT Phòng', key: 'stt_phong', width: 11 },
    { header: 'Số bàn', key: 'so_ban', width: 9 },
    { header: 'Thứ tự #', key: 'order_seq', width: 10 },
    { header: 'Số báo danh (SBD)', key: 'sbd', width: 18 },
    { header: 'Họ và tên thí sinh', key: 'hoten', width: 28 },
    { header: 'Ngày sinh', key: 'ngaysinh', width: 13 },
    { header: 'Lớp', key: 'lop', width: 10 },
    { header: 'Môn BB', key: 'mon_bb', width: 14 },
    { header: 'Môn Tự chọn (TC1, TC2)', key: 'mon_tc', width: 24 },
    { header: 'Tổ hợp chuẩn hóa', key: 'tohop', width: 22 }
  ];

  const mHeader = masterSheet.getRow(1);
  mHeader.height = 28;
  mHeader.eachCell(cell => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  let masterRowCounter = 1;
  sortedRooms.forEach(rNo => {
    const rCandidates = sortCandidatesInRoomForShift(roomsMap.get(rNo) || [], 'ToHop_ChuanHoa', config.sortSbdAscendingInRoom ?? true);
    const desks = computeRoomDeskMatrix(rCandidates, pattern);
    const roomCode = getRoomCode(rNo, config.startRoomCode);

    desks.forEach(desk => {
      if (desk.candidateLeft) {
        const cand = desk.candidateLeft;
        const row = masterSheet.addRow({
          tt: masterRowCounter++,
          phong: `Phòng ${rNo}`,
          ma_phong: roomCode,
          stt_phong: cand.STT_Phong || '',
          so_ban: desk.deskNumber,
          order_seq: desk.orderSeq + 1,
          sbd: cand.SBD,
          hoten: cand['Họ tên'],
          ngaysinh: cand['Ngày sinh'],
          lop: cand.Lớp,
          mon_bb: `${cand.M1 || ''}${cand.M2 ? ', ' + cand.M2 : ''}`,
          mon_tc: `${cand.TC1 || ''}${cand.TC2 ? ', ' + cand.TC2 : ''}`,
          tohop: cand.ToHop_ChuanHoa || ''
        });

        row.font = { name: 'Times New Roman', size: 10.5 };
        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
        row.getCell(7).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        row.getCell(8).font = { name: 'Times New Roman', size: 10.5, bold: true };
        row.getCell(9).alignment = { horizontal: 'center' };
        row.getCell(10).alignment = { horizontal: 'center' };
      }

      // Nếu có thí sinh bên phải (trường hợp phòng > 24)
      if (desk.candidateRight) {
        const cand = desk.candidateRight;
        const row = masterSheet.addRow({
          tt: masterRowCounter++,
          phong: `Phòng ${rNo}`,
          ma_phong: roomCode,
          stt_phong: cand.STT_Phong || '',
          so_ban: `${desk.deskNumber} (P)`,
          order_seq: desk.orderSeq + 1,
          sbd: cand.SBD,
          hoten: cand['Họ tên'],
          ngaysinh: cand['Ngày sinh'],
          lop: cand.Lớp,
          mon_bb: `${cand.M1 || ''}${cand.M2 ? ', ' + cand.M2 : ''}`,
          mon_tc: `${cand.TC1 || ''}${cand.TC2 ? ', ' + cand.TC2 : ''}`,
          tohop: cand.ToHop_ChuanHoa || ''
        });
        row.font = { name: 'Times New Roman', size: 10.5 };
        row.alignment = { vertical: 'middle' };
        row.getCell(7).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
      }
    });
  });

  // 2. CÁC SHEET SƠ ĐỒ BỐ TRÍ TỪNG PHÒNG THI (Mỗi phòng 1 sheet A4 Dọc)
  sortedRooms.forEach((rNo) => {
    const rCandidates = sortCandidatesInRoomForShift(roomsMap.get(rNo) || [], 'ToHop_ChuanHoa', config.sortSbdAscendingInRoom ?? true);
    const roomCode = getRoomCode(rNo, config.startRoomCode);
    const sheetName = `SoDo_P${String(rNo).padStart(2, '0')}`;

    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
      }
    });

    // 4 Cột đại diện 4 Dãy bàn (Dãy 1..4)
    ws.columns = [
      { key: 'day_1', width: 23 },
      { key: 'day_2', width: 23 },
      { key: 'day_3', width: 23 },
      { key: 'day_4', width: 23 }
    ];

    // Header Trường & Quốc hiệu
    ws.mergeCells('A1:B1');
    const uCell = ws.getCell('A1');
    uCell.value = (config.deptName || 'SỞ GD&ĐT').toUpperCase();
    uCell.font = { name: 'Times New Roman', size: 10, bold: true };
    uCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('C1:D1');
    const qCell = ws.getCell('C1');
    qCell.value = (config.countryTitle || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase();
    qCell.font = { name: 'Times New Roman', size: 10, bold: true };
    qCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A2:B2');
    const sCell = ws.getCell('A2');
    sCell.value = (config.schoolName || 'TRƯỜNG THPT').toUpperCase();
    sCell.font = { name: 'Times New Roman', size: 10, bold: true };
    sCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('C2:D2');
    const mCell = ws.getCell('C2');
    mCell.value = config.mottoTitle || 'Độc lập - Tự do - Hạnh phúc';
    mCell.font = { name: 'Times New Roman', size: 10, italic: true };
    mCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tiêu đề sơ đồ
    ws.mergeCells('A4:D4');
    const titleCell = ws.getCell('A4');
    titleCell.value = 'SƠ ĐỒ BỐ TRÍ CHỖ NGỒI VÀ SỐ BÁO DANH PHÒNG THI';
    titleCell.font = { name: 'Times New Roman', size: 13, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A5:D5');
    const subTitle = ws.getCell('A5');
    subTitle.value = `Phòng thi: ${rNo} (${roomCode})  •  Môn thi: ${subjectName.toUpperCase()}  •  Sĩ số: ${rCandidates.length} thí sinh`;
    subTitle.font = { name: 'Times New Roman', size: 10.5, bold: true };
    subTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A6:D6');
    const patternCell = ws.getCell('A6');
    patternCell.value = `(Quy luật đánh số: ${patternName})`;
    patternCell.font = { name: 'Times New Roman', size: 9.5, italic: true };
    patternCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // BẢNG ĐEN / ĐẦU PHÒNG THI
    ws.mergeCells('A8:D8');
    const boardCell = ws.getCell('A8');
    boardCell.value = '[ BẢNG ĐEN / ĐẦU PHÒNG THI (HƯỚNG NHÌN TỪ TRÊN XUỐNG DÃY 1 → 4) ]';
    boardCell.font = { name: 'Times New Roman', size: 10, bold: true };
    boardCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    boardCell.alignment = { horizontal: 'center', vertical: 'middle' };
    boardCell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'medium' },
      right: { style: 'medium' }
    };
    ws.getRow(8).height = 24;

    // Tính ma trận 24 bàn và nhóm theo hàng
    const desks = computeRoomDeskMatrix(rCandidates, pattern);
    const rowsGrouped = groupDesksByRow(desks);

    let curRow = 10;
    const colLetters = ['A', 'B', 'C', 'D'];

    for (let r = 0; r < 6; r++) {
      const rowDesks = rowsGrouped[r] || [];
      const rHeader = curRow;
      const rSbd = curRow + 1;
      const rName = curRow + 2;
      const rClass = curRow + 3;

      ws.getRow(rHeader).height = 18;
      ws.getRow(rSbd).height = 22;
      ws.getRow(rName).height = 18;
      ws.getRow(rClass).height = 16;

      colLetters.forEach((colL, cIdx) => {
        const desk = rowDesks.find(d => d.col === cIdx);
        if (!desk) return;

        const cellHeader = ws.getCell(`${colL}${rHeader}`);
        cellHeader.value = `Bàn ${desk.deskNumber}  (Thứ tự #${desk.orderSeq + 1})`;
        cellHeader.font = { name: 'Times New Roman', size: 9, bold: true };
        cellHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cellHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        cellHeader.border = { top: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

        const cellSbd = ws.getCell(`${colL}${rSbd}`);
        cellSbd.value = desk.candidateLeft ? `SBD: ${desk.candidateLeft.SBD}` : '(Trống)';
        cellSbd.font = {
          name: 'Times New Roman',
          size: 12,
          bold: true,
          color: { argb: desk.candidateLeft ? 'FF1E3A8A' : 'FF94A3B8' }
        };
        cellSbd.alignment = { horizontal: 'center', vertical: 'middle' };
        cellSbd.border = { left: { style: 'medium' }, right: { style: 'medium' } };

        const cellName = ws.getCell(`${colL}${rName}`);
        cellName.value = desk.candidateLeft ? desk.candidateLeft['Họ tên'] : '';
        cellName.font = { name: 'Times New Roman', size: 10.5, bold: true };
        cellName.alignment = { horizontal: 'center', vertical: 'middle' };
        cellName.border = { left: { style: 'medium' }, right: { style: 'medium' } };

        const cellClass = ws.getCell(`${colL}${rClass}`);
        cellClass.value = desk.candidateLeft
          ? `Lớp: ${desk.candidateLeft.Lớp} ${desk.candidateLeft.ToHop_ChuanHoa ? `(${desk.candidateLeft.ToHop_ChuanHoa})` : ''}`
          : '';
        cellClass.font = { name: 'Times New Roman', size: 9, italic: true };
        cellClass.alignment = { horizontal: 'center', vertical: 'middle' };
        cellClass.border = { bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
      });

      curRow += 5; // Để trống 1 hàng giữa các hàng bàn
    }

    // PHÍA CUỐI PHÒNG THI
    ws.mergeCells(`A${curRow}:D${curRow}`);
    const footCell = ws.getCell(`A${curRow}`);
    footCell.value = '[ PHÍA CUỐI PHÒNG THI ]';
    footCell.font = { name: 'Times New Roman', size: 9, italic: true };
    footCell.alignment = { horizontal: 'center', vertical: 'middle' };
    curRow += 2;

    // Chữ ký Giám thị
    ws.mergeCells(`A${curRow}:B${curRow}`);
    const sup1 = ws.getCell(`A${curRow}`);
    sup1.value = (config.supervisor1Title || 'GIÁM THỊ 1').toUpperCase();
    sup1.font = { name: 'Times New Roman', size: 10, bold: true };
    sup1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`C${curRow}:D${curRow}`);
    const sup2 = ws.getCell(`C${curRow}`);
    sup2.value = (config.supervisor2Title || 'GIÁM THỊ 2').toUpperCase();
    sup2.font = { name: 'Times New Roman', size: 10, bold: true };
    sup2.alignment = { horizontal: 'center', vertical: 'middle' };

    curRow += 1;
    ws.mergeCells(`A${curRow}:B${curRow}`);
    const sub1 = ws.getCell(`A${curRow}`);
    sub1.value = '(Ký và ghi rõ họ tên)';
    sub1.font = { name: 'Times New Roman', size: 9, italic: true };
    sub1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`C${curRow}:D${curRow}`);
    const sub2 = ws.getCell(`C${curRow}`);
    sub2.value = '(Ký và ghi rõ họ tên)';
    sub2.font = { name: 'Times New Roman', size: 9, italic: true };
    sub2.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const filename = 'So_Do_Danh_SBD_Va_Cho_Ngoi_Tat_Ca_Cac_Phong.xlsx';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

/**
 * Xuất file Excel Thẻ Số Báo Danh dán bàn (Desk Labels) cho TẤT CẢ các phòng
 */
export async function exportDeskLabelsExcel(
  candidates: CandidateAssigned[],
  config: ExamConfig
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('The_SBD_Dan_Ban', {
    views: [{ showGridLines: true }]
  });

  ws.columns = [
    { header: 'TT', key: 'tt', width: 6 },
    { header: 'Số Báo Danh (SBD)', key: 'sbd', width: 20 },
    { header: 'Họ và tên thí sinh', key: 'hoten', width: 28 },
    { header: 'Ngày sinh', key: 'ngaysinh', width: 14 },
    { header: 'Lớp', key: 'lop', width: 10 },
    { header: 'Phòng thi', key: 'phong', width: 14 },
    { header: 'Mã phòng', key: 'ma_phong', width: 14 },
    { header: 'Số thứ tự phòng (Bàn thi)', key: 'stt_phong', width: 22 },
    { header: 'Tổ hợp môn tự chọn', key: 'tohop', width: 24 },
    { header: 'Môn bắt buộc', key: 'batbuoc', width: 16 }
  ];

  const header = ws.getRow(1);
  header.height = 26;
  header.eachCell(c => {
    c.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Sắp xếp theo Phòng thi -> Gom theo tổ hợp môn -> SBD tăng dần
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) roomsMap.set(rNo, []);
    roomsMap.get(rNo)!.push(c);
  });
  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);

  let globalIdx = 1;
  sortedRooms.forEach(rNo => {
    const rCandidates = sortCandidatesInRoomForShift(roomsMap.get(rNo) || [], 'ToHop_ChuanHoa', config.sortSbdAscendingInRoom ?? true);
    rCandidates.forEach((cand, candInRoomIdx) => {
      const row = ws.addRow({
        tt: globalIdx++,
        sbd: cand.SBD,
        hoten: cand['Họ tên'],
        ngaysinh: cand['Ngày sinh'],
        lop: cand.Lớp,
        phong: `Phòng ${cand['Phòng thi']}`,
        ma_phong: getRoomCode(cand['Phòng thi'], config.startRoomCode),
        stt_phong: `Bàn ${candInRoomIdx + 1}`,
        tohop: cand.ToHop_ChuanHoa || `${cand.TC1 || ''} - ${cand.TC2 || ''}`,
        batbuoc: `${cand.M1 || ''}, ${cand.M2 || ''}`
      });

      row.font = { name: 'Times New Roman', size: 10.5 };
      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(2).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F766E' } };
      row.getCell(3).font = { name: 'Times New Roman', size: 10.5, bold: true };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
    });
  });

  const filename = 'Danh_Sach_The_SBD_Dan_Ban_Tat_Ca_Cac_Phong.xlsx';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}




