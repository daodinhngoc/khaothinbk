import React, { useState, useEffect } from 'react';
import { 
  Search, Lock, Hash, Eye, EyeOff, AlertCircle, Sparkles, 
  GraduationCap, Calendar, CheckCircle2, BookOpen, ShieldCheck, ChevronDown
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

  // Điền dữ liệu mẫu nhanh để người dùng thử nghiệm
  const fillSampleData = (sampleSbd: string, sampleCccd: string) => {
    setSbd(sampleSbd);
    setCccd(sampleCccd);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-4">
      {/* Form tra cứu */}
      <form onSubmit={handleLookup} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Chọn Kỳ thi */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Chọn Kỳ thi / Bài kiểm tra</span>
            {isLoadingExams && <span className="text-[10px] text-blue-600 font-normal">Đang tải...</span>}
          </label>
          <div className="relative">
            <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-8 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.academic_year})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Ô nhập Số báo danh (Tài khoản) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Tài khoản: Số báo danh (SBD)</span>
            <span className="text-[10px] text-slate-400">Do nhà trường cấp</span>
          </label>
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={sbd}
              onChange={(e) => setSbd(e.target.value)}
              placeholder="VD: 52830017 hoặc 52830052"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono font-bold tracking-wider focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Ô nhập Mật khẩu là CCCD */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              Mật khẩu: Số CCCD / Mã định danh
            </label>
            <span className="text-[10px] text-indigo-600 font-semibold">Bảo mật riêng tư</span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showCccd ? 'text' : 'password'}
              required
              value={cccd}
              onChange={(e) => setCccd(e.target.value)}
              placeholder="Nhập 12 số CCCD (VD: 038209009347)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowCccd(!showCccd)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showCccd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Nút Tra cứu */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <span>Đang tra cứu dữ liệu...</span>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Tra cứu kết quả thi</span>
            </>
          )}
        </button>
      </form>

      {/* Thử nghiệm nhanh với học sinh mẫu từ file thực tế */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
          <span className="flex items-center gap-1 text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Thử nghiệm nhanh học sinh mẫu (từ bảng điểm thực tế):
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => fillSampleData('52830017', '038209009347')}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            title="Lê Đức Anh: Toán 6.0, Sử 8.5, Địa 4.9"
          >
            Lê Đức Anh (SBD: 52830017)
          </button>
          <button
            type="button"
            onClick={() => fillSampleData('52830052', '033309000311')}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            title="Phạm Băng Băng: Toán 4.8, Sử 9.3, Địa 7.8"
          >
            Phạm Băng Băng (SBD: 52830052)
          </button>
          <button
            type="button"
            onClick={() => fillSampleData('52830050', '064209005399')}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            title="Dương Trọng Bằng: Toán 2.0, Sử 6.5, GDKT PL 6.1"
          >
            Dương Trọng Bằng (SBD: 52830050)
          </button>
          <button
            type="button"
            onClick={() => fillSampleData('52830151', '064309005376')}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            title="Trần Gia Hân: Toán 4.0, Sử 7.4, Tiếng Anh 4.3"
          >
            Trần Gia Hân (SBD: 52830151)
          </button>
        </div>
      </div>

      {/* Ghi chú bảo mật cho học sinh */}
      <div className="flex items-start gap-2 text-slate-500 text-[11px] leading-relaxed bg-blue-50/60 p-3 rounded-xl border border-blue-100">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>Bảo mật điểm thi:</strong> Học sinh bắt buộc phải nhập đúng cả Số báo danh và Mật khẩu (Số CCCD / Định danh học sinh) để bảo vệ quyền riêng tư điểm số theo quy định.
        </span>
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
