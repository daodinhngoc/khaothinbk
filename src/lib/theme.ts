export type AppTheme = 'neon-blue' | 'neon-green' | 'neon-pink' | 'neon-purple' | 'dark-slate';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  label: string;
  iconColor: string;
  badgeBg: string;
  accentClass: string;
  bannerGradient: string;
  buttonClass: string;
  activeTabClass: string;
  ringClass: string;
  borderClass: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  'neon-blue': {
    id: 'neon-blue',
    name: 'Cyber Blue',
    label: 'Lam Neon',
    iconColor: 'text-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    accentClass: 'text-blue-600',
    bannerGradient: 'from-blue-700 via-indigo-700 to-slate-900',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
    activeTabClass: 'border-blue-600 text-blue-700',
    ringClass: 'focus:ring-blue-500',
    borderClass: 'border-blue-500/30'
  },
  'neon-green': {
    id: 'neon-green',
    name: 'Emerald Lime',
    label: 'Xanh lá Neon',
    iconColor: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    accentClass: 'text-emerald-600',
    bannerGradient: 'from-emerald-700 via-teal-800 to-slate-900',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
    activeTabClass: 'border-emerald-600 text-emerald-700',
    ringClass: 'focus:ring-emerald-500',
    borderClass: 'border-emerald-500/30'
  },
  'neon-pink': {
    id: 'neon-pink',
    name: 'Cyber Rose',
    label: 'Hồng Neon',
    iconColor: 'text-pink-500',
    badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    accentClass: 'text-pink-600',
    bannerGradient: 'from-pink-700 via-rose-800 to-slate-900',
    buttonClass: 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/20',
    activeTabClass: 'border-pink-600 text-pink-700',
    ringClass: 'focus:ring-pink-500',
    borderClass: 'border-pink-500/30'
  },
  'neon-purple': {
    id: 'neon-purple',
    name: 'Quartz Violet',
    label: 'Tím Neon',
    iconColor: 'text-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    accentClass: 'text-purple-600',
    bannerGradient: 'from-purple-700 via-indigo-900 to-slate-950',
    buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20',
    activeTabClass: 'border-purple-600 text-purple-700',
    ringClass: 'focus:ring-purple-500',
    borderClass: 'border-purple-500/30'
  },
  'dark-slate': {
    id: 'dark-slate',
    name: 'Obsidian Cyan',
    label: 'Tối Công Nghệ',
    iconColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    accentClass: 'text-cyan-600',
    bannerGradient: 'from-slate-900 via-slate-850 to-slate-950 border border-cyan-500/40',
    buttonClass: 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-cyan-500/20',
    activeTabClass: 'border-cyan-500 text-cyan-600',
    ringClass: 'focus:ring-cyan-500',
    borderClass: 'border-cyan-500/30'
  }
};

export const THEME_STORAGE_KEY = 'nbk_exam_app_theme';

export function getSavedTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
    if (saved && THEMES[saved]) return saved;
  } catch {}
  return 'neon-blue';
}

export function saveTheme(theme: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}
