import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';

// Lấy biến môi trường Supabase từ Vite
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 20
);

export let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Không thể khởi tạo Supabase Client:', err);
    supabase = null;
  }
}

// --------------------------------------------------------------------------
// LOCAL FALLBACK STORE (Phục vụ chạy ngay khi chưa điền env Supabase)
// --------------------------------------------------------------------------
const STORAGE_KEY_PROFILES = 'exam_app_profiles_v2';
const STORAGE_KEY_CURRENT_USER = 'exam_app_current_user_v1';

// Mặc định ban đầu có các tài khoản phân quyền chuẩn trường học:
// 1. Admin: Quản trị viên tối cao (full quyền hệ thống)
// 2. BanGiamHieu: Ban Giám hiệu (đủ 3 phân hệ: Xếp phòng, Giám thị, Khảo thí toàn trường; không can thiệp tài khoản)
// 3. GiaoVu: Chuyên trách Xếp phòng thi & Phân công giám thị
// 4. ToTruong: Tổ trưởng chuyên môn (chuyên trách Khảo thí, Bảng điểm & YCCĐ)
const DEFAULT_MOCK_PROFILES: (UserProfile & { password?: string })[] = [
  {
    id: 'd6335c87-8fa1-4fdc-b505-0e554322d870',
    email: 'admin@nbkcs.edu.vn',
    full_name: 'ngoccs (Quản trị viên)',
    unit: 'ITNBK',
    specialization: 'Tin học & Quản trị',
    phone: '0986041183',
    role: 'Admin',
    is_active: true,
    created_at: new Date().toISOString(),
    password: 'admin123',
  },
  {
    id: 'bgh-nbkcs-01',
    email: 'bgh@nbkcs.edu.vn',
    full_name: 'Thầy Hiệu Trưởng (Ban Giám Hiệu)',
    unit: 'Ban Giám Hiệu',
    specialization: 'Quản lý thi & Khảo thí toàn trường',
    phone: '0903123456',
    role: 'BanGiamHieu',
    is_active: true,
    created_at: new Date().toISOString(),
    password: 'bgh123',
  },
  {
    id: 'giaovu-nbkcs-01',
    email: 'giaovu@nbkcs.edu.vn',
    full_name: 'Nguyễn Văn Giáo Vụ',
    unit: 'Phòng Giáo Vụ - Khảo Thí',
    specialization: 'Quản trị thi & Phòng thi',
    phone: '0912345678',
    role: 'GiaoVu',
    is_active: true,
    created_at: new Date().toISOString(),
    password: 'giaovu123',
  },
  {
    id: 'totruong-hoa-nbkcs-01',
    email: 'totruong.hoa@nbkcs.edu.vn',
    full_name: 'Trần Thị Thu Hà (Tổ trưởng Hóa)',
    unit: 'Tổ Hóa học - KHTN',
    specialization: 'Hóa học GDPT 2018',
    phone: '0987654321',
    role: 'ToTruong',
    is_active: true,
    created_at: new Date().toISOString(),
    password: '123456',
  },
  {
    id: 'totruong-toan-nbkcs-02',
    email: 'totruong.toan@nbkcs.edu.vn',
    full_name: 'Lê Minh Quân (Tổ trưởng Toán)',
    unit: 'Tổ Toán - Tin',
    specialization: 'Toán học GDPT 2018',
    phone: '0978123456',
    role: 'ToTruong',
    is_active: true,
    created_at: new Date().toISOString(),
    password: '123456',
  }
];

function getLocalProfiles(): (UserProfile & { password?: string })[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_MOCK_PROFILES));
      return DEFAULT_MOCK_PROFILES;
    }
    const list: (UserProfile & { password?: string })[] = JSON.parse(raw);
    // Tự động bổ sung tài khoản Ban Giám hiệu nếu localStorage từ phiên bản cũ chưa có
    const hasBgh = list.some(p => p.role === 'BanGiamHieu' || p.email === 'bgh@nbkcs.edu.vn');
    if (!hasBgh) {
      list.splice(1, 0, DEFAULT_MOCK_PROFILES[1]); // Chèn BGH ngay sau Admin
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
    }
    return list;
  } catch {
    return DEFAULT_MOCK_PROFILES;
  }
}

function saveLocalProfiles(profiles: (UserProfile & { password?: string })[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error('Lỗi khi lưu profiles local:', err);
  }
}

// --------------------------------------------------------------------------
// CÁC HÀM XÁC THỰC VÀ QUẢN LÝ TÀI KHOẢN (API DÙNG CHUNG)
// --------------------------------------------------------------------------

/**
 * Đăng nhập bằng Email và Mật khẩu
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<{ user: UserProfile | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    return { user: null, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu' };
  }

  // 1. Tuyệt đối chặn các email mẫu cũ không tồn tại
  if (cleanEmail === 'admin@truonghoc.edu.vn' || cleanEmail === 'giaovien@truonghoc.edu.vn') {
    return { user: null, error: 'Tài khoản này không tồn tại trong hệ thống.' };
  }

  // 2. Xác thực qua API backend /api/auth/login (kết nối Supabase Database & Auth)
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass })
    });
    const json = await res.json().catch(() => null);

    // NẾU TÀI KHOẢN BỊ TẠM KHÓA -> CHẶN NGAY LẬP TỨC (HTTP 403 hoặc thông báo lỗi)
    if (res.status === 403 || (json && json.error && (json.error.includes('khóa') || json.error.includes('tạm khóa')))) {
      await logoutUser();
      return {
        user: null,
        error: json?.error || 'Tài khoản của Thầy/Cô đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.'
      };
    }

    // Nếu đăng nhập thành công
    if (res.ok && json && json.success && json.user) {
      if (json.user.is_active === false) {
        await logoutUser();
        return {
          user: null,
          error: 'Tài khoản của Thầy/Cô đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.'
        };
      }
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(json.user));
      return { user: json.user };
    }

    // Nếu mật khẩu sai hoặc tài khoản không tồn tại (HTTP 401)
    if (res.status === 401) {
      return { user: null, error: json?.error || 'Email hoặc mật khẩu không chính xác' };
    }
  } catch (apiErr) {
    console.warn('API backend login error:', apiErr);
  }

  // 3. Xác thực qua Supabase Client SDK nếu có
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('banned') || msg.includes('disabled') || msg.includes('khoa')) {
          return {
            user: null,
            error: 'Tài khoản của Thầy/Cô đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.'
          };
        }
        return { user: null, error: 'Email hoặc mật khẩu không chính xác' };
      }

      if (data?.user) {
        let userProfile: UserProfile | null = null;
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profileData) {
            userProfile = profileData as UserProfile;
          }
        } catch {
          // ignore
        }

        if (!userProfile) {
          try {
            const res = await fetch('/api/admin/profiles');
            if (res.ok) {
              const jsonP = await res.json();
              userProfile = jsonP.profiles?.find((p: any) => p.id === data.user.id || p.email.toLowerCase() === cleanEmail);
            }
          } catch {}
        }

        const meta = data.user.user_metadata || {};
        if (userProfile && meta.role && meta.role !== userProfile.role) {
          userProfile.role = meta.role as UserRole;
        }
        const isActive = userProfile ? userProfile.is_active : (meta.is_active !== false);

        if (isActive === false) {
          await supabase.auth.signOut();
          localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          return { user: null, error: 'Tài khoản của Thầy/Cô đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.' };
        }

        const finalUser: UserProfile = userProfile || {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: meta.full_name || 'Cán bộ giáo viên',
          unit: meta.unit || 'Trường THPT',
          specialization: meta.specialization || 'Chung',
          phone: meta.phone || '',
          role: (meta.role as UserRole) || 'GiaoVien',
          is_active: true,
        };

        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(finalUser));
        return { user: finalUser };
      }
    } catch (err: any) {
      console.warn('Lỗi Supabase Client:', err);
    }
  }

  // 4. Nếu đã cấu hình Supabase Cloud, TUYỆT ĐỐI KHÔNG dùng mock profile fallback.
  // Chỉ tài khoản đã thực sự tồn tại trong CSDL Supabase mới được đăng nhập!
  if (isSupabaseConfigured) {
    return { user: null, error: 'Email hoặc mật khẩu không chính xác hoặc chưa được cấp trong CSDL Supabase' };
  }

  // 5. Fallback chỉ kích hoạt khi ứng dụng đang chạy ở chế độ cục bộ chưa kết nối Supabase
  const profiles = getLocalProfiles();
  const found = profiles.find(
    p => p.email.toLowerCase() === cleanEmail && (p.password ? p.password === cleanPass : (cleanPass === 'admin123'))
  );

  if (found) {
    if (found.is_active === false) {
      return { user: null, error: 'Tài khoản của Thầy/Cô đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.' };
    }
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(found));
    return { user: found };
  }

  return { user: null, error: 'Email hoặc mật khẩu không chính xác' };
}

/**
 * Đăng xuất
 */
export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
  }
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
}

/**
 * Lấy thông tin người dùng đang đăng nhập
 */
export async function getActiveUser(): Promise<UserProfile | null> {
  // Ưu tiên session Supabase nếu có
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        let profile: UserProfile | null = null;
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileData) {
            profile = profileData as UserProfile;
          }
        } catch {}

        if (!profile) {
          try {
            const res = await fetch('/api/admin/profiles');
            if (res.ok) {
              const json = await res.json();
              profile = json.profiles?.find((p: any) => p.id === session.user.id || p.email.toLowerCase() === session.user.email?.toLowerCase());
            }
          } catch {}
        }

        // NẾU TÀI KHOẢN BỊ TẠM KHÓA -> ĐĂNG XUẤT NGAY!
        const meta = session.user.user_metadata || {};
        if (profile && meta.role && meta.role !== profile.role) {
          profile.role = meta.role as UserRole;
        }

        if (profile && profile.is_active === false) {
          await logoutUser();
          return null;
        }

        if (profile) {
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(profile));
          return profile;
        }
      }
    } catch {
      // Fallback xuống local
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.is_active === false) {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
        return null;
      }
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lấy danh sách toàn bộ tài khoản (Chỉ dành cho Admin)
 */
export async function fetchAllProfiles(): Promise<UserProfile[]> {
  // 1. Thử lấy trực tiếp từ Backend API (kết nối Supabase bằng service_role bỏ qua RLS)
  try {
    const res = await fetch('/api/admin/profiles');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.profiles) && json.profiles.length > 0) {
        saveLocalProfiles(json.profiles);
        return json.profiles as UserProfile[];
      }
    }
  } catch (apiErr) {
    console.warn('Lỗi gọi /api/admin/profiles:', apiErr);
  }

  // 2. Thử Supabase Client nếu có
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        saveLocalProfiles(data);
        return data as UserProfile[];
      }
    } catch (err) {
      console.warn('Lỗi lấy profiles từ Supabase client:', err);
    }
  }

  // 3. Fallback Local
  const local = getLocalProfiles();
  return local.map(({ password, ...u }) => u);
}

/**
 * Admin cấp tài khoản mới
 */
export async function createNewUserAccount(payload: {
  full_name: string;
  unit: string;
  specialization: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = payload.email.trim().toLowerCase();

  // 1. Thử gọi backend server API (nếu server có SUPABASE_SERVICE_ROLE_KEY)
  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.user) {
        // Cập nhật local cache
        const profiles = getLocalProfiles();
        const existingIdx = profiles.findIndex(p => p.id === result.user.id || p.email === cleanEmail);
        if (existingIdx >= 0) {
          profiles[existingIdx] = result.user;
        } else {
          profiles.unshift(result.user);
        }
        saveLocalProfiles(profiles);
        return { success: true, user: result.user };
      } else if (result.error) {
        return { success: false, error: result.error };
      }
    }
  } catch {
    // Nếu server không phản hồi, tiếp tục xử lý
  }

  // 2. Nếu Supabase client đang chạy trực tiếp
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: payload.password,
        options: {
          data: {
            full_name: payload.full_name,
            unit: payload.unit,
            specialization: payload.specialization,
            phone: payload.phone,
            role: payload.role,
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          email: cleanEmail,
          full_name: payload.full_name,
          unit: payload.unit,
          specialization: payload.specialization,
          phone: payload.phone,
          role: payload.role,
          is_active: true,
          created_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);
        const profiles = getLocalProfiles();
        profiles.unshift(newProfile);
        saveLocalProfiles(profiles);
        return { success: true, user: newProfile };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Không thể tạo tài khoản trên Supabase' };
    }
  }

  // 3. Fallback lưu vào Local Storage
  const profiles = getLocalProfiles();
  if (profiles.some(p => p.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'Email này đã tồn tại trong hệ thống' };
  }

  const newProfile: UserProfile & { password?: string } = {
    id: 'user-' + Date.now(),
    email: cleanEmail,
    full_name: payload.full_name.trim(),
    unit: payload.unit.trim(),
    specialization: payload.specialization.trim(),
    phone: payload.phone.trim(),
    role: payload.role,
    is_active: true,
    created_at: new Date().toISOString(),
    password: payload.password,
  };

  profiles.unshift(newProfile);
  saveLocalProfiles(profiles);

  return { success: true, user: newProfile };
}

/**
 * Cập nhật thông tin tài khoản người dùng (đồng bộ 2 chiều với Supabase)
 */
export async function updateUserProfile(payload: {
  id: string;
  full_name?: string;
  unit?: string;
  specialization?: string;
  phone?: string;
  role?: UserRole;
  email?: string;
  password?: string;
  is_active?: boolean;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  // 1. Gọi backend API
  try {
    const res = await fetch('/api/admin/update-user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success && json?.user) {
      const returnedUser: UserProfile = {
        ...json.user,
        role: payload.role !== undefined ? payload.role : json.user.role,
      };
      const profiles = getLocalProfiles();
      const idx = profiles.findIndex(p => p.id === payload.id);
      if (idx >= 0) {
        profiles[idx] = { ...profiles[idx], ...returnedUser };
      } else {
        profiles.unshift(returnedUser);
      }
      saveLocalProfiles(profiles);
      return { success: true, user: returnedUser };
    } else if (json?.error) {
      console.warn('API /api/admin/update-user báo lỗi:', json.error);
    }
  } catch (err: any) {
    console.warn('Lỗi gọi /api/admin/update-user:', err);
  }

  // 2. Thử trực tiếp client Supabase nếu có
  if (isSupabaseConfigured && supabase) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (payload.full_name !== undefined) updateData.full_name = payload.full_name.trim();
      if (payload.unit !== undefined) updateData.unit = payload.unit.trim();
      if (payload.specialization !== undefined) updateData.specialization = payload.specialization.trim();
      if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
      if (payload.role !== undefined) updateData.role = payload.role;
      if (typeof payload.is_active === 'boolean') updateData.is_active = payload.is_active;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', payload.id)
        .select()
        .single();

      if (!error && data) {
        const finalData = { ...data };
        if (payload.role !== undefined) finalData.role = payload.role;
        const profiles = getLocalProfiles();
        const idx = profiles.findIndex(p => p.id === payload.id);
        if (idx >= 0) {
          profiles[idx] = { ...profiles[idx], ...finalData };
          saveLocalProfiles(profiles);
        }
        return { success: true, user: finalData as UserProfile };
      }
    } catch (err: any) {
      console.warn('Lỗi cập nhật qua Supabase Client:', err);
    }
  }

  // 3. Fallback Local
  const profiles = getLocalProfiles();
  const idx = profiles.findIndex(p => p.id === payload.id);
  if (idx >= 0) {
    profiles[idx] = {
      ...profiles[idx],
      full_name: payload.full_name !== undefined ? payload.full_name : profiles[idx].full_name,
      unit: payload.unit !== undefined ? payload.unit : profiles[idx].unit,
      specialization: payload.specialization !== undefined ? payload.specialization : profiles[idx].specialization,
      phone: payload.phone !== undefined ? payload.phone : profiles[idx].phone,
      role: payload.role !== undefined ? payload.role : profiles[idx].role,
      is_active: payload.is_active !== undefined ? payload.is_active : profiles[idx].is_active,
      ...(payload.password ? { password: payload.password } : {}),
      updated_at: new Date().toISOString(),
    };
    saveLocalProfiles(profiles);
    const { password, ...userWithoutPass } = profiles[idx];
    return { success: true, user: userWithoutPass };
  }

  return { success: false, error: 'Không tìm thấy tài khoản để cập nhật' };
}

/**
 * Khóa hoặc mở khóa tài khoản
 */
export async function toggleUserStatus(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;

  // 1. Thử gọi backend API
  try {
    const res = await fetch('/api/admin/toggle-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, is_active: newStatus }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const profiles = getLocalProfiles();
        const index = profiles.findIndex(p => p.id === id);
        if (index >= 0) {
          profiles[index].is_active = newStatus;
          saveLocalProfiles(profiles);
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('Lỗi gọi /api/admin/toggle-status:', err);
  }

  // 2. Thử trực tiếp client
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', id);
      if (!error) return true;
    } catch (err) {
      console.warn('Lỗi cập nhật trạng thái trên Supabase:', err);
    }
  }

  // 3. Fallback local
  const profiles = getLocalProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index >= 0) {
    profiles[index].is_active = newStatus;
    saveLocalProfiles(profiles);
    return true;
  }
  return false;
}

/**
 * Xóa tài khoản người dùng
 */
export async function deleteUserAccount(id: string): Promise<boolean> {
  // 1. Thử qua backend API
  try {
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const profiles = getLocalProfiles().filter(p => p.id !== id);
        saveLocalProfiles(profiles);
        return true;
      }
    }
  } catch (err) {
    console.warn('Lỗi gọi /api/admin/delete-user:', err);
  }

  // 2. Thử trực tiếp qua Supabase Client
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) {
        const profiles = getLocalProfiles().filter(p => p.id !== id);
        saveLocalProfiles(profiles);
        return true;
      }
    } catch (err) {
      console.warn('Lỗi xóa trên Supabase:', err);
    }
  }

  // 3. Fallback local
  const profiles = getLocalProfiles().filter(p => p.id !== id);
  saveLocalProfiles(profiles);
  return true;
}

/**
 * Cập nhật mật khẩu Admin trong local storage fallback
 */
export function updateAdminPasswordLocal(email: string, newPass: string): void {
  try {
    const profiles = getLocalProfiles();
    const clean = email.trim().toLowerCase();
    const idx = profiles.findIndex(p => p.email.toLowerCase() === clean);
    if (idx >= 0) {
      profiles[idx].password = newPass;
      saveLocalProfiles(profiles);
    } else {
      profiles.push({
        id: 'd6335c87-8fa1-4fdc-b505-0e554322d870',
        email: clean,
        full_name: 'ngoccs',
        unit: 'ITNBK',
        specialization: 'Tin học & Quản trị',
        phone: '0986041183',
        role: 'Admin',
        is_active: true,
        created_at: new Date().toISOString(),
        password: newPass,
      });
      saveLocalProfiles(profiles);
    }
  } catch (err) {
    console.error('Lỗi khi updateAdminPasswordLocal:', err);
  }
}

/**
 * Đặt lại mật khẩu tài khoản (hỗ trợ cả Supabase Auth và Local)
 */
export async function resetUserPassword(id: string, newPass: string, email?: string): Promise<boolean> {
  // Thử gọi server API nếu có
  try {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, email, newPassword: newPass }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const profiles = getLocalProfiles();
        const index = profiles.findIndex(p => p.id === id || (email && p.email.toLowerCase() === email.toLowerCase()));
        if (index >= 0) {
          profiles[index].password = newPass;
          saveLocalProfiles(profiles);
        }
        return true;
      }
    }
  } catch {
    // ignore
  }

  const profiles = getLocalProfiles();
  const index = profiles.findIndex(p => p.id === id || (email && p.email.toLowerCase() === email.toLowerCase()));
  if (index >= 0) {
    profiles[index].password = newPass;
    saveLocalProfiles(profiles);
    return true;
  }
  return false;
}

/**
 * Đồng bộ 2 chiều: Đẩy các tài khoản từ Local lên Supabase
 */
export async function syncLocalProfilesToSupabase(localList?: UserProfile[]): Promise<{
  success: boolean;
  createdCount: number;
  skippedCount: number;
  profiles: UserProfile[];
  error?: string;
}> {
  try {
    const listToSync = localList || getLocalProfiles();
    const res = await fetch('/api/admin/sync-local-to-supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: listToSync }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.profiles) && json.profiles.length > 0) {
          saveLocalProfiles(json.profiles);
        }
        return json;
      }
      return { success: false, createdCount: 0, skippedCount: 0, profiles: [], error: json.error };
    }
    return { success: false, createdCount: 0, skippedCount: 0, profiles: [], error: 'Lỗi máy chủ khi đồng bộ' };
  } catch (err: any) {
    return { success: false, createdCount: 0, skippedCount: 0, profiles: [], error: err?.message || 'Lỗi mạng' };
  }
}
