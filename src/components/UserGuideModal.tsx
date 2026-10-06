import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  FileSpreadsheet,
  Download,
  HelpCircle,
  CheckCircle2,
  TableProperties,
  Users,
  Printer,
  Lightbulb,
  ChevronRight,
  ShieldCheck,
  Layers,
  UserCheck,
  BarChart3,
  BrainCircuit,
  ArrowRight,
  AlertTriangle,
  FileText,
  Check,
  Settings,
  Shuffle,
  Calendar,
  BadgePercent,
  Clock,
  ExternalLink,
  Info,
  Shield
} from 'lucide-react';
import { UserProfile } from '../types';

export type UserGuideModuleType = 'rooms' | 'proctor' | 'analytics';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  currentTab?: string;
  onSelectTab?: (tab: 'rooms' | 'proctor' | 'seating' | 'analytics' | 'shift_summary' | 'combos' | 'raw') => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTab = 'rooms',
  onSelectTab
}) => {
  // Xác định phân hệ hiển thị mặc định theo ngữ cảnh tab hoặc vai trò người dùng
  const getInitialModule = (): UserGuideModuleType => {
    if (currentTab === 'proctor') return 'proctor';
    if (currentTab === 'analytics') return 'analytics';
    if (currentUser?.role === 'ToTruong') return 'analytics';
    return 'rooms';
  };

  const [activeModule, setActiveModule] = useState<UserGuideModuleType>(getInitialModule);
  const [activeSubTab, setActiveSubTab] = useState<'workflow' | 'excel_format' | 'exports' | 'faq'>('workflow');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  CẨM NANG HƯỚNG DẪN SỬ DỤNG HỆ THỐNG
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Phiên bản THPT 2025
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Quy trình chuẩn hóa từng bước dành riêng cho từng vai trò &amp; phân hệ nghiệp vụ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-[11px] text-slate-300">
                <Shield className="w-3 h-3 text-indigo-400" />
                <span>Vai trò: <strong className="text-white">{currentUser.role === 'Admin' ? 'Quản trị viên' : currentUser.role === 'BanGiamHieu' ? 'Ban Giám hiệu' : currentUser.role === 'GiaoVu' ? 'Giáo vụ' : currentUser.role === 'ToTruong' ? 'Tổ trưởng Chuyên môn' : 'Cán bộ / Giáo viên'}</strong></span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 Main Role/Module Navigation Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Phân hệ 1 */}
            <button
              type="button"
              onClick={() => {
                setActiveModule('rooms');
                setActiveSubTab('workflow');
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                activeModule === 'rooms'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeModule === 'rooms' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">1. Xếp phòng thi &amp; Tổ hợp</div>
                <div className={`text-[10.5px] truncate ${activeModule === 'rooms' ? 'text-blue-100' : 'text-slate-500'}`}>
                  Ban Thư ký / Giáo vụ / Ban Giám hiệu
                </div>
              </div>
            </button>

            {/* Phân hệ 2 */}
            <button
              type="button"
              onClick={() => {
                setActiveModule('proctor');
                setActiveSubTab('workflow');
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                activeModule === 'proctor'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeModule === 'proctor' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">2. Phân công Giám thị coi thi</div>
                <div className={`text-[10.5px] truncate ${activeModule === 'proctor' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Ban Coi thi / Giáo vụ / Ban Giám hiệu
                </div>
              </div>
            </button>

            {/* Phân hệ 3 */}
            <button
              type="button"
              onClick={() => {
                setActiveModule('analytics');
                setActiveSubTab('workflow');
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                activeModule === 'analytics'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeModule === 'analytics' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'
              }`}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">3. Phân tích Khảo thí &amp; Điểm thi</div>
                <div className={`text-[10.5px] truncate ${activeModule === 'analytics' ? 'text-purple-100' : 'text-slate-500'}`}>
                  Tổ Chuyên môn / Ban Giám hiệu (Toàn trường)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation (Cụ thể cho từng phân hệ đang chọn) */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveSubTab('workflow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'workflow'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quy trình chuẩn từng bước
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('excel_format')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'excel_format'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Chuẩn bị File Excel đầu vào
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('exports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'exports'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Ấn phẩm &amp; Kết quả xuất ra
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('faq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'faq'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Mẹo hay &amp; Câu hỏi thường gặp
            </button>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => {
                if (activeModule === 'rooms') onSelectTab('rooms');
                if (activeModule === 'proctor') onSelectTab('proctor');
                if (activeModule === 'analytics') onSelectTab('analytics');
              }}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Vào thực hành phân hệ này ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">

          {/* ========================================================================= */}
          {/* PHÂN HỆ 1: XẾP PHÒNG THI & TỔ HỢP MÔN                                     */}
          {/* ========================================================================= */}
          {activeModule === 'rooms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header Info Banner */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-blue-950 flex items-start gap-3.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-blue-900">
                    Phân hệ 1: Xếp phòng thi, Đánh số báo danh &amp; Ghép môn tổ hợp
                  </div>
                  <div className="text-blue-800 leading-relaxed">
                    <strong>Vai trò thực hiện:</strong> Ban Thư ký Hội đồng thi, Ban Giám hiệu, Giáo vụ phụ trách tổ chức thi.
                  </div>
                  <div className="text-slate-600 leading-relaxed text-[11.5px]">
                    <strong>Nhiệm vụ cốt lõi:</strong> Tự động xếp phòng thi theo quy chế 2025 (tối đa 24 thí sinh/phòng), tối ưu hóa số lượng phòng ghép môn, in ấn phiếu thu bài chuẩn A4 và lập ma trận đề thi cho Ban In sao đề.
                  </div>
                </div>
              </div>

              {/* Sub-tab 1: Quy trình các bước */}
              {activeSubTab === 'workflow' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Quy trình 4 bước chuẩn hóa - Thao tác đúng là ra kết quả ngay
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bước 1 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                        <h3 className="font-bold text-slate-900 text-sm">Nạp danh sách học sinh (.xlsx)</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Tại thanh bên trái: Bấm vào vùng <strong>&quot;Tải lên danh sách học sinh (.xlsx)&quot;</strong> để chọn file Excel của trường, hoặc bấm <strong>&quot;Dùng dữ liệu mẫu 687 học sinh&quot;</strong> để làm quen ngay.
                      </p>
                      <div className="text-[11px] bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-slate-700 space-y-1">
                        <div className="font-semibold text-blue-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Nhận diện thông minh:
                        </div>
                        <div>Hệ thống tự động lọc dữ liệu, nhận diện họ tên, ngày sinh, lớp và 2 môn tự chọn Ca 1, Ca 2.</div>
                      </div>
                    </div>

                    {/* Bước 2 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                        <h3 className="font-bold text-slate-900 text-sm">Thiết lập cấu hình kỳ thi</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Ở thanh điều khiển bên trái, Thầy/Cô kiểm tra và tùy chỉnh:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li><strong>Loại kỳ thi:</strong> Thi tốt nghiệp THPT, Khảo sát chất lượng, hoặc Kiểm tra định kỳ.</li>
                        <li><strong>Sức chứa tối đa:</strong> Mặc định <strong>24 thí sinh/phòng</strong> (chuẩn Quy chế thi).</li>
                        <li><strong>Phòng bắt đầu:</strong> Mặc định là 01 (hoặc số khác nếu thi liên trường).</li>
                        <li><strong>Giao diện &amp; Tiêu đề:</strong> Bấm nút trên thanh công cụ để chỉnh Tên Sở, Tên Trường, Người ký.</li>
                      </ul>
                    </div>

                    {/* Bước 3 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                        <h3 className="font-bold text-slate-900 text-sm">Kiểm tra kết quả chia phòng &amp; Sơ đồ</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Hệ thống tự động chạy thuật toán xếp phòng thông minh và hiển thị các tab:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li><strong>Tab Ca 1 &amp; Ca 2:</strong> Danh sách từng phòng thi, số lượng thí sinh từng môn, các phòng ghép môn.</li>
                        <li><strong>Tab Sơ đồ phòng thi (24 bàn):</strong> Bố trí chỗ ngồi theo 4 quy luật (Ziczac ngang, Ziczac dọc, Chữ S, Ngược từ dưới lên).</li>
                        <li><strong>Tab Ma trận đề thi:</strong> Số lượng đề thi chi tiết từng môn cho từng phòng thi.</li>
                      </ul>
                    </div>

                    {/* Bước 4 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
                        <h3 className="font-bold text-slate-900 text-sm">Xuất File Excel &amp; In ấn A4</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Tại mục <strong>&quot;Tải kết quả &amp; In ấn&quot;</strong>:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li>Tải <strong>File 2 (Ca 1)</strong> và <strong>File 3 (Ca 2)</strong>: Mỗi phòng 1 Sheet chuẩn A4 sẵn sàng phát giám thị.</li>
                        <li>Tải <strong>File 4 (Ma trận đề):</strong> Bàn giao trực tiếp cho Ban In sao đề thi.</li>
                        <li>Bấm nút <strong>&quot;Xem &amp; In danh sách A4&quot;:</strong> Xem trực tiếp trên trình duyệt, in ấn hàng loạt tự động ngắt trang hoàn hảo.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Chuẩn bị file Excel */}
              {activeSubTab === 'excel_format' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-emerald-950 text-xs leading-relaxed">
                    💡 <strong>Quy tắc nhận diện linh hoạt:</strong> Hệ thống tự động nhận diện tiêu đề cột tiếng Việt (có dấu, không dấu, chữ hoa hoặc thường). Thầy/Cô chỉ cần có các cột cơ bản sau trong bảng tính Sheet 1:
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-14 text-center">STT</th>
                          <th className="py-2.5 px-3 w-40">Tên cột trong File</th>
                          <th className="py-2.5 px-3 w-28 text-center">Bắt buộc?</th>
                          <th className="py-2.5 px-3">Ý nghĩa &amp; Ví dụ dữ liệu chuẩn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">1</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">SBD / SoBaoDanh</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Số báo danh của học sinh (VD: <code>0680001</code>, <code>25001</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">2</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">Họ và tên / Họ tên</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Họ và tên đầy đủ của học sinh (VD: <code>Nguyễn Văn An</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">3</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Ngày sinh</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">Khuyến nghị</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Định dạng Text hoặc Ngày tháng (VD: <code>15/08/2007</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">4</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Lớp</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">Khuyến nghị</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Lớp biên chế của học sinh (VD: <code>12A1</code>, <code>12D2</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">5</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">Môn 1 / TC1 / Ca 1</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Môn tự chọn dự thi Ca 1 (VD: <code>Vật lí</code>, <code>Địa lí</code>, <code>Lịch sử</code>, <code>Công nghệ</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">6</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">Môn 2 / TC2 / Ca 2</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Môn tự chọn dự thi Ca 2 (VD: <code>Hóa học</code>, <code>Sinh học</code>, <code>Tiếng Anh</code>, <code>Tin học</code>)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                    💡 <strong>Lưu ý với môn chung (Toán, Ngữ văn):</strong> Với môn Toán và Ngữ văn, hệ thống tự động sắp xếp theo thứ tự SBD tăng dần chuẩn 24 thí sinh/phòng mà không cần khai báo cột riêng.
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Ấn phẩm kết quả */}
              {activeSubTab === 'exports' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">Hệ thống hỗ trợ xuất trọn gói 6 loại ấn phẩm phục vụ đầy đủ các khâu của Hội đồng thi:</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="border border-blue-200 rounded-xl p-3.5 bg-blue-50/40">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        File 1: Danh sách tổng hợp toàn bộ thí sinh
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Chứa toàn bộ học sinh đã gắn Phòng thi, số thứ tự, môn thi từng ca. Dùng để lưu trữ hồ sơ kỳ thi hoặc niêm yết tại bảng tin nhà trường.
                      </p>
                    </div>

                    <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/40">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        File 2: Phiếu thu bài &amp; Dán phòng Ca 1 (TC1)
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Mỗi phòng thi 1 Sheet chuẩn trang in A4. Phân nhóm môn rõ ràng, SBD tăng dần theo từng môn, có cột ký tên thu bài của thí sinh.
                      </p>
                    </div>

                    <div className="border border-indigo-200 rounded-xl p-3.5 bg-indigo-50/40">
                      <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs mb-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        File 3: Phiếu thu bài &amp; Dán phòng Ca 2 (TC2)
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Mỗi phòng thi 1 Sheet chuẩn trang in A4 cho Ca thi thứ 2. Giúp Giám thị phát đề và thu bài chuẩn xác tuyệt đối không bị nhầm môn.
                      </p>
                    </div>

                    <div className="border border-purple-200 rounded-xl p-3.5 bg-purple-50/40">
                      <div className="flex items-center gap-2 text-purple-800 font-bold text-xs mb-1">
                        <TableProperties className="w-4 h-4 shrink-0" />
                        File 4: Ma trận Đề thi (Ban In sao đề thi)
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Bảng 2 chiều trực quan: Các dòng là Phòng thi (P01 → Pn), các cột là từng Môn thi. Bàn giao cho Ban In sao đóng gói đề theo từng phòng.
                      </p>
                    </div>

                    <div className="border border-amber-200 rounded-xl p-3.5 bg-amber-50/40">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                        <Users className="w-4 h-4 shrink-0" />
                        File 5: Báo cáo Thống kê Tổng hợp Ca thi
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Bảng tổng hợp sĩ số từng môn của từng phòng thi chuẩn mẫu Bộ GD&amp;ĐT. Giúp Chủ tịch Hội đồng nắm bắt toàn diện quy mô kỳ thi.
                      </p>
                    </div>

                    <div className="border border-rose-200 rounded-xl p-3.5 bg-rose-50/40">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-1">
                        <Printer className="w-4 h-4 shrink-0" />
                        Bản in A4 trực tiếp (Xem trước &amp; In hàng loạt)
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Xem trước trực tiếp trên màn hình, tùy chỉnh kích cỡ font chữ và lề trang, tự động ngắt trang A4 chuẩn xác khi bấm In hoặc Lưu PDF.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: FAQ */}
              {activeSubTab === 'faq' && (
                <div className="space-y-3 text-xs">
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                      Quy tắc phòng ghép môn hoạt động như thế nào?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      Hệ thống tự động gom các học sinh có cùng tổ hợp môn để xếp kín các phòng 24 thí sinh trước. Với các tổ hợp ít học sinh còn lại, hệ thống sẽ gom ghép vào các phòng cuối cùng sao cho tổng số phòng thi của nhà trường là ít nhất, tiết kiệm tối đa giám thị và phòng học.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                      Trong phòng ghép môn, thí sinh được xếp ngồi như thế nào?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      Trong danh sách phòng và phiếu thu bài, thí sinh được <strong>gom theo từng môn thi</strong>. Trong cùng một môn, thí sinh được <strong>sắp xếp theo SBD tăng dần</strong>. Nhờ đó Giám thị phát đề và thu bài cực kỳ thuận tiện, không lo nhầm lẫn.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                      Tôi có thể chỉnh sửa ngày thi, tiêu đề và người ký không?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      Có! Thầy/Cô chỉ cần bấm vào nút <strong>&quot;Giao diện &amp; Tiêu đề&quot;</strong> trên thanh công cụ phía trên để điền tên Hiệu trưởng/Chủ tịch Hội đồng, địa danh ngày tháng ký. Mọi thông tin sẽ được cập nhật đồng bộ lên toàn bộ file in ấn.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* PHÂN HỆ 2: PHÂN CÔNG GIÁM THỊ COI THI                                     */}
          {/* ========================================================================= */}
          {activeModule === 'proctor' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header Info Banner */}
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 text-indigo-950 flex items-start gap-3.5">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-indigo-900">
                    Phân hệ 2: Quản lý &amp; Phân công Giám thị coi thi
                  </div>
                  <div className="text-indigo-800 leading-relaxed">
                    <strong>Vai trò thực hiện:</strong> Ban Giám hiệu (Chủ tịch / Phó Chủ tịch Hội đồng), Ban Thư ký, Giáo vụ phân công coi thi, Cán bộ coi thi.
                  </div>
                  <div className="text-slate-600 leading-relaxed text-[11.5px]">
                    <strong>Nhiệm vụ cốt lõi:</strong> Tự động bốc thăm phòng thi ngẫu nhiên (chuẩn Fisher-Yates), nghiêm ngặt chống trùng môn chuyên môn với môn thi, bố trí giám sát &amp; dự phòng, bảo mật phòng thi trước giờ G và tự động chấm công tính thù lao coi thi.
                  </div>
                </div>
              </div>

              {/* Sub-tab 1: Quy trình các bước */}
              {activeSubTab === 'workflow' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Quy trình 5 bước chuẩn hóa - Phân công minh bạch, chuẩn quy chế
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bước 1 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-indigo-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                        <h3 className="font-bold text-slate-900 text-sm">Thiết lập Lịch thi &amp; Ca thi</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Tại tab <strong>&quot;1. Lịch thi &amp; Ca thi&quot;</strong>: Kiểm tra danh sách các buổi thi (Ngày thi, buổi sáng/chiều, môn thi, thời gian làm bài).
                      </p>
                      <div className="text-[11px] bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-slate-700 space-y-1">
                        <div>Thầy/Cô có thể tùy chỉnh: Số lượng phòng thi mỗi buổi, số Giám thị mỗi phòng (1 hoặc 2 GT), số cán bộ Giám sát hành lang và số Giám thị dự phòng.</div>
                      </div>
                    </div>

                    {/* Bước 2 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-indigo-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                        <h3 className="font-bold text-slate-900 text-sm">Nạp danh sách Cán bộ - Giáo viên</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Tại tab <strong>&quot;2. Danh sách CBGV&quot;</strong>: Nạp danh sách giáo viên từ file Excel hoặc sử dụng danh sách có sẵn của trường.
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                        <li>Gán đúng <strong>Tổ bộ môn / Chuyên môn</strong> (Toán, Lí, Hóa, Sinh, Văn...).</li>
                        <li>Thiết lập số buổi trực dự kiến hoặc chính sách <strong>miễn giảm</strong> (con nhỏ, ốm đau, thai sản).</li>
                      </ul>
                    </div>

                    {/* Bước 3 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-indigo-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                        <h3 className="font-bold text-slate-900 text-sm">Bốc thăm tự động &amp; Phân công phòng</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Tại tab <strong>&quot;3. Phân công từng buổi&quot;</strong>: Bấm nút <strong>&quot;Bốc thăm tự động toàn bộ ca thi&quot;</strong>.
                      </p>
                      <div className="text-[11px] bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-emerald-900 space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Thuật toán thông minh đảm bảo:
                        </div>
                        <div>1. Tuyệt đối không phân công GV coi thi môn mình giảng dạy.</div>
                        <div>2. Cân bằng số buổi coi thi giữa các giáo viên trong trường.</div>
                        <div>3. Cho phép bốc thăm lại hoặc kéo thả đổi phòng thi thủ công khi cần.</div>
                      </div>
                    </div>

                    {/* Bước 4 & 5 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-indigo-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4-5</span>
                        <h3 className="font-bold text-slate-900 text-sm">Bảng tổng quát &amp; Chấm công thù lao</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Hai công cụ kiểm soát cao cấp phục vụ nhà trường:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li><strong>Tab 4. Bảng tổng quát (Bảo mật phòng):</strong> Niêm yết lịch trực ca trước ngày thi cho giáo viên biết lịch làm việc mà vẫn bảo mật số phòng thi đến giờ G.</li>
                        <li><strong>Tab 5. Báo cáo chấm công:</strong> Thống kê chính xác số buổi coi thi, số buổi giám sát của từng thầy cô, xuất file Excel thanh toán tiền bồi dưỡng coi thi.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Chuẩn bị file Excel CBGV */}
              {activeSubTab === 'excel_format' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 text-indigo-950 text-xs leading-relaxed">
                    💡 <strong>Cấu trúc file Excel Cán bộ - Giáo viên:</strong> Thầy/Cô chỉ cần chuẩn bị file Excel gồm danh sách giáo viên trường mình theo các cột sau:
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-14 text-center">STT</th>
                          <th className="py-2.5 px-3 w-36">Tên cột trong File</th>
                          <th className="py-2.5 px-3 w-28 text-center">Bắt buộc?</th>
                          <th className="py-2.5 px-3">Ý nghĩa &amp; Ví dụ dữ liệu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">1</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">Mã CB / Mã GV</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Mã định danh cán bộ (VD: <code>CB01</code>, <code>GV_TOAN_01</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">2</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">Họ và tên</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Họ và tên giáo viên (VD: <code>Trần Thị Thu Hà</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">3</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">Tổ / Đơn vị</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Tổ chuyên môn (VD: <code>Tổ Toán - Tin</code>, <code>Tổ Hóa - Sinh</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">4</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">Môn chuyên môn</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Bắt buộc</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Môn giảng dạy trực tiếp (VD: <code>Toán</code>, <code>Vật lí</code>, <code>Hóa học</code>, <code>Ngữ văn</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">5</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Số điện thoại</td>
                          <td className="py-2.5 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">Tùy chọn</span></td>
                          <td className="py-2.5 px-3 text-slate-600">Số điện thoại liên hệ khẩn cấp trong kỳ thi</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Ấn phẩm kết quả */}
              {activeSubTab === 'exports' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">Các báo cáo và ấn phẩm của phân hệ Giám thị:</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="border border-indigo-200 rounded-xl p-3.5 bg-indigo-50/40">
                      <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs mb-1">
                        <UserCheck className="w-4 h-4 shrink-0" />
                        Lịch phân công Giám thị từng buổi thi
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Danh sách đầy đủ Giám thị 1, Giám thị 2 cho từng phòng thi, danh sách Giám sát hành lang và Giám thị dự phòng của từng buổi thi.
                      </p>
                    </div>

                    <div className="border border-blue-200 rounded-xl p-3.5 bg-blue-50/40">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        Bảng phân công nhiệm vụ tổng quát (Bảo mật)
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Bảng phân ca trực niêm yết công khai trước kỳ thi: Giáo viên biết mình trực buổi nào mà không lộ số phòng thi trước giờ phát thẻ coi thi.
                      </p>
                    </div>

                    <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/40">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                        <TableProperties className="w-4 h-4 shrink-0" />
                        Bảng Chấm công &amp; Quyết toán kinh phí
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Thống kê tổng số buổi coi thi, số ca giám sát, hỗ trợ nhập định mức thù lao/buổi để tự động tính tổng tiền thanh toán cho từng cán bộ giáo viên.
                      </p>
                    </div>

                    <div className="border border-amber-200 rounded-xl p-3.5 bg-amber-50/40">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                        <Printer className="w-4 h-4 shrink-0" />
                        Xuất File Excel &amp; In ấn chuẩn A4
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Xuất file Excel đầy đủ các sheet biểu mẫu và hỗ trợ in trực tiếp kèm chữ ký Chủ tịch Hội đồng coi thi.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: FAQ */}
              {activeSubTab === 'faq' && (
                <div className="space-y-3 text-xs">
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-indigo-600" />
                      Làm sao để đảm bảo giáo viên dạy môn nào không coi thi môn đó?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      Thuật toán phân công của hệ thống được lập trình với điều kiện ngặt nghèo: Khi bốc thăm ca thi có môn nào (ví dụ buổi thi Hóa học), tất cả giáo viên có chuyên môn Hóa học sẽ tự động bị loại khỏi danh sách giám thị phòng thi đó và chỉ có thể được xếp vào dự phòng hoặc ca thi khác.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-indigo-600" />
                      Nếu có giáo viên đột xuất xin nghỉ thì xử lý thế nào?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      Tại <strong>Tab 4 (Bảng tổng quát)</strong> hoặc <strong>Tab 3</strong>, Thầy/Cô chỉ cần click bỏ tick ca trực của giáo viên đó, hệ thống sẽ tự động điều động cán bộ từ danh sách <strong>Giám thị dự phòng</strong> sang thay thế ngay lập tức và đồng bộ toàn hệ thống.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* PHÂN HỆ 3: PHÂN TÍCH KHẢO THÍ & ĐIỂM THI                                 */}
          {/* ========================================================================= */}
          {activeModule === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header Info Banner */}
              <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 text-purple-950 flex items-start gap-3.5">
                <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-purple-900">
                    Phân hệ 3: Phân tích Khảo thí, Ma trận Đề thi &amp; Chuẩn đầu ra GDPT 2018
                  </div>
                  <div className="text-purple-800 leading-relaxed">
                    <strong>Vai trò thực hiện:</strong> Ban Giám hiệu (Chỉ đạo &amp; giám sát khảo thí toàn trường), Tổ trưởng Chuyên môn (theo tổ môn phụ trách), Giáo viên bộ môn.
                  </div>
                  <div className="text-slate-600 leading-relaxed text-[11.5px]">
                    <strong>Nhiệm vụ cốt lõi:</strong> Nạp bảng điểm thi, tự động phân tích phổ điểm, tính toán độ khó và độ phân biệt câu hỏi theo lý thuyết khảo thí hiện đại, đánh giá mức độ đạt YCCĐ và kích hoạt Trợ lý AI sư phạm để tư vấn kế hoạch dạy học.
                  </div>
                </div>
              </div>

              {/* Sub-tab 1: Quy trình các bước */}
              {activeSubTab === 'workflow' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Quy trình 4 bước chuẩn hóa - Nạp dữ liệu là ra báo cáo sư phạm
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bước 1 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-purple-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                        <h3 className="font-bold text-slate-900 text-sm">Nạp dữ liệu điểm &amp; Đề thi</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Tại khung <strong>&quot;Nguồn dữ liệu Khảo thí&quot;</strong>, Thầy/Cô có 2 cách nạp dữ liệu thuận tiện:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li><strong>Cách 1 (Nhanh nhất):</strong> Nạp <strong>File Excel Bundle 3-trong-1</strong> chứa cả 3 sheet (Bảng điểm, Ma trận đề, YCCĐ).</li>
                        <li><strong>Cách 2 (Linh hoạt):</strong> Nạp rời từng file: File điểm thí sinh, File ma trận đề thi 4 mức độ, File Yêu cầu cần đạt YCCĐ.</li>
                        <li><strong>Dùng mẫu có sẵn:</strong> Bấm nút khôi phục dữ liệu mẫu có sẵn để xem báo cáo tức thì.</li>
                      </ul>
                    </div>

                    {/* Bước 2 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-purple-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                        <h3 className="font-bold text-slate-900 text-sm">Xem Phổ điểm &amp; Chỉ số thống kê</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Hệ thống lập tức tự động tính toán các chỉ số sư phạm cốt lõi:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li><strong>Phổ điểm trực quan:</strong> Biểu đồ cột phân bố điểm số từ 0 đến 10.</li>
                        <li><strong>Các chỉ số đo lường:</strong> Điểm trung bình, Điểm trung vị (Median), Độ lệch chuẩn, Điểm cao nhất, Điểm thấp nhất.</li>
                        <li><strong>Tỷ lệ xếp loại:</strong> Tỷ lệ Giỏi (&ge; 8.0), Khá (&ge; 6.5), Trung bình (&ge; 5.0) và Chưa đạt (&lt; 5.0).</li>
                      </ul>
                    </div>

                    {/* Bước 3 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-purple-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                        <h3 className="font-bold text-slate-900 text-sm">Đo lường câu hỏi &amp; Chuẩn YCCĐ</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Hai công cụ chuyên sâu dành cho Tổ chuyên môn:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li><strong>Chất lượng từng câu hỏi:</strong> Phân tích Độ khó (P), Độ phân biệt (D), tự động cảnh báo câu quá khó, câu quá dễ hoặc câu phân biệt kém cần điều chỉnh ngân hàng đề.</li>
                        <li><strong>Mức độ đạt chuẩn YCCĐ:</strong> Thống kê tỷ lệ học sinh đạt từng năng lực/chuẩn kiến thức, chỉ ra chính xác lỗ hổng kiến thức cần ôn tập lại.</li>
                      </ul>
                    </div>

                    {/* Bước 4 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs relative hover:border-purple-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
                        <h3 className="font-bold text-slate-900 text-sm">Trợ lý AI &amp; Xuất báo cáo chuyên môn</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Hoàn thiện hồ sơ khảo thí nhanh chóng:
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                        <li>Bấm nút <strong>&quot;Kích hoạt Trợ lý AI Khảo thí&quot;:</strong> AI tự động viết báo cáo nhận xét chuyên môn, đề xuất giải pháp dạy học cho từng lớp và từng nhóm đối tượng học sinh.</li>
                        <li>Bấm nút <strong>&quot;Xuất Báo cáo Excel&quot;</strong> hoặc <strong>&quot;In ấn Báo cáo PDF&quot;</strong> để lưu trữ và gửi Ban Giám hiệu.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Chuẩn bị file Excel Khảo thí */}
              {activeSubTab === 'excel_format' && (
                <div className="space-y-4">
                  <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 text-purple-950 text-xs leading-relaxed">
                    💡 <strong>Mô hình File Excel 3-trong-1 (Khuyến nghị):</strong> Thầy/Cô chỉ cần 1 file Excel gồm 3 Sheet sau là hệ thống tự động nhận diện toàn bộ:
                  </div>

                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                      <div className="font-bold text-blue-700 text-xs mb-1.5 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Sheet 1: &quot;DiemThi&quot; hoặc &quot;BangDiem&quot; (Điểm số học sinh)
                      </div>
                      <p className="text-xs text-slate-600 mb-2">
                        Chứa danh sách học sinh và điểm các câu/tổng điểm:
                      </p>
                      <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 font-mono text-slate-700">
                        SBD | Họ tên | Lớp | Điểm_Câu_1 | Điểm_Câu_2 ... | Điểm_Câu_N | Tổng điểm
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                      <div className="font-bold text-emerald-700 text-xs mb-1.5 flex items-center gap-2">
                        <TableProperties className="w-4 h-4" />
                        Sheet 2: &quot;MaTran&quot; (Ma trận đề thi theo 4 mức độ tư duy)
                      </div>
                      <p className="text-xs text-slate-600 mb-2">
                        Chứa cấu trúc đề thi theo quy định của Bộ GD&amp;ĐT:
                      </p>
                      <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 font-mono text-slate-700">
                        Câu hỏi | Chủ đề / Mạch kiến thức | Mức độ tư duy (Biết/Hiểu/Vận dụng/VDC) | Điểm tối đa | Mã YCCĐ tương ứng
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                      <div className="font-bold text-purple-700 text-xs mb-1.5 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Sheet 3: &quot;YCCD&quot; (Danh mục Yêu cầu cần đạt CT GDPT 2018)
                      </div>
                      <p className="text-xs text-slate-600 mb-2">
                        Danh mục chuẩn đầu ra môn học:
                      </p>
                      <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 font-mono text-slate-700">
                        Mã YCCĐ | Nội dung chuẩn cần đạt | Tiêu chí đạt chuẩn (%)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Ấn phẩm kết quả */}
              {activeSubTab === 'exports' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">Các báo cáo đầu ra của phân hệ Khảo thí:</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="border border-purple-200 rounded-xl p-3.5 bg-purple-50/40">
                      <div className="flex items-center gap-2 text-purple-800 font-bold text-xs mb-1">
                        <BarChart3 className="w-4 h-4 shrink-0" />
                        Báo cáo Phổ điểm &amp; Phân tích Thống kê
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Đầy đủ biểu đồ cột phổ điểm, bảng phân loại Giỏi - Khá - TB - Yếu theo từng lớp và toàn trường, bảng các chỉ số đo lường khảo thí.
                      </p>
                    </div>

                    <div className="border border-blue-200 rounded-xl p-3.5 bg-blue-50/40">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Bảng Đánh giá Ngân hàng Câu hỏi thi
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Phân tích độ khó ($P_i$), độ phân biệt ($D_i$), đưa ra kết luận: Câu hỏi tốt, câu quá dễ/quá khó hoặc câu có phương án gây nhiễu cần sửa đổi.
                      </p>
                    </div>

                    <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/40">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                        <TableProperties className="w-4 h-4 shrink-0" />
                        Báo cáo Đánh giá Chuẩn đầu ra YCCĐ 2018
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Tỷ lệ học sinh đạt từng năng lực bộ môn, đối chiếu với mục tiêu chương trình giáo dục phổ thông mới của Bộ GD&amp;ĐT.
                      </p>
                    </div>

                    <div className="border border-amber-200 rounded-xl p-3.5 bg-amber-50/40">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                        <BrainCircuit className="w-4 h-4 shrink-0" />
                        Bản nhận xét &amp; Tư vấn Sư phạm (Trợ lý AI)
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Bản tư vấn phương pháp giảng dạy, kế hoạch phụ đạo học sinh yếu kém và bồi dưỡng học sinh mũi nhọn, sẵn sàng in nộp Ban Giám hiệu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: FAQ */}
              {activeSubTab === 'faq' && (
                <div className="space-y-3 text-xs">
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-purple-600" />
                      Tôi nạp bảng điểm vào, nếu tắt máy hoặc F5 tải lại có bị mất không?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      <strong>Hoàn toàn không mất!</strong> Hệ thống đã được trang bị cơ chế tự động lưu ngầm cục bộ an toàn (Offline Local Storage) theo từng tài khoản và môn học. Thầy/Cô nạp file xong, dù tắt tab hay khởi động lại máy thì khi mở lại hệ thống vẫn tự động khôi phục đúng nguyên trạng kết quả!
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-purple-600" />
                      Chỉ số Độ khó ($P$) và Độ phân biệt ($D$) có ý nghĩa thế nào?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6">
                      - <strong>Độ khó ($P$):</strong> Tỷ lệ làm đúng câu hỏi. Chuẩn đẹp nhất từ <code>0.40 - 0.70</code>. Nếu $P &gt; 0.85$ là câu quá dễ, $P &lt; 0.25$ là câu quá khó.<br/>
                      - <strong>Độ phân biệt ($D$):</strong> Khả năng phân biệt học sinh giỏi và học sinh yếu. Chuẩn tốt là $D \ge 0.30$. Nếu $D &lt; 0.20$ là câu phân biệt kém cần biên soạn lại.
                    </p>
                  </div>

                  <div className="border border-indigo-200 rounded-xl p-3.5 bg-indigo-50/40">
                    <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-indigo-600" />
                      Phân quyền giữa Admin, Ban Giám hiệu (BGH), Giáo vụ và Tổ trưởng khác nhau ra sao?
                    </h4>
                    <p className="text-slate-600 leading-relaxed pl-6 space-y-1">
                      • <strong>Admin (Quản trị viên):</strong> Toàn quyền mọi phân hệ + Cấp tài khoản cán bộ, đổi mật khẩu hệ thống, cấu hình CSDL Supabase.<br/>
                      • <strong>Ban Giám hiệu (BGH):</strong> Toàn quyền xem và thao tác cả 3 phân hệ (1. Xếp phòng thi, 2. Phân công giám thị, 3. Phân tích khảo thí GDPT 2018 toàn trường). BGH đóng vai trò điều hành như Giáo vụ và Tổ trưởng nhưng <em>không can thiệp kỹ thuật/tài khoản hệ thống</em>.<br/>
                      • <strong>Giáo vụ:</strong> Chuyên trách Phân hệ 1 (Xếp phòng) &amp; Phân hệ 2 (Phân công coi thi).<br/>
                      • <strong>Tổ trưởng:</strong> Chuyên trách Phân hệ 3 (Khảo thí &amp; Bảng điểm môn học của tổ).
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Hệ thống đạt chuẩn Thông tư &amp; Quy chế tổ chức thi hiện hành của Bộ GD&amp;ĐT</span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectTab && (
              <button
                type="button"
                onClick={() => {
                  if (activeModule === 'rooms') onSelectTab('rooms');
                  if (activeModule === 'proctor') onSelectTab('proctor');
                  if (activeModule === 'analytics') onSelectTab('analytics');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Chuyển đến Phân hệ này
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Đã hiểu &amp; Bắt đầu làm việc
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
