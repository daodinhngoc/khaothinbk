import {
  Invigilator,
  ExamSession,
  InvigilatorMode,
  RoomInvigilatorAssignment,
  SessionAssignmentResult,
  InvigilatorStats,
  ValidationReport,
  InvigilatorPlanResult
} from '../types/invigilator';

/**
 * Thuật toán Trộn ngẫu nhiên Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Chuẩn hóa và làm sạch tên bài thi:
 * Đối với thi thử, khảo sát: bài thi tự chọn chỉ ghi "Tự chọn 1", "Tự chọn 2", không kèm KHTN, KHXH từng môn...
 */
export function cleanSubjectName(subject: string): string {
  if (!subject) return '';
  const s = subject.trim();
  if (/tự\s*chọn\s*1/i.test(s)) {
    return 'Tự chọn 1';
  }
  if (/tự\s*chọn\s*2/i.test(s)) {
    return 'Tự chọn 2';
  }
  return s;
}

/**
 * Chuẩn hóa tên môn để so khớp không phân biệt dấu / viết tắt
 */
function normalizeSubj(subj: string): string {
  if (!subj) return '';
  return subj.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Kiểm tra xem giáo viên có giảng dạy môn thi của buổi đó không.
 * Hỗ trợ kỳ thi định kỳ một buổi có thể có 1, 2 hoặc 3 môn (ngăn cách bởi dấu +, /, &, phẩy...).
 * Nếu giáo viên dạy BẤT KỲ môn nào có trong buổi thi đó, hàm sẽ trả về true để miễn coi thi buổi đó.
 */
export function isTeachingSubject(invSubject: string, sessionSubject: string): boolean {
  if (!invSubject || !sessionSubject) return false;
  const invNorm = normalizeSubj(invSubject);
  const sesClean = cleanSubjectName(sessionSubject);
  const sesNorm = normalizeSubj(sesClean);

  // Nếu là bài thi Tự chọn trong thi thử (Tự chọn 1, Tự chọn 2)
  if (sesNorm.includes('tu chon')) return false;

  // Tách các môn trong buổi thi nếu một buổi thi 1, 2 hoặc 3 môn (VD: "Toán + Tiếng Anh", "Ngữ văn + GDCD", "Vật lí, Hóa học, Sinh học")
  const subList = sesNorm.split(/[,+\/&;-]+/).map(s => s.trim()).filter(Boolean);
  if (subList.length === 0) {
    subList.push(sesNorm);
  }

  for (const s of subList) {
    if (s.includes(invNorm) || invNorm.includes(s)) return true;

    // Ngữ văn
    if ((invNorm.includes('van') || invNorm.includes('ngu van')) && s.includes('van')) return true;
    // Toán
    if (invNorm.includes('toan') && s.includes('toan')) return true;
    // Vật lí
    if ((invNorm.includes('ly') || invNorm.includes('vat li') || invNorm.includes('vat ly')) && (s.includes('ly') || s.includes('vat li') || s.includes('vat ly'))) return true;
    // Hóa học
    if (invNorm.includes('hoa') && s.includes('hoa')) return true;
    // Sinh học
    if (invNorm.includes('sinh') && s.includes('sinh')) return true;
    // Lịch sử
    if (invNorm.includes('su') && s.includes('su')) return true;
    // Địa lí
    if (invNorm.includes('dia') && s.includes('dia')) return true;
    // Ngoại ngữ / Tiếng Anh
    if ((invNorm.includes('anh') || invNorm.includes('tieng anh') || invNorm.includes('ngoai ngu')) && (s.includes('anh') || s.includes('ngoai ngu'))) return true;
    // Tin học
    if ((invNorm.includes('tin') || invNorm.includes('tin hoc')) && (s.includes('tin') || s.includes('tin hoc'))) return true;
    // Công nghệ
    if ((invNorm.includes('cong nghe') || invNorm.includes('cn')) && (s.includes('cong nghe') || s.includes('cn'))) return true;
    // GDCD / Giáo dục Kinh tế & Pháp luật
    if ((invNorm.includes('gdcd') || invNorm.includes('cong dan') || invNorm.includes('phap luat') || invNorm.includes('gdkt')) &&
        (s.includes('gdcd') || s.includes('cong dan') || s.includes('phap luat') || s.includes('gdkt'))) return true;
    // KHTN / KHXH
    if (invNorm.includes('khtn') && (s.includes('ly') || s.includes('hoa') || s.includes('sinh') || s.includes('khtn'))) return true;
    if (invNorm.includes('khxh') && (s.includes('su') || s.includes('dia') || s.includes('gdcd') || s.includes('khxh'))) return true;
  }

  return false;
}

/**
 * Kiểm tra xem session có phải là ca tiếp nối (ví dụ Ca 2 cùng buổi sáng của môn Tự chọn)
 * Cặp giám thị cố định 1 phòng cho cả 2 ca theo đúng quy chế Bộ GD&ĐT
 */
export function isSessionContinuation(
  session: ExamSession | SessionAssignmentResult,
  prevSession: ExamSession | SessionAssignmentResult | undefined,
  mode: InvigilatorMode
): boolean {
  if (!prevSession || mode !== 'survey_mock') return false;
  const sName = ('sessionName' in session ? session.sessionName : '').toLowerCase();
  const prevName = ('sessionName' in prevSession ? prevSession.sessionName : '').toLowerCase();
  const isCa2 = (sName.includes('ca 2') && prevName.includes('ca 1')) ||
    (cleanSubjectName(session.subjectName) === 'Tự chọn 2' && cleanSubjectName(prevSession.subjectName) === 'Tự chọn 1');
  return isCa2 && session.date === prevSession.date;
}

export interface AssignmentOptions {
  /**
   * Tránh phân công giáo viên dạy môn thi của buổi đó.
   * Mặc định là false (tất cả giáo viên được coi như nhau để đảm bảo chia đều ca tuyệt đối).
   */
  avoidTeachingSubject?: boolean;
  /**
   * Số lượng giám thị trên mỗi phòng thi:
   * 1 = Duy nhất 1 Giám thị coi thi (tiết kiệm kinh phí cho nhà trường)
   * 2 = Đủ 2 Giám thị coi thi (chuẩn quy chế: Giám thị 1 + Giám thị 2 khác trường/tổ)
   * Mặc định là 2 đối với chế độ thi thử / khảo sát.
   */
  invigilatorsPerRoom?: 1 | 2;
}

/**
 * Tính toán định mức mục tiêu chia đều tuyệt đối cho từng giáo viên
 * - Chỉ đếm các buổi thi độc lập (không tính trùng ca tiếp nối Ca 2)
 * - Đảm bảo giữa các giáo viên cùng điều kiện (cùng quotaOffset) chênh lệch định mức <= 1
 * - Tổng các targetQuota = đúng bằng tổng số ca cần phân công
 */
export function computeFairTargetQuotas(
  activeInvs: Invigilator[],
  sessions: ExamSession[],
  numInvPerRoom: 1 | 2,
  mode: InvigilatorMode,
  avoidTeaching: boolean
): Map<string, number> {
  const independentSessions = sessions.filter((s, idx) =>
    !isSessionContinuation(s, idx > 0 ? sessions[idx - 1] : undefined, mode)
  );

  // Tổng số ca thực tế gồm cả phòng thi VÀ giám thị dự phòng (vì dự phòng cũng là ca trực được chấm công)
  const totalDutiesNeeded = independentSessions.reduce((sum, s) => {
    const roomDuties = s.numRooms * numInvPerRoom;
    const reserveDuties = s.numReserves ?? 2;
    return sum + roomDuties + reserveDuties;
  }, 0);
  const n = activeInvs.length || 1;

  // Số buổi thi tối đa mà từng giáo viên đủ điều kiện tham gia
  const maxPossible = new Map<string, number>();
  activeInvs.forEach(inv => {
    let eligible = 0;
    independentSessions.forEach(s => {
      if (!avoidTeaching || !isTeachingSubject(inv.subject, s.subjectName)) {
        eligible++;
      }
    });
    // Không một giáo viên nào có thể coi nhiều hơn số buổi thi độc lập
    maxPossible.set(inv.id, Math.min(independentSessions.length, eligible));
  });

  const totalOffset = activeInvs.reduce((sum, inv) => sum + (inv.quotaOffset || 0), 0);
  const baseDutyFloat = (totalDutiesNeeded - totalOffset) / n;

  const targets = new Map<string, number>();
  const remainders: { id: string; remainder: number; maxAllowed: number; quotaOffset: number }[] = [];
  let currentSum = 0;

  activeInvs.forEach(inv => {
    const maxAllowed = maxPossible.get(inv.id) ?? independentSessions.length;
    const rawVal = Math.max(0, baseDutyFloat + (inv.quotaOffset || 0));
    const floored = Math.min(maxAllowed, Math.floor(rawVal));
    targets.set(inv.id, floored);
    currentSum += floored;
    remainders.push({
      id: inv.id,
      remainder: rawVal - Math.floor(rawVal),
      maxAllowed,
      quotaOffset: inv.quotaOffset || 0
    });
  });

  // Phân bổ phần dư sao cho giữa các giáo viên CÙNG quotaOffset chỉ chênh lệch tối đa 1 ca
  remainders.sort((a, b) => b.remainder - a.remainder);
  let deficit = totalDutiesNeeded - currentSum;

  if (deficit > 0) {
    for (const item of remainders) {
      if (deficit <= 0) break;
      const cur = targets.get(item.id) || 0;
      if (cur < item.maxAllowed) {
        targets.set(item.id, cur + 1);
        deficit--;
      }
    }
  } else if (deficit < 0) {
    remainders.sort((a, b) => a.remainder - b.remainder);
    for (const item of remainders) {
      if (deficit >= 0) break;
      const cur = targets.get(item.id) || 0;
      if (cur > 0) {
        targets.set(item.id, cur - 1);
        deficit++;
      }
    }
  }

  // Khóa cứng: Kiểm tra giữa các giáo viên có cùng quotaOffset, độ lệch targetQuota BẮT BUỘC <= 1
  const offsetGroups = new Map<number, string[]>();
  activeInvs.forEach(inv => {
    const off = inv.quotaOffset || 0;
    if (!offsetGroups.has(off)) offsetGroups.set(off, []);
    offsetGroups.get(off)!.push(inv.id);
  });

  offsetGroups.forEach((ids) => {
    if (ids.length <= 1) return;
    const vals = ids.map(id => targets.get(id) || 0);
    const maxT = Math.max(...vals);
    const minT = Math.min(...vals);
    if (maxT - minT > 1) {
      // Điều chỉnh đưa về chênh lệch <= 1
      const maxId = ids.find(id => (targets.get(id) || 0) === maxT);
      const minId = ids.find(id => (targets.get(id) || 0) === minT);
      if (maxId && minId) {
        targets.set(maxId, maxT - 1);
        targets.set(minId, minT + 1);
      }
    }
  });

  return targets;
}

/**
 * ----------------------------------------------------------------------
 * THUẬT TOÁN 1: THI THỬ / KHẢO SÁT TỐT NGHIỆP (BỐC THĂM QUY CHẾ)
 * ----------------------------------------------------------------------
 * Hỗ trợ 2 tùy chọn theo điều kiện nhà trường:
 * - 1 Giám thị / phòng: Tiết kiệm kinh phí, chia đều số ca và chống trùng phòng.
 * - 2 Giám thị / phòng: Giám thị 1 và Giám thị 2 khác đơn vị/tổ, không trùng cặp, không trùng phòng.
 * Ràng buộc Buổi 3 (môn tự chọn): Cố định phòng và giám thị ca 1 sang ca 2 cùng buổi.
 */
export function assignSurveyMockInvigilators(
  invigilators: Invigilator[],
  sessions: ExamSession[],
  options?: AssignmentOptions
): InvigilatorPlanResult {
  const avoidTeaching = options?.avoidTeachingSubject === true;
  const numInvPerRoom: 1 | 2 = options?.invigilatorsPerRoom === 1 ? 1 : 2;

  // Lọc danh sách giáo viên hợp lệ (chỉ người có vai trò Giám thị hoặc chưa gán vai trò, không bị miễn coi)
  const activeInvs = invigilators.filter(inv => {
    if (inv.role && inv.role !== 'Giám thị') return false;
    return (inv.quotaOffset ?? 0) > -50 && inv.isAvailable !== false;
  });

  // Tính định mức mục tiêu chia đều tuyệt đối cho từng giáo viên
  const targetQuotas = computeFairTargetQuotas(activeInvs, sessions, numInvPerRoom, 'survey_mock', avoidTeaching);

  // Phân chia giáo viên theo Trường hoặc Tổ chuyên môn
  const unitsMap = new Map<string, Invigilator[]>();
  activeInvs.forEach(inv => {
    const unit = inv.schoolOrDept || 'Đơn vị chung';
    if (!unitsMap.has(unit)) unitsMap.set(unit, []);
    unitsMap.get(unit)!.push(inv);
  });
  const unitsList = Array.from(unitsMap.keys());

  // Lấy danh sách các buổi thi độc lập
  const independentSessions = sessions.filter((s, idx) =>
    !isSessionContinuation(s, idx > 0 ? sessions[idx - 1] : undefined, 'survey_mock')
  );

  let bestSessions: SessionAssignmentResult[] = [];
  let bestViolations = 999999;

  // Thử giải ngẫu nhiên tối đa 120 lần để tìm phương án tối ưu
  const maxAttempts = 120;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pairedHistory = new Set<string>(); // key: `id1__id2`
    const roomHistory = new Map<string, Set<number>>(); // invId -> Set<roomNo>
    activeInvs.forEach(inv => roomHistory.set(inv.id, new Set<number>()));

    const assignedCount = new Map<string, number>();
    activeInvs.forEach(inv => assignedCount.set(inv.id, 0));

    let attemptViolations = 0;
    const currentSessionsResult: SessionAssignmentResult[] = [];
    let possible = true;

    for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
      const session = sessions[sIdx];
      const roomCount = session.numRooms;
      const startRoom = session.startRoomNumber && session.startRoomNumber > 0 ? session.startRoomNumber : 1;

      // Kiểm tra nếu là ca 2 của buổi thi tự chọn (cùng ngày với ca 1 trước đó):
      // Giữ cố định cùng giám thị và cùng phòng thi từ Ca 1 theo đúng quy chế Buổi 3
      const isContinuation = isSessionContinuation(session, sIdx > 0 ? sessions[sIdx - 1] : undefined, 'survey_mock');

      if (isContinuation && currentSessionsResult.length > 0) {
        const prevSession = currentSessionsResult[currentSessionsResult.length - 1];
        const roomAssignments: RoomInvigilatorAssignment[] = prevSession.roomAssignments.map(ra => ({
          roomNo: ra.roomNo,
          roomLabel: ra.roomLabel,
          invigilator1: ra.invigilator1,
          invigilator2: ra.invigilator2
        }));

        currentSessionsResult.push({
          sessionId: session.id,
          sessionName: session.sessionName,
          subjectName: cleanSubjectName(session.subjectName),
          date: session.date,
          shiftTime: session.shiftTime,
          roomAssignments,
          drawnAt: prevSession.drawnAt || new Date().toLocaleTimeString('vi-VN')
        });
        continue;
      }

      // Đếm số buổi thi độc lập còn lại kể từ buổi này trở đi
      const remainingIndependentSessions = independentSessions.filter((_, idx) => {
        const indIdx = sessions.findIndex(s => s.id === session.id);
        return idx >= indIdx;
      });

      // Hàm tính điểm ưu tiên phân công của từng giáo viên cho buổi này
      // 1. Tính cấp bách (Urgency): nếu số ca còn thiếu >= số buổi thi còn lại mà giáo viên có thể coi, BẮT BUỘC PHẢI COI buổi này
      // 2. Chưa đạt targetQuota
      // 3. Thiếu nhiều ca hơn xếp trước
      // 4. Đang coi ít ca hơn xếp trước
      const getPriorityScore = (inv: Invigilator) => {
        const curAssigned = assignedCount.get(inv.id) || 0;
        const target = targetQuotas.get(inv.id) || 0;
        const needed = Math.max(0, target - curAssigned);
        
        // Số buổi thi còn lại mà giáo viên này đủ điều kiện coi
        let remainingEligible = 0;
        remainingIndependentSessions.forEach(rs => {
          if (!avoidTeaching || !isTeachingSubject(inv.subject, rs.subjectName)) {
            remainingEligible++;
          }
        });

        const isUrgent = needed > 0 && needed >= remainingEligible;
        const hasReachedTarget = curAssigned >= target;

        // Điểm ưu tiên cao hơn sẽ được chọn trước
        let score = 0;
        if (isUrgent) score += 10000;
        if (!hasReachedTarget) score += 2000;
        score += needed * 100;
        score -= curAssigned * 10;
        return score;
      };

      const sortedPool = shuffleArray(activeInvs).sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

      if (numInvPerRoom === 1) {
        // -------------------------------------------------------------
        // TRƯỜNG HỢP 1: DUY NHẤT 1 GIÁM THỊ / PHÒNG (TIẾT KIỆM KINH PHÍ)
        // -------------------------------------------------------------
        const roomAssignments: RoomInvigilatorAssignment[] = [];
        const sessionUsedInvs = new Set<string>();

        for (let idx = 0; idx < roomCount; idx++) {
          const r = startRoom + idx;
          const cand = sortedPool.find(inv =>
            !sessionUsedInvs.has(inv.id) &&
            !roomHistory.get(inv.id)?.has(r) &&
            (!avoidTeaching || !isTeachingSubject(inv.subject, session.subjectName))
          ) || sortedPool.find(inv =>
            !sessionUsedInvs.has(inv.id) &&
            (!avoidTeaching || !isTeachingSubject(inv.subject, session.subjectName))
          ) || sortedPool.find(inv =>
            !sessionUsedInvs.has(inv.id) &&
            !roomHistory.get(inv.id)?.has(r)
          ) || sortedPool.find(inv => !sessionUsedInvs.has(inv.id));

          if (!cand) {
            attemptViolations += 50;
            possible = false;
            break;
          }

          sessionUsedInvs.add(cand.id);
          if (roomHistory.get(cand.id)?.has(r)) attemptViolations += 2;
          roomHistory.get(cand.id)?.add(r);
          assignedCount.set(cand.id, (assignedCount.get(cand.id) || 0) + 1);

          roomAssignments.push({
            roomNo: r,
            roomLabel: `Phòng ${String(r).padStart(2, '0')}`,
            invigilator1: cand,
            invigilator2: undefined
          });
        }

        if (!possible) break;

        currentSessionsResult.push({
          sessionId: session.id,
          sessionName: session.sessionName,
          subjectName: cleanSubjectName(session.subjectName),
          date: session.date,
          shiftTime: session.shiftTime,
          roomAssignments,
          drawnAt: new Date().toLocaleTimeString('vi-VN')
        });
      } else {
        // -------------------------------------------------------------
        // TRƯỜNG HỢP 2: ĐỦ 2 GIÁM THỊ / PHÒNG (QUY CHẾ BỘ GD&ĐT)
        // -------------------------------------------------------------
        let group1: Invigilator[] = [];
        let group2: Invigilator[] = [];

        if (unitsList.length >= 2) {
          const unitA = unitsList[0];
          group1 = sortedPool.filter(i => i.schoolOrDept === unitA);
          group2 = sortedPool.filter(i => i.schoolOrDept !== unitA);

          if (group1.length < roomCount || group2.length < roomCount) {
            const half = Math.floor(sortedPool.length / 2);
            group1 = sortedPool.slice(0, half);
            group2 = sortedPool.slice(half);
          }
        } else {
          const half = Math.floor(sortedPool.length / 2);
          group1 = sortedPool.slice(0, half);
          group2 = sortedPool.slice(half);
        }

        const roomAssignments: RoomInvigilatorAssignment[] = [];
        const sessionUsedInvs = new Set<string>();

        for (let idx = 0; idx < roomCount; idx++) {
          const r = startRoom + idx;
          // Tìm Giám thị 1
          const cand1 = group1.find(inv =>
            !sessionUsedInvs.has(inv.id) &&
            !roomHistory.get(inv.id)?.has(r) &&
            (!avoidTeaching || !isTeachingSubject(inv.subject, session.subjectName))
          ) || group1.find(inv =>
            !sessionUsedInvs.has(inv.id) &&
            (!avoidTeaching || !isTeachingSubject(inv.subject, session.subjectName))
          ) || group1.find(inv => !sessionUsedInvs.has(inv.id)) || sortedPool.find(inv => !sessionUsedInvs.has(inv.id));

          if (!cand1) {
            attemptViolations += 50;
            possible = false;
            break;
          }
          sessionUsedInvs.add(cand1.id);

          // Tìm Giám thị 2: khác đơn vị với cand1, chưa từng bắt cặp, chưa từng coi phòng r
          const cand2 = group2.find(inv => {
            if (sessionUsedInvs.has(inv.id)) return false;
            if (inv.schoolOrDept === cand1.schoolOrDept && unitsList.length >= 2) return false;
            const pKey1 = `${cand1.id}__${inv.id}`;
            const pKey2 = `${inv.id}__${cand1.id}`;
            if (pairedHistory.has(pKey1) || pairedHistory.has(pKey2)) return false;
            if (roomHistory.get(inv.id)?.has(r)) return false;
            if (avoidTeaching && isTeachingSubject(inv.subject, session.subjectName)) return false;
            return true;
          }) || group2.find(inv => {
            if (sessionUsedInvs.has(inv.id)) return false;
            if (inv.schoolOrDept === cand1.schoolOrDept && unitsList.length >= 2) return false;
            const pKey1 = `${cand1.id}__${inv.id}`;
            const pKey2 = `${inv.id}__${cand1.id}`;
            if (pairedHistory.has(pKey1) || pairedHistory.has(pKey2)) return false;
            if (avoidTeaching && isTeachingSubject(inv.subject, session.subjectName)) return false;
            return true;
          }) || group2.find(inv => {
            if (sessionUsedInvs.has(inv.id)) return false;
            if (inv.schoolOrDept === cand1.schoolOrDept && unitsList.length >= 2) return false;
            return true;
          }) || sortedPool.find(inv => !sessionUsedInvs.has(inv.id) && inv.id !== cand1.id);

          if (!cand2) {
            attemptViolations += 50;
            possible = false;
            break;
          }
          sessionUsedInvs.add(cand2.id);

          if (cand1.schoolOrDept === cand2.schoolOrDept && unitsList.length >= 2) {
            attemptViolations += 10;
          }
          const pKey = `${cand1.id}__${cand2.id}`;
          if (pairedHistory.has(pKey) || pairedHistory.has(`${cand2.id}__${cand1.id}`)) {
            attemptViolations += 5;
          }
          if (roomHistory.get(cand1.id)?.has(r)) attemptViolations += 1;
          if (roomHistory.get(cand2.id)?.has(r)) attemptViolations += 1;

          pairedHistory.add(pKey);
          pairedHistory.add(`${cand2.id}__${cand1.id}`);
          roomHistory.get(cand1.id)?.add(r);
          roomHistory.get(cand2.id)?.add(r);
          assignedCount.set(cand1.id, (assignedCount.get(cand1.id) || 0) + 1);
          assignedCount.set(cand2.id, (assignedCount.get(cand2.id) || 0) + 1);

          roomAssignments.push({
            roomNo: r,
            roomLabel: `Phòng ${String(r).padStart(2, '0')}`,
            invigilator1: cand1,
            invigilator2: cand2
          });
        }

        if (!possible) break;

        currentSessionsResult.push({
          sessionId: session.id,
          sessionName: session.sessionName,
          subjectName: cleanSubjectName(session.subjectName),
          date: session.date,
          shiftTime: session.shiftTime,
          roomAssignments,
          drawnAt: new Date().toLocaleTimeString('vi-VN')
        });
      }
    }

    // TÍNH ĐIỂM PHẠT ĐỘ LỆCH CA:
    // Tuyệt đối phạt nặng nếu có giáo viên bị lệch so với targetQuota
    let dutySpreadViolation = 0;
    const normalInvs = activeInvs.filter(i => (i.quotaOffset || 0) === 0);
    if (normalInvs.length > 0) {
      const counts = normalInvs.map(i => assignedCount.get(i.id) || 0);
      const maxC = Math.max(...counts);
      const minC = Math.min(...counts);
      if (maxC - minC > 1) {
        dutySpreadViolation += (maxC - minC - 1) * 500;
      }
    }
    activeInvs.forEach(inv => {
      const tq = targetQuotas.get(inv.id) || 0;
      const ac = assignedCount.get(inv.id) || 0;
      const diff = Math.abs(ac - tq);
      if (diff > 1) {
        dutySpreadViolation += (diff - 1) * 300;
      } else if (diff === 1) {
        dutySpreadViolation += 5;
      }
    });
    attemptViolations += dutySpreadViolation;

    if (attemptViolations < bestViolations && currentSessionsResult.length === sessions.length) {
      bestViolations = attemptViolations;
      bestSessions = currentSessionsResult;
      if (bestViolations === 0) break;
    }
  }

  // Phân công cán bộ giám sát và giám thị dự phòng theo chuyên môn bộ môn và chỉ tiêu
  assignSupervisorsAndReserves(sessions, invigilators, bestSessions, options, targetQuotas, 'survey_mock');

  // Chạy thuật toán hoán đổi cân bằng ca BFS toàn diện (Multi-Hop Residual BFS Balancing)
  // bao gồm cả ca trong phòng thi và ca dự phòng để triệt tiêu 100% tình trạng người coi 3 ca, người coi 1 ca
  balanceDutiesAcrossSessionsBFS(bestSessions, activeInvs, targetQuotas, avoidTeaching, numInvPerRoom, 'survey_mock', unitsList);

  const allEligibleInvs = invigilators.filter(i => {
    if (i.isAvailable === false) return false;
    if (i.role === 'Giám sát' || (i.code || '').toUpperCase().startsWith('GS')) return true;
    if (!i.role || i.role === 'Giám thị') return (i.quotaOffset ?? 0) > -50;
    return false;
  });

  const stats = buildInvigilatorStats(allEligibleInvs, bestSessions, 'survey_mock', targetQuotas);
  const validation = validatePlanResult(bestSessions, 'survey_mock', options, activeInvs);

  return {
    mode: 'survey_mock',
    invigilatorsPerRoom: numInvPerRoom,
    sessions: bestSessions,
    stats,
    validation,
    generatedAt: new Date().toLocaleString('vi-VN')
  };
}

/**
 * ----------------------------------------------------------------------
 * THUẬT TOÁN 2: KIỂM TRA ĐỊNH KỲ (1 GIÁM THỊ / PHÒNG - CHIA ĐỀU CÔNG BẰNG)
 * ----------------------------------------------------------------------
 * Ràng buộc:
 * 1. Mỗi phòng 1 Giám thị (GV)
 * 2. Chia đều công bằng: độ lệch số ca coi thi sau khi bù trừ quota là nhỏ nhất (<= 1)
 * 3. Hỗ trợ tùy chọn gia giảm (quotaOffset): GV chấm bài tự luận coi ít hơn, BGH miễn coi...
 * 4. GV không coi thi môn của mình (để chấm bài hoặc trực đề thi)
 * 5. Hạn chế trùng lặp cùng 1 phòng ở các buổi thi liên tiếp
 */
export function assignPeriodicInvigilators(
  invigilators: Invigilator[],
  sessions: ExamSession[],
  options?: AssignmentOptions
): InvigilatorPlanResult {
  const avoidTeaching = options?.avoidTeachingSubject === true;

  // Lọc giáo viên còn hoạt động và không bị miễn coi hoàn toàn (chỉ lấy vai trò Giám thị)
  const activeInvs = invigilators.filter(inv => {
    if (inv.role && inv.role !== 'Giám thị') return false;
    return (inv.quotaOffset ?? 0) > -50 && inv.isAvailable !== false;
  });

  // Tính định mức mục tiêu chia đều tuyệt đối cho từng giáo viên
  const targetQuotas = computeFairTargetQuotas(activeInvs, sessions, 1, 'periodic', avoidTeaching);

  let bestSessions: SessionAssignmentResult[] = [];
  let bestViolations = 999999;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const roomHistory = new Map<string, Set<number>>();
    const assignedCount = new Map<string, number>();
    activeInvs.forEach(inv => {
      roomHistory.set(inv.id, new Set<number>());
      assignedCount.set(inv.id, 0);
    });

    let attemptViolations = 0;
    const currentSessionsResult: SessionAssignmentResult[] = [];
    let possible = true;

    for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
      const session = sessions[sIdx];
      const roomCount = session.numRooms;
      const startRoom = session.startRoomNumber && session.startRoomNumber > 0 ? session.startRoomNumber : 1;
      const sessionUsedInvs = new Set<string>();
      const roomAssignments: RoomInvigilatorAssignment[] = [];

      const remainingSessions = sessions.slice(sIdx);

      // Điểm ưu tiên tương tự: cấp bách (urgency) -> chưa đạt target -> thiếu nhiều ca -> coi ít ca
      const getPriorityScore = (inv: Invigilator) => {
        const curAssigned = assignedCount.get(inv.id) || 0;
        const target = targetQuotas.get(inv.id) || 0;
        const needed = Math.max(0, target - curAssigned);

        let remainingEligible = 0;
        remainingSessions.forEach(rs => {
          if (!avoidTeaching || !isTeachingSubject(inv.subject, rs.subjectName)) {
            remainingEligible++;
          }
        });

        const isUrgent = needed > 0 && needed >= remainingEligible;
        const hasReachedTarget = curAssigned >= target;

        let score = 0;
        if (isUrgent) score += 10000;
        if (!hasReachedTarget) score += 2000;
        score += needed * 100;
        score -= curAssigned * 10;
        return score;
      };

      const sortedCandidates = shuffleArray(activeInvs).sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

      for (let idx = 0; idx < roomCount; idx++) {
        const r = startRoom + idx;
        let chosen = sortedCandidates.find(inv =>
          !sessionUsedInvs.has(inv.id) &&
          !roomHistory.get(inv.id)?.has(r) &&
          (!avoidTeaching || !isTeachingSubject(inv.subject, session.subjectName))
        ) || sortedCandidates.find(inv =>
          !sessionUsedInvs.has(inv.id) &&
          (!avoidTeaching || !isTeachingSubject(inv.subject, session.subjectName))
        ) || sortedCandidates.find(inv =>
          !sessionUsedInvs.has(inv.id) &&
          !roomHistory.get(inv.id)?.has(r)
        ) || sortedCandidates.find(inv => !sessionUsedInvs.has(inv.id));

        if (!chosen) {
          attemptViolations += 50;
          possible = false;
          break;
        }

        sessionUsedInvs.add(chosen.id);
        if (roomHistory.get(chosen.id)?.has(r)) attemptViolations += 2;
        roomHistory.get(chosen.id)?.add(r);
        assignedCount.set(chosen.id, (assignedCount.get(chosen.id) || 0) + 1);

        roomAssignments.push({
          roomNo: r,
          roomLabel: `Phòng ${String(r).padStart(2, '0')}`,
          invigilator1: chosen
        });
      }

      if (!possible) break;

      currentSessionsResult.push({
        sessionId: session.id,
        sessionName: session.sessionName,
        subjectName: cleanSubjectName(session.subjectName),
        date: session.date,
        shiftTime: session.shiftTime,
        roomAssignments,
        drawnAt: new Date().toLocaleTimeString('vi-VN')
      });
    }

    let dutySpreadViolation = 0;
    const normalInvs = activeInvs.filter(i => (i.quotaOffset || 0) === 0);
    if (normalInvs.length > 0) {
      const counts = normalInvs.map(i => assignedCount.get(i.id) || 0);
      const maxC = Math.max(...counts);
      const minC = Math.min(...counts);
      if (maxC - minC > 1) {
        dutySpreadViolation += (maxC - minC - 1) * 500;
      }
    }
    activeInvs.forEach(inv => {
      const tq = targetQuotas.get(inv.id) || 0;
      const ac = assignedCount.get(inv.id) || 0;
      const diff = Math.abs(ac - tq);
      if (diff > 1) {
        dutySpreadViolation += (diff - 1) * 300;
      } else if (diff === 1) {
        dutySpreadViolation += 5;
      }
    });
    attemptViolations += dutySpreadViolation;

    if (attemptViolations < bestViolations && currentSessionsResult.length === sessions.length) {
      bestViolations = attemptViolations;
      bestSessions = currentSessionsResult;
      if (bestViolations === 0) break;
    }
  }

  // Phân công cán bộ giám sát và giám thị dự phòng theo chuyên môn bộ môn và chỉ tiêu
  assignSupervisorsAndReserves(sessions, invigilators, bestSessions, options, targetQuotas, 'periodic');

  // Chạy thuật toán hoán đổi cân bằng ca BFS toàn diện cho định kỳ
  balanceDutiesAcrossSessionsBFS(bestSessions, activeInvs, targetQuotas, avoidTeaching, 1, 'periodic', []);

  const allEligibleInvs = invigilators.filter(i => {
    if (i.isAvailable === false) return false;
    if (i.role === 'Giám sát' || (i.code || '').toUpperCase().startsWith('GS')) return true;
    if (!i.role || i.role === 'Giám thị') return (i.quotaOffset ?? 0) > -50;
    return false;
  });

  const stats = buildInvigilatorStats(allEligibleInvs, bestSessions, 'periodic', targetQuotas);
  const validation = validatePlanResult(bestSessions, 'periodic', options, activeInvs);

  return {
    mode: 'periodic',
    sessions: bestSessions,
    stats,
    validation,
    generatedAt: new Date().toLocaleString('vi-VN')
  };
}

/**
 * Phân công Cán bộ Giám sát và Giám thị dự phòng cho từng buổi thi
 * - Ưu tiên giáo viên có chuyên môn bộ môn của buổi đó vào Giám sát hoặc Dự phòng tại Hội đồng (để xử lý các vấn đề liên quan đến đề thi)
 * - Đảm bảo chia đều số ca cho các cán bộ giám sát và dự phòng
 */
export function assignSupervisorsAndReserves(
  sessions: ExamSession[],
  allInvigilators: Invigilator[],
  sessionAssignments: SessionAssignmentResult[],
  options?: AssignmentOptions,
  targetQuotas?: Map<string, number>,
  mode: InvigilatorMode = 'survey_mock'
): void {
  // Lọc danh sách Cán bộ Giám sát
  const supervisorPool = allInvigilators.filter(i =>
    i.isAvailable !== false &&
    (i.role === 'Giám sát' || (i.code || '').toUpperCase().startsWith('GS'))
  );
  const supervisorDutyCount = new Map<string, number>();
  supervisorPool.forEach(i => supervisorDutyCount.set(i.id, 0));

  sessionAssignments.forEach((sessRes, sIdx) => {
    const origSession = sessions.find(s => s.id === sessRes.sessionId) || sessions[sIdx];
    const roomCount = origSession?.numRooms || sessRes.roomAssignments.length;
    const numSupNeeded = Math.max(1, origSession?.numSupervisors ?? Math.ceil(roomCount / 4));
    const numResNeeded = Math.max(1, origSession?.numReserves ?? 2);

    // Ca 2 tiếp nối: Giữ nguyên giám sát và dự phòng của ca 1
    if (sIdx > 0 && isSessionContinuation(origSession, sessions[sIdx - 1], mode)) {
      const prev = sessionAssignments[sIdx - 1];
      sessRes.supervisors = [...(prev.supervisors || [])];
      sessRes.reserveInvigilators = [...(prev.reserveInvigilators || [])];
      return;
    }

    // 1. Phân công Giám sát buổi thi:
    // Ưu tiên giám sát có chuyên môn giảng dạy môn thi của buổi đó
    const assignedSup: Invigilator[] = [];
    if (supervisorPool.length > 0) {
      const sortedSupervisors = [...supervisorPool].sort((a, b) => {
        const aTeach = isTeachingSubject(a.subject, sessRes.subjectName) ? 1 : 0;
        const bTeach = isTeachingSubject(b.subject, sessRes.subjectName) ? 1 : 0;
        if (aTeach !== bTeach) return bTeach - aTeach;
        return (supervisorDutyCount.get(a.id) || 0) - (supervisorDutyCount.get(b.id) || 0);
      });

      const chosen = sortedSupervisors.slice(0, numSupNeeded);
      chosen.forEach(sup => {
        assignedSup.push(sup);
        supervisorDutyCount.set(sup.id, (supervisorDutyCount.get(sup.id) || 0) + 1);
      });
    }
    sessRes.supervisors = assignedSup;

    // 2. Phân công Giám thị dự phòng:
    // Đếm số ca độc lập thực tế hiện tại của các giáo viên
    const currentDutyCounts = getTeacherIndependentDutyCounts(sessionAssignments, mode);

    const usedInSession = new Set<string>();
    sessRes.roomAssignments.forEach(r => {
      if (r.invigilator1) usedInSession.add(r.invigilator1.id);
      if (r.invigilator2) usedInSession.add(r.invigilator2.id);
    });
    assignedSup.forEach(s => usedInSession.add(s.id));

    const eligibleReserves = allInvigilators.filter(i =>
      !usedInSession.has(i.id) &&
      i.isAvailable !== false &&
      (i.quotaOffset ?? 0) > -50 &&
      (!i.role || i.role === 'Giám thị')
    );

    // Tiêu chí sắp xếp dự phòng thông minh:
    // 1. Giáo viên đang thiếu ca nhiều nhất so với targetQuota
    // 2. Giáo viên có tổng số ca hiện tại ít nhất
    // 3. Ưu tiên giáo viên bộ môn làm dự phòng (vừa trực tiếp ở Hội đồng xử lý thắc mắc đề thi, vừa không vào phòng coi học sinh làm bài)
    const sortedReserves = [...eligibleReserves].sort((a, b) => {
      const aCurrent = currentDutyCounts.get(a.id) || 0;
      const bCurrent = currentDutyCounts.get(b.id) || 0;
      const aTarget = targetQuotas?.get(a.id) || 0;
      const bTarget = targetQuotas?.get(b.id) || 0;

      const aDeficit = aTarget - aCurrent;
      const bDeficit = bTarget - bCurrent;

      if (aDeficit !== bDeficit) {
        return bDeficit - aDeficit; // Thiếu nhiều ca hơn được xếp trước
      }
      if (aCurrent !== bCurrent) {
        return aCurrent - bCurrent; // Đang có ít ca hơn được xếp trước
      }
      const aTeach = isTeachingSubject(a.subject, sessRes.subjectName) ? 1 : 0;
      const bTeach = isTeachingSubject(b.subject, sessRes.subjectName) ? 1 : 0;
      return bTeach - aTeach;
    });

    const chosenRes = sortedReserves.slice(0, numResNeeded);
    sessRes.reserveInvigilators = chosenRes;
  });
}

/**
 * Rút gọn tên buổi thi để hiển thị ngắn gọn, rõ ràng (VD: "Buổi 1 (Sáng Ngày 1)" -> "Buổi 1")
 */
export function formatSessionShortLabel(sessionName: string): string {
  const m = sessionName.match(/Buổi\s*(\d+)/i) || sessionName.match(/B(\d+)/i);
  if (m) {
    return `Buổi ${m[1]}`;
  }
  const parts = sessionName.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
}

/**
 * Xây dựng bảng thống kê chi tiết cho từng giáo viên
 */
function buildInvigilatorStats(
  invigilators: Invigilator[],
  sessions: SessionAssignmentResult[],
  mode: InvigilatorMode,
  precomputedTargets?: Map<string, number>
): InvigilatorStats[] {
  const statsMap = new Map<string, InvigilatorStats>();

  invigilators.forEach(inv => {
    statsMap.set(inv.id, {
      invigilatorId: inv.id,
      code: inv.code,
      fullName: inv.fullName,
      schoolOrDept: inv.schoolOrDept,
      subject: inv.subject,
      quotaOffset: inv.quotaOffset || 0,
      totalAssigned: 0,
      targetQuota: precomputedTargets?.get(inv.id) ?? 0,
      balanceDiff: 0,
      sessionDetails: []
    });
  });

  sessions.forEach((session, sIdx) => {
    // Kiểm tra nếu là ca 2 của cùng buổi sáng thi tự chọn (Buổi 3):
    // Cặp giám thị ngồi cố định 1 phòng cho cả 2 ca, tính đúng 1 ca coi thi cho buổi sáng này
    const isContinuation = isSessionContinuation(session, sIdx > 0 ? sessions[sIdx - 1] : undefined, mode);

    // Đối với thi thử / khảo sát: Buổi 3 gồm 2 ca tự chọn liên tiếp (Ca 1 & Ca 2),
    // Giám thị coi đúng 1 phòng cho cả 2 ca theo quy chế.
    // Ca 1 đã được tính 1 ca coi thi và ghi nhận chi tiết phòng thi.
    // Bỏ qua ca 2, không ghi lặp lại vào sessionDetails để bảng chấm công không bị rối như coi 3 ca!
    if (isContinuation) {
      return;
    }

    session.roomAssignments.forEach(room => {
      // Giám thị 1 (hoặc Giám thị duy nhất)
      const inv1 = room.invigilator1;
      if (inv1 && statsMap.has(inv1.id)) {
        const s = statsMap.get(inv1.id)!;
        s.totalAssigned++;
        s.sessionDetails.push({
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          roomNo: room.roomNo,
          role: mode === 'survey_mock'
            ? (room.invigilator2 ? 'Giám thị 1' : 'Giám thị')
            : 'Giám thị',
          partnerName: room.invigilator2?.fullName,
          partnerUnit: room.invigilator2?.schoolOrDept
        });
      }

      // Giám thị 2 (nếu có)
      const inv2 = room.invigilator2;
      if (inv2 && statsMap.has(inv2.id)) {
        const s = statsMap.get(inv2.id)!;
        s.totalAssigned++;
        s.sessionDetails.push({
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          roomNo: room.roomNo,
          role: 'Giám thị 2',
          partnerName: room.invigilator1?.fullName,
          partnerUnit: room.invigilator1?.schoolOrDept
        });
      }
    });

    // Cán bộ Giám sát
    session.supervisors?.forEach(sup => {
      if (statsMap.has(sup.id)) {
        const s = statsMap.get(sup.id)!;
        s.totalAssigned++;
        s.sessionDetails.push({
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          roomNo: 0,
          role: 'Giám sát',
          partnerName: 'Tổ Giám sát'
        });
      }
    });

    // Giám thị dự phòng
    session.reserveInvigilators?.forEach(res => {
      if (statsMap.has(res.id)) {
        const s = statsMap.get(res.id)!;
        s.totalAssigned++;
        s.sessionDetails.push({
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          roomNo: 0,
          role: 'Dự phòng',
          partnerName: 'Dự phòng HĐ thi'
        });
      }
    });
  });

  const totalAssignedAll = Array.from(statsMap.values()).reduce((sum, s) => sum + s.totalAssigned, 0);
  const avgDuty = totalAssignedAll / (invigilators.length || 1);

  statsMap.forEach(s => {
    if (precomputedTargets && precomputedTargets.has(s.invigilatorId)) {
      s.targetQuota = precomputedTargets.get(s.invigilatorId)!;
    } else {
      // Cán bộ giám sát hoặc nhân sự đặc thù: targetQuota bằng đúng số ca được phân công
      s.targetQuota = s.totalAssigned;
    }
    s.balanceDiff = s.totalAssigned - s.targetQuota;
  });

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.totalAssigned !== a.totalAssigned) {
      return b.totalAssigned - a.totalAssigned;
    }
    return a.fullName.localeCompare(b.fullName, 'vi');
  });
}

/**
 * Kiểm tra các ràng buộc quy chế và tính hợp lệ của phương án
 */
function validatePlanResult(
  sessions: SessionAssignmentResult[],
  mode: InvigilatorMode,
  options?: AssignmentOptions,
  activeInvs?: Invigilator[]
): ValidationReport {
  const avoidTeaching = options?.avoidTeachingSubject === true;
  const numInv = options?.invigilatorsPerRoom ?? (sessions.some(s => s.roomAssignments.some(r => Boolean(r.invigilator2))) ? 2 : 1);
  let duplicatePairsCount = 0;
  let duplicateRoomsCount = 0;
  let sameUnitPairsCount = 0;
  let teachingSubjectViolationsCount = 0;
  const details: { type: 'error' | 'warning' | 'info'; message: string }[] = [];

  const seenPairs = new Set<string>();
  const seenRooms = new Map<string, Set<number>>();

  sessions.forEach((ses, sesIdx) => {
    const isContinuation = isSessionContinuation(ses, sesIdx > 0 ? sessions[sesIdx - 1] : undefined, mode);

    ses.roomAssignments.forEach(r => {
      const inv1 = r.invigilator1;
      const inv2 = r.invigilator2;

      // Kiểm tra trùng phòng cho Giám thị 1
      if (inv1) {
        if (!seenRooms.has(inv1.id)) seenRooms.set(inv1.id, new Set<number>());
        if (!isContinuation && seenRooms.get(inv1.id)?.has(r.roomNo)) {
          duplicateRoomsCount++;
          details.push({
            type: 'warning',
            message: `Giám thị ${inv1.fullName} bị trùng phân công tại ${r.roomLabel} (${ses.sessionName})`
          });
        }
        seenRooms.get(inv1.id)?.add(r.roomNo);

        if (avoidTeaching && isTeachingSubject(inv1.subject, ses.subjectName)) {
          teachingSubjectViolationsCount++;
          details.push({
            type: 'warning',
            message: `Giám thị ${inv1.fullName} môn ${inv1.subject} coi thi môn ${ses.subjectName} tại ${r.roomLabel}`
          });
        }
      }

      // Kiểm tra cho Giám thị 2 (nếu có)
      if (inv2) {
        if (!seenRooms.has(inv2.id)) seenRooms.set(inv2.id, new Set<number>());
        if (!isContinuation && seenRooms.get(inv2.id)?.has(r.roomNo)) {
          duplicateRoomsCount++;
          details.push({
            type: 'warning',
            message: `Giám thị ${inv2.fullName} bị trùng phân công tại ${r.roomLabel} (${ses.sessionName})`
          });
        }
        seenRooms.get(inv2.id)?.add(r.roomNo);

        if (avoidTeaching && isTeachingSubject(inv2.subject, ses.subjectName)) {
          teachingSubjectViolationsCount++;
        }

        // Kiểm tra cùng đơn vị giữa Giám thị 1 và Giám thị 2
        if (inv1 && inv1.schoolOrDept === inv2.schoolOrDept) {
          sameUnitPairsCount++;
          details.push({
            type: 'error',
            message: `Tại ${r.roomLabel} (${ses.sessionName}): Cặp giám thị ${inv1.fullName} & ${inv2.fullName} cùng thuộc đơn vị/tổ [${inv1.schoolOrDept}]`
          });
        }

        // Kiểm tra trùng cặp (không tính ca 2 của cùng buổi sáng)
        if (inv1) {
          const pairKey1 = `${inv1.id}__${inv2.id}`;
          const pairKey2 = `${inv2.id}__${inv1.id}`;
          if (!isContinuation && (seenPairs.has(pairKey1) || seenPairs.has(pairKey2))) {
            duplicatePairsCount++;
            details.push({
              type: 'error',
              message: `Cặp giám thị [${inv1.fullName} - ${inv2.fullName}] bị lặp lại tại ${r.roomLabel} (${ses.sessionName})`
            });
          }
          seenPairs.add(pairKey1);
          seenPairs.add(pairKey2);
        }
      }
    });
  });

  // Tính chênh lệch ca thực tế giữa các giáo viên cùng điều kiện (quotaOffset = 0)
  let maxDutyDiff = 0;
  if (activeInvs && activeInvs.length > 0) {
    const normalInvs = activeInvs.filter(i => (i.quotaOffset || 0) === 0);
    if (normalInvs.length > 1) {
      const countsMap = getTeacherIndependentDutyCounts(sessions, mode);
      const counts = normalInvs.map(i => countsMap.get(i.id) || 0);
      maxDutyDiff = Math.max(...counts) - Math.min(...counts);
    }
  }

  const isValid = numInv === 1
    ? duplicateRoomsCount === 0 || duplicateRoomsCount <= 2
    : duplicatePairsCount === 0 && sameUnitPairsCount === 0;

  if (isValid) {
    details.unshift({
      type: 'info',
      message: mode === 'survey_mock'
        ? (numInv === 1
            ? 'Phương án bốc thăm (1 Giám thị/phòng) đạt chuẩn: Tiết kiệm kinh phí, phân bổ ca đồng đều nhất và hạn chế trùng phòng!'
            : 'Phương án bốc thăm (2 Giám thị/phòng) đạt chuẩn: Cân bằng số ca tối ưu, Giám thị 1 và Giám thị 2 khác đơn vị, không trùng cặp!')
        : 'Phương án phân công kiểm tra định kỳ cân bằng công bằng, tuân thủ đúng định mức và bù trừ quota.'
    });
  }

  return {
    isValid,
    duplicatePairsCount,
    duplicateRoomsCount,
    sameUnitPairsCount,
    teachingSubjectViolationsCount,
    maxDutyDiff,
    details
  };
}

/**
 * Tính số ca coi thi độc lập thực tế của từng giáo viên (không tính trùng ca tiếp nối Ca 2)
 * Bao gồm cả ca coi thi phòng thi, ca giám sát và ca giám thị dự phòng
 */
export function getTeacherIndependentDutyCounts(
  sessions: SessionAssignmentResult[],
  mode: InvigilatorMode
): Map<string, number> {
  const counts = new Map<string, number>();
  sessions.forEach((ses, idx) => {
    const isCont = isSessionContinuation(ses, idx > 0 ? sessions[idx - 1] : undefined, mode);
    if (isCont) return;

    ses.roomAssignments.forEach(ra => {
      if (ra.invigilator1) {
        counts.set(ra.invigilator1.id, (counts.get(ra.invigilator1.id) || 0) + 1);
      }
      if (ra.invigilator2) {
        counts.set(ra.invigilator2.id, (counts.get(ra.invigilator2.id) || 0) + 1);
      }
    });

    ses.supervisors?.forEach(sup => {
      counts.set(sup.id, (counts.get(sup.id) || 0) + 1);
    });

    ses.reserveInvigilators?.forEach(res => {
      counts.set(res.id, (counts.get(res.id) || 0) + 1);
    });
  });
  return counts;
}

/**
 * Tính toán lại Thống kê và Báo cáo kiểm tra khi người dùng điều chỉnh thủ công
 */
export function recalculatePlanStatsAndValidation(
  plan: InvigilatorPlanResult,
  invigilators: Invigilator[],
  options?: AssignmentOptions
): InvigilatorPlanResult {
  const activeInvs = invigilators.filter(inv => {
    if (inv.role && inv.role !== 'Giám thị') return false;
    return (inv.quotaOffset ?? 0) > -50 && inv.isAvailable !== false;
  });
  const mergedOptions: AssignmentOptions = {
    ...options,
    invigilatorsPerRoom: options?.invigilatorsPerRoom ?? plan.invigilatorsPerRoom
  };
  const avoidTeaching = mergedOptions.avoidTeachingSubject === true;
  const numInv = mergedOptions.invigilatorsPerRoom ?? 2;
  const targets = computeFairTargetQuotas(activeInvs, plan.sessions.map(s => ({
    id: s.sessionId,
    sessionName: s.sessionName,
    subjectName: s.subjectName,
    date: s.date,
    shiftTime: s.shiftTime,
    numRooms: s.roomAssignments.length,
    numReserves: s.reserveInvigilators?.length ?? 2,
    numSupervisors: s.supervisors?.length
  })), numInv, plan.mode, avoidTeaching);

  const allEligibleInvs = invigilators.filter(i => {
    if (i.isAvailable === false) return false;
    if (i.role === 'Giám sát' || (i.code || '').toUpperCase().startsWith('GS')) return true;
    if (!i.role || i.role === 'Giám thị') return (i.quotaOffset ?? 0) > -50;
    return false;
  });

  const stats = buildInvigilatorStats(allEligibleInvs, plan.sessions, plan.mode, targets);
  const validation = validatePlanResult(plan.sessions, plan.mode, mergedOptions, activeInvs);
  return {
    ...plan,
    stats,
    validation
  };
}

/**
 * Thuật toán hoán đổi cân bằng ca đa bước toàn diện (Comprehensive Multi-Hop Residual BFS Balancing):
 * - Hỗ trợ hoán đổi và điều chuyển cả ca coi thi phòng thi VÀ ca giám thị dự phòng
 * - Tìm đường truyền dòng (Augmenting Path) từ giáo viên thừa ca (Donor) sang giáo viên thiếu ca (Recipient)
 * - Triệt tiêu 100% hiện tượng chênh lệch ca > 1 giữa các giáo viên cùng điều kiện (nhóm quotaOffset)
 * - Đảm bảo chênh lệch số ca giữa bất kỳ 2 giáo viên cùng quotaOffset nào luôn <= 1 (tối ưu tuyệt đối)
 * - Đồng bộ tức thì các ca tiếp nối (Ca 2 tự chọn của Buổi 3)
 */
function balanceDutiesAcrossSessionsBFS(
  sessionsResult: SessionAssignmentResult[],
  activeInvs: Invigilator[],
  targetQuotas: Map<string, number>,
  avoidTeaching: boolean,
  numInvPerRoom: 1 | 2,
  mode: InvigilatorMode,
  unitsList: string[]
): void {
  const invMap = new Map<string, Invigilator>();
  activeInvs.forEach(inv => invMap.set(inv.id, inv));

  const maxPasses = 120;
  for (let pass = 0; pass < maxPasses; pass++) {
    const dutyCounts = getTeacherIndependentDutyCounts(sessionsResult, mode);
    activeInvs.forEach(inv => {
      if (!dutyCounts.has(inv.id)) dutyCounts.set(inv.id, 0);
    });

    // Gom giáo viên theo nhóm quotaOffset (0, -1, -2, ...)
    const offsetGroups = new Map<number, string[]>();
    activeInvs.forEach(inv => {
      const off = inv.quotaOffset || 0;
      if (!offsetGroups.has(off)) offsetGroups.set(off, []);
      offsetGroups.get(off)!.push(inv.id);
    });

    // Kiểm tra xem trong bất kỳ nhóm quotaOffset nào còn chênh lệch > 1 không
    let maxSpreadInAnyGroup = 0;
    offsetGroups.forEach(ids => {
      const counts = ids.map(id => dutyCounts.get(id) || 0);
      const sp = Math.max(...counts) - Math.min(...counts);
      if (sp > maxSpreadInAnyGroup) maxSpreadInAnyGroup = sp;
    });

    let hasTargetDisparity = false;
    for (const inv of activeInvs) {
      const target = targetQuotas.get(inv.id) || 0;
      const actual = dutyCounts.get(inv.id) || 0;
      if (Math.abs(actual - target) > 1) {
        hasTargetDisparity = true;
        break;
      }
    }

    if (maxSpreadInAnyGroup <= 1 && !hasTargetDisparity) {
      // Đã đạt độ chênh lệch tối thiểu tuyệt đối (<= 1) cho tất cả các nhóm!
      break;
    }

    // Xác định tập hợp Donors và Recipients
    const donors = new Set<string>();
    const recipients = new Set<string>();

    offsetGroups.forEach(ids => {
      const counts = ids.map(id => dutyCounts.get(id) || 0);
      const maxC = Math.max(...counts);
      const minC = Math.min(...counts);
      ids.forEach(id => {
        const actual = dutyCounts.get(id) || 0;
        const target = targetQuotas.get(id) || 0;
        if ((maxC - minC > 1 && actual === maxC) || actual > target) {
          donors.add(id);
        }
        if ((maxC - minC > 1 && actual === minC) || actual < target) {
          recipients.add(id);
        }
      });
    });

    if (donors.size === 0 || recipients.size === 0) break;

    // ƯU TIÊN 1: Hoán đổi trực tiếp 1 bước (1-step Direct Transfer)
    let swappedDirect = false;

    // 1A. Chuyển ca Dự phòng từ Donor sang Recipient
    for (const dId of donors) {
      if (swappedDirect) break;
      for (const rId of recipients) {
        if (swappedDirect) break;
        const rInv = invMap.get(rId);
        if (!rInv) continue;

        for (let sIdx = 0; sIdx < sessionsResult.length; sIdx++) {
          const session = sessionsResult[sIdx];
          if (isSessionContinuation(session, sIdx > 0 ? sessionsResult[sIdx - 1] : undefined, mode)) continue;

          const isReserve = session.reserveInvigilators?.some(res => res.id === dId);
          if (!isReserve) continue;

          // Kiểm tra rId có rảnh ở buổi này không
          const rInRoom = session.roomAssignments.some(ra => ra.invigilator1?.id === rId || ra.invigilator2?.id === rId);
          const rInRes = session.reserveInvigilators?.some(res => res.id === rId);
          const rInSup = session.supervisors?.some(sup => sup.id === rId);

          if (!rInRoom && !rInRes && !rInSup) {
            session.reserveInvigilators = session.reserveInvigilators?.map(res => res.id === dId ? rInv : res);

            if (sIdx + 1 < sessionsResult.length && isSessionContinuation(sessionsResult[sIdx + 1], session, mode)) {
              sessionsResult[sIdx + 1].reserveInvigilators = sessionsResult[sIdx + 1].reserveInvigilators?.map(res => res.id === dId ? rInv : res);
            }
            swappedDirect = true;
            break;
          }
        }
      }
    }

    if (swappedDirect) continue;

    // 1B. Chuyển ca Phòng thi trực tiếp từ Donor sang Recipient
    for (const dId of donors) {
      if (swappedDirect) break;
      for (const rId of recipients) {
        if (swappedDirect) break;
        const rInv = invMap.get(rId);
        if (!rInv) continue;

        for (let sIdx = 0; sIdx < sessionsResult.length; sIdx++) {
          const session = sessionsResult[sIdx];
          if (isSessionContinuation(session, sIdx > 0 ? sessionsResult[sIdx - 1] : undefined, mode)) continue;

          const rInRoom = session.roomAssignments.some(ra => ra.invigilator1?.id === rId || ra.invigilator2?.id === rId);
          const rInRes = session.reserveInvigilators?.some(res => res.id === rId);
          const rInSup = session.supervisors?.some(sup => sup.id === rId);
          if (rInRoom || rInRes || rInSup) continue;

          if (avoidTeaching && isTeachingSubject(rInv.subject, session.subjectName)) continue;

          for (let rIdx = 0; rIdx < session.roomAssignments.length; rIdx++) {
            const ra = session.roomAssignments[rIdx];
            if (ra.invigilator1?.id === dId) {
              if (ra.invigilator2 && unitsList.length >= 2 && ra.invigilator2.schoolOrDept === rInv.schoolOrDept) continue;
              ra.invigilator1 = rInv;
              if (sIdx + 1 < sessionsResult.length && isSessionContinuation(sessionsResult[sIdx + 1], session, mode)) {
                sessionsResult[sIdx + 1].roomAssignments[rIdx].invigilator1 = rInv;
              }
              swappedDirect = true;
              break;
            } else if (ra.invigilator2?.id === dId) {
              if (ra.invigilator1 && unitsList.length >= 2 && ra.invigilator1.schoolOrDept === rInv.schoolOrDept) continue;
              ra.invigilator2 = rInv;
              if (sIdx + 1 < sessionsResult.length && isSessionContinuation(sessionsResult[sIdx + 1], session, mode)) {
                sessionsResult[sIdx + 1].roomAssignments[rIdx].invigilator2 = rInv;
              }
              swappedDirect = true;
              break;
            }
          }
          if (swappedDirect) break;
        }
      }
    }

    if (swappedDirect) continue;

    // ƯU TIÊN 2: Multi-Hop BFS Balancing (cho phép đỉnh trung gian có duty <= target)
    interface EdgeStep {
      fromId: string;
      toId: string;
      sessionIdx: number;
      slotType: 'room1' | 'room2' | 'reserve';
      roomIdx?: number;
    }

    const queue: string[] = Array.from(donors);
    const visited = new Set<string>(queue);
    const parent = new Map<string, EdgeStep>();
    let targetFoundRecipient: string | null = null;

    while (queue.length > 0 && !targetFoundRecipient) {
      const currId = queue.shift()!;
      const currInv = invMap.get(currId);
      if (!currInv) continue;

      for (let sIdx = 0; sIdx < sessionsResult.length; sIdx++) {
        const session = sessionsResult[sIdx];
        if (isSessionContinuation(session, sIdx > 0 ? sessionsResult[sIdx - 1] : undefined, mode)) continue;

        // Case 1: currId trong phòng thi
        for (let rIdx = 0; rIdx < session.roomAssignments.length; rIdx++) {
          const ra = session.roomAssignments[rIdx];
          let role: 1 | 2 | null = null;
          let partner: Invigilator | undefined;
          if (ra.invigilator1?.id === currId) {
            role = 1;
            partner = ra.invigilator2;
          } else if (ra.invigilator2?.id === currId) {
            role = 2;
            partner = ra.invigilator1;
          }
          if (!role) continue;

          for (const cand of activeInvs) {
            if (visited.has(cand.id)) continue;
            const inSession = session.roomAssignments.some(r => r.invigilator1?.id === cand.id || r.invigilator2?.id === cand.id) ||
              session.reserveInvigilators?.some(res => res.id === cand.id) ||
              session.supervisors?.some(sup => sup.id === cand.id);
            if (inSession) continue;

            if (avoidTeaching && isTeachingSubject(cand.subject, session.subjectName)) continue;
            if (partner && unitsList.length >= 2 && cand.schoolOrDept === partner.schoolOrDept) continue;

            if (!recipients.has(cand.id)) {
              const candDuty = dutyCounts.get(cand.id) || 0;
              if (candDuty > (targetQuotas.get(cand.id) || 0)) continue;
            }

            visited.add(cand.id);
            parent.set(cand.id, {
              fromId: currId,
              toId: cand.id,
              sessionIdx: sIdx,
              slotType: role === 1 ? 'room1' : 'room2',
              roomIdx: rIdx
            });

            if (recipients.has(cand.id)) {
              targetFoundRecipient = cand.id;
              break;
            }
            queue.push(cand.id);
          }
          if (targetFoundRecipient) break;
        }
        if (targetFoundRecipient) break;

        // Case 2: currId là Giám thị dự phòng
        const isReserve = session.reserveInvigilators?.some(res => res.id === currId);
        if (isReserve) {
          for (const cand of activeInvs) {
            if (visited.has(cand.id)) continue;
            const inSession = session.roomAssignments.some(r => r.invigilator1?.id === cand.id || r.invigilator2?.id === cand.id) ||
              session.reserveInvigilators?.some(res => res.id === cand.id) ||
              session.supervisors?.some(sup => sup.id === cand.id);
            if (inSession) continue;

            if (!recipients.has(cand.id)) {
              const candDuty = dutyCounts.get(cand.id) || 0;
              if (candDuty > (targetQuotas.get(cand.id) || 0)) continue;
            }

            visited.add(cand.id);
            parent.set(cand.id, {
              fromId: currId,
              toId: cand.id,
              sessionIdx: sIdx,
              slotType: 'reserve'
            });

            if (recipients.has(cand.id)) {
              targetFoundRecipient = cand.id;
              break;
            }
            queue.push(cand.id);
          }
        }
        if (targetFoundRecipient) break;
      }
    }

    if (!targetFoundRecipient) break;

    // Áp dụng đường truyền augmenting path
    let curr = targetFoundRecipient;
    while (parent.has(curr)) {
      const step = parent.get(curr)!;
      const session = sessionsResult[step.sessionIdx];
      const replacementInv = invMap.get(step.toId);
      if (replacementInv) {
        if (step.slotType === 'room1' && step.roomIdx !== undefined) {
          session.roomAssignments[step.roomIdx].invigilator1 = replacementInv;
          if (step.sessionIdx + 1 < sessionsResult.length && isSessionContinuation(sessionsResult[step.sessionIdx + 1], session, mode)) {
            sessionsResult[step.sessionIdx + 1].roomAssignments[step.roomIdx].invigilator1 = replacementInv;
          }
        } else if (step.slotType === 'room2' && step.roomIdx !== undefined) {
          session.roomAssignments[step.roomIdx].invigilator2 = replacementInv;
          if (step.sessionIdx + 1 < sessionsResult.length && isSessionContinuation(sessionsResult[step.sessionIdx + 1], session, mode)) {
            sessionsResult[step.sessionIdx + 1].roomAssignments[step.roomIdx].invigilator2 = replacementInv;
          }
        } else if (step.slotType === 'reserve') {
          session.reserveInvigilators = session.reserveInvigilators?.map(res => res.id === step.fromId ? replacementInv : res);
          if (step.sessionIdx + 1 < sessionsResult.length && isSessionContinuation(sessionsResult[step.sessionIdx + 1], session, mode)) {
            sessionsResult[step.sessionIdx + 1].reserveInvigilators = sessionsResult[step.sessionIdx + 1].reserveInvigilators?.map(res => res.id === step.fromId ? replacementInv : res);
          }
        }
      }
      curr = step.fromId;
    }
  }
}
