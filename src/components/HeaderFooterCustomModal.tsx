import React, { useState } from 'react';
import { Palette, Sparkles, Check, School, ShieldCheck, X, RefreshCw, LayoutTemplate } from 'lucide-react';
import { AppTheme, THEMES, ThemeConfig } from '../lib/theme';
import { ExamConfig } from '../types';
import { getCurrentSchoolYear } from '../utils/subjectHelper';

export interface HeaderFooterSettings {
  systemTitle: string;
  deptName: string;
  schoolName: string;
  examCenterCode: string;
  schoolYear: string;
  footerCopyright: string;
  footerSubtitle: string;
  footerContact: string;
  showFooter: boolean;
}

const currentDefaultSchoolYear = getCurrentSchoolYear();

export const DEFAULT_HEADER_FOOTER: HeaderFooterSettings = {
  systemTitle: 'Hệ thống Tối ưu Xếp phòng thi & Xuất biểu mẫu',
  deptName: 'SỞ GD&ĐT GIA LAI',
  schoolName: 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM',
  examCenterCode: 'NBK-CH',
  schoolYear: currentDefaultSchoolYear,
  footerCopyright: `© ${currentDefaultSchoolYear} Trường THPT Nguyễn Bỉnh Khiêm`,
  footerSubtitle: 'Hệ thống Phân bổ phòng thi và In ấn biểu mẫu chuẩn khảo thí Quốc gia',
  footerContact: 'Hotline CNTT: 0986.041.183 | Email: admin@nbkcs.edu.vn',
  showFooter: true,
};

export const SETTINGS_STORAGE_KEY = 'nbk_header_footer_settings';

export function getSavedHeaderFooter(): HeaderFooterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_HEADER_FOOTER, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_HEADER_FOOTER;
}

interface HeaderFooterCustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  config: ExamConfig;
  onChangeConfig: (newConfig: Partial<ExamConfig>) => void;
  headerFooterSettings: HeaderFooterSettings;
  onSaveHeaderFooter: (settings: HeaderFooterSettings) => void;
}

export const HeaderFooterCustomModal: React.FC<HeaderFooterCustomModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  config,
  onChangeConfig,
  headerFooterSettings,
  onSaveHeaderFooter,
}) => {
  const [formData, setFormData] = useState<HeaderFooterSettings>(headerFooterSettings);
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(currentTheme);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveHeaderFooter(formData);
    onSelectTheme(selectedTheme);
    onChangeConfig({
      deptName: formData.deptName,
      schoolName: formData.schoolName,
      examCenterCode: formData.examCenterCode,
      schoolYear: formData.schoolYear,
    });
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(formData));
    } catch {}
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handleResetDefault = () => {
    setFormData(DEFAULT_HEADER_FOOTER);
    setSelectedTheme('neon-blue');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Tùy biến Giao diện, Header & Footer
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-mono">
                  Theme Neon
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Thay đổi tông màu ứng dụng, tiêu đề hiển thị và thông tin chân trang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung cấu hình */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Phần 1: Chọn Theme màu sắc (Neon) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Bộ Themes màu sắc giao diện (Neon & Hiện đại)
              </label>
              <span className="text-[11px] text-slate-500">Đang chọn: {THEMES[selectedTheme].name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(THEMES) as AppTheme[]).map((themeKey) => {
                const item = THEMES[themeKey];
                const active = selectedTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(themeKey);
                      onSelectTheme(themeKey);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{item.label}</span>
                      {active && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-full ${item.badgeBg.split(' ')[0]} border`} />
                      <span className="text-[10px] opacity-75 font-mono">{item.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Phần 2: Cấu hình Header */}
          <div className="space-y-3">
            <label className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <School className="w-4 h-4 text-blue-600" />
              Thông tin Header thanh tiêu đề
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tiêu đề hệ thống (Header Title):
                </label>
                <input
                  type="text"
                  value={formData.systemTitle}
                  onChange={(e) => setFormData({ ...formData, systemTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Hệ thống Tối ưu Xếp phòng thi & Xuất biểu mẫu"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên Sở GD&ĐT:
                </label>
                <input
                  type="text"
                  value={formData.deptName}
                  onChange={(e) => setFormData({ ...formData, deptName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="SỞ GD&ĐT GIA LAI"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên Trường THPT:
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="TRƯỜNG THPT NGUYỄN BỈNH KHIÊM"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mã Điểm thi (Mặc định NBK-CH):
                </label>
                <input
                  type="text"
                  value={formData.examCenterCode}
                  onChange={(e) => setFormData({ ...formData, examCenterCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="NBK-CH"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Năm học (Mặc định 2026 - 2027):
                </label>
                <input
                  type="text"
                  value={formData.schoolYear}
                  onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="2026 - 2027"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Phần 3: Cấu hình Footer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-emerald-600" />
                Thông tin Chân trang (Footer)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showFooter}
                  onChange={(e) => setFormData({ ...formData, showFooter: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-600 font-medium">Bật chân trang</span>
              </label>
            </div>

            {formData.showFooter && (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bản quyền / Đơn vị sở hữu (Copyright):
                  </label>
                  <input
                    type="text"
                    value={formData.footerCopyright}
                    onChange={(e) => setFormData({ ...formData, footerCopyright: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="© 2026 - 2027 Trường THPT Nguyễn Bỉnh Khiêm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Mô tả chức năng phụ đề:
                  </label>
                  <input
                    type="text"
                    value={formData.footerSubtitle}
                    onChange={(e) => setFormData({ ...formData, footerSubtitle: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Hệ thống Phân bổ phòng thi và In ấn biểu mẫu chuẩn khảo thí Quốc gia"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thông tin liên hệ / Hotline kỹ thuật:
                  </label>
                  <input
                    type="text"
                    value={formData.footerContact}
                    onChange={(e) => setFormData({ ...formData, footerContact: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Hotline CNTT: 0986.041.183 | Email: admin@nbkcs.edu.vn"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Mặc định ban đầu
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Đã lưu cài đặt!
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Lưu & Áp dụng
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
