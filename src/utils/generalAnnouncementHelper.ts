import { InvigilatorPlanResult, ExamSession, Invigilator } from '../types/invigilator';

export interface GeneralShiftColumn {
  shiftKey: string;           // 'shift_1', 'shift_2'...
  shiftNumber: number;        // 1, 2, 3...
  title: string;              // "Buổi 1 - Sáng\n(03/10/2026)"
  fullHeader: string;         // "Buổi 1 - Sáng (03/10/2026)"
  dateStr: string;            // "03/10/2026"
  period: 'Sáng' | 'Chiều';
  sessionIds: string[];       // các sessionId thuộc buổi thi này
  subjectSummary: string;     // Tên môn thi của buổi
}

export interface GeneralAnnouncementRow {
  stt: number;
  id: string;
  code: string;               // BGH01, TK01, GS01, KT01, GV01...
  fullName: string;
  schoolOrDept: string;       // Đơn vị / Tổ CM
  subject: string;            // Môn giảng dạy
  role: string;               // Nhiệm vụ HĐ thi (Chủ tịch, Phó Chủ tịch, Thư ký, Giám sát, Khảo thí - Hỗ trợ, Giám thị, Y tế, Bảo vệ, Phục vụ)
  groupType: 'leadership' | 'supervisor' | 'support' | 'invigilator';
  shiftDuties: Record<string, boolean>; // shiftKey -> true / false
  totalDuties: number;        // Tổng số buổi làm nhiệm vụ
  note: string;               // Ghi chú phân công
}

export interface GeneralAnnouncementData {
  schoolName: string;
  examName: string;
  academicYear: string;
  shifts: GeneralShiftColumn[];
  rows: GeneralAnnouncementRow[];
  totalLeadership: number;
  totalSupervisors: number;
  totalSupport: number;
  totalInvigilators: number;
}

/**
 * Tự động tính toán Năm học dựa vào thời điểm ngày thi hoặc ngày hiện tại theo chuẩn GD&ĐT:
 * - Tháng 7 đến tháng 12 năm Y: NĂM HỌC Y - (Y + 1)
 * - Tháng 1 đến tháng 6 năm Y: NĂM HỌC (Y - 1) - Y
 */
export function calculateAcademicYear(dateStr?: string): string {
  let d = new Date();
  if (dateStr) {
    const parts = dateStr.trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          d = new Date(y, m - 1, parseInt(parts[2], 10) || 1);
        }
      } else {
        const y = parseInt(parts[2], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          d = new Date(y, m - 1, parseInt(parts[0], 10) || 1);
        }
      }
    }
  }
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 7) {
    return `NĂM HỌC ${year} - ${year + 1}`;
  } else {
    return `NĂM HỌC ${year - 1} - ${year}`;
  }
}

/**
 * Xây dựng danh sách các buổi thi theo quy luật tịnh tiến chuẩn:
 * - Buổi 1: Sáng Ngày 1 (VD: 03/10/2026)
 * - Buổi 2: Chiều Ngày 1 (VD: 03/10/2026)
 * - Buổi 3: Sáng Ngày 2 (VD: 04/10/2026)
 * - Buổi 4: Chiều Ngày 2 (VD: 04/10/2026)
 * - Buổi 5: Sáng Ngày 3 (VD: 05/10/2026)
 * ... cứ thế tịnh tiến 2 buổi (Sáng, Chiều) trên mỗi ngày.
 */
export function buildGeneralAnnouncementData(
  plan: InvigilatorPlanResult,
  sessions: ExamSession[],
  invigilators: Invigilator[],
  schoolName: string = 'TRƯỜNG THPT',
  examName: string = 'KỲ THI KHẢO SÁT / THI THỬ TỐT NGHIỆP THPT',
  academicYear: string = 'NĂM HỌC 2026 - 2027',
  customDutyOverrides?: Record<string, Record<string, boolean>>
): GeneralAnnouncementData {
  // 1. Xác định mốc ngày khởi đầu (Base Date)
  let baseDate = new Date(2026, 9, 3); // Mặc định ngày 03/10/2026 (tháng 10 trong JS là index 9)
  const firstSessDate = sessions[0]?.date || plan.sessions[0]?.date;
  if (firstSessDate) {
    const parts = firstSessDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) baseDate = new Date(y, m, d);
      } else {
        // DD/MM/YYYY
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) baseDate = new Date(y, m, d);
      }
    }
  }

  // Hàm tạo thông tin 1 cột Buổi thi tịnh tiến
  const createShiftCol = (
    shiftNumber: number,
    shiftIndex: number,
    sessionIds: string[],
    subjectSummary: string
  ): GeneralShiftColumn => {
    const dayOffset = Math.floor(shiftIndex / 2);
    const period: 'Sáng' | 'Chiều' = shiftIndex % 2 === 0 ? 'Sáng' : 'Chiều';
    const shiftDate = new Date(baseDate.getTime() + dayOffset * 86400000);
    const dStr = String(shiftDate.getDate()).padStart(2, '0');
    const mStr = String(shiftDate.getMonth() + 1).padStart(2, '0');
    const yStr = shiftDate.getFullYear();
    const dateStr = `${dStr}/${mStr}/${yStr}`;
    const fullHeader = `Buổi ${shiftNumber} - ${period} (${dateStr})`;

    return {
      shiftKey: `shift_${shiftNumber}`,
      shiftNumber,
      title: `Buổi ${shiftNumber} - ${period}\n(${dateStr})`,
      fullHeader,
      dateStr,
      period,
      sessionIds,
      subjectSummary
    };
  };

  const shifts: GeneralShiftColumn[] = [];

  if (plan.mode === 'survey_mock') {
    // Kỳ thi Khảo sát / Thi thử tốt nghiệp THPT chuẩn:
    // Buổi 1: Sáng Ngày 1 (Ngữ văn)
    // Buổi 2: Chiều Ngày 1 (Toán)
    // Buổi 3: Sáng Ngày 2 (Tự chọn 1 & Tự chọn 2)
    const s0 = plan.sessions[0];
    const s1 = plan.sessions[1];
    const s2 = plan.sessions[2];
    const s3 = plan.sessions[3];

    if (s0) shifts.push(createShiftCol(1, 0, [s0.sessionId], s0.subjectName));
    if (s1) shifts.push(createShiftCol(2, 1, [s1.sessionId], s1.subjectName));
    if (s2 || s3) {
      const sids = [s2?.sessionId, s3?.sessionId].filter(Boolean) as string[];
      const subjs = [s2?.subjectName, s3?.subjectName].filter(Boolean).join(' & ');
      shifts.push(createShiftCol(3, 2, sids, subjs || 'Môn Tự chọn'));
    }

    // Nếu người dùng bổ sung thêm buổi thứ 4, 5...
    for (let i = 4; i < plan.sessions.length; i++) {
      const s = plan.sessions[i];
      shifts.push(createShiftCol(shifts.length + 1, shifts.length, [s.sessionId], s.subjectName));
    }
  } else {
    // Kỳ thi Kiểm tra định kỳ: Mỗi buổi thi tương ứng một ca tịnh tiến
    plan.sessions.forEach((s, idx) => {
      shifts.push(createShiftCol(idx + 1, idx, [s.sessionId], s.subjectName));
    });
  }

  // 2. Phân loại nhân sự thành 4 nhóm chuẩn: Lãnh đạo, Giám sát, Khảo thí - Hỗ trợ, Giám thị coi thi
  const leadershipInvs: Invigilator[] = [];
  const supervisorInvs: Invigilator[] = [];
  const supportInvs: Invigilator[] = [];
  const examRoomInvs: Invigilator[] = [];

  invigilators.forEach(inv => {
    const r = (inv.role || '').trim();
    const code = (inv.code || '').toUpperCase();
    const note = (inv.note || '').toLowerCase();

    // Nhận diện Ban Lãnh đạo & Thư ký:
    const isLeadership =
      r === 'Chủ tịch' ||
      r === 'Phó Chủ tịch' ||
      r === 'Thư ký' ||
      code.startsWith('BGH') ||
      code.startsWith('TK') ||
      code.startsWith('HĐ') ||
      note.includes('hiệu trưởng') ||
      note.includes('chủ tịch hội đồng') ||
      (note.includes('thư ký') && !r.includes('giám thị'));

    // Nhận diện Cán bộ Giám sát:
    const isSupervisor =
      !isLeadership &&
      (r === 'Giám sát' ||
        (code.startsWith('GS') && (inv.quotaOffset <= -50 || r !== 'Giám thị')) ||
        (code.startsWith('GS') && note.includes('giám sát')));

    // Nhận diện Khảo thí, Y tế, Bảo vệ, Phục vụ:
    const isSupport =
      !isLeadership &&
      !isSupervisor &&
      (r === 'Khảo thí - Hỗ trợ' ||
        r === 'Y tế' ||
        r === 'Bảo vệ' ||
        r === 'Phục vụ' ||
        code.startsWith('KT') ||
        code.startsWith('YT') ||
        code.startsWith('BV') ||
        code.startsWith('PV') ||
        note.includes('khảo thí') ||
        note.includes('trực đề') ||
        note.includes('kỹ thuật') ||
        note.includes('y tế') ||
        note.includes('bảo vệ') ||
        note.includes('phục vụ'));

    if (isLeadership) {
      leadershipInvs.push(inv);
    } else if (isSupervisor) {
      supervisorInvs.push(inv);
    } else if (isSupport) {
      supportInvs.push(inv);
    } else {
      examRoomInvs.push(inv);
    }
  });

  // Sắp xếp Lãnh đạo: Chủ tịch -> Phó Chủ tịch -> Thư ký
  leadershipInvs.sort((a, b) => {
    const roleRank = (inv: Invigilator) => {
      const r = inv.role;
      const c = (inv.code || '').toUpperCase();
      const n = (inv.note || '').toLowerCase();
      if (r === 'Chủ tịch' || c.startsWith('BGH01') || n.includes('hiệu trưởng')) return 1;
      if (r === 'Phó Chủ tịch' || c.startsWith('BGH02') || c.startsWith('BGH')) return 2;
      if (r === 'Thư ký' || c.startsWith('TK')) return 3;
      return 4;
    };
    const diff = roleRank(a) - roleRank(b);
    if (diff !== 0) return diff;
    return (a.code || '').localeCompare(b.code || '');
  });

  // Tách riêng danh sách Lãnh đạo (Chủ tịch, Phó Chủ tịch) và Thư ký để chia đều ca
  const leaders = leadershipInvs.filter(i => {
    const r = i.role;
    const c = (i.code || '').toUpperCase();
    const n = (i.note || '').toLowerCase();
    return r === 'Chủ tịch' || r === 'Phó Chủ tịch' || c.startsWith('BGH') || n.includes('hiệu trưởng') || n.includes('phó hiệu trưởng');
  });

  const secretaries = leadershipInvs.filter(i => {
    const r = i.role;
    const c = (i.code || '').toUpperCase();
    const n = (i.note || '').toLowerCase();
    return (r === 'Thư ký' || c.startsWith('TK') || n.includes('thư ký')) && !leaders.includes(i);
  });

  const otherLeaders = leadershipInvs.filter(i => !leaders.includes(i) && !secretaries.includes(i));

  // Sắp xếp Giám sát theo mã GS01, GS02...
  supervisorInvs.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  // Sắp xếp Khảo thí & Hỗ trợ phục vụ: Khảo thí -> Y tế -> Bảo vệ -> Phục vụ
  supportInvs.sort((a, b) => {
    const roleRank = (role?: string) => {
      if (role === 'Khảo thí - Hỗ trợ') return 1;
      if (role === 'Y tế') return 2;
      if (role === 'Bảo vệ') return 3;
      if (role === 'Phục vụ') return 4;
      return 5;
    };
    const diff = roleRank(a.role) - roleRank(b.role);
    if (diff !== 0) return diff;
    return (a.code || '').localeCompare(b.code || '');
  });

  // Sắp xếp Giám thị theo mã GV01, GV02...
  examRoomInvs.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  const rows: GeneralAnnouncementRow[] = [];
  let currentStt = 1;

  // -------------------------------------------------------------------------
  // NHÓM 1: BAN LÃNH ĐẠO & THƯ KÝ (NỀN MÀU VÀNG)
  // LOGIC CHIA ĐỀU CHUẨN:
  // - Nếu có 2 Lãnh đạo (Chủ tịch & Phó Chủ tịch) và 3 buổi thi:
  //   Chủ tịch trực 2 buổi (Buổi 1 & Buổi 3), Phó Chủ tịch trực 1 buổi (Buổi 2).
  // - Nếu có 2 Thư ký (TK01 & TK02) và 3 buổi thi:
  //   TK01 trực 2 buổi (Buổi 1 & Buổi 3), TK02 trực 1 buổi (Buổi 2).
  // -------------------------------------------------------------------------
  leadershipInvs.forEach((inv) => {
    const shiftDuties: Record<string, boolean> = {};
    const leaderIdx = leaders.indexOf(inv);
    const secIdx = secretaries.indexOf(inv);
    const otherIdx = otherLeaders.indexOf(inv);

    shifts.forEach((shift, sIdx) => {
      let hasDuty = false;

      if (leaderIdx >= 0) {
        // Thuộc nhóm Ban Lãnh đạo (Chủ tịch / Phó Chủ tịch)
        if (leaders.length === 1) {
          hasDuty = true; // 1 lãnh đạo thì trực toàn bộ các buổi
        } else if (leaders.length === 2) {
          // Đúng chuẩn yêu cầu: 2 lãnh đạo thì 1 người 2 buổi, người kia 1 buổi (buổi 1, 3 cho Chủ tịch; buổi 2 cho Phó CT)
          hasDuty = (leaderIdx === 0) ? (shift.shiftNumber % 2 === 1) : (shift.shiftNumber % 2 === 0);
        } else {
          // Nhiều hơn 2 lãnh đạo: Chia đều xoay vòng
          hasDuty = (sIdx % leaders.length) === leaderIdx;
        }
      } else if (secIdx >= 0) {
        // Thuộc nhóm Thư ký (TK01, TK02)
        if (secretaries.length === 1) {
          hasDuty = true; // 1 thư ký thì trực toàn bộ
        } else if (secretaries.length === 2) {
          // 2 thư ký chia đều: Thư ký 1 trực buổi 1, 3; Thư ký 2 trực buổi 2
          hasDuty = (secIdx === 0) ? (shift.shiftNumber % 2 === 1) : (shift.shiftNumber % 2 === 0);
        } else {
          // Nhiều hơn 2 thư ký: Chia đều xoay vòng
          hasDuty = (sIdx % secretaries.length) === secIdx;
        }
      } else {
        // Thành viên hội đồng khác: luân phiên chẵn lẻ
        hasDuty = (otherIdx % 2 === 0) ? (shift.shiftNumber % 2 === 1) : (shift.shiftNumber % 2 === 0);
      }

      // Kiểm tra người dùng có click tick / bỏ chọn tùy chỉnh thủ công hay không
      const userOverrides = customDutyOverrides?.[inv.id] || customDutyOverrides?.[inv.code];
      if (userOverrides && typeof userOverrides[shift.shiftKey] === 'boolean') {
        hasDuty = userOverrides[shift.shiftKey];
      }

      shiftDuties[shift.shiftKey] = hasDuty;
    });

    const totalDuties = Object.values(shiftDuties).filter(Boolean).length;

    rows.push({
      stt: currentStt++,
      id: inv.id,
      code: inv.code,
      fullName: inv.fullName,
      schoolOrDept: inv.schoolOrDept,
      subject: inv.subject,
      role: inv.role || (leaderIdx === 0 ? 'Chủ tịch' : leaderIdx > 0 ? 'Phó Chủ tịch' : secIdx >= 0 ? 'Thư ký' : 'Lãnh đạo HĐ'),
      groupType: 'leadership',
      shiftDuties,
      totalDuties,
      note: inv.note || (leaderIdx >= 0 ? 'Trực chỉ đạo Hội đồng thi' : secIdx >= 0 ? 'Trực hồ sơ, biên bản & bàn giao đề/bài' : 'Điều hành Hội đồng thi')
    });
  });

  // -------------------------------------------------------------------------
  // NHÓM 2: CÁN BỘ GIÁM SÁT (NỀN MÀU TÍM NHẠT)
  // LOGIC CHIA ĐỀU CHUẨN:
  // - Nếu có 10 Giám sát (GS01 - GS10) và 3 buổi thi:
  //   Chia đều cho 3 buổi: Buổi 1 (4 GS), Buổi 2 (3 GS), Buổi 3 (3 GS) -> mỗi GS trực đúng 1 ca!
  // -------------------------------------------------------------------------
  supervisorInvs.forEach((inv, sIdx) => {
    const shiftDuties: Record<string, boolean> = {};
    const countSupervisors = supervisorInvs.length;
    const hasAnyAssignedSupervisors = plan.sessions.some(s => s.supervisors && s.supervisors.length > 0);

    shifts.forEach((shift, shiftIndex) => {
      let hasDuty = false;

      if (hasAnyAssignedSupervisors) {
        // Đọc 100% chính xác từ kết quả phân công thực tế trong plan.sessions
        hasDuty = shift.sessionIds.some(sid => {
          const sessData = plan.sessions.find(s => s.sessionId === sid);
          if (!sessData) return false;
          const inSup = sessData.supervisors?.some(s => s.id === inv.id || s.code === inv.code);
          const inRoom = sessData.roomAssignments?.some(r => r.invigilator1?.id === inv.id || r.invigilator2?.id === inv.id);
          const inRes = sessData.reserveInvigilators?.some(r => r.id === inv.id || r.code === inv.code);
          return inSup || inRoom || inRes;
        });
      } else {
        // Fallback luân phiên trước khi bốc thăm
        if (countSupervisors === 1) {
          hasDuty = true;
        } else if (countSupervisors === 2) {
          hasDuty = (sIdx === 0) ? (shift.shiftNumber % 2 === 1) : (shift.shiftNumber % 2 === 0);
        } else if (countSupervisors === 3) {
          if (sIdx === 0) hasDuty = shift.shiftNumber === 1 || shift.shiftNumber === 3;
          else if (sIdx === 1) hasDuty = shift.shiftNumber === 2;
          else if (sIdx === 2) hasDuty = true;
        } else if (countSupervisors > shifts.length) {
          const startIdx = Math.floor((shiftIndex * countSupervisors) / shifts.length);
          const endIdx = Math.floor(((shiftIndex + 1) * countSupervisors) / shifts.length);
          hasDuty = sIdx >= startIdx && sIdx < endIdx;
        } else {
          hasDuty = (sIdx + shift.shiftNumber) % 2 === 0;
        }
      }

      // Kiểm tra người dùng có click tick / bỏ chọn tùy chỉnh thủ công hay không
      const userOverrides = customDutyOverrides?.[inv.id] || customDutyOverrides?.[inv.code];
      if (userOverrides && typeof userOverrides[shift.shiftKey] === 'boolean') {
        hasDuty = userOverrides[shift.shiftKey];
      }

      shiftDuties[shift.shiftKey] = hasDuty;
    });

    const totalDuties = Object.values(shiftDuties).filter(Boolean).length;

    rows.push({
      stt: currentStt++,
      id: inv.id,
      code: inv.code,
      fullName: inv.fullName,
      schoolOrDept: inv.schoolOrDept,
      subject: inv.subject,
      role: inv.role || 'Giám sát',
      groupType: 'supervisor',
      shiftDuties,
      totalDuties,
      note: inv.note || 'Giám sát hành lang phòng thi'
    });
  });

  // -------------------------------------------------------------------------
  // NHÓM 3: BỘ PHẬN KHẢO THÍ, KỸ THUẬT & HỖ TRỢ PHỤC VỤ (NỀN XANH NGỌC NHẠT)
  // -------------------------------------------------------------------------
  supportInvs.forEach(inv => {
    const shiftDuties: Record<string, boolean> = {};
    // Cán bộ Khảo thí - Hỗ trợ, Y tế, Bảo vệ thường trực toàn bộ các buổi thi của Hội đồng
    shifts.forEach(shift => {
      let hasDuty = true;
      const userOverrides = customDutyOverrides?.[inv.id] || customDutyOverrides?.[inv.code];
      if (userOverrides && typeof userOverrides[shift.shiftKey] === 'boolean') {
        hasDuty = userOverrides[shift.shiftKey];
      }
      shiftDuties[shift.shiftKey] = hasDuty;
    });

    const totalDuties = Object.values(shiftDuties).filter(Boolean).length;
    const defaultNote = inv.role === 'Khảo thí - Hỗ trợ'
      ? 'Trực đề & hỗ trợ kỹ thuật khảo thí'
      : inv.role === 'Y tế'
      ? 'Trực sơ cấp cứu y tế'
      : inv.role === 'Bảo vệ'
      ? 'Trực an ninh trật tự'
      : 'Phục vụ Hội đồng thi';

    rows.push({
      stt: currentStt++,
      id: inv.id,
      code: inv.code,
      fullName: inv.fullName,
      schoolOrDept: inv.schoolOrDept,
      subject: inv.subject,
      role: inv.role || 'Khảo thí - Hỗ trợ',
      groupType: 'support',
      shiftDuties,
      totalDuties,
      note: inv.note || defaultNote
    });
  });

  // -------------------------------------------------------------------------
  // NHÓM 4: CÁN BỘ GIÁM THỊ COI THI (NỀN TRẮNG - BẢO MẬT SỐ PHÒNG)
  // -------------------------------------------------------------------------
  examRoomInvs.forEach(inv => {
    const shiftDuties: Record<string, boolean> = {};

    // Kiểm tra xem giáo viên này có được phân công coi phòng, giám sát hoặc dự phòng ở buổi này hay không
    shifts.forEach(shift => {
      let isAssigned = shift.sessionIds.some(sid => {
        const sessData = plan.sessions.find(s => s.sessionId === sid);
        if (!sessData) return false;
        const inRoom = sessData.roomAssignments.some(r =>
          r.invigilator1?.id === inv.id ||
          r.invigilator1?.code === inv.code ||
          r.invigilator2?.id === inv.id ||
          r.invigilator2?.code === inv.code
        );
        const inSupervisor = sessData.supervisors?.some(s => s.id === inv.id || s.code === inv.code);
        const inReserve = sessData.reserveInvigilators?.some(s => s.id === inv.id || s.code === inv.code);
        return inRoom || inSupervisor || inReserve;
      });

      const userOverrides = customDutyOverrides?.[inv.id] || customDutyOverrides?.[inv.code];
      if (userOverrides && typeof userOverrides[shift.shiftKey] === 'boolean') {
        isAssigned = userOverrides[shift.shiftKey];
      }

      shiftDuties[shift.shiftKey] = isAssigned;
    });

    const totalDuties = Object.values(shiftDuties).filter(Boolean).length;

    rows.push({
      stt: currentStt++,
      id: inv.id,
      code: inv.code,
      fullName: inv.fullName,
      schoolOrDept: inv.schoolOrDept,
      subject: inv.subject,
      role: inv.role || 'Giám thị',
      groupType: 'invigilator',
      shiftDuties,
      totalDuties,
      note: inv.note || (totalDuties === 0 ? 'Dự phòng coi thi / Chấm bài' : '')
    });
  });

  return {
    schoolName,
    examName,
    academicYear,
    shifts,
    rows,
    totalLeadership: leadershipInvs.length,
    totalSupervisors: supervisorInvs.length,
    totalSupport: supportInvs.length,
    totalInvigilators: examRoomInvs.length
  };
}
