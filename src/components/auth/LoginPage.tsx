import React, { useState } from 'react';
import { 
  Lock, Mail, Eye, EyeOff, Shield, Database, GraduationCap, 
  ArrowRight, Sparkles, AlertCircle, CheckCircle2, UserCheck, Search, Users
} from 'lucide-react';
import { loginWithEmailPassword, isSupabaseConfigured } from '../../lib/supabaseClient';
import { UserProfile } from '../../types';
import { ScoreLookupCard } from '../scoreLookup/ScoreLookupCard';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenSupabaseGuide: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenSupabaseGuide }) => {
  // Tab lựa chọn: 'staff' (Cán bộ / Giáo viên) hoặc 'student' (Học sinh tra cứu điểm)
  const [activeTab, setActiveTab] = useState<'staff' | 'student'>('student');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 text-slate-100">
      
      {/* Container Thẻ đăng nhập / Tra cứu */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 text-slate-800">
        
        {/* Banner trường học / Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 bg-white/15 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-xs mb-3 shadow-inner">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">CỔNG KHẢO THÍ & TRA CỨU ĐIỂM THI</h1>
          <p className="text-xs text-blue-100 mt-1 opacity-90">
            Hệ thống Xếp phòng, Phân tích phổ điểm GDPT 2018 & Tra cứu điểm thi học sinh
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-medium backdrop-blur-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            <span>Xác thực CSDL & Phân quyền Supabase</span>
          </div>
        </div>

        {/* Tab Switcher: Cán bộ / Giáo viên vs Học sinh Tra cứu */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'student'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Học sinh tra cứu</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Cán bộ / Giáo viên</span>
          </button>
        </div>

        {/* Trạng thái Supabase Cloud */}
        <div className="px-6 pt-3 pb-1">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
            isSupabaseConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0" />
              <span className="font-semibold">
                {isSupabaseConfigured ? 'Supabase: Đã kết nối Cloud' : 'Chế độ: Thử nghiệm nội bộ'}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSupabaseGuide}
              className="text-[11px] underline font-bold hover:opacity-80 cursor-pointer"
            >
              Xem cấu hình
            </button>
          </div>
        </div>

        {/* Nội dung theo Tab được chọn */}
        <div className="p-6">
          {activeTab === 'student' ? (
            /* TAB HỌC SINH TRA CỨU ĐIỂM THI */
            <ScoreLookupCard onOpenSupabaseGuide={onOpenSupabaseGuide} />
          ) : (
            /* TAB CÁN BỘ / GIÁO VIÊN ĐĂNG NHẬP */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên đăng nhập (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: admin@nbkcs.edu.vn"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Mật khẩu
                  </label>
                  <span className="text-[11px] text-slate-400">Do Admin cấp</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Đang kiểm tra thông tin...</span>
                ) : (
                  <>
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-500">
                  Tài khoản mẫu: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">admin@nbkcs.edu.vn</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">admin123</code>)
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Học sinh tra cứu bằng SBD & CCCD • Cán bộ đăng nhập bằng tài khoản Supabase
        </div>
      </div>
    </div>
  );
};

