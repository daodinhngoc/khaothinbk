/**
 * Types for Invigilator Management (Phân công giám thị coi thi)
 */

export type InvigilatorRole = 'Chủ tịch' | 'Phó Chủ tịch' | 'Thư ký' | 'Giám sát' | 'Khảo thí - Hỗ trợ' | 'Giám thị' | 'Y tế' | 'Bảo vệ' | 'Phục vụ';

export interface Invigilator {
  id: string;
  code: string;            // Mã GV (VD: GV01, GV02...)
  fullName: string;        // Họ và tên
  schoolOrDept: string;    // Trường (nếu thi thử liên trường) hoặc Tổ chuyên môn (nếu thi nội bộ)
  subject: string;         // Môn giảng dạy chính (Toán, Văn, Lí, Hóa, Sử, Địa...)
  role?: InvigilatorRole;  // Vai trò / Nhiệm vụ trong Hội đồng thi (Chủ tịch, Thư ký, Giám sát, Giám thị...)
  quotaOffset: number;     // Số ca giảm trừ (ví dụ: -2 nếu chấm bài, -99 nếu miễn coi thi, +1 nếu nhận thêm ca)
  note?: string;           // Ghi chú (VD: 'Chấm bài tự luận', 'BGH', 'Trực đề'...)
  phone?: string;          // Số điện thoại
  email?: string;
  isAvailable?: boolean;   // Đang hoạt động / có tham gia coi thi hay không
}

export interface ExamSession {
  id: string;
  sessionName: string;     // Tên buổi (VD: 'Buổi 1 (Sáng Ngày 1)', 'Buổi 2 (Chiều Ngày 1)')
  subjectName: string;     // Tên môn thi của buổi đó (VD: 'Ngữ văn', 'Toán', 'KHTN (Lí - Hóa - Sinh)')
  date: string;            // Ngày thi (VD: '2025-06-25')
  shiftTime: string;       // Thời gian thi (VD: '07h30 - 09h30')
  numRooms: number;        // Số phòng thi cần bố trí giám thị
  startRoomNumber?: number; // Số phòng bắt đầu (mặc định là 1, ví dụ điểm trường phân hiệu bắt đầu từ 30)
  numSupervisors?: number; // Số lượng cán bộ giám sát buổi thi (VD: 6)
  numReserves?: number;    // Số lượng giám thị dự phòng buổi thi (VD: 2)
}

export type InvigilatorMode = 'survey_mock' | 'periodic';

export interface RoomInvigilatorAssignment {
  roomNo: number;          // Số phòng (1, 2, 3...)
  roomLabel: string;       // Nhãn phòng ('Phòng 01', 'Phòng 02'...)
  invigilator1: Invigilator; // Giám thị 1 (Bắt buộc)
  invigilator2?: Invigilator; // Giám thị 2 (Dành cho thi thử / khảo sát khi chọn 2 Giám thị/phòng)
  hallwaySupervisor?: Invigilator; // Giám sát hành lang (tùy chọn)
}

export interface SessionAssignmentResult {
  sessionId: string;
  sessionName: string;
  subjectName: string;
  date: string;
  shiftTime: string;
  roomAssignments: RoomInvigilatorAssignment[];
  supervisors?: Invigilator[]; // Danh sách cán bộ giám sát buổi thi
  reserveInvigilators?: Invigilator[]; // Danh sách giám thị dự phòng buổi thi
  drawnAt?: string;        // Thời gian bốc thăm
}

export interface InvigilatorStats {
  invigilatorId: string;
  code: string;
  fullName: string;
  schoolOrDept: string;
  subject: string;
  quotaOffset: number;
  totalAssigned: number;   // Số ca thực tế được phân công
  targetQuota: number;     // Định mức mục tiêu
  balanceDiff: number;     // Chênh lệch (totalAssigned - targetQuota)
  sessionDetails: {
    sessionId: string;
    sessionName: string;
    roomNo: number;
    role: 'Giám thị 1' | 'Giám thị 2' | 'Giám thị' | 'CBCT1' | 'CBCT2' | 'GV' | 'Giám sát' | 'Dự phòng';
    partnerName?: string;
    partnerUnit?: string;
  }[];
}

export interface ValidationReport {
  isValid: boolean;
  duplicatePairsCount: number;
  duplicateRoomsCount: number;
  sameUnitPairsCount: number;
  teachingSubjectViolationsCount: number;
  maxDutyDiff: number;     // Độ lệch lớn nhất giữa GV coi nhiều nhất và ít nhất (sau chuẩn hóa)
  details: {
    type: 'error' | 'warning' | 'info';
    message: string;
  }[];
}

export interface InvigilatorPlanResult {
  mode: InvigilatorMode;
  invigilatorsPerRoom?: 1 | 2; // 1 Giám thị hoặc 2 Giám thị / phòng
  examName?: string;
  academicYear?: string;
  schoolName?: string;
  sessions: SessionAssignmentResult[];
  stats: InvigilatorStats[];
  validation: ValidationReport;
  generatedAt: string;
}
