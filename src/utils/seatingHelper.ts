import { CandidateAssigned, SeatingPattern } from '../types';

export interface DeskInfo {
  deskNumber: number; // 1..24 bàn trong phòng
  row: number;        // 0..5 (Hàng 1 đến 6 từ trước ra sau)
  col: number;        // 0..3 (Dãy 1 đến 4 từ trái sang phải)
  candidateLeft?: CandidateAssigned | null;
  candidateRight?: CandidateAssigned | null;
  orderSeq: number;   // Thứ tự đánh số phấn (0 đến 23) theo quy luật
}

export interface SubjectPreset {
  id: string;
  name: string;
  pattern: SeatingPattern;
  patternName: string;
  description: string;
  badgeColor: string;
}

export const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: 'mon_1',
    name: 'Môn 1 (Ngữ văn / Toán)',
    pattern: 'ziczac_horizontal',
    patternName: 'Ziczac ngang xuôi (Trái sang Phải từng hàng)',
    description: 'Đánh số theo hàng ngang từ Dãy 1 sang Dãy 4, từ hàng đầu đến hàng cuối.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'mon_2',
    name: 'Môn 2 (Ngoại ngữ / Vật lí)',
    pattern: 'ziczac_vertical',
    patternName: 'Ziczac dọc (Dọc theo từng dãy bàn)',
    description: 'Đánh số từ trên xuống dưới theo từng Dãy: hết Dãy 1 sang Dãy 2, Dãy 3, Dãy 4.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: 'mon_3',
    name: 'Môn 3 (Hóa học / Lịch sử)',
    pattern: 'serpentine_s',
    patternName: 'Uốn lượn chữ S liên hoàn',
    description: 'Hàng 1 đi từ Trái sang Phải, Hàng 2 đảo chiều từ Phải sang Trái, uốn lượn liên tục.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'mon_4',
    name: 'Môn 4 (Sinh học / Địa lí)',
    pattern: 'reverse_bottom_up',
    patternName: 'Đảo chiều từ cuối phòng lên trên',
    description: 'Bắt đầu đánh số từ hàng cuối cùng lên hàng trên, đảo ngược vị trí ngồi.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
  }
];

/**
 * Tính ma trận 24 bàn (4 dãy x 6 hàng) cho 1 phòng thi theo quy luật đánh SBD
 */
export function computeRoomDeskMatrix(
  roomCandidates: CandidateAssigned[],
  pattern: SeatingPattern = 'ziczac_horizontal'
): DeskInfo[] {
  // Tạo 24 bàn: row: 0..5, col: 0..3
  const desks: DeskInfo[] = [];
  let deskCounter = 1;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      desks.push({
        deskNumber: deskCounter++,
        row: r,
        col: c,
        orderSeq: 0,
      });
    }
  }

  // Xác định thứ tự đánh số (orderSeq từ 0 đến 23) theo quy luật
  if (pattern === 'ziczac_horizontal') {
    let seq = 0;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const d = desks.find((item) => item.row === r && item.col === c);
        if (d) d.orderSeq = seq++;
      }
    }
  } else if (pattern === 'ziczac_vertical') {
    let seq = 0;
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 6; r++) {
        const d = desks.find((item) => item.row === r && item.col === c);
        if (d) d.orderSeq = seq++;
      }
    }
  } else if (pattern === 'serpentine_s') {
    let seq = 0;
    for (let r = 0; r < 6; r++) {
      if (r % 2 === 0) {
        for (let c = 0; c < 4; c++) {
          const d = desks.find((item) => item.row === r && item.col === c);
          if (d) d.orderSeq = seq++;
        }
      } else {
        for (let c = 3; c >= 0; c--) {
          const d = desks.find((item) => item.row === r && item.col === c);
          if (d) d.orderSeq = seq++;
        }
      }
    }
  } else if (pattern === 'reverse_bottom_up') {
    let seq = 0;
    for (let r = 5; r >= 0; r--) {
      for (let c = 3; c >= 0; c--) {
        const d = desks.find((item) => item.row === r && item.col === c);
        if (d) d.orderSeq = seq++;
      }
    }
  }

  // Sắp xếp các bàn theo thứ tự quy luật để phân bổ thí sinh
  const sortedDesks = [...desks].sort((a, b) => a.orderSeq - b.orderSeq);
  const totalInRoom = roomCandidates.length;

  if (totalInRoom <= 24) {
    for (let i = 0; i < totalInRoom; i++) {
      sortedDesks[i].candidateLeft = roomCandidates[i];
      sortedDesks[i].candidateRight = null;
    }
  } else {
    for (let i = 0; i < 24; i++) {
      sortedDesks[i].candidateLeft = roomCandidates[i] || null;
    }
    for (let i = 24; i < totalInRoom; i++) {
      const deskIdx = i - 24;
      if (deskIdx < 24) {
        sortedDesks[deskIdx].candidateRight = roomCandidates[i];
      }
    }
  }

  return desks;
}

/**
 * Nhóm các bàn của ma trận 24 bàn theo 6 hàng (mỗi hàng gồm 4 dãy)
 */
export function groupDesksByRow(desks: DeskInfo[]): Record<number, DeskInfo[]> {
  const rows: Record<number, DeskInfo[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
  desks.forEach((d) => {
    rows[d.row].push(d);
  });
  Object.keys(rows).forEach((r) => {
    rows[Number(r)].sort((a, b) => a.col - b.col);
  });
  return rows;
}
