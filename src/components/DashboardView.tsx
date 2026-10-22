import React, { useMemo } from 'react';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  Calendar, 
  Building2, 
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  BarChart2
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster } from '../types';

interface DashboardViewProps {
  equipment: EquipmentMaster[];
  requests: BorrowRequest[];
  onViewAllRequests: () => void;
  onSelectRequest: (request: BorrowRequest) => void;
  onOpenNewBorrow: () => void;
}

// Color palette directly sampled from Image 2 (Matching Gradient & Generic Gradient)
const PALETTE_COLORS = [
  '#0090FF', // Electric Azure Blue
  '#008EE4', // Sky Blue
  '#0083AF', // Ocean Deep Blue
  '#007473', // Deep Teal
  '#9A89FF', // Periwinkle Purple
  '#F77CF5', // Magenta Pink
  '#FF8D98', // Coral Pink
  '#FFB072', // Peach Orange
  '#FFD661'  // Warm Gold
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  equipment,
  requests,
  onViewAllRequests,
  onSelectRequest,
  onOpenNewBorrow
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // 1. Primary Metrics
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(e => e.status === 'พร้อมใช้งาน').length;
  const inUseEquipment = equipment.filter(e => e.status === 'ถูกยืมใช้งาน').length;
  const maintenanceEquipment = equipment.filter(e => e.status === 'ซ่อมบำรุง' || e.status === 'รอจำหน่าย').length;

  // 2. Sub-metrics bar
  const pendingRequestsCount = requests.filter(r => r.status === 'ยื่นขออนุมัติ' || r.status === 'รอผู้บริหารอนุมัติ').length;
  const borrowedTodayCount = requests.filter(r => (r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน') && r.borrowFrom === todayStr).length;
  const borrowedThisMonthCount = requests.filter(r => (r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน' || r.status === 'รับคืนเรียบร้อย') && (r.borrowFrom || '').startsWith(currentMonthStr)).length;
  const returnedThisMonthCount = requests.filter(r => (r.status === 'รับคืนเรียบร้อย' || r.status === 'เสร็จสิ้น' || r.status === 'คืนครุภัณฑ์แล้ว') && (r.updatedAt || '').startsWith(currentMonthStr)).length;

  // 3. Category proportions for Donut Chart
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const eq of equipment) {
      const cat = eq.category || 'อื่นๆ';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = equipment.length || 1;

    let cumulativeAngle = 0;
    return entries.map(([category, count], idx) => {
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      const color = PALETTE_COLORS[idx % PALETTE_COLORS.length];
      return { category, count, percentage, color, startAngle, angle };
    });
  }, [equipment]);

  // 4. Status distribution for Bar Chart
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {
      'พร้อมใช้งาน': 0,
      'ถูกยืมใช้งาน': 0,
      'ซ่อมบำรุง': 0,
      'รอจำหน่าย': 0
    };
    for (const eq of equipment) {
      if (counts[eq.status] !== undefined) {
        counts[eq.status]++;
      } else {
        counts[eq.status] = 1;
      }
    }
    return [
      { status: 'พร้อมใช้งาน', count: counts['พร้อมใช้งาน'] || 0, color: '#0090FF' },
      { status: 'ถูกยืมใช้งาน', count: counts['ถูกยืมใช้งาน'] || 0, color: '#0083AF' },
      { status: 'ซ่อมบำรุง', count: counts['ซ่อมบำรุง'] || 0, color: '#F77CF5' },
      { status: 'รอจำหน่าย', count: counts['รอจำหน่าย'] || 0, color: '#9A89FF' }
    ];
  }, [equipment]);

  const maxStatusCount = Math.max(1, ...statusStats.map(s => s.count));

  // 5. Recent Requests (latest 5)
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* 1. Top 4 Metric Cards (Matching Image 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: อุปกรณ์ทั้งหมด */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">อุปกรณ์ทั้งหมด</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalEquipment}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ชิ้น / เครื่องในระบบ</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0090FF]/10 text-[#0090FF] flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: พร้อมใช้งาน */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">พร้อมใช้งาน</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{availableEquipment}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">พร้อมให้ยืมใช้งาน</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: กำลังยืมใช้งาน */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">กำลังยืมใช้งาน</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{inUseEquipment}</div>
            <div className="text-[11px] text-amber-600 font-semibold mt-0.5">อยู่ระหว่างการยืม</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: ชำรุด / รอซ่อม */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">ชำรุด / รอซ่อม</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{maintenanceEquipment}</div>
            <div className="text-[11px] text-rose-500 font-semibold mt-0.5">ต้องตรวจเช็ค</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Sub-metrics Dark Horizontal Bar (Exact match to Image 4) */}
      <div className="bg-[#0b1322] text-white rounded-2xl p-4 shadow-md border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
        <div className="text-center md:text-left px-3 pt-2 md:pt-0">
          <div className="text-xs text-slate-400">รออนุมัติ</div>
          <div className="text-xl font-bold text-amber-400 mt-0.5">{pendingRequestsCount} <span className="text-xs font-normal text-slate-400">รายการ</span></div>
        </div>
        <div className="text-center md:text-left px-3 pt-2 md:pt-0">
          <div className="text-xs text-slate-400">ยืมวันนี้</div>
          <div className="text-xl font-bold text-[#0090FF] mt-0.5">{borrowedTodayCount} <span className="text-xs font-normal text-slate-400">รายการ</span></div>
        </div>
        <div className="text-center md:text-left px-3 pt-2 md:pt-0">
          <div className="text-xs text-slate-400">ยืมเดือนนี้</div>
          <div className="text-xl font-bold text-white mt-0.5">{borrowedThisMonthCount} <span className="text-xs font-normal text-slate-400">รายการ</span></div>
        </div>
        <div className="text-center md:text-left px-3 pt-2 md:pt-0">
          <div className="text-xs text-slate-400">คืนแล้วเดือนนี้</div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{returnedThisMonthCount} <span className="text-xs font-normal text-slate-400">รายการ</span></div>
        </div>
      </div>

      {/* 3. Middle Charts Row (Donut & Bar Charts matching Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Donut Chart - สัดส่วนอุปกรณ์ตามหมวดหมู่ */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#0090FF]" />
              <span>สัดส่วนอุปกรณ์ตามหมวดหมู่</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{equipment.length} ชิ้นรวม</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {categoryStats.map((item, idx) => {
                  const strokeDasharray = `${item.percentage * 0.9} 100`;
                  const strokeDashoffset = -categoryStats.slice(0, idx).reduce((sum, curr) => sum + curr.percentage * 0.9, 0);
                  return (
                    <circle
                      key={item.category}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="16"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </svg>
              {/* Inner Hole text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 leading-none">{totalEquipment}</span>
                <span className="text-[10px] text-slate-500 font-medium mt-1">ทั้งหมด</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-2 text-xs flex-1 max-h-48 overflow-y-auto pr-2">
              {categoryStats.map((item) => (
                <div key={item.category} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-slate-700 truncate font-medium">{item.category}</span>
                  </div>
                  <div className="font-bold text-slate-900 shrink-0">
                    {item.count} <span className="text-[10px] text-slate-400 font-normal">({item.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Bar Chart - สถิติสถานะอุปกรณ์ในระบบ (Matching Image 4) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0090FF]" />
              <span>สถิติสถานะอุปกรณ์ในระบบ</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">สถานะพร้อมใช้งาน</span>
          </div>

          {/* Clean SVG Bar Chart with values */}
          <div className="my-auto py-4">
            <div className="space-y-4">
              {statusStats.map((stat) => {
                const percentage = Math.round((stat.count / maxStatusCount) * 100);
                return (
                  <div key={stat.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{stat.status}</span>
                      <span className="font-bold text-slate-900">{stat.count} รายการ</span>
                    </div>
                    <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.max(6, percentage)}%`,
                          backgroundColor: stat.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-right text-[11px] text-slate-400">
            อัปเดตแบบเรียลไทม์จากฐานข้อมูลโรงพยาบาลสัตว์ ม.อ.
          </div>
        </div>
      </div>

      {/* 4. Bottom Table: รายการขอยืมล่าสุด (Matching Image 4) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0090FF]" />
            <h3 className="text-sm font-bold text-slate-900">รายการขอยืมล่าสุด</h3>
          </div>
          <button
            type="button"
            onClick={onViewAllRequests}
            className="text-xs font-semibold text-[#0090FF] hover:text-[#0083AF] flex items-center gap-1 transition cursor-pointer"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">เลขที่คำขอ</th>
                <th className="py-3 px-4">ผู้ขอยืม</th>
                <th className="py-3 px-4">หน่วยงาน</th>
                <th className="py-3 px-4">กำหนดคืน</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    ยังไม่มีรายการคำขอยืมในระบบ
                  </td>
                </tr>
              ) : (
                recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#0090FF]">
                      {req.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {req.requesterName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {req.requesterDept || req.requesterFacultyTh || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {req.borrowTo}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        req.status === 'ยื่นขออนุมัติ'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : req.status === 'เจ้าของให้ยืมแล้ว' || req.status === 'กำลังยืมใช้งาน'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : req.status === 'รับคืนเรียบร้อย'
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectRequest(req)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#0090FF] hover:bg-[#0090FF]/10 rounded-lg transition cursor-pointer"
                      >
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
