import React, { useState, useMemo } from 'react';
import { 
  X, Filter, Download, UserCheck, AlertTriangle, BookOpen, 
  Users, CheckCircle2, ChevronRight, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { StudentExamScoreRecord } from '../../types';
import { exportFilteredStudentsExcel } from '../../utils/scoreStatisticsExcelExport';

interface FilterRemedialStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  academicYear?: string;
  students: StudentExamScoreRecord[];
  availableSubjects: string[];
  availableClasses: string[];
}

export const FilterRemedialStudentsModal: React.FC<FilterRemedialStudentsModalProps> = ({
  isOpen,
  onClose,
  examTitle,
  academicYear = '2026-2027',
  students,
  availableSubjects,
  availableClasses
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(availableSubjects[0] || 'Toán');
  const [filterType, setFilterType] = useState<'below' | 'above_equal' | 'range'>('below');
  const [threshold, setThreshold] = useState<number>(5.0);
  const [maxThreshold, setMaxThreshold] = useState<number>(10.0);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Lọc danh sách học sinh theo điều kiện realtime
  const matchedStudents = useMemo(() => {
    return students.filter(st => {
      if (selectedClass !== 'all' && String(st.class_name || '').trim() !== selectedClass) {
        return false;
      }

      const scores = st.subject_scores || {};
      let val = scores[selectedSubject];
      if (val === undefined || val === null || val === '') {
        const subLower = selectedSubject.trim().toLowerCase();
        for (const [k, v] of Object.entries(scores)) {
          if (k.trim().toLowerCase() === subLower) { val = v; break; }
        }
      }

      if (val === 'VT' || val === 'Vắng' || val === undefined || val === null || val === '') {
        return false;
      }

      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
      if (isNaN(num)) return false;

      if (filterType === 'below') {
        return num < threshold;
      } else if (filterType === 'above_equal') {
        return num >= threshold;
      } else if (filterType === 'range') {
        return num >= threshold && num <= maxThreshold;
      }
      return true;
    }).sort((a, b) => {
      const classComp = String(a.class_name || '').localeCompare(String(b.class_name || ''), 'vi', { numeric: true });
      if (classComp !== 0) return classComp;
      const scoreA = parseFloat(String(a.subject_scores?.[selectedSubject] || 0));
      const scoreB = parseFloat(String(b.subject_scores?.[selectedSubject] || 0));
      return scoreA - scoreB;
    });
  }, [students, selectedSubject, selectedClass, filterType, threshold, maxThreshold]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportFilteredStudentsExcel({
        examTitle,
        academicYear,
        subject: selectedSubject,
        filterType,
        threshold,
        maxThreshold,
        classFilter: selectedClass,
        students
      });
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-800 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                LỌC DANH SÁCH HỌC SINH THEO NGƯỠNG ĐIỂM
              </h3>
              <p className="text-xs text-blue-100 opacity-90">
                Lập danh sách phụ đạo kiến thức, củng cố học sinh yếu hoặc bồi dưỡng học sinh khá/giỏi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Bộ lọc điều kiện */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            
            {/* 1. Chọn Môn thi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. Chọn Môn thi:
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {availableSubjects.map(s => (
                  <option key={s} value={s}>Môn {s}</option>
                ))}
              </select>
            </div>

            {/* 2. Chọn Phạm vi Lớp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                2. Phạm vi Lớp:
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="all">Toàn khối (Tất cả các lớp)</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>Lớp {c}</option>
                ))}
              </select>
            </div>

            {/* 3. Kiểu lọc */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                3. Mục đích lọc:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="below">Học sinh cần phụ đạo (Điểm &lt; ngưỡng)</option>
                <option value="above_equal">Học sinh giỏi / bồi dưỡng (Điểm ≥ ngưỡng)</option>
                <option value="range">Khoảng điểm tùy chọn (Từ Min đến Max)</option>
              </select>
            </div>
          </div>

          {/* Thiết lập ngưỡng điểm & Các phím tắt nhanh */}
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-950 block">
                  Thiết lập ngưỡng điểm xét tuyển:
                </span>
                <span className="text-[11px] text-indigo-700">
                  {filterType === 'below' && `Lọc tất cả học sinh có điểm môn ${selectedSubject} nhỏ hơn ngưỡng`}
                  {filterType === 'above_equal' && `Lọc tất cả học sinh có điểm môn ${selectedSubject} từ ngưỡng trở lên`}
                  {filterType === 'range' && `Lọc học sinh trong khoảng điểm từ ${threshold} đến ${maxThreshold}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-300 shadow-2xs">
                  <span className="text-xs font-bold text-slate-600">
                    {filterType === 'below' ? 'Điểm <' : (filterType === 'above_equal' ? 'Điểm ≥' : 'Từ')}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                    className="w-16 font-mono font-bold text-blue-900 text-sm focus:outline-none text-center"
                  />
                </div>

                {filterType === 'range' && (
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-300 shadow-2xs">
                    <span className="text-xs font-bold text-slate-600">Đến</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={maxThreshold}
                      onChange={(e) => setMaxThreshold(parseFloat(e.target.value) || 10)}
                      className="w-16 font-mono font-bold text-blue-900 text-sm focus:outline-none text-center"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Phím bấm chọn nhanh thông dụng */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-200/50">
              <span className="text-[11px] font-semibold text-indigo-900">Mẫu chọn nhanh:</span>
              <button
                type="button"
                onClick={() => { setFilterType('below'); setThreshold(5.0); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterType === 'below' && threshold === 5.0
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                Cần phụ đạo (&lt; 5.0)
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('below'); setThreshold(3.5); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterType === 'below' && threshold === 3.5
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                Yếu kém (&lt; 3.5)
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('below'); setThreshold(6.0); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterType === 'below' && threshold === 6.0
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                Dưới khá (&lt; 6.0)
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('above_equal'); setThreshold(8.0); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterType === 'above_equal' && threshold === 8.0
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                Bồi dưỡng HSG (≥ 8.0)
              </button>
            </div>
          </div>

          {/* Khu vực Bảng xem trước kết quả lọc */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Xem trước danh sách kết quả ({matchedStudents.length} học sinh):</span>
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                Môn {selectedSubject} • {selectedClass === 'all' ? 'Toàn khối' : `Lớp ${selectedClass}`}
              </span>
            </div>

            <div className="max-h-[36vh] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3">SBD</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3 text-center">Lớp</th>
                    <th className="py-2.5 px-3 text-center">Ngày sinh</th>
                    <th className="py-2.5 px-3 text-right">Điểm {selectedSubject}</th>
                    <th className="py-2.5 px-3 text-center">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Không có học sinh nào thỏa mãn điều kiện lọc điểm trên.
                      </td>
                    </tr>
                  ) : (
                    matchedStudents.map((st, idx) => {
                      const rawScore = st.subject_scores?.[selectedSubject];
                      const numScore = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore).replace(',', '.'));

                      let badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                      let rankName = 'Yếu';
                      if (numScore <= 1.0) { badgeColor = 'bg-rose-200 text-rose-900 border-rose-400'; rankName = 'Liệt'; }
                      else if (numScore <= 3.4) { badgeColor = 'bg-rose-100 text-rose-800 border-rose-300'; rankName = 'Kém'; }
                      else if (numScore < 5.0) { badgeColor = 'bg-amber-100 text-amber-800 border-amber-300'; rankName = 'Yếu'; }
                      else if (numScore <= 6.4) { badgeColor = 'bg-amber-50 text-amber-700 border-amber-200'; rankName = 'TB'; }
                      else if (numScore <= 7.9) { badgeColor = 'bg-blue-100 text-blue-800 border-blue-300'; rankName = 'Khá'; }
                      else { badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300'; rankName = 'Giỏi'; }

                      return (
                        <tr key={st.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">{st.sbd}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{st.full_name}</td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-700">{st.class_name}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{st.dob || '—'}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-sm">
                            <span className={numScore < 5.0 ? 'text-rose-600' : (numScore >= 8.0 ? 'text-emerald-700' : 'text-blue-900')}>
                              {!isNaN(numScore) ? numScore.toFixed(2) : String(rawScore)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {rankName}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{matchedStudents.length} học sinh</strong> sẽ được kết xuất vào file Excel chuẩn in A4.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={matchedStudents.length === 0 || isExporting}
              onClick={handleExport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo Excel...' : 'Tải File Excel Danh Sách'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
