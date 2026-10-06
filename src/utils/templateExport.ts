import ExcelJS from 'exceljs';
import { ExamCategory } from '../types';

/**
 * Tải file Excel mẫu chuẩn phục vụ việc nhập liệu và nạp vào hệ thống
 * Tự động tạo cấu trúc cột tương ứng với loại kỳ thi đang chọn
 */
export async function downloadSampleTemplateExcel(examCategory: ExamCategory = 'Kiểm tra định kỳ') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Xếp phòng thi & Xuất biểu mẫu';
  workbook.created = new Date();

  const isPeriodic = examCategory.includes('Kiểm tra');

  // Sheet 1: Danh sách thí sinh mẫu
  const ws = workbook.addWorksheet('Danh_Sach_Thi_Sinh', {
    views: [{ showGridLines: true }]
  });

  if (isPeriodic) {
    // ----------------------------------------------------
    // CỘT CHO KIỂM TRA ĐỊNH KỲ: TT, CCCD, Lớp, Họ và tên, Ngày sinh, Nhóm
    // ----------------------------------------------------
    ws.columns = [
      { header: 'TT', key: 'TT', width: 6 },
      { header: 'CCCD', key: 'CCCD', width: 16 },
      { header: 'Lớp', key: 'Lớp', width: 10 },
      { header: 'Họ và tên', key: 'Họ và tên', width: 26 },
      { header: 'Ngày sinh', key: 'Ngày sinh', width: 14 },
      { header: 'Nhóm', key: 'Nhóm', width: 24 },
      { header: 'Ghi chú', key: 'Ghi chú', width: 18 },
    ];
  } else {
    // ----------------------------------------------------
    // CỘT CHO THI THỬ / KHẢO SÁT: TT, CCCD, Lớp, Họ và tên, Ngày sinh, M1, M2, TC1, TC2 (Chưa có SBD)
    // ----------------------------------------------------
    ws.columns = [
      { header: 'TT', key: 'TT', width: 6 },
      { header: 'CCCD', key: 'CCCD', width: 16 },
      { header: 'Lớp', key: 'Lớp', width: 10 },
      { header: 'Họ và tên', key: 'Họ và tên', width: 26 },
      { header: 'Ngày sinh', key: 'Ngày sinh', width: 14 },
      { header: 'M1', key: 'M1', width: 12 },
      { header: 'M2', key: 'M2', width: 12 },
      { header: 'TC1', key: 'TC1', width: 16 },
      { header: 'TC2', key: 'TC2', width: 16 },
      { header: 'Ghi chú', key: 'Ghi chú', width: 18 },
    ];
  }

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Blue-800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Dữ liệu mẫu (Nhóm theo mã môn tự chọn thực tế như Địa-GDKPTL-CNCN-Tin)
  const sampleRows = isPeriodic
    ? [
        { TT: 1, CCCD: '064208001234', Lớp: '12A1', 'Họ và tên': 'Nguyễn Văn An', 'Ngày sinh': '15/02/2008', Nhóm: 'Địa-GDKPTL-CNCN-Tin', 'Ghi chú': '' },
        { TT: 2, CCCD: '064208001235', Lớp: '12A1', 'Họ và tên': 'Trần Thị Bình', 'Ngày sinh': '20/05/2008', Nhóm: 'Địa-GDKPTL-CNCN-Tin', 'Ghi chú': '' },
        { TT: 3, CCCD: '064208001236', Lớp: '12A1', 'Họ và tên': 'Lê Hoàng Cường', 'Ngày sinh': '10/08/2008', Nhóm: 'Sinh-GDKPTL-Địa-Tin', 'Ghi chú': '' },
        { TT: 4, CCCD: '064208001237', Lớp: '12A2', 'Họ và tên': 'Phạm Hải Đăng', 'Ngày sinh': '12/11/2008', Nhóm: 'Sinh-GDKPTL-Địa-Tin', 'Ghi chú': '' },
        { TT: 5, CCCD: '064208001238', Lớp: '12A2', 'Họ và tên': 'Vũ Thúy Hạnh', 'Ngày sinh': '03/01/2008', Nhóm: 'Địa-GDKPTL-CNNN-Tin', 'Ghi chú': '' },
        { TT: 6, CCCD: '064208001239', Lớp: '12A2', 'Họ và tên': 'Đặng Quốc Khánh', 'Ngày sinh': '18/07/2008', Nhóm: 'Địa-GDKPTL-CNNN-Tin', 'Ghi chú': '' },
        { TT: 7, CCCD: '064208001240', Lớp: '12A3', 'Họ và tên': 'Bùi Ngọc Lan', 'Ngày sinh': '25/09/2008', Nhóm: 'Lý-Hóa-Sinh-Tin', 'Ghi chú': '' },
        { TT: 8, CCCD: '064208001241', Lớp: '12A3', 'Họ và tên': 'Ngô Minh Nhật', 'Ngày sinh': '08/04/2008', Nhóm: 'Lý-Hóa-Sinh-Tin', 'Ghi chú': '' },
        { TT: 9, CCCD: '064208001242', Lớp: '12A4', 'Họ và tên': 'Dương Thu Phương', 'Ngày sinh': '14/10/2008', Nhóm: 'Lý-Hóa-CNCN-Tin', 'Ghi chú': '' },
        { TT: 10, CCCD: '064208001243', Lớp: '12A4', 'Họ và tên': 'Đỗ Hữu Quân', 'Ngày sinh': '30/03/2008', Nhóm: 'Lý-Hóa-CNCN-Tin', 'Ghi chú': '' },
        { TT: 11, CCCD: '064208001244', Lớp: '12A5', 'Họ và tên': 'Hồ Diệu Thảo', 'Ngày sinh': '22/06/2008', Nhóm: 'Địa-GDKPTL-CNCN-Tin', 'Ghi chú': '' },
        { TT: 12, CCCD: '064208001245', Lớp: '12A5', 'Họ và tên': 'Lý Văn Tiến', 'Ngày sinh': '09/12/2008', Nhóm: 'Lý-Hóa-Sinh-Tin', 'Ghi chú': '' },
      ]
    : [
        { TT: 1, CCCD: '064208001234', Lớp: '12A1', 'Họ và tên': 'Nguyễn Văn An', 'Ngày sinh': '15/02/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Vật lí', TC2: 'Hóa học', 'Ghi chú': '' },
        { TT: 2, CCCD: '064208001235', Lớp: '12A1', 'Họ và tên': 'Trần Thị Bình', 'Ngày sinh': '20/05/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Vật lí', TC2: 'Hóa học', 'Ghi chú': '' },
        { TT: 3, CCCD: '064208001236', Lớp: '12A1', 'Họ và tên': 'Lê Hoàng Cường', 'Ngày sinh': '10/08/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Vật lí', TC2: 'Sinh học', 'Ghi chú': '' },
        { TT: 4, CCCD: '064208001237', Lớp: '12A2', 'Họ và tên': 'Phạm Hải Đăng', 'Ngày sinh': '12/11/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Lịch sử', TC2: 'Địa lí', 'Ghi chú': '' },
        { TT: 5, CCCD: '064208001238', Lớp: '12A2', 'Họ và tên': 'Vũ Thúy Hạnh', 'Ngày sinh': '03/01/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Lịch sử', TC2: 'Địa lí', 'Ghi chú': '' },
        { TT: 6, CCCD: '064208001239', Lớp: '12A2', 'Họ và tên': 'Đặng Quốc Khánh', 'Ngày sinh': '18/07/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Hóa học', TC2: 'Sinh học', 'Ghi chú': '' },
        { TT: 7, CCCD: '064208001240', Lớp: '12A3', 'Họ và tên': 'Bùi Ngọc Lan', 'Ngày sinh': '25/09/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Vật lí', TC2: 'Tin học', 'Ghi chú': '' },
        { TT: 8, CCCD: '064208001241', Lớp: '12A3', 'Họ và tên': 'Ngô Minh Nhật', 'Ngày sinh': '08/04/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Lịch sử', TC2: 'GDKTPL', 'Ghi chú': '' },
        { TT: 9, CCCD: '064208001242', Lớp: '12A4', 'Họ và tên': 'Dương Thu Phương', 'Ngày sinh': '14/10/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Địa lí', TC2: 'GDKTPL', 'Ghi chú': '' },
        { TT: 10, CCCD: '064208001243', Lớp: '12A4', 'Họ và tên': 'Đỗ Hữu Quân', 'Ngày sinh': '30/03/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Vật lí', TC2: 'Hóa học', 'Ghi chú': '' },
        { TT: 11, CCCD: '064208001244', Lớp: '12A5', 'Họ và tên': 'Hồ Diệu Thảo', 'Ngày sinh': '22/06/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Sinh học', TC2: 'Tin học', 'Ghi chú': '' },
        { TT: 12, CCCD: '064208001245', Lớp: '12A5', 'Họ và tên': 'Lý Văn Tiến', 'Ngày sinh': '09/12/2008', M1: 'Toán', M2: 'Ngữ văn', TC1: 'Lịch sử', TC2: 'Địa lí', 'Ghi chú': '' },
      ];

  sampleRows.forEach((row, idx) => {
    const r = ws.addRow(row);
    r.height = 20;
    const isEven = idx % 2 === 1;

    r.eachCell((cell, colNumber) => {
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

      // Cột họ tên căn trái, còn lại căn giữa
      if (colNumber === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  // Sheet 2: Hướng dẫn nhập liệu
  const guideWs = workbook.addWorksheet('Huong_Dan_Nhap_Lieu');
  guideWs.views = [{ showGridLines: true }];

  guideWs.columns = [
    { header: 'Tên cột', key: 'col', width: 16 },
    { header: 'Bắt buộc', key: 'req', width: 14 },
    { header: 'Mô tả & Hướng dẫn', key: 'desc', width: 50 },
    { header: 'Ví dụ', key: 'ex', width: 24 },
  ];

  const guideHeader = guideWs.getRow(1);
  guideHeader.height = 26;
  guideHeader.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' } // Teal-700
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const guideRows = isPeriodic
    ? [
        { col: 'TT', req: 'Tùy chọn', desc: 'Số thứ tự học sinh', ex: '1, 2, 3...' },
        { col: 'CCCD', req: 'Tùy chọn', desc: 'Số Căn cước công dân hoặc Mã định danh', ex: '064208001234' },
        { col: 'Lớp', req: 'Bắt buộc', desc: 'Lớp học hiện tại của học sinh', ex: '12A1, 12A2...' },
        { col: 'Họ và tên', req: 'Bắt buộc', desc: 'Họ và tên đầy đủ. Hệ thống sẽ tự động tách Tên - Họ đệm để sắp xếp A-Z chuẩn tiếng Việt.', ex: 'Nguyễn Văn An' },
        { col: 'Ngày sinh', req: 'Khuyến nghị', desc: 'Ngày tháng năm sinh (dd/mm/yyyy)', ex: '15/02/2008' },
        { col: 'Nhóm', req: 'Bắt buộc', desc: 'Mã nhóm thi để chia phòng riêng (VD: TN1, TN2, XH1, XH2...). Hệ thống sẽ xếp phòng riêng cho từng nhóm.', ex: 'TN1, XH1' },
      ]
    : [
        { col: 'TT', req: 'Tùy chọn', desc: 'Số thứ tự học sinh', ex: '1, 2, 3...' },
        { col: 'CCCD', req: 'Tùy chọn', desc: 'Số Căn cước công dân hoặc Mã định danh', ex: '064208001234' },
        { col: 'Lớp', req: 'Bắt buộc', desc: 'Lớp học hiện tại của học sinh', ex: '12A1, 12A2...' },
        { col: 'Họ và tên', req: 'Bắt buộc', desc: 'Họ và tên đầy đủ. Hệ thống sẽ tự động tách Tên - Họ đệm để sắp xếp A-Z chuẩn tiếng Việt.', ex: 'Nguyễn Văn An' },
        { col: 'Ngày sinh', req: 'Khuyến nghị', desc: 'Ngày tháng năm sinh (dd/mm/yyyy)', ex: '15/02/2008' },
        { col: 'M1, M2', req: 'Tùy chọn', desc: 'Môn thi bắt buộc (Thường là Toán, Ngữ văn)', ex: 'Toán, Ngữ văn' },
        { col: 'TC1', req: 'Bắt buộc', desc: 'Môn tự chọn Ca 1 (Vật lí, Hóa học, Sinh học, Lịch sử...)', ex: 'Vật lí' },
        { col: 'TC2', req: 'Bắt buộc', desc: 'Môn tự chọn Ca 2 (Hóa học, Địa lí, Tin học, GDKTPL...)', ex: 'Hóa học' },
      ];

  guideRows.forEach((r) => {
    const row = guideWs.addRow(r);
    row.height = 22;
    row.eachCell((cell, colIdx) => {
      cell.font = { name: 'Times New Roman', size: 10 };
      if (colIdx === 1 || colIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (r.req === 'Bắt buộc') {
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = isPeriodic
    ? 'Mau_Nhap_Kiem_Tra_Dinh_Ky.xlsx'
    : 'Mau_Nhap_Thi_Thu_Khao_Sat.xlsx';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

