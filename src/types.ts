/**
 * Interface cho dữ liệu thí sinh đầu vào
 * Cấu trúc cột lõi: ['TT', 'SBD', 'CCD', 'Lớp', 'Họ tên', 'Ngày sinh', 'M1', 'M2', 'TC1', 'TC2']
 */
export interface CandidateInput {
  TT: number;
  SBD: string;
  CCD: string;
  Lớp: string;
  'Họ tên': string;
  'Ngày sinh': string;
  M1?: string;
  M2?: string;
  TC1?: string;
  TC2?: string;
  Nhóm?: string;
  [key: string]: any;
}

/**
 * Thí sinh sau khi được chuẩn hóa và xếp phòng
 */
export interface CandidateAssigned extends CandidateInput {
  ToHop_ChuanHoa: string;
  'Phòng thi': number;
  STT_Phong: number;
  roomCode?: string;
}

export type ExamCategory = 'Kiểm tra định kỳ' | 'Thi thử / Khảo sát' | '1. Kiểm tra định kỳ' | '2. Thi thử / Khảo sát';
export type PeriodicPeriod = 'Giữa kỳ 1' | 'Cuối kỳ 1' | 'Giữa kỳ 2' | 'Cuối kỳ 2' | 'Giữa kỳ' | 'Cuối kỳ';
export type SurveyPeriod = 'Lần 1' | 'Lần 2' | 'Lần 3';
export type SurveyAllocationMode = 'bo_gddt_rolling_fit' | 'bo_gddt_fixed' | 'subject_cluster';
export type RoomAssignmentModel = 'moet_fixed' | 'two_phase_split';

export interface ExamConfig {
  examCategory: ExamCategory;
  subPeriod: PeriodicPeriod | SurveyPeriod;
  maxPerRoom: number;
  startRoomCode: string; // VD: '01', 'P01', 'A01', '1', 'P.01'...
  startSbd: string;      // SBD bắt đầu, ví dụ '52830001' hoặc '0680001'
  deptName: string;
  schoolName: string;
  examCenterCode: string;
  schoolYear: string;
  surveyAllocationMode?: SurveyAllocationMode; // Thuật toán Bộ GD&ĐT Rolling-Fit 2.0 (1 SBD & 1 Phòng cố định, gom cụm tần suất tổ hợp)
  roomAssignmentModel?: RoomAssignmentModel;   // 'moet_fixed' (Mặc định: Phương án 1 - Chuẩn 100% Bộ GD&ĐT, 1 Phòng thi cố định toàn kỳ thi) | 'two_phase_split' (Phương án 2: Tách 2 giai đoạn)
  // Cấu hình phần đầu phiếu (Header)
  countryTitle?: string; // Mặc định 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', để trống = ẩn
  mottoTitle?: string;   // Mặc định 'Độc lập - Tự do - Hạnh phúc', để trống = ẩn
  sheetTitle?: string;   // Mặc định 'DANH SÁCH THÍ SINH VÀ PHIẾU THU BÀI THI TỔNG HỢP CÁC MÔN'
  // Cấu hình phần chân phiếu thu bài (Footer)
  supervisor1Title?: string; // Mặc định 'GIÁM THỊ 1', có thể tùy biến hoặc để trống = ẩn cả chữ ký
  supervisor2Title?: string; // Mặc định 'GIÁM THỊ 2', có thể tùy biến hoặc để trống = ẩn cả chữ ký
  dateLine?: string;         // Tùy biến ngày tháng năm (VD: 'Ngày ..... tháng ..... năm 20.....' hoặc 'Gia Lai, ngày ...'), để trống = ẩn
  locationName?: string;     // Địa danh (nếu cần ghép vào dateLine tự động)
  leaderTitle?: string;      // Mặc định 'TRƯỞNG ĐIỂM THI' / 'HIỆU TRƯỞNG', để trống = ẩn cả chữ ký
  balanceRoomsInGroup?: boolean; // Tự động chia đều sĩ số các phòng trong cùng nhóm (tránh phòng cuối bị quá ít)
  sortSbdAscendingInRoom?: boolean; // Phương án 2: Công tắc linh hoạt sắp xếp SBD trong phòng thi tăng dần liên tục (1..24)
}

export const COMPULSORY_SUBJECTS = ['Ngữ văn', 'Toán', 'Lịch sử', 'Tiếng Anh'];

export const DEFAULT_ALL_SUBJECTS = [
  'Ngữ văn', 'Toán', 'Lý', 'Hóa', 'Sinh', 'Tin', 'CNNN', 'CNCN', 'Sử', 'Địa', 'GDKTPL', 'Tiếng Anh'
];


export interface OptimizationResult {
  candidates: CandidateAssigned[];
  totalCandidates: number;
  totalRooms: number;
  combosCount: number;
  lastRoomCandidatesCount: number;
  combosDistribution: { combo: string; count: number }[];
  roomsList: number[];
}

export interface ColumnDefinition {
  id: string;             // Định danh cột (key hoặc custom id)
  fieldKey: string;       // Key lấy dữ liệu từ CandidateAssigned hoặc rỗng nếu cột trống
  headerName: string;     // Tên tiêu đề hiển thị trên header
  enabled: boolean;       // Có xuất hiện hay không
  widthWeight: number;    // Trọng số tỷ lệ độ rộng (1: hẹp, 2: trung bình, 3: rộng...)
  align: 'left' | 'center' | 'right';
  isCustom?: boolean;     // Cột do người dùng thêm mới
  defaultValue?: string;  // Giá trị mặc định nếu là cột thêm mới (ví dụ để trống để ký hoặc 'Đạt')
  targetSheets: ('overall' | 'attendance')[]; // Áp dụng cho File 1 (overall) hay File 2/3 & In A4 (attendance)
}

export interface ExportColumnsConfig {
  overallColumns: ColumnDefinition[];
  attendanceColumns: ColumnDefinition[];
}

export interface ShiftRoomStat {
  tt: number;
  roomNo: number;
  roomName: string;
  subjectsDetail: string; // VD: "Vật lý (14), Hóa học (10)"
  subjectsCount: { subject: string; count: number }[];
  totalCandidates: number;
}

export interface ShiftSummaryResult {
  shiftName: 'CA 1' | 'CA 2';
  subjectCol: 'TC1' | 'TC2';
  roomStats: ShiftRoomStat[];
  totalRooms: number;
  totalCandidates: number;
  overallSubjectCounts: { subject: string; count: number }[];
}

/**
 * Ma trận số lượng đề thi / thí sinh dự thi theo từng phòng (Chuẩn Ban In sao Bộ GD&ĐT)
 */
export interface ExamPaperMatrixRoom {
  tt: number;
  roomNo: number;
  roomName: string;
  totalCandidates: number;
  countsBySubject: Record<string, number>;
}

export interface ExamPaperMatrix {
  subjects: string[];
  rooms: ExamPaperMatrixRoom[];
  totalCandidates: number;
  totalsBySubject: Record<string, number>;
}

/**
 * Phân quyền tài khoản trong hệ thống:
 * - Admin: Quản trị viên tối cao (Toàn quyền 3 phân hệ + Quản lý tài khoản cán bộ, đổi mật khẩu hệ thống)
 * - BanGiamHieu: Ban Giám hiệu (Toàn quyền xem và thao tác cả 3 phân hệ: 1. Xếp phòng thi, 2. Phân công giám thị, 3. Khảo thí GDPT 2018 toàn trường; KHÔNG can thiệp tài khoản hệ thống)
 * - GiaoVu: Giáo vụ (Chuyên trách Phân hệ 1: Xếp phòng thi & Phân hệ 2: Phân công giám thị, Hội đồng coi thi)
 * - ToTruong: Tổ trưởng chuyên môn (Chuyên trách Phân hệ 3: Bảng điểm, Ma trận, YCCĐ & AI Khảo thí can thiệp sư phạm tổ bộ môn)
 * - GiaoVien: Giáo viên bộ môn (Tra cứu lịch thi & phân công coi thi)
 */
export type UserRole = 'Admin' | 'BanGiamHieu' | 'GiaoVu' | 'ToTruong' | 'GiaoVien';

/**
 * Danh sách mã định danh quyền chức năng chi tiết
 */
export type UserPermission =
  | 'PHAN_HE_1_XEP_PHONG'       // Phân hệ 1: Xếp phòng thi & Xuất biểu mẫu A4/Excel
  | 'PHAN_HE_2_GIAM_THI'        // Phân hệ 2: Phân công Hội đồng & Giám thị coi thi
  | 'PHAN_HE_3_KHAO_THI'        // Phân hệ 3: Bảng điểm & AI Khảo thí GDPT 2018
  | 'KHAO_THI_TOAN_TRUONG'      // Xem dữ liệu khảo thí toàn trường (tất cả các môn)
  | 'CSDL_QUAN_LY_KY_THI'       // Quản lý kỳ thi, công bố kết quả tra cứu
  | 'CSDL_IMPORT_DIEM'          // Import điểm chi tiết máy chấm từ Excel
  | 'CSDL_DONG_BO_ANH'          // Quét và đồng bộ ảnh bài thi scan từ Storage
  | 'CSDL_XUAT_BAO_CAO'         // Xuất bảng thống kê phổ điểm đa sheet & danh sách phụ đạo
  | 'QUAN_TRI_TAI_KHOAN';       // Cấp mới tài khoản, phân quyền, cấu hình hệ thống

export interface PermissionDefinition {
  id: UserPermission;
  category: 'Cốt lõi' | 'Khảo thí' | 'CSDL Tra cứu' | 'Hệ thống';
  label: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'PHAN_HE_1_XEP_PHONG',
    category: 'Cốt lõi',
    label: '1. Xếp phòng thi & Biểu mẫu A4',
    description: 'Nạp danh sách thí sinh, thuật toán Rolling-Fit 2.0, xuất phiếu thu bài A4, sơ đồ chỗ ngồi, thẻ dán bàn.'
  },
  {
    id: 'PHAN_HE_2_GIAM_THI',
    category: 'Cốt lõi',
    label: '2. Phân công Hội đồng & Giám thị',
    description: 'Quản lý cán bộ coi thi, chạy thuật toán cân đối ca, in phương án & quyết định coi thi.'
  },
  {
    id: 'PHAN_HE_3_KHAO_THI',
    category: 'Cốt lõi',
    label: '3. Bảng điểm & AI Khảo thí',
    description: 'Xem bảng điểm môn học, nạp ma trận YCCĐ, chỉ số P&D câu hỏi, trợ lý AI Khảo thí sư phạm.'
  },
  {
    id: 'KHAO_THI_TOAN_TRUONG',
    category: 'Khảo thí',
    label: 'Khảo thí phạm vi Toàn trường',
    description: 'Xem phổ điểm & phân tích tất cả các môn toàn trường (nếu tắt thì chỉ xem môn theo Tổ / Chuyên môn).'
  },
  {
    id: 'CSDL_QUAN_LY_KY_THI',
    category: 'CSDL Tra cứu',
    label: 'Quản lý & Công bố Kỳ thi',
    description: 'Tạo mới kỳ thi, chỉnh sửa thông tin, bật/tắt công bố tra cứu điểm cho học sinh.'
  },
  {
    id: 'CSDL_IMPORT_DIEM',
    category: 'CSDL Tra cứu',
    label: 'Nạp điểm Excel máy chấm',
    description: 'Tải file Excel điểm chi tiết máy chấm nạp vào CSDL Supabase.'
  },
  {
    id: 'CSDL_DONG_BO_ANH',
    category: 'CSDL Tra cứu',
    label: 'Đồng bộ ảnh bài thi scan',
    description: 'Quét và đối soát tự động toàn bộ ảnh bài thi scan từ Supabase Storage.'
  },
  {
    id: 'CSDL_XUAT_BAO_CAO',
    category: 'CSDL Tra cứu',
    label: 'Xuất Báo cáo & Lọc phụ đạo',
    description: 'Xuất bảng thống kê phổ điểm đa sheet theo lớp và xuất danh sách phụ đạo theo điểm chuẩn.'
  },
  {
    id: 'QUAN_TRI_TAI_KHOAN',
    category: 'Hệ thống',
    label: 'Quản trị Tài khoản & Phân quyền',
    description: 'Cấp mới tài khoản, phân quyền chức năng, khóa tài khoản, reset mật khẩu, đồng bộ Supabase.'
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  Admin: [
    'PHAN_HE_1_XEP_PHONG',
    'PHAN_HE_2_GIAM_THI',
    'PHAN_HE_3_KHAO_THI',
    'KHAO_THI_TOAN_TRUONG',
    'CSDL_QUAN_LY_KY_THI',
    'CSDL_IMPORT_DIEM',
    'CSDL_DONG_BO_ANH',
    'CSDL_XUAT_BAO_CAO',
    'QUAN_TRI_TAI_KHOAN'
  ],
  BanGiamHieu: [
    'PHAN_HE_1_XEP_PHONG',
    'PHAN_HE_2_GIAM_THI',
    'PHAN_HE_3_KHAO_THI',
    'KHAO_THI_TOAN_TRUONG',
    'CSDL_QUAN_LY_KY_THI',
    'CSDL_IMPORT_DIEM',
    'CSDL_DONG_BO_ANH',
    'CSDL_XUAT_BAO_CAO'
  ],
  GiaoVu: [
    'PHAN_HE_1_XEP_PHONG',
    'PHAN_HE_2_GIAM_THI',
    'CSDL_QUAN_LY_KY_THI',
    'CSDL_IMPORT_DIEM',
    'CSDL_DONG_BO_ANH',
    'CSDL_XUAT_BAO_CAO'
  ],
  ToTruong: [
    'PHAN_HE_3_KHAO_THI',
    'CSDL_XUAT_BAO_CAO'
  ],
  GiaoVien: [
    'PHAN_HE_2_GIAM_THI'
  ]
};

export function hasUserPermission(
  user: UserProfile | null | undefined,
  permission: UserPermission
): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }
  const defaults = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  return defaults.includes(permission);
}

/**
 * Ma trận câu hỏi đề kiểm tra (File 2)
 */
export interface ExamMatrixItem {
  questionNo: string;       // Câu 1, Câu 2...
  topic: string;            // Chủ đề / Mạch nội dung (VD: Este - Lipit, Khúc xạ ánh sáng...)
  thinkingLevel: 'Biết' | 'Hiểu' | 'Vận dụng' | 'Vận dụng cao'; // Mức độ tư duy
  maxScore: number;         // Điểm tối đa của câu hỏi
  yccdCode?: string;        // Mã YCCĐ liên kết (VD: YCCD-HOA12-01)
}

/**
 * Danh mục Yêu cầu cần đạt - YCCĐ (File 3)
 */
export interface ExamYccdItem {
  code: string;             // Mã YCCĐ
  topic: string;            // Chủ đề
  description: string;      // Nội dung yêu cầu cần đạt theo CT GDPT 2018
  benchmarkTarget?: number; // Ngưỡng kỳ vọng đạt (%)
}

/**
 * Kết quả phân tích câu hỏi (Item Analysis: P & D)
 */
export interface ItemAnalysisResult {
  questionNo: string;
  topic: string;
  yccdDescription?: string;
  difficultyP: number;      // Độ khó P (0.00 - 1.00)
  difficultyLabel: 'Rất khó' | 'Phù hợp/Phân hóa tốt' | 'Dễ/Rất dễ';
  discriminationD: number;  // Độ phân biệt D (-1.00 - 1.00)
  discriminationLabel: 'Cảnh báo nghiêm trọng' | 'Cần xem xét' | 'Tốt/Rất tốt';
  isAnomaly: boolean;       // D < 0.1 hoặc D < 0
}

/**
 * Tỷ lệ đạt theo từng Yêu cầu cần đạt (YCCĐ)
 */
export interface YccdAchievementStat {
  code: string;
  topic: string;
  description: string;
  passRate: number;         // Tỷ lệ đạt (%)
  status: 'Tốt' | 'Đạt' | 'Cần củng cố' | 'Ưu tiên can thiệp gấp';
  questionCount: number;
}

/**
 * Báo cáo khảo thí chuyên gia 4 phần theo chuẩn GDPT 2018
 */
export interface ExpertPedagogicalReport {
  partA_Overview: {
    generalImpression: string;
    highlights: string[];
  };
  partB_Interventions: {
    knowledgeBottlenecks: { topicOrYccd: string; passRate: number; severity: string; details: string }[];
    instrumentAnomalies: { questionNo: string; pIndex: number; dIndex: number; warningReason: string }[];
  };
  partC_Hypotheses: {
    learningAndTeachingHypotheses: string[];
    assessmentDesignHypotheses: string[];
  };
  partD_ActionPlan: {
    issueTarget: string;
    studentTargetGroup: string;
    pedagogicalAction: string;
  }[];
  isAdaptiveFallback?: boolean; // True nếu tự động suy luận GDPT 2018 khi chưa nạp Ma trận/YCCĐ
}

/**
 * Thông tin chi tiết hồ sơ người dùng (tương thích bảng profiles trong Supabase)
 */
export interface UserProfile {
  id: string;             // Supabase auth user UUID
  email: string;          // Tên đăng nhập là email
  full_name: string;      // Họ và tên
  unit: string;           // Đơn vị
  specialization: string; // Chuyên môn
  phone: string;          // Số điện thoại
  role: UserRole;         // 'Admin', 'BanGiamHieu', 'GiaoVu', 'ToTruong', 'GiaoVien'
  permissions?: UserPermission[]; // Danh sách nhóm chức năng được cấp quyền (đồng bộ Supabase)
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  error?: string | null;
}

/**
 * Kiểu quy luật sơ đồ SBD phòng thi
 */
export type SeatingPattern = 'ziczac_horizontal' | 'ziczac_vertical' | 'serpentine_s' | 'reverse_bottom_up';

export interface DeskPosition {
  deskNumber: number; // 1 đến 24 bàn trong phòng
  row: number;        // Hàng 1 đến 6 từ trước ra sau
  col: number;        // Dãy 1 đến 4 từ trái sang phải
  candidateLeft?: CandidateAssigned | null;
  candidateRight?: CandidateAssigned | null;
}

/**
 * Giáo viên / Cán bộ coi thi
 */
export interface TeacherProctor {
  id: string;
  code: string;
  fullName: string;
  department: string; // Tổ chuyên môn: Toán - Tin, Ngữ văn, KHTN (Lý-Hóa-Sinh), KHXH (Sử-Địa-GDCD), Ngoại ngữ...
  gender: 'Nam' | 'Nữ';
  phone?: string;
  notes?: string;
  assignedCount?: number; // Số ca coi thi đã gán
}

/**
 * Phân công coi thi cho từng phòng thi
 */
export interface RoomProctorAssignment {
  roomNo: number;
  roomCode: string;
  candidateCount?: number;
  proctor1: TeacherProctor | null;
  proctor2: TeacherProctor | null;
  notes?: string;
}

/**
 * Bản ghi điểm thi của 1 thí sinh
 */
/**
 * Bản ghi điểm thi của 1 thí sinh
 * Hỗ trợ 4 trạng thái khảo thí chuẩn mực:
 * - 'present': Có dự thi, có điểm số hợp lệ (từ 0.0 đến 10.0)
 * - 'absent_vt': Vắng thi (VT) -> Không tính điểm 0, thống kê danh sách vắng riêng
 * - 'not_registered': Không đăng ký thi môn này (để trống) -> Hoàn toàn loại khỏi mẫu số thống kê của môn
 */
export interface StudentScoreRow {
  stt?: number;
  sbd: string;
  fullName: string;
  className: string;
  dob?: string;
  scores: Record<string, number | null>; // Tên môn -> Điểm (null nếu vắng thi hoặc không đăng ký)
  examStatuses?: Record<string, 'present' | 'absent_vt' | 'not_registered'>; // Trạng thái dự thi từng môn
}

export interface ClassScoreRangeStat {
  className: string;
  totalStudents: number;   // Số bài thi thực tế có điểm trong lớp
  registeredStudents?: number; // Tổng số HS đăng ký môn của lớp (có điểm + vắng VT)
  absentCount?: number;    // Số học sinh vắng thi VT của lớp
  unregisteredCount?: number; // Số học sinh không đăng ký môn của lớp
  count0to1: number;       // 0 - 1.0 (Liệt thực tế từ bài thi)
  pct0to1: number;
  count11to34: number;     // 1.1 - 3.4 (Kém)
  pct11to34: number;
  count35to49: number;     // 3.5 - 4.9 (Yếu)
  pct35to49: number;
  count5to64: number;      // 5.0 - 6.4 (Trung bình)
  pct5to64: number;
  count65to79: number;     // 6.5 - 7.9 (Khá)
  pct65to79: number;
  count8to10: number;      // 8.0 - 10.0 (Giỏi/Xuất sắc)
  pct8to10: number;
  countAboveFive: number;  // >= 5.0
  pctAboveFive: number;
  mean: number;
}

/**
 * Thống kê khảo thí chuyên sâu cho 1 môn
 */
export interface SubjectMetricSummary {
  subjectName: string;
  totalInGrade: number;           // Tổng số học sinh toàn khối trong file (VD: 684)
  registeredCandidates: number;   // Số học sinh đăng ký dự thi môn này (Có điểm + Vắng thi VT) (VD: 120)
  totalCandidates: number;        // Số bài thi thực tế có điểm hợp lệ (Mẫu số tính phổ điểm N) (VD: 118)
  absentCount: number;            // Số học sinh vắng thi VT (VD: 2)
  absentRate: number;             // Tỷ lệ vắng thi % (VD: 1.7%)
  unregisteredCount: number;      // Số học sinh không đăng ký môn này (VD: 564)
  realZeroCount: number;          // Số học sinh đạt điểm 0 thực tế (VD: 0 hoặc 1)
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  min: number;
  max: number;
  distribution: { rangeLabel: string; count: number; percentage: number }[];
  rateExcellent: number;     // >= 8.0
  rateGood: number;          // 6.5 - 7.9
  rateAverage: number;       // 5.0 - 6.4
  rateBelowAverage: number;  // < 5.0
  rateFailed: number;        // <= 1.0 (Điểm liệt thực tế từ bài thi)
  classBreakdown: { className: string; count: number; mean: number; rateAboveFive: number; absentCount?: number }[];
  classRangeStats?: ClassScoreRangeStat[]; // Thống kê chi tiết 6 mức điểm theo từng lớp (0-1, 1.1-3.4, 3.5-4.9, 5-6.4, 6.5-7.9, 8-10)
  overallRangeStat?: ClassScoreRangeStat;  // Tổng hợp toàn khối
  aiAnalysis?: {
    generalAssessment: string;
    keyStrengths: string[];
    keyWeaknesses: string[];
    actionableSolutions: string[];
  };
}

/**
 * Cấu trúc Kỳ thi / Đợt kiểm tra lưu trên Supabase Cloud
 */
export interface ExamSeason {
  id: string;
  title: string;
  academic_year: string;
  exam_type: string;
  subject?: string;
  exam_date?: string;
  is_published: boolean;
  total_candidates?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Bản ghi kết quả thi của thí sinh (Học sinh tra cứu bằng SBD + CCCD)
 */
export interface StudentExamScoreRecord {
  id?: string;
  exam_id: string;
  sbd: string;
  cccd: string;
  full_name: string;
  class_name: string;
  dob?: string;
  exam_code?: string;
  room_name?: string;
  total_score: number;
  part1_score?: number | null;
  part2_score?: number | null;
  part3_score?: number | null;
  item_responses?: any[];
  subject_scores?: Record<string, number | string | null>;
  average_score?: number | null;
  subjects_count?: number;
  paper_images?: Record<string, string>; // Danh sách link ảnh bài thi theo môn: { "Toán": "url", "Vật lí": "url" }
  class_rank?: number | null;
  grade_rank?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Kết quả trả về khi Học sinh tra cứu điểm thành công
 */
export interface ScoreLookupResult {
  student: {
    id?: string;
    sbd: string;
    cccd_masked: string;
    full_name: string;
    class_name: string;
    dob?: string;
    exam_code?: string;
    room_name?: string;
    total_score: number;
    part1_score?: number | null;
    part2_score?: number | null;
    part3_score?: number | null;
    item_responses?: any[];
    subject_scores?: Record<string, number | string | null>;
    average_score?: number | null;
    subjects_count?: number;
    paper_images?: Record<string, string>; // Link ảnh bài thi scan các môn
    class_rank?: number | null;
    grade_rank?: number | null;
    notes?: string;
  };
  exam: {
    id: string;
    title: string;
    academic_year: string;
    exam_type: string;
    subject?: string;
    exam_date?: string;
  };
}


