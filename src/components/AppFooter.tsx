import React from 'react';
import { Palette, Shield, Sparkles, Building, Phone, Mail, Award } from 'lucide-react';
import { HeaderFooterSettings } from './HeaderFooterCustomModal';
import { AppTheme, THEMES } from '../lib/theme';

interface AppFooterProps {
  settings: HeaderFooterSettings;
  theme: AppTheme;
  onOpenSettings: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ settings, theme, onOpenSettings }) => {
  if (!settings.showFooter) return null;

  const currentTheme = THEMES[theme] || THEMES['neon-blue'];

  return (
    <footer className="mt-12 bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          {/* Cột trái: Tên trường & Điểm thi */}
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {settings.schoolName}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                Mã điểm: {settings.examCenterCode}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {settings.footerSubtitle} • Năm học {settings.schoolYear}
            </p>
          </div>

          {/* Cột giữa: Nút đổi giao diện Theme */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Đổi màu giao diện Theme Neon hoặc tùy biến Header/Footer"
            >
              <Palette className={`w-3.5 h-3.5 ${currentTheme.iconColor}`} />
              <span>Theme: {currentTheme.name} ({currentTheme.label})</span>
            </button>
          </div>
        </div>

        {/* Dòng dưới: Bản quyền & Liên hệ */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 text-center sm:text-left">
          <div>
            {settings.footerCopyright} • Phát triển trên nền tảng Khảo thí Hiện đại.
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>{settings.footerContact}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
