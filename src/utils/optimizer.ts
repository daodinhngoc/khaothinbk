import { CandidateInput, CandidateAssigned, OptimizationResult, ShiftSummaryResult, ShiftRoomStat, ExamCategory, SurveyAllocationMode } from '../types';
import { compareVietnameseCandidates, generateNextSbd } from './vietnameseSort';
import { cleanGroupString, getCanonicalGroupKey, isSubjectRegistered, normalizeSubjectName, extractSubjectsFromGroup } from './subjectHelper';

/**
 * Chuẩn hóa tổ hợp tự chọn:
 * Ghép TC1 và TC2 thành chuỗi chuẩn không phân biệt thứ tự.
 * Ví dụ: 'Vật lý' và 'Hóa học' -> 'Hóa học - Vật lý'
 *        'Hóa học' và 'Vật lý' -> 'Hóa học - Vật lý'
 */
export function standardizeElectiveCombination(tc1: string = '', tc2: string = ''): string {
  const clean1 = (tc1 || '').trim();
  const clean2 = (tc2 || '').trim();
  if (!clean1 && !clean2) return 'Chung';
  if (!clean1) return clean2;
  if (!clean2) return clean1;
  const sorted = [clean1, clean2].sort((a, b) => a.localeCompare(b, 'vi'));
  return `${sorted[0]} - ${sorted[1]}`;
}

/**
 * Phân tích cú pháp số / mã phòng bắt đầu:
 * Ví dụ:
 *  - '01' -> prefix: '', startNum: 1, padLength: 2 (Phòng 01, Phòng 02...)
 *  - '1' -> prefix: '', startNum: 1, padLength: 1 (Phòng 1, Phòng 2...)
 *  - 'A01' -> prefix: 'A', startNum: 1, padLength: 2 (A01, A02...)
 *  - 'P01' -> prefix: 'P', startNum: 1, padLength: 2 (P01, P02...)
 *  - 'P.01' -> prefix: 'P.', startNum: 1, padLength: 2 (P.01, P.02...)
 *  - 'B101' -> prefix: 'B', startNum: 101, padLength: 3 (B101, B102...)
 */
export function parseStartRoomCode(input: string = '01') {
  const trimmed = (input || '01').trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (!match) {
    return { prefix: trimmed ? trimmed + ' ' : '', startNum: 1, padLength: 2 };
  }
  const prefix = match[1];
  const numStr = match[2];
  const startNum = parseInt(numStr, 10) || 1;
  const padLength = numStr.length;
  return { prefix, startNum, padLength };
}

export function getRoomCode(roomIndex1Based: number, startRoomCode: string = '01'): string {
  const { prefix, startNum, padLength } = parseStartRoomCode(startRoomCode);
  const currentNum = startNum + (roomIndex1Based - 1);
  const formattedNum = String(currentNum).padStart(padLength, '0');
  return `${prefix}${formattedNum}`;
}

export function getRoomDisplayLabel(roomIndex1Based: number, startRoomCode: string = '01'): string {
  const code = getRoomCode(roomIndex1Based, startRoomCode);
  if (code.toLowerCase().startsWith('phòng') || code.toLowerCase().startsWith('phong')) {
    return code;
  }
  return `Phòng ${code}`;
}

/**
 * Thuật toán xếp phòng thi tối ưu theo đúng yêu cầu:
 * A) KIỂM TRA ĐỊNH KỲ:
 *    1. Gom nhóm học sinh theo mã Nhóm (TN1, TN2, XH1, XH2...).
 *    2. Sắp xếp học sinh trong từng nhóm theo chuẩn tiếng Việt (Tên A-Z, Họ đệm A-Z).
 *    3. Đánh SBD tuần tự từ startSbd.
 *    4. Xếp phòng thi riêng theo từng nhóm (mỗi phòng tối đa maxPerRoom, phòng cuối có thể ít hơn).
 *
 * B) THI THỬ / KHẢO SÁT:
 *    1. Sắp xếp toàn bộ học sinh toàn trường theo chuẩn tiếng Việt (Tên A-Z, Họ đệm A-Z).
 *    2. Đánh SBD liên tục từ startSbd cho danh sách đã sắp xếp.
 *    3. Chuẩn hóa tổ hợp tự chọn (TC1 & TC2) và gom nhóm các tổ hợp tương thích.
 *    4. Sắp xếp theo Tổ hợp tự chọn -> theo SBD đã đánh.
 *    5. Phân bổ vào từng phòng từ 1 đến N (tối đa maxPerRoom).
 */
export function optimizeRoomAllocation(
  candidates: CandidateInput[],
  maxPerRoom: number = 24,
  startRoomCode: string = '01',
  examCategory: ExamCategory = 'Kiểm tra định kỳ',
  startSbd: string = '52830001',
  balanceRoomsInGroup: boolean = true,
  surveyAllocationMode: SurveyAllocationMode = 'bo_gddt_rolling_fit'
): OptimizationResult {
  if (!candidates || candidates.length === 0) {
    return {
      candidates: [],
      totalCandidates: 0,
      totalRooms: 0,
      combosCount: 0,
      lastRoomCandidatesCount: 0,
      combosDistribution: [],
      roomsList: []
    };
  }

  let assigned: CandidateAssigned[] = [];

  if (examCategory.includes('Kiểm tra')) {
    // ----------------------------------------------------
    // TRƯỜNG HỢP 1: KIỂM TRA ĐỊNH KỲ (QUY TẮC CHIA THEO NHÓM MÔN HỌC)
    // ----------------------------------------------------
    // 1. Chuẩn hóa mã nhóm cho từng thí sinh và gom nhóm bằng Canonical Key
    interface GroupBucket {
      canonicalKey: string;
      displayName: string;
      candidates: CandidateInput[];
    }
    const groupBucketMap = new Map<string, GroupBucket>();
    const groupOrder: string[] = []; // Giữ thứ tự xuất hiện gốc của các nhóm

    candidates.forEach(c => {
      // Nhận diện mã nhóm từ nhiều tiêu đề cột thông dụng
      let rawGrp = (
        c.Nhóm ||
        c['Nhóm'] ||
        c.Nhom ||
        (c as any)['Tổ hợp'] ||
        (c as any)['tổ hợp'] ||
        (c as any)['TỔ HỢP'] ||
        (c as any).ToHop ||
        (c as any).tohop ||
        (c as any)['Nhóm môn'] ||
        (c as any)['Tổ hợp môn'] ||
        (c as any)['Mã nhóm'] ||
        (c as any)['Môn lựa chọn'] ||
        (c as any)['Môn tự chọn'] ||
        (c as any).Ban ||
        ''
      ).trim();

      // Nếu không có cột nhóm đơn lẻ, tìm các cột môn tự chọn ghép lại
      if (!rawGrp) {
        const electives = [
          c.TC1,
          c.TC2,
          (c as any).TC3,
          (c as any).TC4,
          (c as any)['Môn 1'],
          (c as any)['Môn 2'],
          (c as any)['Môn 3'],
          (c as any)['Môn 4'],
        ].filter(Boolean);
        if (electives.length >= 2) {
          rawGrp = electives.join('-');
        }
      }
      if (!rawGrp) rawGrp = 'Chung';

      const cleaned = cleanGroupString(rawGrp);
      const cKey = getCanonicalGroupKey(cleaned);

      if (!groupBucketMap.has(cKey)) {
        groupBucketMap.set(cKey, {
          canonicalKey: cKey,
          displayName: cleaned,
          candidates: []
        });
        groupOrder.push(cKey);
      }
      groupBucketMap.get(cKey)!.candidates.push(c);
    });

    // 2. Chia hết theo từng nhóm dứt điểm
    let currentRoomIndex = 1;
    let globalSbdOffset = 0;
    let globalIndex = 0;

    groupOrder.forEach(cKey => {
      const bucket = groupBucketMap.get(cKey)!;
      const groupDisplayName = bucket.displayName;
      const studentsInGroup = bucket.candidates;

      // Sắp xếp tiếng Việt A-Z chuẩn từ điển (Tên A-Z, trùng Tên thì Họ đệm A-Z)
      studentsInGroup.sort(compareVietnameseCandidates);

      const totalStudents = studentsInGroup.length;
      if (totalStudents === 0) return;

      // QUY TẮC CHIA PHÒNG CHO NHÓM:
      let roomChunks: CandidateInput[][] = [];

      if (balanceRoomsInGroup) {
        // CHẾ ĐỘ CHIA ĐỀU SĨ SỐ TRONG NHÓM:
        const numRooms = Math.ceil(totalStudents / maxPerRoom);
        const baseSize = Math.floor(totalStudents / numRooms);
        const remainder = totalStudents % numRooms;

        let cursor = 0;
        for (let r = 0; r < numRooms; r++) {
          const roomSize = baseSize + (r < remainder ? 1 : 0);
          roomChunks.push(studentsInGroup.slice(cursor, cursor + roomSize));
          cursor += roomSize;
        }
      } else {
        // CHẾ ĐỘ CẮT ĐỦ maxPerRoom (Cắt cứng 24 rồi dồn phần dư phòng cuối)
        for (let i = 0; i < totalStudents; i += maxPerRoom) {
          roomChunks.push(studentsInGroup.slice(i, i + maxPerRoom));
        }
      }

      // Xếp dứt điểm từng phòng của nhóm này
      roomChunks.forEach(chunk => {
        chunk.forEach((cand, idxInChunk) => {
          const generatedSbd = cand.SBD && cand.SBD.trim() !== ''
            ? cand.SBD
            : generateNextSbd(startSbd, globalSbdOffset);

          globalSbdOffset++;
          globalIndex++;

          assigned.push({
            ...cand,
            SBD: generatedSbd,
            Nhóm: groupDisplayName,
            ToHop_ChuanHoa: groupDisplayName,
            TT: globalIndex,
            'Phòng thi': currentRoomIndex,
            STT_Phong: idxInChunk + 1,
            roomCode: getRoomCode(currentRoomIndex, startRoomCode),
          });
        });
        currentRoomIndex++;
      });
    });

  } else {
    // ----------------------------------------------------
    // TRƯỜNG HỢP 2: THI THỬ / KHẢO SÁT - THUẬT TOÁN BỘ GD&ĐT (ROLLING-FIT 2.0)
    // Mục tiêu:
    // 1. Cố định thí sinh (1 SBD & 1 Phòng thi duy nhất cho tất cả các môn Toán, Văn, Ca 1, Ca 2).
    // 2. Gom nhóm theo tần suất tổ hợp môn tự chọn (nhóm đông nhất xếp trước).
    // 3. Cắt phòng cuốn chiếu (Rolling Fill) định mức 24 thí sinh/phòng.
    // 4. Tuyệt đại đa số phòng thi (~85%) là phòng thuần 1 môn, các phòng giao thoa chia theo khối môn liền kề rõ ràng.
    // ----------------------------------------------------

    // BƯỚC 1: SẮP XẾP ALPHABET TOÀN TRƯỜNG & ĐÁNH SỐ BÁO DANH (SBD) LIÊN TỤC
    const hasPreassignedSbd = candidates.some(c => c.SBD && String(c.SBD).trim() !== '');

    let alphabetOrdered: CandidateInput[];
    if (hasPreassignedSbd) {
      alphabetOrdered = [...candidates].sort((a, b) => {
        const sbdA = String(a.SBD || '').trim();
        const sbdB = String(b.SBD || '').trim();
        if (sbdA && sbdB) {
          return sbdA.localeCompare(sbdB, undefined, { numeric: true });
        }
        return compareVietnameseCandidates(a, b);
      });
    } else {
      alphabetOrdered = [...candidates].sort(compareVietnameseCandidates);
    }

    interface StudentWithSbdAndCombo extends CandidateInput {
      SBD: string;
      comboKey: string;
      displayName: string;
      isPartialOrFree: boolean;
    }

    // Cấp SBD liên tục cho toàn bộ thí sinh theo thứ tự Alphabet
    const studentsWithSbd: StudentWithSbdAndCombo[] = alphabetOrdered.map((cand, idx) => {
      const assignedSbd = cand.SBD && String(cand.SBD).trim() !== ''
        ? String(cand.SBD).trim()
        : generateNextSbd(startSbd, idx);

      // BƯỚC 2: XÁC ĐỊNH TỔ HỢP 2 MÔN TỰ CHỌN (Ca 1 & Ca 2)
      const rawTc1 = (cand.TC1 || (cand as any)['TC 1'] || (cand as any)['Môn 3'] || (cand as any)['Tự chọn 1'] || '').trim();
      const rawTc2 = (cand.TC2 || (cand as any)['TC 2'] || (cand as any)['Môn 4'] || (cand as any)['Tự chọn 2'] || '').trim();

      let explicitCombo = (
        (cand as any)['Tổ hợp'] ||
        (cand as any)['tổ hợp'] ||
        (cand as any)['TỔ HỢP'] ||
        (cand as any).ToHop ||
        (cand as any)['Tổ hợp môn'] ||
        (cand as any)['Nhóm'] ||
        ''
      ).trim();

      let tc1Norm = rawTc1 ? normalizeSubjectName(rawTc1) : '';
      let tc2Norm = rawTc2 ? normalizeSubjectName(rawTc2) : '';

      if (!tc1Norm && !tc2Norm && explicitCombo) {
        const parts = extractSubjectsFromGroup(explicitCombo);
        if (parts.length >= 2) {
          tc1Norm = parts[0];
          tc2Norm = parts[1];
        } else if (parts.length === 1) {
          tc1Norm = parts[0];
        }
      }

      const hasTc1 = isSubjectRegistered(tc1Norm);
      const hasTc2 = isSubjectRegistered(tc2Norm);

      let comboKey: string;
      let displayName: string;
      let isPartialOrFree = false;

      if (!hasTc1 && !hasTc2) {
        comboKey = 'ZZZ_TU_DO';
        displayName = 'Thí sinh tự do / Khác';
        isPartialOrFree = true;
      } else if (!hasTc1 || !hasTc2) {
        const single = hasTc1 ? tc1Norm : tc2Norm;
        comboKey = `ZZZ_LE_${single}`;
        displayName = `${single} (1 môn)`;
        isPartialOrFree = true;
      } else {
        // Cả 2 môn tự chọn: chuẩn hóa tên hai môn theo vần từ điển
        const sortedSubjs = [tc1Norm, tc2Norm].sort((a, b) => a.localeCompare(b, 'vi'));
        comboKey = `${sortedSubjs[0]} - ${sortedSubjs[1]}`;
        displayName = comboKey;
      }

      return {
        ...cand,
        SBD: assignedSbd,
        TC1: tc1Norm || cand.TC1,
        TC2: tc2Norm || cand.TC2,
        comboKey,
        displayName,
        isPartialOrFree,
      };
    });

    // Gom thành các cụm (Buckets) theo comboKey
    const comboBuckets = new Map<string, {
      comboKey: string;
      displayName: string;
      isPartialOrFree: boolean;
      students: StudentWithSbdAndCombo[];
    }>();

    studentsWithSbd.forEach(st => {
      if (!comboBuckets.has(st.comboKey)) {
        comboBuckets.set(st.comboKey, {
          comboKey: st.comboKey,
          displayName: st.displayName,
          isPartialOrFree: st.isPartialOrFree,
          students: []
        });
      }
      comboBuckets.get(st.comboKey)!.students.push(st);
    });

    // Bên trong mỗi cụm tổ hợp: Giữ nguyên thứ tự SBD (A-Z)
    comboBuckets.forEach(b => {
      b.students.sort((a, b) => {
        return String(a.SBD).localeCompare(String(b.SBD), undefined, { numeric: true });
      });
    });

    // Phân loại cụm đủ 2 môn và cụm lẻ / tự do
    const fullCombosList: { comboKey: string; displayName: string; isPartialOrFree: boolean; students: StudentWithSbdAndCombo[] }[] = [];
    const partialCombosList: { comboKey: string; displayName: string; isPartialOrFree: boolean; students: StudentWithSbdAndCombo[] }[] = [];

    comboBuckets.forEach(b => {
      if (b.isPartialOrFree) {
        partialCombosList.push(b);
      } else {
        fullCombosList.push(b);
      }
    });

    // Thuật toán Sorting của Bộ: Ưu tiên bốc nhóm tổ hợp có số lượng đông nhất lên đầu danh sách, sau đó giảm dần
    fullCombosList.sort((a, b) => {
      if (b.students.length !== a.students.length) {
        return b.students.length - a.students.length;
      }
      return a.displayName.localeCompare(b.displayName, 'vi');
    });

    // Cụm lẻ / tự do xếp sau cùng, cũng sắp xếp theo số lượng giảm dần
    partialCombosList.sort((a, b) => {
      if (b.students.length !== a.students.length) {
        return b.students.length - a.students.length;
      }
      return a.displayName.localeCompare(b.displayName, 'vi');
    });

    // Danh sách tất cả các cụm đã sắp xếp ưu tiên
    const orderedClusters = [...fullCombosList, ...partialCombosList];

    // BƯỚC 3: CẮT PHÒNG "CUỐN CHIẾU" (ROLLING-FIT 2.0) THEO ĐỊNH MỨC maxPerRoom
    const rollingList: StudentWithSbdAndCombo[] = [];
    orderedClusters.forEach(cluster => {
      rollingList.push(...cluster.students);
    });

    let currentRoomIndex = 1;
    for (let i = 0; i < rollingList.length; i += maxPerRoom) {
      const chunk = rollingList.slice(i, i + maxPerRoom);
      chunk.forEach((st, idxInChunk) => {
        assigned.push({
          ...st,
          TT: i + idxInChunk + 1,
          'Phòng thi': currentRoomIndex,
          STT_Phong: idxInChunk + 1,
          roomCode: getRoomCode(currentRoomIndex, startRoomCode),
          ToHop_ChuanHoa: st.displayName,
          Nhóm: st.displayName,
        });
      });
      currentRoomIndex++;
    }
  }

  return recalculateOptimizationResult(assigned, maxPerRoom, startRoomCode);
}

/**
 * Tính toán lại toàn bộ kết quả phân phòng khi có thay đổi thủ công hoặc chia tách phòng
 */
export function recalculateOptimizationResult(
  candidates: CandidateAssigned[],
  maxPerRoom: number = 24,
  startRoomCode: string = '01'
): OptimizationResult {
  if (!candidates || candidates.length === 0) {
    return {
      candidates: [],
      totalCandidates: 0,
      totalRooms: 0,
      combosCount: 0,
      lastRoomCandidatesCount: 0,
      combosDistribution: [],
      roomsList: []
    };
  }

  // Đảm bảo số phòng liên tục từ 1..N
  const uniqueRooms = Array.from(new Set(candidates.map(c => c['Phòng thi']))).sort((a, b) => a - b);
  const roomMapping = new Map<number, number>();
  uniqueRooms.forEach((oldNo, idx) => {
    roomMapping.set(oldNo, idx + 1);
  });

  // Nhóm theo phòng mới để đánh lại STT_Phong
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const newRoomNo = roomMapping.get(c['Phòng thi']) || c['Phòng thi'];
    if (!roomsMap.has(newRoomNo)) {
      roomsMap.set(newRoomNo, []);
    }
    roomsMap.get(newRoomNo)!.push(c);
  });

  const sortedNewRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);
  const reAssigned: CandidateAssigned[] = [];
  let globalTT = 1;

  sortedNewRooms.forEach(roomNo => {
    const roomStudents = roomsMap.get(roomNo) || [];
    // Giữ nguyên thứ tự theo khối môn trong phòng (STT_Phong), tránh xáo trộn chéo giữa 2 tổ hợp
    roomStudents.sort((a, b) => {
      if (a.STT_Phong && b.STT_Phong && a.STT_Phong !== b.STT_Phong) {
        return a.STT_Phong - b.STT_Phong;
      }
      const comboDiff = (a.ToHop_ChuanHoa || '').localeCompare(b.ToHop_ChuanHoa || '', 'vi');
      if (comboDiff !== 0) return comboDiff;
      return String(a.SBD).localeCompare(String(b.SBD), undefined, { numeric: true });
    });

    roomStudents.forEach((student, idxInRoom) => {
      reAssigned.push({
        ...student,
        TT: globalTT++,
        'Phòng thi': roomNo,
        STT_Phong: idxInRoom + 1,
        roomCode: getRoomCode(roomNo, startRoomCode)
      });
    });
  });

  // Thống kê phân bố tổ hợp
  const comboCountsMap: Record<string, number> = {};
  reAssigned.forEach(c => {
    comboCountsMap[c.ToHop_ChuanHoa] = (comboCountsMap[c.ToHop_ChuanHoa] || 0) + 1;
  });

  const combosDistribution = Object.entries(comboCountsMap).map(([combo, count]) => ({
    combo,
    count
  })).sort((a, b) => b.count - a.count);

  const totalRooms = sortedNewRooms.length;
  const lastRoomCandidatesCount = reAssigned.filter(c => c['Phòng thi'] === totalRooms).length;

  return {
    candidates: reAssigned,
    totalCandidates: reAssigned.length,
    totalRooms,
    combosCount: combosDistribution.length,
    lastRoomCandidatesCount,
    combosDistribution,
    roomsList: sortedNewRooms
  };
}

/**
 * Chia tách 1 phòng thành 2 hoặc 3 phòng đều nhau
 * Ví dụ: Phòng 24 HS -> tách thành 2 phòng 12 - 12 (hoặc 3 phòng 8 - 8 - 8)
 */
export function splitRoomEqually(
  candidates: CandidateAssigned[],
  targetRoomNo: number,
  partsCount: 2 | 3 = 2,
  startRoomCode: string = '01'
): CandidateAssigned[] {
  const roomCandidates = candidates.filter(c => c['Phòng thi'] === targetRoomNo);
  if (roomCandidates.length < partsCount) {
    return candidates; // Không đủ học sinh để chia
  }

  // Chia roomCandidates thành partsCount phần
  const total = roomCandidates.length;
  const baseSize = Math.floor(total / partsCount);
  const remainder = total % partsCount;

  // Gán tạm thời:
  // Phần 1: giữ nguyên targetRoomNo
  // Phần 2: targetRoomNo + 0.1
  // Phần 3 (nếu có): targetRoomNo + 0.2
  let cursor = 0;
  const updatedCandidates = candidates.map(c => {
    if (c['Phòng thi'] !== targetRoomNo) {
      return { ...c };
    }
    const idxInRoom = roomCandidates.findIndex(rc => rc.SBD === c.SBD);
    let partIdx = 0;
    let accumulated = 0;
    for (let p = 0; p < partsCount; p++) {
      const size = baseSize + (p < remainder ? 1 : 0);
      accumulated += size;
      if (idxInRoom < accumulated) {
        partIdx = p;
        break;
      }
    }

    return {
      ...c,
      'Phòng thi': targetRoomNo + (partIdx * 0.1)
    };
  });

  return recalculateOptimizationResult(updatedCandidates, 24, startRoomCode).candidates;
}

/**
 * Tách phòng theo số lượng thí sinh cụ thể chuyển sang phòng mới
 * (Ví dụ: chuyển countToMove thí sinh từ cuối phòng sang phòng mới ngay sau đó)
 */
export function splitRoomByCount(
  candidates: CandidateAssigned[],
  targetRoomNo: number,
  countToMove: number,
  startRoomCode: string = '01'
): CandidateAssigned[] {
  const roomCandidates = candidates.filter(c => c['Phòng thi'] === targetRoomNo);
  if (countToMove <= 0 || countToMove >= roomCandidates.length) {
    return candidates;
  }

  const sbdToMove = new Set(roomCandidates.slice(-countToMove).map(c => c.SBD));

  const updatedCandidates = candidates.map(c => {
    if (c['Phòng thi'] === targetRoomNo && sbdToMove.has(c.SBD)) {
      return {
        ...c,
        'Phòng thi': targetRoomNo + 0.5
      };
    }
    return { ...c };
  });

  return recalculateOptimizationResult(updatedCandidates, 24, startRoomCode).candidates;
}

/**
 * Tách phòng theo Môn tự chọn (TC1 hoặc TC2):
 * Mỗi môn trong phòng sẽ được tách thành 1 phòng riêng biệt!
 */
export function splitRoomBySubject(
  candidates: CandidateAssigned[],
  targetRoomNo: number,
  subjectCol: 'TC1' | 'TC2' = 'TC1',
  startRoomCode: string = '01'
): CandidateAssigned[] {
  const roomCandidates = candidates.filter(c => c['Phòng thi'] === targetRoomNo);
  const subjects = Array.from(new Set(roomCandidates.map(c => c[subjectCol] || 'Khác')));
  if (subjects.length <= 1) {
    return candidates; // Chỉ có 1 môn, không cần tách theo môn
  }

  const updatedCandidates = candidates.map(c => {
    if (c['Phòng thi'] === targetRoomNo) {
      const subj = c[subjectCol] || 'Khác';
      const subjIdx = subjects.indexOf(subj);
      return {
        ...c,
        'Phòng thi': targetRoomNo + (subjIdx * 0.1)
      };
    }
    return { ...c };
  });

  return recalculateOptimizationResult(updatedCandidates, 24, startRoomCode).candidates;
}

/**
 * Tách thủ công bằng danh sách SBD được chọn sang phòng mới
 */
export function splitRoomByCustomSelection(
  candidates: CandidateAssigned[],
  targetRoomNo: number,
  selectedSBDs: string[],
  startRoomCode: string = '01'
): CandidateAssigned[] {
  if (!selectedSBDs || selectedSBDs.length === 0) {
    return candidates;
  }
  const sbdSet = new Set(selectedSBDs);
  const updatedCandidates = candidates.map(c => {
    if (c['Phòng thi'] === targetRoomNo && sbdSet.has(c.SBD)) {
      return {
        ...c,
        'Phòng thi': targetRoomNo + 0.5
      };
    }
    return { ...c };
  });

  return recalculateOptimizationResult(updatedCandidates, 24, startRoomCode).candidates;
}

/**
 * Thống kê danh sách theo ca thi (CA 1 hoặc CA 2):
 * Gom nhóm theo Phòng thi, thống kê các môn tự chọn dự thi trong phòng cùng số lượng,
 * tính tổng số thí sinh từng phòng và tổng số toàn ca.
 */
export function generateShiftStatistics(
  candidates: CandidateAssigned[],
  shiftName: 'CA 1' | 'CA 2',
  subjectCol: 'TC1' | 'TC2',
  startRoomCode: string = '01'
): ShiftSummaryResult {
  const roomsMap = new Map<number, CandidateAssigned[]>();
  candidates.forEach(c => {
    const roomNo = c['Phòng thi'];
    if (!roomsMap.has(roomNo)) {
      roomsMap.set(roomNo, []);
    }
    roomsMap.get(roomNo)!.push(c);
  });

  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => a - b);
  const overallSubjectsMap: Record<string, number> = {};

  const roomStats: ShiftRoomStat[] = sortedRooms.map((roomNo, idx) => {
    const roomCandidates = roomsMap.get(roomNo) || [];
    const subjCountMap: Record<string, number> = {};

    roomCandidates.forEach(cand => {
      const rawSubj = cand[subjectCol];
      if (!isSubjectRegistered(rawSubj)) {
        // Thí sinh tự do hoặc không đăng ký thi ca này
        return;
      }
      const subj = normalizeSubjectName(rawSubj);
      subjCountMap[subj] = (subjCountMap[subj] || 0) + 1;
      overallSubjectsMap[subj] = (overallSubjectsMap[subj] || 0) + 1;
    });

    const subjectsCount = Object.entries(subjCountMap)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    // Format: "Vật lý (14), Hóa học (10)" hoặc "Vật lý (24)"
    const subjectsDetail = subjectsCount
      .map(item => `${item.subject} (${item.count})`)
      .join(', ');

    return {
      tt: idx + 1,
      roomNo,
      roomName: getRoomDisplayLabel(idx + 1, startRoomCode),
      subjectsDetail,
      subjectsCount,
      totalCandidates: roomCandidates.length
    };
  });

  const overallSubjectCounts = Object.entries(overallSubjectsMap)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  return {
    shiftName,
    subjectCol,
    roomStats,
    totalRooms: sortedRooms.length,
    totalCandidates: candidates.length,
    overallSubjectCounts
  };
}


