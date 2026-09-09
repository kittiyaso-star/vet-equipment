import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PackageCheck, 
  ShieldAlert
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
  
  // Pending approval
  const pendingRequests = requests.filter(r => r.status === 'ยื่นขออนุมัติ').length;
  
  // Currently borrowed / approved
  const activeLoans = requests.filter(r => r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน').length;
  
  // Overdue check
  const overdueRequests = requests.filter(r => {
    if (r.status === 'เสร็จสิ้น' || r.status === 'รับคืนเรียบร้อย' || r.status === 'คืนครุภัณฑ์แล้ว' || r.status === 'ยกเลิกคำขอ') {
      return false;
    }
    const due = new Date(r.borrowTo);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < today.getTime();
  }).length;

  // Completed
  const completedRequests = requests.filter(r => r.status === 'เสร็จสิ้น' || r.status === 'รับคืนเรียบร้อย' || r.status === 'คืนครุภัณฑ์แล้ว').length;

  // Equipment availability
  const availableEquipment = equipment.filter(e => e.status === 'พร้อมใช้งาน').length;
  const totalEquipment = equipment.length;

  const stats = [
    {
      id: 'stat-all',
      filterValue: 'ALL',
      label: 'รายการคำขอทั้งหมด',
      value: totalRequests,
      sublabel: 'ทุกสถานะในระบบ',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50/70',
      border: 'border-blue-200'
    },
    {
      id: 'stat-pending',
      filterValue: 'ยื่นขออนุมัติ',
      label: 'รอเจ้าของอนุมัติ',
      value: pendingRequests,
      sublabel: 'คำขอใหม่รอพิจารณา',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200'
    },
    {
      id: 'stat-active',
      filterValue: 'ACTIVE_LOAN',
      label: 'กำลังยืมใช้งาน',
      value: activeLoans,
      sublabel: 'อยู่ระหว่างการใช้งาน',
      icon: PackageCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/70',
      border: 'border-indigo-200'
    },
    {
      id: 'stat-overdue',
      filterValue: 'OVERDUE',
      label: 'เกินกำหนดส่งคืน',
      value: overdueRequests,
      sublabel: 'ต้องติดตามเร่งด่วน',
      icon: ShieldAlert,
      color: 'text-red-600',
      bg: overdueRequests > 0 ? 'bg-red-50' : 'bg-slate-50',
      border: overdueRequests > 0 ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200',
      isAlert: overdueRequests > 0
    },
    {
      id: 'stat-completed',
      filterValue: 'COMPLETED',
      label: 'คืนเรียบร้อย/เสร็จสิ้น',
      value: completedRequests,
      sublabel: 'ตรวจรับคืนแล้ว',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeFilter === stat.filterValue;

        return (
          <button
            key={stat.id}
            id={stat.id}
            onClick={() => onFilterChange(stat.filterValue)}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${stat.bg} ${stat.border} ${
              isActive ? 'ring-2 ring-blue-600 shadow-sm scale-[1.02]' : 'hover:shadow-xs hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">{stat.label}</span>
              <div className={`p-1.5 rounded-lg bg-white shadow-2xs ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold tracking-tight ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-xs text-slate-500">รายการ</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 truncate">
              {stat.sublabel}
            </p>
          </button>
        );
      })}
    </div>
  );
};
