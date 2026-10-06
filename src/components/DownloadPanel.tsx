import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer, CheckCircle2, Loader2, Sparkles, BarChart3, SlidersHorizontal, TableProperties, BookOpen, Calculator } from 'lucide-react';
import { CandidateAssigned, ExamConfig, ExportColumnsConfig, DEFAULT_ALL_SUBJECTS } from '../types';
import { 
  exportOverallListExcel, 
  exportAttendanceSheetsExcel, 
  exportShiftSummaryExcel, 
  exportMultiSubjectAttendanceExcel,
  exportCompulsoryAttendanceExcel,
  exportCompulsoryShiftSummaryExcel,
  getCompulsoryCandidateAssignments,
  exportExamPaperMatrixExcel,
  exportMOETFixedRoomsAttendanceExcel,
  exportSeatingChartAllRoomsExcel,
  exportDeskLabelsExcel
} from '../utils/excelExport';

interface DownloadPanelProps {
  candidates: CandidateAssigned[];
  config: ExamConfig;
  columnsConfig?: ExportColumnsConfig;
  onPreviewPrintRoom: () => void;
  onPreviewMultiSubject?: () => void;
  onViewShiftSummary?: () => void;
  onOpenColumnConfig?: () => void;
}

export const DownloadPanel: React.FC<DownloadPanelProps> = ({
  candidates,
  config,
  columnsConfig,
  onPreviewPrintRoom,
  onPreviewMultiSubject,
  onViewShiftSummary,
  onOpenColumnConfig,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const model = config.roomAssignmentModel || 'moet_fixed';
  const { totalRooms: compulsoryRoomsCount } = getCompulsoryCandidateAssignments(candidates, config.maxPerRoom || 24, model);

  const handleDownloadNguVan = async () => {
    try {
      setDownloading('ngu_van');
      await exportCompulsoryAttendanceExcel(candidates, config, 'Ngữ văn', 'M1', columnsConfig?.attendanceColumns);
    } catch (e: any) {
      alert('Lỗi xuất file Ngữ văn: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadToan = async () => {
    try {
      setDownloading('toan');
      await exportCompulsoryAttendanceExcel(candidates, config, 'Toán', 'M2', columnsConfig?.attendanceColumns);
    } catch (e: any) {
      alert('Lỗi xuất file Toán: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadCompulsoryStat = async () => {
    try {
      setDownloading('stat_mon_chung');
      await exportCompulsoryShiftSummaryExcel(candidates, config);
    } catch (e: any) {
      alert('Lỗi xuất file thống kê môn chung: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadExamPaperMatrix = async () => {
    try {
      setDownloading('matrix_de_thi');
      await exportExamPaperMatrixExcel(candidates, config);
    } catch (e: any) {
      alert('Lỗi xuất Bảng ma trận đề thi: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadMOETFixedAttendance = async () => {
    try {
      setDownloading('moet_fixed_attendance');
      await exportMOETFixedRoomsAttendanceExcel(candidates, config);
    } catch (e: any) {
      alert('Lỗi xuất Phiếu thu bài chuẩn Bộ: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadMultiSubject = async () => {
    try {
      setDownloading('multi_subject');
      await exportMultiSubjectAttendanceExcel(candidates, config, DEFAULT_ALL_SUBJECTS);
    } catch (e: any) {
      alert('Lỗi xuất file: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadFile1 = async () => {
    try {
      setDownloading('file1');
      await exportOverallListExcel(candidates, config, columnsConfig?.overallColumns);
    } catch (e: any) {
      alert('Lỗi xuất file: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };


  const handleDownloadFile2 = async () => {
    try {
      setDownloading('file2');
      await exportAttendanceSheetsExcel(candidates, config, 'CA 1', 'TC1', columnsConfig?.attendanceColumns);
    } catch (e: any) {
      alert('Lỗi xuất file: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadFile3 = async () => {
    try {
      setDownloading('file3');
      await exportAttendanceSheetsExcel(candidates, config, 'CA 2', 'TC2', columnsConfig?.attendanceColumns);
    } catch (e: any) {
      alert('Lỗi xuất file: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadShiftStat = async (shift: 'CA 1' | 'CA 2', col: 'TC1' | 'TC2') => {
    try {
      setDownloading(`stat_${shift}`);
      await exportShiftSummaryExcel(candidates, config, shift, col);
    } catch (e: any) {
      alert('Lỗi xuất file thống kê: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadSeatingChartAllRooms = async () => {
    try {
      setDownloading('seating_chart_all');
      await exportSeatingChartAllRoomsExcel(candidates, config);
    } catch (e: any) {
      alert('Lỗi xuất file Sơ đồ SBD: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadDeskLabels = async () => {
    try {
      setDownloading('desk_labels');
      await exportDeskLabelsExcel(candidates, config);
    } catch (e: any) {
      alert('Lỗi xuất file Thẻ dán bàn: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };


  const isPeriodic = config.examCategory.includes('Kiểm tra');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              {isPeriodic ? 'Báo cáo & Biểu mẫu Kiểm tra định kỳ' : 'Xuất File Báo cáo & Biểu mẫu Thi thử (Ca 1 & Ca 2)'}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isPeriodic ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {config.examCategory}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isPeriodic
              ? 'Tập trung biểu mẫu thu bài liên môn, danh sách phòng thi theo nhóm môn học và in ấn A4 chuẩn mực.'
              : 'Định dạng in ấn A4 tự động fit chuẩn đẹp, đầy đủ phiếu thu bài theo Ca 1, Ca 2 và thống kê thí sinh.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenColumnConfig && (
            <button
              id="btn-open-col-config-download-panel"
              type="button"
              onClick={onOpenColumnConfig}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              Tùy biến cột xuất file (Fit A4)
            </button>
          )}

          <button
            type="button"
            onClick={onPreviewPrintRoom}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Xem trước bản in A4
          </button>
        </div>
      </div>

      {/* Banner Phiếu thu bài tất cả các môn vào 1 trang */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Phiếu thu bài tất cả các môn vào 1 trang (A4 Ngang)
              </h4>
              <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                CHUẨN HÌNH ẢNH
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Cấu trúc bảng 2 tầng: TT, SBD, Họ tên, Ngày sinh, Lớp, Học sinh ký nộp bài (tất cả các môn thi), Ghi chú. Fit vừa khít 1 trang A4 Ngang / phòng.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
          {onPreviewMultiSubject && (
            <button
              id="btn-preview-multi-subject"
              type="button"
              onClick={onPreviewMultiSubject}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100/80 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              Xem bản in A4 Ngang
            </button>
          )}
          <button
            id="btn-download-multi-subject"
            type="button"
            disabled={downloading === 'multi_subject'}
            onClick={handleDownloadMultiSubject}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloading === 'multi_subject' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Tải Excel Phiếu thu bài liên môn
          </button>
        </div>
      </div>

      {/* KHU VỰC ĐẶC BIỆT 1: CHUẨN BỘ GD&ĐT — 1 PHÒNG THI & 1 SBD CỐ ĐỊNH CHO TẤT CẢ CÁC MÔN */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-4.5 space-y-3.5 shadow-md border border-blue-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Chế độ 1: Chuẩn Bộ GD&ĐT (1 SBD & 1 Phòng thi cố định toàn kỳ thi)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  KHUYÊN DÙNG
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Thí sinh ngồi duy nhất 1 vị trí cố định từ môn 1 (Ngữ văn), môn 2 (Toán), đến Ca 1 & Ca 2. Hỗ trợ thí sinh tự do thi 1, 2, 3 hoặc 4 môn.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* Nút Ma trận số lượng đề thi */}
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
                  Dành cho Ban In sao đề thi
                </span>
                <span className="text-[10px] text-blue-200 font-mono">EXCEL A4 NGANG</span>
              </div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <TableProperties className="w-4 h-4 text-amber-400" />
                Bảng Ma trận số lượng đề thi theo phòng
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                File <code>Bang_Ma_Tran_So_Luong_De_Thi_Theo_Phong.xlsx</code> chi tiết số lượng đề thi của từng môn trong từng phòng thi, kèm tổng cộng toàn trường và form ký duyệt.
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-700">
              <button
                id="btn-download-matrix-de-thi"
                type="button"
                disabled={downloading === 'matrix_de_thi'}
                onClick={handleDownloadExamPaperMatrix}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'matrix_de_thi' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Bảng Ma trận số lượng đề thi (.xlsx)
              </button>
            </div>
          </div>

          {/* Nút Phiếu thu bài & Dán phòng Cố định Chuẩn Bộ */}
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/40">
                  Dành cho Giám thị & Dán cửa phòng
                </span>
                <span className="text-[10px] text-blue-200 font-mono">N SHEET A4 NGANG</span>
              </div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Phiếu thu bài & Dán phòng Cố định (N Sheet)
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                File <code>File_Phieu_Thu_Bai_Va_Dan_Phong_Chuan_Bo.xlsx</code> gồm N sheet (mỗi sheet 1 phòng cố định), hiển thị đầy đủ môn Văn, Toán, Ca 1, Ca 2 và ô ký nộp tương ứng.
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-700">
              <button
                id="btn-download-moet-fixed-attendance"
                type="button"
                disabled={downloading === 'moet_fixed_attendance'}
                onClick={handleDownloadMOETFixedAttendance}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'moet_fixed_attendance' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Phiếu thu bài Cố định Chuẩn Bộ (.xlsx)
              </button>
            </div>
          </div>

          {/* Nút Sơ đồ Bố trí SBD & Chỗ ngồi Tất cả các phòng */}
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-600/40">
                  Xuất hết tất cả các phòng 1 lượt
                </span>
                <span className="text-[10px] text-blue-200 font-mono">N SHEET A4 DỌC</span>
              </div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                Sơ đồ Bố trí SBD & Chỗ ngồi 24 Bàn (All Rooms)
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                File <code>So_Do_Danh_SBD_Va_Cho_Ngoi_Tat_Ca_Cac_Phong.xlsx</code> gồm Sheet Master tổng hợp SBD + N sheet mô phỏng trực quan 4 Dãy x 6 Hàng bàn thi từng phòng.
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-700">
              <button
                id="btn-download-seating-chart-all"
                type="button"
                disabled={downloading === 'seating_chart_all'}
                onClick={handleDownloadSeatingChartAllRooms}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'seating_chart_all' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Sơ đồ SBD Tất cả các phòng (.xlsx)
              </button>
            </div>
          </div>

          {/* Nút Thẻ Số Báo Danh Dán Bàn */}
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between hover:border-purple-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-600/40">
                  Dán góc bàn thi
                </span>
                <span className="text-[10px] text-blue-200 font-mono">TOÀN TRƯỜNG</span>
              </div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                Thẻ Số Báo Danh Dán Góc Bàn (Toàn trường)
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                File <code>Danh_Sach_The_SBD_Dan_Ban_Tat_Ca_Cac_Phong.xlsx</code> tổng hợp SBD, số bàn, phòng thi, môn thi cho toàn bộ thí sinh để in nhãn dán góc bàn.
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-700">
              <button
                id="btn-download-desk-labels"
                type="button"
                disabled={downloading === 'desk_labels'}
                onClick={handleDownloadDeskLabels}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-500 hover:bg-purple-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'desk_labels' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Thẻ SBD dán bàn Toàn trường (.xlsx)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC BỔ SUNG ĐẶC BIỆT: 2 MÔN BẮT BUỘC (NGỮ VĂN & TOÁN) */}
      <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-rose-50/60 border-2 border-amber-400/80 rounded-xl p-4.5 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              📚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Môn thi bắt buộc: Ngữ văn (M1) & Toán (M2) — Tất cả thí sinh chung phòng
                </h3>
                <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                  {candidates.length} THÍ SINH • {compulsoryRoomsCount} PHÒNG
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {model === 'two_phase_split'
                  ? 'Phương án 2 (Tách 2 giai đoạn): Ngữ văn & Toán chia phòng tuần tự theo SBD A-Z toàn trường (P01..Pn); sang buổi Tự chọn chuyển sang phòng tổ hợp.'
                  : 'Phương án 1 (Chuẩn 100% Bộ GD&ĐT): Thí sinh ngồi cố định 1 Phòng thi & 1 SBD duy nhất suốt cả kỳ thi (Toán, Văn, Ca 1, Ca 2 đều chung 1 phòng).'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Nút 1: Ngữ văn */}
          <div className="bg-white border border-amber-200/90 rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-rose-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Môn 1 (Ngữ văn - M1)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{compulsoryRoomsCount} SHEET</span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-rose-600" />
                Phiếu thu bài Ngữ văn
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                File <code>File1_Phieu_Thu_Bai_NguVan.xlsx</code> gồm {compulsoryRoomsCount} sheet (P_01 đến P_29) chuẩn A4 dọc, header ghi rõ "Môn thi: Ngữ văn".
              </p>
            </div>

            <div className="pt-3.5 mt-2 border-t border-slate-100">
              <button
                id="btn-download-phieu-nguvan"
                type="button"
                disabled={downloading === 'ngu_van'}
                onClick={handleDownloadNguVan}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'ngu_van' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Phiếu thu bài Ngữ văn (.xlsx)
              </button>
            </div>
          </div>

          {/* Nút 2: Toán */}
          <div className="bg-white border border-amber-200/90 rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-blue-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Môn 2 (Toán - M2)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{compulsoryRoomsCount} SHEET</span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                Phiếu thu bài Toán
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                File <code>File1_Phieu_Thu_Bai_Toan.xlsx</code> gồm {compulsoryRoomsCount} sheet (P_01 đến P_29) chuẩn A4 dọc, header ghi rõ "Môn thi: Toán".
              </p>
            </div>

            <div className="pt-3.5 mt-2 border-t border-slate-100">
              <button
                id="btn-download-phieu-toan"
                type="button"
                disabled={downloading === 'toan'}
                onClick={handleDownloadToan}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'toan' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Phiếu thu bài Toán (.xlsx)
              </button>
            </div>
          </div>

          {/* Nút 3: Bảng thống kê môn chung */}
          <div className="bg-white border border-amber-200/90 rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-amber-400 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Thống kê phòng thi
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1 SHEET A4</span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                Bảng thống kê Môn chung
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                File <code>Bang_Thong_Ke_Mon_Chung.xlsx</code> tổng hợp 4 cột (TT, Phòng, Môn, Số HS), dòng tổng cộng {candidates.length} HS và form chữ ký.
              </p>
            </div>

            <div className="pt-3.5 mt-2 border-t border-slate-100">
              <button
                id="btn-download-stat-mon-chung"
                type="button"
                disabled={downloading === 'stat_mon_chung'}
                onClick={handleDownloadCompulsoryStat}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {downloading === 'stat_mon_chung' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Tải Bảng thống kê Môn chung (.xlsx)
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPeriodic ? (
        /* CHẾ ĐỘ KIỂM TRA ĐỊNH KỲ: Chỉ hiển thị các biểu mẫu phù hợp (Không có Ca 1, Ca 2) */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File 1: Danh sách chia phòng tổng thể */}
            <div className="bg-slate-50 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 transition-all rounded-xl p-4.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                    File 1: Raw Data
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">.XLSX</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Danh sách chia phòng tổng thể</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dữ liệu thô kèm cột "Phòng thi", "STT Phòng" và "Tổ hợp chuẩn hóa". Thích hợp lưu trữ cơ sở dữ liệu và quản lý chung toàn trường.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/60">
                <button
                  id="btn-download-file-1"
                  type="button"
                  disabled={downloading === 'file1'}
                  onClick={handleDownloadFile1}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'file1' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Tải File 1 (Tổng thể)
                </button>
              </div>
            </div>

            {/* In ấn & Dán phòng thi A4 */}
            <div className="bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 transition-all rounded-xl p-4.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    In ấn A4
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">PREVIEW / PRINT</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Danh sách dán cửa phòng & Thẻ phòng thi</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Trình bày chuẩn mẫu in A4 dọc theo từng phòng thi. Đầy đủ tiêu đề kỳ thi Kiểm tra định kỳ, năm học {config.schoolYear}, danh sách thí sinh và chữ ký cán bộ coi thi.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={onPreviewPrintRoom}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Mở Trình In ấn Phòng thi (A4)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-blue-800">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Quy chế Kiểm tra định kỳ</strong>: Hệ thống tự động giới hạn chỉ hiển thị biểu mẫu thu bài liên môn và danh sách phòng thi theo nhóm, đã ẩn các báo cáo Ca 1 & Ca 2 (chỉ dùng cho Thi thử).
            </span>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ THI THỬ / KHẢO SÁT: Hiển thị đầy đủ 3 File và Thống kê Ca 1, Ca 2 */
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* File 1 */}
            <div className="bg-slate-50 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 transition-all rounded-xl p-4.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                    File 1: Raw Data
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">.XLSX</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Danh sách chia phòng tổng thể</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dữ liệu thô kèm cột "Phòng thi", "STT Phòng" và "Tổ hợp chuẩn hóa". Thích hợp lưu trữ cơ sở dữ liệu và quản lý chung.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/60">
                <button
                  id="btn-download-file-1"
                  type="button"
                  disabled={downloading === 'file1'}
                  onClick={handleDownloadFile1}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'file1' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Tải File 1 (Tổng thể)
                </button>
              </div>
            </div>

            {/* File 2 */}
            <div className="bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 transition-all rounded-xl p-4.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    File 2: Ca 1 (Môn TC1)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">.XLSX</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Phiếu thu bài thi / Dán phòng CA 1</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Mỗi phòng 1 Sheet chuẩn A4. Đầy đủ Quốc hiệu, Tiêu ngữ, Sở GD, Môn thi TC1, Bảng 8 cột, dòng tổng kết và form ký 2 Giám thị.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/60">
                <button
                  id="btn-download-file-2"
                  type="button"
                  disabled={downloading === 'file2'}
                  onClick={handleDownloadFile2}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'file2' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Tải File 2 (CA 1 - TC1)
                </button>
              </div>
            </div>

            {/* File 3 */}
            <div className="bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 transition-all rounded-xl p-4.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                    File 3: Ca 2 (Môn TC2)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">.XLSX</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Phiếu thu bài thi / Dán phòng CA 2</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Mỗi phòng 1 Sheet chuẩn A4. Tự động áp dụng môn thi TC2 cho ca thi kế tiếp, sẵn sàng in đóng cuốn hoặc phát giám thị coi thi.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/60">
                <button
                  id="btn-download-file-3"
                  type="button"
                  disabled={downloading === 'file3'}
                  onClick={handleDownloadFile3}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'file3' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Tải File 3 (CA 2 - TC2)
                </button>
              </div>
            </div>
          </div>

          {/* Bảng Thống Kê Tổng Hợp Theo Ca 1, Ca 2 */}
          <div className="bg-slate-50 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Bảng Thống kê Theo Phòng: Ca 1 & Ca 2
                  </h4>
                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">MỚI</span>
                </div>
                <p className="text-xs text-slate-600">
                  Gồm: TT, Phòng, Các môn dự thi chi tiết, Tổng số thí sinh và tiêu đề kỳ thi chuẩn mực.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              {onViewShiftSummary && (
                <button
                  type="button"
                  onClick={onViewShiftSummary}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100/80 hover:bg-blue-200/80 rounded-lg transition-colors cursor-pointer"
                >
                  Xem trực quan
                </button>
              )}
              <button
                type="button"
                disabled={downloading === 'stat_CA 1'}
                onClick={() => handleDownloadShiftStat('CA 1', 'TC1')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                Tải Excel Thống kê Ca 1
              </button>
              <button
                type="button"
                disabled={downloading === 'stat_CA 2'}
                onClick={() => handleDownloadShiftStat('CA 2', 'TC2')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                Tải Excel Thống kê Ca 2
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

