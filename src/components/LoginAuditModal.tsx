import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  Users, 
  LogOut, 
  Search, 
  Filter, 
  RefreshCw, 
  Laptop, 
  Smartphone, 
  Tablet, 
  AlertTriangle, 
  CheckCircle2, 
  Ban, 
  ShieldCheck,
  Calendar,
  Activity,
  UserX
} from 'lucide-react';
import { LoginLog } from '../types';

interface LoginAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LoginLog[];
  currentAdminEmail: string;
  onRevokeSession: (sessionId: string) => void;
  onRevokeUserAllSessions: (userEmail: string) => void;
  onRevokeAllExceptCurrentAdmin: () => void;
  onRefreshLogs: () => void;
}

export const LoginAuditModal: React.FC<LoginAuditModalProps> = ({
  isOpen,
  onClose,
  logs,
  currentAdminEmail,
  onRevokeSession,
  onRevokeUserAllSessions,
  onRevokeAllExceptCurrentAdmin,
  onRefreshLogs
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const activeSessions = useMemo(() => {
    return logs.filter(l => l.status === 'active');
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (activeTab === 'active' && l.status !== 'active') return false;
      if (roleFilter !== 'all' && l.role !== roleFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      return (
        l.userName.toLowerCase().includes(q) ||
        l.userEmail.toLowerCase().includes(q) ||
        l.ipAddress.toLowerCase().includes(q) ||
        l.userAgent.toLowerCase().includes(q) ||
        l.sessionId.toLowerCase().includes(q)
      );
    });
  }, [logs, activeTab, roleFilter, searchTerm]);

  if (!isOpen) return null;

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleKickSession = (sessionId: string, userName: string) => {
    if (confirm(`ยืนยันการเตะผู้ใช้งาน "${userName}" ออกจากระบบทันทีหรือไม่?`)) {
      onRevokeSession(sessionId);
      triggerNotice(`บังคับออกจากระบบสำหรับเซสชัน ${sessionId} สำเร็จแล้ว`);
    }
  };

  const handleKickAllUsers = () => {
    if (confirm('ยืนยันการสั่งเตะผู้ใช้งานทั้งหมด (ยกเว้น Admin ปัจจุบัน) ออกจากระบบทันทีหรือไม่?')) {
      onRevokeAllExceptCurrentAdmin();
      triggerNotice('บังคับผู้ใช้งานทั้งหมดออกจากระบบเรียบร้อยแล้ว');
    }
  };

  const formatRemainingTime = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'หมดเวลาแล้ว';
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins} นาที ${secs} วินาที`;
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone className="w-3.5 h-3.5 text-slate-500" />;
    if (type === 'Tablet') return <Tablet className="w-3.5 h-3.5 text-slate-500" />;
    return <Laptop className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>บันทึกประวัติการเข้าใช้งานและเซสชัน (Login Audit Logs)</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ออนไลน์ {activeSessions.length} เซสชัน</span>
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ตรวจสอบเวลาเข้าใช้, IP, อุปกรณ์, ควบคุมสิทธิ์การใช้งานไม่เกิน 15 นาที และสั่ง Force Logout ผู้ใช้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshLogs}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="รีเฟรชข้อมูล Log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-200 hover:text-white">✕</button>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">เซสชันที่ออนไลน์อยู่ขณะนี้</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <span>{activeSessions.length}</span>
                <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">อายุเซสชันการใช้งาน</div>
              <div className="text-lg font-bold text-indigo-700 mt-0.5">
                ไม่เกิน 15 นาที
              </div>
              <div className="text-[11px] text-slate-400">ครบกำหนดจะดีด Logout อัตโนมัติ</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">การจัดการความปลอดภัย</div>
              <button
                type="button"
                onClick={handleKickAllUsers}
                disabled={activeSessions.length <= 1}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="บังคับผู้ใช้งานทั้งหมดออกจากระบบทันที"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>เตะผู้ใช้อื่นออกทั้งหมด</span>
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-6 pt-3 pb-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>กำลังออนไลน์ ({activeSessions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ประวัติทั้งหมด ({logs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ, อีเมล, IP, อุปกรณ์..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500 focus:bg-white"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">ทุกสิทธิ์</option>
              <option value="user">บุคลากร (User)</option>
              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">วัน-เวลาเข้าสู่ระบบ</th>
                  <th className="py-3 px-4">ผู้ใช้งาน / บัญชี</th>
                  <th className="py-3 px-4">สิทธิ์การใช้งาน</th>
                  <th className="py-3 px-4">IP Address / อุปกรณ์</th>
                  <th className="py-3 px-4">สถานะเซสชัน</th>
                  <th className="py-3 px-4">เวลาคงเหลือ (จาก 15 นาที)</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isCurrentAdminSession = log.userEmail.toLowerCase() === currentAdminEmail.toLowerCase() && log.status === 'active';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {new Date(log.loginAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(log.loginAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{log.userName}</span>
                          {isCurrentAdminSession && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">
                              เซสชันของคุณ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{log.userEmail}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.role === 'admin'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {log.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-800 font-medium">
                          {getDeviceIcon(log.deviceType)}
                          <span>{log.ipAddress}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={log.userAgent}>
                          {log.userAgent}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {log.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>ออนไลน์ (Active)</span>
                          </span>
                        ) : log.status === 'revoked_by_admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300" title={log.logoutReason}>
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>ถูกแอดมินเตะออก</span>
                          </span>
                        ) : log.status === 'expired' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>หมดเวลา 15 นาที</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <LogOut className="w-3 h-3 text-slate-500" />
                            <span>ออกจากระบบแล้ว</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {log.status === 'active' ? (
                          <div className="font-semibold text-purple-700 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" />
                            <span>{formatRemainingTime(log.expiresAt)}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {log.logoutReason || 'สิ้นสุดเซสชัน'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {log.status === 'active' && !isCurrentAdminSession ? (
                          <button
                            type="button"
                            onClick={() => handleKickSession(log.sessionId, log.userName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                            title="บังคับผู้ใช้นี้ออกจากระบบทันที"
                          >
                            <Ban className="w-3 h-3" />
                            <span>เตะออก</span>
                          </button>
                        ) : isCurrentAdminSession ? (
                          <span className="text-[11px] text-slate-400">เครื่องนี้</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบประวัติการเข้าใช้งานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            ระบบควบคุมเซสชันอัตโนมัติ 15 นาทีตามนโยบายความปลอดภัย • บันทึกทุกการเข้าใช้ใน Local/Cloud
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
