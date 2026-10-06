import React, { useRef, useState } from 'react';
import { 
  X, Printer, Award, CheckCircle2, AlertCircle, FileText, 
  GraduationCap, Calendar, Hash, ShieldCheck, User, School, Sparkles, BookOpen,
  Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, Eye, ChevronRight
} from 'lucide-react';
import { ScoreLookupResult } from '../../types';

// Chuẩn hóa tên môn học tiếng Việt để đối soát chính xác tuyệt đối
function normalizeSubjName(s: string): string {
  if (!s) return '';
  const clean = s.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  
  if (clean === 'toan') return 'toan';
  if (clean === 'van' || clean === 'ngu van') return 'van';
  if (clean === 'su' || clean === 'lich su') return 'su';
  if (clean === 'dia' || clean === 'dia li' || clean === 'dia ly') return 'dia';
  if (clean === 'ly' || clean === 'vat ly' || clean === 'vat li') return 'ly';
  if (clean === 'hoa' || clean === 'hoa hoc') return 'hoa';
  if (clean === 'sinh' || clean === 'sinh hoc') return 'sinh';
  if (clean === 'anh' || clean === 'tieng anh' || clean === 'ngoai ngu') return 'anh';
  if (clean === 'tin' || clean === 'tin hoc') return 'tin';
  if (clean.includes('cong nghe') || clean.includes('cn')) return 'cn';
  if (clean.includes('gdcd') || clean.includes('gdkt') || clean.includes('phap luat')) return 'gdcd';
  return clean;
}

// Hàm đối soát linh hoạt giữa tên môn trong bảng điểm và tên môn trong ảnh bài thi
function findPaperImage(subject: string, papers: Record<string, string>): { url: string; matchedKey: string } | null {
  if (!papers || typeof papers !== 'object') return null;
  
  // 1. Khớp chính xác tuyệt đối
  if (papers[subject]) {
    return { url: papers[subject], matchedKey: subject };
  }
  
  // 2. Khớp không phân biệt chữ hoa / chữ thường và khoảng trắng
  const subLower = subject.trim().toLowerCase();
  for (const [k, url] of Object.entries(papers)) {
    if (k.trim().toLowerCase() === subLower && url) {
      return { url, matchedKey: k };
    }
  }

  // 3. Khớp tên chuẩn hóa (Sử <-> Lịch sử, Địa <-> Địa lí/Địa lý, Lý <-> Vật lí/Vật lý, ...)
  const subNorm = normalizeSubjName(subject);
  for (const [k, url] of Object.entries(papers)) {
    if (url && normalizeSubjName(k) === subNorm) {
      return { url, matchedKey: k };
    }
  }

  // 4. Khớp chứa từ (ví dụ "Sử" nằm trong "Lịch sử", "Địa" nằm trong "Địa lí")
  for (const [k, url] of Object.entries(papers)) {
    if (!url) continue;
    const kNorm = normalizeSubjName(k);
    if ((subNorm.length >= 2 && kNorm.includes(subNorm)) || (kNorm.length >= 2 && subNorm.includes(kNorm))) {
      return { url, matchedKey: k };
    }
  }

  return null;
}

interface ScoreLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ScoreLookupResult;
}

export const ScoreLookupModal: React.FC<ScoreLookupModalProps> = ({ isOpen, onClose, result }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedPaper, setSelectedPaper] = useState<{ subject: string; url: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

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

  // Trích xuất link ảnh bài thi của các môn
  let paperImages: Record<string, string> = student.paper_images || {};
  if ((!paperImages || Object.keys(paperImages).length === 0) && Array.isArray(student.item_responses)) {
    const pMeta = student.item_responses.find((it: any) => it && (it.type === 'paper_images' || it.paper_images));
    if (pMeta && (pMeta.data || pMeta.paper_images)) {
      paperImages = pMeta.data || pMeta.paper_images || {};
    }
  }
  const paperEntries = Object.entries(paperImages).filter(([_, url]) => Boolean(url));

  // Tính điểm trung bình các môn có thi
  const numericScores = subjectEntries
    .map(([_, v]) => typeof v === 'number' ? v : parseFloat(String(v)))
    .filter(v => !isNaN(v));

  const averageScore = student.average_score !== null && student.average_score !== undefined
    ? student.average_score
    : (numericScores.length > 0 ? parseFloat((numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(2)) : student.total_score);

  const highestScore = numericScores.length > 0 ? Math.max(...numericScores) : averageScore;
  const classification = getScoreClassification(averageScore);

  const handleOpenPaper = (subject: string, url: string) => {
    setSelectedPaper({ subject, url });
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <>
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
                <p className="text-[11px] text-blue-100 opacity-90">Bảng điểm tổng hợp các môn & Phiếu bài thi scan</p>
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

              <div className="pt-2">
                <h1 className="text-base sm:text-lg font-black text-blue-900 uppercase tracking-tight">
                  PHIẾU BÁO ĐIỂM KIỂM TRA ĐÁNH GIÁ ĐIỆN TỬ
                </h1>
                <p className="text-xs font-bold text-slate-700">
                  {exam.title} ({exam.academic_year})
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span>Loại hình: <strong>{exam.exam_type}</strong></span>
                  <span>•</span>
                  <span>Ngày thi: <strong>{exam.exam_date || 'Năm học 2026-2027'}</strong></span>
                </div>
              </div>
            </div>

            {/* Thông tin Thí sinh */}
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

            {/* BẢNG ĐIỂM TỔNG HỢP TẤT CẢ CÁC MÔN THI & XEM BÀI THI SCAN TRỰC TIẾP */}
            {(() => {
              // Đối soát toàn bộ ảnh bài thi scan cho từng môn (hỗ trợ cả viết tắt, tên đồng nghĩa, v.v.)
              const matchedKeys = new Set<string>();
              const rows: {
                subject: string;
                score: any;
                isAbsent: boolean;
                numVal: number;
                subClass: { label: string; color: string } | null;
                paperUrl: string | null;
              }[] = [];

              subjectEntries.forEach(([subj, val]) => {
                const isAbsent = val === 'VT' || val === 'Vắng';
                const numVal = typeof val === 'number' ? val : parseFloat(String(val));
                const subClass = !isNaN(numVal) ? getScoreClassification(numVal) : null;
                const matched = findPaperImage(subj, paperImages);
                if (matched) matchedKeys.add(matched.matchedKey);

                rows.push({
                  subject: subj,
                  score: val,
                  isAbsent,
                  numVal,
                  subClass,
                  paperUrl: matched ? matched.url : null
                });
              });

              // Bổ sung môn nếu có ảnh bài thi nhưng chưa có trong danh sách subject_scores
              Object.entries(paperImages).forEach(([pSubj, pUrl]) => {
                if (pUrl && !matchedKeys.has(pSubj)) {
                  rows.push({
                    subject: pSubj,
                    score: '—',
                    isAbsent: false,
                    numVal: NaN,
                    subClass: null,
                    paperUrl: pUrl
                  });
                }
              });

              const totalScans = Object.values(paperImages).filter(Boolean).length;

              return (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Bảng điểm chi tiết từng môn thi:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {totalScans > 0 && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Đã có {totalScans} bài thi scan</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-normal">
                        {rows.length > 0 ? `Tổng ${rows.length} môn` : 'Kết quả môn'}
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Môn thi / Đánh giá</th>
                        <th className="py-2.5 px-3 text-right">Điểm số</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        <th className="py-2.5 px-3 text-center">Đánh giá</th>
                        <th className="py-2.5 px-3 text-center w-36">Bài thi scan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.length > 0 ? (
                        rows.map((row, idx) => {
                          return (
                            <tr key={row.subject} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">{row.subject}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                                {row.isAbsent ? (
                                  <span className="text-rose-600 font-bold">Vắng thi (VT)</span>
                                ) : (
                                  <span className="text-blue-900">{!isNaN(row.numVal) ? row.numVal.toFixed(2) : String(row.score)}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {row.isAbsent ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Vắng thi
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Đã dự thi
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {row.subClass ? (
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.subClass.color}`}>
                                    {row.subClass.label}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {row.paperUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaper(row.subject, row.paperUrl!)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer group"
                                    title={`Xem phiếu bài thi môn ${row.subject}`}
                                  >
                                    <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                    <span>Xem bài thi</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        // Trường hợp thi 1 môn đơn lẻ
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">1</td>
                          <td className="py-3 px-3 font-bold text-slate-900 text-sm">{exam.subject || 'Môn thi'}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-base text-blue-900">
                            {student.total_score.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Đã dự thi
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${classification.color}`}>
                              {classification.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {paperEntries.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPaper(paperEntries[0][0], paperEntries[0][1])}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer group"
                                title="Xem phiếu bài thi"
                              >
                                <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span>Xem bài thi</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}

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

      {/* POPUP XEM ẢNH BÀI THI / SCAN ĐỘ PHÂN GIẢI CAO (ZOOM & XOAY) */}
      {selectedPaper && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[95vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col text-white">
            
            {/* Header Toolbar */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Ảnh bài thi môn: {selectedPaper.subject}</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] rounded-full font-mono">
                      SBD: {student.sbd}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Thí sinh: <strong className="text-slate-200">{student.full_name}</strong> • Lớp: {student.class_name}
                  </p>
                </div>
              </div>

              {/* Bộ điều khiển Zoom / Xoay / Tải về / Đóng */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                  title="Phóng to (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                  title="Thu nhỏ (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoomLevel(1); setRotation(0); }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
                  title="Đặt lại kích thước ban đầu"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                  title="Xoay ảnh 90 độ"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <a
                  href={selectedPaper.url}
                  download={`BaiThi_${student.sbd}_${selectedPaper.subject}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Tải ảnh về máy"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPaper(null)}
                  className="p-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer ml-1"
                  title="Đóng xem ảnh"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Khung hiển thị ảnh bài thi */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/90 min-h-[450px]">
              <div 
                className="transition-transform duration-200 max-w-full flex items-center justify-center"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              >
                <img
                  src={selectedPaper.url}
                  alt={`Bài thi môn ${selectedPaper.subject} - SBD ${student.sbd}`}
                  className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-700 bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://placehold.co/800x1100/png?text=Kh%C3%B4ng+th%E1%BB%83+t%E1%BA%A3i+%E1%BA%A3nh+b%C3%A0i+thi';
                  }}
                />
              </div>
            </div>

            {/* Footer Toolbar */}
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Mẹo: Nhấn nút phóng to / thu nhỏ hoặc xoay ảnh nếu phiếu scan chụp ngược chiều.</span>
              <button
                type="button"
                onClick={() => setSelectedPaper(null)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Đóng ảnh bài thi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
