import React, { useState } from 'react';
import { 
  Printer, X, FileText, CheckSquare, Square, 
  Settings2, Download, Award, BookOpen, Layers, CheckCircle2 
} from 'lucide-react';
import { 
  ExamConfig, 
  SubjectMetricSummary, 
  UserProfile, 
  ExpertPedagogicalReport 
} from '../../types';
import { PeStudentRow } from '../../utils/specializedSubjectData';

interface PrintScoreReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  subjectMetrics: SubjectMetricSummary;
  config: ExamConfig;
  currentUser?: UserProfile | null;
  expertReport?: ExpertPedagogicalReport | null;
  isEvaluationMode?: boolean;
  peStudentRows?: PeStudentRow[];
}

export const PrintScoreReportModal: React.FC<PrintScoreReportModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  subjectMetrics,
  config,
  currentUser,
  expertReport,
  isEvaluationMode = false,
  peStudentRows = []
}) => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [includePedagogicalNotes, setIncludePedagogicalNotes] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  // Tính toán dữ liệu thống kê môn GDTC nếu là chế độ đánh giá
  const peClassStats = React.useMemo(() => {
    if (!isEvaluationMode || peStudentRows.length === 0) return [];
    const map = new Map<string, { total: number; pass: number; fail: number; notes: string[] }>();
    peStudentRows.forEach(s => {
      const cls = s.className || 'Khối 12';
      if (!map.has(cls)) {
        map.set(cls, { total: 0, pass: 0, fail: 0, notes: [] });
      }
      const item = map.get(cls)!;
      item.total++;
      if (s.overallResult === 'Đ') item.pass++;
      else item.fail++;
      if (s.teacherComment && !item.notes.includes(s.teacherComment)) item.notes.push(s.teacherComment);
    });
    return Array.from(map.entries()).map(([className, stat]) => ({
      className,
      total: stat.total,
      pass: stat.pass,
      passRate: stat.total > 0 ? (stat.pass / stat.total) * 100 : 0,
      fail: stat.fail,
      failRate: stat.total > 0 ? (stat.fail / stat.total) * 100 : 0,
      notes: stat.notes.slice(0, 2).join('; ')
    }));
  }, [isEvaluationMode, peStudentRows]);

  const peTotal = React.useMemo(() => {
    const total = peClassStats.reduce((sum, c) => sum + c.total, 0);
    const pass = peClassStats.reduce((sum, c) => sum + c.pass, 0);
    const fail = peClassStats.reduce((sum, c) => sum + c.fail, 0);
    return {
      total,
      pass,
      passRate: total > 0 ? (pass / total) * 100 : 0,
      fail,
      failRate: total > 0 ? (fail / total) * 100 : 0
    };
  }, [peClassStats]);

  if (!isOpen) return null;

  const schoolName = config.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM';
  const deptName = config.deptName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
  const unitName = currentUser?.unit || `TỔ CHUYÊN MÔN: ${subjectName.toUpperCase()}`;
  const examCategory = config.examCategory || 'KIỂM TRA ĐỊNH KỲ';
  const subPeriod = config.subPeriod || '';
  const schoolYear = config.schoolYear || '2024 - 2025';
  const dateFormatted = new Date().toLocaleDateString('vi-VN');

  const handlePrint = () => {
    window.print();
  };

  const classRows = subjectMetrics.classRangeStats || [];
  const overall = subjectMetrics.overallRangeStat;

  return (
    <div 
      id="print-score-report-modal"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:inset-auto"
    >
      {/* Dynamic print stylesheet to isolate this modal and enforce paper orientation */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 8mm 10mm 8mm 10mm;
          }
          body {
            visibility: hidden !important;
            background: #ffffff !important;
          }
          #print-score-report-modal,
          #print-score-report-modal * {
            visibility: visible !important;
          }
          #print-score-report-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-toolbar {
            display: none !important;
          }
          .print-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* TOP TOOLBAR - ẨN KHI IN */}
        <div className="print-toolbar bg-slate-800 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Biểu mẫu In A4: Báo cáo Phân tích Phổ điểm & Đánh giá Chất lượng Môn {subjectName}
              </h2>
              <p className="text-[11px] text-slate-400">
                Định dạng chuẩn theo Nghị định 30/2020/NĐ-CP về thể thức văn bản hành chính trường học
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tùy chọn hướng giấy A4 */}
            <div className="flex items-center bg-slate-700 p-0.5 rounded-lg text-xs font-semibold gap-0.5">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  orientation === 'landscape' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="Khổ ngang rất phù hợp với bảng 18 cột phân bố điểm số"
              >
                A4 Ngang (Chuẩn bảng)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  orientation === 'portrait' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Dọc
              </button>
            </div>

            {/* Checkbox: In kèm nhận định sư phạm */}
            {expertReport && (
              <button
                type="button"
                onClick={() => setIncludePedagogicalNotes(!includePedagogicalNotes)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  includePedagogicalNotes
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white'
                }`}
              >
                {includePedagogicalNotes ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>Kèm Nhận định Sư phạm</span>
              </button>
            )}

            {/* Checkbox: Khối chữ ký */}
            <button
              type="button"
              onClick={() => setIncludeSignatures(!includeSignatures)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                includeSignatures
                  ? 'bg-slate-700 border-slate-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
              }`}
            >
              {includeSignatures ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
              <span>Khối ký duyệt</span>
            </button>

            {/* Nút In ngay */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo cáo (Ctrl+P)</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTAINER CHỨA TRANG IN A4 */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex flex-col items-center gap-8 bg-slate-200/70 print:bg-white print:p-0 print:m-0 print:gap-0">
          
          <div 
            className={`print-paper bg-white text-black p-8 sm:p-10 shadow-xl border border-slate-300 font-serif leading-snug flex flex-col justify-between print:shadow-none print:border-0 print:m-0 print:p-0 w-full ${
              orientation === 'landscape' ? 'max-w-[297mm] min-h-[210mm]' : 'max-w-[210mm] min-h-[297mm]'
            }`}
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <div>
              {/* PHẦN 1: QUỐC HIỆU & TIÊU NGỮ HÀNH CHÍNH (CHUẨN BỘ GIÁO DỤC) */}
              <div className="grid grid-cols-2 gap-4 pb-3 border-b-2 border-slate-800">
                <div className="text-center space-y-0.5">
                  <div className="font-semibold text-xs uppercase tracking-wide text-slate-700">
                    {deptName.toUpperCase()}
                  </div>
                  <div className="font-bold text-xs uppercase text-slate-900">
                    {schoolName.toUpperCase()}
                  </div>
                  <div className="font-bold text-[11.5px] uppercase text-blue-900 pt-0.5">
                    {unitName.toUpperCase()}
                  </div>
                  <div className="w-20 h-0.5 bg-slate-600 mx-auto mt-1" />
                </div>

                <div className="text-center space-y-0.5">
                  <div className="font-bold text-xs uppercase text-slate-900 tracking-wide">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="w-32 h-0.5 bg-slate-600 mx-auto mt-1" />
                  <div className="text-[11px] italic text-slate-600 pt-1">
                    ......, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </div>
                </div>
              </div>

              {/* PHẦN 2: TIÊU ĐỀ BÁO CÁO */}
              <div className="text-center my-4 space-y-1">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-900">
                  {isEvaluationMode 
                    ? `BÁO CÁO ĐÁNH GIÁ KẾT QUẢ MÔN ${subjectName.toUpperCase()} (ĐẠT / CHƯA ĐẠT)`
                    : `BÁO CÁO PHÂN TÍCH PHỔ ĐIỂM & ĐÁNH GIÁ CHẤT LƯỢNG MÔN ${subjectName.toUpperCase()}`}
                </h1>
                <div className="font-bold text-xs text-red-900 uppercase">
                  KỲ THI / KIỂM TRA: {examCategory.toUpperCase()} {subPeriod ? `(${subPeriod.toUpperCase()})` : ''} - NĂM HỌC {schoolYear}
                </div>
                <div className="text-[11px] italic text-slate-600">
                  (Căn cứ theo Chuẩn chương trình GDPT 2018 và Thông tư 22/2021/TT-BGDĐT)
                </div>
              </div>

              {/* PHẦN 3: I. CHỈ SỐ TỔNG QUAN PHỔ ĐIỂM TOÀN KHỐI */}
              {!isEvaluationMode && (
                <div className="mb-4">
                  <div className="font-bold text-xs uppercase text-slate-900 mb-1.5 flex items-center justify-between">
                    <span>I. CÁC CHỈ SỐ KHẢO THÍ TỔNG QUAN TOÀN KHỐI:</span>
                    <span className="text-[10px] text-slate-500 font-normal italic">
                      Sĩ số khối: {subjectMetrics.totalInGrade || subjectMetrics.totalCandidates} HS • Đăng ký môn: {subjectMetrics.registeredCandidates || subjectMetrics.totalCandidates} HS
                    </span>
                  </div>
                  <div className="border border-black text-center text-xs">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black text-[11px]">
                          <th className="py-1 px-1 border-r border-black">Sĩ số / ĐK</th>
                          <th className="py-1 px-1 border-r border-black bg-emerald-50 text-emerald-950">Dự thi (N)</th>
                          <th className="py-1 px-1 border-r border-black bg-amber-50 text-amber-950">Vắng (VT)</th>
                          <th className="py-1 px-1 border-r border-black">Điểm TB</th>
                          <th className="py-1 px-1 border-r border-black">Trung vị</th>
                          <th className="py-1 px-1 border-r border-black">Độ lệch chuẩn</th>
                          <th className="py-1 px-1 border-r border-black bg-blue-50">Trên TB (≥5)</th>
                          <th className="py-1 px-1 border-r border-black bg-emerald-50">Khá - Giỏi (≥6.5)</th>
                          <th className="py-1 px-1 border-r border-black bg-rose-50">Dưới TB (&lt;5)</th>
                          <th className="py-1 px-1 bg-red-100 text-red-950">Điểm Liệt (≤1.0)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-semibold text-[11px]">
                          <td className="py-1 px-1 border-r border-black">{subjectMetrics.totalInGrade || subjectMetrics.totalCandidates} / {subjectMetrics.registeredCandidates || subjectMetrics.totalCandidates}</td>
                          <td className="py-1 px-1 border-r border-black font-bold text-emerald-900 bg-emerald-50/40">{subjectMetrics.totalCandidates}</td>
                          <td className="py-1 px-1 border-r border-black text-amber-900 bg-amber-50/40">{subjectMetrics.absentCount || 0} ({(subjectMetrics.absentRate || 0).toFixed(1)}%)</td>
                          <td className="py-1 px-1 border-r border-black font-bold text-blue-900">{subjectMetrics.mean.toFixed(2)}</td>
                          <td className="py-1 px-1 border-r border-black">{subjectMetrics.median.toFixed(2)}</td>
                          <td className="py-1 px-1 border-r border-black">{subjectMetrics.stdDev.toFixed(2)}</td>
                          <td className="py-1 px-1 border-r border-black font-bold bg-blue-50/60 text-blue-900">
                            {(100 - subjectMetrics.rateBelowAverage).toFixed(1)}%
                          </td>
                          <td className="py-1 px-1 border-r border-black font-bold bg-emerald-50/60 text-emerald-900">
                            {(subjectMetrics.rateExcellent + subjectMetrics.rateGood).toFixed(1)}%
                          </td>
                          <td className="py-1 px-1 border-r border-black font-bold bg-rose-50/60 text-rose-900">
                            {subjectMetrics.rateBelowAverage.toFixed(1)}%
                          </td>
                          <td className="py-1 px-1 font-bold bg-red-100/60 text-red-900">
                            {subjectMetrics.rateFailed.toFixed(1)}% ({classRows.reduce((acc, c) => acc + c.count0to1, 0)} bài)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] italic text-slate-600 mt-1">
                    * Ghi chú: Điểm Liệt (≤ 1.0) và các tỷ lệ phổ điểm được tính toán chuẩn xác trên số lượng bài dự thi thực tế (N = {subjectMetrics.totalCandidates}), không tính học sinh vắng thi hoặc không đăng ký môn học vào điểm liệt.
                  </div>
                </div>
              )}

              {/* PHẦN 4: II. BẢNG PHÂN BỐ CHI TIẾT 6 MỨC ĐIỂM THEO TỪNG LỚP HỌC */}
              <div className="mb-4">
                <div className="font-bold text-xs uppercase text-slate-900 mb-1.5 flex items-center justify-between">
                  <span>{isEvaluationMode ? 'I. BẢNG THỐNG KÊ KẾT QUẢ ĐÁNH GIÁ THEO TỪNG LỚP:' : 'II. BẢNG THỐNG KÊ PHÂN BỐ ĐIỂM CHI TIẾT THEO TỪNG LỚP:'}</span>
                  <span className="text-[10.5px] italic text-slate-500 font-normal">Đơn vị tính: Học sinh (SL) và Tỷ lệ phần trăm (%)</span>
                </div>

                {isEvaluationMode ? (
                  /* Bảng đánh giá GDTC */
                  <div className="border-t border-l border-black text-center text-xs">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-2 w-10">STT</th>
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-3 text-left w-24">Lớp</th>
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-2 w-16">Sĩ số</th>
                          <th colSpan={2} className="border-r border-b border-black py-1 px-1 bg-emerald-50 text-emerald-900">KẾT QUẢ: ĐẠT (Đ)</th>
                          <th colSpan={2} className="border-r border-b border-black py-1 px-1 bg-rose-50 text-rose-900">KẾT QUẢ: CHƯA ĐẠT (CĐ)</th>
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-2 text-left">Ghi chú & Đề xuất sư phạm</th>
                        </tr>
                        <tr className="font-bold text-[10.5px]">
                          <th className="border-r border-b border-black py-0.5 px-1 w-14 bg-emerald-100/50">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-1 w-16 bg-emerald-100/50">%</th>
                          <th className="border-r border-b border-black py-0.5 px-1 w-14 bg-rose-100/50">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-1 w-16 bg-rose-100/50">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peClassStats.map((item, idx) => (
                          <tr key={item.className} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border-r border-b border-black py-1 px-1">{idx + 1}</td>
                            <td className="border-r border-b border-black py-1 px-2 text-left font-bold">{item.className}</td>
                            <td className="border-r border-b border-black py-1 px-1 font-semibold">{item.total}</td>
                            <td className="border-r border-b border-black py-1 px-1 text-emerald-800 font-bold">{item.pass}</td>
                            <td className="border-r border-b border-black py-1 px-1 text-emerald-800 font-semibold">{item.passRate.toFixed(1)}%</td>
                            <td className="border-r border-b border-black py-1 px-1 text-rose-800 font-bold">{item.fail}</td>
                            <td className="border-r border-b border-black py-1 px-1 text-rose-800 font-semibold">{item.failRate.toFixed(1)}%</td>
                            <td className="border-r border-b border-black py-1 px-2 text-left text-[11px] italic">{item.notes || 'Hoàn thành chương trình'}</td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-slate-200 text-slate-900 border-b-2 border-black">
                          <td className="border-r border-b border-black py-1 px-1"></td>
                          <td className="border-r border-b border-black py-1 px-2 text-center uppercase">TOÀN KHỐI</td>
                          <td className="border-r border-b border-black py-1 px-1">{peTotal.total}</td>
                          <td className="border-r border-b border-black py-1 px-1 text-emerald-900">{peTotal.pass}</td>
                          <td className="border-r border-b border-black py-1 px-1 text-emerald-900">{peTotal.passRate.toFixed(1)}%</td>
                          <td className="border-r border-b border-black py-1 px-1 text-rose-900">{peTotal.fail}</td>
                          <td className="border-r border-b border-black py-1 px-1 text-rose-900">{peTotal.failRate.toFixed(1)}%</td>
                          <td className="border-r border-b border-black py-1 px-2 text-left text-[11px]">Kế hoạch bổ trợ rèn luyện thể lực cuối học kỳ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Bảng 6 mức điểm theo lớp */
                  <div className="border-t border-l border-black text-center text-[10.5px] leading-tight">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-1 w-7">STT</th>
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-1.5 text-left w-14">Lớp</th>
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-1 w-10">Sĩ số</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-red-50 text-red-900">0 - 1.0 (Liệt)</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-rose-50 text-rose-900">1.1 - 3.4 (Kém)</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-amber-50 text-amber-900">3.5 - 4.9 (Yếu)</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-yellow-50 text-yellow-900">5.0 - 6.4 (TB)</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-blue-50 text-blue-900">6.5 - 7.9 (Khá)</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-emerald-50 text-emerald-900">8.0 - 10 (Giỏi)</th>
                          <th colSpan={2} className="border-r border-b border-black py-0.5 px-0.5 bg-indigo-50 text-indigo-900">Trên TB (≥ 5)</th>
                          <th rowSpan={2} className="border-r border-b border-black py-1 px-1 w-12 bg-slate-200">Điểm TB</th>
                        </tr>
                        <tr className="font-bold text-[9.5px]">
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10">%</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10">%</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10">%</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10">%</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10">%</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10">%</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-8 font-bold">SL</th>
                          <th className="border-r border-b border-black py-0.5 px-0.5 w-10 font-bold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classRows.map((c, idx) => (
                          <tr key={c.className} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{idx + 1}</td>
                            <td className="border-r border-b border-black py-0.5 px-1 text-left font-bold">{c.className}</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.totalStudents}</td>
                            <td className={`border-r border-b border-black py-0.5 px-0.5 ${c.count0to1 > 0 ? 'font-bold text-red-900 bg-red-50' : ''}`}>
                              {c.count0to1}
                            </td>
                            <td className={`border-r border-b border-black py-0.5 px-0.5 ${c.count0to1 > 0 ? 'font-bold text-red-900 bg-red-50' : ''}`}>
                              {c.pct0to1}%
                            </td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.count11to34}</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.pct11to34}%</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.count35to49}</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.pct35to49}%</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.count5to64}</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.pct5to64}%</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.count65to79}</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5">{c.pct65to79}%</td>
                            <td className={`border-r border-b border-black py-0.5 px-0.5 ${c.count8to10 > 0 ? 'font-bold text-emerald-900 bg-emerald-50' : ''}`}>
                              {c.count8to10}
                            </td>
                            <td className={`border-r border-b border-black py-0.5 px-0.5 ${c.count8to10 > 0 ? 'font-bold text-emerald-900 bg-emerald-50' : ''}`}>
                              {c.pct8to10}%
                            </td>
                            <td className="border-r border-b border-black py-0.5 px-0.5 font-bold bg-indigo-50/60 text-indigo-950">{c.countAboveFive}</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5 font-bold bg-indigo-50/60 text-indigo-950">{c.pctAboveFive}%</td>
                            <td className="border-r border-b border-black py-0.5 px-0.5 font-bold text-blue-900 bg-slate-100">{c.mean.toFixed(2)}</td>
                          </tr>
                        ))}

                        {overall && (
                          <tr className="font-bold bg-slate-200 text-slate-900 border-b-2 border-black text-[11px]">
                            <td className="border-r border-b border-black py-1 px-0.5"></td>
                            <td className="border-r border-b border-black py-1 px-1 text-center uppercase">TOÀN KHỐI</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.totalStudents}</td>
                            <td className={`border-r border-b border-black py-1 px-0.5 ${overall.count0to1 > 0 ? 'text-red-900' : ''}`}>{overall.count0to1}</td>
                            <td className={`border-r border-b border-black py-1 px-0.5 ${overall.count0to1 > 0 ? 'text-red-900' : ''}`}>{overall.pct0to1}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.count11to34}</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.pct11to34}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.count35to49}</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.pct35to49}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.count5to64}</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.pct5to64}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.count65to79}</td>
                            <td className="border-r border-b border-black py-1 px-0.5">{overall.pct65to79}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5 text-emerald-900">{overall.count8to10}</td>
                            <td className="border-r border-b border-black py-1 px-0.5 text-emerald-900">{overall.pct8to10}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5 text-indigo-950 font-black">{overall.countAboveFive}</td>
                            <td className="border-r border-b border-black py-1 px-0.5 text-indigo-950 font-black">{overall.pctAboveFive}%</td>
                            <td className="border-r border-b border-black py-1 px-0.5 text-blue-950 font-black bg-slate-300">{overall.mean.toFixed(2)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PHẦN 5: III. NHẬN ĐỊNH SƯ PHẠM & ĐỀ XUẤT CAN THIỆP CHẤT LƯỢNG (NẾU ĐƯỢC CHỌN) */}
              {includePedagogicalNotes && expertReport && (
                <div className="mb-4 text-xs space-y-2 border border-slate-400 p-3 rounded-lg bg-slate-50/50">
                  <div className="font-bold text-xs uppercase text-slate-900 flex items-center justify-between border-b border-slate-300 pb-1">
                    <span>III. NHẬN ĐỊNH SƯ PHẠM & ĐỀ XUẤT CAN THIỆP CHẤT LƯỢNG (GDPT 2018):</span>
                    <span className="text-[10px] text-emerald-700 font-semibold italic">Đã đồng bộ khuyến nghị chuyên gia khảo thí</span>
                  </div>

                  <div className="space-y-1 text-justify leading-relaxed">
                    <p>
                      <strong>1. Đánh giá tổng quan:</strong> {expertReport.partA_Overview.generalImpression}
                    </p>
                    
                    {expertReport.partB_Interventions.knowledgeBottlenecks.length > 0 && (
                      <p>
                        <strong>2. Nút thắt kiến thức trọng tâm:</strong> {expertReport.partB_Interventions.knowledgeBottlenecks.map(b => `${b.topicOrYccd} (Đạt: ${b.passRate}%)`).join('; ')}.
                      </p>
                    )}

                    {expertReport.partD_ActionPlan.length > 0 && (
                      <div>
                        <strong>3. Kế hoạch hành động can thiệp sư phạm:</strong>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5 pl-2 text-[11px]">
                          {expertReport.partD_ActionPlan.slice(0, 3).map((plan, i) => (
                            <li key={i}>
                              <span className="font-semibold text-slate-900">{plan.studentTargetGroup}:</span> {plan.pedagogicalAction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PHẦN 6: IV. KHỐI CHỮ KÝ DUYỆT 3 CỘT CHUẨN VĂN BẢN QUẢN LÝ GIÁO DỤC */}
              {includeSignatures && (
                <div className="mt-6 pt-2 border-t border-slate-400 text-xs">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {/* Cột 1 */}
                    <div className="space-y-1">
                      <div className="font-bold uppercase text-slate-900">NGƯỜI LẬP BIỂU</div>
                      <div className="italic text-[10.5px] text-slate-600">(Ký và ghi rõ họ tên)</div>
                      <div className="h-16 flex items-end justify-center font-bold text-slate-900">
                        {currentUser?.full_name || '.....................................'}
                      </div>
                    </div>

                    {/* Cột 2 */}
                    <div className="space-y-1">
                      <div className="font-bold uppercase text-slate-900">TỔ TRƯỞNG CHUYÊN MÔN</div>
                      <div className="italic text-[10.5px] text-slate-600">(Ký và ghi rõ họ tên)</div>
                      <div className="h-16 flex items-end justify-center font-bold text-slate-900">
                        .....................................
                      </div>
                    </div>

                    {/* Cột 3 */}
                    <div className="space-y-1">
                      <div className="font-bold uppercase text-slate-900">HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG</div>
                      <div className="italic text-[10.5px] text-slate-600">(Ký duyệt và đóng dấu)</div>
                      <div className="h-16 flex items-end justify-center font-bold text-slate-900">
                        .....................................
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
