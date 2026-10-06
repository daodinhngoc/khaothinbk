import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Dices,
  FileSpreadsheet,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Building,
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  Clock,
  BookOpen,
  ArrowLeftRight,
  UserCheck,
  Shuffle,
  Lock,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import {
  Invigilator,
  InvigilatorRole,
  ExamSession,
  InvigilatorMode,
  InvigilatorPlanResult,
  SessionAssignmentResult
} from '../../types/invigilator';
import { DEFAULT_INVIGILATORS, DEFAULT_EXAM_SESSIONS, DEFAULT_PERIODIC_EXAM_SESSIONS } from '../../utils/defaultInvigilatorData';
import {
  assignSurveyMockInvigilators,
  assignPeriodicInvigilators,
  cleanSubjectName,
  recalculatePlanStatsAndValidation,
  isTeachingSubject,
  formatSessionShortLabel
} from '../../utils/invigilatorAlgorithm';
import { exportInvigilatorPlanExcel, exportGeneralInvigilatorAnnouncementExcel } from '../../utils/invigilatorExcelExport';
import {
  buildGeneralAnnouncementData,
  calculateAcademicYear,
  GeneralAnnouncementRow,
  GeneralShiftColumn
} from '../../utils/generalAnnouncementHelper';
import {
  downloadInvigilatorTemplate,
  importInvigilatorsFromExcel,
  downloadExamSessionTemplate,
  importExamSessionsFromExcel
} from '../../utils/invigilatorExcelIO';
import { PrintInvigilatorPlanModal } from './PrintInvigilatorPlanModal';
import { AdjustInvigilatorModal, AdjustingRoomTarget } from './AdjustInvigilatorModal';

interface InvigilatorManagementViewProps {
  schoolName?: string;
  defaultRoomCount?: number;
}

export const InvigilatorManagementView: React.FC<InvigilatorManagementViewProps> = ({
  schoolName = 'TRƯỜNG THPT NGUYỄN HUỆ',
  defaultRoomCount = 24
}) => {
  // Mode selection: survey_mock (Thi thử / Khảo sát - 1 hoặc 2 Giám thị/phòng) vs periodic (Kiểm tra định kỳ - 1 GV/phòng)
  const [mode, setMode] = useState<InvigilatorMode>('survey_mock');

  // Core Data
  const [invigilators, setInvigilators] = useState<Invigilator[]>(() => {
    const saved = localStorage.getItem('invigilators_data_2025_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_INVIGILATORS;
  });

  const [sessions, setSessions] = useState<ExamSession[]>(() => {
    const saved = localStorage.getItem('invigilators_sessions_2025_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s: ExamSession) => ({
            ...s,
            subjectName: cleanSubjectName(s.subjectName),
            numSupervisors: s.numSupervisors ?? Math.max(1, Math.ceil(s.numRooms / 4)),
            numReserves: s.numReserves ?? 2
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_EXAM_SESSIONS.map(s => ({
      ...s,
      subjectName: cleanSubjectName(s.subjectName),
      numRooms: defaultRoomCount > 0 ? defaultRoomCount : s.numRooms,
      numSupervisors: s.numSupervisors ?? Math.max(1, Math.ceil((defaultRoomCount > 0 ? defaultRoomCount : s.numRooms) / 4)),
      numReserves: s.numReserves ?? 2
    }));
  });

  // Tên chính thức của Kỳ thi (được nhập tại Bước 1)
  const [examName, setExamName] = useState<string>(() => {
    const saved = localStorage.getItem('invigilators_exam_name_v2');
    if (saved) return saved;
    return 'KỲ THI KHẢO SÁT CHẤT LƯỢNG KẾT HỢP THI THỬ TỐT NGHIỆP THPT';
  });

  useEffect(() => {
    localStorage.setItem('invigilators_exam_name_v2', examName);
  }, [examName]);

  // Năm học (tự động suy luận từ ngày thi / thời điểm)
  const [academicYear, setAcademicYear] = useState<string>(() => {
    const saved = localStorage.getItem('invigilators_academic_year_v2');
    if (saved) return saved;
    return calculateAcademicYear();
  });

  useEffect(() => {
    localStorage.setItem('invigilators_academic_year_v2', academicYear);
  }, [academicYear]);

  const handleAutoCalculateAcademicYear = () => {
    const firstDate = sessions[0]?.date;
    const computed = calculateAcademicYear(firstDate);
    setAcademicYear(computed);
    showToast(`Đã tính tự động theo lịch thi: ${computed}`);
  };

  // Current Plan Result
  const [planResult, setPlanResult] = useState<InvigilatorPlanResult | null>(null);

  // UI States (5 bước quy trình: 1. Lịch thi -> 2. Danh sách CB -> 3. Lịch coi thi -> 4. Bảng tổng quát -> 5. Bảng chấm công)
  const [activeTab, setActiveTab] = useState<'manage_sessions' | 'manage_teachers' | 'sessions' | 'general_announcement' | 'stats'>('manage_sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bộ lọc cho Bảng Tổng Quát (Bảo mật phòng)
  const [generalSearch, setGeneralSearch] = useState<string>('');
  const [generalDutyFilter, setGeneralDutyFilter] = useState<string>('all');

  // Lưu trữ tùy biến phân công nhiệm vụ (tick chọn / bỏ chọn trên từng buổi)
  const [customDutyOverrides, setCustomDutyOverrides] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('invigilator_custom_duties_v2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('invigilator_custom_duties_v2', JSON.stringify(customDutyOverrides));
  }, [customDutyOverrides]);

  // Cấu trúc cảnh báo khi điều chỉnh thủ công ca trực ở Tab 4
  interface PendingDutyWarning {
    type: 'danger' | 'warning' | 'info';
    title: string;
    desc: string;
  }

  interface PendingDutyChange {
    row: GeneralAnnouncementRow;
    shift: GeneralShiftColumn;
    currentVal: boolean;
    targetVal: boolean;
    warnings: PendingDutyWarning[];
    affectedRooms?: { sessionName: string; roomLabel: string; slot: string }[];
  }

  const [pendingDutyChange, setPendingDutyChange] = useState<PendingDutyChange | null>(null);

  // Áp dụng điều chỉnh ca trực và tự động đồng bộ kết quả 2 chiều
  const applyDutyChangeAndSync = (
    row: GeneralAnnouncementRow,
    shift: GeneralShiftColumn,
    targetVal: boolean
  ) => {
    // 1. Cập nhật bảng customDutyOverrides
    setCustomDutyOverrides(prev => {
      const personDuties = { ...(prev[row.id] || {}) };
      personDuties[shift.shiftKey] = targetVal;
      return {
        ...prev,
        [row.id]: personDuties
      };
    });

    // 2. Tự động đồng bộ với planResult nếu đã có kết quả phân công
    if (planResult && planResult.sessions.length > 0) {
      const updatedSessions = planResult.sessions.map(session => {
        if (!shift.sessionIds.includes(session.sessionId)) {
          return session;
        }

        let newRoomAssignments = session.roomAssignments.map(r => ({ ...r }));
        let newSupervisors = [...(session.supervisors || [])];
        let newReserves = [...(session.reserveInvigilators || [])];

        const invObj = invigilators.find(i => i.id === row.id || i.code === row.code) || {
          id: row.id,
          code: row.code,
          fullName: row.fullName,
          schoolOrDept: row.schoolOrDept,
          subject: row.subject,
          role: row.role as any,
          quotaOffset: 0
        };

        if (!targetVal) {
          // --- BỎ PHÂN CÔNG (TẮT CA) ---
          // A. Rút khỏi phòng thi nếu đang được xếp vào phòng
          newRoomAssignments = newRoomAssignments.map(room => {
            let updatedRoom = { ...room };
            if (updatedRoom.invigilator1?.id === row.id || updatedRoom.invigilator1?.code === row.code) {
              if (newReserves.length > 0) {
                const rep = newReserves.shift()!;
                updatedRoom.invigilator1 = rep;
              } else {
                updatedRoom.invigilator1 = undefined as any;
              }
            }
            if (updatedRoom.invigilator2?.id === row.id || updatedRoom.invigilator2?.code === row.code) {
              if (newReserves.length > 0) {
                const rep = newReserves.shift()!;
                updatedRoom.invigilator2 = rep;
              } else {
                updatedRoom.invigilator2 = undefined as any;
              }
            }
            return updatedRoom;
          });

          // B. Rút khỏi giám sát hành lang
          newSupervisors = newSupervisors.filter(s => s.id !== row.id && s.code !== row.code);

          // C. Rút khỏi giám thị dự phòng
          newReserves = newReserves.filter(r => r.id !== row.id && r.code !== row.code);
        } else {
          // --- BẬT PHÂN CÔNG (THÊM CA) ---
          if (row.groupType === 'supervisor') {
            const alreadySup = newSupervisors.some(s => s.id === row.id || s.code === row.code);
            if (!alreadySup) {
              newSupervisors.push(invObj);
            }
          } else if (row.groupType === 'invigilator') {
            const inRoom = newRoomAssignments.some(
              r => r.invigilator1?.id === row.id || r.invigilator1?.code === row.code ||
                   r.invigilator2?.id === row.id || r.invigilator2?.code === row.code
            );
            const inRes = newReserves.some(r => r.id === row.id || r.code === row.code);

            if (!inRoom && !inRes) {
              // Tìm slot phòng trống để bổ sung vào
              let filledEmptySlot = false;
              for (let r of newRoomAssignments) {
                if (!r.invigilator1) {
                  r.invigilator1 = invObj;
                  filledEmptySlot = true;
                  break;
                }
                if (invigilatorsPerRoom === 2 && !r.invigilator2) {
                  r.invigilator2 = invObj;
                  filledEmptySlot = true;
                  break;
                }
              }
              // Nếu không có phòng trống, bổ sung vào Giám thị dự phòng
              if (!filledEmptySlot) {
                newReserves.push(invObj);
              }
            }
          }
        }

        return {
          ...session,
          roomAssignments: newRoomAssignments,
          supervisors: newSupervisors,
          reserveInvigilators: newReserves
        };
      });

      const updatedPlan: InvigilatorPlanResult = {
        ...planResult,
        sessions: updatedSessions
      };

      const finalPlan = recalculatePlanStatsAndValidation(updatedPlan, invigilators, {
        avoidTeachingSubject,
        invigilatorsPerRoom
      });

      setPlanResult(finalPlan);
    }

    showToast(`✓ Đã ${targetVal ? 'bật phân công' : 'bỏ ca trực'} Buổi ${shift.shiftNumber} cho ${row.fullName} và tự động cập nhật kết quả!`);
  };

  // Kiểm tra vi phạm & xung đột trước khi áp dụng thay đổi
  const handleToggleDutyWithSync = (
    row: GeneralAnnouncementRow,
    shift: GeneralShiftColumn,
    currentVal: boolean
  ) => {
    const targetVal = !currentVal;
    const warnings: PendingDutyWarning[] = [];
    const affectedRooms: { sessionName: string; roomLabel: string; slot: string }[] = [];

    if (targetVal) {
      // 1. CẢNH BÁO BẬT CA:
      if (row.groupType === 'invigilator' && row.subject) {
        const teachesAny = shift.sessionIds.some(sid => {
          const ses = sessions.find(s => s.id === sid || (s as any).sessionId === sid);
          return ses && isTeachingSubject(row.subject, ses.subjectName);
        });
        if (teachesAny) {
          warnings.push({
            type: 'danger',
            title: 'Vi phạm quy chế coi thi chuyên môn',
            desc: `Thầy/Cô ${row.fullName} (${row.code}) dạy môn "${row.subject}", trùng với môn thi "${shift.subjectSummary}" của Buổi ${shift.shiftNumber}. Theo quy chế của Bộ GD&ĐT, giáo viên không được phân công coi thi môn mình đang giảng dạy.`
          });
        }
      }

      if (row.groupType === 'leadership') {
        warnings.push({
          type: 'info',
          title: 'Bổ sung ca trực điều hành',
          desc: `Phân công thêm nhiệm vụ trực Hội đồng thi cho đồng chí ${row.fullName} (${row.role}) vào Buổi ${shift.shiftNumber}. Tên đồng chí sẽ xuất hiện trên chữ ký biên bản ca trực này.`
        });
      }

      const currentTotalDuties = row.totalDuties;
      const avgD = Math.ceil((sessions.length * (invigilatorsPerRoom * (sessions[0]?.numRooms || 24))) / Math.max(1, invigilators.length));
      if (currentTotalDuties >= avgD + 2) {
        warnings.push({
          type: 'warning',
          title: 'Chênh lệch định mức ca coi thi',
          desc: `Cán bộ ${row.fullName} hiện đã có ${currentTotalDuties} ca trực. Việc phân thêm Buổi ${shift.shiftNumber} sẽ nâng lên ${currentTotalDuties + 1} ca, có thể gây mất cân đối công bằng với các cán bộ khác trong Hội đồng.`
        });
      }
    } else {
      // 2. CẢNH BÁO BỎ CA:
      if (planResult && row.groupType === 'invigilator') {
        shift.sessionIds.forEach(sid => {
          const ses = planResult.sessions.find(s => s.sessionId === sid);
          if (ses) {
            ses.roomAssignments.forEach(ra => {
              if (ra.invigilator1?.id === row.id || ra.invigilator1?.code === row.code) {
                affectedRooms.push({ sessionName: ses.sessionName, roomLabel: ra.roomLabel, slot: 'Giám thị 1' });
              }
              if (ra.invigilator2?.id === row.id || ra.invigilator2?.code === row.code) {
                affectedRooms.push({ sessionName: ses.sessionName, roomLabel: ra.roomLabel, slot: 'Giám thị 2' });
              }
            });
          }
        });

        if (affectedRooms.length > 0) {
          warnings.push({
            type: 'danger',
            title: 'Đang phụ trách phòng thi cụ thể',
            desc: `Thầy/Cô ${row.fullName} hiện đang coi thi tại: ${affectedRooms.map(r => `${r.roomLabel} (${r.slot} - ${r.sessionName})`).join(', ')}. Nếu bỏ ca, hệ thống sẽ rút cán bộ này khỏi phòng thi (tự động thay bằng Giám thị dự phòng nếu có, hoặc để trống để phân công lại).`
          });
        }
      }

      if (row.groupType === 'leadership' && generalData) {
        const otherLeaders = generalData.rows.filter(r =>
          r.id !== row.id &&
          r.groupType === 'leadership' &&
          (row.role.includes('Thư ký') ? r.role.includes('Thư ký') : (r.role.includes('Chủ tịch') || r.role.includes('Phó Chủ tịch'))) &&
          r.shiftDuties[shift.shiftKey]
        );
        if (otherLeaders.length === 0) {
          warnings.push({
            type: 'warning',
            title: `Thiếu ${row.role.includes('Thư ký') ? 'Thư ký' : 'Lãnh đạo'} trực ca`,
            desc: `Nếu bỏ ca của ${row.fullName}, Buổi ${shift.shiftNumber} (${shift.period}) sẽ không còn ${row.role.includes('Thư ký') ? 'Thư ký' : 'Lãnh đạo'} nào trực Hội đồng để chỉ đạo và ký biên bản thi.`
          });
        }
      }
    }

    // Nếu có bất kỳ cảnh báo nào: Hiển thị Modal Cảnh báo & Quyết định của người dùng
    if (warnings.length > 0) {
      setPendingDutyChange({
        row,
        shift,
        currentVal,
        targetVal,
        warnings,
        affectedRooms
      });
    } else {
      // Không có xung đột: Áp dụng ngay
      applyDutyChangeAndSync(row, shift, targetVal);
    }
  };

  const handleResetDutiesToDefault = () => {
    setCustomDutyOverrides({});
    showToast('Đã khôi phục lịch phân công điều hành Lãnh đạo & Thư ký về chuẩn chia đều!');
  };

  // Tùy chọn phân công: Mặc định false (tất cả giám thị như nhau để chia đều ca tuyệt đối nhất)
  const [avoidTeachingSubject, setAvoidTeachingSubject] = useState<boolean>(false);

  // Số lượng giám thị / phòng cho kỳ thi thử/khảo sát (1: Tiết kiệm kinh phí, 2: Đủ hai giám thị chuẩn quy chế)
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState<1 | 2>(() => {
    const saved = localStorage.getItem('invigilators_per_room_pref_v2');
    if (saved === '1' || saved === '2') {
      return parseInt(saved, 10) as 1 | 2;
    }
    return 2;
  });

  useEffect(() => {
    localStorage.setItem('invigilators_per_room_pref_v2', String(invigilatorsPerRoom));
  }, [invigilatorsPerRoom]);

  // Modal Điều chỉnh thủ công mềm từng phòng
  const [adjustingRoom, setAdjustingRoom] = useState<AdjustingRoomTarget | null>(null);

  // Modal Thêm/Sửa Cán bộ & Giám thị
  const [editingTeacher, setEditingTeacher] = useState<Invigilator | null>(null);
  const [showTeacherModal, setShowTeacherModal] = useState<boolean>(false);

  // Modal Thêm/Sửa Buổi thi
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [sessionSubjectVal, setSessionSubjectVal] = useState<string>('');

  // Modal Xác nhận An toàn (thay thế window.confirm để tương thích 100% trong iframe / AI Studio)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [importResultModal, setImportResultModal] = useState<{
    fileName: string;
    totalImported: number;
    rolesSummary: Record<string, number>;
    exemptCount: number;
    reductionCount: number;
    warnings: string[];
    reducedInvs: { name: string; offset: number; note?: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionFileInputRef = useRef<HTMLInputElement>(null);

  // Toast tự tắt
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tải file mẫu Lịch thi Excel
  const handleDownloadSessionTemplate = async () => {
    try {
      await downloadExamSessionTemplate();
      showToast('Đã tải File Excel Mẫu Kế hoạch & Lịch thi!');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi khi tạo file mẫu lịch thi');
    }
  };

  // Import Lịch thi từ Excel
  const handleSessionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importExamSessionsFromExcel(file);
      if (!res.sessions || res.sessions.length === 0) {
        showToast('Không tìm thấy dữ liệu buổi thi hợp lệ trong file Excel.');
        return;
      }
      setSessions(res.sessions);
      runAssignment(mode, invigilators, res.sessions);
      showToast(`Đã nhập thành công ${res.totalImported} buổi thi từ file Excel!`);
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi đọc file Excel Lịch thi: ' + (err?.message || 'Định dạng file không đúng.'));
    } finally {
      if (sessionFileInputRef.current) sessionFileInputRef.current.value = '';
    }
  };

  // Lưu trữ LocalStorage
  useEffect(() => {
    localStorage.setItem('invigilators_data_2025_v2', JSON.stringify(invigilators));
  }, [invigilators]);

  useEffect(() => {
    localStorage.setItem('invigilators_sessions_2025_v2', JSON.stringify(sessions));
  }, [sessions]);

  // Phân công tự động
  const runAssignment = (
    customMode?: InvigilatorMode,
    curInvs = invigilators,
    curSessions = sessions,
    curAvoid = avoidTeachingSubject,
    curInvPerRoom = invigilatorsPerRoom
  ) => {
    const targetMode = customMode || mode;
    setIsDrawing(true);

    if (curSessions.length === 0 || curInvs.length === 0) {
      setPlanResult(null);
      setIsDrawing(false);
      return;
    }

    setTimeout(() => {
      let result: InvigilatorPlanResult;
      const opts = {
        avoidTeachingSubject: curAvoid,
        invigilatorsPerRoom: curInvPerRoom
      };
      if (targetMode === 'survey_mock') {
        result = assignSurveyMockInvigilators(curInvs, curSessions, opts);
      } else {
        result = assignPeriodicInvigilators(curInvs, curSessions, opts);
      }
      setPlanResult(result);
      // Xóa các tick thủ công cũ để Tab 4 đồng bộ 100% với phương án bốc thăm mới
      setCustomDutyOverrides({});
      localStorage.removeItem('invigilator_custom_duties_v2');
      if (result.sessions.length > 0) {
        // Kiểm tra xem selectedSessionId có hợp lệ không
        const exists = result.sessions.some(s => s.sessionId === selectedSessionId);
        if (!exists) {
          setSelectedSessionId(result.sessions[0].sessionId);
        }
      }
      setIsDrawing(false);
    }, 250);
  };

  // =========================================================================
  // WORKFLOW GUARDS (Kiểm soát 5 bước theo thứ tự logic từ trái sang phải)
  // =========================================================================
  const step1Status = useMemo(() => {
    if (sessions.length === 0) {
      return { ready: false, message: 'Chưa có buổi thi nào được cấu hình' };
    }
    const invalidRooms = sessions.find(s => !s.numRooms || s.numRooms <= 0);
    if (invalidRooms) {
      return { ready: false, message: `Buổi "${invalidRooms.sessionName}" chưa có số phòng hợp lệ (> 0)` };
    }
    return { ready: true, message: `Đã cấu hình ${sessions.length} buổi thi` };
  }, [sessions]);

  const activeExamInvs = useMemo(() => {
    return invigilators.filter(i => (i.role || 'Giám thị') === 'Giám thị');
  }, [invigilators]);

  const step2Status = useMemo(() => {
    if (!step1Status.ready) {
      return { ready: false, message: 'Cần hoàn thành Bước 1 (Kế hoạch & Lịch thi) trước' };
    }
    if (invigilators.length === 0) {
      return { ready: false, message: 'Chưa có danh sách Cán bộ & Giám thị' };
    }
    if (activeExamInvs.length === 0) {
      return { ready: false, message: 'Cần ít nhất 1 cán bộ giữ vai trò "Giám thị" coi thi trực tiếp' };
    }
    return { ready: true, message: `Đã có ${invigilators.length} cán bộ (${activeExamInvs.length} giám thị trực tiếp)` };
  }, [step1Status.ready, invigilators.length, activeExamInvs.length]);

  const step3Status = useMemo(() => {
    if (!step1Status.ready || !step2Status.ready) {
      return { ready: false, message: 'Cần hoàn tất Bước 1 và Bước 2 trước' };
    }
    if (!planResult || planResult.sessions.length === 0) {
      return { ready: false, message: 'Chưa có kết quả bốc thăm phân công' };
    }
    if (planResult.sessions.length !== sessions.length) {
      return { ready: false, message: 'Số buổi thi đã thay đổi, cần bốc thăm lại' };
    }
    return { ready: true, message: 'Kết quả phân công coi thi sẵn sàng' };
  }, [step1Status.ready, step2Status.ready, planResult, sessions.length]);

  const step4Status = step3Status;
  const step5Status = step3Status;

  const handleSelectTab = (targetTab: 'manage_sessions' | 'manage_teachers' | 'sessions' | 'general_announcement' | 'stats') => {
    if (targetTab === 'manage_sessions') {
      setActiveTab('manage_sessions');
      return;
    }
    if (targetTab === 'manage_teachers') {
      if (!step1Status.ready) {
        showToast('⚠️ Bước 1 chưa hoàn tất: ' + step1Status.message);
        return;
      }
      setActiveTab('manage_teachers');
      return;
    }
    if (targetTab === 'sessions') {
      if (!step1Status.ready) {
        showToast('⚠️ Vui lòng hoàn thành Bước 1 (Kế hoạch & Lịch thi) trước.');
        return;
      }
      if (!step2Status.ready) {
        showToast('⚠️ Bước 2 chưa hoàn tất: ' + step2Status.message);
        return;
      }
      setActiveTab('sessions');
      return;
    }
    if (targetTab === 'general_announcement' || targetTab === 'stats') {
      if (!step1Status.ready) {
        showToast('⚠️ Vui lòng hoàn thành Bước 1 (Kế hoạch & Lịch thi) trước.');
        return;
      }
      if (!step2Status.ready) {
        showToast('⚠️ Vui lòng hoàn tất Bước 2 (Danh sách Hội đồng & Giám thị) trước.');
        return;
      }
      if (!step3Status.ready) {
        showToast('⚠️ ' + step3Status.message + '. Vui lòng chuyển sang Bước 3 để bốc thăm trước!');
        return;
      }
      setActiveTab(targetTab);
    }
  };

  const handleToggleAvoidTeaching = (checked: boolean) => {
    setAvoidTeachingSubject(checked);
    runAssignment(mode, invigilators, sessions, checked, invigilatorsPerRoom);
    showToast(
      checked
        ? 'Đã BẬT: Tránh phân công giáo viên dạy môn thi của buổi đó'
        : 'Đã BẬT: Mặc định tất cả giám thị như nhau, phân công chia đều ca tuyệt đối'
    );
  };

  const handleChangeInvigilatorsPerRoom = (val: 1 | 2) => {
    setInvigilatorsPerRoom(val);
    runAssignment(mode, invigilators, sessions, avoidTeachingSubject, val);
    showToast(
      val === 1
        ? 'Đã chọn: Duy nhất 1 Giám thị coi thi / phòng (Tiết kiệm kinh phí)'
        : 'Đã chọn: Đủ 2 Giám thị coi thi / phòng (Giám thị 1 + Giám thị 2 chuẩn quy chế)'
    );
  };

  useEffect(() => {
    runAssignment();
  }, [mode]);

  // Danh sách các đơn vị / trường duy nhất
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    invigilators.forEach(i => {
      if (i.schoolOrDept) units.add(i.schoolOrDept);
    });
    return Array.from(units);
  }, [invigilators]);

  // Giáo viên sau khi lọc
  const filteredInvigilators = useMemo(() => {
    return invigilators.filter(inv => {
      const matchSearch = (inv.fullName + ' ' + inv.code + ' ' + inv.subject + ' ' + (inv.note || '')).toLowerCase().includes(searchTeacher.toLowerCase());
      const matchUnit = unitFilter === 'all' || inv.schoolOrDept === unitFilter;
      
      let matchRole = true;
      if (roleFilter === 'Giám thị') {
        matchRole = !inv.role || inv.role === 'Giám thị';
      } else if (roleFilter === 'Lãnh đạo & Thư ký') {
        matchRole = inv.role === 'Chủ tịch' || inv.role === 'Phó Chủ tịch' || inv.role === 'Thư ký';
      } else if (roleFilter === 'Giám sát') {
        matchRole = inv.role === 'Giám sát';
      } else if (roleFilter === 'Khảo thí - Hỗ trợ') {
        matchRole = inv.role === 'Khảo thí - Hỗ trợ';
      } else if (roleFilter === 'Phục vụ') {
        matchRole = inv.role === 'Y tế' || inv.role === 'Bảo vệ' || inv.role === 'Phục vụ';
      }

      return matchSearch && matchUnit && matchRole;
    });
  }, [invigilators, searchTeacher, unitFilter, roleFilter]);

  // Dữ liệu Bảng Phân Công Tổng Quát (Bảo mật số phòng)
  const generalData = useMemo(() => {
    if (!planResult) return null;
    return buildGeneralAnnouncementData(
      planResult,
      sessions,
      invigilators,
      schoolName,
      examName,
      academicYear,
      customDutyOverrides
    );
  }, [planResult, sessions, invigilators, schoolName, examName, academicYear, customDutyOverrides]);

  // Hàng dữ liệu bảng tổng quát sau khi tìm kiếm / lọc
  const filteredGeneralRows = useMemo(() => {
    if (!generalData) return [];
    return generalData.rows.filter(row => {
      const q = generalSearch.toLowerCase().trim();
      const matchSearch = !q || (row.fullName + ' ' + row.code + ' ' + row.subject + ' ' + row.schoolOrDept + ' ' + row.role + ' ' + row.note).toLowerCase().includes(q);
      
      let matchDuty = true;
      if (generalDutyFilter === 'leadership') {
        matchDuty = row.groupType === 'leadership';
      } else if (generalDutyFilter === 'supervisor') {
        matchDuty = row.groupType === 'supervisor';
      } else if (generalDutyFilter === 'support') {
        matchDuty = row.groupType === 'support';
      } else if (generalDutyFilter === 'invigilator') {
        matchDuty = row.groupType === 'invigilator';
      } else if (generalDutyFilter === 'active_only') {
        matchDuty = row.totalDuties > 0;
      }
      return matchSearch && matchDuty;
    });
  }, [generalData, generalSearch, generalDutyFilter]);

  // Xóa toàn bộ danh sách cán bộ để nhập mới
  const handleClearAllInvigilators = () => {
    if (invigilators.length === 0) {
      showToast('Danh sách cán bộ hiện đang trống!');
      return;
    }
    setConfirmModal({
      title: 'Xóa toàn bộ danh sách Hội đồng thi?',
      message: `Bạn có chắc chắn muốn XÓA HẾT ${invigilators.length} cán bộ (Lãnh đạo, Giám thị, Khảo thí, Y tế, Bảo vệ...) để làm sạch danh sách và nạp mới từ file Excel không? Toàn bộ phân công hiện tại cũng sẽ được làm mới.`,
      confirmText: `Xóa sạch ${invigilators.length} cán bộ`,
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setInvigilators([]);
        localStorage.removeItem('invigilators_data_2025_v2');
        runAssignment(mode, [], sessions);
        showToast('Đã xóa sạch toàn bộ danh sách cán bộ Hội đồng thi!');
        setConfirmModal(null);
      }
    });
  };

  // Nạp lại dữ liệu mẫu
  const handleResetSampleData = () => {
    setConfirmModal({
      title: 'Nạp lại dữ liệu Hội đồng & Giám thị mẫu?',
      message: 'Hệ thống sẽ khôi phục danh sách đầy đủ gồm Ban Lãnh đạo, Thư ký, Khảo thí, Giám sát, Y tế và 50+ Giám thị mẫu.',
      confirmText: 'Khôi phục danh sách mẫu',
      cancelText: 'Hủy bỏ',
      isDanger: false,
      onConfirm: () => {
        setInvigilators(DEFAULT_INVIGILATORS);
        const defaultSess = DEFAULT_EXAM_SESSIONS.map(s => ({
          ...s,
          subjectName: cleanSubjectName(s.subjectName),
          numRooms: defaultRoomCount > 0 ? defaultRoomCount : s.numRooms
        }));
        setSessions(defaultSess);
        runAssignment(mode, DEFAULT_INVIGILATORS, defaultSess);
        showToast('Đã khôi phục dữ liệu Hội đồng & Giám thị mẫu!');
        setConfirmModal(null);
      }
    });
  };

  // Khôi phục chuẩn 3 Buổi Khảo sát / Thi thử (Buổi 1: Ngữ văn, Buổi 2: Toán, Buổi 3: Ca 1 & Ca 2 Tự chọn)
  const handleResetSessionsToDefault = () => {
    setConfirmModal({
      title: 'Khôi phục chuẩn 3 Buổi Thi thử?',
      message: 'Khôi phục cấu hình về 3 Buổi thi Khảo sát / Thi thử chuẩn (Buổi 1: Ngữ văn, Buổi 2: Toán, Buổi 3: Ca 1 & Ca 2 Tự chọn - Cặp giám thị giữ nguyên phòng)?',
      confirmText: 'Nạp chuẩn 3 Buổi',
      cancelText: 'Hủy bỏ',
      isDanger: false,
      onConfirm: () => {
        const defaultSess = DEFAULT_EXAM_SESSIONS.map(s => ({
          ...s,
          subjectName: cleanSubjectName(s.subjectName),
          numRooms: defaultRoomCount > 0 ? defaultRoomCount : s.numRooms
        }));
        setSessions(defaultSess);
        runAssignment(mode, invigilators, defaultSess);
        showToast('Đã nạp chuẩn 3 Buổi thi thử (Ngữ văn - Toán - Tự chọn 1 & 2)!');
        setConfirmModal(null);
      }
    });
  };

  // Nạp lịch mẫu Kiểm tra định kỳ (5 Buổi, mỗi buổi có thể 1-2-3 môn)
  const handleLoadPeriodicSessions = () => {
    setConfirmModal({
      title: 'Nạp lịch mẫu Kiểm tra định kỳ (5 Buổi)?',
      message: 'Nạp cấu hình Kiểm tra định kỳ (5 Buổi gồm: Buổi 1: Ngữ văn + GDCD; Buổi 2: Toán + Tiếng Anh; Buổi 3: Vật lí + Hóa học + Sinh học; Buổi 4: Lịch sử + Địa lí; Buổi 5: Tin học + Công nghệ)?',
      confirmText: 'Nạp mẫu 5 Buổi',
      cancelText: 'Hủy bỏ',
      isDanger: false,
      onConfirm: () => {
        const periodicSess = DEFAULT_PERIODIC_EXAM_SESSIONS.map(s => ({
          ...s,
          numRooms: defaultRoomCount > 0 ? defaultRoomCount : s.numRooms
        }));
        setSessions(periodicSess);
        runAssignment(mode, invigilators, periodicSess);
        showToast('Đã nạp lịch mẫu Kiểm tra định kỳ 5 Buổi (nhiều môn/buổi)!');
        setConfirmModal(null);
      }
    });
  };

  // Cập nhật số ca giảm trừ nhanh
  const handleUpdateQuota = (id: string, newOffset: number) => {
    const updated = invigilators.map(inv => inv.id === id ? { ...inv, quotaOffset: newOffset } : inv);
    setInvigilators(updated);
    runAssignment(mode, updated, sessions);
  };

  // Lưu giáo viên khi thêm hoặc sửa
  const handleSaveTeacher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get('code') as string).trim();
    const fullName = (formData.get('fullName') as string).trim();
    const schoolOrDept = (formData.get('schoolOrDept') as string).trim();
    const subject = (formData.get('subject') as string).trim();
    const role = (formData.get('role') as InvigilatorRole) || 'Giám thị';
    const quotaOffset = Number(formData.get('quotaOffset') || 0);
    const note = (formData.get('note') as string).trim();
    const phone = (formData.get('phone') as string).trim();

    if (!code || !fullName) {
      showToast('Vui lòng nhập đầy đủ Mã GV và Họ tên cán bộ!');
      return;
    }

    let updatedList: Invigilator[];
    if (editingTeacher) {
      updatedList = invigilators.map(inv => inv.id === editingTeacher.id ? {
        ...inv,
        code,
        fullName,
        schoolOrDept,
        subject,
        role,
        quotaOffset,
        note,
        phone
      } : inv);
    } else {
      const newInv: Invigilator = {
        id: 'gv_' + Date.now(),
        code,
        fullName,
        schoolOrDept: schoolOrDept || 'THPT Nguyễn Huệ',
        subject: subject || 'Toán',
        role,
        quotaOffset,
        note,
        phone,
        isAvailable: true
      };
      updatedList = [newInv, ...invigilators];
    }

    setInvigilators(updatedList);
    setShowTeacherModal(false);
    setEditingTeacher(null);
    runAssignment(mode, updatedList, sessions);
    showToast(editingTeacher ? 'Đã cập nhật thông tin cán bộ!' : 'Đã thêm cán bộ mới vào Hội đồng!');
  };

  // Xóa giáo viên thủ công
  const handleDeleteTeacher = (id: string) => {
    const teacher = invigilators.find(inv => inv.id === id);
    setConfirmModal({
      title: 'Xác nhận xóa cán bộ khỏi Hội đồng?',
      message: `Bạn có chắc chắn muốn xóa cán bộ "${teacher?.fullName || 'này'}" (${teacher?.code || ''} - ${teacher?.role || 'Giám thị'}) khỏi danh sách không?`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        const updated = invigilators.filter(inv => inv.id !== id);
        setInvigilators(updated);
        runAssignment(mode, updated, sessions);
        showToast(`Đã xóa cán bộ ${teacher?.fullName || ''} khỏi danh sách!`);
        setConfirmModal(null);
      }
    });
  };

  // =========================================================================
  // LOGIC CHỈNH SỬA / THÊM / XÓA / ĐỔI THỨ TỰ BUỔI THI LINH ĐỘNG
  // =========================================================================
  const handleSaveSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sessionName = (formData.get('sessionName') as string).trim();
    const rawSubjectName = (formData.get('subjectName') as string).trim();
    const subjectName = cleanSubjectName(rawSubjectName);
    const date = (formData.get('date') as string).trim();
    const shiftTime = (formData.get('shiftTime') as string).trim();
    const numRooms = Math.max(1, Number(formData.get('numRooms') || 24));
    const startRoomNumber = Math.max(1, Number(formData.get('startRoomNumber') || 1));
    const numSupervisors = Math.max(0, Number(formData.get('numSupervisors') || Math.ceil(numRooms / 4)));
    const numReserves = Math.max(0, Number(formData.get('numReserves') || 2));

    if (!sessionName || !subjectName) {
      showToast('Vui lòng nhập đầy đủ Tên buổi thi và Môn thi!');
      return;
    }

    let updatedSessions: ExamSession[];
    if (editingSession) {
      updatedSessions = sessions.map(s => s.id === editingSession.id ? {
        ...s,
        sessionName,
        subjectName,
        date,
        shiftTime,
        numRooms,
        startRoomNumber,
        numSupervisors,
        numReserves
      } : s);
    } else {
      const newSes: ExamSession = {
        id: 'ses_' + Date.now(),
        sessionName,
        subjectName,
        date: date || '2025-06-27',
        shiftTime: shiftTime || '07h30 - 09h00 (90 phút)',
        numRooms,
        startRoomNumber,
        numSupervisors,
        numReserves
      };
      updatedSessions = [...sessions, newSes];
    }

    setSessions(updatedSessions);
    setShowSessionModal(false);
    setEditingSession(null);
    runAssignment(mode, invigilators, updatedSessions);
    showToast('Đã lưu cấu hình buổi thi và đồng bộ phân công!');
  };

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length <= 1) {
      showToast('Kỳ thi phải có ít nhất 01 buổi thi.');
      return;
    }
    const ses = sessions.find(s => s.id === sessionId);
    setConfirmModal({
      title: 'Xác nhận xóa Buổi/Ca thi?',
      message: `Bạn có chắc chắn muốn xóa "${ses?.sessionName || 'buổi thi này'}" (${ses?.subjectName || ''})? Toàn bộ phân công sẽ được tính toán lại tự động.`,
      confirmText: 'Xóa buổi thi',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        const updated = sessions.filter(s => s.id !== sessionId);
        setSessions(updated);
        runAssignment(mode, invigilators, updated);
        showToast('Đã xóa buổi thi và cập nhật lại phân công!');
        setConfirmModal(null);
      }
    });
  };

  const handleMoveSession = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sessions.length) return;

    const newSessions = [...sessions];
    const temp = newSessions[index];
    newSessions[index] = newSessions[targetIdx];
    newSessions[targetIdx] = temp;

    setSessions(newSessions);
    runAssignment(mode, invigilators, newSessions);
  };

  const handleUpdateSessionRooms = (sessionId: string, newRooms: number) => {
    const updated = sessions.map(s => s.id === sessionId ? { ...s, numRooms: Math.max(1, newRooms) } : s);
    setSessions(updated);
    runAssignment(mode, invigilators, updated);
  };

  const handleUpdateSessionStartRoom = (sessionId: string, newStart: number) => {
    const updated = sessions.map(s => s.id === sessionId ? { ...s, startRoomNumber: Math.max(1, newStart) } : s);
    setSessions(updated);
    runAssignment(mode, invigilators, updated);
  };

  const handleUpdateSessionSupervisors = (sessionId: string, newSup: number) => {
    const updated = sessions.map(s => s.id === sessionId ? { ...s, numSupervisors: Math.max(0, newSup) } : s);
    setSessions(updated);
    runAssignment(mode, invigilators, updated);
  };

  const handleUpdateSessionReserves = (sessionId: string, newRes: number) => {
    const updated = sessions.map(s => s.id === sessionId ? { ...s, numReserves: Math.max(0, newRes) } : s);
    setSessions(updated);
    runAssignment(mode, invigilators, updated);
  };

  // =========================================================================
  // EXCEL IMPORT & EXPORT
  // =========================================================================
  const handleExportExcel = async () => {
    if (!planResult) return;
    setIsExporting(true);
    try {
      await exportInvigilatorPlanExcel(
        planResult,
        sessions,
        invigilators,
        schoolName,
        examName,
        academicYear,
        customDutyOverrides
      );
      showToast('Đã xuất file Excel phân công & danh sách Hội đồng thi!');
    } catch (error) {
      console.error(error);
      showToast('Có lỗi khi tạo file Excel phân công giám thị');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGeneralExcel = async () => {
    if (!planResult) return;
    setIsExporting(true);
    try {
      await exportGeneralInvigilatorAnnouncementExcel(
        planResult,
        sessions,
        invigilators,
        schoolName,
        examName,
        academicYear,
        customDutyOverrides
      );
      showToast('Đã xuất Bảng Tổng Quát (Bảo mật số phòng) theo mẫu công bố!');
    } catch (error) {
      console.error(error);
      showToast('Có lỗi khi tạo file Excel tổng quát');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcelTemplate = async () => {
    try {
      await downloadInvigilatorTemplate();
      showToast('Đã tải File Excel mẫu Hội đồng & Giám thị!');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi khi tạo file mẫu Excel');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importInvigilatorsFromExcel(file);
      if (result.invigilators.length === 0) {
        showToast('Không tìm thấy dữ liệu cán bộ hợp lệ trong file Excel.');
        return;
      }

      setInvigilators(result.invigilators);
      runAssignment(mode, result.invigilators, sessions);

      const reducedInvs = result.invigilators
        .filter(i => (i.quotaOffset || 0) < 0 && (i.quotaOffset || 0) > -50)
        .map(i => ({ name: i.fullName, offset: i.quotaOffset, note: i.note }));

      setImportResultModal({
        fileName: file.name,
        totalImported: result.totalImported,
        rolesSummary: result.rolesSummary,
        exemptCount: result.exemptCount,
        reductionCount: result.reductionCount,
        warnings: result.warnings,
        reducedInvs
      });

      const rolesText = Object.entries(result.rolesSummary)
        .map(([r, c]) => `${c} ${r}`)
        .join(', ');

      showToast(`Đã nhập thành công ${result.totalImported} cán bộ (${rolesText})!`);
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi đọc file Excel: ' + (err?.message || 'Định dạng file không phù hợp. Vui lòng tải file mẫu để xem chuẩn.'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentSessionData = planResult?.sessions.find(s => s.sessionId === selectedSessionId) || planResult?.sessions[0];

  // Helper render role badge
  const renderRoleBadge = (role?: InvigilatorRole) => {
    switch (role) {
      case 'Chủ tịch':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Chủ tịch HĐ</span>;
      case 'Phó Chủ tịch':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">P. Chủ tịch</span>;
      case 'Thư ký':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Thư ký HĐ</span>;
      case 'Giám sát':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Giám sát HL</span>;
      case 'Khảo thí - Hỗ trợ':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">Khảo thí - Hỗ trợ</span>;
      case 'Y tế':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Y tế</span>;
      case 'Bảo vệ':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">Bảo vệ</span>;
      case 'Phục vụ':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">Phục vụ</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Giám thị phòng</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Input file ẩn cho Import Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* BANNER ĐIỀU HÀNH CHÍNH & LỰA CHỌN CHẾ ĐỘ PHÂN CÔNG */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  Phân Công Giám Thị & Điều Hành Hội Đồng Thi
                </h1>
                <p className="text-xs text-slate-300">
                  {schoolName} • {sessions.length} Buổi/Ca thi ({sessions.reduce((s, c) => s + c.numRooms, 0)} lượt phòng) • {invigilators.length} Cán bộ HĐ
                </p>
              </div>
            </div>
          </div>

          {/* Chọn Chế độ & Tùy chọn Số Giám thị */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 bg-white/10 p-1 rounded-xl backdrop-blur-xs border border-white/10">
              <button
                id="btn-mode-survey-mock"
                type="button"
                onClick={() => {
                  setMode('survey_mock');
                  runAssignment('survey_mock');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'survey_mock'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Thi thử / Khảo sát (Bốc thăm)</span>
              </button>

              <button
                id="btn-mode-periodic"
                type="button"
                onClick={() => {
                  setMode('periodic');
                  runAssignment('periodic');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'periodic'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Kiểm tra định kỳ (1 GV / Phòng)</span>
              </button>
            </div>

            {mode === 'survey_mock' && (
              <div className="flex items-center gap-1 bg-blue-950/80 p-1 rounded-xl border border-blue-400/30 text-xs">
                <button
                  type="button"
                  onClick={() => handleChangeInvigilatorsPerRoom(1)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invigilatorsPerRoom === 1
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                  title="Trường muốn tiết kiệm kinh phí nên chỉ bố trí duy nhất 1 Giám thị / phòng"
                >
                  1 Giám thị/phòng (Tiết kiệm)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeInvigilatorsPerRoom(2)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invigilatorsPerRoom === 2
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                  title="Bố trí đầy đủ 2 Giám thị (Giám thị 1 và Giám thị 2) theo đúng quy chế thi"
                >
                  2 Giám thị/phòng (Chuẩn)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Thanh công cụ hành động nhanh */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Hội đồng thi:</span>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Xuất file Excel gồm: Lịch phân công, Danh sách HĐ dán cửa phòng, Bảng chấm công thanh toán, Biên bản bốc thăm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang tạo Excel...' : 'Xuất File Excel dán bảng'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportGeneralExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Xuất file Excel Bảng phân công tổng quát theo buổi (không hiển thị số phòng để bảo mật, chỉ công bố buổi coi thi và tổng số buổi)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Bảng Tổng Quát (Bảo mật phòng)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xem & In A4</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 italic">
              {activeTab === 'manage_sessions' && 'Quy trình Bước 1: Khai báo các buổi thi và số lượng phòng thi'}
              {activeTab === 'manage_teachers' && 'Quy trình Bước 2: Quản lý danh sách cán bộ, vai trò và ca giảm trừ'}
              {activeTab === 'sessions' && 'Quy trình Bước 3: Xem kết quả bốc thăm phân công và kiểm tra quy chế'}
              {activeTab === 'general_announcement' && 'Quy trình Bước 4: Bảng tổng quát công bố trước - Bảo mật số phòng thi'}
              {activeTab === 'stats' && 'Quy trình Bước 5: Bảng chấm công thanh toán và cân đối định mức'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CÁC TAB NỘI DUNG CHÍNH (5 BƯỚC CHUẨN QUY TRÌNH) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        
        {/* Navigation Tabs (5 Bước quy trình từ trái qua phải có kiểm soát logic) */}
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 px-3 pt-2 gap-1">
          {/* Bước 1 */}
          <button
            type="button"
            onClick={() => handleSelectTab('manage_sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-lg ${
              activeTab === 'manage_sessions'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {step1Status.ready ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <BookOpen className="w-4 h-4 text-purple-600" />
              )}
              <span>1. Kế hoạch & Lịch thi</span>
            </div>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-semibold">
              {sessions.length} buổi
            </span>
          </button>

          {/* Bước 2 */}
          <button
            type="button"
            onClick={() => handleSelectTab('manage_teachers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-lg ${
              activeTab === 'manage_teachers'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : !step1Status.ready
                ? 'border-transparent text-slate-400 bg-slate-100/40 opacity-70'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title={!step1Status.ready ? 'Cần cấu hình Bước 1 trước' : undefined}
          >
            <div className="flex items-center gap-1.5">
              {!step1Status.ready ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : step2Status.ready ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Users className="w-4 h-4 text-emerald-600" />
              )}
              <span>2. Danh sách Hội đồng & Giám thị</span>
            </div>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
              {invigilators.length} người
            </span>
          </button>

          {/* Bước 3 */}
          <button
            type="button"
            onClick={() => handleSelectTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-lg ${
              activeTab === 'sessions'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : !step2Status.ready
                ? 'border-transparent text-slate-400 bg-slate-100/40 opacity-70'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title={!step2Status.ready ? 'Cần hoàn thành Bước 1 và Bước 2 trước' : undefined}
          >
            <div className="flex items-center gap-1.5">
              {!step2Status.ready ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : step3Status.ready ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Calendar className="w-4 h-4 text-blue-600" />
              )}
              <span>3. Lịch phân công coi thi (Bốc thăm)</span>
            </div>
            {step3Status.ready && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                Sẵn sàng
              </span>
            )}
          </button>

          {/* Bước 4 */}
          <button
            type="button"
            onClick={() => handleSelectTab('general_announcement')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-lg ${
              activeTab === 'general_announcement'
                ? 'border-amber-600 text-amber-700 bg-white shadow-2xs'
                : !step3Status.ready
                ? 'border-transparent text-slate-400 bg-slate-100/40 opacity-70'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title={!step3Status.ready ? 'Cần bốc thăm phân công ở Bước 3 trước' : undefined}
          >
            <div className="flex items-center gap-1.5">
              {!step3Status.ready ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              )}
              <span>4. Bảng tổng quát (Bảo mật phòng)</span>
            </div>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              Công bố
            </span>
          </button>

          {/* Bước 5 */}
          <button
            type="button"
            onClick={() => handleSelectTab('stats')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-lg ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : !step3Status.ready
                ? 'border-transparent text-slate-400 bg-slate-100/40 opacity-70'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title={!step3Status.ready ? 'Cần bốc thăm phân công ở Bước 3 trước' : undefined}
          >
            <div className="flex items-center gap-1.5">
              {!step3Status.ready ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Scale className="w-4 h-4 text-indigo-600" />
              )}
              <span>5. Bảng Thống kê & Chấm công thanh toán</span>
            </div>
          </button>
        </div>

        {/* TAB 3: LỊCH PHÂN CÔNG COI THI & BỐC THĂM */}
        {activeTab === 'sessions' && (() => {
          if (!planResult || planResult.sessions.length === 0) {
            return (
              <div className="p-12 text-center space-y-4">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Chưa có kết quả bốc thăm phân công coi thi</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Vui lòng đảm bảo đã thiết lập xong <strong>Bước 1 (Kế hoạch & Lịch thi)</strong> và <strong>Bước 2 (Danh sách Hội đồng & Giám thị)</strong>, sau đó bấm nút bốc thăm để hệ thống tự động cân đối và xếp phòng.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('manage_sessions')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Xem Bước 1: Kế hoạch & Lịch thi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('manage_teachers')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Xem Bước 2: Danh sách Giám thị
                  </button>
                  <button
                    type="button"
                    onClick={() => runAssignment()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Bốc thăm phân công ngay</span>
                  </button>
                </div>
              </div>
            );
          }

          const isDualCurrent = mode === 'survey_mock' && (planResult?.invigilatorsPerRoom ?? invigilatorsPerRoom) === 2;
          return (
            <div className="p-5 space-y-4">
              
              {/* TÓM TẮT KIỂM TRA QUY CHẾ & ĐÁNH GIÁ ĐỘ AN TOÀN */}
              {planResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {isDualCurrent ? 'Trùng lặp Cặp Giám thị' : 'Định mức bố trí'}
                      </p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        {isDualCurrent ? (
                          <>
                            {planResult.validation.duplicatePairsCount} <span className="text-xs font-normal text-slate-500">lặp</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-blue-700">1 Giám thị / phòng</span>
                        )}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      !isDualCurrent || planResult.validation.duplicatePairsCount === 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trùng Phòng coi thi</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        {planResult.validation.duplicateRoomsCount} <span className="text-xs font-normal text-slate-500">lặp</span>
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planResult.validation.duplicateRoomsCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      <Building className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {isDualCurrent ? 'Giám thị Khác Đơn vị' : 'Đơn vị / Tổ chuyên môn'}
                      </p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        {isDualCurrent
                          ? (planResult.validation.sameUnitPairsCount === 0 ? '100% Khác' : `${planResult.validation.sameUnitPairsCount} cùng`)
                          : 'Linh hoạt'}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!isDualCurrent || planResult.validation.sameUnitPairsCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Độ lệch Số ca</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        ≤ {planResult.validation.maxDutyDiff} <span className="text-xs font-normal text-slate-500">ca (Cân đối)</span>
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planResult.validation.maxDutyDiff <= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Scale className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* Thanh chọn Buổi thi + Nút Bốc thăm lại ngẫu nhiên */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 mr-1">Chọn Buổi thi:</span>
                  {planResult?.sessions.map((s, idx) => (
                    <button
                      key={s.sessionId}
                      type="button"
                      onClick={() => setSelectedSessionId(s.sessionId)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        selectedSessionId === s.sessionId
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        selectedSessionId === s.sessionId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{s.sessionName}</span>
                      <span className={selectedSessionId === s.sessionId ? 'text-blue-100' : 'text-slate-500 font-normal'}>
                        ({cleanSubjectName(s.subjectName)})
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tùy chọn 1 hay 2 giám thị trong kỳ thi thử/khảo sát */}
                  {mode === 'survey_mock' && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => handleChangeInvigilatorsPerRoom(1)}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          invigilatorsPerRoom === 1
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                        title="Phương án tiết kiệm kinh phí: chỉ bố trí 1 Giám thị / phòng"
                      >
                        1 Giám thị / phòng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeInvigilatorsPerRoom(2)}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          invigilatorsPerRoom === 2
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                        title="Đầy đủ 2 Giám thị: Giám thị 1 và Giám thị 2 theo chuẩn quy chế"
                      >
                        2 Giám thị / phòng
                      </button>
                    </div>
                  )}

                  {/* Tùy chọn: Tránh trùng môn chuyên môn (Mặc định tắt để coi tất cả giám thị như nhau, chia đều ca tuyệt đối) */}
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={avoidTeachingSubject}
                      onChange={(e) => handleToggleAvoidTeaching(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span>Tránh trùng môn dạy</span>
                    <span className="text-[10px] text-slate-500 hidden md:inline">
                      ({avoidTeachingSubject ? 'Bật' : 'Mặc định: Tất cả GV như nhau'})
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => runAssignment()}
                    disabled={isDrawing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs text-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Chạy thuật toán bốc thăm ngẫu nhiên phân công giám thị theo đúng quy chế"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDrawing ? 'animate-spin' : ''}`} />
                    <span>{isDrawing ? 'Đang bốc thăm...' : 'Bốc thăm lại ngẫu nhiên'}</span>
                  </button>
                </div>
              </div>

              {currentSessionData && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {currentSessionData.sessionName} — Môn: <span className="text-blue-700">{cleanSubjectName(currentSessionData.subjectName)}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thời gian: {currentSessionData.shiftTime} • Ngày thi: {currentSessionData.date} • Tổng số phòng: {currentSessionData.roomAssignments.length} phòng
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-medium text-slate-600">Đã xếp:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {isDualCurrent
                          ? `${currentSessionData.roomAssignments.length * 2} Giám thị (2 người/phòng)`
                          : `${currentSessionData.roomAssignments.length} Giám thị (1 người/phòng)`}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                        Hỗ trợ đổi người thủ công mềm từng phòng
                      </span>
                    </div>
                  </div>

                  {/* Khối Cán bộ Giám sát & Giám thị dự phòng */}
                  {currentSessionData.supervisors && currentSessionData.supervisors.length > 0 && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          Cán bộ Giám sát hành lang ({currentSessionData.supervisors.length} cán bộ):
                        </span>
                        <span className="text-[11px] text-purple-700 italic">Ưu tiên bố trí theo chuyên môn giảng dạy môn thi</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentSessionData.supervisors.map((sup) => (
                          <div key={sup.id} className="bg-white border border-purple-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs flex items-center gap-1.5">
                            <span className="font-mono font-bold text-purple-700 text-[11px]">{sup.code}</span>
                            <span className="font-semibold text-slate-800">{sup.fullName}</span>
                            <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 font-medium">Môn: {sup.subject}</span>
                            <span className="text-[10px] text-slate-500">({sup.schoolOrDept})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentSessionData.reserveInvigilators && currentSessionData.reserveInvigilators.length > 0 && (
                    <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-sky-900 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-sky-600" />
                          Cán bộ Giám thị dự phòng tại Hội đồng ({currentSessionData.reserveInvigilators.length} cán bộ):
                        </span>
                        <span className="text-[11px] text-sky-700 italic">Sẵn sàng thay thế & hỗ trợ giải thích/xử lý đề thi</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentSessionData.reserveInvigilators.map((res) => (
                          <div key={res.id} className="bg-white border border-sky-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sky-700 text-[11px]">{res.code}</span>
                            <span className="font-semibold text-slate-800">{res.fullName}</span>
                            <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 font-medium">Môn: {res.subject}</span>
                            <span className="text-[10px] text-slate-500">({res.schoolOrDept})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bảng phân công chi tiết */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 w-24 text-center">Phòng thi</th>
                          <th className="py-2.5 px-4">{isDualCurrent ? 'Giám thị 1' : 'Giám thị coi thi'}</th>
                          <th className="py-2.5 px-3">Đơn vị / Tổ</th>
                          {isDualCurrent ? (
                            <>
                              <th className="py-2.5 px-4">Giám thị 2</th>
                              <th className="py-2.5 px-3">Đơn vị / Tổ</th>
                              <th className="py-2.5 px-3 text-center">Kiểm tra đơn vị</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2.5 px-3">Môn dạy</th>
                              <th className="py-2.5 px-3 text-center">Số điện thoại</th>
                              <th className="py-2.5 px-3 text-center">Trạng thái</th>
                            </>
                          )}
                          <th className="py-2.5 px-3 text-center w-28">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentSessionData.roomAssignments.map((room, rIdx) => {
                          const isDiffUnit = room.invigilator1?.schoolOrDept !== room.invigilator2?.schoolOrDept;
                          return (
                            <tr key={room.roomNo} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-center font-medium text-slate-500">{rIdx + 1}</td>
                              <td className="py-2 px-3 text-center font-bold text-blue-700 bg-blue-50/40">
                                {room.roomLabel}
                              </td>
                              
                              {/* Giám thị 1 */}
                              <td className="py-2 px-4 font-semibold text-slate-900">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded shrink-0">
                                      {room.invigilator1?.code}
                                    </span>
                                    <span className="truncate">{room.invigilator1?.fullName}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setAdjustingRoom({
                                      sessionId: currentSessionData.sessionId,
                                      sessionName: currentSessionData.sessionName,
                                      subjectName: currentSessionData.subjectName,
                                      date: currentSessionData.date,
                                      shiftTime: currentSessionData.shiftTime,
                                      roomNo: room.roomNo,
                                      roomLabel: room.roomLabel,
                                      slot: 'invigilator1',
                                      currentInvigilator: room.invigilator1,
                                      partnerInvigilator: isDualCurrent ? room.invigilator2 : undefined
                                    })}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer shrink-0"
                                    title={isDualCurrent ? "Đổi hoặc hoán đổi Giám thị 1" : "Đổi hoặc hoán đổi Giám thị"}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {room.invigilator1?.schoolOrDept}
                              </td>

                              {/* Giám thị 2 hoặc Môn dạy */}
                              {isDualCurrent ? (
                                <>
                                  <td className="py-2 px-4 font-semibold text-slate-900">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded shrink-0">
                                          {room.invigilator2?.code}
                                        </span>
                                        <span className="truncate">{room.invigilator2?.fullName}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setAdjustingRoom({
                                          sessionId: currentSessionData.sessionId,
                                          sessionName: currentSessionData.sessionName,
                                          subjectName: currentSessionData.subjectName,
                                          date: currentSessionData.date,
                                          shiftTime: currentSessionData.shiftTime,
                                          roomNo: room.roomNo,
                                          roomLabel: room.roomLabel,
                                          slot: 'invigilator2',
                                          currentInvigilator: room.invigilator2,
                                          partnerInvigilator: room.invigilator1
                                        })}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer shrink-0"
                                        title="Đổi hoặc hoán đổi Giám thị 2"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">
                                    {room.invigilator2?.schoolOrDept}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {isDiffUnit ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                        <Check className="w-3 h-3" /> Khác trường
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                        Cùng trường
                                      </span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 px-3 font-medium text-slate-700">
                                    {room.invigilator1?.subject}
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                                    {room.invigilator1?.phone || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                      <Check className="w-3 h-3" /> Hợp lệ
                                    </span>
                                  </td>
                                </>
                              )}

                              {/* Cột Thao tác đổi người mềm */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setAdjustingRoom({
                                    sessionId: currentSessionData.sessionId,
                                    sessionName: currentSessionData.sessionName,
                                    subjectName: currentSessionData.subjectName,
                                    date: currentSessionData.date,
                                    shiftTime: currentSessionData.shiftTime,
                                    roomNo: room.roomNo,
                                    roomLabel: room.roomLabel,
                                    slot: 'invigilator1',
                                    currentInvigilator: room.invigilator1,
                                    partnerInvigilator: isDualCurrent ? room.invigilator2 : undefined
                                  })}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer whitespace-nowrap"
                                  title="Thay đổi hoặc hoán đổi giám thị cho phòng này"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Đổi GV</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Thanh chuyển bước quy trình */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50/50 p-3 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSelectTab('manage_teachers')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Quay lại Bước 2: Danh sách Cán bộ</span>
                </button>
                <div className="text-xs text-slate-600">
                  {step3Status.ready ? (
                    <span className="font-bold text-emerald-700">✓ Đã bốc thăm phân công {sessions.length} buổi thi.</span>
                  ) : (
                    <span className="font-bold text-amber-700">⚠️ {step3Status.message}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectTab('general_announcement')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>Chuyển sang Bước 4: Bảng tổng quát (Bảo mật phòng)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: BẢNG PHÂN CÔNG TỔNG QUÁT THEO BUỔI (BẢO MẬT SỐ PHÒNG THI) */}
        {activeTab === 'general_announcement' && (!generalData ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <ShieldCheck className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Chưa có dữ liệu Bảng tổng quát bảo mật phòng</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Bảng phân công tổng quát yêu cầu hoàn tất <strong>Bước 3 (Bốc thăm phân công coi thi)</strong> trước để tổng hợp lịch trực theo buổi cho từng cán bộ.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSelectTab('sessions')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 mx-auto shadow-xs cursor-pointer"
              >
                <span>Chuyển sang Bước 3 để Bốc thăm phân công</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Header thông tin & Điều hướng */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gradient-to-r from-amber-50 via-slate-50 to-amber-50/30 p-4 rounded-xl border border-amber-200">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[11px] uppercase tracking-wider">
                    Bảo mật phòng thi
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Đồng bộ 2 chiều với Lịch phòng & Chấm công
                  </span>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    Bảng Phân Công Nhiệm Vụ Tổng Quát Theo Buổi (Công Bố Trước)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  <strong>Nguyên tắc bảo mật:</strong> Chỉ công bố các buổi thi có nhiệm vụ (ký hiệu <strong>&quot;x&quot;</strong>) và <strong>Tổng cộng số buổi</strong> để cán bộ chủ động sắp xếp thời gian. Tuyệt đối <strong>không hiển thị số phòng thi cụ thể</strong> trước ngày thi nhằm phòng tránh lộ phòng, đảm bảo tính khách quan và nghiêm túc. Giám thị chỉ nhận phân công phòng chính xác vào đầu mỗi buổi sau khi bốc thăm tại phòng Hội đồng.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetDutiesToDefault}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg shadow-2xs text-xs transition-colors cursor-pointer"
                  title="Khôi phục phân công ca trực chuẩn chia đều (2 lãnh đạo thì 1 người 2 buổi, 1 người 1 buổi...)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Chia đều chuẩn Lãnh đạo</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportGeneralExcel}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Tải file Excel Bảng tổng quát bảo mật phòng theo đúng chuẩn biểu mẫu"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExporting ? 'Đang tạo Excel...' : 'Xuất File Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-xs text-xs transition-colors cursor-pointer"
                  title="Mở giao diện in ấn khổ ngang A4"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Biểu Mẫu A4</span>
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm, lọc & Chú giải màu sắc */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm tên cán bộ, mã GV, môn..."
                    value={generalSearch}
                    onChange={(e) => setGeneralSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 w-52 sm:w-64"
                  />
                </div>

                <select
                  value={generalDutyFilter}
                  onChange={(e) => setGeneralDutyFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden font-medium"
                >
                  <option value="all">Tất cả cán bộ ({generalData.rows.length})</option>
                  <option value="leadership">Ban Lãnh đạo & Thư ký ({generalData.rows.filter(r => r.groupType === 'leadership').length})</option>
                  <option value="supervisor">Cán bộ Giám sát ({generalData.rows.filter(r => r.groupType === 'supervisor').length})</option>
                  <option value="support">Khảo thí & Hỗ trợ phục vụ ({generalData.rows.filter(r => r.groupType === 'support').length})</option>
                  <option value="invigilator">Cán bộ Giám thị coi thi ({generalData.rows.filter(r => r.groupType === 'invigilator').length})</option>
                  <option value="active_only">Chỉ hiện người có ca ({generalData.rows.filter(r => r.totalDuties > 0).length})</option>
                </select>

                {generalSearch && (
                  <button
                    type="button"
                    onClick={() => setGeneralSearch('')}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Xóa tìm
                  </button>
                )}
              </div>

              {/* Chú giải quy ước màu sắc chuẩn */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-bold text-slate-600">Quy ước màu:</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#fff9c4] text-amber-900 border border-amber-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Lãnh đạo & Thư ký
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#ede7f6] text-indigo-900 border border-indigo-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Giám sát hành lang
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#e0f2fe] text-sky-900 border border-sky-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  Khảo thí & Phục vụ
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Giám thị coi thi
                </span>
              </div>
            </div>

            {/* Bảng tổng quát theo mẫu công bố */}
            <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                {/* Header Navy Blue (#002060) */}
                <thead className="bg-[#002060] text-white">
                  <tr>
                    <th className="py-2.5 px-2 w-12 text-center border-r border-blue-900 text-[11px] font-bold">STT</th>
                    <th className="py-2.5 px-2 w-16 text-center border-r border-blue-900 text-[11px] font-bold">Mã GV</th>
                    <th className="py-2.5 px-3 min-w-44 border-r border-blue-900 text-[11px] font-bold">Họ và tên</th>
                    <th className="py-2.5 px-3 min-w-32 border-r border-blue-900 text-[11px] font-bold">Đơn vị / Tổ CM</th>
                    <th className="py-2.5 px-2 min-w-24 text-center border-r border-blue-900 text-[11px] font-bold">Môn dạy</th>
                    <th className="py-2.5 px-3 min-w-32 border-r border-blue-900 text-[11px] font-bold">Nhiệm vụ HĐ thi</th>
                    
                    {/* Cột các buổi thi (Sáng/Chiều, Ngày) */}
                    {generalData.shifts.map((shift) => (
                      <th key={shift.shiftKey} className="py-2.5 px-2 min-w-24 text-center border-r border-blue-900">
                        <div className="font-bold text-white text-[11px] whitespace-nowrap">Buổi {shift.shiftNumber}</div>
                        <div className="text-[10px] text-amber-200 font-normal whitespace-nowrap">
                          {shift.period} ({shift.dateStr})
                        </div>
                      </th>
                    ))}

                    <th className="py-2.5 px-3 w-24 text-center border-r border-blue-900 bg-blue-950 text-amber-300 font-bold text-[11px] whitespace-nowrap">
                      Tổng số buổi
                    </th>
                    <th className="py-2.5 px-3 min-w-32 text-[11px] font-bold">
                      Ghi chú
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredGeneralRows.map((row, idx) => {
                    const isLeadership = row.groupType === 'leadership';
                    const isSupervisor = row.groupType === 'supervisor';
                    const isSupport = row.groupType === 'support';

                    const rowBgClass = isLeadership
                      ? 'bg-[#fff9c4] hover:bg-[#fff59d] text-slate-900 border-amber-200 font-medium'
                      : isSupervisor
                      ? 'bg-[#ede7f6] hover:bg-[#d1c4e9] text-slate-900 border-indigo-200 font-medium'
                      : isSupport
                      ? 'bg-[#e0f2fe] hover:bg-[#bae6fd] text-sky-950 border-sky-200 font-medium'
                      : 'bg-white hover:bg-slate-50 text-slate-800';

                    return (
                      <tr key={row.id} className={`transition-colors ${rowBgClass}`}>
                        <td className="py-2 px-2 text-center text-slate-500 font-medium border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                          {isSupervisor ? (
                            <span className="font-bold italic text-rose-700">{row.code}</span>
                          ) : isSupport ? (
                            <span className="font-bold text-sky-800">{row.code}</span>
                          ) : (
                            <span className="font-bold text-slate-700">{row.code}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-200 whitespace-nowrap">
                          {row.fullName}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                          {row.schoolOrDept}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700 whitespace-nowrap">
                          {row.subject || '-'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                          {isLeadership && (
                            <span className="font-bold text-purple-900">{row.role}</span>
                          )}
                          {isSupervisor && (
                            <span className="font-bold text-indigo-900">{row.role}</span>
                          )}
                          {isSupport && (
                            <span className="font-bold text-sky-900 bg-sky-100/90 px-2 py-0.5 rounded-md border border-sky-300">{row.role}</span>
                          )}
                          {!isLeadership && !isSupervisor && !isSupport && (
                            <span className="text-slate-600">{row.role || 'Giám thị'}</span>
                          )}
                        </td>

                        {/* Các cột Buổi thi - Cho phép click trực tiếp để tick chọn / bỏ chọn nhiệm vụ */}
                        {generalData.shifts.map((shift) => {
                          const hasDuty = !!row.shiftDuties[shift.shiftKey];

                          // Tìm chi tiết phân công cụ thể nếu đã bốc thăm phòng
                          let roomAssignmentDetail = '';
                          if (planResult && hasDuty) {
                            for (const sid of shift.sessionIds) {
                              const sObj = planResult.sessions.find(s => s.sessionId === sid);
                              if (sObj) {
                                const rObj = sObj.roomAssignments.find(r =>
                                  r.invigilator1?.id === row.id || r.invigilator1?.code === row.code ||
                                  r.invigilator2?.id === row.id || r.invigilator2?.code === row.code
                                );
                                if (rObj) {
                                  const slotStr = (rObj.invigilator1?.id === row.id || rObj.invigilator1?.code === row.code) ? 'GT1' : 'GT2';
                                  roomAssignmentDetail = `Đang coi ${rObj.roomLabel} (${slotStr})`;
                                  break;
                                }
                                if (sObj.supervisors?.some(s => s.id === row.id || s.code === row.code)) {
                                  roomAssignmentDetail = 'Cán bộ Giám sát hành lang';
                                  break;
                                }
                                if (sObj.reserveInvigilators?.some(s => s.id === row.id || s.code === row.code)) {
                                  roomAssignmentDetail = 'Giám thị Dự phòng Hội đồng';
                                  break;
                                }
                              }
                            }
                          }

                          const buttonTooltip = roomAssignmentDetail
                            ? `${roomAssignmentDetail} (Buổi ${shift.shiftNumber}: ${shift.subjectSummary})\nBấm để điều chỉnh hoặc bỏ ca này`
                            : `Bấm để ${hasDuty ? 'bỏ trực' : 'chọn trực'} Buổi ${shift.shiftNumber} (${shift.period} - ${shift.dateStr}) cho: ${row.fullName} (${row.role})`;

                          return (
                            <td key={shift.shiftKey} className="py-1 px-1 text-center border-r border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleDutyWithSync(row, shift, hasDuty)}
                                title={buttonTooltip}
                                className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center font-bold text-sm transition-all cursor-pointer select-none ${
                                  hasDuty
                                    ? isLeadership
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs scale-105'
                                      : isSupervisor
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs scale-105'
                                      : isSupport
                                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-2xs scale-105'
                                      : 'bg-slate-800 hover:bg-slate-900 text-white shadow-2xs scale-105'
                                    : 'text-slate-300 hover:bg-slate-200/80 hover:text-slate-700 border border-transparent hover:border-slate-300'
                                }`}
                              >
                                {hasDuty ? 'x' : '-'}
                              </button>
                            </td>
                          );
                        })}

                        {/* Tổng số buổi */}
                        <td className="py-2 px-3 text-center border-r border-slate-200 bg-blue-50/30">
                          <span className={`inline-block font-black text-xs px-2 py-0.5 rounded-md ${
                            row.totalDuties > 0
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-400 bg-slate-100'
                          }`}>
                            {row.totalDuties}
                          </span>
                        </td>

                        {/* Ghi chú */}
                        <td className="py-2 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {row.note || '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredGeneralRows.length === 0 && (
                    <tr>
                      <td colSpan={7 + generalData.shifts.length} className="py-8 text-center text-slate-400 italic">
                        Không tìm thấy cán bộ nào phù hợp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Chân trang tóm tắt số liệu */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
              <div>
                Đang hiển thị <strong>{filteredGeneralRows.length}</strong> / {generalData.rows.length} cán bộ Hội đồng thi.
              </div>
              <div className="flex items-center gap-3 font-medium">
                <span>Tổng lượt ca làm nhiệm vụ: <strong className="text-blue-700">{filteredGeneralRows.reduce((s, r) => s + r.totalDuties, 0)} lượt</strong></span>
                <span>•</span>
                <span>Tổng số buổi thi: <strong className="text-slate-800">{generalData.shifts.length} buổi</strong></span>
              </div>
            </div>

            {/* Thanh chuyển bước quy trình */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50/50 p-3 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectTab('sessions')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Quay lại Bước 3: Lịch phân công</span>
              </button>
              <div className="text-xs text-slate-600">
                <span className="font-bold text-amber-800">✓ Bảng tổng quát bảo mật phòng đã sẵn sàng để công bố.</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('stats')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Chuyển sang Bước 5: Bảng Thống kê & Chấm công</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* TAB 5: THỐNG KÊ & CHẤM CÔNG */}
        {activeTab === 'stats' && (!planResult ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-200">
              <Scale className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Chưa có số liệu Thống kê & Chấm công</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Bảng chấm công và thống kê định mức chỉ có sau khi hoàn tất <strong>Bước 3 (Bốc thăm phân công coi thi)</strong>.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSelectTab('sessions')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 mx-auto shadow-xs cursor-pointer"
              >
                <span>Chuyển sang Bước 3 để Bốc thăm phân công</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Bảng Thống Kê Số Ca Coi Thi & Đánh Giá Định Mức Công Bằng</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phục vụ đối soát định mức, kiểm tra chênh lệch và lập danh sách thanh toán bồi dưỡng coi thi
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-2 w-20 text-center">Mã GV</th>
                    <th className="py-2.5 px-4">Họ và tên</th>
                    <th className="py-2.5 px-3">Đơn vị / Tổ</th>
                    <th className="py-2.5 px-3 text-center">Môn dạy</th>
                    <th className="py-2.5 px-3 text-center">Ca giảm trừ</th>
                    <th className="py-2.5 px-3 text-center bg-blue-50/50">Số ca thực tế</th>
                    <th className="py-2.5 px-4">Chi tiết các phòng coi thi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {planResult.stats.map((st, idx) => (
                    <tr key={st.invigilatorId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700">{st.code}</td>
                      <td className="py-2 px-4 font-semibold text-slate-900">{st.fullName}</td>
                      <td className="py-2 px-3 text-slate-600">{st.schoolOrDept}</td>
                      <td className="py-2 px-3 text-center font-medium text-slate-700">{st.subject}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-600">
                        {st.quotaOffset !== 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {st.quotaOffset > 0 ? `+${st.quotaOffset}` : st.quotaOffset} ca
                          </span>
                        ) : '0 ca'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-sm text-blue-700 bg-blue-50/30">
                        {st.totalAssigned} ca
                      </td>
                      <td className="py-2 px-4 text-[11px] text-slate-600">
                        <div className="flex flex-wrap gap-1.5">
                          {st.sessionDetails.map((sd, sIdx) => {
                            const sPrefix = formatSessionShortLabel(sd.sessionName);
                            const isSupervisor = sd.role === 'Giám sát';
                            const isReserve = sd.role === 'Dự phòng';
                            return (
                              <span key={sIdx} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                                {sPrefix}:{' '}
                                {isSupervisor ? (
                                  <strong className="text-purple-700">Giám sát</strong>
                                ) : isReserve ? (
                                  <strong className="text-amber-700">Dự phòng</strong>
                                ) : (
                                  <strong className="text-blue-700">P{String(sd.roomNo).padStart(2, '0')}</strong>
                                )}
                              </span>
                            );
                          })}
                          {st.sessionDetails.length === 0 && (
                            <span className="text-slate-400 italic">Không coi thi</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thanh chuyển bước quy trình */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50/50 p-3 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectTab('general_announcement')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Quay lại Bước 4: Bảng tổng quát</span>
              </button>
              <div className="text-xs text-slate-600 font-medium">
                ✓ Quy trình hoàn tất 5/5 bước. Bạn có thể in ấn hoặc xuất Excel để phục vụ kỳ thi.
              </div>
            </div>
          </div>
        ))}

        {/* TAB 3: QUẢN LÝ HỘI ĐỒNG & GIÁM THỊ */}
        {activeTab === 'manage_teachers' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm tên, mã, môn, ghi chú..."
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden font-medium"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="Giám thị">Cán bộ coi thi (Giám thị)</option>
                  <option value="Lãnh đạo & Thư ký">Ban Lãnh đạo & Thư ký HĐ</option>
                  <option value="Giám sát">Giám sát hành lang</option>
                  <option value="Khảo thí - Hỗ trợ">Khảo thí - Hỗ trợ</option>
                  <option value="Phục vụ">Y tế & Bảo vệ / Phục vụ</option>
                </select>

                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                >
                  <option value="all">Tất cả Đơn vị / Trường</option>
                  {uniqueUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeacher(null);
                    setShowTeacherModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Cán bộ</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  title="Nhập danh sách Hội đồng coi thi từ file Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nhập từ Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Tải mẫu Excel Hội đồng & Giám thị về máy để điền nhanh"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Tải file Excel mẫu</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSampleData}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                  title="Nạp lại bộ dữ liệu mẫu"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mẫu mặc định</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllInvigilators}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  title="Xóa sạch toàn bộ danh sách cán bộ, lãnh đạo, giám thị, y tế... để nạp lại từ Excel"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa hết ({invigilators.length})</span>
                </button>

                {/* File input ẩn cho import cán bộ */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
              </div>
            </div>

            {/* Bảng danh sách cán bộ */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-2 w-20 text-center">Mã GV</th>
                    <th className="py-2.5 px-4">Họ và tên</th>
                    <th className="py-2.5 px-3 text-center">Nhiệm vụ / Vai trò</th>
                    <th className="py-2.5 px-3">Đơn vị / Trường</th>
                    <th className="py-2.5 px-3 text-center">Môn dạy</th>
                    <th className="py-2.5 px-3 text-center">Ca giảm trừ</th>
                    <th className="py-2.5 px-3">Ghi chú phân công</th>
                    <th className="py-2.5 px-3 text-center">Điện thoại</th>
                    <th className="py-2.5 px-2 text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInvigilators.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700">{inv.code}</td>
                      <td className="py-2 px-4 font-semibold text-slate-900">{inv.fullName}</td>
                      <td className="py-2 px-3 text-center">
                        {renderRoleBadge(inv.role)}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{inv.schoolOrDept}</td>
                      <td className="py-2 px-3 text-center font-medium text-slate-700">{inv.subject}</td>
                      <td className="py-2 px-3 text-center">
                        {inv.quotaOffset <= -50 ? (
                          <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            Miễn coi
                          </span>
                        ) : (
                          <select
                            value={inv.quotaOffset ?? 0}
                            onChange={(e) => handleUpdateQuota(inv.id, Number(e.target.value))}
                            className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 font-medium"
                          >
                            <option value="0">Định mức (0)</option>
                            <option value="-1">-1 ca (Chấm thi)</option>
                            <option value="-2">-2 ca (Chấm Văn)</option>
                            <option value="-99">Miễn coi</option>
                            <option value="1">+1 ca</option>
                          </select>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{inv.note || '-'}</td>
                      <td className="py-2 px-3 text-center text-slate-600 font-mono text-[11px]">{inv.phone || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacher(inv);
                              setShowTeacherModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(inv.id)}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thanh chuyển bước quy trình */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50/50 p-3 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectTab('manage_sessions')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Quay lại Bước 1: Kế hoạch & Lịch thi</span>
              </button>
              <div className="text-xs text-slate-600">
                {step2Status.ready ? (
                  <span className="font-bold text-emerald-700">✓ {step2Status.message}</span>
                ) : (
                  <span className="font-bold text-amber-700">⚠️ {step2Status.message}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('sessions')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Chuyển sang Bước 3: Lịch coi thi (Bốc thăm)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: CẤU HÌNH CÁC BUỔI THI (LINH ĐỘNG) */}
        {activeTab === 'manage_sessions' && (
          <div className="p-5 space-y-4">
            {/* THÔNG TIN CHÍNH THỨC CỦA KỲ THI & NĂM HỌC */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 p-4 rounded-xl border border-blue-200 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                  Thông Tin Chính Thức Kỳ Thi & Năm Học (Tự động hiển thị trên File Excel & Bản in A4)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tên chính thức của Kỳ thi
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="VD: KỲ THI KHẢO SÁT CHẤT LƯỢNG KẾT HỢP THI THỬ TỐT NGHIỆP THPT"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 shadow-2xs uppercase"
                  />
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    * Tiêu đề này sẽ xuất hiện trên tất cả các Sheet Excel (Lịch tổng quát, Lịch từng phòng, Danh sách HĐ, Bảng chấm công) và bản in A4.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Năm học
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoCalculateAcademicYear}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                      title="Tính tự động dựa theo chuẩn tháng 7-12 hoặc tháng 1-6"
                    >
                      <span>⚡ Tự tính theo lịch</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="VD: 2026 - 2027"
                      className="w-full px-3 py-2 text-xs font-bold text-blue-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 shadow-2xs text-center"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    * Tự suy luận từ ngày thi ({sessions[0]?.date || 'hiện tại'})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Cấu Hình Lịch & Môn Thi Từng Buổi (Linh Động)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === 'survey_mock' ? (
                    <span>Chế độ <strong>Khảo sát / Thi thử</strong>: Chuẩn 3 Buổi gồm <strong>Buổi 1 (Ngữ văn) - Buổi 2 (Toán) - Buổi 3: Ca 1 Tự chọn 1 & Ca 2 Tự chọn 2</strong> (Giám thị giữ nguyên 1 phòng).</span>
                  ) : (
                    <span>Chế độ <strong>Kiểm tra định kỳ</strong>: Cho phép khai báo <strong>nhiều buổi thi</strong>, mỗi buổi có thể gồm <strong>1, 2 hoặc 3 môn</strong> (VD: <em>Toán + Tiếng Anh</em>, <em>Vật lí + Hóa học + Sinh học</em>).</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSession(null);
                    setSessionSubjectVal('');
                    setShowSessionModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Buổi/Ca thi</span>
                </button>

                <button
                  type="button"
                  onClick={() => sessionFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  title="Nhập Lịch thi & Ca thi tự động từ file Excel (Môn, Ngày, Thời gian, Thời gian nghỉ)"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-600" />
                  <span>Nhập Lịch thi từ Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSessionTemplate}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Tải File Excel Mẫu Kế hoạch & Lịch thi về máy"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Tải file Excel mẫu</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSessionsToDefault}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Khôi phục chuẩn 3 Buổi Thi thử (Văn - Toán - Tự chọn 1&2)"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chuẩn 3 Buổi Thi thử</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadPeriodicSessions}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Nạp mẫu Kiểm tra định kỳ 5 Buổi (mỗi buổi 1-2-3 môn)"
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mẫu Định kỳ 5 Buổi</span>
                </button>

                {/* File input ẩn cho import Lịch thi */}
                <input
                  type="file"
                  ref={sessionFileInputRef}
                  onChange={handleSessionFileUpload}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
              </div>
            </div>

            {/* Bảng danh sách các Buổi/Ca thi */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">STT</th>
                    <th className="py-3 px-3 w-44">Tên Buổi thi</th>
                    <th className="py-3 px-3">Môn thi</th>
                    <th className="py-3 px-2.5 text-center w-24">Ngày thi</th>
                    <th className="py-3 px-3 w-44">Thời gian</th>
                    <th className="py-3 px-2 text-center w-28">Số phòng</th>
                    <th className="py-3 px-2 text-center w-28 bg-purple-50/70 border-x border-purple-200 text-purple-900">
                      Số Giám sát
                    </th>
                    <th className="py-3 px-2 text-center w-28 bg-sky-50/70 border-r border-sky-200 text-sky-900">
                      Số Dự phòng
                    </th>
                    <th className="py-3 px-2 text-center w-28">Phòng đầu</th>
                    <th className="py-3 px-1.5 text-center w-20">Thứ tự</th>
                    <th className="py-3 px-2 text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions.map((ses, idx) => (
                    <tr key={ses.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {ses.sessionName}
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700">
                        {cleanSubjectName(ses.subjectName)}
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-600 font-medium whitespace-nowrap">
                        {ses.date}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ses.shiftTime}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="80"
                            value={ses.numRooms}
                            onChange={(e) => handleUpdateSessionRooms(ses.id, Number(e.target.value))}
                            className="w-14 px-1.5 py-1 text-center font-bold text-blue-700 bg-white border border-slate-300 rounded focus:outline-hidden"
                          />
                          <span className="text-slate-500 font-medium text-[10px]">phòng</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center bg-purple-50/40 border-x border-purple-100">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={ses.numSupervisors ?? Math.max(1, Math.ceil(ses.numRooms / 4))}
                            onChange={(e) => handleUpdateSessionSupervisors(ses.id, Number(e.target.value))}
                            className="w-12 px-1 py-1 text-center font-bold text-purple-700 bg-white border border-purple-300 rounded focus:outline-hidden"
                            title="Số lượng Cán bộ Giám sát buổi này (tự ưu tiên GV bộ môn)"
                          />
                          <span className="text-purple-600 font-medium text-[10px]">người</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center bg-sky-50/40 border-r border-sky-100">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={ses.numReserves ?? 2}
                            onChange={(e) => handleUpdateSessionReserves(ses.id, Number(e.target.value))}
                            className="w-12 px-1 py-1 text-center font-bold text-sky-700 bg-white border border-sky-300 rounded focus:outline-hidden"
                            title="Số lượng Giám thị Dự phòng buổi này (tự ưu tiên GV bộ môn để giải quyết đề thi)"
                          />
                          <span className="text-sky-600 font-medium text-[10px]">người</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-slate-400 font-medium text-[10px]">P.</span>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={ses.startRoomNumber ?? 1}
                            onChange={(e) => handleUpdateSessionStartRoom(ses.id, Number(e.target.value))}
                            className="w-12 px-1 py-1 text-center font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded focus:outline-hidden"
                            title="Phòng bắt đầu (Mặc định: 1; nhập 30 nếu phân công cho Điểm trường/Phân hiệu)"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-1.5 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSession(idx, 'up')}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sessions.length - 1}
                            onClick={() => handleMoveSession(idx, 'down')}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSession(ses);
                              setSessionSubjectVal(ses.subjectName);
                              setShowSessionModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                            title="Chỉnh sửa buổi thi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(ses.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                            title="Xóa buổi thi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thanh chuyển bước quy trình */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50/50 p-3 rounded-xl">
              <div className="text-xs text-slate-600">
                <span>Trạng thái: </span>
                {step1Status.ready ? (
                  <span className="font-bold text-emerald-700">✓ Đã cấu hình {sessions.length} buổi thi hợp lệ.</span>
                ) : (
                  <span className="font-bold text-amber-700">⚠️ {step1Status.message}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('manage_teachers')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Chuyển sang Bước 2: Danh sách Hội đồng & Giám thị</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM / SỬA BUỔI THI (LINH ĐỘNG) */}
      {/* ========================================================================= */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSession ? 'Sửa thông tin Buổi/Ca thi' : 'Thêm Buổi/Ca thi mới'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSessionModal(false);
                  setEditingSession(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Buổi thi / Ca thi</label>
                <input
                  name="sessionName"
                  defaultValue={editingSession?.sessionName || `Buổi ${sessions.length + 1}`}
                  placeholder="VD: Buổi 1 (Sáng Ngày 1), Buổi 3 - Ca 1..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 font-bold"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Môn thi (1, 2 hoặc 3 môn/buổi)</label>
                  {sessionSubjectVal && (
                    <button
                      type="button"
                      onClick={() => setSessionSubjectVal('')}
                      className="text-[10px] text-rose-600 hover:underline font-semibold"
                    >
                      Xóa nhập lại
                    </button>
                  )}
                </div>
                <input
                  name="subjectName"
                  value={sessionSubjectVal}
                  onChange={(e) => setSessionSubjectVal(e.target.value)}
                  placeholder="VD: Toán, Ngữ văn, Toán + Tiếng Anh, Vật lí + Hóa học + Sinh học..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 font-semibold text-blue-700 text-xs"
                  required
                />
                
                {/* Gợi ý chọn nhanh môn */}
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="text-[11px] font-bold text-slate-600">
                    Bấm để thêm nhanh môn vào Buổi thi:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Ngữ văn', 'Toán', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'GDCD', 'Tin học', 'Công nghệ', 'Tự chọn 1', 'Tự chọn 2'].map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          if (!sessionSubjectVal.trim()) {
                            setSessionSubjectVal(sub);
                          } else if (!sessionSubjectVal.includes(sub)) {
                            setSessionSubjectVal(`${sessionSubjectVal} + ${sub}`);
                          }
                        }}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      >
                        + {sub}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Mẫu định kỳ 2-3 môn:</span>
                    {[
                      'Ngữ văn + GDCD',
                      'Toán + Tiếng Anh',
                      'Vật lí + Hóa học + Sinh học',
                      'Lịch sử + Địa lí',
                      'Tin học + Công nghệ'
                    ].map(combo => (
                      <button
                        key={combo}
                        type="button"
                        onClick={() => setSessionSubjectVal(combo)}
                        className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold border border-indigo-200 cursor-pointer"
                      >
                        {combo}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    * Quy chế: Giáo viên dạy <strong>bất kỳ môn nào</strong> có trong buổi thi này sẽ được tự động miễn coi thi buổi đó để tránh vi phạm quy chế.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày thi</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={editingSession?.date || '2025-06-26'}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số phòng</label>
                  <input
                    name="numRooms"
                    type="number"
                    min="1"
                    max="80"
                    defaultValue={editingSession?.numRooms || 24}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-bold text-blue-700 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Giám sát</label>
                  <input
                    name="numSupervisors"
                    type="number"
                    min="0"
                    max="40"
                    defaultValue={editingSession?.numSupervisors ?? Math.ceil((editingSession?.numRooms || 24) / 4)}
                    className="w-full px-2.5 py-2 border border-purple-200 bg-purple-50/40 rounded-lg focus:outline-hidden font-bold text-purple-700 text-xs"
                    title="Số lượng cán bộ giám sát hành lang trong buổi thi"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Dự phòng</label>
                  <input
                    name="numReserves"
                    type="number"
                    min="0"
                    max="20"
                    defaultValue={editingSession?.numReserves ?? 2}
                    className="w-full px-2.5 py-2 border border-sky-200 bg-sky-50/40 rounded-lg focus:outline-hidden font-bold text-sky-700 text-xs"
                    title="Số lượng giám thị dự phòng tại Hội đồng thi"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phòng bắt đầu</label>
                <input
                  name="startRoomNumber"
                  type="number"
                  min="1"
                  max="999"
                  defaultValue={editingSession?.startRoomNumber ?? 1}
                  className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/40 rounded-lg focus:outline-hidden font-bold text-indigo-700 text-xs"
                  title="Mặc định: 1. Có thể nhập 30 nếu phân công cho Điểm thi phụ/Phân hiệu"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Thời gian làm bài</label>
                <input
                  name="shiftTime"
                  defaultValue={editingSession?.shiftTime || '07h30 - 09h00 (90 phút)'}
                  placeholder="VD: 07h30 - 09h00 (90 phút), 14h00 - 16h00 (120 phút)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionModal(false);
                    setEditingSession(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu Buổi thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM / SỬA THÔNG TIN CÁN BỘ & GIÁM THỊ */}
      {/* ========================================================================= */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-800">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingTeacher ? 'Sửa thông tin Cán bộ / Giám thị' : 'Thêm Cán bộ vào Hội đồng'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTeacherModal(false);
                  setEditingTeacher(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã cán bộ / GV</label>
                  <input
                    name="code"
                    defaultValue={editingTeacher?.code || `GV${String(invigilators.length + 1).padStart(2, '0')}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Họ và tên</label>
                  <input
                    name="fullName"
                    defaultValue={editingTeacher?.fullName || ''}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Chọn vai trò trong Hội đồng */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhiệm vụ / Vai trò trong Hội đồng</label>
                <select
                  name="role"
                  defaultValue={editingTeacher?.role || 'Giám thị'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-bold text-blue-800 bg-blue-50/40"
                >
                  <option value="Giám thị">Cán bộ coi thi trực tiếp tại phòng (Giám thị)</option>
                  <option value="Chủ tịch">Chủ tịch Hội đồng / Trưởng điểm (Miễn coi)</option>
                  <option value="Phó Chủ tịch">Phó Chủ tịch HĐ / Phó Trưởng điểm (Miễn coi)</option>
                  <option value="Thư ký">Thư ký Hội đồng thi (Miễn coi)</option>
                  <option value="Giám sát">Giám sát hành lang các dãy phòng</option>
                  <option value="Khảo thí - Hỗ trợ">Khảo thí - Hỗ trợ kỹ thuật & đề thi (Miễn coi)</option>
                  <option value="Y tế">Cán bộ Y tế trực sơ cấp cứu</option>
                  <option value="Bảo vệ">Bảo vệ an ninh trật tự vòng ngoài</option>
                  <option value="Phục vụ">Bộ phận Phục vụ / Lao công</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đơn vị / Trường / Tổ CM</label>
                  <input
                    name="schoolOrDept"
                    defaultValue={editingTeacher?.schoolOrDept || 'THPT Nguyễn Huệ'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Môn giảng dạy</label>
                  <input
                    name="subject"
                    defaultValue={editingTeacher?.subject || 'Toán'}
                    placeholder="VD: Toán, Ngữ văn, Vật lí..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ca giảm trừ / Định mức</label>
                  <select
                    name="quotaOffset"
                    defaultValue={editingTeacher?.quotaOffset ?? 0}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="0">Định mức chuẩn (0 ca)</option>
                    <option value="-1">-1 ca (Chấm thi)</option>
                    <option value="-2">-2 ca (Chấm bài tự luận)</option>
                    <option value="-99">Miễn coi thi tại phòng</option>
                    <option value="1">+1 ca</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    name="phone"
                    defaultValue={editingTeacher?.phone || ''}
                    placeholder="0912..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú cụ thể</label>
                <input
                  name="note"
                  defaultValue={editingTeacher?.note || ''}
                  placeholder="VD: Hiệu trưởng điều hành chung, Chấm tự luận Văn..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTeacherModal(false);
                    setEditingTeacher(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu Cán bộ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ĐIỀU CHỈNH THỦ CÔNG MỀM TỪNG PHÒNG THI */}
      {/* ========================================================================= */}
      {adjustingRoom && planResult && (
        <AdjustInvigilatorModal
          isOpen={Boolean(adjustingRoom)}
          onClose={() => setAdjustingRoom(null)}
          target={adjustingRoom}
          planResult={planResult}
          invigilators={invigilators}
          avoidTeachingSubject={avoidTeachingSubject}
          onUpdatePlan={(updatedPlan, msg) => {
            setPlanResult(updatedPlan);
            showToast(msg);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL IN ẤN A4 TRỰC TIẾP */}
      {/* ========================================================================= */}
      {showPrintModal && planResult && (
        <PrintInvigilatorPlanModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          plan={planResult}
          sessions={sessions}
          invigilators={invigilators}
          schoolName={schoolName}
          examName={examName}
          academicYear={academicYear}
          customDutyOverrides={customDutyOverrides}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL XÁC NHẬN AN TOÀN (THAY THẾ WINDOW.CONFIRM / HOẠT ĐỘNG HOÀN HẢO TRONG IFRAME) */}
      {/* ========================================================================= */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm()}
                className={`px-4 py-2 rounded-lg font-bold text-white shadow-xs transition-colors cursor-pointer ${
                  confirmModal.isDanger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CẢNH BÁO QUY CHẾ & XÁC NHẬN ĐIỀU CHỈNH THỦ CÔNG TAB 4 */}
      {/* ========================================================================= */}
      {pendingDutyChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className={`p-4 sm:p-5 flex items-center justify-between text-white ${
              pendingDutyChange.warnings.some(w => w.type === 'danger')
                ? 'bg-gradient-to-r from-rose-600 to-red-700'
                : 'bg-gradient-to-r from-amber-600 to-orange-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    Cảnh Báo Quy Chế & Xác Nhận Điều Chỉnh
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Hệ thống phát hiện lưu ý khi thay đổi lịch trực ở Bảng tổng quát
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingDutyChange(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-lg font-bold leading-none px-2"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Thẻ thông tin cán bộ & buổi thi */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                      {pendingDutyChange.row.code}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {pendingDutyChange.row.fullName}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                    {pendingDutyChange.row.role || 'Giám thị'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-0.5">
                  <div>
                    <span className="text-slate-400">Đơn vị:</span> <strong className="text-slate-700">{pendingDutyChange.row.schoolOrDept}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Môn dạy:</span> <strong className="text-slate-700">{pendingDutyChange.row.subject || 'Không'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Buổi điều chỉnh:</span> <strong className="text-blue-700">Buổi {pendingDutyChange.shift.shiftNumber} ({pendingDutyChange.shift.period} - {pendingDutyChange.shift.dateStr})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Môn thi của buổi:</span> <strong className="text-purple-700">{pendingDutyChange.shift.subjectSummary}</strong>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Thao tác người dùng thực hiện:</span>
                  {pendingDutyChange.targetVal ? (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                      <span>+ Bật nhiệm vụ (Phân công thêm 1 ca)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1">
                      <span>- Bỏ nhiệm vụ (Rút khỏi buổi thi)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Danh sách các cảnh báo vi phạm cụ thể */}
              <div className="space-y-2.5">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                  Chi tiết cảnh báo từ hệ thống:
                </div>
                {pendingDutyChange.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      w.type === 'danger'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : w.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                      w.type === 'danger' ? 'text-rose-600' : w.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs">{w.title}</p>
                      <p className="text-[11px] leading-relaxed opacity-90">{w.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tác động tự động đồng bộ */}
              <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-300/80 text-[11px] text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>⚡ Tác động tự động khi bạn xác nhận Đồng Ý:</span>
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  <li>Tự động cập nhật vào danh sách ca trực tại <strong>Bước 3 (Lịch phân công)</strong> và <strong>Bước 5 (Bảng chấm công)</strong>.</li>
                  <li>Nếu là Lãnh đạo hoặc Thư ký, hệ thống tự động cập nhật lại thông tin <strong>chữ ký trực ca</strong> trên các biên bản in A4 và xuất Excel.</li>
                  <li>Nếu rút cán bộ khỏi phòng thi, hệ thống sẽ ưu tiên đôn Giám thị dự phòng thay thế để đảm bảo không bị trống phòng thi.</li>
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setPendingDutyChange(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ (Thoát)
              </button>
              <button
                type="button"
                onClick={() => {
                  applyDutyChangeAndSync(
                    pendingDutyChange.row,
                    pendingDutyChange.shift,
                    pendingDutyChange.targetVal
                  );
                  setPendingDutyChange(null);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-white shadow-xs transition-colors cursor-pointer ${
                  pendingDutyChange.warnings.some(w => w.type === 'danger')
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Đồng ý & Vẫn áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BÁO CÁO RÀ SOÁT KỸ LƯỠNG KHI NHẬP FILE EXCEL HỘI ĐỒNG THI */}
      {/* ========================================================================= */}
      {importResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    Rà Soát Dữ Liệu Hội Đồng Thi Hoàn Tất!
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    File: <span className="font-semibold text-white underline">{importResultModal.fileName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportResultModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-lg font-bold leading-none px-2.5 py-1"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Thống kê nhanh */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-slate-500 font-medium">Tổng cán bộ</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{importResultModal.totalImported}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-blue-700 font-medium">Giám thị coi</p>
                  <p className="text-xl font-black text-blue-800 mt-0.5">
                    {importResultModal.rolesSummary['Giám thị'] || 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-amber-700 font-medium">Miễn coi thi</p>
                  <p className="text-xl font-black text-amber-800 mt-0.5">{importResultModal.exemptCount}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                  <p className="text-purple-700 font-medium">Được giảm ca</p>
                  <p className="text-xl font-black text-purple-800 mt-0.5">{importResultModal.reductionCount}</p>
                </div>
              </div>

              {/* Cảnh báo nếu có */}
              {importResultModal.warnings.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Lưu ý kiểm tra lại:
                  </div>
                  {importResultModal.warnings.map((w, idx) => (
                    <p key={idx} className="text-rose-700 pl-5">{w}</p>
                  ))}
                </div>
              )}

              {/* Chi tiết phân bổ chức danh Hội đồng */}
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Cơ cấu Hội đồng coi thi theo chức vụ:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(importResultModal.rolesSummary).map(([rName, count]) => (
                    <span
                      key={rName}
                      className={`px-2.5 py-1 rounded-lg font-medium border ${
                        rName === 'Giám thị'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                          : rName.includes('Chủ tịch')
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {rName}: <strong className="ml-1">{count}</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Chi tiết các giáo viên được giảm trừ ca (VD: chấm bài tự luận) */}
              {importResultModal.reducedInvs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-purple-600" />
                    Danh sách giáo viên được giảm ca coi (chấm bài tự luận/nhiệm vụ khác):
                  </p>
                  <div className="border border-purple-200 rounded-xl overflow-hidden divide-y divide-purple-100 bg-purple-50/40 max-h-36 overflow-y-auto">
                    {importResultModal.reducedInvs.map((item, idx) => (
                      <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-slate-700">
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <div className="flex items-center gap-2">
                          {item.note && <span className="text-[11px] text-slate-500 italic">({item.note})</span>}
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-bold text-[11px]">
                            {item.offset} ca
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông báo phân công tự động */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Hệ thống đã tự động chạy thuật toán phân công ngẫu nhiên cân bằng định mức cho toàn bộ giáo viên và kiểm tra triệt để môn thi trùng lặp.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setImportResultModal(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Xác nhận & Xem Bảng Phân Công
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
