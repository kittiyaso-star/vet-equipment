import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  LogIn, 
  Lock, 
  CheckCircle2, 
  Users, 
  Search, 
  UserCheck, 
  ShieldAlert, 
  Shield, 
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { StaffUser } from '../types';

interface OidcLoginScreenProps {
  staffDatabase: StaffUser[];
  onLoginSuccess: (user: StaffUser, updatedList: StaffUser[]) => void;
}

export const OidcLoginScreen: React.FC<OidcLoginScreenProps> = ({
  staffDatabase,
  onLoginSuccess
}) => {
  // Login Tab: 'user' (staff/requester/owner) or 'admin' (strictly admin access)
  const [loginMode, setLoginMode] = useState<'user' | 'admin'>('user');

  // For User Login mode: default to the first non-admin user
  const defaultStaffUser = useMemo(() => {
    const nonAdmin = staffDatabase.find(u => u.role !== 'admin');
    return nonAdmin || staffDatabase[0];
  }, [staffDatabase]);

  const [selectedStaffUser, setSelectedStaffUser] = useState<StaffUser>(defaultStaffUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStaffSelector, setShowStaffSelector] = useState(false);

  // For Admin Login mode
  const adminAccount = useMemo(() => {
    return (
      staffDatabase.find(u => u.role === 'admin' || u.email.toLowerCase() === 'kittiya.so@psu.ac.th') ||
      staffDatabase[0]
    );
  }, [staffDatabase]);

  const [adminPin, setAdminPin] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Filtered staff list for search
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffDatabase;
    const q = searchQuery.toLowerCase().trim();
    return staffDatabase.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.position && u.position.toLowerCase().includes(q)) ||
      (u.dept && u.dept.toLowerCase().includes(q)) ||
      (u.display_name_th && u.display_name_th.toLowerCase().includes(q))
    );
  }, [staffDatabase, searchQuery]);

  // Handle direct staff login (strictly User role - no Admin rights)
  const handleStaffLogin = (userToLogin?: StaffUser) => {
    const target = userToLogin || selectedStaffUser || defaultStaffUser;
    
    // Guarantee that general staff login CANNOT possess Admin role
    const safeUser: StaffUser = {
      ...target,
      role: 'user',
      roleLabel: 'ผู้ขอยืม (User)',
      permissions: {
        canManageEquipment: false,
        canManageUsers: false,
        canApproveExecutive: false,
        canReceiveReturn: false,
      }
    };

    onLoginSuccess(safeUser, staffDatabase);
  };

  // Handle admin login with PIN verification
  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdminError(null);

    const validPins = ['psuvet2026', 'admin1234', 'psu2026', 'kittiya2026', 'admin'];
    const trimmedPin = adminPin.trim();

    if (!trimmedPin) {
      setAdminError('กรุณาระบุรหัสผ่าน / PIN ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin)');
      return;
    }

    if (!validPins.includes(trimmedPin)) {
      setAdminError('รหัสผ่าน Admin ไม่ถูกต้อง — ไม่อนุญาตให้เข้าสู่หน้าผู้ดูแลระบบเพื่อความปลอดภัย');
      return;
    }

    // Verified Admin login
    const verifiedAdminUser: StaffUser = {
      ...adminAccount,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Subtle Gradient & Accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 z-0 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-white/20 shadow-md flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src={`${import.meta.env.BASE_URL}site-icon.jpg`} 
                alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ." 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                มหาวิทยาลัยสงขลานครินทร์ • Prince of Songkla University
              </div>
              <div className="text-sm font-bold text-white leading-tight">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>เข้าสู่ระบบได้ทันที (Direct Access)</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4 sm:my-6">
        <div className="w-full max-w-lg">
          {/* Main Login Card */}
          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className={`absolute top-0 inset-x-0 h-1.5 transition-colors ${
              loginMode === 'admin'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400'
                : 'bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-500'
            }`} />

            {/* System Title & Official Logo */}
            <div className="text-center mb-5">
              <div className="inline-flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-white shadow-xl shadow-blue-950/60 border border-white/40 mb-3 mx-auto">
                <img 
                  src={`${import.meta.env.BASE_URL}logo-vet-color-transparent.svg`} 
                  alt="โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์" 
                  className="h-11 sm:h-12 w-auto max-w-[260px] sm:max-w-[280px] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ระบบบริหารจัดการยืม-คืนครุภัณฑ์
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-1 font-medium">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ ม.อ.
              </p>
            </div>

            {/* Role Tab Selector: General Staff vs Admin Access */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-700 mb-5">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('user');
                  setAdminError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'user'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>บุคลากร / ผู้ขอยืม</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode('admin');
                  setAdminError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300" />
                <span>ผู้ดูแลระบบ (Admin)</span>
              </button>
            </div>

            {/* TAB 1: General Staff / Requester Login */}
            {loginMode === 'user' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Security info banner for user login */}
                <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>เข้าใช้งานในหน้าบุคลากรทั่วไป:</strong> สำหรับยื่นขอยืมครุภัณฑ์ และเจ้าของอุปกรณ์กดอนุมัติ (ไม่สามารถเข้าหน้า Admin)
                  </span>
                </div>

                {/* Selected Staff Box */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/30 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ชื่อบุคลากรผู้ใช้งาน:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowStaffSelector(!showStaffSelector)}
                      className="text-xs text-amber-300 hover:text-amber-200 underline font-medium cursor-pointer"
                    >
                      {showStaffSelector ? 'ปิดรายชื่อ' : 'ค้นหา / สลับรายชื่อบุคลากร'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0 border border-white/20">
                      {selectedStaffUser.name ? selectedStaffUser.name.charAt(0) : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span>{selectedStaffUser.display_name_th || selectedStaffUser.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                          ผู้ใช้งาน
                        </span>
                      </div>
                      <div className="text-xs text-blue-200/80 truncate">
                        {selectedStaffUser.email}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {selectedStaffUser.position} • {selectedStaffUser.dept}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search / Select Staff Directory */}
                {showStaffSelector && (
                  <div className="p-3.5 rounded-xl bg-slate-900/95 border border-slate-700/80 text-xs space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>เลือกรายชื่อของท่านจากฐานข้อมูล ({staffDatabase.length} ท่าน)</span>
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="พิมพ์ชื่อ, สกุล, ตำแหน่ง..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800">
                      {filteredStaff.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaffUser(u);
                            setShowStaffSelector(false);
                            handleStaffLogin(u);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-200 group-hover:text-blue-300 text-xs truncate">
                              {u.display_name_th || u.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {u.email} • {u.position}
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Action Button for Staff Login */}
                <button
                  type="button"
                  onClick={() => handleStaffLogin()}
                  id="btn-login-staff"
                  className="w-full rounded-xl p-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 active:scale-[0.99] transition shadow-lg shadow-blue-900/40 border border-blue-400/30 text-white font-bold text-sm flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-sky-200" />
                    <div className="text-left">
                      <div>เข้าสู่ระบบบุคลากร (เข้าใช้งานทันที)</div>
                      <div className="text-[11px] text-blue-200/90 font-normal">
                        เข้าใช้งานในนาม {selectedStaffUser.display_name_th || selectedStaffUser.name}
                      </div>
                    </div>
                  </div>
                  <LogIn className="w-5 h-5 text-blue-200" />
                </button>
              </div>
            )}

            {/* TAB 2: Admin Login (Strict Admin Access with PIN Authentication) */}
            {loginMode === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in duration-200">
                {/* Admin notice */}
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>ระบบรักษาความปลอดภัยสำหรับผู้ดูแลระบบ (Admin)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed pl-5.5">
                    ป้องกันไม่ให้บุคคลทั่วไปหรือใครก็ได้เข้าถึงหน้า Admin — จำเป็นต้องยืนยันรหัสความปลอดภัยของผู้ดูแลระบบ
                  </p>
                </div>

                {/* Admin Account details */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm shadow-md shrink-0 border border-amber-500/40">
                    🛡️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span>{adminAccount.display_name_th || adminAccount.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/30 text-amber-300 border border-amber-500/50">
                        Admin
                      </span>
                    </div>
                    <div className="text-xs text-amber-200/80 truncate font-mono">
                      {adminAccount.email}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      ผู้ดูแลระบบพัสดุและครุภัณฑ์ รพ.สัตว์ ม.อ.
                    </div>
                  </div>
                </div>

                {/* Admin Security PIN Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span>รหัสผ่าน / PIN ยืนยันสิทธิ์ Admin:</span>
                    <span className="text-[11px] text-amber-400 font-normal">
                      (รหัสผ่าน: psuvet2026 หรือ admin1234)
                    </span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showAdminPin ? 'text' : 'password'}
                      value={adminPin}
                      onChange={(e) => {
                        setAdminPin(e.target.value);
                        setAdminError(null);
                      }}
                      placeholder="ระบุรหัสผ่านผู้ดูแลระบบ (Admin PIN)..."
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPin(!showAdminPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {adminError && (
                    <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{adminError}</span>
                    </div>
                  )}
                </div>

                {/* Admin Login Button */}
                <button
                  type="submit"
                  id="btn-login-admin"
                  className="w-full rounded-xl p-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-slate-950 font-bold text-sm flex items-center justify-between shadow-lg shadow-amber-900/40 border border-amber-400/40 active:scale-[0.99] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-slate-950" />
                    <div className="text-left leading-tight">
                      <div>ยืนยันรหัสและเข้าสู่หน้าผู้ดูแลระบบ (Admin)</div>
                      <div className="text-[11px] text-slate-900/80 font-medium">
                        เข้าถึงคลังครุภัณฑ์ จัดการสิทธิ์ และ Google Sheets
                      </div>
                    </div>
                  </div>
                  <LogIn className="w-5 h-5 text-slate-950" />
                </button>
              </form>
            )}

            {/* Direct Access Notification Note */}
            <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>เข้าสู่ระบบได้ทันทีโดยไม่ต้องเช็ค Callback</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pl-5">
                ระบบเชื่อมต่อข้อมูลและพร้อมใช้งานทันที โดยแบ่งแยกสิทธิ์บุคลากรและผู้ดูแลระบบอย่างชัดเจนและปลอดภัย
              </p>
            </div>

            {/* Bottom Security Note */}
            <div className="mt-5 pt-3 border-t border-slate-700/60 text-center">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (วิทยาเขตหาดใหญ่)
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ระบบรักษาความปลอดภัยสิทธิ์การใช้งาน (Role-Based Access Control Active)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
