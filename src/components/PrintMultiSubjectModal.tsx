import React, { useState } from 'react';
import { Printer, Download, X, ChevronLeft, ChevronRight, FileSpreadsheet, Settings2 } from 'lucide-react';
import { CandidateAssigned, ExamConfig } from '../types';
import { getRoomDisplayLabel } from '../utils/optimizer';
import { exportMultiSubjectAttendanceExcel } from '../utils/excelExport';
import { getRoomSubjects } from '../utils/subjectHelper';

interface PrintMultiSubjectModalProps {
  candidates: CandidateAssigned[];
  config: ExamConfig;
  totalRooms: number;
  onClose: () => void;
}

export const PrintMultiSubjectModal: React.FC<PrintMultiSubjectModalProps> = ({
  candidates,
  config,
  totalRooms,
  onClose,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<number>(1);
  const [printAllRooms, setPrintAllRooms] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('footer');

  // Local config để người dùng có thể chỉnh sửa linh hoạt trực tiếp ngay trong modal xem trước
  const [customConfig, setCustomConfig] = useState({
    deptName: config.deptName ?? '',
    schoolName: config.schoolName ?? '',
    countryTitle: config.countryTitle ?? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    mottoTitle: config.mottoTitle ?? 'Độc lập - Tự do - Hạnh phúc',
    sheetTitle: config.sheetTitle ?? 'DANH SÁCH THÍ SINH VÀ PHIẾU THU BÀI THI TỔNG HỢP CÁC MÔN',
    supervisor1Title: config.supervisor1Title ?? 'GIÁM THỊ 1',
    supervisor2Title: config.supervisor2Title ?? 'GIÁM THỊ 2',
    dateLine: config.dateLine ?? (config.locationName ? `${config.locationName}, ngày ..... tháng ..... năm 20.....` : 'Ngày ..... tháng ..... năm 20.....'),
    leaderTitle: config.leaderTitle ?? 'TRƯỞNG ĐIỂM THI',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const effectiveConfig: ExamConfig = {
        ...config,
        deptName: customConfig.deptName,
        schoolName: customConfig.schoolName,
        countryTitle: customConfig.countryTitle,
        mottoTitle: customConfig.mottoTitle,
        sheetTitle: customConfig.sheetTitle,
        supervisor1Title: customConfig.supervisor1Title,
        supervisor2Title: customConfig.supervisor2Title,
        dateLine: customConfig.dateLine,
        leaderTitle: customConfig.leaderTitle,
      };
      await exportMultiSubjectAttendanceExcel(candidates, effectiveConfig);
    } catch (err) {
      console.error('Lỗi xuất Excel liên môn:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Render một phòng thi chuẩn khít 1 trang A4 Ngang với hàng và cột cân đối tuyệt đối
  const renderRoomSheet = (roomNo: number, isLastSheet: boolean) => {
    const roomCandidates = candidates.filter(c => c['Phòng thi'] === roomNo);
    const roomLabel = getRoomDisplayLabel(roomNo, config.startRoomCode);
    const { subjects, groupLabel } = getRoomSubjects(roomCandidates, config);

    // Tính toán % chiều rộng từng cột: Họ và tên 23%, chia đều 42% cho các môn thi còn lại
    const subjWidthPercent = (42 / Math.max(1, subjects.length)).toFixed(2) + '%';

    return (
      <div
        key={roomNo}
        className={`w-full max-w-[1060px] bg-white p-5 sm:p-6 shadow-md print:shadow-none border border-slate-200 print:border-none print:w-full print:max-w-none print:p-0 print:m-0 print-sheet-landscape ${
          !isLastSheet ? 'page-break-after-always' : ''
        }`}
      >
        {/* Header Trường & Quốc hiệu: Chỉ hiển thị các dòng có dữ liệu */}
        {(customConfig.deptName || customConfig.schoolName || customConfig.countryTitle || customConfig.mottoTitle) && (
          <div className="grid grid-cols-2 text-xs mb-2.5 print:mb-2">
            <div className="text-center">
              {customConfig.deptName && (
                <p className="font-bold text-slate-900 uppercase leading-snug">{customConfig.deptName.toUpperCase()}</p>
              )}
              {customConfig.schoolName && (
                <p className="font-bold text-slate-900 uppercase leading-snug">{customConfig.schoolName.toUpperCase()}</p>
              )}
            </div>
            <div className="text-center">
              {customConfig.countryTitle && (
                <p className="font-bold text-slate-900 uppercase leading-snug">{customConfig.countryTitle.toUpperCase()}</p>
              )}
              {customConfig.mottoTitle && (
                <p className="font-semibold italic text-slate-700 leading-snug">{customConfig.mottoTitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Tiêu đề chính */}
        {customConfig.sheetTitle && (
          <div className="text-center mb-2.5 print:mb-2">
            <h2 className="text-sm sm:text-base font-bold uppercase text-slate-900 tracking-tight">
              {customConfig.sheetTitle}
            </h2>
            <p className="text-[11px] italic text-slate-600 font-medium mt-0.5">
              Kỳ thi: {config.examCategory} ({config.subPeriod}) — Năm học: {config.schoolYear} &nbsp;|&nbsp;{' '}
              <span className="font-bold text-slate-900">{roomLabel.toUpperCase()}</span> &nbsp;|&nbsp;{' '}
              Sĩ số: <span className="font-bold text-slate-900">{roomCandidates.length}</span> thí sinh
              {groupLabel && (
                <>
                  &nbsp;|&nbsp; Mã nhóm: <span className="font-bold text-blue-800">{groupLabel}</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* BẢNG DỮ LIỆU ĐA TẦNG ĐỀU CẢ HÀNG LẪN CỘT */}
        <div className="w-full">
          <table className="w-full border-collapse border border-black text-[10.5px] print:text-[10px] leading-tight table-fixed">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '6%' }} />
              {subjects.map((subj) => (
                <col key={subj} style={{ width: subjWidthPercent }} />
              ))}
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead>
              {/* Tầng 1: Các cột cố định (merge 2 dòng) + Tiêu đề gộp Học sinh ký nộp bài + Ghi chú */}
              <tr className="bg-slate-100 font-bold text-center">
                <th rowSpan={2} className="border border-black py-1 px-0.5 text-center">TT</th>
                <th rowSpan={2} className="border border-black py-1 px-0.5 text-center font-mono">SBD</th>
                <th rowSpan={2} className="border border-black py-1 px-2 text-left">Họ và tên</th>
                <th rowSpan={2} className="border border-black py-1 px-0.5 text-center">Ngày sinh</th>
                <th rowSpan={2} className="border border-black py-1 px-0.5 text-center">Lớp</th>
                
                {/* Merge ngang vắt qua tất cả các môn */}
                <th colSpan={subjects.length} className="border border-black py-1 px-1 text-center bg-slate-200 uppercase tracking-wider text-[10px]">
                  Học sinh ký nộp bài
                </th>

                <th rowSpan={2} className="border border-black py-1 px-0.5 text-center">Ghi chú</th>
              </tr>

              {/* Tầng 2: Danh sách từng môn thi */}
              <tr className="bg-slate-50 font-semibold text-center text-[10px]">
                {subjects.map((subj) => (
                  <th key={subj} className="border border-black py-0.5 px-0.5 text-center truncate">
                    {subj}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomCandidates.map((cand, idx) => (
                <tr key={cand.SBD || idx} className="h-[21px] print:h-[20px] hover:bg-slate-50/80">
                  <td className="border border-black text-center p-0.5 font-medium">{idx + 1}</td>
                  <td className="border border-black text-center font-mono font-bold p-0.5">{cand.SBD}</td>
                  <td className="border border-black text-left px-2 py-0.5 font-medium truncate">
                    {cand['Họ tên'] || cand['Họ và tên']}
                  </td>
                  <td className="border border-black text-center p-0.5">{cand['Ngày sinh']}</td>
                  <td className="border border-black text-center p-0.5">{cand['Lớp']}</td>

                  {/* Các ô môn thi để trống cho học sinh ký nộp bài */}
                  {subjects.map((subj) => (
                    <td key={subj} className="border border-black p-0.5 text-center"></td>
                  ))}

                  {/* Ghi chú */}
                  <td className="border border-black p-0.5 text-center"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chữ ký Cán bộ coi thi & Trưởng điểm thi / Hiệu trưởng */}
        <div className="grid grid-cols-3 text-center text-xs mt-3 print:mt-2 pt-1 gap-4 break-inside-avoid">
          <div className="flex flex-col items-center justify-start">
            {customConfig.supervisor1Title && customConfig.supervisor1Title.trim() ? (
              <>
                <p className="font-bold uppercase text-slate-800 text-center w-full leading-tight">
                  {customConfig.supervisor1Title.trim()}
                </p>
                <p className="italic text-[10px] text-slate-500 text-center w-full mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-10 print:h-8"></div>
              </>
            ) : (
              <div className="h-10 print:h-8"></div>
            )}
          </div>
          <div className="flex flex-col items-center justify-start">
            {customConfig.supervisor2Title && customConfig.supervisor2Title.trim() ? (
              <>
                <p className="font-bold uppercase text-slate-800 text-center w-full leading-tight">
                  {customConfig.supervisor2Title.trim()}
                </p>
                <p className="italic text-[10px] text-slate-500 text-center w-full mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-10 print:h-8"></div>
              </>
            ) : (
              <div className="h-10 print:h-8"></div>
            )}
          </div>
          <div className="flex flex-col items-center justify-start">
            {customConfig.dateLine && customConfig.dateLine.trim() && (
              <p className="italic text-[11px] text-slate-600 mb-0.5 text-center w-full leading-tight">
                {customConfig.dateLine.trim()}
              </p>
            )}
            {customConfig.leaderTitle && customConfig.leaderTitle.trim() ? (
              <>
                <p className="font-bold uppercase text-slate-800 text-center w-full leading-tight">
                  {customConfig.leaderTitle.trim()}
                </p>
                <p className="italic text-[10px] text-slate-500 text-center w-full mt-0.5">(Ký, đóng dấu và ghi rõ họ tên)</p>
                <div className="h-10 print:h-8"></div>
              </>
            ) : (
              <div className="h-10 print:h-8"></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const curRoomCandidates = candidates.filter(c => c['Phòng thi'] === selectedRoom);
  const curRoomLabel = getRoomDisplayLabel(selectedRoom, config.startRoomCode);
  const { groupLabel: curGroupLabel } = getRoomSubjects(curRoomCandidates, config);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white text-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        {/* Toolbar (Không in khi bấm Ctrl+P) */}
        <div className="print:hidden flex flex-wrap items-center justify-between p-4 border-b border-slate-200 bg-slate-50 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              📋
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Phiếu thu bài thi tất cả các môn (Fit A4 Ngang)
              </h3>
              <p className="text-xs text-slate-500">
                {curRoomLabel} — Sĩ số: {curRoomCandidates.length} thí sinh
                {curGroupLabel && curGroupLabel !== 'Chung' && (
                  <span className="ml-1 text-blue-600 font-semibold">• Nhóm: {curGroupLabel}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút bật tắt tùy biến Header & Footer */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showSettings
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Tùy biến Header (Phần đầu) và Footer (Chân trang chữ ký)"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Tùy biến Header & Footer</span>
            </button>

            {/* Checkbox In tất cả các phòng */}
            <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer select-none hover:bg-slate-100">
              <input
                type="checkbox"
                checked={printAllRooms}
                onChange={(e) => setPrintAllRooms(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-medium text-slate-700">In cả {totalRooms} phòng</span>
            </label>

            {/* Bộ chọn phòng thi */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
              <button
                type="button"
                disabled={selectedRoom <= 1}
                onClick={() => setSelectedRoom(p => Math.max(1, p - 1))}
                className="p-1 hover:bg-slate-100 disabled:opacity-40 rounded cursor-pointer"
                title="Phòng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(Number(e.target.value))}
                className="bg-transparent font-semibold text-slate-800 text-xs px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: totalRooms }, (_, i) => i + 1).map(r => (
                  <option key={r} value={r}>
                    {getRoomDisplayLabel(r, config.startRoomCode)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={selectedRoom >= totalRooms}
                onClick={() => setSelectedRoom(p => Math.min(totalRooms, p + 1))}
                className="p-1 hover:bg-slate-100 disabled:opacity-40 rounded cursor-pointer"
                title="Phòng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Nút Xuất Excel */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            {/* Nút In ngay */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{printAllRooms ? `In cả ${totalRooms} phòng` : 'In phòng này'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Tùy biến Header & Footer trực tiếp (Không in) */}
        {showSettings && (
          <div className="print:hidden bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs space-y-2.5 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('header')}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                    activeTab === 'header'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  1. Phần đầu (Header)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('footer')}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                    activeTab === 'footer'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  2. Chân trang (Footer)
                </button>
              </div>
              <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                💡 Nhập nội dung để hiển thị; nếu để trống ô nào sẽ bỏ trống hoàn toàn cả tiêu đề và phần ký.
              </span>
            </div>

            {/* Tab 1: Header */}
            {activeTab === 'header' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Sở GD&ĐT (Cấp trên):</label>
                  <input
                    type="text"
                    value={customConfig.deptName}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, deptName: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="Để trống để ẩn"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Tên Trường / Hội đồng:</label>
                  <input
                    type="text"
                    value={customConfig.schoolName}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, schoolName: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="Để trống để ẩn"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Quốc hiệu:</label>
                  <input
                    type="text"
                    value={customConfig.countryTitle}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, countryTitle: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="Để trống để ẩn"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Tiêu ngữ:</label>
                  <input
                    type="text"
                    value={customConfig.mottoTitle}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, mottoTitle: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="Để trống để ẩn"
                  />
                </div>
                <div className="sm:col-span-3 md:col-span-1">
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Tiêu đề biểu mẫu:</label>
                  <input
                    type="text"
                    value={customConfig.sheetTitle}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, sheetTitle: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500 font-medium"
                    placeholder="Để trống để ẩn"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Footer */}
            {activeTab === 'footer' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Giám thị 1 (Trái):</label>
                  <input
                    type="text"
                    value={customConfig.supervisor1Title}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, supervisor1Title: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="GIÁM THỊ 1 (Để trống nếu không cần ký)"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Giám thị 2 (Giữa):</label>
                  <input
                    type="text"
                    value={customConfig.supervisor2Title}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, supervisor2Title: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="GIÁM THỊ 2 (Để trống nếu không cần ký)"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Dòng Ngày tháng năm (Trước người ký):</label>
                  <input
                    type="text"
                    value={customConfig.dateLine}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, dateLine: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="VD: Ngày ..... tháng ..... năm 20..... hoặc Gia Lai, ngày..."
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">Người ký xác nhận (Phải):</label>
                  <input
                    type="text"
                    value={customConfig.leaderTitle}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, leaderTitle: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    placeholder="TRƯỞNG ĐIỂM THI hoặc HIỆU TRƯỞNG"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nội dung xem trước trên màn hình (chỉ hiển thị 1 phòng đang chọn để xem và cuộn mượt mà) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center print:hidden">
          {renderRoomSheet(selectedRoom, true)}
        </div>

        {/* Khối xuất in trình duyệt (window.print): hỗ trợ in 1 phòng hoặc in hàng loạt tất cả các phòng */}
        <div className="hidden print:block print:p-0 print:m-0 print:w-full">
          {printAllRooms
            ? Array.from({ length: totalRooms }, (_, i) => i + 1).map((r, idx) =>
                renderRoomSheet(r, idx === totalRooms - 1)
              )
            : renderRoomSheet(selectedRoom, true)}
        </div>
      </div>
    </div>
  );
};
