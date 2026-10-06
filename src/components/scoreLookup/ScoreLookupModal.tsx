import React, { useRef } from 'react';
import { 
  X, Printer, Award, CheckCircle2, AlertCircle, FileText, 
  GraduationCap, Calendar, Hash, ShieldCheck, User, School, Sparkles, BookOpen
} from 'lucide-react';
import { ScoreLookupResult } from '../../types';

interface ScoreLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ScoreLookupResult;
}

export const ScoreLookupModal: React.FC<ScoreLookupModalProps> = ({ isOpen, onClose, result }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !result) return null;

  const { student, exam } = result;

  const handlePrint = () => {
    window.print();
  };

  const getScoreClassification = (score: number) => {
    if (score >= 9.0) return { label: 'Xuất sắc', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 8.0) return { label: 'Giỏi', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 6.5) return { label: 'Khá', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
    if (score >= 5.0) return { label: 'Trung bình', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Cần cố gắng', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  // Lấy danh sách điểm các môn học (hỗ trợ cả subject_scores và item_responses)
  let subjectScores = student.subject_scores || {};
  if (Object.keys(subjectScores).length === 0 && Array.isArray(student.item_responses)) {
    const meta = student.item_responses.find((it: any) => it && (it.type === 'subject_scores' || it.data));
    if (meta && meta.data) {
      subjectScores = meta.data;
    }
  }
  const subjectEntries = Object.entries(subjectScores).filter(([_, val]) => val !== null && val !== undefined && val !== '');

  // Tính điểm trung bình các môn có thi
  const numericScores = subjectEntries
    .map(([_, v]) => typeof v === 'number' ? v : parseFloat(String(v)))
    .filter(v => !isNaN(v));

  const averageScore = student.average_score !== null && student.average_score !== undefined
    ? student.average_score
    : (numericScores.length > 0 ? parseFloat((numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(2)) : student.total_score);

  const highestScore = numericScores.length > 0 ? Math.max(...numericScores) : averageScore;
  const classification = getScoreClassification(averageScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header điều hướng */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">KẾT QUẢ THI / KIỂM TRA ĐIỆN TỬ</h2>
              <p className="text-[11px] text-blue-100 opacity-90">Bảng điểm tổng hợp các môn theo SBD & CCCD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="In phiếu báo điểm"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In kết quả A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Phiếu Báo Điểm (In chuẩn A4) */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4">
          
          {/* Header hành chính */}
          <div className="border-b border-slate-200 pb-4 text-center space-y-1">
            <div className="flex justify-between items-start text-[11px] text-slate-600 font-semibold uppercase">
              <div className="text-left">
                <div className="text-slate-500 font-normal">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                <div className="font-bold text-slate-800">TRƯỜNG THPT NGUYỄN BỈNH KHIÊM</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="italic text-[10px] text-slate-500 font-normal">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="pt-3">
              <h1 className="text-base sm:text-lg font-black text-blue-900 tracking-wide uppercase">
                PHIẾU BÁO ĐIỂM THI / KIỂM TRA TỔNG HỢP CÁC MÔN
              </h1>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {exam.title}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 italic mt-1">
                <span>Năm học: <strong>{exam.academic_year}</strong></span>
                <span>Kỳ thi: <strong>{exam.exam_type}</strong></span>
                {exam.exam_date && <span>Ngày thi: <strong>{exam.exam_date}</strong></span>}
              </div>
            </div>
          </div>

          {/* Khung Thông tin Thí sinh */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Thông tin Thí sinh</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Họ và tên:</span>
                <span className="font-bold text-slate-900 text-sm">{student.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Số báo danh (SBD):</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{student.sbd}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Lớp:</span>
                <span className="font-bold text-slate-900">{student.class_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Số CCCD / Định danh:</span>
                <span className="font-mono font-semibold text-slate-700">{student.cccd_masked}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Ngày sinh:</span>
                <span className="font-semibold text-slate-700">{student.dob || '—'}</span>
              </div>
              {student.exam_code && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Mã đề thi:</span>
                  <span className="font-mono font-bold text-slate-800">{student.exam_code}</span>
                </div>
              )}
              {student.room_name && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Phòng thi:</span>
                  <span className="font-semibold text-slate-700">{student.room_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Khung Thẻ Tổng Kết Điểm Số */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-blue-700 uppercase">Điểm trung bình các môn</div>
              <div className="text-3xl font-black font-mono text-blue-900 mt-1">
                {averageScore.toFixed(2)}
              </div>
              <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${classification.color}`}>
                  {classification.label}
                </span>
              </div>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-emerald-700 uppercase">Số môn dự thi</div>
              <div className="text-3xl font-black font-mono text-emerald-900 mt-1">
                {numericScores.length}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                môn có kết quả
              </div>
            </div>

            <div className="border border-indigo-200 bg-indigo-50/60 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-indigo-700 uppercase">Điểm môn cao nhất</div>
              <div className="text-3xl font-black font-mono text-indigo-900 mt-1">
                {highestScore.toFixed(2)}
              </div>
              <div className="text-[11px] text-indigo-700 mt-1 font-semibold">
                thành tích tốt nhất
              </div>
            </div>
          </div>

          {/* BẢNG ĐIỂM TỔNG HỢP TẤT CẢ CÁC MÔN THI */}
          <div className="border border-slate-200 rounded-xl overflow-hidden space-y-0">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Bảng điểm chi tiết từng môn thi:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {subjectEntries.length > 0 ? `Đã đăng ký ${subjectEntries.length} môn` : 'Kết quả môn'}
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4 w-12 text-center">STT</th>
                  <th className="py-2.5 px-4">Môn thi / Đánh giá</th>
                  <th className="py-2.5 px-4 text-right">Điểm số</th>
                  <th className="py-2.5 px-4 text-center">Trạng thái</th>
                  <th className="py-2.5 px-4 text-center">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectEntries.length > 0 ? (
                  subjectEntries.map(([subj, val], idx) => {
                    const isAbsent = val === 'VT' || val === 'Vắng';
                    const numVal = typeof val === 'number' ? val : parseFloat(String(val));
                    const subClass = !isNaN(numVal) ? getScoreClassification(numVal) : null;

                    return (
                      <tr key={subj} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 text-sm">{subj}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-sm">
                          {isAbsent ? (
                            <span className="text-rose-600 font-bold">Vắng thi (VT)</span>
                          ) : (
                            <span className="text-blue-900">{!isNaN(numVal) ? numVal.toFixed(2) : String(val)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isAbsent ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Vắng thi
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Đã dự thi
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {subClass ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${subClass.color}`}>
                              {subClass.label}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Trường hợp thi 1 môn đơn lẻ
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">1</td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">{exam.subject || 'Môn thi'}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-base text-blue-900">
                      {student.total_score.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Đã dự thi
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${classification.color}`}>
                        {classification.label}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ghi chú của nhà trường */}
          {student.notes && (
            <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3 text-xs text-slate-700">
              <span className="font-bold text-slate-900">Ghi chú & Nhận xét: </span>
              <span>{student.notes}</span>
            </div>
          )}

          {/* Chữ ký & Xác thực phiếu điểm */}
          <div className="pt-4 border-t border-slate-200 text-xs flex justify-between items-end">
            <div className="space-y-1 text-slate-500 text-[11px]">
              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Phiếu điểm điện tử xác thực từ CSDL Supabase Nhà trường</span>
              </div>
              <div>Thời gian tra cứu: {new Date().toLocaleTimeString('vi-VN')} ngày {new Date().toLocaleDateString('vi-VN')}</div>
            </div>

            <div className="text-center space-y-10">
              <div className="font-bold text-slate-800 text-[11px] uppercase">
                HIỆU TRƯỞNG / TRƯỞNG ĐIỂM THI
              </div>
              <div className="italic text-[10px] text-slate-400">
                (Đã ký duyệt và công bố điện tử)
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-[11px] text-slate-500">
            Học sinh có thể in hoặc chụp lại phiếu báo điểm để lưu giữ.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
