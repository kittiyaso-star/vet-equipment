import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  PlusCircle, 
  FileText, 
  RotateCcw, 
  History, 
  FileSpreadsheet, 
  Users, 
  ShieldAlert, 
  LogOut, 
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { StaffUser } from '../types';

export type NavViewKey = 
  | 'dashboard'
  | 'inventory'
  | 'requests'
  | 'returns'
  | 'history';

interface SidebarProps {
  currentView: NavViewKey;
  onSelectView: (view: NavViewKey) => void;
  onOpenNewBorrow: () => void;
  onOpenGoogleSheets: () => void;
  onOpenUserManagement: () => void;
  onOpenLoginAudit: () => void;
  pendingRequestsCount: number;
  activeLoansCount: number;
  currentUser: StaffUser;
  currentPortal: 'user' | 'admin';
  onChangePortal: (portal: 'user' | 'admin') => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenNewBorrow,
  onOpenGoogleSheets,
  onOpenUserManagement,
  onOpenLoginAudit,
  pendingRequestsCount,
  activeLoansCount,
  currentUser,
  currentPortal,
  onChangePortal,
  onLogout,
  isOpenMobile,
  onCloseMobile
}) => {
  const isAdmin = currentUser.role === 'admin';

  const menuItems = [
    {
      key: 'dashboard' as NavViewKey,
      label: 'แดชบอร์ด',
      icon: LayoutDashboard,
      badge: null
    },
    {
      key: 'inventory' as NavViewKey,
      label: 'คลังอุปกรณ์',
      icon: Layers,
      badge: null
    },
    {
      key: 'requests' as NavViewKey,
      label: 'คำขอยืม & อนุมัติ',
      icon: FileText,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      key: 'returns' as NavViewKey,
      label: 'รับคืน & ตรวจสภาพ',
      icon: RotateCcw,
      badge: activeLoansCount > 0 ? activeLoansCount : null,
      badgeColor: 'bg-[#0090FF] text-white'
    },
    {
      key: 'history' as NavViewKey,
      label: 'ประวัติทำรายการ',
      icon: History,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Main Light/White Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white text-slate-700 border-r border-slate-200/90 shadow-xs flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section with Official PSU Vet Logo */}
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Official Hospital Logo */}
              <div className="w-11 h-11 rounded-xl bg-purple-50/80 p-1 border border-purple-200/80 shadow-xs flex items-center justify-center shrink-0 ring-2 ring-purple-100/60 overflow-hidden">
                <img 
                  src={`${import.meta.env.BASE_URL}site-icon.jpg`} 
                  alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ." 
                  className="w-full h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-extrabold text-slate-900 text-xs tracking-tight truncate">
                  Online Equipment Borrowing System
                </div>
                <div className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                  ระบบยืม-คืน ครุภัณฑ์ รพ.สัตว์ ม.อ.
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action: ขอยืมอุปกรณ์ Button */}
          <div className="px-3.5 pt-4 pb-2">
            <button
              type="button"
              onClick={() => {
                onOpenNewBorrow();
                if (isOpenMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0090FF] via-[#008EE4] to-[#007473] hover:from-[#008EE4] hover:to-[#0083AF] text-white font-bold text-xs shadow-md shadow-[#0090FF]/25 active:scale-[0.99] transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>+ ขอยืมอุปกรณ์</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectView(item.key);
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#0090FF] text-white shadow-md shadow-[#0090FF]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin Management Group Header */}
            {isAdmin && (
              <div className="pt-4 pb-1">
                <div className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  จัดการระบบ (ADMIN)
                </div>
              </div>
            )}

            {/* Admin Management Links */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenGoogleSheets();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>รายงาน & Google Sheets</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenUserManagement();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-[#9A89FF]" />
                    <span>จัดการผู้ใช้</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenLoginAudit();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-[#F77CF5]" />
                    <span>Log การเข้าใช้ & เซสชัน</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Bottom User Profile Section (Light / Clean Background) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {/* User identity card */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-[#F77CF5] via-[#0090FF] to-[#007473] shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#0090FF]">
                  {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                </div>
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentUser.display_name_th || currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {currentUser.role === 'admin' ? 'ผู้ดูแลระบบสูงสุด (Admin)' : 'บุคลากร / ผู้ใช้งาน'}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Portal Switcher (For Admin users) */}
          {isAdmin && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>โหมดมุมมอง:</span>
              <button
                type="button"
                onClick={() => onChangePortal(currentPortal === 'admin' ? 'user' : 'admin')}
                className="text-xs font-semibold text-[#0090FF] hover:text-[#0083AF] transition cursor-pointer flex items-center gap-1"
              >
                {currentPortal === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0090FF]" />
                    <span>Admin View</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>User View</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Developer Credit footer in sidebar */}
          <div className="mt-2 text-[10px] text-slate-400 leading-tight">
            พัฒนาโดย น.ส.กิตติยา สุนทรเจริญนนท์
          </div>
        </div>
      </aside>
    </>
  );
};
