import { CandidateInput } from '../types';

/**
 * Tách họ tên tiếng Việt thành Tên (từ cuối cùng) và Họ đệm (các từ còn lại phía trước)
 */
export function splitVietnameseName(fullName: string): { hoDem: string; ten: string } {
  if (!fullName) return { hoDem: '', ten: '' };
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length === 1) {
    return { hoDem: '', ten: parts[0] };
  }
  const ten = parts[parts.length - 1];
  const hoDem = parts.slice(0, parts.length - 1).join(' ');
  return { hoDem, ten };
}

/**
 * So sánh 2 thí sinh theo chuẩn từ điển tiếng Việt:
 * 1. So sánh Tên (A-Z) bằng collation tiếng Việt
 * 2. Nếu tên trùng nhau: So sánh Họ và tên đệm (A-Z)
 * 3. Nếu họ tên trùng nhau: So sánh Ngày sinh
 * 4. Nếu tiếp tục trùng: So sánh Lớp
 */
export function compareVietnameseCandidates(a: CandidateInput, b: CandidateInput): number {
  const nameA = splitVietnameseName(a['Họ tên'] || '');
  const nameB = splitVietnameseName(b['Họ tên'] || '');

  // 1. So sánh Tên (quan trọng nhất)
  const nameComp = nameA.ten.localeCompare(nameB.ten, 'vi', { sensitivity: 'base' });
  if (nameComp !== 0) return nameComp;

  // 2. So sánh Họ đệm
  const hoComp = nameA.hoDem.localeCompare(nameB.hoDem, 'vi', { sensitivity: 'base' });
  if (hoComp !== 0) return hoComp;

  // 3. So sánh Ngày sinh
  const dobA = (a['Ngày sinh'] || '').trim();
  const dobB = (b['Ngày sinh'] || '').trim();
  if (dobA !== dobB) {
    return dobA.localeCompare(dobB, 'vi');
  }

  // 4. So sánh Lớp
  const lopA = (a['Lớp'] || '').trim();
  const lopB = (b['Lớp'] || '').trim();
  return lopA.localeCompare(lopB, 'vi');
}

/**
 * Tạo Số báo danh kế tiếp dựa vào SBD gốc và khoảng cách offset
 * Hỗ trợ các định dạng: '52830001', '0680001', 'P001', 'K12_0001', '1'
 */
export function generateNextSbd(baseSbd: string, offset: number): string {
  if (!baseSbd || !baseSbd.trim()) {
    return String(1 + offset).padStart(4, '0');
  }

  const clean = baseSbd.trim();
  // Tìm chuỗi số ở cuối cùng
  const match = clean.match(/^(.*?)(\d+)$/);

  if (!match) {
    // Nếu không có số ở cuối, ghép thêm số thứ tự
    return `${clean}_${String(1 + offset).padStart(3, '0')}`;
  }

  const prefix = match[1];
  const numStr = match[2];
  const numLen = numStr.length;
  const startNum = parseInt(numStr, 10);
  const currentNum = startNum + offset;

  return `${prefix}${String(currentNum).padStart(numLen, '0')}`;
}
