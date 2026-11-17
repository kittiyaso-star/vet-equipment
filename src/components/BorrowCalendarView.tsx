import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Package,
  User,
  PlusCircle,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster } from '../types';

interface BorrowCalendarViewProps {
  equipment: EquipmentMaster[];
  requests: BorrowRequest[];
  onSelectRequest: (request: BorrowRequest) => void;
  onOpenNewBorrow: () => void;
}

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
];

const THAI_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function toYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayYmd(): string {
  const now = new Date();
  return toYmd(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatThaiFullDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export const BorrowCalendarView: React.FC<BorrowCalendarViewProps> = ({
  equipment,
  requests,
  onSelectRequest,
  onOpenNewBorrow
}) => {
  const todayYmd = getTodayYmd();
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);
  const [selectedEquipmentKey, setSelectedEquipmentKey] = useState<string>('ALL');

  // Equipment filter options (from equipment master + any equipment appearing in requests)
  const equipmentFilterOptions = useMemo(() => {
    const map = new Map<string, { key: string; code: string; name: string }>();
    for (const eq of equipment) {
      const key = (eq.code || eq.name).trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, { key, code: eq.code, name: eq.name });
      }
    }
    for (const req of requests) {
      for (const item of req.equipmentList || []) {
        const key = (item.code || item.name).trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, { key, code: item.code || '-', name: item.name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [equipment, requests]);

  // Active (non-cancelled) requests optionally filtered by specific equipment
  const filteredCalendarRequests = useMemo(() => {
    return requests.filter((req) => {
      if (req.status === 'ยกเลิกคำขอ') return false;
      if (!req.borrowFrom) return false;
      if (selectedEquipmentKey === 'ALL') return true;
      return (req.equipmentList || []).some((item) => {
        const key = (item.code || item.name).trim().toLowerCase();
        return key === selectedEquipmentKey;
      });
    });
  }, [requests, selectedEquipmentKey]);

  // Latest active request date so user can jump directly if current month is empty
  const latestBookingMonth = useMemo(() => {
    const sorted = [...filteredCalendarRequests].sort((a, b) =>
      (b.borrowFrom || '').localeCompare(a.borrowFrom || '')
    );
    if (!sorted[0]?.borrowFrom) return null;
    const [y, m] = sorted[0].borrowFrom.split('-').map(Number);
    if (!y || !m) return null;
    return { year: y, month: m - 1, ymd: sorted[0].borrowFrom };
  }, [filteredCalendarRequests]);

  // Build calendar cells for viewYear/viewMonth and map bookings + conflicts per day
  const calendarData = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const monthStartYmd = toYmd(viewYear, viewMonth, 1);
    const monthEndYmd = toYmd(viewYear, viewMonth, daysInMonth);

    // Map day YMD -> { requests, conflictingCodes }
    const dayMap = new Map<
      string,
      {
        dayRequests: BorrowRequest[];
        conflictingEquipmentKeys: Set<string>;
      }
    >();

    for (let d = 1; d <= daysInMonth; d++) {
      dayMap.set(toYmd(viewYear, viewMonth, d), {
        dayRequests: [],
        conflictingEquipmentKeys: new Set<string>()
      });
    }

    let monthBookingsCount = 0;
    let monthConflictDaysCount = 0;

    for (const req of filteredCalendarRequests) {
      const from = req.borrowFrom;
      const to = req.borrowTo && req.borrowTo >= from ? req.borrowTo : from;

      // Skip if completely outside this month
      if (to < monthStartYmd || from > monthEndYmd) continue;
      monthBookingsCount++;

      for (let d = 1; d <= daysInMonth; d++) {
        const ymd = toYmd(viewYear, viewMonth, d);
        if (ymd >= from && ymd <= to) {
          dayMap.get(ymd)!.dayRequests.push(req);
        }
      }
    }

    // Detect overlapping bookings for the same equipment item on the same day
    for (const [, info] of dayMap) {
      if (info.dayRequests.length >= 2) {
        const eqCount = new Map<string, number>();
        for (const req of info.dayRequests) {
          const seenInReq = new Set<string>();
          for (const item of req.equipmentList || []) {
            const key = (item.code || item.name).trim().toLowerCase();
            if (!key || seenInReq.has(key)) continue;
            seenInReq.add(key);
            const nextCount = (eqCount.get(key) || 0) + 1;
            eqCount.set(key, nextCount);
            if (nextCount >= 2) {
              info.conflictingEquipmentKeys.add(key);
            }
          }
        }
        if (info.conflictingEquipmentKeys.size > 0) {
          monthConflictDaysCount++;
        }
      }
    }

    const cells: Array<{ day: number | null; ymd: string | null }> = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: null, ymd: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, ymd: toYmd(viewYear, viewMonth, d) });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, ymd: null });
    }

    return {
      cells,
      dayMap,
      monthBookingsCount,
      monthConflictDaysCount
    };
  }, [viewYear, viewMonth, filteredCalendarRequests]);

  // Bookings for selectedDate (works even if user clicks across month boundaries)
  const selectedDayInfo = useMemo(() => {
    const dayRequests = filteredCalendarRequests
      .filter((req) => {
        const from = req.borrowFrom;
        const to = req.borrowTo && req.borrowTo >= from ? req.borrowTo : from;
        return selectedDate >= from && selectedDate <= to;
      })
      .sort((a, b) => (a.borrowFromTime || '').localeCompare(b.borrowFromTime || ''));

    const eqCount = new Map<string, number>();
    const conflictingKeys = new Set<string>();
    for (const req of dayRequests) {
      const seen = new Set<string>();
      for (const item of req.equipmentList || []) {
        const key = (item.code || item.name).trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const count = (eqCount.get(key) || 0) + 1;
        eqCount.set(key, count);
        if (count >= 2) conflictingKeys.add(key);
      }
    }

    return { dayRequests, conflictingKeys };
  }, [filteredCalendarRequests, selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayYmd);
  };

  const handleJumpLatestBooking = () => {
    if (!latestBookingMonth) return;
    setViewYear(latestBookingMonth.year);
    setViewMonth(latestBookingMonth.month);
    setSelectedDate(latestBookingMonth.ymd);
  };

  const getStatusPillClasses = (status: BorrowRequest['status']) => {
    if (status === 'ยื่นขออนุมัติ' || status === 'รอผู้บริหารอนุมัติ') {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (status === 'เจ้าของให้ยืมแล้ว' || status === 'กำลังยืมใช้งาน') {
      return 'bg-blue-50 text-[#0083AF] border-blue-200';
    }
    if (status === 'รับคืนเรียบร้อย' || status === 'คืนครุภัณฑ์แล้ว' || status === 'เสร็จสิ้น') {
      return 'bg-teal-50 text-[#007473] border-teal-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0090FF]/10 text-[#0090FF] flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                ตารางเวลาการยืมครุภัณฑ์ (Calendar View)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0090FF]">
                เดือนนี้ {calendarData.monthBookingsCount} รายการ
              </span>
              {calendarData.monthConflictDaysCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  พบวันจองครุภัณฑ์ชนกัน {calendarData.monthConflictDaysCount} วัน
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ตรวจสอบตารางการจองครุภัณฑ์ล่วงหน้าในแต่ละวัน เพื่อป้องกันการจองซ้ำซ้อนหรือชนกัน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Specific Equipment Filter */}
          <div className="relative flex items-center">
            <Package className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              aria-label="กรองปฏิทินตามรายการครุภัณฑ์"
              value={selectedEquipmentKey}
              onChange={(e) => setSelectedEquipmentKey(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-[#0090FF] cursor-pointer max-w-[230px]"
            >
              <option value="ALL">ครุภัณฑ์ทั้งหมด</option>
              {equipmentFilterOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.name} ({opt.code})
                </option>
              ))}
            </select>
          </div>

          {/* Month Navigation */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer"
              aria-label="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-bold text-slate-800 min-w-[115px] text-center">
              {THAI_MONTHS[viewMonth]} {viewYear + 543}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleJumpToday}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
          >
            วันนี้
          </button>

          {calendarData.monthBookingsCount === 0 && latestBookingMonth && (
            <button
              type="button"
              onClick={handleJumpLatestBooking}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-bold text-[#0090FF] transition cursor-pointer"
            >
              ไปเดือนที่มีการจองล่าสุด ({THAI_MONTHS[latestBookingMonth.month]} {latestBookingMonth.year + 543})
            </button>
          )}
        </div>
      </div>

      {/* Color Legend */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            รออนุมัติ
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0090FF]" />
            อนุมัติแล้ว / กำลังยืม
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007473]" />
            รับคืนเรียบร้อย
          </span>
          <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            มีรายการอุปกรณ์เดียวกันจองชนกันในวันเดียว
          </span>
        </div>
        <span className="text-slate-400">คลิกที่วันในปฏิทินเพื่อดูตารางเวลาและตรวจสอบช่วงเวลาว่าง</span>
      </div>

      {/* Main Content: Calendar Grid (Left) + Selected Day Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left: 7-column Calendar Grid */}
        <div className="lg:col-span-8 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {THAI_WEEKDAYS.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${
                  idx === 0 || idx === 6 ? 'text-rose-500 bg-rose-50/50' : 'text-slate-500 bg-slate-50'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarData.cells.map((cell, index) => {
              if (!cell.day || !cell.ymd) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[78px] sm:min-h-[92px] rounded-xl bg-slate-50/40 border border-slate-100/60"
                  />
                );
              }

              const dayInfo = calendarData.dayMap.get(cell.ymd);
              const dayReqs = dayInfo?.dayRequests || [];
              const hasConflict = (dayInfo?.conflictingEquipmentKeys.size || 0) > 0;
              const isToday = cell.ymd === todayYmd;
              const isSelected = cell.ymd === selectedDate;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => setSelectedDate(cell.ymd!)}
                  className={`min-h-[78px] sm:min-h-[92px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    isSelected
                      ? 'border-[#0090FF] ring-2 ring-[#0090FF]/20 bg-blue-50/30'
                      : hasConflict
                      ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
                      : dayReqs.length > 0
                      ? 'border-slate-200 bg-white hover:border-[#0090FF]/50'
                      : 'border-slate-100 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  {/* Day Number + Badges */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${
                        isToday
                          ? 'bg-[#0090FF] text-white shadow-2xs'
                          : isSelected
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {hasConflict ? (
                      <span
                        title="พบครุภัณฑ์เดียวกันถูกจองซ้ำซ้อนในวันนี้"
                        className="text-rose-600"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    ) : dayReqs.length > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                        {dayReqs.length}
                      </span>
                    ) : null}
                  </div>

                  {/* Booking Pills (up to 2 shown in cell) */}
                  <div className="space-y-1 w-full mt-1 overflow-hidden">
                    {dayReqs.slice(0, 2).map((req) => {
                      const firstEqName = req.equipmentList[0]?.name || req.id;
                      return (
                        <div
                          key={`${cell.ymd}-${req.id}`}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border truncate ${getStatusPillClasses(
                            req.status
                          )}`}
                          title={`${req.id}: ${req.equipmentList.map((e) => e.name).join(', ')} (${req.requesterName})`}
                        >
                          {req.borrowFromTime ? `${req.borrowFromTime} ` : ''}
                          {firstEqName}
                        </div>
                      );
                    })}
                    {dayReqs.length > 2 && (
                      <div className="text-[9px] font-bold text-[#0090FF] pl-1">
                        +{dayReqs.length - 2} รายการ
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Detail Panel */}
        <div className="lg:col-span-4 p-4 sm:p-5 bg-slate-50/50 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <div className="text-[11px] font-bold text-[#0090FF] uppercase">
                  รายการจองประจำวันที่
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {formatThaiFullDate(selectedDate)}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700">
                {selectedDayInfo.dayRequests.length} รายการ
              </span>
            </div>

            {selectedDayInfo.conflictingKeys.size > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">แจ้งเตือนการจองชนกันในวันนี้</div>
                  <div className="text-[11px] text-rose-700 mt-0.5">
                    พบครุภัณฑ์เดียวกันถูกยื่นจองมากกว่า 1 คำขอในวันเดียวกัน กรุณาตรวจสอบช่วงเวลาและประสานงานผู้ขอยืม
                  </div>
                </div>
              </div>
            )}

            {selectedDayInfo.dayRequests.length === 0 ? (
              <div className="py-10 px-4 text-center bg-white rounded-xl border border-dashed border-slate-200 space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  ไม่มีรายการจองครุภัณฑ์ในวันที่เลือก
                </div>
                <p className="text-[11px] text-slate-500">
                  ช่วงเวลาว่างสามารถกดขอยืมอุปกรณ์สำหรับวันนี้ได้ทันที
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {selectedDayInfo.dayRequests.map((req) => {
                  const hasItemConflict = (req.equipmentList || []).some((item) =>
                    selectedDayInfo.conflictingKeys.has(
                      (item.code || item.name).trim().toLowerCase()
                    )
                  );

                  return (
                    <div
                      key={req.id}
                      className={`p-3 rounded-xl bg-white border shadow-2xs space-y-2 ${
                        hasItemConflict ? 'border-rose-300' : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#0090FF]">
                          {req.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusPillClasses(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {req.equipmentList.map((e) => e.name).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{req.requesterName}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {req.borrowFrom === req.borrowTo
                              ? `${req.borrowFrom}`
                              : `${req.borrowFrom} ถึง ${req.borrowTo}`}{' '}
                            ({req.borrowFromTime || '08:30'} - {req.borrowToTime || '16:30'} น.)
                          </span>
                        </div>
                      </div>

                      {hasItemConflict && (
                        <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1 pt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>ครุภัณฑ์นี้มีคำขออื่นจองในวันเดียวกัน</span>
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onSelectRequest(req)}
                          className="text-[11px] font-bold text-[#0090FF] hover:text-[#0083AF] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูรายละเอียดคำขอ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewBorrow}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0090FF] to-[#007473] hover:from-[#008EE4] hover:to-[#0083AF] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ ขอยืมอุปกรณ์</span>
          </button>
        </div>
      </div>
    </div>
  );
};
