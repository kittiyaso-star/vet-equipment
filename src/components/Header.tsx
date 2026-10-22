import React from 'react';
import { 
  Bell, 
  PlusCircle, 
  Database, 
  FileSpreadsheet, 
  UserCircle2, 
  ExternalLink, 
  Sparkles,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Layers,
  KeyRound,
  Users,
  ShieldCheck,
  LogOut,
  BookOpen,
  Clock,
  Activity
} from 'lucide-react';
import { StaffUser } from '../types';

interface HeaderProps {
  currentUser: StaffUser;
  staffDatabase: StaffUser[];
  onSelectUser: (user: StaffUser) => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenNewBorrow: () => void;
  onOpenCatalog: () => void;
  onOpenExportImport: () => void;
  onResetData: () => void;
  currentPortal: 'user' | 'admin';
  onChangePortal: (portal: 'user' | 'admin') => void;
  onOpenOidcLogin: () => void;
  onOpenUserManagement: () => void;
  onOpenGoogleSheetsSync?: () => void;
  onOpenLoginAudit?: () => void;
  sessionRemainingMs?: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  staffDatabase,
  onSelectUser,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenNewBorrow,
  onOpenCatalog,
  onOpenExportImport,
  onResetData,
  currentPortal,
  onChangePortal,
  onOpenOidcLogin,
  onOpenUserManagement,
  onOpenGoogleSheetsSync,
  onOpenLoginAudit,
  sessionRemainingMs = 15 * 60 * 1000,
  onLogout
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Format remaining time into mm:ss
  const formatTimer = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = sessionRemainingMs <= 3 * 60 * 1000;

  return (
    <header className="bg-white border-b border-purple-100 sticky top-0 z-30 shadow-xs">
      {/* Top institution banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium tracking-wide">
              โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์ • คณะสัตวแพทยศาสตร์ ม.อ. (PSU Vet Hospital)
            </span>
          </div>
          <div className="flex items-center gap-4 text-purple-200">
            {/* Live 15-Minute Session Timer */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
              isLowTime
                ? 'bg-rose-500/30 text-rose-300 border border-rose-400/50 animate-pulse'
                : 'bg-white/10 text-purple-200 border border-white/20'
            }`} title="เซสชันจะหมดอายุอัตโนมัติภายใน 15 นาทีตามนโยบายความปลอดภัย">
              <Clock className="w-3 h-3 text-amber-300" />
              <span>เซสชันเหลือ: {formatTimer(sessionRemainingMs)} นาที</span>
            </div>
            <span className="text-purple-400/60 hidden sm:inline">|</span>
            <a 
              href="https://kittiyaso-star.github.io/vet-equipment/" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 hover:text-white transition-colors underline-offset-2 hover:underline"
              title="ลิงก์ระบบเดิม"
            >
              <span>ระบบเดิม (GitHub Pages)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-50 p-1 border border-purple-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-purple-100">
            <img 
              src={`${import.meta.env.BASE_URL}site-icon.jpg`} 
              alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ." 
              className="w-full h-full object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                ระบบยืม - คืน ครุภัณฑ์และอุปกรณ์
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                currentPortal === 'admin'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {currentPortal === 'admin' ? '🛡️ หน้า Admin ผู้ดูแลระบบ' : '👤 หน้าบุคลากร / เจ้าของ'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (PSU Animal Hospital)
            </p>
          </div>
        </div>

        {/* Portal Switcher (User vs Admin) */}
        {isAdmin ? (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onChangePortal('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentPortal === 'user'
                  ? 'bg-white text-purple-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ดูมุมมองของผู้ขอยืม / เจ้าของครุภัณฑ์"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>หน้าผู้ขอยืม/เจ้าของ</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePortal('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentPortal === 'admin'
                  ? 'bg-slate-900 text-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="สลับไปยังหน้าผู้ดูแลระบบ Admin"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>หน้าผู้ดูแลระบบ (Admin)</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-800 gap-1.5 self-start md:self-auto shadow-2xs">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>หน้าผู้ขอยืม / เจ้าของครุภัณฑ์</span>
          </div>
        )}

        {/* Action buttons toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Authenticated User Profile Display */}
          <div className="flex items-center bg-purple-50/70 rounded-lg p-1.5 border border-purple-200 text-left shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-purple-300">
              {currentUser.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="ml-2 mr-1">
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                {currentUser.display_name_th || currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-none flex items-center gap-1 mt-0.5">
                <span>{currentUser.roleLabel || (currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน')}</span>
                <span className="text-emerald-600 font-semibold">• ออนไลน์</span>
              </div>
            </div>
          </div>

          {/* Login Audit Logs button - ONLY FOR VERIFIED ADMIN */}
          {isAdmin && currentPortal === 'admin' && onOpenLoginAudit && (
            <button
              onClick={onOpenLoginAudit}
              id="btn-login-audit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition shadow-2xs cursor-pointer"
              title="ตรวจสอบประวัติการ Login และจัดการเซสชัน (Login Audit Logs & Kick Users)"
            >
              <Activity className="w-3.5 h-3.5 text-purple-700" />
              <span>Log การเข้าใช้</span>
            </button>
          )}

          {/* User & Role Management button - ONLY FOR VERIFIED ADMIN */}
          {isAdmin && currentPortal === 'admin' && (
            <button
              onClick={onOpenUserManagement}
              id="btn-user-management"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="จัดการสิทธิ์ผู้ใช้งาน (User & Role Management - เฉพาะผู้ดูแลระบบ)"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>จัดการสิทธิ์</span>
            </button>
          )}

          {/* Catalog view button - ONLY IN ADMIN PORTAL FOR VERIFIED ADMIN */}
          {isAdmin && currentPortal === 'admin' && (
            <button
              onClick={onOpenCatalog}
              id="btn-open-catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="คลังครุภัณฑ์และอุปกรณ์ รพ.สัตว์ ม.อ. (จัดการและตรวจสอบข้อมูลครุภัณฑ์)"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>คลังครุภัณฑ์</span>
            </button>
          )}

          {/* Google Sheets Sync Button - ONLY IN ADMIN PORTAL FOR VERIFIED ADMIN */}
          {isAdmin && currentPortal === 'admin' && onOpenGoogleSheetsSync && (
            <button
              onClick={onOpenGoogleSheetsSync}
              id="btn-open-google-sheets"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs cursor-pointer"
              title="เชื่อมต่อและส่งข้อมูลไปยัง Google Sheets ฐานข้อมูลยืม-คืน รพ.สัตว์ ม.อ. (เฉพาะ Admin)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Google Sheets</span>
            </button>
          )}

          {/* Export / Import CSV - ONLY FOR VERIFIED ADMIN */}
          {isAdmin && currentPortal === 'admin' && (
            <button
              onClick={onOpenExportImport}
              id="btn-open-export"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="นำเข้า/ส่งออกฐานข้อมูล CSV (เฉพาะ Admin)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}

          {/* Notifications button */}
          <button
            onClick={onOpenNotifications}
            id="btn-open-notifications"
            className="relative p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="ระบบแจ้งเตือนกำหนดส่งคืน"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-bounce">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Primary Create Request button */}
          <button
            onClick={onOpenNewBorrow}
            id="btn-create-request"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 rounded-lg shadow-sm shadow-purple-600/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ยื่นขอยืมครุภัณฑ์</span>
          </button>

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            id="btn-logout"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
};

