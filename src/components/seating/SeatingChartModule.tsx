import React, { useState, useMemo } from 'react';
import { 
  Printer, Sparkles, School, ArrowRight, BookOpen, Layers, 
  CheckCircle2, Users, LayoutGrid, Shuffle, Info, X, Check,
  FileSpreadsheet, Tag, ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { CandidateAssigned, ExamConfig } from '../../types';
import { 
  computeRoomDeskMatrix, 
  groupDesksByRow, 
  SUBJECT_PRESETS,
  SubjectPreset,
  DeskInfo
} from '../../utils/seatingHelper';
import { 
  exportSeatingChartAllRoomsExcel, 
  exportDeskLabelsExcel 
} from '../../utils/excelExport';
import { getRoomCode } from '../../utils/optimizer';

interface SeatingChartModuleProps {
  candidates: CandidateAssigned[];
  totalRooms?: number;
  config: ExamConfig;
}

export const SeatingChartModule: React.FC<SeatingChartModuleProps> = ({
  candidates,
  totalRooms = 1,
  config,
}) => {
  const [selectedRoomNo, setSelectedRoomNo] = useState<number>(1);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  
  // Trạng thái modal in ấn
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printScope, setPrintScope] = useState<'single' | 'all'>('all');
  const [printView, setPrintView] = useState<'chart' | 'stickers'>('chart');
  
  // Trạng thái loading xuất Excel
  const [isExportingChart, setIsExportingChart] = useState<boolean>(false);
  const [isExportingLabels, setIsExportingLabels] = useState<boolean>(false);

  const calculatedTotalRooms = useMemo(() => {
    if (totalRooms && totalRooms > 0) return totalRooms;
    if (candidates.length > 0) {
      return Math.max(...candidates.map((c) => c['Phòng thi']));
    }
    return 1;
  }, [totalRooms, candidates]);

  const currentPreset = SUBJECT_PRESETS[selectedPresetIndex];
  const activeSubjectName = customSubjectName.trim() || currentPreset.name;

  // Lọc thí sinh theo phòng thi đang chọn trên màn hình
  const roomCandidates = useMemo(() => {
    return candidates
      .filter((c) => c['Phòng thi'] === selectedRoomNo)
      .sort((a, b) => (a.STT_Phong || 0) - (b.STT_Phong || 0));
  }, [candidates, selectedRoomNo]);

  // Tính toán vị trí chỗ ngồi cho 24 bàn (4 dãy x 6 hàng) của phòng đang chọn
  const deskMatrix = useMemo(() => {
    return computeRoomDeskMatrix(roomCandidates, currentPreset.pattern);
  }, [roomCandidates, currentPreset.pattern]);

  // Gom nhóm theo 6 hàng (mỗi hàng gồm 4 dãy)
  const rowsGrouped = useMemo(() => {
    return groupDesksByRow(deskMatrix);
  }, [deskMatrix]);

  // Danh sách thí sinh dùng cho chế độ in thẻ dán bàn
  const candidatesForStickers = useMemo(() => {
    const list = printScope === 'all'
      ? candidates
      : candidates.filter(c => c['Phòng thi'] === selectedRoomNo);
    
    return [...list].sort((a, b) => {
      if (a['Phòng thi'] !== b['Phòng thi']) return a['Phòng thi'] - b['Phòng thi'];
      return (a.STT_Phong || 0) - (b.STT_Phong || 0);
    });
  }, [candidates, printScope, selectedRoomNo]);

  // Chia danh sách thí sinh làm các trang nhãn dán bàn (8 thẻ mỗi trang A4)
  const stickerPages = useMemo(() => {
    const pages: CandidateAssigned[][] = [];
    const pageSize = 8;
    for (let i = 0; i < candidatesForStickers.length; i += pageSize) {
      pages.push(candidatesForStickers.slice(i, i + pageSize));
    }
    return pages;
  }, [candidatesForStickers]);

  // Xử lý xuất Excel Sơ đồ tất cả các phòng
  const handleExportAllRoomsExcel = async () => {
    try {
      setIsExportingChart(true);
      await exportSeatingChartAllRoomsExcel(
        candidates,
        config,
        currentPreset.pattern,
        currentPreset.patternName,
        activeSubjectName
      );
    } catch (err) {
      console.error('Lỗi xuất Excel Sơ đồ:', err);
    } finally {
      setIsExportingChart(false);
    }
  };

  // Xử lý xuất Excel Thẻ dán bàn
  const handleExportDeskLabelsExcel = async () => {
    try {
      setIsExportingLabels(true);
      await exportDeskLabelsExcel(candidates, config);
    } catch (err) {
      console.error('Lỗi xuất Excel Thẻ dán bàn:', err);
    } finally {
      setIsExportingLabels(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Mở modal in ấn tất cả các phòng
  const openPrintAll = (view: 'chart' | 'stickers') => {
    setPrintScope('all');
    setPrintView(view);
    setShowPrintModal(true);
  };

  // Mở modal in 1 phòng
  const openPrintSingle = (view: 'chart' | 'stickers') => {
    setPrintScope('single');
    setPrintView(view);
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-6">
      {/* THANH ĐIỀU KHIỂN CHÍNH & XUẤT TẤT CẢ PHÒNG 1 LƯỢT */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <LayoutGrid className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Sơ đồ Bố trí Số Báo Danh & Chỗ ngồi theo Môn thi (4 Dãy x 6 Hàng)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Hệ thống tự động hoán đổi quy luật đánh số báo danh theo từng môn thi để đảm bảo tính khách quan. 
              Bạn có thể xem trước, in ấn hoặc xuất file Excel cho <strong>toàn bộ {calculatedTotalRooms} phòng thi cùng 1 lượt</strong>.
            </p>
          </div>

          {/* NHÓM NÚT XUẤT HẾT TẤT CẢ PHÒNG 1 LƯỢT */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Xuất Excel Sơ đồ tất cả các phòng */}
            <button
              type="button"
              disabled={isExportingChart}
              onClick={handleExportAllRoomsExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Xuất file Excel gồm sheet Tổng hợp và từng sheet A4 mô phỏng sơ đồ cho tất cả các phòng"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingChart ? 'Đang tạo Excel...' : 'Xuất Excel Sơ đồ (Tất cả phòng)'}</span>
            </button>

            {/* Nút In Sơ đồ tất cả các phòng */}
            <button
              type="button"
              onClick={() => openPrintAll('chart')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Mở bản in A4 tất cả các phòng 1 lượt (ngắt trang từng phòng)"
            >
              <Printer className="w-4 h-4" />
              <span>In Sơ đồ ({calculatedTotalRooms} phòng)</span>
            </button>

            {/* Nút In Thẻ SBD Dán Bàn */}
            <button
              type="button"
              onClick={() => openPrintAll('stickers')}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="In thẻ SBD dán góc bàn (8 thẻ/trang A4 viền nét đứt cắt dán) cho tất cả thí sinh"
            >
              <Tag className="w-4 h-4" />
              <span>Thẻ SBD Dán Bàn</span>
            </button>

            {/* Nút Xuất Excel Thẻ dán bàn */}
            <button
              type="button"
              disabled={isExportingLabels}
              onClick={handleExportDeskLabelsExcel}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xuất file Excel danh sách thẻ SBD dán bàn"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Excel Thẻ</span>
            </button>
          </div>
        </div>

        {/* Thanh chọn Phòng và Môn */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chọn phòng thi để xem trực quan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Xem chi tiết Phòng thi:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedRoomNo}
                onChange={(e) => setSelectedRoomNo(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {Array.from({ length: calculatedTotalRooms }, (_, i) => i + 1).map((rNo) => {
                  const pCandidate = candidates.find((c) => c['Phòng thi'] === rNo);
                  const rCode = pCandidate?.roomCode || getRoomCode(rNo, config.startRoomCode);
                  const count = candidates.filter((c) => c['Phòng thi'] === rNo).length;
                  return (
                    <option key={rNo} value={rNo}>
                      Phòng thi số {rNo} ({rCode}) — {count} thí sinh
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={() => openPrintSingle('chart')}
                className="shrink-0 px-2.5 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                title={`In chỉ riêng Phòng ${selectedRoomNo}`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In P.{selectedRoomNo}</span>
              </button>
            </div>
          </div>

          {/* Chọn Môn thi / Quy luật */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Quy luật đánh SBD theo từng Môn (Tùy biến dễ nhớ cho Giám thị):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUBJECT_PRESETS.map((preset, idx) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetIndex(idx)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPresetIndex === idx
                      ? 'bg-blue-50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">Môn {idx + 1}</span>
                    {selectedPresetIndex === idx && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 line-clamp-1">
                    {preset.name.split('(')[1]?.replace(')', '') || preset.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thông tin quy luật đang chọn */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-800">
              Quy luật áp dụng: <strong className="text-blue-700">{currentPreset.patternName}</strong>.
            </span>
            <span className="text-slate-500 hidden md:inline">({currentPreset.description})</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-slate-600 text-xs font-medium">Tên môn in trên sơ đồ:</label>
            <input
              type="text"
              value={customSubjectName}
              placeholder={currentPreset.name}
              onChange={(e) => setCustomSubjectName(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-blue-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* MÔ PHỎNG SƠ ĐỒ CHỖ NGỒI PHÒNG THI TRỰC QUAN (DARK CANVAS) */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        {/* Tiêu đề sơ đồ phòng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
                Sơ đồ bố trí
              </span>
              <h3 className="text-base font-bold text-slate-100">
                Phòng thi số {selectedRoomNo} ({candidates.find((c) => c['Phòng thi'] === selectedRoomNo)?.roomCode || getRoomCode(selectedRoomNo, config.startRoomCode)})
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Môn thi: <strong className="text-slate-200">{activeSubjectName}</strong> • Sĩ số: <strong className="text-emerald-400">{roomCandidates.length}</strong> thí sinh • Quy chuẩn: 4 Dãy x 6 Hàng (24 bàn)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {roomCandidates.length <= 24 ? '1 Thí sinh / Bàn' : 'Ghép 2 Thí sinh / Bàn'}
            </span>
            <button
              type="button"
              onClick={() => openPrintSingle('chart')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>In Phòng {selectedRoomNo}</span>
            </button>
          </div>
        </div>

        {/* Khối BẢNG ĐEN / ĐẦU PHÒNG */}
        <div className="my-5 py-2.5 px-4 bg-slate-800/90 border border-slate-700 rounded-xl text-center shadow-inner">
          <span className="text-xs font-bold text-slate-300 tracking-widest uppercase flex items-center justify-center gap-2">
            ▲ [ BẢNG ĐEN / ĐẦU PHÒNG THI (HƯỚNG NHÌN TỪ TRÊN XUỐNG DÃY 1 → DÃY 4) ] ▲
          </span>
        </div>

        {/* LƯỚI 24 BÀN THI (4 DÃY x 6 HÀNG) */}
        <div className="space-y-3">
          {/* Header 4 Dãy bàn */}
          <div className="grid grid-cols-4 gap-3 text-center text-xs font-bold text-slate-400 pb-1">
            <div className="bg-slate-800/50 py-1 rounded">DÃY 1 (Cửa ra vào)</div>
            <div className="bg-slate-800/50 py-1 rounded">DÃY 2</div>
            <div className="bg-slate-800/50 py-1 rounded">DÃY 3</div>
            <div className="bg-slate-800/50 py-1 rounded">DÃY 4 (Cửa sổ)</div>
          </div>

          {/* 6 Hàng bàn */}
          {[0, 1, 2, 3, 4, 5].map((rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-4 gap-3">
              {rowsGrouped[rowIdx]?.map((desk) => {
                const hasLeft = Boolean(desk.candidateLeft);
                const hasRight = Boolean(desk.candidateRight);

                return (
                  <div
                    key={desk.deskNumber}
                    className={`rounded-xl p-2.5 border transition-all ${
                      hasLeft || hasRight
                        ? 'bg-slate-800/90 border-slate-700 hover:border-blue-500/60 shadow-xs'
                        : 'bg-slate-900/40 border-dashed border-slate-800 text-slate-600'
                    }`}
                  >
                    {/* Header ô bàn: Số bàn & Thứ tự đánh phấn */}
                    <div className="flex items-center justify-between text-[11px] mb-1.5 pb-1 border-b border-slate-700/60">
                      <span className="font-bold text-slate-300">
                        Bàn {desk.deskNumber}
                      </span>
                      <span className="font-mono font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/50">
                        #{desk.orderSeq + 1}
                      </span>
                    </div>

                    {/* Nội dung thí sinh */}
                    {roomCandidates.length <= 24 ? (
                      hasLeft ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-amber-300">
                              {desk.candidateLeft?.SBD}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded">
                              {desk.candidateLeft?.Lớp}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {desk.candidateLeft?.['Họ tên']}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {desk.candidateLeft?.ToHop_ChuanHoa}
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[11px] text-slate-500 italic">
                          (Bàn trống)
                        </div>
                      )
                    ) : (
                      /* Ghép 2 thí sinh / 1 bàn */
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Ghế Trái */}
                        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-700/80">
                          <div className="text-[9px] font-bold text-slate-400 mb-0.5">Trái</div>
                          {hasLeft ? (
                            <>
                              <div className="font-mono font-bold text-[11px] text-amber-300 truncate">
                                {desk.candidateLeft?.SBD}
                              </div>
                              <div className="text-[10px] font-bold text-slate-100 truncate">
                                {desk.candidateLeft?.['Họ tên']}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {desk.candidateLeft?.Lớp}
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Trống</span>
                          )}
                        </div>

                        {/* Ghế Phải */}
                        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-700/80">
                          <div className="text-[9px] font-bold text-slate-400 mb-0.5">Phải</div>
                          {hasRight ? (
                            <>
                              <div className="font-mono font-bold text-[11px] text-emerald-300 truncate">
                                {desk.candidateRight?.SBD}
                              </div>
                              <div className="text-[10px] font-bold text-slate-100 truncate">
                                {desk.candidateRight?.['Họ tên']}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {desk.candidateRight?.Lớp}
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Trống</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Cuối phòng thi */}
        <div className="mt-6 pt-3 border-t border-slate-800 text-center text-xs text-slate-500">
          ▼ PHÍA CUỐI PHÒNG THI (CỬA SỔ VÀ HÀNG BÀN SỐ 06) ▼
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL XEM TRƯỚC VÀ IN ẤN A4 (HỖ TRỢ IN TẤT CẢ CÁC PHÒNG 1 LƯỢT HOẶC 1 PHÒNG) */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-in fade-in print:p-0 print:m-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
            
            {/* Header Modal - Ẩn hoàn toàn khi in */}
            <div className="print:hidden px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    {printView === 'chart' 
                      ? (printScope === 'all' ? `Bản in Sơ đồ SBD (TẤT CẢ ${calculatedTotalRooms} PHÒNG 1 LƯỢT)` : `Bản in Sơ đồ SBD Phòng thi số ${selectedRoomNo}`)
                      : (printScope === 'all' ? `Thẻ Số Báo Danh Dán Bàn (TẤT CẢ ${candidates.length} Thí sinh)` : `Thẻ SBD Dán Bàn Phòng thi số ${selectedRoomNo}`)}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {printView === 'chart' 
                      ? 'Mỗi phòng thi được trình bày vừa khít 1 trang A4 đứng, tự động ngắt trang khi in.' 
                      : 'Mỗi trang A4 chứa 8 thẻ SBD dán góc bàn có viền nét đứt chuẩn để cắt dán.'}
                  </p>
                </div>
              </div>

              {/* Bộ điều khiển in ấn */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Chọn chế độ in: Sơ đồ hay Thẻ dán bàn */}
                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrintView('chart')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      printView === 'chart' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Sơ đồ 4x6
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintView('stickers')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      printView === 'stickers' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Thẻ dán bàn
                  </button>
                </div>

                {/* Chọn phạm vi: Tất cả phòng hay 1 phòng */}
                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrintScope('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      printScope === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Tất cả {calculatedTotalRooms} phòng
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintScope('single')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      printScope === 'single' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Chỉ Phòng {selectedRoomNo}
                  </button>
                </div>

                {/* Nút Xuất Excel nhanh */}
                <button
                  type="button"
                  onClick={printView === 'chart' ? handleExportAllRoomsExcel : handleExportDeskLabelsExcel}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Xuất file Excel tương ứng"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel</span>
                </button>

                {/* Nút In ngay */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>In ngay (Ctrl + P)</span>
                </button>

                {/* Nút Đóng */}
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Đóng modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thân Modal: Các trang in A4 */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex flex-col items-center bg-slate-200/80 print:bg-white print:p-0 print:m-0 print:w-full">
              
              {/* CHẾ ĐỘ 1: IN SƠ ĐỒ CHỖ NGỒI (MỖI PHÒNG 1 TRANG A4) */}
              {printView === 'chart' && (
                <>
                  {(printScope === 'all'
                    ? Array.from({ length: calculatedTotalRooms }, (_, i) => i + 1)
                    : [selectedRoomNo]
                  ).map((rNo) => {
                    const cInRoom = candidates
                      .filter((c) => c['Phòng thi'] === rNo)
                      .sort((a, b) => (a.STT_Phong || 0) - (b.STT_Phong || 0));
                    const desks = computeRoomDeskMatrix(cInRoom, currentPreset.pattern);
                    const rows = groupDesksByRow(desks);
                    const rCode = cInRoom[0]?.roomCode || getRoomCode(rNo, config.startRoomCode);

                    return (
                      <div
                        key={rNo}
                        className="page-break-after-always print-page-break bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-md border border-slate-300 font-serif text-xs flex flex-col justify-between mb-8 print:mb-0 print:border-0 print:shadow-none print:w-full print:p-0 print:max-w-none"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                      >
                        <div>
                          {/* Phần Header A4 */}
                          <div className="grid grid-cols-2 gap-4 pb-3 border-b-2 border-slate-900">
                            <div className="text-center">
                              <div className="font-bold uppercase text-[11px]">{config.deptName || 'SỞ GD&ĐT'}</div>
                              <div className="font-bold uppercase text-[11px]">{config.schoolName || 'TRƯỜNG THPT'}</div>
                              <div className="text-[10px] mt-0.5">Mã điểm thi: <strong>{config.examCenterCode || 'NBK-CH'}</strong></div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold uppercase text-[11px]">{config.countryTitle || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'}</div>
                              <div className="font-bold text-[10px] underline">{config.mottoTitle || 'Độc lập - Tự do - Hạnh phúc'}</div>
                              <div className="text-[10px] mt-0.5 italic">Năm học: {config.schoolYear || '2026 - 2027'}</div>
                            </div>
                          </div>

                          {/* Tiêu đề chính */}
                          <div className="text-center my-3.5">
                            <h1 className="text-base font-bold uppercase tracking-wider text-slate-900">
                              SƠ ĐỒ BỐ TRÍ CHỖ NGỒI VÀ SỐ BÁO DANH PHÒNG THI
                            </h1>
                            <div className="flex items-center justify-center gap-3 text-xs mt-1 font-sans">
                              <span>Phòng thi: <strong className="text-blue-800 text-sm font-bold">{rNo} ({rCode})</strong></span>
                              <span>•</span>
                              <span>Môn: <strong className="uppercase">{activeSubjectName}</strong></span>
                              <span>•</span>
                              <span>Sĩ số: <strong>{cInRoom.length}</strong> thí sinh</span>
                            </div>
                            <div className="text-[10px] italic text-slate-600 mt-0.5">
                              (Quy luật đánh số: {currentPreset.patternName})
                            </div>
                          </div>

                          {/* Mô phỏng Bảng đen */}
                          <div className="border border-slate-800 bg-slate-100 py-1 px-4 text-center font-bold uppercase text-[10.5px] tracking-widest mb-2.5">
                            [ BẢNG ĐEN / ĐẦU PHÒNG THI (HƯỚNG NHÌN TỪ TRÊN XUỐNG DÃY 1 → DÃY 4) ]
                          </div>

                          {/* Lưới 24 bàn in A4 */}
                          <div className="space-y-1.5">
                            {[0, 1, 2, 3, 4, 5].map((rIdx) => (
                              <div key={rIdx} className="grid grid-cols-4 gap-2">
                                {rows[rIdx]?.map((d) => (
                                  <div
                                    key={d.deskNumber}
                                    className="border border-slate-700 p-1 rounded text-[10px] min-h-[44px] flex flex-col justify-between bg-white"
                                  >
                                    <div className="flex justify-between font-sans text-[9px] text-slate-600 border-b border-slate-200 pb-0.5 mb-0.5">
                                      <span className="font-semibold">Bàn {d.deskNumber}</span>
                                      <span className="font-bold font-mono text-blue-900">#{d.orderSeq + 1}</span>
                                    </div>
                                    {cInRoom.length <= 24 ? (
                                      d.candidateLeft ? (
                                        <div>
                                          <div className="font-bold font-mono text-[11px] text-blue-900 leading-tight">
                                            SBD: {d.candidateLeft.SBD}
                                          </div>
                                          <div className="font-bold text-[10px] truncate leading-tight mt-0.5">
                                            {d.candidateLeft['Họ tên']}
                                          </div>
                                          <div className="text-slate-600 text-[9px] italic leading-tight">
                                            Lớp: {d.candidateLeft.Lớp} {d.candidateLeft.ToHop_ChuanHoa ? `(${d.candidateLeft.ToHop_ChuanHoa})` : ''}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="py-2 text-center text-slate-400 italic text-[10px]">(Bàn trống)</div>
                                      )
                                    ) : (
                                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                                        <div className="border-r border-slate-200 pr-0.5">
                                          <div className="text-[8px] text-slate-500">Trái:</div>
                                          <strong className="font-mono text-blue-900">{d.candidateLeft?.SBD || '-'}</strong>
                                          <div className="truncate text-[8.5px]">{d.candidateLeft?.['Họ tên']}</div>
                                        </div>
                                        <div className="pl-0.5">
                                          <div className="text-[8px] text-slate-500">Phải:</div>
                                          <strong className="font-mono text-emerald-900">{d.candidateRight?.SBD || '-'}</strong>
                                          <div className="truncate text-[8.5px]">{d.candidateRight?.['Họ tên']}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-slate-300 mt-2.5 pt-1 text-center text-[9px] text-slate-500 italic">
                            [ PHÍA CUỐI PHÒNG THI ]
                          </div>
                        </div>

                        {/* Chữ ký Giám thị */}
                        <div className="grid grid-cols-2 gap-8 pt-4 mt-3 border-t border-slate-300 text-center text-[11px]">
                          <div>
                            <div className="font-bold uppercase">{config.supervisor1Title || 'GIÁM THỊ 1'}</div>
                            <div className="text-[9.5px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                            <div className="h-14"></div>
                          </div>
                          <div>
                            <div className="font-bold uppercase">{config.supervisor2Title || 'GIÁM THỊ 2'}</div>
                            <div className="text-[9.5px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                            <div className="h-14"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* CHẾ ĐỘ 2: IN THẺ SỐ BÁO DANH DÁN GÓC BÀN (8 THẺ / TRANG A4) */}
              {printView === 'stickers' && (
                <>
                  {stickerPages.map((pageCandidates, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="page-break-after-always print-page-break bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-8 shadow-md border border-slate-300 font-sans text-xs flex flex-col justify-between mb-8 print:mb-0 print:border-0 print:shadow-none print:w-full print:p-0 print:max-w-none"
                    >
                      <div>
                        {/* Tiêu đề trang thẻ dán bàn (Ẩn khi in để tiết kiệm diện tích) */}
                        <div className="print:hidden pb-2 mb-3 border-b border-slate-200 flex justify-between items-center text-slate-500 text-[11px]">
                          <span>Trang {pageIdx + 1}/{stickerPages.length} — Thẻ Số Báo Danh Dán Góc Bàn</span>
                          <span>(Cắt theo đường viền nét đứt)</span>
                        </div>

                        {/* Lưới 8 thẻ (2 cột x 4 hàng) */}
                        <div className="grid grid-cols-2 gap-3.5">
                          {pageCandidates.map((cand) => (
                            <div
                              key={cand.id || cand.SBD}
                              className="border-2 border-dashed border-slate-400 rounded-xl p-3 bg-white flex flex-col justify-between relative overflow-hidden"
                              style={{ height: '62mm' }}
                            >
                              {/* Biểu tượng kéo cắt */}
                              <div className="absolute top-1 right-2 text-[10px] text-slate-400 font-mono select-none">
                                ✂ Cắt dán
                              </div>

                              {/* Tên trường & Kỳ thi */}
                              <div className="border-b border-slate-200 pb-1 pr-12">
                                <div className="font-bold text-[10px] uppercase text-slate-700 truncate">
                                  {config.schoolName || 'TRƯỜNG THPT'}
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase truncate">
                                  {config.examCategory || 'KỲ THI TỐT NGHIỆP THPT / KHẢO SÁT'}
                                </div>
                              </div>

                              {/* Khối SBD nổi bật */}
                              <div className="my-1 py-1 px-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <div className="text-[9px] font-bold uppercase text-blue-700 tracking-wider">
                                  SỐ BÁO DANH (SBD)
                                </div>
                                <div className="font-mono font-extrabold text-xl text-blue-900 tracking-widest leading-tight">
                                  {cand.SBD}
                                </div>
                              </div>

                              {/* Thông tin thí sinh */}
                              <div className="space-y-0.5 text-[11px] leading-snug">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-slate-500 text-[10px]">Họ và tên:</span>
                                  <strong className="text-slate-900 text-xs truncate max-w-[140px]">
                                    {cand['Họ tên']}
                                  </strong>
                                </div>

                                <div className="grid grid-cols-2 gap-1 text-[10px]">
                                  <div>
                                    <span className="text-slate-500">Ngày sinh: </span>
                                    <strong>{cand['Ngày sinh'] || '-'}</strong>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-500">Lớp: </span>
                                    <strong>{cand.Lớp || '-'}</strong>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center bg-slate-100 px-2 py-0.5 rounded text-[10px] mt-0.5">
                                  <span>
                                    Phòng: <strong className="text-blue-800">P.{String(cand['Phòng thi']).padStart(2, '0')}</strong>
                                  </span>
                                  <span>
                                    Bàn số: <strong className="text-emerald-700">#{cand.STT_Phong || '-'}</strong>
                                  </span>
                                </div>

                                <div className="text-[9px] text-slate-500 truncate pt-0.5">
                                  Môn: {cand.M1 || 'Văn'}, {cand.M2 || 'Toán'} • TC: {cand.ToHop_ChuanHoa || `${cand.TC1 || ''} - ${cand.TC2 || ''}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
