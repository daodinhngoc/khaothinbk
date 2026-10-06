import React, { useState } from 'react';
import { Printer, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { CandidateAssigned, ExamConfig, ShiftRoomStat } from '../types';
import { generateShiftStatistics } from '../utils/optimizer';

interface PrintShiftSummaryModalProps {
  candidates: CandidateAssigned[];
  config: ExamConfig;
  initialShift?: 'CA 1' | 'CA 2';
  onClose: () => void;
}

export const PrintShiftSummaryModal: React.FC<PrintShiftSummaryModalProps> = ({
  candidates,
  config,
  initialShift = 'CA 1',
  onClose,
}) => {
  const [shift, setShift] = useState<'CA 1' | 'CA 2'>(initialShift);

  const subjectKey = shift === 'CA 1' ? 'TC1' : 'TC2';
  const summary = generateShiftStatistics(candidates, shift, subjectKey, config.startRoomCode);
  const examFullTitle = `${config.examCategory} (${config.subPeriod})`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
        {/* Top Action Bar */}
        <div className="bg-slate-800 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-sm sm:text-base">
              Bản In A4 - Bảng Tổng hợp Thống kê Phòng thi theo Ca
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Shift selector */}
            <div className="flex bg-slate-700 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShift('CA 1')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  shift === 'CA 1' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ca 1 (TC1)
              </button>
              <button
                type="button"
                onClick={() => setShift('CA 2')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  shift === 'CA 2' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ca 2 (TC2)
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In A4 ngay
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container - Simulating standard A4 page */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center bg-slate-200/70">
          <div
            id="printable-a4-sheet"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-slate-300 font-serif text-[12.5px] leading-snug flex flex-col justify-between"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <div>
              {/* Header Top */}
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="text-center space-y-0.5">
                  <div className="font-bold text-xs uppercase tracking-wide">{config.deptName}</div>
                  <div className="font-bold text-xs uppercase underline tracking-wide">{config.schoolName}</div>
                </div>
                <div className="text-center space-y-0.5">
                  <div className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-xs underline">Độc lập - Tự do - Hạnh phúc</div>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center my-4 space-y-1">
                <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                  BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG - {shift}
                </h1>
                <div className="font-bold text-xs uppercase">
                  KỲ THI: {examFullTitle} - MÔN THI: {subjectKey === 'TC1' ? 'MÔN TỰ CHỌN 1' : 'MÔN TỰ CHỌN 2'} ({config.schoolYear})
                </div>
                <div className="italic text-xs">
                  Điểm thi: {config.examCenterCode} &nbsp;&nbsp;|&nbsp;&nbsp; Hội đồng thi: {config.schoolName} &nbsp;&nbsp;|&nbsp;&nbsp; Tổng số phòng: {summary.totalRooms}
                </div>
              </div>

              {/* Summary Table: TT, Phòng, Các môn, Tổng số thí sinh */}
              <div className="mt-4 border-t border-l border-black">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border-r border-b border-black py-2 px-1.5 w-12">TT</th>
                      <th className="border-r border-b border-black py-2 px-2 w-24">Phòng</th>
                      <th className="border-r border-b border-black py-2 px-3 text-left">Các môn (Chi tiết số lượng thí sinh)</th>
                      <th className="border-r border-b border-black py-2 px-2 w-28 text-center">Tổng số thí sinh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.roomStats.map((room: ShiftRoomStat) => (
                      <tr key={room.roomNo} className="h-6">
                        <td className="border-r border-b border-black py-1 px-1.5 text-center font-medium">{room.tt}</td>
                        <td className="border-r border-b border-black py-1 px-2 text-center font-bold">{room.roomName}</td>
                        <td className="border-r border-b border-black py-1 px-3 text-left">{room.subjectsDetail}</td>
                        <td className="border-r border-b border-black py-1 px-2 text-center font-bold">{room.totalCandidates}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="font-bold bg-slate-100 h-7">
                      <td className="border-r border-b border-black py-1.5 px-1.5 text-center"></td>
                      <td className="border-r border-b border-black py-1.5 px-2 text-center uppercase">TỔNG CỘNG</td>
                      <td className="border-r border-b border-black py-1.5 px-3 text-left">
                        {summary.overallSubjectCounts.map((item: { subject: string; count: number }) => `${item.subject}: ${item.count}`).join(', ')}
                      </td>
                      <td className="border-r border-b border-black py-1.5 px-2 text-center text-[12px]">{summary.totalCandidates}</td>
                    </tr>
                  </tbody>

                </table>
              </div>
            </div>

            {/* Footer Signatures: Nhập thì hiện, để trống thì bỏ hoàn toàn */}
            <div className="pt-6 space-y-2 text-xs">
              {(() => {
                const dateStr = config.dateLine !== undefined
                  ? config.dateLine.trim()
                  : (config.locationName && config.locationName.trim()
                      ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
                      : 'Ngày ..... tháng ..... năm 20.....');
                return dateStr ? (
                  <div className="text-right italic pr-8 mb-2">
                    {dateStr}
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 text-center pt-1">
                <div>
                  <div className="font-bold uppercase">NGƯỜI LẬP BẢNG</div>
                  <div className="italic text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</div>
                  <div className="h-18"></div>
                </div>
                <div>
                  {config.leaderTitle && config.leaderTitle.trim() ? (
                    <>
                      <div className="font-bold uppercase">{config.leaderTitle.trim()}</div>
                      <div className="italic text-[11px] mt-0.5">(Ký, đóng dấu và ghi rõ họ tên)</div>
                      <div className="h-18"></div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
