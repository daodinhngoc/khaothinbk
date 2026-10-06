import { CandidateAssigned, ExamConfig } from '../types';

/**
 * Tự động tính toán thông minh Năm học hiện hành dựa trên mốc thời gian thực tế:
 * - Nếu tháng hiện tại từ Tháng 8 đến Tháng 12: Năm học là Year - (Year + 1)
 * - Nếu tháng hiện tại từ Tháng 1 đến Tháng 7: Năm học là (Year - 1) - Year
 */
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1 - 12
  if (month >= 8) {
    return `${year} - ${year + 1}`;
  } else {
    return `${year - 1} - ${year}`;
  }
}

/**
 * Danh sách 4 môn thi bắt buộc cố định theo chương trình GDPT 2018
 */
export const COMPULSORY_SUBJECTS_DEFAULT = ['Ngữ văn', 'Toán', 'Lịch sử', 'Tiếng Anh'];

/**
 * Bóc tách mã nhóm (ví dụ "Địa-GDKPTL-CNCN-Tin" hoặc "TN1", "Lý-Hóa-Sinh") thành danh sách môn tự chọn
 */
export function extractSubjectsFromGroup(groupString: string = ''): string[] {
  if (!groupString || !groupString.trim()) return [];
  
  // Tách theo dấu gạch ngang, dấu phẩy, dấu gạch chéo, dấu chấm phẩy hoặc dấu cộng
  const rawParts = groupString.split(/[-;,+/]/).map(p => p.trim()).filter(Boolean);
  
  const subjects: string[] = [];
  rawParts.forEach(part => {
    // Chuẩn hóa tên viết tắt quen thuộc nếu cần, hoặc giữ nguyên nhãn thân thiện
    let subj = part;
    const lower = part.toLowerCase();
    
    if (lower === 'van' || lower === 'ngu van') subj = 'Ngữ văn';
    else if (lower === 'toan') subj = 'Toán';
    else if (lower === 'su' || lower === 'lich su') subj = 'Lịch sử';
    else if (lower === 'anh' || lower === 'tieng anh') subj = 'Tiếng Anh';
    else if (lower === 'ly' || lower === 'vat ly' || lower === 'vat li') subj = 'Vật lí';
    else if (lower === 'hoa' || lower === 'hoa hoc') subj = 'Hóa học';
    else if (lower === 'sinh' || lower === 'sinh hoc') subj = 'Sinh học';
    else if (lower === 'dia' || lower === 'dia ly' || lower === 'dia li') subj = 'Địa lí';
    else if (lower === 'tin' || lower === 'tin hoc') subj = 'Tin học';
    else if (lower === 'cncn' || lower.includes('cong nghiep')) subj = 'CNCN';
    else if (lower === 'cnnn' || lower.includes('nong nghiep')) subj = 'CNNN';
    else if (lower === 'gdktpl' || lower === 'gdkptl' || lower === 'gdktptl' || lower.includes('kinh te') || lower.includes('phap luat')) subj = 'GDKT&PL';

    if (!subjects.includes(subj)) {
      subjects.push(subj);
    }
  });

  return subjects;
}

/**
 * Chuẩn hóa chuỗi nhóm môn (ví dụ "Địa - GDKPTL - CNCN - Tin" -> "Địa-GDKPTL-CNCN-Tin"):
 * - Xóa bỏ khoảng trắng thừa quanh các dấu ngăn cách (-, ;, /, ,)
 */
export function cleanGroupString(groupStr: string = ''): string {
  if (!groupStr || !groupStr.trim()) return 'Chung';
  const rawParts = groupStr.trim().split(/[-;,+/]/).map(p => p.trim()).filter(Boolean);
  if (rawParts.length === 0) return 'Chung';
  return rawParts.join('-');
}

/**
 * Tạo khóa định danh nhóm độc lập với thứ tự các môn:
 * Ví dụ: "Sinh-GDKPTL-Địa-Tin" và "Địa-GDKPTL-Sinh-Tin" -> cùng chung 1 nhóm môn
 */
export function getCanonicalGroupKey(groupStr: string = ''): string {
  if (!groupStr || !groupStr.trim()) return 'Chung';
  const subjs = extractSubjectsFromGroup(groupStr);
  if (subjs.length === 0) return groupStr.trim();
  return [...subjs].sort((a, b) => a.localeCompare(b, 'vi')).join('-');
}

/**
 * Lấy danh sách môn thi cho một phòng thi cụ thể:
 * - Đối với Kiểm tra định kỳ: 4 môn bắt buộc (Văn, Toán, Sử, Tiếng Anh) + các môn tự chọn từ mã nhóm
 * - Đối với Thi thử / Khảo sát: 4 môn bắt buộc + các môn tự chọn TC1, TC2 có trong phòng
 */
export function getRoomSubjects(
  roomCandidates: CandidateAssigned[],
  config: ExamConfig
): { subjects: string[]; groupLabel: string } {
  const isPeriodic = !config.examCategory.includes('Thi thử');

  // Lấy các mã nhóm của thí sinh trong phòng
  const groupSet = new Set<string>();
  roomCandidates.forEach(c => {
    if (c.Nhóm && c.Nhóm.trim()) {
      groupSet.add(c.Nhóm.trim());
    }
  });
  const groupsList = Array.from(groupSet);
  const groupLabel = groupsList.length > 0 ? groupsList.join(', ') : 'Chung';

  const finalSubjects: string[] = [...COMPULSORY_SUBJECTS_DEFAULT];

  if (isPeriodic) {
    // Trích xuất các môn từ các mã nhóm của phòng
    groupsList.forEach(grp => {
      const electiveSubjects = extractSubjectsFromGroup(grp);
      electiveSubjects.forEach(s => {
        // Tránh trùng lặp với môn bắt buộc
        const isAlreadyIn = finalSubjects.some(
          ex => ex.toLowerCase() === s.toLowerCase() ||
                (s === 'Văn' && ex === 'Ngữ văn') ||
                (s === 'Sử' && ex === 'Lịch sử')
        );
        if (!isAlreadyIn) {
          finalSubjects.push(s);
        }
      });
    });

    // Nếu không có môn tự chọn nào được bóc tách từ nhóm (ví dụ mã nhóm là TN1 mà không ghi rõ môn)
    if (finalSubjects.length === COMPULSORY_SUBJECTS_DEFAULT.length) {
      // Bổ sung môn mặc định theo nhóm TN / XH nếu mã nhóm có chữ TN / XH
      const combinedGrp = groupLabel.toUpperCase();
      if (combinedGrp.includes('TN')) {
        ['Vật lí', 'Hóa học', 'Sinh học', 'Tin học'].forEach(s => {
          if (!finalSubjects.includes(s)) finalSubjects.push(s);
        });
      } else if (combinedGrp.includes('XH')) {
        ['Địa lí', 'GDKT&PL', 'CNCN', 'Tin học'].forEach(s => {
          if (!finalSubjects.includes(s)) finalSubjects.push(s);
        });
      }
    }
  } else {
    // Thi thử / Khảo sát: lấy TC1, TC2 từ thí sinh trong phòng
    const tcSet = new Set<string>();
    roomCandidates.forEach(c => {
      if (c.TC1 && c.TC1.trim()) tcSet.add(c.TC1.trim());
      if (c.TC2 && c.TC2.trim()) tcSet.add(c.TC2.trim());
    });

    tcSet.forEach(s => {
      const isAlreadyIn = finalSubjects.some(
        ex => ex.toLowerCase() === s.toLowerCase() ||
              (s === 'Văn' && ex === 'Ngữ văn') ||
              (s === 'Sử' && ex === 'Lịch sử')
      );
      if (!isAlreadyIn) {
        finalSubjects.push(s);
      }
    });

    // Fallback nếu không có TC1, TC2: dùng danh sách chuẩn
    if (finalSubjects.length === COMPULSORY_SUBJECTS_DEFAULT.length) {
      ['Vật lí', 'Hóa học', 'Sinh học', 'Địa lí', 'GDKT&PL'].forEach(s => {
        if (!finalSubjects.includes(s)) finalSubjects.push(s);
      });
    }
  }

  return { subjects: finalSubjects, groupLabel };
}

/**
 * Kiểm tra xem một môn có được thí sinh đăng ký dự thi thực tế hay không:
 * Thí sinh tự do hoặc thí sinh được miễn/bỏ thi sẽ có giá trị rỗng, '---', 'Không thi', 'K', 'Miễn thi'...
 */
export function isSubjectRegistered(subject?: string | null): boolean {
  if (!subject) return false;
  const s = String(subject).trim().toLowerCase();
  return (
    s !== '' &&
    s !== '-' &&
    s !== '--' &&
    s !== '---' &&
    s !== 'không' &&
    s !== 'không thi' &&
    s !== 'khong thi' &&
    s !== 'k' &&
    s !== 'kt' &&
    s !== 'miễn thi' &&
    s !== 'mien thi' &&
    s !== 'miễn' &&
    s !== 'x' &&
    s !== 'null' &&
    s !== 'undefined'
  );
}

/**
 * Chuẩn hóa tên môn thi sang tên chuẩn theo danh mục Bộ GD&ĐT
 */
export function normalizeSubjectName(rawSubject?: string | null): string {
  if (!rawSubject || !isSubjectRegistered(rawSubject)) return '';
  const trimmed = String(rawSubject).trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'toán' || lower === 'toan') return 'Toán';
  if (lower === 'ngữ văn' || lower === 'ngu van' || lower === 'văn' || lower === 'van') return 'Ngữ văn';
  if (lower === 'vật lí' || lower === 'vật lý' || lower === 'vat ly' || lower === 'vat li' || lower === 'lý' || lower === 'ly') return 'Vật lí';
  if (lower === 'hóa học' || lower === 'hoa hoc' || lower === 'hóa' || lower === 'hoa') return 'Hóa học';
  if (lower === 'sinh học' || lower === 'sinh hoc' || lower === 'sinh') return 'Sinh học';
  if (lower === 'lịch sử' || lower === 'lich su' || lower === 'sử' || lower === 'su') return 'Lịch sử';
  if (lower === 'địa lí' || lower === 'địa lý' || lower === 'dia li' || lower === 'dia ly' || lower === 'địa' || lower === 'dia') return 'Địa lí';
  if (lower === 'tin học' || lower === 'tin hoc' || lower === 'tin') return 'Tin học';
  if (lower.includes('kinh te') || lower.includes('phap luat') || lower === 'gdktpl' || lower === 'gdkptl' || lower === 'gdkt&pl') return 'GDKT&PL';
  if (lower.includes('cong nghiep') || lower === 'cncn') return 'CNCN';
  if (lower.includes('nong nghiep') || lower === 'cnnn') return 'CNNN';
  if (lower === 'tiếng anh' || lower === 'tieng anh' || lower === 'anh') return 'Tiếng Anh';
  if (lower === 'tiếng pháp' || lower === 'tieng phap') return 'Tiếng Pháp';
  if (lower === 'tiếng trung' || lower === 'tieng trung') return 'Tiếng Trung';
  if (lower === 'tiếng nhật' || lower === 'tieng nhat') return 'Tiếng Nhật';
  if (lower === 'tiếng hàn' || lower === 'tieng han') return 'Tiếng Hàn';
  if (lower === 'tiếng nga' || lower === 'tieng nga') return 'Tiếng Nga';

  return trimmed;
}

/**
 * Lấy toàn bộ danh sách các môn thi thực tế xuất hiện trong kỳ thi
 */
export function getAllExamSubjects(candidates: CandidateAssigned[]): string[] {
  const subjectSet = new Set<string>();
  const priorityOrder = [
    'Ngữ văn', 'Toán',
    'Vật lí', 'Hóa học', 'Sinh học',
    'Lịch sử', 'Địa lí', 'GDKT&PL',
    'Tin học', 'CNCN', 'CNNN',
    'Tiếng Anh', 'Tiếng Pháp', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Nga'
  ];

  candidates.forEach(c => {
    // Môn chung
    if (isSubjectRegistered(c.M1)) subjectSet.add(normalizeSubjectName(c.M1));
    if (isSubjectRegistered(c.M2)) subjectSet.add(normalizeSubjectName(c.M2));
    // Môn tự chọn
    if (isSubjectRegistered(c.TC1)) subjectSet.add(normalizeSubjectName(c.TC1));
    if (isSubjectRegistered(c.TC2)) subjectSet.add(normalizeSubjectName(c.TC2));
  });

  const allFound = Array.from(subjectSet).filter(Boolean);
  // Sắp xếp theo thứ tự ưu tiên Bộ GD&ĐT
  allFound.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'vi');
  });

  // Đảm bảo tối thiểu có Ngữ văn và Toán nếu chưa có
  if (!allFound.includes('Ngữ văn')) allFound.unshift('Ngữ văn');
  if (!allFound.includes('Toán')) allFound.splice(1, 0, 'Toán');

  return allFound;
}

/**
 * Tính toán Ma trận số lượng đề thi / thí sinh dự thi theo từng phòng thi (Chuẩn Bộ GD&ĐT)
 */
export function calculateExamPaperMatrix(
  candidates: CandidateAssigned[],
  startRoomCode: string = '01'
) {
  const subjects = getAllExamSubjects(candidates);
  const roomsMap = new Map<number, CandidateAssigned[]>();

  candidates.forEach(c => {
    const rNo = c['Phòng thi'];
    if (!roomsMap.has(rNo)) roomsMap.set(rNo, []);
    roomsMap.get(rNo)!.push(c);
  });

  const sortedRoomNos = Array.from(roomsMap.keys()).sort((a, b) => a - b);
  const totalsBySubject: Record<string, number> = {};
  subjects.forEach(s => { totalsBySubject[s] = 0; });

  const rooms = sortedRoomNos.map((rNo, idx) => {
    const roomCands = roomsMap.get(rNo) || [];
    const countsBySubject: Record<string, number> = {};
    subjects.forEach(s => { countsBySubject[s] = 0; });

    roomCands.forEach(c => {
      const candSubjects = [
        normalizeSubjectName(c.M1),
        normalizeSubjectName(c.M2),
        normalizeSubjectName(c.TC1),
        normalizeSubjectName(c.TC2),
      ].filter(Boolean);

      candSubjects.forEach(s => {
        if (countsBySubject[s] !== undefined) {
          countsBySubject[s] += 1;
          totalsBySubject[s] += 1;
        }
      });
    });

    // Tạo tên hiển thị phòng thi
    let roomName = `Phòng ${rNo}`;
    const startNum = parseInt(startRoomCode, 10);
    if (!isNaN(startNum)) {
      const codeNum = startNum + (idx);
      const padded = codeNum < 10 ? `0${codeNum}` : `${codeNum}`;
      roomName = `Phòng ${padded}`;
    } else if (startRoomCode) {
      roomName = `Phòng ${startRoomCode}${idx + 1}`;
    }

    return {
      tt: idx + 1,
      roomNo: rNo,
      roomName,
      totalCandidates: roomCands.length,
      countsBySubject,
    };
  });

  return {
    subjects,
    rooms,
    totalCandidates: candidates.length,
    totalsBySubject,
  };
}
