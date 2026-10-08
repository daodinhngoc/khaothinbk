import React, { useState } from 'react';
import { Search, Filter, School, Users, ChevronLeft, ChevronRight, Check, Scissors, RotateCcw, ListOrdered } from 'lucide-react';
import { CandidateAssigned, ExamConfig } from '../types';
import { getRoomDisplayLabel } from '../utils/optimizer';
import { sortCandidatesInRoomForShift } from '../utils/excelExport';

interface RoomDetailViewProps {
  candidates: CandidateAssigned[];
  config: ExamConfig;
  totalRooms: number;
  maxPerRoom: number;
  onOpenSplitModal: (roomNo: number) => void;
  isManuallyModified?: boolean;
  onResetToAuto?: () => void;
}

export const RoomDetailView: React.FC<RoomDetailViewProps> = ({
  candidates,
  config,
  totalRooms,
  maxPerRoom,
  onOpenSplitModal,
  isManuallyModified = false,
  onResetToAuto,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<'default' | 'tohop' | 'tc1' | 'tc2' | 'sbd'>('default');

  const rawRoomCandidates = candidates.filter(c => c['Phòng thi'] === selectedRoom);

  const subjectKeyForSort = sortMode === 'tc1' ? 'TC1' : sortMode === 'tc2' ? 'TC2' : sortMode === 'sbd' ? 'M1' : 'ToHop_ChuanHoa';
  const shouldSortSbd = sortMode === 'sbd' || (sortMode === 'default' && (config.sortSbdAscendingInRoom ?? true));
  const roomCandidates = sortCandidatesInRoomForShift(
    rawRoomCandidates,
    subjectKeyForSort,
    sortMode === 'tohop' ? false : shouldSortSbd
  );

  const filteredCandidates = roomCandidates.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c['Họ tên'].toLowerCase().includes(q) ||
      c.SBD.toLowerCase().includes(q) ||
      c.Lớp.toLowerCase().includes(q) ||
      c.ToHop_ChuanHoa.toLowerCase().includes(q)
    );
  });

  // Đếm các tổ hợp trong phòng
  const combosInRoom: Record<string, number> = {};
  roomCandidates.forEach(c => {
    combosInRoom[c.ToHop_ChuanHoa] = (combosInRoom[c.ToHop_ChuanHoa] || 0) + 1;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <School className="w-5 h-5 text-blue-600" />
              Chi tiết danh sách thí sinh từng Phòng thi
            </h3>
            {isManuallyModified && (
              <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                Đã chỉnh sửa/tách thủ công
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Duyệt danh sách thí sinh trong mỗi phòng, kiểm tra tổ hợp tự chọn và thực hiện chia tách phòng thi khi cần.
          </p>
        </div>

        {/* Room Selector Pills & Stepper */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Action: Tách phòng */}
          <button
            type="button"
            onClick={() => onOpenSplitModal(selectedRoom)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="Chia tách phòng này thành 2 hoặc 3 phòng mới"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Tách phòng này...</span>
          </button>

          {/* Reset button if modified */}
          {isManuallyModified && onResetToAuto && (
            <button
              type="button"
              onClick={onResetToAuto}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Khôi phục lại phương án xếp phòng tự động ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục gốc</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={selectedRoom <= 1}
              onClick={() => setSelectedRoom(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Phòng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {Array.from({ length: totalRooms }, (_, i) => i + 1).map(r => (
                  <option key={r} value={r}>
                    {getRoomDisplayLabel(r, config.startRoomCode)} ({candidates.filter(c => c['Phòng thi'] === r).length} HS)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={selectedRoom >= totalRooms}
              onClick={() => setSelectedRoom(p => Math.min(totalRooms, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Phòng kế tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Room Badge Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 text-sm">
            {getRoomDisplayLabel(selectedRoom, config.startRoomCode)}
          </span>
          <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
            {roomCandidates.length} / {maxPerRoom} thí sinh
          </span>
          {roomCandidates.length < maxPerRoom && (
            <span className="bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full">
              {selectedRoom === totalRooms ? 'Phòng cuối' : 'Phòng quy mô nhỏ'}
            </span>
          )}
        </div>

        {/* Combo badges inside room */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Tổ hợp trong phòng:</span>
          {Object.entries(combosInRoom).map(([combo, count]) => (
            <span key={combo} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-mono text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {combo}: <strong className="text-blue-700">{count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo Họ tên, SBD hoặc Lớp trong phòng..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Chế độ sắp xếp danh sách trong phòng */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1 shrink-0">
            <ListOrdered className="w-3.5 h-3.5" />
            Thứ tự xem:
          </span>
          <button
            type="button"
            onClick={() => setSortMode('tohop')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              sortMode === 'tohop'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Gom theo từng tổ hợp môn, trong mỗi tổ hợp SBD tăng dần"
          >
            Tổ hợp + SBD
          </button>
          <button
            type="button"
            onClick={() => setSortMode('tc1')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              sortMode === 'tc1'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Gom theo môn thi Ca 1 (TC1), trong mỗi môn SBD tăng dần"
          >
            Ca 1 (Môn + SBD)
          </button>
          <button
            type="button"
            onClick={() => setSortMode('tc2')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              sortMode === 'tc2'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Gom theo môn thi Ca 2 (TC2), trong mỗi môn SBD tăng dần"
          >
            Ca 2 (Môn + SBD)
          </button>
          <button
            type="button"
            onClick={() => setSortMode('sbd')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              sortMode === 'sbd'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="SBD tăng dần từ nhỏ đến lớn (chuẩn môn Ngữ văn / Toán)"
          >
            SBD 1..24 (Văn / Toán)
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3 w-24 text-center">SBD</th>
                <th className="py-2.5 px-4">Họ và tên thí sinh</th>
                <th className="py-2.5 px-3 text-center">Ngày sinh</th>
                <th className="py-2.5 px-3 text-center">Lớp</th>
                {config.examCategory.includes('Kiểm tra') ? (
                  <th className="py-2.5 px-3">Nhóm môn lựa chọn</th>
                ) : (
                  <>
                    <th className="py-2.5 px-3">Ca 1 (TC1)</th>
                    <th className="py-2.5 px-3">Ca 2 (TC2)</th>
                    <th className="py-2.5 px-3">Tổ hợp chuẩn hóa</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={config.examCategory.includes('Kiểm tra') ? 6 : 8} className="py-6 text-center text-slate-400">
                    Không tìm thấy thí sinh phù hợp
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand, idx) => (
                  <tr key={cand.SBD} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">{cand.SBD}</td>
                    <td className="py-2 px-4 font-semibold text-slate-800">{cand['Họ tên']}</td>
                    <td className="py-2 px-3 text-center text-slate-600">{cand['Ngày sinh']}</td>
                    <td className="py-2 px-3 text-center font-medium text-slate-700 bg-slate-50/50">{cand.Lớp}</td>
                    {config.examCategory.includes('Kiểm tra') ? (
                      <td className="py-2 px-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200/70">
                          {cand.Nhóm || cand.ToHop_ChuanHoa}
                        </span>
                      </td>
                    ) : (
                      <>
                        <td className="py-2 px-3 font-medium text-emerald-700">{cand.TC1}</td>
                        <td className="py-2 px-3 font-medium text-indigo-700">{cand.TC2}</td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded">
                            {cand.ToHop_ChuanHoa}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
