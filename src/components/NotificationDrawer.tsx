import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Clock, 
  Send, 
  CheckCheck, 
  CheckCircle, 
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { SystemNotification, BorrowRequest } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onSelectRequest: (requestId: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectRequest,
  onMarkAllRead
}) => {
  const [sentAlerts, setSentAlerts] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleSendReminder = (notifId: string, email: string, name: string) => {
    setSentAlerts(prev => ({ ...prev, [notifId]: true }));
    // Toast notification simulation
    setTimeout(() => {
      alert(`ส่งข้อความแจ้งเตือนกำหนดส่งคืนครุภัณฑ์ไปยัง ${name} (${email}) เรียบร้อยแล้วผ่านระบบอีเมล ม.อ. และ LINE Notify`);
    }, 100);
  };

  const overdueNotifs = notifications.filter(n => n.type === 'overdue');
  const todayNotifs = notifications.filter(n => n.type === 'due_today');
  const soonNotifs = notifications.filter(n => n.type === 'due_soon');
  const otherNotifs = notifications.filter(n => n.type !== 'overdue' && n.type !== 'due_today' && n.type !== 'due_soon');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ระบบแจ้งเตือนกำหนดส่งคืนครุภัณฑ์
              </h3>
              <p className="text-xs text-slate-500">
                แจ้งเตือนแบบเรียลไทม์ โรงพยาบาลสัตว์ ม.อ.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">ไม่มีการแจ้งเตือนค้างอยู่</p>
              <p className="text-xs text-slate-400 mt-1">
                ไม่มีอุปกรณ์ที่เกินกำหนดหรือใกล้ถึงกำหนดในขณะนี้
              </p>
            </div>
          ) : (
            <>
              {/* Overdue Section */}
              {overdueNotifs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      เกินกำหนดส่งคืน ({overdueNotifs.length})
                    </span>
                  </div>
                  {overdueNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-xl border border-red-200 bg-red-50/70 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-red-900">{n.title}</div>
                        <span className="font-mono text-[11px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-semibold">
                          {n.requestId}
                        </span>
                      </div>
                      <p className="text-red-800 leading-relaxed">{n.message}</p>
                      
                      <div className="pt-2 border-t border-red-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            onSelectRequest(n.requestId);
                            onClose();
                          }}
                          className="text-blue-700 hover:underline font-medium flex items-center gap-1"
                        >
                          <span>ดูคำขอ / ตรวจรับคืน</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleSendReminder(n.id, 'user@psu.ac.th', n.requesterName)}
                          disabled={sentAlerts[n.id]}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                            sentAlerts[n.id]
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                          }`}
                        >
                          {sentAlerts[n.id] ? (
                            <>
                              <CheckCheck className="w-3 h-3" />
                              <span>ส่งเตือนแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>ส่งเตือนผู้ยืม</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Due Today */}
              {todayNotifs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ครบกำหนดส่งคืนวันนี้ ({todayNotifs.length})
                  </span>
                  {todayNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-amber-900">{n.title}</div>
                        <span className="font-mono text-[11px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
                          {n.requestId}
                        </span>
                      </div>
                      <p className="text-amber-800">{n.message}</p>
                      
                      <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            onSelectRequest(n.requestId);
                            onClose();
                          }}
                          className="text-blue-700 hover:underline font-medium flex items-center gap-1"
                        >
                          <span>ตรวจสอบคำขอยืม</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Due Soon */}
              {soonNotifs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ใกล้ถึงกำหนดส่งคืน (1-3 วัน)
                  </span>
                  {soonNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-blue-900">{n.title}</div>
                        <span className="font-mono text-[10px] text-blue-700">
                          {n.requestId}
                        </span>
                      </div>
                      <p className="text-blue-800 text-[11px]">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Other notifications */}
              {otherNotifs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    คำขอใหม่ / อื่นๆ
                  </span>
                  {otherNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5"
                    >
                      <div className="font-semibold text-slate-800">{n.title}</div>
                      <p className="text-slate-600 text-[11px]">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            รวม {notifications.length} การแจ้งเตือน
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
