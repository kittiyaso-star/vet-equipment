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
  BookOpen
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
  onLogout
}) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top institution banner */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-white px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium tracking-wide">
              โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์ • คณะสัตวแพทยศาสตร์ ม.อ. (PSU Vet Hospital)
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <a 
              href="https://kittiyaso-star.github.io/vet-equipment/" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition-colors underline-offset-2 hover:underline"
              title="ลิงก์ระบบเดิม"
            >
              <span>ระบบเดิม (GitHub Pages)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-500">|</span>
            <span>ระบบยืม-คืนออนไลน์แบบเรียลไทม์ 24 ชม.</span>
          </div>
        </div>
      </div>

      {/* Main navigation toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-slate-100">
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
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {currentPortal === 'admin' ? '🛡️ หน้า Admin ผู้ดูแลระบบ' : '👤 หน้าบุคลากร / เจ้าของ'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์ (PSU Animal Hospital)
            </p>
          </div>
        </div>

        {/* Portal Switcher (User vs Admin) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onChangePortal('user')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              currentPortal === 'user'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
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
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>หน้าผู้ดูแลระบบ (Admin)</span>
            {!isAdmin && (
              <span className="text-[10px] bg-amber-200/60 text-amber-900 px-1.5 py-0.2 rounded font-normal">
                จำลอง
              </span>
            )}
          </button>
        </div>

        {/* User Role Switcher & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* PSU SSO (OIDC) Status / Login button */}
          <button
            type="button"
            onClick={onOpenOidcLogin}
            id="btn-psu-sso"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200 text-sky-900 hover:border-sky-300 hover:shadow-2xs"
            title="ลงชื่อเข้าใช้งานผ่านระบบ PSU Single Sign-On (OIDC)"
          >
            <KeyRound className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden md:inline">PSU SSO</span>
            {currentUser.authProvider === 'psu_sso' ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>เชื่อมต่อแล้ว</span>
              </span>
            ) : (
              <span className="text-[10px] bg-sky-200/70 text-sky-800 font-bold px-1.5 py-0.2 rounded">
                OIDC
              </span>
            )}
          </button>

          {/* Authenticated OIDC User Profile Display */}
          <button
            type="button"
            onClick={onOpenOidcLogin}
            className="flex items-center bg-slate-50 hover:bg-blue-50/50 rounded-lg p-1.5 border border-slate-200 hover:border-blue-200 transition cursor-pointer text-left shadow-2xs group"
            title="บัญชีผู้ใช้งานที่เข้าสู่ระบบผ่าน PSU SSO (คลิกเพื่อดูข้อมูล Claim OIDC หรือจัดการเซสชัน)"
          >
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
              {currentUser.name.charAt(0)}
            </div>
            <div className="ml-2 mr-1">
              <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-700 truncate max-w-[150px] sm:max-w-[200px]">
                {currentUser.display_name_th || currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-none flex items-center gap-1 mt-0.5">
                <span>{currentUser.roleLabel || currentUser.role}</span>
                <span className="text-emerald-600 font-medium">• OIDC ยืนยันแล้ว</span>
              </div>
            </div>
          </button>

          {/* User & Role Management button - ONLY FOR ADMIN */}
          {currentPortal === 'admin' && (
            <button
              onClick={onOpenUserManagement}
              id="btn-user-management"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="จัดการสิทธิ์ผู้ใช้งาน (User & Role Management)"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>จัดการสิทธิ์</span>
            </button>
          )}

          {/* Catalog view button - ONLY FOR ADMIN */}
          {currentPortal === 'admin' && (
            <button
              onClick={onOpenCatalog}
              id="btn-open-catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="คลังครุภัณฑ์และอุปกรณ์ (เฉพาะผู้ดูแลระบบ)"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>คลังครุภัณฑ์</span>
            </button>
          )}

          {/* Google Sheets Sync Button */}
          {onOpenGoogleSheetsSync && (
            <button
              onClick={onOpenGoogleSheetsSync}
              id="btn-open-google-sheets"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs cursor-pointer"
              title="เชื่อมต่อและส่งข้อมูลไปยัง Google Sheets ฐานข้อมูลยืม-คืน รพ.สัตว์ ม.อ."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Google Sheets</span>
            </button>
          )}

          {/* Export / Import CSV - ONLY FOR ADMIN */}
          {currentPortal === 'admin' && (
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

          {/* User Manual button */}
          <a
            href={`${import.meta.env.BASE_URL}user-manual.html`}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-user-manual"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg transition shadow-2xs cursor-pointer"
            title="เปิดดูคู่มือการใช้งานและผังการทำงาน (PDF / Word)"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline">คู่มือ</span>
            <span>การใช้งาน</span>
          </a>

          {/* Notifications button */}
          <button
            onClick={onOpenNotifications}
            id="btn-open-notifications"
            className="relative p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="ระบบแจ้งเตือนกำหนดส่งคืน"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-bounce">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Primary Create Request button (Always visible in user portal, or admin) */}
          <button
            onClick={onOpenNewBorrow}
            id="btn-create-request"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:scale-98 rounded-lg shadow-sm shadow-blue-700/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ยื่นขอยืมครุภัณฑ์</span>
          </button>

          {/* Reset Demo button (only admin) */}
          {currentPortal === 'admin' && (
            <button
              onClick={onResetData}
              id="btn-reset-demo"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="รีเซ็ตเป็นข้อมูลตัวอย่างเริ่มต้น"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Logout / Exit Session button */}
          <button
            type="button"
            onClick={onLogout}
            id="btn-logout"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
            title="ออกจากระบบ และกลับสู่หน้าลงชื่อเข้าใช้ PSU OIDC"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
