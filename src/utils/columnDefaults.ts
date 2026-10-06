import { ColumnDefinition, ExportColumnsConfig } from '../types';

/**
 * Danh sách cột mặc định cho File 1: Danh sách chia phòng tổng thể
 */
export const DEFAULT_OVERALL_COLUMNS: ColumnDefinition[] = [
  { id: 'TT', fieldKey: 'TT', headerName: 'TT', enabled: true, widthWeight: 1, align: 'center', targetSheets: ['overall'] },
  { id: 'Phòng thi', fieldKey: 'Phòng thi', headerName: 'Phòng thi', enabled: true, widthWeight: 1.5, align: 'center', targetSheets: ['overall'] },
  { id: 'STT_Phong', fieldKey: 'STT_Phong', headerName: 'STT Phòng', enabled: true, widthWeight: 1.2, align: 'center', targetSheets: ['overall'] },
  { id: 'SBD', fieldKey: 'SBD', headerName: 'Số báo danh', enabled: true, widthWeight: 1.8, align: 'center', targetSheets: ['overall'] },
  { id: 'CCD', fieldKey: 'CCD', headerName: 'Số CCCD', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['overall'] },
  { id: 'Lớp', fieldKey: 'Lớp', headerName: 'Lớp', enabled: true, widthWeight: 1.2, align: 'center', targetSheets: ['overall'] },
  { id: 'Họ tên', fieldKey: 'Họ tên', headerName: 'Họ và tên', enabled: true, widthWeight: 3.5, align: 'left', targetSheets: ['overall'] },
  { id: 'Ngày sinh', fieldKey: 'Ngày sinh', headerName: 'Ngày sinh', enabled: true, widthWeight: 1.8, align: 'center', targetSheets: ['overall'] },
  { id: 'Phái', fieldKey: 'Phái', headerName: 'Phái', enabled: false, widthWeight: 1, align: 'center', targetSheets: ['overall'] },
  { id: 'M1', fieldKey: 'M1', headerName: 'Môn Bắt Buộc 1', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['overall'] },
  { id: 'M2', fieldKey: 'M2', headerName: 'Môn Bắt Buộc 2', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['overall'] },
  { id: 'TC1', fieldKey: 'TC1', headerName: 'Môn Tự Chọn 1', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['overall'] },
  { id: 'TC2', fieldKey: 'TC2', headerName: 'Môn Tự Chọn 2', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['overall'] },
  { id: 'ToHop_ChuanHoa', fieldKey: 'ToHop_ChuanHoa', headerName: 'Tổ hợp chuẩn hóa', enabled: true, widthWeight: 2.5, align: 'center', targetSheets: ['overall'] },
];

/**
 * Danh sách cột mặc định cho File 2 & 3: Phiếu thu bài / Danh sách dán phòng in A4
 */
export const DEFAULT_ATTENDANCE_COLUMNS: ColumnDefinition[] = [
  { id: 'att_stt', fieldKey: 'STT_Phong', headerName: 'STT', enabled: true, widthWeight: 1, align: 'center', targetSheets: ['attendance'] },
  { id: 'att_sbd', fieldKey: 'SBD', headerName: 'Số báo danh', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['attendance'] },
  { id: 'att_hoten', fieldKey: 'Họ tên', headerName: 'Họ và tên thí sinh', enabled: true, widthWeight: 4, align: 'left', targetSheets: ['attendance'] },
  { id: 'att_ngaysinh', fieldKey: 'Ngày sinh', headerName: 'Ngày sinh', enabled: true, widthWeight: 2, align: 'center', targetSheets: ['attendance'] },
  { id: 'att_lop', fieldKey: 'Lớp', headerName: 'Lớp', enabled: true, widthWeight: 1.3, align: 'center', targetSheets: ['attendance'] },
  { id: 'att_made', fieldKey: '', headerName: 'Mã đề / Số tờ', enabled: true, widthWeight: 2.2, align: 'center', isCustom: true, defaultValue: '', targetSheets: ['attendance'] },
  { id: 'att_kynop', fieldKey: '', headerName: 'Ký nộp', enabled: true, widthWeight: 2, align: 'center', isCustom: true, defaultValue: '', targetSheets: ['attendance'] },
  { id: 'att_ghichu', fieldKey: '', headerName: 'Ghi chú', enabled: true, widthWeight: 2.8, align: 'left', targetSheets: ['attendance'] },
];

export const DEFAULT_EXPORT_COLUMNS_CONFIG: ExportColumnsConfig = {
  overallColumns: DEFAULT_OVERALL_COLUMNS,
  attendanceColumns: DEFAULT_ATTENDANCE_COLUMNS,
};

export const DEFAULT_EXPORT_CONFIG = DEFAULT_EXPORT_COLUMNS_CONFIG;

/**
 * Tính toán tỷ lệ độ rộng cho từng cột để vừa khít 1 trang in A4 chuẩn
 * @param columns Các cột đang được bật (enabled: true)
 * @param totalTargetWidth Tổng độ rộng mong muốn (đơn vị ký tự của Excel, mặc định 84 cho A4 Portrait)
 */
export function calculateFitWidths(
  columns: ColumnDefinition[],
  totalTargetWidth = 85
): { col: ColumnDefinition; width: number; percent: number }[] {
  const enabledCols = columns.filter(c => c.enabled);
  if (enabledCols.length === 0) return [];

  const totalWeight = enabledCols.reduce((acc, c) => acc + (c.widthWeight || 1), 0);

  return enabledCols.map(col => {
    const fraction = (col.widthWeight || 1) / totalWeight;
    const width = Math.max(4, Math.round(fraction * totalTargetWidth * 10) / 10);
    const percent = Math.round(fraction * 1000) / 10;
    return { col, width, percent };
  });
}
