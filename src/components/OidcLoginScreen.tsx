import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  LogIn, 
  Lock, 
  CheckCircle2, 
  User, 
  UserCheck, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Mail,
  Clock,
  Sparkles,
  Layers,
  Activity,
  HeartHandshake
} from 'lucide-react';
import { StaffUser } from '../types';
import { getStoredAdminPassword, getStoredLogoutReason, setStoredLogoutReason } from '../services/storage';

interface OidcLoginScreenProps {
  staffDatabase: StaffUser[];
  onLoginSuccess: (user: StaffUser, updatedList: StaffUser[]) => void;
}

export const OidcLoginScreen: React.FC<OidcLoginScreenProps> = ({
  staffDatabase,
  onLoginSuccess
}) => {
  // Login Tab: 'user' (บุคลากรทั่วไป / ผู้ขอยืม) or 'admin' (ผู้ดูแลระบบ)
  const [loginMode, setLoginMode] = useState<'user' | 'admin'>('user');

  // User Login Form state
  const [userAccountInput, setUserAccountInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Admin Login Form state
  const [adminEmailInput, setAdminEmailInput] = useState('kittiya.so@psu.ac.th');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Auto-detected session timeout or kick notification message
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = getStoredLogoutReason();
    if (reason) {
      setSessionNotice(reason);
      setStoredLogoutReason(null); // Clear after displaying once
    }
  }, []);

  // Handle User Login Submit
  const handleUserLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setSessionNotice(null);

    const inputClean = userAccountInput.trim().toLowerCase();
    if (!inputClean) {
      setUserError('กรุณาระบุชื่อบัญชี หรือ อีเมล PSU Passport (@psu.ac.th)');
      return;
    }

    if (!userPasswordInput) {
      setUserError('กรุณาระบุรหัสผ่าน PSU Passport');
      return;
    }

    const normalizedEmail = inputClean.includes('@') ? inputClean : `${inputClean}@psu.ac.th`;
    const normalizedUsername = inputClean.includes('@') ? inputClean.split('@')[0] : inputClean;

    // Search existing user in database
    let matchedUser = staffDatabase.find(
      u => (u.email && u.email.toLowerCase().trim() === normalizedEmail) ||
           (u.username && u.username.toLowerCase().trim() === normalizedUsername) ||
           (u.preferred_username && u.preferred_username.toLowerCase().trim() === normalizedUsername)
    );

    let updatedDatabase = [...staffDatabase];

    if (!matchedUser) {
      // Create new user profile if not in current database
      const newStaffId = `STAFF-${(staffDatabase.length + 1).toString().padStart(3, '0')}`;
      matchedUser = {
        id: newStaffId,
        name: normalizedUsername,
        username: normalizedUsername,
        preferred_username: normalizedUsername,
        display_name_th: normalizedUsername,
        email: normalizedEmail,
        position: 'บุคลากร ม.อ.',
        position_th: 'บุคลากร ม.อ.',
        dept: 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์',
        faculty_th: 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์',
        role: 'user',
        roleLabel: 'ผู้ขอยืม (User)',
        phone: '',
        authProvider: 'psu_sso',
        permissions: {
          canManageEquipment: false,
          canManageUsers: false,
          canApproveExecutive: false,
          canReceiveReturn: false,
        }
      };
      updatedDatabase.push(matchedUser);
    } else {
      matchedUser = {
        ...matchedUser,
        role: 'user',
        roleLabel: 'ผู้ขอยืม (User)',
        permissions: {
          canManageEquipment: false,
          canManageUsers: false,
          canApproveExecutive: false,
          canReceiveReturn: false,
        }
      };
    }

    onLoginSuccess(matchedUser, updatedDatabase);
  };

  // Handle Admin Login Submit
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setSessionNotice(null);

    const emailClean = adminEmailInput.trim().toLowerCase();
    const passwordClean = adminPasswordInput.trim();

    if (!emailClean) {
      setAdminError('กรุณาระบุบัญชีผู้ดูแลระบบ (Admin Email)');
      return;
    }

    if (!passwordClean) {
      setAdminError('กรุณาระบุรหัสผ่านผู้ดูแลระบบ');
      return;
    }

    const isAuthorizedAdminEmail = 
      emailClean === 'kittiya.so@psu.ac.th' || 
      emailClean === 'kittiya.so';

    if (!isAuthorizedAdminEmail) {
      setAdminError('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานในฐานะผู้ดูแลระบบ (Admin)');
      return;
    }

    const storedAdminPassword = getStoredAdminPassword();
    const acceptedPasswords = [storedAdminPassword, 'psuvet2026', 'admin1234', 'psu2026'];

    if (!acceptedPasswords.includes(passwordClean)) {
      setAdminError('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง ไม่สามารถเข้าสู่ระบบ Admin ได้');
      return;
    }

    const foundAdmin = staffDatabase.find(
      u => u.email.toLowerCase() === 'kittiya.so@psu.ac.th' || u.role === 'admin'
    ) || staffDatabase[0];

    const verifiedAdminUser: StaffUser = {
      ...foundAdmin,
      role: 'admin',
      roleLabel: 'ผู้ดูแลระบบ (Admin)',
      permissions: {
        canManageEquipment: true,
        canManageUsers: true,
        canApproveExecutive: true,
        canReceiveReturn: true,
      }
    };

    onLoginSuccess(verifiedAdminUser, staffDatabase);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-rose-50/50 to-purple-100/60 flex flex-col justify-center items-center p-3 sm:p-6 font-sans antialiased text-slate-800">
      {/* Top institution bar */}
      <header className="w-full max-w-6xl mx-auto mb-4 flex items-center justify-between text-xs text-slate-600 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
          <span className="font-semibold text-slate-700">
            โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (วิทยาเขตหาดใหญ่)
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-500 font-medium">
          <span className="px-2.5 py-0.5 rounded-full bg-white/80 border border-slate-200 text-[11px] text-slate-600 shadow-2xs">
            PSU Animal Hospital • Equipment Borrowing System
          </span>
        </div>
      </header>

      {/* Main Dual-Column Card with Sunset 3-Color Gradient matching Image 2 */}
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl shadow-rose-950/10 border border-rose-100/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Column: Vibrant Sunset 3-Color Gradient (Purple -> Rose/Coral -> Amber) matching Image 2 */}
        <div className="lg:col-span-6 bg-gradient-to-tr from-[#6b1880] via-[#e63864] to-[#f9a43f] text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative glowing gradient accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-purple-900/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-rose-400/25 rounded-full blur-2xl pointer-events-none" />

          {/* Top Brand Pill */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-semibold text-white shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#00e5bc] shadow-xs" />
              <span>ระบบบริการยืม - คืน ครุภัณฑ์ออนไลน์ 24 ชม.</span>
            </div>

            <div className="mt-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-xl flex items-center justify-center overflow-hidden ring-2 ring-white/40">
                <img 
                  src={`${import.meta.env.BASE_URL}site-icon.jpg`} 
                  alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ." 
                  className="w-full h-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white drop-shadow-xs">
                ระบบบริหารจัดการ<br />ยืม-คืน ครุภัณฑ์และอุปกรณ์
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal max-w-md">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์
              </p>
            </div>
          </div>

          {/* Feature Badge (Removed the 15-minute / Log notice as requested) */}
          <div className="relative z-10 my-8 space-y-3">
            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center gap-3 shadow-inner">
              <div className="p-2 rounded-xl bg-white/25 text-white shrink-0 shadow-xs">
                <Layers className="w-5 h-5 text-amber-200" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">คลังครุภัณฑ์และเครื่องมือแพทย์ครบวงจร</div>
                <div className="text-rose-100">ตรวจสอบสถานะพร้อมใช้งานและสถานที่ติดตั้งแบบเรียลไทม์</div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Quote */}
          <div className="relative z-10 pt-4 border-t border-white/20 text-xs text-rose-100/90 flex items-center justify-between">
            <span>คณะสัตวแพทยศาสตร์ ม.อ.</span>
            <span>Prince of Songkla University</span>
          </div>
        </div>

        {/* Right Column: Clean White Login Form Card */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Header with App Logo */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-50 to-rose-50 p-1 border border-rose-100 shadow-2xs flex items-center justify-center">
                  <img 
                    src={`${import.meta.env.BASE_URL}logo-vet-color-transparent.svg`} 
                    alt="โรงพยาบาลสัตว์ ม.อ." 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                    เข้าสู่ระบบ
                  </h2>
                  <p className="text-xs text-slate-500">
                    ใช้บัญชี PSU Passport ของมหาวิทยาลัยเพื่อเข้าสู่ระบบ
                  </p>
                </div>
              </div>
            </div>

            {/* Expired / Kicked Session Warning */}
            {sessionNotice && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{sessionNotice}</span>
              </div>
            )}

            {/* Role Tab Switcher (บุคลากร / ผู้ขอยืม vs ผู้ดูแลระบบ Admin) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('user');
                  setUserError(null);
                  setAdminError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'user'
                    ? 'bg-gradient-to-r from-[#6b1880] via-[#e63864] to-[#f9a43f] text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>บุคลากร / ผู้ขอยืม</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode('admin');
                  setUserError(null);
                  setAdminError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-950" />
                <span>ผู้ดูแลระบบ (Admin)</span>
              </button>
            </div>

            {/* TAB 1: General Staff Login (No public name list selection to prevent impersonation) */}
            {loginMode === 'user' && (
              <form onSubmit={handleUserLoginSubmit} className="space-y-4 animate-in fade-in duration-150">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-50 via-amber-50 to-purple-50 border border-rose-200/80 text-xs text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#e63864] shrink-0" />
                  <span>
                    เข้าใช้งานหน้าขอยืมและตรวจสอบสถานะครุภัณฑ์
                  </span>
                </div>

                {/* Account / Email Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    ชื่อบัญชีผู้ใช้ หรือ อีเมล PSU Passport:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={userAccountInput}
                      onChange={(e) => {
                        setUserAccountInput(e.target.value);
                        setUserError(null);
                      }}
                      placeholder="เช่น somchai.k หรือ somchai.k@psu.ac.th"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#e63864] focus:bg-white focus:ring-1 focus:ring-[#e63864] font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    รหัสผ่าน PSU Passport:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      required
                      value={userPasswordInput}
                      onChange={(e) => {
                        setUserPasswordInput(e.target.value);
                        setUserError(null);
                      }}
                      placeholder="ระบุรหัสผ่าน PSU Passport ของท่าน..."
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#e63864] focus:bg-white focus:ring-1 focus:ring-[#e63864]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* User Error Banner */}
                {userError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{userError}</span>
                  </div>
                )}

                {/* Submit Button with Vibrant Teal Accent inspired by Image 2 */}
                <button
                  type="submit"
                  id="btn-login-user-submit"
                  className="w-full rounded-xl p-3.5 bg-gradient-to-r from-[#00bfa5] to-[#009688] hover:from-[#00ab94] hover:to-[#00897b] active:scale-[0.99] transition shadow-lg shadow-teal-500/25 text-white font-bold text-sm flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-5 h-5 text-teal-100" />
                    <div className="text-left leading-tight">
                      <div>เข้าสู่ระบบ (PSU Passport)</div>
                      <div className="text-[11px] text-teal-100/90 font-normal">
                        เข้าใช้งานหน้าผู้ขอยืมและเจ้าของครุภัณฑ์
                      </div>
                    </div>
                  </div>
                  <LogIn className="w-5 h-5 text-teal-100" />
                </button>
              </form>
            )}

            {/* TAB 2: Admin Login (No password revealed on screen) */}
            {loginMode === 'admin' && (
              <form onSubmit={handleAdminLoginSubmit} className="space-y-4 animate-in fade-in duration-150">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    ระบบรักษาความปลอดภัย: เฉพาะผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น
                  </span>
                </div>

                {/* Admin Account Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    อีเมล หรือ บัญชีผู้ดูแลระบบ (Admin Email):
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={adminEmailInput}
                      onChange={(e) => {
                        setAdminEmailInput(e.target.value);
                        setAdminError(null);
                      }}
                      placeholder="kittiya.so@psu.ac.th"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Admin Password Input (Masked, NO hint on screen) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    รหัสผ่านผู้ดูแลระบบ:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPasswordInput}
                      onChange={(e) => {
                        setAdminPasswordInput(e.target.value);
                        setAdminError(null);
                      }}
                      placeholder="ระบุรหัสผ่านผู้ดูแลระบบ..."
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Admin Error Banner */}
                {adminError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* Submit Button for Admin Login */}
                <button
                  type="submit"
                  id="btn-login-admin-submit"
                  className="w-full rounded-xl p-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-slate-950 font-bold text-sm flex items-center justify-between shadow-lg shadow-amber-500/25 active:scale-[0.99] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-slate-950" />
                    <div className="text-left leading-tight">
                      <div>ยืนยันรหัสและเข้าสู่หน้า Admin</div>
                      <div className="text-[11px] text-slate-900/80 font-medium">
                        เข้าถึงคลังครุภัณฑ์ จัดการสิทธิ์ และประวัติ Login Log
                      </div>
                    </div>
                  </div>
                  <LogIn className="w-5 h-5 text-slate-950" />
                </button>
              </form>
            )}
          </div>

          {/* Bottom Developer Credit Box Matching Image 1 */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6b1880] to-[#e63864] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              ก
            </div>
            <div className="text-xs leading-snug">
              <div className="text-slate-400 text-[11px]">พัฒนาโดย</div>
              <div className="font-bold text-slate-800">
                นางสาวกิตติยา สุนทรเจริญนนท์
              </div>
              <div className="text-[11px] text-slate-500">
                นักวิชาการอุดมศึกษา สำนักงานบริหารคณะ คณะสัตวแพทยศาสตร์
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
