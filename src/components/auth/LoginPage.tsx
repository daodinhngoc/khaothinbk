import React, { useState } from 'react';
import { 
  Lock, Mail, Eye, EyeOff, Shield, Database, GraduationCap, 
  ArrowRight, AlertCircle, UserCheck, Search, CheckCircle2,
  HelpCircle, Sparkles, Building2, Layers
} from 'lucide-react';
import { loginWithEmailPassword, isSupabaseConfigured } from '../../lib/supabaseClient';
import { UserProfile } from '../../types';
import { ScoreLookupCard } from '../scoreLookup/ScoreLookupCard';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenSupabaseGuide: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenSupabaseGuide }) => {
  // Mặc định mở Tab 'student' để học sinh dễ dàng tra cứu điểm
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ Email tài khoản.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Vui lòng nhập Mật khẩu truy cập.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginWithEmailPassword(cleanEmail, cleanPass);
      if (res.error || !res.user) {
        setErrorMessage(res.error || 'Email hoặc mật khẩu không chính xác.');
        setIsLoading(false);
        return;
      }
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 relative overflow-hidden font-sans">
      
      {/* Hiệu ứng nền Ambient cao cấp */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.22),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar thương hiệu nhẹ */}
      <header className="w-full max-w-5xl py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-blue-400">Trường THPT Nguyễn Bỉnh Khiêm</div>
            <div className="text-sm font-semibold text-slate-200">Hệ thống Khảo thí & Tra cứu Điểm thi</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>GDPT 2018</span>
          </span>
        </div>
      </header>

      {/* Main Container Thẻ Đăng nhập / Tra cứu */}
      <main className="w-full max-w-lg my-auto py-4 z-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/40 overflow-hidden border border-slate-200/90 text-slate-800 transition-all">
          
          {/* Header Card Trang trọng */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 px-6 py-6 text-white text-center relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-inner mb-3">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">
                Cổng Khảo thí & Tra cứu Kết quả thi
              </h1>
              <p className="text-xs text-blue-100/90 mt-1 max-w-sm mx-auto leading-relaxed">
                Tra cứu kết quả điểm thi chính thức theo Số báo danh và CCCD dành cho học sinh & phụ huynh
              </p>
            </div>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="p-2 bg-slate-100/90 border-b border-slate-200">
            <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-white text-blue-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Search className="w-4 h-4 text-blue-600" />
                <span>Học sinh tra cứu</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'staff'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Cán bộ / Giáo viên</span>
              </button>
            </div>
          </div>

          {/* Nội dung bên trong thẻ theo Tab */}
          <div className="p-6 sm:p-7">
            {activeTab === 'student' ? (
              /* TAB 1: HỌC SINH TRA CỨU ĐIỂM THI */
              <ScoreLookupCard onOpenSupabaseGuide={onOpenSupabaseGuide} />
            ) : (
              /* TAB 2: CÁN BỘ / GIÁO VIÊN ĐĂNG NHẬP */
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-800 text-xs flex items-start gap-2.5 animate-shake shadow-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex-1 font-medium">{errorMessage}</div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Tài khoản Email</span>
                    <span className="text-[11px] text-slate-400 font-normal">Hộp thư công vụ / trường cấp</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="VD: gv.toan@nbkcs.edu.vn"
                      className="w-full bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-medium placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Mật khẩu truy cập
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Vui lòng liên hệ Quản trị viên hệ thống của trường để được cấp lại mật khẩu.')}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu tài khoản..."
                      className="w-full bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:outline-none transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span>Ghi nhớ phiên đăng nhập</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Đang xác thực thông tin...</span>
                  ) : (
                    <>
                      <span>Đăng nhập Cổng Quản trị</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <div className="flex items-start gap-2 text-slate-500 text-[11px] leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      Dành riêng cho Ban Giám hiệu, Cán bộ Khảo thí và Giáo viên bộ môn trường THPT.
                    </span>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer Card: Trạng thái CSDL */}
          <div className="bg-slate-50/90 px-6 py-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>
                CSDL Khảo thí: <strong className="text-slate-700">{isSupabaseConfigured ? 'Supabase Cloud' : 'Bộ nhớ Sẵn sàng'}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSupabaseGuide}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer"
            >
              Cấu hình CSDL
            </button>
          </div>
        </div>
      </main>

      {/* Footer bản quyền & thông tin hỗ trợ */}
      <footer className="w-full max-w-5xl py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 z-10 border-t border-slate-900">
        <div>
          © 2026-2027 Trường THPT Nguyễn Bỉnh Khiêm • Hệ thống Khảo thí & Quản lý Điểm GDPT 2018
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Tiêu chuẩn bảo mật ISO/IEC 27001</span>
          <span>•</span>
          <span>Hỗ trợ kỹ thuật: Ban Khảo thí</span>
        </div>
      </footer>

    </div>
  );
};
