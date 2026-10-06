import { Invigilator, ExamSession } from '../types/invigilator';

/**
 * 3 Buổi thi chuẩn Kỳ thi Khảo sát / Thi thử tốt nghiệp THPT:
 * - Buổi 1 (Sáng Ngày 1): Ngữ văn (120 phút)
 * - Buổi 2 (Chiều Ngày 1): Toán (90 phút)
 * - Buổi 3 (Sáng Ngày 2): Ca 1 - Tự chọn 1 (50 phút) & Ca 2 - Tự chọn 2 (50 phút)
 *   (Cặp giám thị giữ nguyên 1 phòng cho cả 2 ca theo quy chế)
 */
export const DEFAULT_EXAM_SESSIONS: ExamSession[] = [
  {
    id: 'ses_01',
    sessionName: 'Buổi 1 (Sáng Ngày 1)',
    subjectName: 'Ngữ văn',
    date: '2025-06-26',
    shiftTime: '07h30 - 09h30 (120 phút)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'ses_02',
    sessionName: 'Buổi 2 (Chiều Ngày 1)',
    subjectName: 'Toán',
    date: '2025-06-26',
    shiftTime: '14h00 - 15h30 (90 phút)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'ses_03',
    sessionName: 'Buổi 3 - Ca 1 (Sáng Ngày 2)',
    subjectName: 'Tự chọn 1',
    date: '2025-06-27',
    shiftTime: '07h30 - 08h20 (50 phút)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'ses_04',
    sessionName: 'Buổi 3 - Ca 2 (Sáng Ngày 2)',
    subjectName: 'Tự chọn 2',
    date: '2025-06-27',
    shiftTime: '08h50 - 09h40 (50 phút)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  }
];

/**
 * Lịch thi mẫu Kiểm tra định kỳ (Giữa kỳ / Cuối kỳ):
 * Tổ chức nhiều buổi, mỗi buổi có thể gồm 1, 2 hoặc 3 môn thi:
 * - Buổi 1: Ngữ văn + GDCD (120p + 45p)
 * - Buổi 2: Toán + Tiếng Anh (90p + 60p)
 * - Buổi 3: Vật lí + Hóa học + Sinh học (KHTN - 3 môn)
 * - Buổi 4: Lịch sử + Địa lí (KHXH - 2 môn)
 * - Buổi 5: Tin học + Công nghệ (2 môn)
 */
export const DEFAULT_PERIODIC_EXAM_SESSIONS: ExamSession[] = [
  {
    id: 'p_ses_01',
    sessionName: 'Buổi 1 (Sáng Ngày 1)',
    subjectName: 'Ngữ văn + GDCD',
    date: '2025-11-10',
    shiftTime: '07h15 - 10h15 (2 môn: Văn + GDCD)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'p_ses_02',
    sessionName: 'Buổi 2 (Chiều Ngày 1)',
    subjectName: 'Toán + Tiếng Anh',
    date: '2025-11-10',
    shiftTime: '13h45 - 16h45 (2 môn: Toán + Tiếng Anh)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'p_ses_03',
    sessionName: 'Buổi 3 (Sáng Ngày 2)',
    subjectName: 'Vật lí + Hóa học + Sinh học',
    date: '2025-11-11',
    shiftTime: '07h15 - 10h30 (3 môn: Lí + Hóa + Sinh)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'p_ses_04',
    sessionName: 'Buổi 4 (Chiều Ngày 2)',
    subjectName: 'Lịch sử + Địa lí',
    date: '2025-11-11',
    shiftTime: '13h45 - 16h00 (2 môn: Sử + Địa)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  },
  {
    id: 'p_ses_05',
    sessionName: 'Buổi 5 (Sáng Ngày 3)',
    subjectName: 'Tin học + Công nghệ',
    date: '2025-11-12',
    shiftTime: '07h30 - 09h30 (2 môn: Tin + CN)',
    numRooms: 24,
    numSupervisors: 6,
    numReserves: 2,
    startRoomNumber: 1
  }
];

export const DEFAULT_INVIGILATORS: Invigilator[] = [
  // --- BAN LÃNH ĐẠO HỘI ĐỒNG (MIỄN COI THI TẠI PHÒNG) ---
  {
    id: 'ld_01',
    code: 'BGH01',
    fullName: 'Nguyễn Văn Thắng',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Toán',
    role: 'Chủ tịch',
    quotaOffset: -99,
    note: 'Hiệu trưởng - Chủ tịch Hội đồng',
    phone: '0912.345.678'
  },
  {
    id: 'ld_02',
    code: 'BGH02',
    fullName: 'Trần Thị Mai',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Ngữ văn',
    role: 'Phó Chủ tịch',
    quotaOffset: -99,
    note: 'P. Hiệu trưởng - Phụ trách CSVC & Coi thi',
    phone: '0913.456.789'
  },
  {
    id: 'tk_01',
    code: 'TK01',
    fullName: 'Lê Hoàng Nam',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Tin học',
    role: 'Thư ký',
    quotaOffset: -99,
    note: 'Thư ký 1 - Điều hành bốc thăm & số liệu',
    phone: '0988.123.456'
  },
  {
    id: 'tk_02',
    code: 'TK02',
    fullName: 'Phạm Thị Lan',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Tiếng Anh',
    role: 'Thư ký',
    quotaOffset: -99,
    note: 'Thư ký 2 - Tiếp nhận đề & bài thi',
    phone: '0977.234.567'
  },
  {
    id: 'gs_01',
    code: 'GS01',
    fullName: 'Vũ Quốc Đạt',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Tin học',
    role: 'Giám sát',
    quotaOffset: -99,
    note: 'Giám sát hành lang Dãy A (Phòng 01 - 12)',
    phone: '0905.112.233'
  },
  {
    id: 'gs_02',
    code: 'GS02',
    fullName: 'Mai Văn Long',
    schoolOrDept: 'THPT Chuyên Hùng Vương',
    subject: 'GDTC - QPAN',
    role: 'Giám sát',
    quotaOffset: -99,
    note: 'Giám sát hành lang Dãy B (Phòng 13 - 24)',
    phone: '0906.223.344'
  },

  // --- BỘ PHẬN KHẢO THÍ & PHỤC VỤ HỘI ĐỒNG ---
  {
    id: 'kt_01',
    code: 'KT01',
    fullName: 'Đào Đình Ngọc',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Tin học',
    role: 'Khảo thí - Hỗ trợ',
    quotaOffset: -99,
    note: 'Cán bộ trực đề & hỗ trợ kỹ thuật khảo thí',
    phone: '0978.889.901'
  },
  {
    id: 'pv_01',
    code: 'YT01',
    fullName: 'Hoàng Văn Cường',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Y tế',
    role: 'Y tế',
    quotaOffset: -99,
    note: 'Trực sơ cấp cứu y tế',
    phone: '0945.678.901'
  },
  {
    id: 'pv_02',
    code: 'BV01',
    fullName: 'Nguyễn Đình Dũng',
    schoolOrDept: 'THPT Nguyễn Huệ',
    subject: 'Bảo vệ',
    role: 'Bảo vệ',
    quotaOffset: -99,
    note: 'An ninh trật tự vòng ngoài',
    phone: '0918.789.012'
  },

  // --- CÁN BỘ COI THI (GIÁM THỊ) - TRƯỜNG A / ĐƠN VỊ 1 ---
  { id: 'gv_01', code: 'GV01', fullName: 'Nguyễn Văn An', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Toán', role: 'Giám thị', quotaOffset: -1, note: 'Chấm tự luận Toán', phone: '0934.111.001' },
  { id: 'gv_02', code: 'GV02', fullName: 'Trần Thị Bích', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Toán', role: 'Giám thị', quotaOffset: -1, note: 'Chấm tự luận Toán', phone: '0934.111.002' },
  { id: 'gv_03', code: 'GV03', fullName: 'Lê Hoàng Cường', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Vật lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.003' },
  { id: 'gv_04', code: 'GV04', fullName: 'Phạm Minh Đức', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Hóa học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.004' },
  { id: 'gv_05', code: 'GV05', fullName: 'Hoàng Thị Dung', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Sinh học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.005' },
  { id: 'gv_06', code: 'GV06', fullName: 'Đặng Thanh Giang', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0934.111.006' },
  { id: 'gv_07', code: 'GV07', fullName: 'Bùi Thị Hạnh', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0934.111.007' },
  { id: 'gv_08', code: 'GV08', fullName: 'Ngô Văn Hùng', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Lịch sử', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.008' },
  { id: 'gv_09', code: 'GV09', fullName: 'Đỗ Thị Hương', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Địa lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.009' },
  { id: 'gv_10', code: 'GV10', fullName: 'Dương Văn Khoa', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Tiếng Anh', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.010' },
  { id: 'gv_11', code: 'GV11', fullName: 'Lý Thị Lan', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Tiếng Anh', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.011' },
  { id: 'gv_12', code: 'GV12', fullName: 'Hà Thị Mai', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'GDKT&PL', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.012' },
  { id: 'gv_13', code: 'GV13', fullName: 'Phan Văn Nam', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Toán', role: 'Giám thị', quotaOffset: -1, note: 'Chấm tự luận Toán', phone: '0934.111.013' },
  { id: 'gv_14', code: 'GV14', fullName: 'Trịnh Thị Nga', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0934.111.014' },
  { id: 'gv_15', code: 'GV15', fullName: 'Lâm Văn Phong', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Vật lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.015' },
  { id: 'gv_16', code: 'GV16', fullName: 'Đinh Thị Quỳnh', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Hóa học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.016' },
  { id: 'gv_17', code: 'GV17', fullName: 'Tạ Văn Sơn', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Sinh học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.017' },
  { id: 'gv_18', code: 'GV18', fullName: 'Cao Thị Thảo', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Lịch sử', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.018' },
  { id: 'gv_19', code: 'GV19', fullName: 'Lương Văn Thắng', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Địa lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.019' },
  { id: 'gv_20', code: 'GV20', fullName: 'Võ Thị Thu', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Tiếng Anh', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.020' },
  { id: 'gv_21', code: 'GV21', fullName: 'Nguyễn Văn Tuấn', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Công nghệ', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.021' },
  { id: 'gv_22', code: 'GV22', fullName: 'Trần Văn Vinh', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Tin học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.022' },
  { id: 'gv_23', code: 'GV23', fullName: 'Lê Thị Xuân', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Toán', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.023' },
  { id: 'gv_24', code: 'GV24', fullName: 'Phạm Thị Yến', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0934.111.024' },
  { id: 'gv_25', code: 'GV25', fullName: 'Hoàng Văn Ánh', schoolOrDept: 'THPT Nguyễn Huệ', subject: 'GDTC - QPAN', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0934.111.025' },

  // --- CÁN BỘ COI THI (GIÁM THỊ) - TRƯỜNG B / ĐƠN VỊ ĐỐI ỨNG ---
  { id: 'gv_31', code: 'GV31', fullName: 'Thái Văn Bảo', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Toán', role: 'Giám thị', quotaOffset: -1, note: 'Chấm tự luận Toán', phone: '0989.222.001' },
  { id: 'gv_32', code: 'GV32', fullName: 'Đoàn Thị Cẩm', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0989.222.002' },
  { id: 'gv_33', code: 'GV33', fullName: 'Tô Văn Dũng', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Vật lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.003' },
  { id: 'gv_34', code: 'GV34', fullName: 'Quách Thị Duyên', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Hóa học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.004' },
  { id: 'gv_35', code: 'GV35', fullName: 'Lưu Văn Hào', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Sinh học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.005' },
  { id: 'gv_36', code: 'GV36', fullName: 'Châu Thị Hiền', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Lịch sử', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.006' },
  { id: 'gv_37', code: 'GV37', fullName: 'Khổng Văn Kiên', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Địa lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.007' },
  { id: 'gv_38', code: 'GV38', fullName: 'Phùng Thị Liên', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Tiếng Anh', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.008' },
  { id: 'gv_39', code: 'GV39', fullName: 'Nghiêm Văn Minh', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Tin học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.009' },
  { id: 'gv_40', code: 'GV40', fullName: 'Trương Thị Ngọc', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'GDKT&PL', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.010' },
  { id: 'gv_41', code: 'GV41', fullName: 'Ôn Văn Phúc', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Toán', role: 'Giám thị', quotaOffset: -1, note: 'Chấm tự luận Toán', phone: '0989.222.011' },
  { id: 'gv_42', code: 'GV42', fullName: 'Bạch Thị Quyên', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0989.222.012' },
  { id: 'gv_43', code: 'GV43', fullName: 'Sầm Văn Sang', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Vật lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.013' },
  { id: 'gv_44', code: 'GV44', fullName: 'Diệp Thị Tâm', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Hóa học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.014' },
  { id: 'gv_45', code: 'GV45', fullName: 'Mạc Văn Tùng', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Sinh học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.015' },
  { id: 'gv_46', code: 'GV46', fullName: 'Thân Thị Uyên', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Tiếng Anh', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.016' },
  { id: 'gv_47', code: 'GV47', fullName: 'Chu Văn Việt', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'GDTC - QPAN', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.017' },
  { id: 'gv_48', code: 'GV48', fullName: 'Văn Thị Trà', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Công nghệ', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.018' },
  { id: 'gv_49', code: 'GV49', fullName: 'Kiều Văn Tiến', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Toán', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.019' },
  { id: 'gv_50', code: 'GV50', fullName: 'Vi Thị Vân', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Ngữ văn', role: 'Giám thị', quotaOffset: -2, note: 'Chấm tự luận Văn', phone: '0989.222.020' },
  { id: 'gv_51', code: 'GV51', fullName: 'Nông Văn Vượng', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Lịch sử', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.021' },
  { id: 'gv_52', code: 'GV52', fullName: 'Ân Thị Như', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Địa lí', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.022' },
  { id: 'gv_53', code: 'GV53', fullName: 'Lục Văn Hòa', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Tiếng Anh', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.023' },
  { id: 'gv_54', code: 'GV54', fullName: 'Triệu Thị Oanh', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Tin học', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.024' },
  { id: 'gv_55', code: 'GV55', fullName: 'Lăng Văn Bình', schoolOrDept: 'THPT Chuyên Hùng Vương', subject: 'Toán', role: 'Giám thị', quotaOffset: 0, note: '', phone: '0989.222.025' }
];
