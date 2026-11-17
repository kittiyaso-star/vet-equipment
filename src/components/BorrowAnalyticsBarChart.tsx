import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, Calendar, Layers, Package } from 'lucide-react';
import { BorrowRequest, EquipmentMaster } from '../types';

interface BorrowAnalyticsBarChartProps {
  equipment: EquipmentMaster[];
  requests: BorrowRequest[];
}

type ChartMode = 'category' | 'top_items';
type TimeRange = '30d' | 'all';

interface ChartDatum {
  label: string;
  fullName: string;
  code?: string;
  total: number;
  returned: number;
  activeOrPending: number;
}

function inferCategoryFromName(name: string): EquipmentMaster['category'] {
  const lower = (name || '').toLowerCase();
  if (
    lower.includes('เอ็กซเรย์') ||
    lower.includes('x-ray') ||
    lower.includes('cr') ||
    lower.includes('ฟิล์ม') ||
    lower.includes('อัลตราซาวด์') ||
    lower.includes('กล้องจุลทรรศน์')
  ) {
    return 'เครื่องมือวินิจฉัย/เอ็กซเรย์';
  }
  if (
    lower.includes('ผ่าตัด') ||
    lower.includes('ศัลยกรรม') ||
    lower.includes('retractor') ||
    lower.includes('bone') ||
    lower.includes('กระดูก') ||
    lower.includes('คีม')
  ) {
    return 'เครื่องมือผ่าตัด/ศัลยกรรม';
  }
  if (
    lower.includes('สัญญาณชีพ') ||
    lower.includes('ความดัน') ||
    lower.includes('oximeter') ||
    lower.includes('ตรวจ') ||
    lower.includes('suction')
  ) {
    return 'เครื่องมือตรวจและเฝ้าระวัง';
  }
  if (lower.includes('เบาะ') || lower.includes('กายภาพ') || lower.includes('ฟื้นฟู')) {
    return 'อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู';
  }
  return 'อื่นๆ';
}

function truncateLabel(text: string, maxLen = 18): string {
  if (!text) return '-';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export const BorrowAnalyticsBarChart: React.FC<BorrowAnalyticsBarChartProps> = ({
  equipment,
  requests
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('category');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Filter requests based on selected time range (excluding cancelled requests)
  const filteredRequests = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgoMs = now - 30 * 24 * 60 * 60 * 1000;

    return requests.filter((req) => {
      if (req.status === 'ยกเลิกคำขอ') return false;
      if (timeRange === 'all') return true;

      const borrowTime = req.borrowFrom ? new Date(`${req.borrowFrom}T00:00:00`).getTime() : NaN;
      const createdTime = req.createdAt ? new Date(req.createdAt).getTime() : NaN;

      const isBorrowRecent = !isNaN(borrowTime) && borrowTime >= thirtyDaysAgoMs;
      const isCreatedRecent = !isNaN(createdTime) && createdTime >= thirtyDaysAgoMs;

      return isBorrowRecent || isCreatedRecent;
    });
  }, [requests, timeRange]);

  const masterLookups = useMemo(() => {
    const byCode = new Map<string, EquipmentMaster>();
    const byName = new Map<string, EquipmentMaster>();
    for (const eq of equipment) {
      if (eq.code) byCode.set(eq.code.trim().toLowerCase(), eq);
      if (eq.name) byName.set(eq.name.trim().toLowerCase(), eq);
    }
    return { byCode, byName };
  }, [equipment]);

  // Build Category comparison dataset
  const categoryChartData = useMemo<ChartDatum[]>(() => {
    const ALL_CATEGORIES: EquipmentMaster['category'][] = [
      'เครื่องมือวินิจฉัย/เอ็กซเรย์',
      'เครื่องมือผ่าตัด/ศัลยกรรม',
      'เครื่องมือตรวจและเฝ้าระวัง',
      'อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู',
      'อื่นๆ'
    ];

    const map = new Map<string, ChartDatum>();
    for (const cat of ALL_CATEGORIES) {
      map.set(cat, {
        label: truncateLabel(cat.replace('เครื่องมือ', '').replace('อุปกรณ์', ''), 18),
        fullName: cat,
        total: 0,
        returned: 0,
        activeOrPending: 0
      });
    }

    for (const req of filteredRequests) {
      const isReturned =
        req.status === 'รับคืนเรียบร้อย' ||
        req.status === 'คืนครุภัณฑ์แล้ว' ||
        req.status === 'เสร็จสิ้น';

      for (const item of req.equipmentList || []) {
        const codeKey = (item.code || '').trim().toLowerCase();
        const nameKey = (item.name || '').trim().toLowerCase();
        const master =
          (codeKey ? masterLookups.byCode.get(codeKey) : undefined) ||
          (nameKey ? masterLookups.byName.get(nameKey) : undefined);

        const category = master?.category || inferCategoryFromName(item.name || '');
        const entry = map.get(category) || {
          label: truncateLabel(category, 18),
          fullName: category,
          total: 0,
          returned: 0,
          activeOrPending: 0
        };

        entry.total += 1;
        if (isReturned) entry.returned += 1;
        else entry.activeOrPending += 1;

        map.set(category, entry);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredRequests, masterLookups]);

  // Build Top Borrowed Items dataset
  const topItemsChartData = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, ChartDatum>();

    for (const req of filteredRequests) {
      const isReturned =
        req.status === 'รับคืนเรียบร้อย' ||
        req.status === 'คืนครุภัณฑ์แล้ว' ||
        req.status === 'เสร็จสิ้น';

      const seenInReq = new Set<string>();
      for (const item of req.equipmentList || []) {
        const rawCode = (item.code || '').trim();
        const rawName = (item.name || '').trim();
        const key = (rawCode || rawName).toLowerCase();
        if (!key || seenInReq.has(key)) continue;
        seenInReq.add(key);

        const master =
          (rawCode ? masterLookups.byCode.get(rawCode.toLowerCase()) : undefined) ||
          (rawName ? masterLookups.byName.get(rawName.toLowerCase()) : undefined);

        const fullName = master?.name || rawName || rawCode;
        const code = master?.code || rawCode;

        const entry = map.get(key) || {
          label: truncateLabel(fullName, 16),
          fullName,
          code,
          total: 0,
          returned: 0,
          activeOrPending: 0
        };

        entry.total += 1;
        if (isReturned) entry.returned += 1;
        else entry.activeOrPending += 1;

        map.set(key, entry);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total || b.returned - a.returned)
      .slice(0, 7);
  }, [filteredRequests, masterLookups]);

  const activeData = chartMode === 'category' ? categoryChartData : topItemsChartData;
  const hasAnyBorrows = activeData.some((d) => d.total > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0090FF]/10 text-[#0090FF] flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              กราฟเปรียบเทียบสถิติการยืมครุภัณฑ์ (Recharts Analytics)
            </h3>
            <p className="text-[11px] text-slate-500">
              {timeRange === '30d'
                ? `ข้อมูลในช่วง 30 วันที่ผ่านมา (${filteredRequests.length} คำขอ)`
                : `ข้อมูลสะสมทั้งหมดในระบบ (${filteredRequests.length} คำขอ)`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setChartMode('category')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                chartMode === 'category'
                  ? 'bg-white text-[#0090FF] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>แยกตามหมวดหมู่</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('top_items')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                chartMode === 'top_items'
                  ? 'bg-white text-[#0090FF] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>รายการที่ถูกยืมมากที่สุด</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              aria-label="เลือกช่วงเวลาของกราฟสถิติการยืม"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-[#0090FF] cursor-pointer hover:bg-slate-100/80 transition"
            >
              <option value="30d">ช่วง 30 วันที่ผ่านมา</option>
              <option value="all">ทั้งหมดตั้งแต่เริ่มระบบ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4 sm:p-6">
        {!hasAnyBorrows ? (
          <div className="h-64 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 p-6">
            <BarChart3 className="w-8 h-8 text-slate-300" />
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-bold text-slate-700">
                ยังไม่มีรายการยืมครุภัณฑ์ในช่วง 30 วันที่ผ่านมา
              </div>
              <p className="text-[11px] text-slate-500">
                ท่านสามารถสลับไปดูสถิติสะสมทั้งหมดในระบบเพื่อเปรียบเทียบข้อมูลย้อนหลังได้
              </p>
            </div>
            {timeRange === '30d' && requests.length > 0 && (
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className="px-3.5 py-1.5 rounded-xl bg-[#0090FF] hover:bg-[#008EE4] text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                ดูข้อมูลสะสมทั้งหมด ({requests.filter(r => r.status !== 'ยกเลิกคำขอ').length} คำขอ)
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={activeData}
                margin={{ top: 12, right: 16, left: -12, bottom: 18 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                  angle={activeData.length > 5 ? -12 : 0}
                  textAnchor={activeData.length > 5 ? 'end' : 'middle'}
                  height={activeData.length > 5 ? 52 : 34}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const datum = payload[0].payload as ChartDatum;
                    return (
                      <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {datum.fullName}
                        </div>
                        {datum.code && (
                          <div className="text-[11px] font-mono text-slate-500">
                            รหัส: {datum.code}
                          </div>
                        )}
                        <div className="pt-1 border-t border-slate-100 space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-600 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#0090FF]" />
                              จำนวนการยืมทั้งหมด
                            </span>
                            <span className="font-bold text-slate-900">{datum.total} ครั้ง</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-600 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#007473]" />
                              รับคืนเรียบร้อยแล้ว
                            </span>
                            <span className="font-bold text-[#007473]">{datum.returned} ครั้ง</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-600 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#9A89FF]" />
                              กำลังยืม / รออนุมัติ
                            </span>
                            <span className="font-bold text-[#6D4FE6]">{datum.activeOrPending} ครั้ง</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  iconType="roundRect"
                  wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                />
                <Bar
                  dataKey="total"
                  name="จำนวนการยืม (ครั้ง)"
                  fill="#0090FF"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
                <Bar
                  dataKey="returned"
                  name="รับคืนแล้ว (ครั้ง)"
                  fill="#007473"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
