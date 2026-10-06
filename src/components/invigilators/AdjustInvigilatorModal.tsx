import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  UserCheck,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Building,
  GraduationCap,
  Calendar,
  Clock,
  Shuffle
} from 'lucide-react';
import { Invigilator, InvigilatorPlanResult, SessionAssignmentResult, RoomInvigilatorAssignment } from '../../types/invigilator';
import { cleanSubjectName, recalculatePlanStatsAndValidation, isTeachingSubject } from '../../utils/invigilatorAlgorithm';

export interface AdjustingRoomTarget {
  sessionId: string;
  sessionName: string;
  subjectName: string;
  date: string;
  shiftTime: string;
  roomNo: number;
  roomLabel: string;
  slot: 'invigilator1' | 'invigilator2';
  currentInvigilator?: Invigilator;
  partnerInvigilator?: Invigilator;
}

interface AdjustInvigilatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: AdjustingRoomTarget;
  planResult: InvigilatorPlanResult;
  invigilators: Invigilator[];
  avoidTeachingSubject: boolean;
  onUpdatePlan: (updatedPlan: InvigilatorPlanResult, message: string) => void;
}

export const AdjustInvigilatorModal: React.FC<AdjustInvigilatorModalProps> = ({
  isOpen,
  onClose,
  target,
  planResult,
  invigilators,
  avoidTeachingSubject,
  onUpdatePlan
}) => {
  if (!isOpen) return null;

  // Selected slot in the room: 'invigilator1' or 'invigilator2'
  const [activeSlot, setActiveSlot] = useState<'invigilator1' | 'invigilator2'>(target.slot);
  const [subTab, setSubTab] = useState<'replace' | 'swap'>('replace');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'free' | 'busy'>('all');

  // Find the active session and room
  const currentSession = useMemo(() => {
    return planResult.sessions.find(s => s.sessionId === target.sessionId);
  }, [planResult, target.sessionId]);

  const currentRoom = useMemo(() => {
    return currentSession?.roomAssignments.find(r => r.roomNo === target.roomNo);
  }, [currentSession, target.roomNo]);

  // Current invigilators for this room
  const inv1 = currentRoom?.invigilator1;
  const inv2 = currentRoom?.invigilator2;
  const activeInv = activeSlot === 'invigilator1' ? inv1 : inv2;
  const partnerInv = activeSlot === 'invigilator1' ? inv2 : inv1;

  // Map of which teachers are assigned to which room in THIS session
  const sessionAssignmentMap = useMemo(() => {
    const map = new Map<string, { roomNo: number; roomLabel: string; slot: 'invigilator1' | 'invigilator2' }>();
    if (!currentSession) return map;

    currentSession.roomAssignments.forEach(r => {
      if (r.invigilator1) {
        map.set(r.invigilator1.id, { roomNo: r.roomNo, roomLabel: r.roomLabel, slot: 'invigilator1' });
      }
      if (r.invigilator2) {
        map.set(r.invigilator2.id, { roomNo: r.roomNo, roomLabel: r.roomLabel, slot: 'invigilator2' });
      }
    });
    return map;
  }, [currentSession]);

  // Quick lookup for stats
  const statsMap = useMemo(() => {
    const map = new Map<string, { totalAssigned: number; targetQuota: number; balanceDiff: number }>();
    planResult.stats.forEach(s => {
      map.set(s.invigilatorId, {
        totalAssigned: s.totalAssigned,
        targetQuota: s.targetQuota,
        balanceDiff: s.balanceDiff
      });
    });
    return map;
  }, [planResult.stats]);

  // Active invigilators list (only those who are Giám thị and available)
  const activeTeachers = useMemo(() => {
    return invigilators.filter(i => {
      if (i.role && i.role !== 'Giám thị') return false;
      return (i.quotaOffset ?? 0) > -50 && i.isAvailable !== false;
    });
  }, [invigilators]);

  // Filtered candidate list for Tab 1 (Replace)
  const filteredCandidates = useMemo(() => {
    return activeTeachers.filter(teacher => {
      // Search keyword filter
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchName = teacher.fullName.toLowerCase().includes(kw);
        const matchCode = teacher.code.toLowerCase().includes(kw);
        const matchUnit = teacher.schoolOrDept.toLowerCase().includes(kw);
        const matchSubject = teacher.subject.toLowerCase().includes(kw);
        if (!matchName && !matchCode && !matchUnit && !matchSubject) return false;
      }

      const assignedInSession = sessionAssignmentMap.get(teacher.id);

      if (filterAvailability === 'free') {
        return !assignedInSession;
      }
      if (filterAvailability === 'busy') {
        return !!assignedInSession && assignedInSession.roomNo !== target.roomNo;
      }

      return true;
    }).sort((a, b) => {
      // Sort: First free teachers, then by lowest assigned shifts (to keep fairness)
      const assignedA = sessionAssignmentMap.has(a.id);
      const assignedB = sessionAssignmentMap.has(b.id);
      if (assignedA !== assignedB) {
        return assignedA ? 1 : -1; // Free first
      }
      const statA = statsMap.get(a.id)?.totalAssigned ?? 0;
      const statB = statsMap.get(b.id)?.totalAssigned ?? 0;
      return statA - statB;
    });
  }, [activeTeachers, searchKeyword, filterAvailability, sessionAssignmentMap, statsMap, target.roomNo]);

  // Other rooms in the same session for Tab 2 (Swap)
  const otherRooms = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.roomAssignments.filter(r => r.roomNo !== target.roomNo);
  }, [currentSession, target.roomNo]);

  // Action: Replace with chosen teacher
  const handleSelectTeacher = (chosenTeacher: Invigilator) => {
    if (!currentSession || !currentRoom) return;

    const existingAssigned = sessionAssignmentMap.get(chosenTeacher.id);

    // If teacher is already in this exact room and slot, nothing to change
    if (existingAssigned && existingAssigned.roomNo === target.roomNo && existingAssigned.slot === activeSlot) {
      onClose();
      return;
    }

    const newSessions = planResult.sessions.map(ses => {
      if (ses.sessionId !== target.sessionId) return ses;

      const newRooms = ses.roomAssignments.map(room => {
        // Target room being modified
        if (room.roomNo === target.roomNo) {
          return {
            ...room,
            [activeSlot]: chosenTeacher
          };
        }
        // If chosenTeacher was already assigned to another room in this session,
        // swap the activeInv into that room so no duplicate/conflict occurs
        if (existingAssigned && room.roomNo === existingAssigned.roomNo) {
          return {
            ...room,
            [existingAssigned.slot]: activeInv
          };
        }
        return room;
      });

      return {
        ...ses,
        roomAssignments: newRooms
      };
    });

    const updatedPlan: InvigilatorPlanResult = {
      ...planResult,
      sessions: newSessions
    };

    const recalculated = recalculatePlanStatsAndValidation(updatedPlan, invigilators, { avoidTeachingSubject });
    
    const slotLabel = planResult.invigilatorsPerRoom === 1 ? 'Giám thị' : (activeSlot === 'invigilator1' ? 'Giám thị 1' : 'Giám thị 2');
    const actionMsg = existingAssigned
      ? `Đã hoán đổi vị trí: Thầy/Cô ${chosenTeacher.fullName} sang ${target.roomLabel} (Thầy/Cô ${activeInv?.fullName || 'cũ'} chuyển sang ${existingAssigned.roomLabel}).`
      : `Đã gán Thầy/Cô ${chosenTeacher.fullName} vào ${target.roomLabel} (${slotLabel}).`;

    onUpdatePlan(recalculated, actionMsg);
    onClose();
  };

  // Action: Swap with another room
  const handleSwapWithRoom = (targetRoomNo: number, targetRoomSlot: 'invigilator1' | 'invigilator2') => {
    if (!currentSession || !currentRoom) return;

    const targetRoomObj = currentSession.roomAssignments.find(r => r.roomNo === targetRoomNo);
    if (!targetRoomObj) return;

    const invSource = activeSlot === 'invigilator1' ? currentRoom.invigilator1 : currentRoom.invigilator2;
    const invDest = targetRoomSlot === 'invigilator1' ? targetRoomObj.invigilator1 : targetRoomObj.invigilator2;

    const newSessions = planResult.sessions.map(ses => {
      if (ses.sessionId !== target.sessionId) return ses;

      const newRooms = ses.roomAssignments.map(room => {
        if (room.roomNo === target.roomNo) {
          return {
            ...room,
            [activeSlot]: invDest
          };
        }
        if (room.roomNo === targetRoomNo) {
          return {
            ...room,
            [targetRoomSlot]: invSource
          };
        }
        return room;
      });

      return {
        ...ses,
        roomAssignments: newRooms
      };
    });

    const updatedPlan: InvigilatorPlanResult = {
      ...planResult,
      sessions: newSessions
    };

    const recalculated = recalculatePlanStatsAndValidation(updatedPlan, invigilators, { avoidTeachingSubject });
    const actionMsg = `Đã hoán đổi thành công: [${target.roomLabel} - ${invDest?.fullName || 'Chưa gán'}] ⇄ [${targetRoomObj.roomLabel} - ${invSource?.fullName || 'Chưa gán'}].`;

    onUpdatePlan(recalculated, actionMsg);
    onClose();
  };

  const isDualInvigilators = planResult.mode === 'survey_mock' && (planResult.invigilatorsPerRoom ?? 2) === 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Điều chỉnh Giám thị: <span className="text-amber-400">{target.roomLabel}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {target.sessionName} • Môn: <span className="text-blue-300 font-semibold">{cleanSubjectName(target.subjectName)}</span> • {target.date} ({target.shiftTime})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot Selection (Giám thị 1 vs Giám thị 2) */}
        {isDualInvigilators && (
          <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-2.5 flex items-center gap-2 text-xs shrink-0">
            <span className="font-semibold text-slate-600 mr-1">Vị trí điều chỉnh:</span>
            <button
              type="button"
              onClick={() => setActiveSlot('invigilator1')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSlot === 'invigilator1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>Giám thị 1:</span>
              <span className="truncate max-w-[140px]">{inv1?.fullName || '(Chưa gán)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSlot('invigilator2')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSlot === 'invigilator2'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>Giám thị 2:</span>
              <span className="truncate max-w-[140px]">{inv2?.fullName || '(Chưa gán)'}</span>
            </button>
          </div>
        )}

        {/* Sub-tabs: Replace vs Swap */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSubTab('replace')}
              className={`inline-flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-colors cursor-pointer ${
                subTab === 'replace'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Thay bằng Giáo viên khác</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('swap')}
              className={`inline-flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-colors cursor-pointer ${
                subTab === 'swap'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Hoán đổi với Phòng khác</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block pb-2">
            Đang đổi: <strong className="text-slate-800">{isDualInvigilators ? (activeSlot === 'invigilator1' ? 'Giám thị 1' : 'Giám thị 2') : 'Giám thị'}</strong> ({activeInv?.fullName})
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {subTab === 'replace' ? (
            <div className="space-y-3.5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên giáo viên, mã số, môn dạy, đơn vị..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs self-start shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterAvailability('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      filterAvailability === 'all'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({activeTeachers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterAvailability('free')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      filterAvailability === 'free'
                        ? 'bg-white text-emerald-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rảnh ca này
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterAvailability('busy')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      filterAvailability === 'busy'
                        ? 'bg-white text-amber-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đang coi ca này
                  </button>
                </div>
              </div>

              {/* Candidates List */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredCandidates.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Không tìm thấy giáo viên phù hợp với từ khóa tìm kiếm.
                  </div>
                ) : (
                  filteredCandidates.map(teacher => {
                    const assignedInfo = sessionAssignmentMap.get(teacher.id);
                    const isCurrentInThisRoom = assignedInfo?.roomNo === target.roomNo;
                    const isCurrentSlot = isCurrentInThisRoom && assignedInfo?.slot === activeSlot;
                    const isPartner = isCurrentInThisRoom && assignedInfo?.slot !== activeSlot;
                    const stat = statsMap.get(teacher.id);
                    const totalShifts = stat?.totalAssigned ?? 0;
                    const quotaTarget = stat?.targetQuota ?? 0;
                    const isSameUnitWithPartner = partnerInv && partnerInv.schoolOrDept === teacher.schoolOrDept;
                    const isSubjectTeacher = isTeachingSubject(teacher.subject, target.subjectName);

                    return (
                      <div
                        key={teacher.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border transition-all text-xs ${
                          isCurrentSlot
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                            : isPartner
                            ? 'bg-slate-100 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded">
                              {teacher.code}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {teacher.fullName}
                            </span>
                            <span className="text-slate-500">
                              ({teacher.schoolOrDept} • Môn: {teacher.subject})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {/* Shift stats */}
                            <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              Đã coi: <strong>{totalShifts}</strong> ca (Mục tiêu: {quotaTarget})
                            </span>

                            {/* Status badges */}
                            {isCurrentSlot ? (
                              <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                                Đang là {isDualInvigilators ? (activeSlot === 'invigilator1' ? 'Giám thị 1' : 'Giám thị 2') : 'Giám thị'} phòng này
                              </span>
                            ) : isPartner ? (
                              <span className="font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                Đang là {activeSlot === 'invigilator1' ? 'Giám thị 2' : 'Giám thị 1'} cùng phòng
                              </span>
                            ) : assignedInfo ? (
                              <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <Shuffle className="w-3 h-3 text-amber-600" />
                                Đang ở {assignedInfo.roomLabel} ({isDualInvigilators ? (assignedInfo.slot === 'invigilator1' ? 'Giám thị 1' : 'Giám thị 2') : 'Giám thị'}) — Chọn sẽ tự hoán đổi
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Rảnh ca này
                              </span>
                            )}

                            {/* Warning: Same unit in survey_mock */}
                            {planResult.mode === 'survey_mock' && isSameUnitWithPartner && !isPartner && (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold" title="Cùng đơn vị với Giám thị còn lại">
                                Cùng đơn vị với {partnerInv?.fullName}
                              </span>
                            )}

                            {/* Notice if teaching subject */}
                            {isSubjectTeacher && (
                              <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded" title="Dạy môn thi của ca này (quy chế cho phép nếu giám sát chuyên môn xử lý)">
                                Dạy môn thi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-2 sm:mt-0 flex items-center gap-2 shrink-0">
                          {isCurrentSlot ? (
                            <span className="text-xs text-blue-600 font-semibold px-2 py-1">
                              Đang chọn
                            </span>
                          ) : isPartner ? (
                            <span className="text-xs text-slate-400 italic px-2 py-1">
                              Không thể tự đổi
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectTeacher(teacher)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                assignedInfo
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {assignedInfo ? (
                                <>
                                  <Shuffle className="w-3.5 h-3.5" />
                                  <span>Tráo đổi vị trí</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Chọn người này</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* SubTab 2: Swap with other room */
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Chọn một phòng thi khác trong cùng buổi thi <strong>{target.sessionName}</strong> để hoán đổi trực tiếp với <strong className="text-blue-700">{target.roomLabel} ({isDualInvigilators ? (activeSlot === 'invigilator1' ? 'Giám thị 1' : 'Giám thị 2') : 'Giám thị'}: {activeInv?.fullName})</strong>:
              </p>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {otherRooms.map(otherRoom => {
                  return (
                    <div
                      key={otherRoom.roomNo}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-slate-50/60 transition-all text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {otherRoom.roomLabel}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Buổi {target.sessionName}
                        </span>
                      </div>

                      <div className={`grid grid-cols-1 ${isDualInvigilators ? 'sm:grid-cols-2' : ''} gap-2`}>
                        {/* Slot 1 of other room */}
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">{isDualInvigilators ? 'Giám thị 1' : 'Giám thị'}</div>
                            <div className="font-bold text-slate-800 truncate">
                              {otherRoom.invigilator1?.fullName || 'Chưa gán'}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {otherRoom.invigilator1?.schoolOrDept}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSwapWithRoom(otherRoom.roomNo, 'invigilator1')}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                            title={`Hoán đổi với ${isDualInvigilators ? 'Giám thị 1' : 'Giám thị'} của ${otherRoom.roomLabel}`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Đổi</span>
                          </button>
                        </div>

                        {/* Slot 2 of other room (if dual invigilators) */}
                        {isDualInvigilators && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[10px] text-slate-500 font-semibold uppercase">Giám thị 2</div>
                              <div className="font-bold text-slate-800 truncate">
                                {otherRoom.invigilator2?.fullName || 'Chưa gán'}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {otherRoom.invigilator2?.schoolOrDept}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSwapWithRoom(otherRoom.roomNo, 'invigilator2')}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                              title={`Hoán đổi với Giám thị 2 của ${otherRoom.roomLabel}`}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>Đổi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-[11px] text-slate-500">
            Hệ thống tự động cập nhật thống kê số ca và kiểm tra vi phạm quy chế sau khi đổi.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
