import React, { useState } from 'react';
import { FileSpreadsheet, Printer, Download, BarChart3, CheckCircle2, School, Users, Layers, TableProperties } from 'lucide-react';
import { CandidateAssigned, ExamConfig, ShiftSummaryResult } from '../types';
import { generateShiftStatistics } from '../utils/optimizer';
import { exportShiftSummaryExcel, exportExamPaperMatrixExcel } from '../utils/excelExport';
import { calculateExamPaperMatrix } from '../utils/subjectHelper';

interface ShiftSummaryViewProps {
  candidates: CandidateAssigned[];
  config: ExamConfig;
  onOpenPrintModal: (shift: 'CA 1' | 'CA 2') => void;
}

export const ShiftSummaryView: React.FC<ShiftSummaryViewProps> = ({
  candidates,
  config,
  onOpenPrintModal,
}) => {
  const [selectedView, setSelectedView] = useState<'CA 1' | 'CA 2' | 'MATRIX'>('CA 1');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const subjectKey = selectedView === 'CA 2' ? 'TC2' : 'TC1';
  const summary: ShiftSummaryResult = generateShiftStatistics(
    candidates,
    selectedView === 'CA 2' ? 'CA 2' : 'CA 1',
    subjectKey,
    config.startRoomCode
  );

  const matrix = calculateExamPaperMatrix(candidates, config.startRoomCode);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      if (selectedView === 'MATRIX') {
        await exportExamPaperMatrixExcel(candidates, config);
      } else {
        await exportShiftSummaryExcel(candidates, config, selectedView, subjectKey);
      }
    } catch (err: any) {
      alert('Lỗi xuất file Excel: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const examFullTitle = `${config.examCategory} (${config.subPeriod})`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Top Controls & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            {selectedView === 'MATRIX'
              ? 'Bảng Ma trận Số lượng Đề thi theo Phòng (Ban In sao Đề thi & Điểm thi)'
              : 'Bảng Thống kê Theo Ca thi (CA 1 / CA 2)'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedView === 'MATRIX'
              ? 'Phục vụ ban in sao đề thi đóng gói túi đề thi cho từng phòng thi cố định theo số lượng thực tế từng môn.'
              : 'Phân bố chi tiết từng phòng thi: các môn tự chọn dự thi, số lượng thí sinh tương ứng và tổng số toàn phòng.'}
          </p>
        </div>

        {/* Action Buttons & Shift Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shift selector pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedView('CA 1')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedView === 'CA 1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ca 1 (Môn TC1)
            </button>
            <button
              type="button"
              onClick={() => setSelectedView('CA 2')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedView === 'CA 2'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ca 2 (Môn TC2)
            </button>
            <button
              type="button"
              onClick={() => setSelectedView('MATRIX')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedView === 'MATRIX'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              Ma trận Đề thi (Ban In sao)
            </button>
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Đang xuất...' : selectedView === 'MATRIX' ? 'Xuất Excel Ma trận đề' : `Xuất Excel ${selectedView}`}
          </button>

          {/* Print A4 Button (only for shift) */}
          {selectedView !== 'MATRIX' && (
            <button
              type="button"
              onClick={() => onOpenPrintModal(selectedView)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In A4 Biểu mẫu
            </button>
          )}
        </div>
      </div>

      {selectedView === 'MATRIX' ? (
        /* GIAO DIỆN BẢNG MA TRẬN SỐ LƯỢNG ĐỀ THI THEO PHÒNG (BAN IN SAO) */
        <div className="space-y-4">
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-3 font-serif text-slate-800">
            <div className="grid grid-cols-2 text-center text-xs">
              <div>
                <div className="font-bold uppercase tracking-wider">{config.deptName}</div>
                <div className="font-bold uppercase underline">{config.schoolName}</div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold underline">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="text-center pt-2 space-y-1">
              <h4 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                BẢNG MA TRẬN TỔNG HỢP SỐ LƯỢNG ĐỀ THI & THÍ SINH DỰ THI THEO TỪNG PHÒNG
              </h4>
              <div className="text-xs font-bold uppercase text-indigo-900 font-sans">
                KỲ THI: {examFullTitle} - NĂM HỌC: {config.schoolYear} - ĐIỂM THI: {config.examCenterCode}
              </div>
              <div className="text-[11px] text-slate-500 italic">
                (Ban in sao đề thi và điểm thi căn cứ đóng gói số lượng đề thi thực tế cho từng phòng thi cố định)
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-indigo-900 text-white font-bold text-center sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-2 border-r border-indigo-800 w-10">TT</th>
                    <th className="py-2.5 px-3 border-r border-indigo-800 w-24">Phòng thi</th>
                    <th className="py-2.5 px-2 border-r border-indigo-800 w-16">Sĩ số</th>
                    {matrix.subjects.map(s => (
                      <th key={s} className="py-2.5 px-2 border-r border-indigo-800 min-w-[70px] whitespace-nowrap">
                        {s}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 w-20 bg-indigo-950">Tổng số đề</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {matrix.rooms.map((room, rIdx) => {
                    let roomTotalPapers = 0;
                    return (
                      <tr key={room.roomNo} className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="py-2 px-2 text-center font-medium text-slate-500 border-r border-slate-100">
                          {room.tt}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-100">
                          {room.roomName}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-800 border-r border-slate-100">
                          {room.totalCandidates}
                        </td>
                        {matrix.subjects.map(s => {
                          const count = room.countsBySubject[s] || 0;
                          roomTotalPapers += count;
                          return (
                            <td key={s} className="py-2 px-2 text-center border-r border-slate-100 font-mono">
                              {count > 0 ? (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-slate-50">
                          {roomTotalPapers}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400 sticky bottom-0 z-10 text-center">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 uppercase text-blue-900 border-r border-slate-300">
                      TỔNG CỘNG TOÀN TRƯỜNG
                    </td>
                    <td className="py-3 px-2 text-slate-900 border-r border-slate-300">
                      {matrix.totalCandidates}
                    </td>
                    {matrix.subjects.map(s => (
                      <td key={s} className="py-3 px-2 text-indigo-900 border-r border-slate-300 font-mono">
                        {matrix.totalsBySubject[s] || 0}
                      </td>
                    ))}
                    <td className="py-3 px-2 text-emerald-800 font-mono text-sm bg-slate-300">
                      {Object.values(matrix.totalsBySubject).reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* GIAO DIỆN THỐNG KÊ THEO CA (CA 1 HOẶC CA 2) */
        <>
          {/* Official Form Header Simulation */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-3 font-serif text-slate-800">
            <div className="grid grid-cols-2 text-center text-xs">
              <div>
                <div className="font-bold uppercase tracking-wider">{config.deptName}</div>
                <div className="font-bold uppercase underline">{config.schoolName}</div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold underline">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="text-center pt-2 space-y-1">
              <h4 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG - {selectedView}
              </h4>
              <div className="text-xs font-bold uppercase text-blue-900 font-sans">
                KỲ THI: {examFullTitle} - MÔN THI: {subjectKey === 'TC1' ? 'MÔN TỰ CHỌN 1' : 'MÔN TỰ CHỌN 2'} ({config.schoolYear})
              </div>
              <div className="text-xs text-slate-600 font-sans">
                Điểm thi: <strong>{config.examCenterCode}</strong> &nbsp;|&nbsp; Hội đồng: <strong>{config.schoolName}</strong> &nbsp;|&nbsp; Tổng số: <strong>{summary.totalRooms} phòng</strong> ({summary.totalCandidates} thí sinh)
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                {summary.totalRooms}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Tổng số phòng thi</span>
                <span className="font-bold text-slate-800 text-sm">{summary.totalRooms} phòng</span>
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Tổng lượt thí sinh {selectedView}</span>
                <span className="font-bold text-slate-800 text-sm">{summary.totalCandidates} lượt thi</span>
              </div>
            </div>

            <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Số môn thi tự chọn</span>
                <span className="font-bold text-slate-800 text-sm">{summary.overallSubjectCounts.length} môn</span>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                <School className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Quy chuẩn phòng</span>
                <span className="font-bold text-slate-800 text-sm">Tối đa {config.maxPerRoom} HS</span>
              </div>
            </div>
          </div>

          {/* Table Data Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">TT</th>
                    <th className="py-3 px-4 text-center w-28 border-r border-slate-200">Phòng thi</th>
                    <th className="py-3 px-5 border-r border-slate-200">Các môn dự thi trong phòng (Số lượng)</th>
                    <th className="py-3 px-4 text-center w-32">Tổng số thí sinh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {summary.roomStats.map((room) => (
                    <tr key={room.roomNo} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-100">
                        {room.tt}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-800 border-r border-slate-100">
                        {room.roomName}
                      </td>
                      <td className="py-2.5 px-5 border-r border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {room.subjectsCount.map((sc) => (
                            <span
                              key={sc.subject}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200/80 transition-colors"
                            >
                              <span className="font-semibold text-slate-900">{sc.subject}:</span>
                              <span className="font-bold text-blue-700">{sc.count} HS</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                          room.totalCandidates < config.maxPerRoom
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {room.totalCandidates} thí sinh
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total Row */}
                <tfoot className="bg-slate-100/95 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0">
                  <tr>
                    <td className="py-3 px-3 text-center border-r border-slate-200"></td>
                    <td className="py-3 px-4 text-center uppercase tracking-wider text-blue-800 border-r border-slate-200">
                      TỔNG CỘNG
                    </td>
                    <td className="py-3 px-5 border-r border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        {summary.overallSubjectCounts.map(item => (
                          <span key={item.subject} className="text-slate-700 text-xs">
                            {item.subject}: <strong className="text-blue-700">{item.count}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-800 text-sm">
                      {summary.totalCandidates} thí sinh
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Footer Signatures Area */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Biểu mẫu hợp lệ cho cả in ấn giấy và lưu trữ báo cáo quản trị.</span>
        </div>
        <div className="text-right italic">
          Bảng thống kê được đồng bộ tự động từ thuật toán xếp phòng.
        </div>
      </div>
    </div>
  );
};
