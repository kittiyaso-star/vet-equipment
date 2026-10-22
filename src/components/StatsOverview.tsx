import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PackageCheck, 
  ShieldAlert,
  Layers,
  Sparkles
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster } from '../types';

interface StatsOverviewProps {
  requests: BorrowRequest[];
  equipment: EquipmentMaster[];
  activeFilter: string;
  onFilterChange: (status: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  requests,
  equipment,
  activeFilter,
  onFilterChange
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'ยื่นขออนุมัติ').length;
  const activeLoans = requests.filter(r => r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน').length;
  
  const overdueRequests = requests.filter(r => {
    if (r.status === 'เสร็จสิ้น' || r.status === 'รับคืนเรียบร้อย' || r.status === 'คืนครุภัณฑ์แล้ว' || r.status === 'ยกเลิกคำขอ') {
      return false;
    }
    const due = new Date(r.borrowTo);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < today.getTime();
  }).length;

  const completedRequests = requests.filter(r => 
    r.status === 'เสร็จสิ้น' || r.status === 'รับคืนเรียบร้อย' || r.status === 'คืนครุภัณฑ์แล้ว'
  ).length;

  const stats = [
    {
      id: 'stat-all',
      filterValue: 'ALL',
      title: 'คำขอยืมทั้งหมด',
      count: totalRequests,
      desc: 'ทุกสถานะในระบบ',
      badge: `${totalRequests} รายการ`,
      gradient: 'from-purple-600 to-indigo-600',
      lightBg: 'bg-purple-50/60',
      borderColor: 'border-purple-200',
      activeRing: 'ring-purple-600',
      textColor: 'text-purple-700',
      icon: FileText
    },
    {
      id: 'stat-pending',
      filterValue: 'ยื่นขออนุมัติ',
      title: 'รอเจ้าของอนุมัติ',
      count: pendingRequests,
      desc: 'คำขอใหม่รอพิจารณา',
      badge: `${pendingRequests} รายการ`,
      gradient: 'from-sky-500 to-blue-600',
      lightBg: 'bg-sky-50/60',
      borderColor: 'border-sky-200',
      activeRing: 'ring-sky-600',
      textColor: 'text-sky-700',
      icon: Clock
    },
    {
      id: 'stat-active',
      filterValue: 'ACTIVE_LOAN',
      title: 'กำลังยืมใช้งาน',
      count: activeLoans,
      desc: 'อยู่ระหว่างการใช้งาน',
      badge: `${activeLoans} รายการ`,
      gradient: 'from-amber-500 to-orange-500',
      lightBg: 'bg-amber-50/60',
      borderColor: 'border-amber-200',
      activeRing: 'ring-amber-600',
      textColor: 'text-amber-700',
      icon: PackageCheck
    },
    {
      id: 'stat-overdue',
      filterValue: 'OVERDUE',
      title: 'เกินกำหนดส่งคืน',
      count: overdueRequests,
      desc: overdueRequests > 0 ? 'เกินกำหนดเร่งติดตาม' : 'ไม่มีรายการค้างคืน',
      badge: `${overdueRequests} รายการ`,
      gradient: 'from-rose-500 to-pink-600',
      lightBg: overdueRequests > 0 ? 'bg-rose-50/80 animate-pulse' : 'bg-rose-50/50',
      borderColor: overdueRequests > 0 ? 'border-rose-400' : 'border-rose-200',
      activeRing: 'ring-rose-600',
      textColor: 'text-rose-700',
      icon: ShieldAlert
    },
    {
      id: 'stat-completed',
      filterValue: 'COMPLETED',
      title: 'ส่งคืนเรียบร้อย',
      count: completedRequests,
      desc: 'ตรวจรับคืนสมบูรณ์',
      badge: `${completedRequests} รายการ`,
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50/60',
      borderColor: 'border-emerald-200',
      activeRing: 'ring-emerald-600',
      textColor: 'text-emerald-700',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {stats.map((item) => {
        const Icon = item.icon;
        const isActive = activeFilter === item.filterValue;

        return (
          <button
            key={item.id}
            id={item.id}
            type="button"
            onClick={() => onFilterChange(item.filterValue)}
            className={`rounded-2xl border text-left transition-all duration-200 cursor-pointer overflow-hidden shadow-2xs hover:shadow-md ${item.borderColor} ${
              isActive 
                ? `ring-3 ${item.activeRing} shadow-md scale-[1.02] bg-white` 
                : 'bg-white hover:border-slate-300'
            }`}
          >
            {/* Vibrant colorful header strip matching Image 3 */}
            <div className={`p-3 bg-gradient-to-r ${item.gradient} text-white flex items-center justify-between`}>
              <span className="text-xs font-bold truncate tracking-wide">{item.title}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 backdrop-blur-xs border border-white/25">
                {item.badge}
              </span>
            </div>

            {/* Card Content */}
            <div className={`p-3.5 ${item.lightBg} flex items-center justify-between gap-2`}>
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {item.count}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium truncate">
                  {item.desc}
                </div>
              </div>
              <div className={`w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-100 flex items-center justify-center shrink-0 ${item.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
