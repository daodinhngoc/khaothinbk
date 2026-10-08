import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  FileSpreadsheet, 
  Code2, 
  Printer, 
  Sparkles, 
  Download, 
  Layers, 
  School, 
  Users, 
  CheckCircle2,
  Table,
  HelpCircle
} from 'lucide-react';

import { CandidateAssigned, CandidateInput, ExamConfig, ExportColumnsConfig, OptimizationResult, UserProfile, hasUserPermission } from './types';
import { generateSampleCandidates } from './utils/sampleData';
import { optimizeRoomAllocation, recalculateOptimizationResult, getRoomDisplayLabel } from './utils/optimizer';
import { DEFAULT_EXPORT_CONFIG } from './utils/columnDefaults';
import { Sidebar } from './components/Sidebar';
import { OverviewMetrics } from './components/OverviewMetrics';
import { DownloadPanel } from './components/DownloadPanel';
import { RoomDetailView } from './components/RoomDetailView';
import { CombosBreakdown } from './components/CombosBreakdown';
import { PrintA4Preview } from './components/PrintA4Preview';
import { PythonCodeModal } from './components/PythonCodeModal';
import { ShiftSummaryView } from './components/ShiftSummaryView';
import { PrintShiftSummaryModal } from './components/PrintShiftSummaryModal';
import { ManualRoomSplitModal } from './components/ManualRoomSplitModal';
import { ColumnConfigModal } from './components/ColumnConfigModal';
import { PrintMultiSubjectModal } from './components/PrintMultiSubjectModal';
import { LoginPage } from './components/auth/LoginPage';
import { AdminUserManagementModal } from './components/admin/AdminUserManagementModal';
import { SupabaseGuideModal } from './components/admin/SupabaseGuideModal';
import { UserGuideModal } from './components/UserGuideModal';
import { ExamScoreManagementModal } from './components/admin/ExamScoreManagementModal';
import { getActiveUser, logoutUser, isSupabaseConfigured } from './lib/supabaseClient';
import { BarChart3, Scissors, SlidersHorizontal, TableProperties, Shield, Database, LogOut, KeyRound, Palette, Cloud } from 'lucide-react';
import { AppTheme, THEMES, getSavedTheme, saveTheme } from './lib/theme';
import { HeaderFooterSettings, getSavedHeaderFooter, HeaderFooterCustomModal } from './components/HeaderFooterCustomModal';
import { AdminChangePasswordModal } from './components/admin/AdminChangePasswordModal';
import { AppFooter } from './components/AppFooter';
import { SeatingChartModule } from './components/seating/SeatingChartModule';
import { InvigilatorManagementView } from './components/invigilators/InvigilatorManagementView';
import { ScoreAnalyticsModule } from './components/analytics/ScoreAnalyticsModule';
import { UserCheck, LayoutGrid, TrendingUp } from 'lucide-react';

import { getCurrentSchoolYear } from './utils/subjectHelper';

export default function App() {
  const initialHf = getSavedHeaderFooter();
  const currentDefaultSchoolYr = getCurrentSchoolYear();

  // Cấu hình kỳ thi theo yêu cầu: Điểm thi mặc định NBK-CH, Năm học tính toán thông minh theo thời điểm
  const [config, setConfig] = useState<ExamConfig>({
    examCategory: 'Kiểm tra định kỳ',
    subPeriod: 'Giữa kỳ 1',
    maxPerRoom: 24,
    startRoomCode: '01',
    startSbd: '52830001',
    deptName: initialHf.deptName || 'SỞ GD&ĐT GIA LAI',
    schoolName: initialHf.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM',
    examCenterCode: initialHf.examCenterCode || 'NBK-CH',
    schoolYear: initialHf.schoolYear || currentDefaultSchoolYr,
    countryTitle: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    mottoTitle: 'Độc lập - Tự do - Hạnh phúc',
    sheetTitle: 'DANH SÁCH THÍ SINH VÀ PHIẾU THU BÀI THI TỔNG HỢP CÁC MÔN',
    supervisor1Title: 'GIÁM THỊ 1',
    supervisor2Title: 'GIÁM THỊ 2',
    dateLine: 'Ngày ..... tháng ..... năm 20.....',
    locationName: '',
    leaderTitle: 'TRƯỞNG ĐIỂM THI',
    surveyAllocationMode: 'bo_gddt_rolling_fit',
    roomAssignmentModel: 'moet_fixed',
    sortSbdAscendingInRoom: true,
  });

  // Tùy biến Theme giao diện & Header/Footer
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getSavedTheme);
  const [headerFooterSettings, setHeaderFooterSettings] = useState<HeaderFooterSettings>(initialHf);
  const [showHeaderFooterModal, setShowHeaderFooterModal] = useState<boolean>(false);
  const [showAdminChangePasswordModal, setShowAdminChangePasswordModal] = useState<boolean>(false);

  const themeConfig = THEMES[currentTheme] || THEMES['neon-blue'];

  // Dữ liệu thí sinh đầu vào
  const [candidates, setCandidates] = useState<CandidateInput[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Kết quả xếp phòng
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [initialAutoResult, setInitialAutoResult] = useState<OptimizationResult | null>(null);
  const [isManuallyModified, setIsManuallyModified] = useState<boolean>(false);
  const [splitMessage, setSplitMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Phân hệ cốt lõi: 
  // 1. 'room_allocation': Sắp xếp phòng thi cho 2 loại kỳ thi & Báo cáo
  // 2. 'proctor_council': Phân công giám thị coi thi & Hội đồng coi thi
  // 3. 'score_analytics': Bảng điểm & AI Khảo thí (Phương án A)
  const [mainModule, setMainModule] = useState<'room_allocation' | 'proctor_council' | 'score_analytics'>('room_allocation');
  const [activeTab, setActiveTab] = useState<'rooms' | 'proctor' | 'seating' | 'analytics' | 'shift_summary' | 'combos' | 'raw'>('rooms');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showMultiSubjectModal, setShowMultiSubjectModal] = useState<boolean>(false);
  const [showShiftPrintModal, setShowShiftPrintModal] = useState<'CA 1' | 'CA 2' | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [splitModalRoomNo, setSplitModalRoomNo] = useState<number | null>(null);

  // Cấu hình cột xuất file & in A4
  const [exportColumnsConfig, setExportColumnsConfig] = useState<ExportColumnsConfig>(DEFAULT_EXPORT_CONFIG);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState<boolean>(false);
  const [availableFileKeys, setAvailableFileKeys] = useState<string[]>([
    'TT', 'SBD', 'CCD', 'Lớp', 'Họ tên', 'Ngày sinh', 'Nhóm', 'M1', 'M2', 'TC1', 'TC2'
  ]);

  // Xác thực người dùng & Phân quyền Supabase
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [showAdminUserModal, setShowAdminUserModal] = useState<boolean>(false);
  const [showSupabaseGuideModal, setShowSupabaseGuideModal] = useState<boolean>(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState<boolean>(false);
  const [showExamScoreManagementModal, setShowExamScoreManagementModal] = useState<boolean>(false);

  // Kiểm tra phiên đăng nhập ban đầu & Tự động điều hướng theo vai trò:
  // - ToTruong: Tự động chuyển ngay vào Phân hệ 3 (score_analytics)
  // - GiaoVu: Vào Phân hệ 1 hoặc 2 (room_allocation / proctor_council)
  // - Admin: Toàn quyền truy cập cả 3 phân hệ
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getActiveUser();
        setCurrentUser(user);
        if (user?.role === 'ToTruong') {
          setMainModule('score_analytics');
        } else if (user?.role === 'GiaoVu' || user?.role === 'BanGiamHieu') {
          setMainModule('room_allocation');
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Đồng bộ phân hệ mặc định ngay khi người dùng đăng nhập hoặc đổi tài khoản
  useEffect(() => {
    if (currentUser) {
      if (!hasUserPermission(currentUser, 'PHAN_HE_1_XEP_PHONG')) {
        if (hasUserPermission(currentUser, 'PHAN_HE_3_KHAO_THI')) {
          setMainModule('score_analytics');
        } else if (hasUserPermission(currentUser, 'PHAN_HE_2_GIAM_THI')) {
          setMainModule('proctor_council');
        }
      }
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (!hasUserPermission(user, 'PHAN_HE_1_XEP_PHONG')) {
      if (hasUserPermission(user, 'PHAN_HE_3_KHAO_THI')) {
        setMainModule('score_analytics');
      } else if (hasUserPermission(user, 'PHAN_HE_2_GIAM_THI')) {
        setMainModule('proctor_council');
      }
    } else {
      setMainModule('room_allocation');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setMainModule('room_allocation');
  };

  // Tự động nạp dữ liệu: ưu tiên dữ liệu đã lưu tạm trên máy này của người dùng
  useEffect(() => {
    try {
      const cached = localStorage.getItem('room_allocation_candidates_cache_v2');
      const cachedName = localStorage.getItem('room_allocation_filename_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCandidates(parsed);
          setUploadedFileName(cachedName || 'Du_lieu_thi_sinh_da_luu.xlsx');
          const initialResult = optimizeRoomAllocation(
            parsed,
            config.maxPerRoom,
            config.startRoomCode,
            config.examCategory,
            config.startSbd
          );
          setResult(initialResult);
          setInitialAutoResult(initialResult);
          return;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc cache thí sinh trên máy:', e);
    }

    const sample = generateSampleCandidates(240, config.examCategory);
    setCandidates(sample);
    setUploadedFileName(
      config.examCategory.includes('Kiểm tra')
        ? 'Mau_Kiem_Tra_Dinh_Ky_240_HS.xlsx'
        : 'Mau_Thi_Thu_Khao_Sat_240_HS.xlsx'
    );
    
    // Tự động chạy thuật toán xếp phòng lần đầu
    const initialResult = optimizeRoomAllocation(
      sample,
      config.maxPerRoom,
      config.startRoomCode,
      config.examCategory,
      config.startSbd,
      config.balanceRoomsInGroup !== false,
      config.surveyAllocationMode || 'bo_gddt_rolling_fit',
      config.sortSbdAscendingInRoom ?? true
    );
    setResult(initialResult);
    setInitialAutoResult(initialResult);
  }, []);

  const handleConfigChange = (newConfig: Partial<ExamConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);

    if (newConfig.examCategory && newConfig.examCategory.includes('Kiểm tra') && activeTab === 'shift_summary') {
      setActiveTab('rooms');
    }

    // Nếu thay đổi các thông số cấu hình cốt lõi (category, startSbd, maxPerRoom, startRoomCode, sortSbdAscendingInRoom, balanceRoomsInGroup)
    if (
      candidates.length > 0 &&
      (newConfig.examCategory !== undefined ||
       newConfig.startSbd !== undefined ||
       newConfig.maxPerRoom !== undefined ||
       newConfig.startRoomCode !== undefined ||
       newConfig.sortSbdAscendingInRoom !== undefined ||
       newConfig.balanceRoomsInGroup !== undefined)
    ) {
      handleExecute(
        candidates,
        updated.maxPerRoom,
        updated.startRoomCode,
        updated.examCategory,
        updated.startSbd,
        updated.balanceRoomsInGroup !== false,
        updated.surveyAllocationMode || 'bo_gddt_rolling_fit',
        updated.sortSbdAscendingInRoom ?? true
      );
    }
  };

  const handleLoadSample = () => {
    try {
      localStorage.removeItem('room_allocation_candidates_cache_v2');
      localStorage.removeItem('room_allocation_filename_cache_v2');
    } catch (e) {
      // ignore
    }

    const sample = generateSampleCandidates(240, config.examCategory);
    setCandidates(sample);
    const fname = config.examCategory.includes('Kiểm tra')
      ? 'Mau_Kiem_Tra_Dinh_Ky_240_HS.xlsx'
      : 'Mau_Thi_Thu_Khao_Sat_240_HS.xlsx';
    setUploadedFileName(fname);
    setAvailableFileKeys(
      config.examCategory.includes('Kiểm tra')
        ? ['TT', 'SBD', 'CCD', 'Lớp', 'Họ tên', 'Ngày sinh', 'Nhóm']
        : ['TT', 'SBD', 'CCD', 'Lớp', 'Họ tên', 'Ngày sinh', 'M1', 'M2', 'TC1', 'TC2']
    );
    handleExecute(sample, config.maxPerRoom, config.startRoomCode, config.examCategory, config.startSbd);
  };

  const handleUploadData = (data: CandidateInput[], filename: string, originalKeys?: string[]) => {
    try {
      localStorage.setItem('room_allocation_candidates_cache_v2', JSON.stringify(data));
      localStorage.setItem('room_allocation_filename_cache_v2', filename);
    } catch (e) {
      console.warn('Lỗi lưu tạm danh sách thí sinh trên máy:', e);
    }

    setCandidates(data);
    setUploadedFileName(filename);
    if (originalKeys && originalKeys.length > 0) {
      setAvailableFileKeys(originalKeys);
    }
    handleExecute(
      data,
      config.maxPerRoom,
      config.startRoomCode,
      config.examCategory,
      config.startSbd,
      config.balanceRoomsInGroup !== false,
      config.surveyAllocationMode || 'bo_gddt_rolling_fit',
      config.sortSbdAscendingInRoom ?? true
    );
  };

  const handleExecute = (
    dataToUse = candidates,
    maxRoom = config.maxPerRoom,
    startCode = config.startRoomCode,
    examCat = config.examCategory,
    startSbd = config.startSbd,
    balanceRooms = config.balanceRoomsInGroup !== false,
    surveyMode = config.surveyAllocationMode || 'bo_gddt_rolling_fit',
    sortSbdAscending = config.sortSbdAscendingInRoom ?? true
  ) => {
    if (!dataToUse || dataToUse.length === 0) return;
    setIsProcessing(true);
    setIsManuallyModified(false);
    setSplitMessage(null);

    setTimeout(() => {
      const optimized = optimizeRoomAllocation(
        dataToUse,
        maxRoom,
        startCode,
        examCat,
        startSbd,
        balanceRooms,
        surveyMode,
        sortSbdAscending
      );
      setResult(optimized);
      setInitialAutoResult(optimized);
      setIsProcessing(false);

      // Bắn pháo hoa ăn mừng xếp phòng hoàn tất
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {
        // ignore
      }
    }, 200);
  };


  // Áp dụng chia tách phòng thủ công
  const handleApplySplit = (newCandidates: CandidateAssigned[], message: string) => {
    const recalculated = recalculateOptimizationResult(
      newCandidates,
      config.maxPerRoom,
      config.startRoomCode,
      config.sortSbdAscendingInRoom ?? true
    );
    setResult(recalculated);
    setIsManuallyModified(true);
    setSplitMessage(message);

    try {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 }
      });
    } catch (e) {
      // ignore
    }
  };

  // Khôi phục về phương án xếp phòng tự động ban đầu
  const handleResetToAuto = () => {
    if (candidates.length === 0) return;
    const restored = optimizeRoomAllocation(
      candidates,
      config.maxPerRoom,
      config.startRoomCode,
      config.examCategory,
      config.startSbd,
      config.balanceRoomsInGroup !== false,
      config.surveyAllocationMode || 'bo_gddt_rolling_fit',
      config.sortSbdAscendingInRoom ?? true
    );
    setResult(restored);
    setIsManuallyModified(false);
    setSplitMessage('Đã khôi phục về phương án xếp phòng tự động ban đầu.');
  };


  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Đang kiểm tra thông tin phiên đăng nhập...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenSupabaseGuide={() => setShowSupabaseGuideModal(true)}
        />
        {showSupabaseGuideModal && (
          <SupabaseGuideModal
            isOpen={showSupabaseGuideModal}
            onClose={() => setShowSupabaseGuideModal(false)}
          />
        )}
      </>
    );
  }

  // Phân hệ hiệu lực dựa trên quyền thực tế được cấp cho tài khoản
  const canAccessRoom = !currentUser || hasUserPermission(currentUser, 'PHAN_HE_1_XEP_PHONG');
  const canAccessProctor = !currentUser || hasUserPermission(currentUser, 'PHAN_HE_2_GIAM_THI');
  const canAccessAnalytics = !currentUser || hasUserPermission(currentUser, 'PHAN_HE_3_KHAO_THI');

  const effectiveModule = 
    (mainModule === 'room_allocation' && canAccessRoom) ? 'room_allocation' :
    (mainModule === 'proctor_council' && canAccessProctor) ? 'proctor_council' :
    (mainModule === 'score_analytics' && canAccessAnalytics) ? 'score_analytics' :
    canAccessRoom ? 'room_allocation' :
    canAccessProctor ? 'proctor_council' :
    canAccessAnalytics ? 'score_analytics' : 'room_allocation';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Sidebar - chỉ hiển thị khi ở Phân hệ 1: Xếp phòng thi */}
      {effectiveModule === 'room_allocation' && (
        <Sidebar
          config={config}
          onChangeConfig={handleConfigChange}
          onLoadSampleData={handleLoadSample}
          onUploadData={handleUploadData}
          onExecuteAllocation={() => handleExecute()}
          onOpenColumnConfig={() => setIsColumnConfigOpen(true)}
          candidatesCount={candidates.length}
          isProcessing={isProcessing}
          uploadedFileName={uploadedFileName}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar: Identity, Supabase Status & User Auth */}
        <div className="bg-slate-900 text-slate-100 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 tracking-wide">
              {config.deptName} • {config.schoolName}
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">Năm học {config.schoolYear}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase Status Button */}
            <button
              onClick={() => setShowSupabaseGuideModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                isSupabaseConfigured
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800 hover:bg-amber-900/80'
              }`}
              title="Xem thông tin và cấu hình CSDL Supabase thực tế"
            >
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <Database className="w-3 h-3" />
              <span>{isSupabaseConfigured ? 'Supabase: Đã kết nối' : 'Supabase: Demo nội bộ'}</span>
            </button>

            {/* Theme & Header/Footer Customization Button */}
            <button
              id="btn-custom-theme-header"
              onClick={() => setShowHeaderFooterModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Tùy biến Theme màu sắc Neon và Header/Footer"
            >
              <Palette className={`w-3.5 h-3.5 ${themeConfig.iconColor}`} />
              <span className="hidden md:inline">Giao diện & Tiêu đề</span>
              <span className="md:hidden">Themes</span>
            </button>

            {/* User Guide Button */}
            <button
              id="btn-user-guide"
              onClick={() => setShowUserGuideModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
              title="Hướng dẫn sử dụng hệ thống từ A-Z cho người mới bắt đầu"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden sm:inline">Hướng dẫn sử dụng</span>
              <span className="sm:hidden">HDSD</span>
            </button>

            {/* Quản lý Kỳ thi & Tra cứu Điểm Supabase (Dành cho Quản trị viên, BGH, Giáo vụ, Tổ trưởng) */}
            <button
              id="btn-admin-manage-exam-scores"
              onClick={() => setShowExamScoreManagementModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer border border-emerald-500/50"
              title="Quản lý Kỳ thi, Công bố kết quả & Cập nhật điểm lên Supabase để Học sinh tra cứu"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Kỳ thi & Tra cứu Điểm</span>
              <span className="sm:hidden">Điểm Cloud</span>
            </button>

            {/* Admin User Management Button */}
            {currentUser?.role === 'Admin' && (
              <>
                <button
                  id="btn-admin-manage-users"
                  onClick={() => setShowAdminUserModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                  title="Cấp tài khoản và phân quyền cán bộ giáo viên"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Quản lý Tài khoản (Admin)</span>
                  <span className="sm:hidden">TK Admin</span>
                </button>

                <button
                  id="btn-admin-change-password"
                  onClick={() => setShowAdminChangePasswordModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg text-[11px] font-semibold border border-purple-700 transition-colors cursor-pointer"
                  title="Đổi mật khẩu Quản trị viên (Lưu trực tiếp vào CSDL Supabase Auth)"
                >
                  <KeyRound className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden sm:inline">Đổi MK Admin</span>
                  <span className="sm:hidden">Đổi MK</span>
                </button>
              </>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 bg-slate-800/90 py-0.5 px-2 rounded-lg border border-slate-700">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white ${
                currentUser?.role === 'Admin' 
                  ? 'bg-purple-600' 
                  : currentUser?.role === 'BanGiamHieu'
                  ? 'bg-rose-600'
                  : currentUser?.role === 'GiaoVu'
                  ? 'bg-amber-600'
                  : currentUser?.role === 'ToTruong'
                  ? 'bg-emerald-600'
                  : 'bg-blue-600'
              }`}>
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="leading-tight hidden sm:block text-left">
                <span className="font-semibold text-slate-200 block truncate max-w-[130px]">{currentUser?.full_name}</span>
                <span className="text-[10px] text-slate-400">{currentUser?.unit}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                currentUser?.role === 'Admin'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : currentUser?.role === 'BanGiamHieu'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : currentUser?.role === 'GiaoVu'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : currentUser?.role === 'ToTruong'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-blue-950 text-blue-300 border border-blue-800'
              }`}>
                {currentUser?.role === 'Admin' ? 'Admin' : currentUser?.role === 'BanGiamHieu' ? 'Ban Giám hiệu' : currentUser?.role === 'GiaoVu' ? 'Giáo vụ' : currentUser?.role === 'ToTruong' ? 'Tổ trưởng' : 'Giáo viên'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${themeConfig.badgeBg} flex items-center justify-center font-bold text-lg shrink-0`}>
              📋
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                {currentUser?.role === 'ToTruong'
                  ? `Phân hệ Khảo thí GDPT 2018 • ${currentUser.unit || 'Tổ Chuyên Môn'}`
                  : currentUser?.role === 'BanGiamHieu'
                  ? (headerFooterSettings.systemTitle || 'Hệ thống Quản lý Khảo thí & Coi thi THPT • Ban Giám hiệu')
                  : (headerFooterSettings.systemTitle || 'Hệ thống Quản lý Khảo thí & Coi thi THPT')}
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                {currentUser?.role === 'ToTruong' ? (
                  <>
                    <span className="font-semibold text-emerald-700">Tổ trưởng: {currentUser.full_name}</span>
                    <span>•</span>
                    <span>Chuyên môn: <strong className="text-slate-700">{currentUser.specialization}</strong></span>
                    <span>•</span>
                    <span>NH {config.schoolYear}</span>
                  </>
                ) : (
                  <>
                    <span>{config.examCategory} ({config.subPeriod})</span>
                    <span>•</span>
                    <span>Điểm thi: <strong className="text-slate-700 font-mono">{config.examCenterCode}</strong></span>
                    <span>•</span>
                    <span>NH {config.schoolYear}</span>
                  </>
                )}
              </div>
            </div>
          </div>

            {/* CHUYỂN ĐỔI 3 PHÂN HỆ CỐT LÕI (THEO PHÂN QUYỀN VAI TRÒ HOẶC QUYỀN TÙY BIẾN) */}
            {currentUser?.role === 'ToTruong' && !hasUserPermission(currentUser, 'PHAN_HE_1_XEP_PHONG') && !hasUserPermission(currentUser, 'PHAN_HE_2_GIAM_THI') ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Khảo thí GDPT 2018 & Phân tích Đánh giá Chất lượng</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-700 text-emerald-100">
                  Tổ chuyên môn
                </span>
              </div>
            ) : (
              <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200 rounded-xl shadow-2xs">
                {/* Phân hệ 1: Xếp phòng thi & Báo cáo */}
                {(!currentUser || hasUserPermission(currentUser, 'PHAN_HE_1_XEP_PHONG')) && (
                  <button
                    id="btn-switch-room-module"
                    type="button"
                    onClick={() => {
                      setMainModule('room_allocation');
                      if (activeTab === 'proctor') setActiveTab('rooms');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      effectiveModule === 'room_allocation'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title="Phân hệ 1: Sắp xếp phòng thi cho 2 loại kỳ thi & Xuất biểu mẫu báo cáo A4"
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>1. Xếp phòng thi & Báo cáo</span>
                    {result && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                        effectiveModule === 'room_allocation' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {result.totalRooms} phòng
                      </span>
                    )}
                  </button>
                )}

                {/* Phân hệ 2: Phân công Hội đồng & Giám thị */}
                {(!currentUser || hasUserPermission(currentUser, 'PHAN_HE_2_GIAM_THI')) && (
                  <button
                    id="btn-switch-proctor-module"
                    type="button"
                    onClick={() => setMainModule('proctor_council')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      effectiveModule === 'proctor_council'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title="Phân hệ 2: Phân công giám thị coi thi & các thành viên trong Hội đồng"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>2. Phân công Hội đồng & Giám thị</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      effectiveModule === 'proctor_council' ? 'bg-purple-700 text-purple-100' : 'bg-purple-100 text-purple-700'
                    }`}>
                      Quy chế
                    </span>
                  </button>
                )}

                {/* Phân hệ 3: Bảng điểm & AI Khảo thí */}
                {(!currentUser || hasUserPermission(currentUser, 'PHAN_HE_3_KHAO_THI')) && (
                  <button
                    id="btn-switch-analytics-module"
                    type="button"
                    onClick={() => setMainModule('score_analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      effectiveModule === 'score_analytics'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title="Phân hệ 3: Bảng điểm, Ma trận, YCCĐ & AI Khảo thí GDPT 2018"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>3. Bảng điểm & AI Khảo thí</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      effectiveModule === 'score_analytics' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Khảo thí
                    </span>
                  </button>
                )}
              </div>
            )}

          {/* Quick Actions Contextual to Active Module */}
          <div className="flex items-center gap-2">
            {effectiveModule === 'room_allocation' ? (
              <>
                <button
                  id="btn-open-col-config-topbar"
                  type="button"
                  onClick={() => setIsColumnConfigOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Tùy biến cột xuất file và xem trước vừa khít trang in A4"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Cấu hình cột (Fit A4)</span>
                </button>

                {result && (
                  <button
                    type="button"
                    onClick={() => setSplitModalRoomNo(result.totalRooms)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Mở công cụ chia tách phòng thi thủ công"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Chia tách phòng...</span>
                  </button>
                )}

                <button
                  id="btn-open-code-modal"
                  type="button"
                  onClick={() => setShowCodeModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden 2xl:inline">Mã Python</span>
                </button>

                {result && (
                  <>
                    <button
                      id="btn-open-multi-subject-topbar"
                      type="button"
                      onClick={() => setShowMultiSubjectModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="Mở Phiếu thu bài tất cả các môn vào 1 trang (A4 Ngang)"
                    >
                      <TableProperties className="w-3.5 h-3.5" />
                      <span>Phiếu thu bài (A4)</span>
                    </button>

                    <button
                      id="btn-open-print-preview"
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>In ấn A4</span>
                    </button>
                  </>
                )}
              </>
            ) : effectiveModule === 'score_analytics' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold hidden md:inline">
                  {currentUser?.role === 'ToTruong' ? 'Tổ trưởng: Khảo thí GDPT 2018' : currentUser?.role === 'BanGiamHieu' ? 'BGH: Giám sát Khảo thí Toàn trường' : 'Chế độ: Bảng điểm & AI Khảo thí'}
                </span>
                {currentUser?.role !== 'ToTruong' && (
                  <button
                    type="button"
                    onClick={() => setMainModule('room_allocation')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    title="Quay lại xem danh sách phòng thi"
                  >
                    <School className="w-3.5 h-3.5 text-blue-600" />
                    <span>DS Phòng thi ({result?.totalRooms || 0})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 font-semibold hidden md:inline">
                  Chế độ: Hội đồng & Giám thị coi thi
                </span>
                <button
                  type="button"
                  onClick={() => setMainModule('room_allocation')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  title="Quay lại xem danh sách phòng thi"
                >
                  <School className="w-3.5 h-3.5 text-blue-600" />
                  <span>DS Phòng thi ({result?.totalRooms || 0})</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Body */}
        <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {effectiveModule === 'proctor_council' ? (
            <InvigilatorManagementView
              schoolName={config.schoolName || 'TRƯỜNG THPT NGUYỄN HUỆ'}
              defaultRoomCount={result?.totalRooms || 24}
            />
          ) : effectiveModule === 'score_analytics' ? (
            <ScoreAnalyticsModule
              config={config}
              assignedCandidates={result?.candidates || []}
              currentUser={currentUser}
              onOpenExamScoreManagementModal={() => setShowExamScoreManagementModal(true)}
            />
          ) : (
            <>
              {/* Quick Intro Banner */}
              <div className={`bg-gradient-to-r ${themeConfig.bannerGradient} text-white rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
            <div className="relative z-10 max-w-3xl space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-blue-100 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Thuật toán Chuẩn hóa & Gom nhóm Tổ hợp
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                {headerFooterSettings.systemTitle || 'Tối ưu hóa xếp phòng thi và tự động sinh 3 File Excel chuẩn in ấn A4'}
              </h1>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Tự động chuẩn hóa các cặp môn tự chọn, gom nhóm thí sinh cùng tổ hợp, phân phòng tuần tự không vượt quá 24 thí sinh/phòng và sinh biểu mẫu Openpyxl đầy đủ Quốc hiệu, Tiêu ngữ, danh sách và chữ ký giám thị.
              </p>
            </div>
          </div>

          {result ? (
            <>
              {/* Split Notice Banner */}
              {splitMessage && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="font-semibold">{splitMessage}</span>
                    {isManuallyModified && (
                      <span className="bg-amber-200/80 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Đã can thiệp thủ công
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isManuallyModified && (
                      <button
                        type="button"
                        onClick={handleResetToAuto}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium cursor-pointer transition-colors"
                      >
                        Khôi phục ban đầu
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSplitMessage(null)}
                      className="text-amber-700 hover:text-amber-900 font-bold px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Metrics Summary */}
              <OverviewMetrics result={result} config={config} />

              {/* 3 Download Excel Buttons */}
              <DownloadPanel
                candidates={result.candidates}
                config={config}
                columnsConfig={exportColumnsConfig}
                onOpenColumnConfig={() => setIsColumnConfigOpen(true)}
                onPreviewPrintRoom={() => setShowPrintModal(true)}
                onPreviewMultiSubject={() => setShowMultiSubjectModal(true)}
                onViewShiftSummary={() => setActiveTab('shift_summary')}
              />

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'rooms'
                      ? themeConfig.activeTabClass
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <School className="w-4 h-4" />
                  Danh sách theo Phòng thi ({result.totalRooms} phòng)
                </button>

                {/* Tab Phân công Giáo viên coi thi - kích hoạt Phân hệ 2 */}
                <button
                  type="button"
                  onClick={() => setMainModule('proctor_council')}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-purple-700 hover:text-purple-900 transition-colors cursor-pointer whitespace-nowrap"
                  title="Mở Phân hệ 2: Phân công Hội đồng & Giám thị coi thi"
                >
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>Phân công Coi thi (Giám thị)</span>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold">Mở phân hệ</span>
                </button>

                {/* Tab Sơ đồ Số báo danh (4x6) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('seating')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'seating'
                      ? themeConfig.activeTabClass
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-amber-600" />
                  Sơ đồ Đánh SBD (4x6)
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold">Mới</span>
                </button>

                {/* Tab Điểm số & AI Khảo thí - kích hoạt Phân hệ 3 */}
                <button
                  type="button"
                  onClick={() => setMainModule('score_analytics')}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer whitespace-nowrap"
                  title="Mở Phân hệ 3: Bảng điểm, Biểu đồ khảo thí & AI gợi ý ôn tập"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Bảng điểm & AI Khảo thí</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">Mở phân hệ 3</span>
                </button>

                {/* Chỉ hiển thị tab Thống kê Ca 1 & Ca 2 khi không phải là Kiểm tra định kỳ */}
                {!config.examCategory.includes('Kiểm tra') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('shift_summary')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'shift_summary'
                        ? themeConfig.activeTabClass
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Thống kê Ca 1 & Ca 2
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('combos')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'combos'
                      ? themeConfig.activeTabClass
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Phân bố Tổ hợp tự chọn ({result.combosCount})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'raw'
                      ? themeConfig.activeTabClass
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  Toàn bộ dữ liệu thí sinh ({result.totalCandidates} HS)
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'rooms' && (
                <RoomDetailView
                  candidates={result.candidates}
                  totalRooms={result.totalRooms}
                  maxPerRoom={config.maxPerRoom}
                  config={config}
                  onOpenSplitModal={(r) => setSplitModalRoomNo(r)}
                  isManuallyModified={isManuallyModified}
                  onResetToAuto={handleResetToAuto}
                />
              )}

              {activeTab === 'proctor' && (
                <InvigilatorManagementView
                  schoolName={config.schoolName || 'TRƯỜNG THPT NGUYỄN HUỆ'}
                  defaultRoomCount={result.totalRooms}
                />
              )}

              {activeTab === 'seating' && (
                <SeatingChartModule
                  candidates={result.candidates}
                  totalRooms={result.totalRooms}
                  config={config}
                />
              )}

              {activeTab === 'analytics' && (
                <ScoreAnalyticsModule
                  config={config}
                  assignedCandidates={result.candidates}
                  currentUser={currentUser}
                  onOpenExamScoreManagementModal={() => setShowExamScoreManagementModal(true)}
                />
              )}

              {activeTab === 'shift_summary' && !config.examCategory.includes('Kiểm tra') && (
                <ShiftSummaryView
                  candidates={result.candidates}
                  config={config}
                  onOpenPrintModal={(shift) => setShowShiftPrintModal(shift)}
                />
              )}

              {activeTab === 'combos' && (
                <CombosBreakdown result={result} />
              )}

              {activeTab === 'raw' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        Bảng Dữ liệu Tổng hợp Sau khi Xếp phòng
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dữ liệu thí sinh đã được thêm các cột "Phòng thi", "STT Phòng" và "Tổ hợp chuẩn hóa".
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200/90 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">TT</th>
                          <th className="py-2.5 px-3 w-24 text-center">Phòng</th>
                          <th className="py-2.5 px-3 w-24 text-center">SBD</th>
                          <th className="py-2.5 px-4">Họ và tên</th>
                          <th className="py-2.5 px-3 text-center">Ngày sinh</th>
                          <th className="py-2.5 px-3 text-center">Lớp</th>
                          <th className="py-2.5 px-3">Môn BB (M1-M2)</th>
                          <th className="py-2.5 px-3">Tự chọn (TC1-TC2)</th>
                          <th className="py-2.5 px-3">Tổ hợp chuẩn hóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {result.candidates.slice(0, 50).map((cand) => (
                          <tr key={cand.SBD} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 text-center font-medium text-slate-500">{cand.TT}</td>
                            <td className="py-2 px-3 text-center font-bold text-blue-700">
                              {getRoomDisplayLabel(cand['Phòng thi'], config.startRoomCode)}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">{cand.SBD}</td>
                            <td className="py-2 px-4 font-semibold text-slate-800">{cand['Họ tên']}</td>
                            <td className="py-2 px-3 text-center text-slate-600">{cand['Ngày sinh']}</td>
                            <td className="py-2 px-3 text-center font-medium text-slate-700">{cand.Lớp}</td>
                            <td className="py-2 px-3 text-slate-600">{cand.M1}, {cand.M2}</td>
                            <td className="py-2 px-3 font-medium text-indigo-700">{cand.TC1}, {cand.TC2}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-700">{cand.ToHop_ChuanHoa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.candidates.length > 50 && (
                    <div className="text-xs text-slate-500 text-center italic">
                      Hiển thị 50 dòng đầu tiên trên giao diện web. Tải File 1 để xem toàn bộ {result.candidates.length} thí sinh.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-base text-slate-800">Chưa nạp danh sách thí sinh</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Vui lòng tải lên file Excel hoặc nhấn nút <strong>"Nạp dữ liệu mẫu (684 thí sinh)"</strong> ở thanh bên trái để bắt đầu xếp phòng.
                </p>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer tùy biến của ứng dụng */}
        <AppFooter
          settings={headerFooterSettings}
          theme={currentTheme}
          onOpenSettings={() => setShowHeaderFooterModal(true)}
        />
      </main>

      {/* Modals */}
      {showCodeModal && <PythonCodeModal onClose={() => setShowCodeModal(false)} />}
      {isColumnConfigOpen && (
        <ColumnConfigModal
          config={exportColumnsConfig}
          availableFileKeys={availableFileKeys}
          onSave={(newCfg) => setExportColumnsConfig(newCfg)}
          onClose={() => setIsColumnConfigOpen(false)}
        />
      )}
      {showPrintModal && result && (
        <PrintA4Preview
          candidates={result.candidates}
          config={config}
          totalRooms={result.totalRooms}
          columns={exportColumnsConfig.attendanceColumns}
          onClose={() => setShowPrintModal(false)}
        />
      )}
      {showMultiSubjectModal && result && (
        <PrintMultiSubjectModal
          candidates={result.candidates}
          config={config}
          totalRooms={result.totalRooms}
          onClose={() => setShowMultiSubjectModal(false)}
        />
      )}
      {showShiftPrintModal && result && (
        <PrintShiftSummaryModal
          candidates={result.candidates}
          config={config}
          initialShift={showShiftPrintModal}
          onClose={() => setShowShiftPrintModal(null)}
        />
      )}
      {splitModalRoomNo !== null && result && (
        <ManualRoomSplitModal
          candidates={result.candidates}
          config={config}
          totalRooms={result.totalRooms}
          initialRoomNo={splitModalRoomNo}
          onApplySplit={handleApplySplit}
          onClose={() => setSplitModalRoomNo(null)}
        />
      )}

      {/* Modal Tùy biến Giao diện Themes, Header & Footer */}
      {showHeaderFooterModal && (
        <HeaderFooterCustomModal
          isOpen={showHeaderFooterModal}
          onClose={() => setShowHeaderFooterModal(false)}
          currentTheme={currentTheme}
          onSelectTheme={(t) => {
            setCurrentTheme(t);
            saveTheme(t);
          }}
          config={config}
          onChangeConfig={handleConfigChange}
          headerFooterSettings={headerFooterSettings}
          onSaveHeaderFooter={(newHf) => {
            setHeaderFooterSettings(newHf);
            setConfig((prev) => ({
              ...prev,
              deptName: newHf.deptName || prev.deptName,
              schoolName: newHf.schoolName || prev.schoolName,
              examCenterCode: newHf.examCenterCode || prev.examCenterCode,
              schoolYear: newHf.schoolYear || prev.schoolYear,
            }));
          }}
        />
      )}

      {/* Modal Đổi Mật Khẩu Admin (Lưu vào CSDL Supabase Auth) */}
      {showAdminChangePasswordModal && currentUser?.role === 'Admin' && (
        <AdminChangePasswordModal
          isOpen={showAdminChangePasswordModal}
          onClose={() => setShowAdminChangePasswordModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Modal Quản lý Tài khoản (Dành riêng cho Admin) */}
      {showAdminUserModal && currentUser?.role === 'Admin' && (
        <AdminUserManagementModal
          isOpen={showAdminUserModal}
          onClose={() => setShowAdminUserModal(false)}
          currentUser={currentUser}
          onOpenSupabaseGuide={() => {
            setShowAdminUserModal(false);
            setShowSupabaseGuideModal(true);
          }}
        />
      )}

      {/* Modal Hướng dẫn cấu hình CSDL Supabase */}
      {showSupabaseGuideModal && (
        <SupabaseGuideModal
          isOpen={showSupabaseGuideModal}
          onClose={() => setShowSupabaseGuideModal(false)}
        />
      )}

      {/* Modal Hướng dẫn sử dụng hệ thống từ A-Z cho người mới */}
      {showUserGuideModal && (
        <UserGuideModal
          isOpen={showUserGuideModal}
          onClose={() => setShowUserGuideModal(false)}
          currentUser={currentUser}
          currentTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setShowUserGuideModal(false);
          }}
        />
      )}

      {/* Modal Quản lý Kỳ thi & Điểm số Tra cứu (Supabase Cloud) */}
      {showExamScoreManagementModal && (
        <ExamScoreManagementModal
          isOpen={showExamScoreManagementModal}
          onClose={() => setShowExamScoreManagementModal(false)}
          currentUser={currentUser}
          activeExamCategory={config.examCategory}
          activeSchoolYear={config.schoolYear}
        />
      )}
    </div>
  );
}


