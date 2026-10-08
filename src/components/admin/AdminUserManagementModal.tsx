import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, Users, Shield, Search, Check, Copy, KeyRound, 
  Lock, Unlock, RefreshCw, Mail, Phone, Building2, BookOpen, AlertCircle, Sparkles, Database,
  Trash2, Cloud, ArrowLeftRight, CheckCircle2, Pencil, AlertTriangle,
  Sliders, CheckSquare, Square, RotateCcw, Info, ChevronDown, ChevronUp, ChevronRight, Layers, CheckCircle, ExternalLink
} from 'lucide-react';
import { UserProfile, UserRole, UserPermission, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasUserPermission } from '../../types';
import { 
  fetchAllProfiles, 
  createNewUserAccount, 
  updateUserProfile,
  toggleUserStatus, 
  resetUserPassword, 
  deleteUserAccount,
  syncLocalProfilesToSupabase,
  isSupabaseConfigured 
} from '../../lib/supabaseClient';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenSupabaseGuide: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenSupabaseGuide
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'BanGiamHieu' | 'GiaoVu' | 'ToTruong' | 'GiaoVien'>('All');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'users' | 'matrix'>('users');

  // Form State Cấp mới
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [unit, setUnit] = useState<string>('Tổ Hóa học - KHTN');
  const [specialization, setSpecialization] = useState<string>('Hóa học GDPT 2018');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('123456');
  const [role, setRole] = useState<UserRole>('ToTruong');
  const [addPermissions, setAddPermissions] = useState<UserPermission[]>(DEFAULT_ROLE_PERMISSIONS.ToTruong);
  const [showAddPermissionsConfig, setShowAddPermissionsConfig] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Created Banner
  const [createdInfo, setCreatedInfo] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [copiedInfo, setCopiedInfo] = useState<boolean>(false);

  // Edit User State (Chỉnh sửa thông tin & Ma trận phân quyền chi tiết)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [editSpecialization, setEditSpecialization] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('GiaoVien');
  const [editPermissions, setEditPermissions] = useState<UserPermission[]>([]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete User State (Xác nhận xóa tài khoản)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset Password State
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchAllProfiles();
      setProfiles(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setCreatedInfo(null);
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý tạo ngẫu nhiên mật khẩu an toàn
  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'Edu@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  // Submit tạo tài khoản
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError('Vui lòng điền đầy đủ Họ và tên, Email và Mật khẩu.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setFormError('Email đăng nhập không đúng định dạng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createNewUserAccount({
        full_name: fullName.trim(),
        unit: unit.trim() || 'Trường THPT',
        specialization: specialization.trim() || 'Chung',
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim(),
        role: role,
        permissions: addPermissions,
      });

      if (!res.success) {
        setFormError(res.error || 'Không thể tạo tài khoản');
        setIsSubmitting(false);
        return;
      }

      setCreatedInfo({
        email: email.trim().toLowerCase(),
        pass: password.trim(),
        name: fullName.trim(),
      });

      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('Gv@2025');
      setAddPermissions(DEFAULT_ROLE_PERMISSIONS.ToTruong);
      setShowAddPermissionsConfig(false);
      setIsAddingUser(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Đã có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Khóa / Mở khóa
  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === currentUser.id) {
      alert('Không thể tự khóa tài khoản của chính mình!');
      return;
    }
    const current = user.is_active !== false;
    const ok = await toggleUserStatus(user.id, current);
    if (ok) {
      await loadData();
    }
  };

  // Đổi mật khẩu
  const handleConfirmResetPassword = async () => {
    if (!resettingUser || !newPasswordInput.trim()) return;
    const ok = await resetUserPassword(resettingUser.id, newPasswordInput.trim(), resettingUser.email);
    if (ok) {
      setResetSuccessMsg(`Đã đổi mật khẩu cho ${resettingUser.full_name} thành công trên Supabase Cloud!`);
      setTimeout(() => {
        setResettingUser(null);
        setNewPasswordInput('');
        setResetSuccessMsg(null);
      }, 1500);
    }
  };

  // Bắt đầu chỉnh sửa tài khoản
  const handleStartEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditFullName(user.full_name);
    setEditUnit(user.unit || '');
    setEditSpecialization(user.specialization || '');
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    const initialPerms = Array.isArray(user.permissions) && user.permissions.length > 0
      ? [...user.permissions]
      : [...(DEFAULT_ROLE_PERMISSIONS[user.role] || [])];
    setEditPermissions(initialPerms);
    setEditIsActive(user.is_active !== false);
    setEditPassword('');
    setEditError(null);
  };

  // Các thao tác điều khiển phân quyền trong form Edit
  const toggleEditPermission = (permId: UserPermission) => {
    setEditPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const applyRolePresetToEdit = (targetRole: UserRole) => {
    const preset = DEFAULT_ROLE_PERMISSIONS[targetRole] || [];
    setEditPermissions([...preset]);
  };

  const selectAllEditPermissions = () => {
    setEditPermissions(ALL_PERMISSIONS.map(p => p.id));
  };

  const clearAllEditPermissions = () => {
    setEditPermissions([]);
  };

  // Các thao tác điều khiển phân quyền trong form Add
  const toggleAddPermission = (permId: UserPermission) => {
    setAddPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const applyRolePresetToAdd = (targetRole: UserRole) => {
    const preset = DEFAULT_ROLE_PERMISSIONS[targetRole] || [];
    setAddPermissions([...preset]);
  };

  const selectAllAddPermissions = () => {
    setAddPermissions(ALL_PERMISSIONS.map(p => p.id));
  };

  const clearAllAddPermissions = () => {
    setAddPermissions([]);
  };

  // Lưu chỉnh sửa thông tin người dùng (đồng bộ 2 chiều với Supabase)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFullName.trim()) {
      setEditError('Họ và tên người dùng không được để trống.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const res = await updateUserProfile({
        id: editingUser.id,
        full_name: editFullName.trim(),
        unit: editUnit.trim(),
        specialization: editSpecialization.trim(),
        phone: editPhone.trim(),
        role: editRole,
        is_active: editIsActive,
        permissions: editPermissions,
        ...(editEmail.trim() && editEmail.trim() !== editingUser.email ? { email: editEmail.trim() } : {}),
        ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
      });

      if (res.success && res.user) {
        setSyncFeedback({
          type: 'success',
          message: `Đã cập nhật thông tin & phân quyền (${editPermissions.length}/9 quyền) cho "${res.user.full_name}" thành công đồng bộ trên CSDL Supabase!`
        });
        setEditingUser(null);
        await loadData();
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        setEditError(res.error || 'Không thể cập nhật tài khoản trên CSDL.');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Lỗi khi cập nhật tài khoản');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Xác nhận xóa tài khoản vĩnh viễn khỏi Supabase
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      alert('Không thể xóa tài khoản bạn đang sử dụng!');
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    setDeleteError(null);
    try {
      const ok = await deleteUserAccount(userToDelete.id);
      if (ok) {
        setSyncFeedback({
          type: 'success',
          message: `Đã xóa vĩnh viễn tài khoản "${userToDelete.full_name}" (${userToDelete.email}) khỏi Supabase Auth và CSDL!`
        });
        setUserToDelete(null);
        await loadData();
      } else {
        setDeleteError('Không thể xóa tài khoản. Vui lòng kiểm tra lại kết nối Supabase.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Lỗi khi xóa tài khoản');
    } finally {
      setIsDeletingUser(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Xóa tài khoản nhanh từ danh sách
  const handleDeleteUser = (user: UserProfile) => {
    if (user.id === currentUser.id) {
      alert('Không thể xóa tài khoản bạn đang đăng nhập!');
      return;
    }
    setUserToDelete(user);
  };

  // Đồng bộ 2 chiều với Supabase
  const handleSyncWithSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      // 1. Đẩy các tài khoản hiện có trong danh sách local lên Supabase
      const res = await syncLocalProfilesToSupabase(profiles);
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Đồng bộ thành công! Đã thêm mới ${res.createdCount} tài khoản lên CSDL Supabase (Bỏ qua ${res.skippedCount} tài khoản đã tồn tại).`
        });
        await loadData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Lỗi trong quá trình đồng bộ dữ liệu.'
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Không thể kết nối đến máy chủ để đồng bộ'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Sao chép thông tin cấp phát
  const copyHandoverInfo = () => {
    if (!createdInfo) return;
    const text = `[HỆ THỐNG XẾP PHÒNG THI] THÔNG TIN TÀI KHOẢN GIÁO VIÊN\n` +
      `- Cán bộ: ${createdInfo.name}\n` +
      `- Tên đăng nhập (Email): ${createdInfo.email}\n` +
      `- Mật khẩu khởi tạo: ${createdInfo.pass}\n` +
      `- Đường dẫn đăng nhập: ${window.location.origin}\n` +
      `(Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên)`;
    navigator.clipboard.writeText(text);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 2000);
  };

  // Lọc danh sách
  const filteredUsers = profiles.filter(u => {
    const matchesSearch = 
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalAdmins = profiles.filter(p => p.role === 'Admin').length;
  const totalGVs = profiles.filter(p => p.role === 'GiaoVien').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Quản lý Tài khoản & Phân quyền Người dùng</h2>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Dành riêng cho Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">Phân quyền linh hoạt theo nhóm chức năng, vai trò trường học và đồng bộ 2 chiều với CSDL Supabase</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSupabaseGuide}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>{isSupabaseConfigured ? 'Supabase: Đã kết nối' : 'Cấu hình Supabase'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thanh chuyển đổi Tab: Danh sách tài khoản vs Ma trận phân quyền hệ thống */}
        <div className="px-6 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveViewTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeViewTab === 'users'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-t-lg'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Danh sách Tài khoản</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {profiles.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('matrix')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeViewTab === 'matrix'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-t-lg'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Ma trận Phân quyền Chức năng</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                5 Vai trò x 9 Quyền
              </span>
            </button>
          </div>
        </div>

        {/* Thông báo vừa cấp tài khoản thành công */}
        {createdInfo && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-emerald-200 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-xs text-emerald-900">
                <p className="font-bold text-sm">Đã cấp tài khoản thành công cho: {createdInfo.name}</p>
                <p className="mt-0.5 font-mono">
                  Email: <b>{createdInfo.email}</b> | Mật khẩu: <b>{createdInfo.pass}</b>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={copyHandoverInfo}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {copiedInfo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedInfo ? 'Đã sao chép!' : 'Sao chép gửi Giáo viên'}
              </button>
              <button
                onClick={() => setCreatedInfo(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs px-2 py-1"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Banner hỗ trợ cập nhật SQL Supabase cho Ma trận phân quyền và vai trò */}
        <div className="mx-6 mt-3 px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-indigo-900">
            <span className="font-bold text-indigo-700 bg-indigo-200/80 px-1.5 py-0.5 rounded text-[10px]">LƯU Ý CSDL SUPABASE</span>
            <span className="text-[11.5px]">Để CSDL Supabase lưu trữ chuẩn xác <strong>Ma trận phân quyền (JSONB)</strong> và vai trò <strong>Ban Giám hiệu</strong>, hãy chạy lệnh sau trong SQL Editor:</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const sql = "-- 1. Bổ sung cột permissions (JSONB) lưu quyền chi tiết:\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;\n\n-- 2. Cập nhật ràng buộc vai trò 5 nhóm người dùng:\nALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;\nALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin', 'BanGiamHieu', 'GiaoVu', 'ToTruong', 'GiaoVien'));";
              navigator.clipboard.writeText(sql);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2500);
            }}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="Sao chép câu lệnh SQL để chạy trong Supabase SQL Editor"
          >
            {copiedSql ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSql ? 'Đã sao chép SQL!' : 'Sao chép SQL CSDL'}</span>
          </button>
        </div>

        {/* Thanh thông báo kết quả đồng bộ */}
        {syncFeedback && (
          <div className={`mx-6 mt-3 p-3 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top-1 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB NỘI DUNG: DANH SÁCH TÀI KHOẢN vs MA TRẬN PHÂN QUYỀN */}
        {activeViewTab === 'users' ? (
          <>
            {/* Toolbar & Thống kê */}
            <div className="px-6 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-700">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Tổng: <b>{profiles.length}</b> tài khoản</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-800 rounded-lg text-xs">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin: <b>{profiles.filter(p => p.role === 'Admin').length}</b></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold">
              <span>BGH: <b>{profiles.filter(p => p.role === 'BanGiamHieu').length}</b></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs">
              <span>Giáo viên: <b>{profiles.filter(p => p.role !== 'Admin' && p.role !== 'BanGiamHieu').length}</b></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWithSupabase}
              disabled={isSyncing}
              title="Đồng bộ 2 chiều: Đẩy toàn bộ tài khoản local lên Supabase CSDL Cloud"
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 border transition-all ${
                isSyncing
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-2xs hover:shadow-xs'
              }`}
            >
              <ArrowLeftRight className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ với Supabase'}</span>
            </button>

            <button
              onClick={() => {
                setIsAddingUser(!isAddingUser);
                setFormError(null);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddingUser ? 'Thu gọn' : 'Cấp tài khoản mới'}</span>
            </button>
            <button
              onClick={loadData}
              title="Tải lại danh sách từ CSDL"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Form Cấp tài khoản mới (Expandable) */}
        {isAddingUser && (
          <div className="px-6 py-4 bg-blue-50/60 border-b border-blue-200/70 animate-in slide-in-from-top-2">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  Biểu mẫu Cấp Tài khoản Người dùng Mới
                </h3>
                <span className="text-[11px] text-slate-500">Tên đăng nhập là địa chỉ Email</span>
              </div>

              {formError && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Họ và tên */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Thầy Nguyễn Văn An"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Đơn vị */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Đơn vị / Tổ công tác <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Tổ Tự Nhiên, THPT Chuyên..."
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Chuyên môn */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chuyên môn <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Toán học, Tin học, Vật lý..."
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email đăng nhập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="nguyenvanan@nbkcs.edu.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="0912.345.678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Phân quyền */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phân quyền vai trò <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={role}
                      onChange={(e) => {
                        const newRole = e.target.value as UserRole;
                        setRole(newRole);
                        setAddPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || []);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Admin">Admin (Toàn quyền hệ thống & Quản lý tài khoản)</option>
                      <option value="BanGiamHieu">Ban Giám hiệu (Đủ 3 phân hệ, không can thiệp tài khoản)</option>
                      <option value="GiaoVu">Giáo vụ (Xếp phòng & Phân công giám thị)</option>
                      <option value="ToTruong">Tổ trưởng chuyên môn (Bảng điểm & Khảo thí GDPT 2018)</option>
                      <option value="GiaoVien">Giáo viên bộ môn (Tra cứu phòng & nhiệm vụ)</option>
                    </select>
                  </div>
                </div>

                {/* Khu vực mở rộng tùy biến phân quyền chức năng khi cấp mới */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAddPermissionsConfig(!showAddPermissionsConfig)}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Phân quyền chi tiết: <b>{addPermissions.length}/9 quyền</b> ({role})</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {showAddPermissionsConfig ? '(Nhấn để thu gọn ▲)' : '(Nhấn để tùy biến riêng ▼)'}
                      </span>
                    </button>
                    {showAddPermissionsConfig && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyRolePresetToAdd(role)}
                          className="text-[11px] text-slate-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Theo vai trò</span>
                        </button>
                        <button
                          type="button"
                          onClick={selectAllAddPermissions}
                          className="text-[11px] text-slate-600 hover:text-indigo-700"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={clearAllAddPermissions}
                          className="text-[11px] text-slate-600 hover:text-rose-700"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    )}
                  </div>

                  {showAddPermissionsConfig && (
                    <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 animate-in fade-in">
                      {ALL_PERMISSIONS.map(p => {
                        const isChecked = addPermissions.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium'
                                : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAddPermission(p.id)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold leading-tight">{p.label}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mật khẩu */}
                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Mật khẩu khởi tạo:
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Tạo mật khẩu ngẫu nhiên an toàn
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-end pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(false)}
                      className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang cấp tài khoản...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Xác nhận Cấp tài khoản</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="p-4 border-b border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo Tên, Email, Đơn vị, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500">Lọc vai trò:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {(['All', 'Admin', 'BanGiamHieu', 'GiaoVu', 'ToTruong', 'GiaoVien'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    roleFilter === r ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'All' ? 'Tất cả' : r === 'Admin' ? 'Admin' : r === 'BanGiamHieu' ? 'BGH' : r === 'GiaoVu' ? 'Giáo vụ' : r === 'ToTruong' ? 'Tổ trưởng' : 'Giáo viên'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danh sách người dùng Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Đang tải danh sách người dùng...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Không tìm thấy tài khoản người dùng phù hợp</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Họ và tên cán bộ</th>
                  <th className="py-3 px-4">Đơn vị & Chuyên môn</th>
                  <th className="py-3 px-4">Tên đăng nhập (Email)</th>
                  <th className="py-3 px-3 text-center">Điện thoại</th>
                  <th className="py-3 px-3 text-center">Vai trò</th>
                  <th className="py-3 px-3 text-center">Phân quyền</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-4 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-800">{user.full_name}</div>
                      {user.id === currentUser.id && (
                        <span className="text-[10px] text-emerald-600 font-semibold">(Tài khoản của bạn)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{user.unit}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>{user.specialization}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {user.email}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                      {user.phone || '---'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        user.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : user.role === 'BanGiamHieu'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : user.role === 'GiaoVu'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : user.role === 'ToTruong'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {user.role === 'Admin' ? 'Admin' : user.role === 'BanGiamHieu' ? 'Ban Giám hiệu' : user.role === 'GiaoVu' ? 'Giáo vụ' : user.role === 'ToTruong' ? 'Tổ trưởng' : 'Giáo viên'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {(() => {
                        const userPerms = Array.isArray(user.permissions) && user.permissions.length > 0
                          ? user.permissions
                          : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);
                        const count = userPerms.length;
                        const isFull = count === ALL_PERMISSIONS.length;
                        return (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(user)}
                            className="inline-flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                            title={`Được cấp ${count}/${ALL_PERMISSIONS.length} quyền: Nhấn để xem & tùy biến chi tiết`}
                          >
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFull 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : count >= 6
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : count >= 2
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {isFull ? 'Full (9/9)' : `${count}/9 quyền`}
                            </span>
                          </button>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.is_active !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {user.is_active !== false ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(user)}
                          title="Sửa thông tin người dùng"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setResettingUser(user);
                            setNewPasswordInput('Gv@2025');
                            setResetSuccessMsg(null);
                          }}
                          title="Đặt lại mật khẩu"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.id === currentUser.id}
                          title={user.is_active !== false ? 'Khóa tài khoản' : 'Mở khóa'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_active !== false
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.is_active !== false ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === currentUser.id || deletingUserId === user.id}
                          title={user.id === currentUser.id ? 'Không thể tự xóa chính mình' : 'Xóa tài khoản khỏi hệ thống và CSDL'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.id === currentUser.id
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          {deletingUserId === user.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    ) : (
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* Header giới thiệu ma trận */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-2xl border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Ma trận Phân quyền Hệ thống Chuẩn Trường học
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Hệ thống chuẩn hóa 4 nhóm chức năng lõi gồm 9 quyền hạn chi tiết trên 5 nhóm người dùng. Admin có thể tùy biến linh hoạt cho từng tài khoản và dữ liệu được đồng bộ 100% hai chiều với CSDL Supabase Cloud.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsAddingUser(true);
                setActiveViewTab('users');
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cấp tài khoản mới</span>
            </button>
          </div>
        </div>

        {/* 5 Thẻ tóm tắt vai trò */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              roleKey: 'Admin' as UserRole,
              roleName: 'Admin',
              title: 'Quản trị viên tối cao',
              color: 'purple',
              permsCount: '9/9 quyền (100%)',
              desc: 'Toàn quyền 3 phân hệ, CSDL khảo thí, cấp & quản lý tài khoản.',
            },
            {
              roleKey: 'BanGiamHieu' as UserRole,
              roleName: 'Ban Giám hiệu',
              title: 'Lãnh đạo nhà trường',
              color: 'rose',
              permsCount: '8/9 quyền',
              desc: 'Toàn quyền 3 phân hệ cốt lõi & CSDL khảo thí toàn trường (không can thiệp user).',
            },
            {
              roleKey: 'GiaoVu' as UserRole,
              roleName: 'Giáo vụ',
              title: 'Chuyên trách Thi cử',
              color: 'amber',
              permsCount: '6/9 quyền',
              desc: 'Phân hệ 1: Xếp phòng thi & Phân hệ 2: Phân công giám thị, import điểm máy chấm.',
            },
            {
              roleKey: 'ToTruong' as UserRole,
              roleName: 'Tổ trưởng',
              title: 'Tổ trưởng chuyên môn',
              color: 'emerald',
              permsCount: '2/9 quyền',
              desc: 'Phân hệ 3: Bảng điểm, YCCĐ, AI Khảo thí & can thiệp sư phạm bộ môn.',
            },
            {
              roleKey: 'GiaoVien' as UserRole,
              roleName: 'Giáo viên',
              title: 'Cán bộ / Giáo viên',
              color: 'blue',
              permsCount: '1/9 quyền',
              desc: 'Phân hệ 2: Tra cứu lịch thi, phòng thi & phân công coi thi.',
            },
          ].map((item) => {
            const count = profiles.filter(p => p.role === item.roleKey).length;
            const borderClass = 
              item.color === 'purple' ? 'border-purple-200 bg-purple-50/40 hover:border-purple-300' :
              item.color === 'rose' ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300' :
              item.color === 'amber' ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300' :
              item.color === 'emerald' ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300' :
              'border-blue-200 bg-blue-50/40 hover:border-blue-300';
            
            const badgeClass =
              item.color === 'purple' ? 'bg-purple-100 text-purple-800' :
              item.color === 'rose' ? 'bg-rose-100 text-rose-800' :
              item.color === 'amber' ? 'bg-amber-100 text-amber-800' :
              item.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
              'bg-blue-100 text-blue-800';

            return (
              <div key={item.roleKey} className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${borderClass}`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeClass}`}>
                      {item.roleName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.permsCount}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 text-xs">{item.title}</div>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-snug line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    Hiện có: <b>{count}</b> cán bộ
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter(item.roleKey);
                      setActiveViewTab('users');
                    }}
                    className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Xem DS</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bảng Ma trận Phân quyền Đối Chiếu Toàn Diện */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                BẢNG ĐỐI CHIẾU MA TRẬN 9 QUYỀN CHỨC NĂNG X 5 NHÓM VAI TRÒ
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">
              (Dấu <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline mx-0.5" /> biểu thị vai trò có quyền thực thi chức năng đó)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-72">Nhóm chức năng & Mã quyền</th>
                  <th className="py-3 px-4">Mô tả phạm vi nghiệp vụ</th>
                  <th className="py-3 px-3 text-center w-24 text-purple-800 bg-purple-50/50">Admin</th>
                  <th className="py-3 px-3 text-center w-24 text-rose-800 bg-rose-50/50">Ban Giám hiệu</th>
                  <th className="py-3 px-3 text-center w-24 text-amber-800 bg-amber-50/50">Giáo vụ</th>
                  <th className="py-3 px-3 text-center w-24 text-emerald-800 bg-emerald-50/50">Tổ trưởng</th>
                  <th className="py-3 px-3 text-center w-24 text-blue-800 bg-blue-50/50">Giáo viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {(['Cốt lõi', 'Khảo thí', 'CSDL Tra cứu', 'Hệ thống'] as const).map(cat => {
                  const perms = ALL_PERMISSIONS.filter(p => p.category === cat);
                  const catBadge =
                    cat === 'Cốt lõi' ? 'bg-blue-100 text-blue-800' :
                    cat === 'Khảo thí' ? 'bg-emerald-100 text-emerald-800' :
                    cat === 'CSDL Tra cứu' ? 'bg-amber-100 text-amber-800' :
                    'bg-purple-100 text-purple-800';

                  return (
                    <React.Fragment key={cat}>
                      <tr className="bg-slate-50/80 font-bold text-slate-700">
                        <td colSpan={8} className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${catBadge}`}>
                            NHÓM {cat.toUpperCase()} ({perms.length} QUYỀN)
                          </span>
                        </td>
                      </tr>

                      {perms.map((p) => {
                        const hasAdmin = DEFAULT_ROLE_PERMISSIONS.Admin.includes(p.id);
                        const hasBGH = DEFAULT_ROLE_PERMISSIONS.BanGiamHieu.includes(p.id);
                        const hasGVU = DEFAULT_ROLE_PERMISSIONS.GiaoVu.includes(p.id);
                        const hasTT = DEFAULT_ROLE_PERMISSIONS.ToTruong.includes(p.id);
                        const hasGV = DEFAULT_ROLE_PERMISSIONS.GiaoVien.includes(p.id);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                              {ALL_PERMISSIONS.findIndex(ap => ap.id === p.id) + 1}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">
                              <div>{p.label}</div>
                              <div className="text-[10px] font-mono text-slate-400">{p.id}</div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 text-[11px] leading-relaxed">
                              {p.description}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-purple-50/20">
                              {hasAdmin ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-rose-50/20">
                              {hasBGH ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-amber-50/20">
                              {hasGVU ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                              {hasTT ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-blue-50/20">
                              {hasGV ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* Dòng tổng kết */}
                <tr className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
                  <td colSpan={3} className="py-3 px-4 text-right">
                    TỔNG SỐ QUYỀN MẶC ĐỊNH / 9 QUYỀN HỆ THỐNG:
                  </td>
                  <td className="py-3 px-3 text-center text-purple-700 bg-purple-100/60 font-mono">
                    9 / 9
                  </td>
                  <td className="py-3 px-3 text-center text-rose-700 bg-rose-100/60 font-mono">
                    8 / 9
                  </td>
                  <td className="py-3 px-3 text-center text-amber-700 bg-amber-100/60 font-mono">
                    6 / 9
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-700 bg-emerald-100/60 font-mono">
                    2 / 9
                  </td>
                  <td className="py-3 px-3 text-center text-blue-700 bg-blue-100/60 font-mono">
                    1 / 9
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Khối Giải thích & Trả lời nghiệp vụ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Cơ chế Phân quyền 2 Tầng Linh hoạt</span>
            </div>
            <p className="leading-relaxed">
              • <b>Tầng 1 (Role Presets):</b> 5 vai trò chuẩn trường học giúp tạo nhanh tài khoản với các quyền mặc định phù hợp (Admin, Ban Giám hiệu, Giáo vụ, Tổ trưởng, Giáo viên).
            </p>
            <p className="leading-relaxed">
              • <b>Tầng 2 (Custom User Permissions):</b> Admin có toàn quyền tích thêm hoặc bớt bất kỳ quyền nào trong 9 quyền khi Cấp mới hoặc Sửa thông tin tài khoản. Mỗi tài khoản có thể có ma trận phân quyền độc lập.
            </p>
            <p className="leading-relaxed">
              • <b>Hiệu lực tức thì:</b> Sau khi lưu, giao diện điều hướng các phân hệ và nút bấm trên thanh công cụ sẽ tự động thích ứng ngay theo đúng các quyền đã cấp.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>Đồng bộ Hai Chiều với CSDL Supabase</span>
            </div>
            <p className="leading-relaxed">
              • <b>Supabase Auth (auth.users):</b> Trường <code>user_metadata.permissions</code> lưu giữ mảng các quyền hạn của tài khoản.
            </p>
            <p className="leading-relaxed">
              • <b>Bảng CSDL (public.profiles):</b> Cột <code>permissions JSONB</code> lưu trữ trực tiếp trong CSDL bảng hồ sơ, cho phép truy vấn và quản lý tập trung.
            </p>
            <p className="leading-relaxed">
              • <b>Bảo mật RLS:</b> Khi cán bộ đăng nhập, hệ thống tự động kiểm tra quyền hạn hợp lệ từ CSDL Supabase để cấp quyền truy cập các phân hệ.
            </p>
          </div>
        </div>
      </div>
    )}

        {/* Modal con: Chỉnh sửa thông tin tài khoản (Đồng bộ 2 chiều Supabase & Ma trận phân quyền) */}
        {editingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Chỉnh sửa thông tin & Ma trận phân quyền</h4>
                    <p className="text-[11px] text-blue-100">Đồng bộ 2 chiều với Supabase Auth metadata và CSDL profiles</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 text-xs">
                {editError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email đăng nhập
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Đơn vị / Tổ chuyên môn
                    </label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="VD: Tổ Tự Nhiên, Ban Giám Hiệu..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chuyên môn giảng dạy
                    </label>
                    <input
                      type="text"
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      placeholder="VD: Toán học, Vật lý, Ngữ văn..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="VD: 0912.345.678"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Vai trò hệ thống
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      disabled={editingUser.id === currentUser.id}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    >
                      <option value="Admin">Quản trị viên (Admin)</option>
                      <option value="BanGiamHieu">Ban Giám hiệu (Đủ 3 phân hệ, không can thiệp tài khoản)</option>
                      <option value="GiaoVu">Giáo vụ (Xếp phòng & Phân công giám thị)</option>
                      <option value="ToTruong">Tổ trưởng chuyên môn (Bảng điểm & Khảo thí)</option>
                      <option value="GiaoVien">Giáo viên bộ môn</option>
                    </select>
                    {editingUser.id === currentUser.id && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Không thể đổi vai trò tài khoản đang đăng nhập</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trạng thái hoạt động
                  </label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="edit_is_active"
                        checked={editIsActive === true}
                        onChange={() => setEditIsActive(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đang hoạt động
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="edit_is_active"
                        checked={editIsActive === false}
                        onChange={() => setEditIsActive(false)}
                        disabled={editingUser.id === currentUser.id}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-medium text-amber-700 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Tạm khóa tài khoản
                      </span>
                    </label>
                  </div>
                </div>

                {/* Khu vực Ma trận phân quyền chức năng chi tiết */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs">Ma trận Phân quyền theo Nhóm Chức năng</span>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Đã chọn: {editPermissions.length}/9 quyền
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyRolePresetToEdit(editRole)}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors"
                        title="Khôi phục quyền mặc định theo vai trò đã chọn"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Mặc định vai trò</span>
                      </button>
                      <button
                        type="button"
                        onClick={selectAllEditPermissions}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={clearAllEditPermissions}
                        className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Admin có thể linh hoạt tick chọn/bỏ chọn từng quyền độc lập. Khi bấm lưu, dữ liệu sẽ được ghi nhận đồng thời vào <b>Supabase Auth (user_metadata)</b> và bảng CSDL <b>public.profiles</b>.
                  </p>

                  {/* 4 Nhóm chức năng */}
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {(['Cốt lõi', 'Khảo thí', 'CSDL Tra cứu', 'Hệ thống'] as const).map(cat => {
                      const permsInCat = ALL_PERMISSIONS.filter(p => p.category === cat);
                      if (permsInCat.length === 0) return null;
                      const catBadgeColor = 
                        cat === 'Cốt lõi' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        cat === 'Khảo thí' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        cat === 'CSDL Tra cứu' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-purple-100 text-purple-800 border-purple-200';

                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catBadgeColor}`}>
                              Nhóm {cat}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {permsInCat.map(p => {
                              const isChecked = editPermissions.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                                    isChecked
                                      ? 'bg-white border-indigo-400 shadow-2xs ring-1 ring-indigo-300'
                                      : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleEditPermission(p.id)}
                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold leading-tight ${isChecked ? 'text-indigo-950' : 'text-slate-700'}`}>
                                      {p.label}
                                    </div>
                                    <div className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                                      {p.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Đổi mật khẩu mới <span className="font-normal text-slate-400">(Tùy chọn - để trống nếu không đổi)</span>
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
                  >
                    {isSavingEdit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu lên Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu thay đổi CSDL</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal con: Xác nhận xóa tài khoản vĩnh viễn trên Supabase */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden space-y-4">
              <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-700 font-bold text-sm">
                  <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span>Xác nhận xóa tài khoản</span>
                </div>
                <button onClick={() => setUserToDelete(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 pt-0 space-y-3.5 text-xs text-slate-600">
                <p>
                  Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản người dùng sau đây?
                </p>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{userToDelete.full_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      userToDelete.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {userToDelete.role}
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">{userToDelete.email}</div>
                  <div className="text-slate-500 text-[11px]">{userToDelete.unit} • {userToDelete.specialization}</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <b>Cảnh báo:</b> Tài khoản sẽ bị xóa đồng thời khỏi <b>Supabase Auth (auth.users)</b> và bảng <b>CSDL (public.profiles)</b>. Người này sẽ bị thu hồi toàn bộ quyền truy cập và không thể đăng nhập được nữa.
                  </div>
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    disabled={isDeletingUser}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingUser}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all"
                  >
                    {isDeletingUser ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xóa trên Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa vĩnh viễn tài khoản</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal con: Đặt lại mật khẩu */}
        {resettingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  Đặt lại mật khẩu cho {resettingUser.full_name}
                </h4>
                <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {resetSuccessMsg ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg font-medium">
                  {resetSuccessMsg}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Nhập mật khẩu mới để cấp lại cho tài khoản <b>{resettingUser.email}</b>:
                  </p>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Mật khẩu mới..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setResettingUser(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleConfirmResetPassword}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Lưu mật khẩu mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống phân quyền RBAC kết hợp Supabase Auth</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
