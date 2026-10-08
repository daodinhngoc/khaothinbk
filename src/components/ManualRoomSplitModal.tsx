import React, { useState, useMemo } from 'react';
import { X, Scissors, Users, ArrowRight, CheckCircle2, Split, BookOpen, Layers, CheckSquare, Square } from 'lucide-react';
import { CandidateAssigned, ExamConfig } from '../types';
import {
  getRoomDisplayLabel,
  splitRoomEqually,
  splitRoomByCount,
  splitRoomBySubject,
  splitRoomByCustomSelection
} from '../utils/optimizer';

interface ManualRoomSplitModalProps {
  candidates: CandidateAssigned[];
  config: ExamConfig;
  totalRooms: number;
  initialRoomNo?: number;
  onApplySplit: (newCandidates: CandidateAssigned[], message: string) => void;
  onClose: () => void;
}

export const ManualRoomSplitModal: React.FC<ManualRoomSplitModalProps> = ({
  candidates,
  config,
  totalRooms,
  initialRoomNo = 1,
  onApplySplit,
  onClose,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<number>(initialRoomNo);
  const [splitMode, setSplitMode] = useState<'equal' | 'count' | 'subject' | 'custom'>('equal');

  // Parameters for each mode
  const [equalParts, setEqualParts] = useState<2 | 3>(2);
  const [countToMove, setCountToMove] = useState<number>(1);
  const [subjectColToSplit, setSubjectColToSplit] = useState<'TC1' | 'TC2'>('TC1');
  const [selectedSBDs, setSelectedSBDs] = useState<string[]>([]);

  // Current candidates in selected room
  const roomCandidates = useMemo(() => {
    return candidates.filter(c => c['Phòng thi'] === selectedRoom);
  }, [candidates, selectedRoom]);

  // Subjects in selected room
  const subjectsTC1 = useMemo(() => {
    const counts: Record<string, number> = {};
    roomCandidates.forEach(c => {
      const tc1Key = c.TC1 || 'Chưa chọn';
      counts[tc1Key] = (counts[tc1Key] || 0) + 1;
    });
    return counts;
  }, [roomCandidates]);

  const subjectsTC2 = useMemo(() => {
    const counts: Record<string, number> = {};
    roomCandidates.forEach(c => {
      const tc2Key = c.TC2 || 'Chưa chọn';
      counts[tc2Key] = (counts[tc2Key] || 0) + 1;
    });
    return counts;
  }, [roomCandidates]);

  // Adjust countToMove when room changes
  React.useEffect(() => {
    const half = Math.floor(roomCandidates.length / 2);
    setCountToMove(half > 0 ? half : 1);
    setSelectedSBDs([]);
  }, [selectedRoom, roomCandidates.length]);

  const handleToggleSBD = (sbd: string) => {
    setSelectedSBDs(prev =>
      prev.includes(sbd) ? prev.filter(x => x !== sbd) : [...prev, sbd]
    );
  };

  const handleSelectAllSBDs = () => {
    if (selectedSBDs.length === roomCandidates.length) {
      setSelectedSBDs([]);
    } else {
      setSelectedSBDs(roomCandidates.map(c => c.SBD));
    }
  };

  // Preview the split
  const previewInfo = useMemo(() => {
    const total = roomCandidates.length;
    if (total <= 1) {
      return { isValid: false, reason: 'Phòng chỉ có 1 thí sinh, không thể chia tách thêm.' };
    }

    if (splitMode === 'equal') {
      const partSize = Math.floor(total / equalParts);
      const rem = total % equalParts;
      const sizes = Array.from({ length: equalParts }, (_, i) => partSize + (i < rem ? 1 : 0));
      return {
        isValid: true,
        newRoomsCount: equalParts,
        desc: `Chia thành ${equalParts} phòng: ` + sizes.map((s, idx) => `Phần ${idx + 1}: ${s} HS`).join(', ')
      };
    }

    if (splitMode === 'count') {
      if (countToMove <= 0 || countToMove >= total) {
        return { isValid: false, reason: `Số lượng chuyển phải từ 1 đến ${total - 1} thí sinh.` };
      }
      return {
        isValid: true,
        newRoomsCount: 2,
        desc: `Phòng gốc giữ lại: ${total - countToMove} HS, Phòng mới nhận: ${countToMove} HS.`
      };
    }

    if (splitMode === 'subject') {
      const currentCounts = subjectColToSplit === 'TC1' ? subjectsTC1 : subjectsTC2;
      const distinctSubjs = Object.keys(currentCounts);
      if (distinctSubjs.length <= 1) {
        return {
          isValid: false,
          reason: `Phòng này chỉ có 1 môn tự chọn (${distinctSubjs[0] || 'N/A'}), không có môn ghép để tách.`
        };
      }
      return {
        isValid: true,
        newRoomsCount: distinctSubjs.length,
        desc: `Tách thành ${distinctSubjs.length} phòng theo từng môn: ` +
          distinctSubjs.map(s => `${s} (${currentCounts[s]} HS)`).join(' | ')
      };
    }

    if (splitMode === 'custom') {
      if (selectedSBDs.length === 0) {
        return { isValid: false, reason: 'Vui lòng tích chọn ít nhất 1 thí sinh chuyển sang phòng mới.' };
      }
      if (selectedSBDs.length >= total) {
        return { isValid: false, reason: 'Không thể chuyển toàn bộ thí sinh sang phòng mới.' };
      }
      return {
        isValid: true,
        newRoomsCount: 2,
        desc: `Phòng gốc còn lại: ${total - selectedSBDs.length} HS, Phòng mới: ${selectedSBDs.length} HS được chọn.`
      };
    }

    return { isValid: false, reason: '' };
  }, [roomCandidates.length, splitMode, equalParts, countToMove, subjectColToSplit, subjectsTC1, subjectsTC2, selectedSBDs]);

  // Execute the split
  const handleConfirmSplit = () => {
    if (!previewInfo.isValid) return;

    let updated: CandidateAssigned[] = [];
    let splitDescription = '';

    const sortSbd = config.sortSbdAscendingInRoom ?? true;
    if (splitMode === 'equal') {
      updated = splitRoomEqually(candidates, selectedRoom, equalParts, config.startRoomCode, sortSbd);
      splitDescription = `Đã chia đều ${getRoomDisplayLabel(selectedRoom, config.startRoomCode)} thành ${equalParts} phòng.`;
    } else if (splitMode === 'count') {
      updated = splitRoomByCount(candidates, selectedRoom, countToMove, config.startRoomCode, sortSbd);
      splitDescription = `Đã tách ${countToMove} thí sinh từ ${getRoomDisplayLabel(selectedRoom, config.startRoomCode)} sang phòng mới.`;
    } else if (splitMode === 'subject') {
      updated = splitRoomBySubject(candidates, selectedRoom, subjectColToSplit, config.startRoomCode, sortSbd);
      splitDescription = `Đã tách ${getRoomDisplayLabel(selectedRoom, config.startRoomCode)} theo từng môn tự chọn (${subjectColToSplit}).`;
    } else if (splitMode === 'custom') {
      updated = splitRoomByCustomSelection(candidates, selectedRoom, selectedSBDs, config.startRoomCode, sortSbd);
      splitDescription = `Đã chuyển ${selectedSBDs.length} thí sinh được chọn từ ${getRoomDisplayLabel(selectedRoom, config.startRoomCode)} sang phòng mới.`;
    }

    onApplySplit(updated, splitDescription);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                Chia tách phòng thi thủ công
              </h3>
              <p className="text-xs text-slate-500">
                Linh hoạt chia 1 phòng thành 2 hoặc 3 phòng, giảm quy mô hoặc tách riêng môn ghép
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Chọn phòng cần chia tách */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                1. Chọn phòng cần chia tách:
              </label>

              {/* Quick Jump: Tách phòng cuối */}
              {selectedRoom !== totalRooms && (
                <button
                  type="button"
                  onClick={() => setSelectedRoom(totalRooms)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
                >
                  ⚡ Chọn nhanh Phòng cuối ({getRoomDisplayLabel(totalRooms, config.startRoomCode)})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {Array.from({ length: totalRooms }, (_, i) => i + 1).map((r) => {
                  const rCandidates = candidates.filter(c => c['Phòng thi'] === r);
                  return (
                    <option key={r} value={r}>
                      {getRoomDisplayLabel(r, config.startRoomCode)} ({rCandidates.length} thí sinh) {r === totalRooms ? '— [Phòng cuối]' : ''}
                    </option>
                  );
                })}
              </select>

              <div className="text-xs bg-white border border-slate-200 rounded-lg p-2.5 space-y-0.5">
                <div className="font-semibold text-slate-700">
                  Hiện tại: <span className="text-blue-600 font-bold">{roomCandidates.length} thí sinh</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  TC1: {Object.entries(subjectsTC1).map(([s, c]) => `${s}: ${c}`).join(', ') || 'Không có'}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Chọn phương thức chia tách */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Split className="w-4 h-4 text-amber-600" />
              2. Chọn phương thức chia tách:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  splitMode === 'equal'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-sm">
                  <span>⚖️</span>
                  <span>Chia đều</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500 leading-tight">
                  Tách đôi (50/50) hoặc làm 3 phòng
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('count')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  splitMode === 'count'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-sm">
                  <span>🔢</span>
                  <span>Theo số lượng</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500 leading-tight">
                  Chuyển K thí sinh sang phòng mới
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('subject')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  splitMode === 'subject'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-sm">
                  <span>📚</span>
                  <span>Theo môn thi</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500 leading-tight">
                  Tách riêng từng môn tự chọn
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  splitMode === 'custom'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-sm">
                  <span>✍️</span>
                  <span>Chọn thủ công</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500 leading-tight">
                  Tự chọn danh sách thí sinh chuyển
                </span>
              </button>
            </div>
          </div>

          {/* Chi tiết thông số theo từng Mode */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 text-xs space-y-3">
            {splitMode === 'equal' && (
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Số phòng muốn chia thành:</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-300 hover:border-blue-400">
                    <input
                      type="radio"
                      name="equalParts"
                      checked={equalParts === 2}
                      onChange={() => setEqualParts(2)}
                      className="text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Chia làm 2 phòng (mỗi phòng ~{Math.ceil(roomCandidates.length / 2)} HS)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-300 hover:border-blue-400">
                    <input
                      type="radio"
                      name="equalParts"
                      checked={equalParts === 3}
                      onChange={() => setEqualParts(3)}
                      className="text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Chia làm 3 phòng (mỗi phòng ~{Math.ceil(roomCandidates.length / 3)} HS)</span>
                  </label>
                </div>
              </div>
            )}

            {splitMode === 'count' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Số lượng thí sinh chuyển sang phòng mới:</label>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-sm">
                    {countToMove} thí sinh
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, roomCandidates.length - 1)}
                  value={countToMove}
                  onChange={(e) => setCountToMove(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>1 thí sinh</span>
                  <span>Phòng gốc còn: {roomCandidates.length - countToMove} HS</span>
                  <span>Tối đa {roomCandidates.length - 1} thí sinh</span>
                </div>
              </div>
            )}

            {splitMode === 'subject' && (
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Tách theo môn tự chọn của ca thi:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-300">
                    <input
                      type="radio"
                      name="subjCol"
                      checked={subjectColToSplit === 'TC1'}
                      onChange={() => setSubjectColToSplit('TC1')}
                      className="text-blue-600"
                    />
                    <span>Môn tự chọn 1 (TC1 - Ca 1)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-300">
                    <input
                      type="radio"
                      name="subjCol"
                      checked={subjectColToSplit === 'TC2'}
                      onChange={() => setSubjectColToSplit('TC2')}
                      className="text-blue-600"
                    />
                    <span>Môn tự chọn 2 (TC2 - Ca 2)</span>
                  </label>
                </div>
              </div>
            )}

            {splitMode === 'custom' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Chọn thí sinh để chuyển sang phòng mới ({selectedSBDs.length}/{roomCandidates.length} HS):
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllSBDs}
                    className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    {selectedSBDs.length === roomCandidates.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                  {roomCandidates.map((c) => {
                    const isChecked = selectedSBDs.includes(c.SBD);
                    return (
                      <div
                        key={c.SBD}
                        onClick={() => handleToggleSBD(c.SBD)}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-[11px] transition-colors ${
                          isChecked ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>{c.STT_Phong}. {c['Họ tên']} ({c.SBD})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{c.Lớp} | {c.TC1} - {c.TC2}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Xem trước kết quả chia tách */}
          <div className={`p-4 rounded-xl border text-xs ${
            previewInfo.isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="font-bold mb-1 flex items-center gap-1.5">
              {previewInfo.isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kế hoạch chia tách hợp lệ:</span>
                </>
              ) : (
                <>
                  <span>⚠️ Chưa thể thực hiện:</span>
                </>
              )}
            </div>
            <p className="leading-relaxed">
              {previewInfo.isValid ? previewInfo.desc : previewInfo.reason}
            </p>
            {previewInfo.isValid && (
              <p className="text-[11px] text-emerald-700 mt-1 italic">
                * Hệ thống sẽ tự động cập nhật số lượng phòng và đánh lại mã phòng liên tục (từ {config.startRoomCode} trở đi).
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!previewInfo.isValid}
            onClick={handleConfirmSplit}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            Xác nhận Tách phòng
          </button>
        </div>
      </div>
    </div>
  );
};
