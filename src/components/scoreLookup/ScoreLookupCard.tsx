import React, { useState, useEffect } from 'react';
import { 
  Search, Lock, Hash, Eye, EyeOff, AlertCircle, 
  BookOpen, ShieldCheck, ChevronDown, HelpCircle, Loader2
} from 'lucide-react';
import { ExamSeason, ScoreLookupResult } from '../../types';
import { ScoreLookupModal } from './ScoreLookupModal';

interface ScoreLookupCardProps {
  onOpenSupabaseGuide?: () => void;
}

export const ScoreLookupCard: React.FC<ScoreLookupCardProps> = ({ onOpenSupabaseGuide }) => {
  const [exams, setExams] = useState<ExamSeason[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [sbd, setSbd] = useState<string>('');
  const [cccd, setCccd] = useState<string>('');
  const [showCccd, setShowCccd] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ScoreLookupResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Lấy danh sách kỳ thi đã công bố từ hệ thống
  useEffect(() => {
    async function fetchPublishedExams() {
      setIsLoadingExams(true);
      try {
        const res = await fetch('/api/public/exams');
        const data = await res.json();
        if (data.success && Array.isArray(data.exams) && data.exams.length > 0) {
          setExams(data.exams);
          setSelectedExamId(data.exams[0].id);
        } else {
          // Fallback nếu danh sách rỗng
          const fallback: ExamSeason = {
            id: '11111111-2222-3333-4444-555555555555',
            title: 'Kiểm tra Giữa kỳ 1 - Môn Toán 12 (GDPT 2018)',
            academic_year: '2026-2027',
            exam_type: 'Kiểm tra định kỳ',
            subject: 'Toán học',
            is_published: true
          };
          setExams([fallback]);
          setSelectedExamId(fallback.id);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách kỳ thi:', err);
      } finally {
        setIsLoadingExams(false);
      }
    }
    fetchPublishedExams();
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSbd = sbd.trim();
    const cleanCccd = cccd.trim();

    if (!selectedExamId) {
      setErrorMessage('Vui lòng chọn Kỳ thi hoặc đợt kiểm tra cần tra cứu.');
      return;
    }
    if (!cleanSbd) {
      setErrorMessage('Vui lòng nhập Số báo danh (SBD).');
      return;
    }
    if (!cleanCccd) {
      setErrorMessage('Vui lòng nhập Mật khẩu là Số CCCD hoặc Mã định danh học sinh.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/public/lookup-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExamId,
          sbd: cleanSbd,
          cccd: cleanCccd
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Không tìm thấy kết quả. Vui lòng kiểm tra lại chính xác SBD và CCCD.');
        return;
      }

      setLookupResult(data);
      setIsModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể kết nối máy chủ tra cứu điểm. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form tra cứu */}
      <form onSubmit={handleLookup} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-800 text-xs flex items-start gap-2.5 animate-shake shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Chọn Kỳ thi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Đợt khảo thí / Kỳ thi</span>
              <span className="text-rose-500">*</span>
            </span>
            {isLoadingExams && (
              <span className="text-[10px] text-blue-600 flex items-center gap-1 font-normal">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Đang cập nhật...
              </span>
            )}
          </label>
          <div className="relative">
            <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              required
              className="w-full bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none transition-all appearance-none cursor-pointer shadow-xs"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} {ex.academic_year ? `(${ex.academic_year})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Ô nhập Số báo danh (Tài khoản) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Số báo danh (SBD)</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-normal">Do hội đồng cấp</span>
          </div>
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={sbd}
              onChange={(e) => setSbd(e.target.value)}
              placeholder="Nhập chính xác Số báo danh..."
              className="w-full bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono font-semibold tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Ô nhập Mật khẩu là CCCD */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Mật khẩu: Số CCCD / Mã định danh</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-md">Bảo mật</span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type={showCccd ? 'text' : 'password'}
              required
              value={cccd}
              onChange={(e) => setCccd(e.target.value)}
              placeholder="Nhập 12 số CCCD hoặc Mã định danh..."
              className="w-full bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowCccd(!showCccd)}
              aria-label={showCccd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
            >
              {showCccd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Nút Tra cứu */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Đang kết nối hệ thống tra cứu...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Tra cứu kết quả điểm thi</span>
            </>
          )}
        </button>
      </form>

      {/* Thông tin hỗ trợ & bảo mật */}
      <div className="space-y-2 pt-1">
        <div className="flex items-start gap-2.5 text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-800">Bảo mật điểm số:</strong> Điểm thi được bảo mật theo quy định khảo thí. Thí sinh chỉ xem được kết quả thi của chính mình khi nhập đúng cả Số báo danh và Mã CCCD.
          </span>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            Quên SBD hoặc chưa có mã định danh?
          </span>
          <span className="text-slate-600 font-medium">Liên hệ GVCN / Ban Khảo thí</span>
        </div>
      </div>

      {/* Modal hiển thị chi tiết điểm thi */}
      {lookupResult && (
        <ScoreLookupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          result={lookupResult}
        />
      )}
    </div>
  );
};
