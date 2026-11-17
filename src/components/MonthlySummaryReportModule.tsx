import React, { useMemo, useState } from 'react';
import {
  FileText,
  Printer,
  Eye,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Download
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster } from '../types';

interface MonthlySummaryReportModuleProps {
  equipment: EquipmentMaster[];
  requests: BorrowRequest[];
}

interface TopEquipmentStat {
  code: string;
  name: string;
  location: string;
  totalBorrows: number;
  returnedCount: number;
  activeCount: number;
}

interface OverdueItemStat {
  code: string;
  name: string;
  location: string;
  unreturnedCount: number;
  maxOverdueDays: number;
  borrowers: string[];
}

interface OverdueRequestDetail {
  id: string;
  requesterName: string;
  requesterDept: string;
  borrowFrom: string;
  borrowTo: string;
  overdueDays: number;
  status: string;
  equipmentNames: string;
  responsibleNames: string;
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

function formatThaiMonthYear(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const yearNum = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  if (isNaN(yearNum) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return ym;
  return `${THAI_MONTHS[monthIdx]} ${yearNum + 543}`;
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const MonthlySummaryReportModule: React.FC<MonthlySummaryReportModuleProps> = ({
  equipment,
  requests
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('LAST_30_DAYS');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Build available YYYY-MM month options dynamically from requests + current month
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentYm);
    monthSet.add(prevYm);

    for (const r of requests) {
      if (r.borrowFrom && /^\d{4}-\d{2}/.test(r.borrowFrom)) {
        monthSet.add(r.borrowFrom.slice(0, 7));
      }
      if (r.createdAt && /^\d{4}-\d{2}/.test(r.createdAt)) {
        monthSet.add(r.createdAt.slice(0, 7));
      }
    }

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [requests]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'LAST_30_DAYS') return 'รอบ 1 เดือนที่ผ่านมา (30 วันล่าสุด)';
    if (selectedPeriod === 'ALL') return 'สรุปสะสมทั้งหมดตั้งแต่เริ่มระบบ';
    return `ประจำเดือน ${formatThaiMonthYear(selectedPeriod)}`;
  }, [selectedPeriod]);

  // Compute monthly report analytics
  const reportData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgoMs = today.getTime() - 30 * 24 * 60 * 60 * 1000;

    const masterByCode = new Map<string, EquipmentMaster>();
    for (const eq of equipment) {
      if (eq.code) masterByCode.set(eq.code.trim().toLowerCase(), eq);
    }

    const inSelectedPeriod = (r: BorrowRequest): boolean => {
      if (r.status === 'ยกเลิกคำขอ') return false;
      if (selectedPeriod === 'ALL') return true;
      if (selectedPeriod === 'LAST_30_DAYS') {
        const borrowMs = r.borrowFrom ? new Date(`${r.borrowFrom}T00:00:00`).getTime() : NaN;
        const dueMs = r.borrowTo ? new Date(`${r.borrowTo}T00:00:00`).getTime() : NaN;
        const createdMs = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
        return (
          (!isNaN(borrowMs) && borrowMs >= thirtyDaysAgoMs) ||
          (!isNaN(dueMs) && dueMs >= thirtyDaysAgoMs) ||
          (!isNaN(createdMs) && createdMs >= thirtyDaysAgoMs)
        );
      }
      return (
        (r.borrowFrom || '').startsWith(selectedPeriod) ||
        (r.borrowTo || '').startsWith(selectedPeriod) ||
        (r.createdAt || '').startsWith(selectedPeriod)
      );
    };

    const periodRequests = requests
      .filter(inSelectedPeriod)
      .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));

    let returnedRequestsCount = 0;
    let activeLoansCount = 0;
    let pendingCount = 0;

    const itemStatMap = new Map<string, TopEquipmentStat>();
    const overdueItemMap = new Map<string, OverdueItemStat>();
    const overdueDetails: OverdueRequestDetail[] = [];

    for (const req of periodRequests) {
      const isReturned =
        req.status === 'รับคืนเรียบร้อย' ||
        req.status === 'คืนครุภัณฑ์แล้ว' ||
        req.status === 'เสร็จสิ้น';
      const isActive =
        req.status === 'เจ้าของให้ยืมแล้ว' || req.status === 'กำลังยืมใช้งาน';
      const isPending =
        req.status === 'ยื่นขออนุมัติ' || req.status === 'รอผู้บริหารอนุมัติ';

      if (isReturned) returnedRequestsCount++;
      else if (isActive) activeLoansCount++;
      else if (isPending) pendingCount++;

      // Calculate overdue days for unreturned active loans
      let overdueDays = 0;
      if (isActive && req.borrowTo) {
        const due = new Date(`${req.borrowTo}T00:00:00`);
        if (!isNaN(due.getTime())) {
          const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          overdueDays = Math.max(0, diff);
        }
      }

      if (isActive) {
        overdueDetails.push({
          id: req.id,
          requesterName: req.requesterName,
          requesterDept: req.requesterDept || req.requesterFacultyTh || '-',
          borrowFrom: req.borrowFrom || '-',
          borrowTo: req.borrowTo || '-',
          overdueDays,
          status: req.status,
          equipmentNames: (req.equipmentList || []).map((e) => e.name).join(', ') || '-',
          responsibleNames:
            Array.from(
              new Set((req.equipmentList || []).map((e) => e.responsible).filter(Boolean))
            ).join(', ') || '-'
        });
      }

      const seen = new Set<string>();
      for (const item of req.equipmentList || []) {
        const rawCode = (item.code || '').trim();
        const rawName = (item.name || '').trim();
        const key = (rawCode || rawName).toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const master = rawCode ? masterByCode.get(rawCode.toLowerCase()) : undefined;
        const name = master?.name || rawName || rawCode;
        const code = master?.code || rawCode || '-';
        const location = master?.location || item.location || '-';

        const cur = itemStatMap.get(key) || {
          code,
          name,
          location,
          totalBorrows: 0,
          returnedCount: 0,
          activeCount: 0
        };
        cur.totalBorrows += 1;
        if (isReturned) cur.returnedCount += 1;
        else if (isActive) cur.activeCount += 1;
        itemStatMap.set(key, cur);

        if (isActive) {
          const ov = overdueItemMap.get(key) || {
            code,
            name,
            location,
            unreturnedCount: 0,
            maxOverdueDays: 0,
            borrowers: []
          };
          ov.unreturnedCount += 1;
          ov.maxOverdueDays = Math.max(ov.maxOverdueDays, overdueDays);
          if (req.requesterName && !ov.borrowers.includes(req.requesterName)) {
            ov.borrowers.push(req.requesterName);
          }
          overdueItemMap.set(key, ov);
        }
      }
    }

    const topBorrowedItems = Array.from(itemStatMap.values()).sort(
      (a, b) => b.totalBorrows - a.totalBorrows || b.returnedCount - a.returnedCount
    );

    const topOverdueItems = Array.from(overdueItemMap.values()).sort(
      (a, b) => b.maxOverdueDays - a.maxOverdueDays || b.unreturnedCount - a.unreturnedCount
    );

    const sortedOverdueDetails = [...overdueDetails].sort(
      (a, b) => b.overdueDays - a.overdueDays
    );

    return {
      periodRequests,
      totalRequests: periodRequests.length,
      returnedRequestsCount,
      activeLoansCount,
      pendingCount,
      overdueRequestsCount: sortedOverdueDetails.filter((d) => d.overdueDays > 0).length,
      topBorrowedItems,
      mostBorrowedItem: topBorrowedItems[0] || null,
      topOverdueItems,
      mostOverdueItem: topOverdueItems[0] || null,
      overdueDetails: sortedOverdueDetails
    };
  }, [requests, equipment, selectedPeriod]);

  // Trigger clean A4 PDF print via isolated hidden iframe (no window.open / no sidebar overlap)
  const handleGeneratePdf = () => {
    setIsPrinting(true);
    const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}logo-vet-color-transparent.svg`;
    const generatedAt = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const topBorrowedRowsHtml =
      reportData.topBorrowedItems.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:12px;">ไม่พบข้อมูลการยืมในช่วงเวลาที่เลือก</td></tr>`
        : reportData.topBorrowedItems
            .slice(0, 10)
            .map(
              (item, idx) => `
              <tr>
                <td style="text-align:center;font-weight:700;">${idx + 1}</td>
                <td style="font-family:monospace;">${escapeHtml(item.code)}</td>
                <td>${escapeHtml(item.name)}</td>
                <td style="text-align:center;font-weight:700;color:#0074c2;">${item.totalBorrows} ครั้ง</td>
                <td style="text-align:center;color:#007473;font-weight:600;">${item.returnedCount} ครั้ง</td>
              </tr>`
            )
            .join('');

    const overdueRowsHtml =
      reportData.overdueDetails.length === 0
        ? `<tr><td colspan="6" style="text-align:center;color:#0f766e;padding:12px;">ไม่มีรายการค้างส่งคืนในช่วงเวลาที่เลือก</td></tr>`
        : reportData.overdueDetails
            .map(
              (d) => `
              <tr>
                <td style="font-family:monospace;font-weight:700;">${escapeHtml(d.id)}</td>
                <td>${escapeHtml(d.requesterName)}</td>
                <td>${escapeHtml(d.equipmentNames)}</td>
                <td style="text-align:center;">${escapeHtml(d.borrowTo)}</td>
                <td style="text-align:center;font-weight:700;color:${d.overdueDays > 0 ? '#be123c' : '#b45309'};">
                  ${d.overdueDays > 0 ? `เกินกำหนด ${d.overdueDays} วัน` : 'อยู่ระหว่างยืม'}
                </td>
                <td>${escapeHtml(d.responsibleNames)}</td>
              </tr>`
            )
            .join('');

    const allPeriodRowsHtml =
      reportData.periodRequests.length === 0
        ? `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:12px;">ไม่มีคำขอยืมในช่วงเวลาที่เลือก</td></tr>`
        : reportData.periodRequests
            .map(
              (req) => `
              <tr>
                <td style="font-family:monospace;font-weight:700;">${escapeHtml(req.id)}</td>
                <td>${escapeHtml(req.requesterName)}</td>
                <td>${escapeHtml((req.equipmentList || []).map((e) => e.name).join(', ') || '-')}</td>
                <td style="text-align:center;">${escapeHtml(req.borrowFrom || '-')}</td>
                <td style="text-align:center;">${escapeHtml(req.borrowTo || '-')}</td>
                <td style="text-align:center;font-weight:600;">${escapeHtml(req.status)}</td>
              </tr>`
            )
            .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>รายงานสรุปการยืม-คืนครุภัณฑ์ ${escapeHtml(periodLabel)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', 'Prompt', sans-serif;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header img { height: 48px; margin-bottom: 4px; }
    .header h1 { font-family: 'Prompt', sans-serif; font-size: 16px; margin: 2px 0; }
    .header h2 { font-size: 13px; font-weight: 600; margin: 2px 0; color: #334155; }
    .header .period { font-size: 13px; font-weight: 700; color: #0074c2; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 12px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 10px; color: #475569; }
    .kpi-val { font-size: 18px; font-weight: 700; color: #0f172a; }
    .highlight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .highlight-card {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      border-radius: 8px;
      padding: 10px;
    }
    .highlight-card.warn {
      border-color: #fecdd3;
      background: #fff1f2;
    }
    .highlight-title { font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px; }
    .highlight-card.warn .highlight-title { color: #be123c; }
    .highlight-main { font-size: 13px; font-weight: 700; color: #0f172a; }
    .highlight-sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .section-title {
      font-family: 'Prompt', sans-serif;
      font-size: 12px;
      font-weight: 700;
      margin: 12px 0 6px;
      padding-left: 8px;
      border-left: 3px solid #0090FF;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      font-size: 11px;
      padding-top: 12px;
    }
    .sig-line {
      margin: 26px auto 4px;
      width: 75%;
      border-bottom: 1px dotted #475569;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${escapeHtml(logoUrl)}" alt="PSU Vet Logo" onerror="this.style.display='none'" />
    <h1>รายงานสรุปสถิติการยืม-คืนครุภัณฑ์และอุปกรณ์ทางการแพทย์</h1>
    <h2>โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (วิทยาเขตหาดใหญ่)</h2>
    <div class="period">${escapeHtml(periodLabel)}</div>
  </div>

  <div class="meta">
    <div>ระบบ: Online Equipment Borrowing System รพ.สัตว์ ม.อ.</div>
    <div>วันที่พิมพ์รายงาน: ${escapeHtml(generatedAt)} น.</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">คำขอยืมทั้งหมดในรอบ</div>
      <div class="kpi-val">${reportData.totalRequests} รายการ</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">รับคืนเรียบร้อยแล้ว</div>
      <div class="kpi-val" style="color:#007473;">${reportData.returnedRequestsCount} รายการ</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">กำลังยืม / ยังไม่คืน</div>
      <div class="kpi-val" style="color:#b45309;">${reportData.activeLoansCount} รายการ</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">เกินกำหนดส่งคืน</div>
      <div class="kpi-val" style="color:#be123c;">${reportData.overdueRequestsCount} รายการ</div>
    </div>
  </div>

  <div class="highlight-grid">
    <div class="highlight-card">
      <div class="highlight-title">ยอดรายการที่ยืมสูงสุดในรอบเดือน</div>
      ${
        reportData.mostBorrowedItem
          ? `<div class="highlight-main">${escapeHtml(reportData.mostBorrowedItem.name)}</div>
             <div class="highlight-sub">รหัส: ${escapeHtml(reportData.mostBorrowedItem.code)} • ยืมทั้งหมด <strong>${reportData.mostBorrowedItem.totalBorrows} ครั้ง</strong> (คืนแล้ว ${reportData.mostBorrowedItem.returnedCount} ครั้ง)</div>`
          : `<div class="highlight-main">- ไม่มีข้อมูลการยืม -</div>`
      }
    </div>
    <div class="highlight-card warn">
      <div class="highlight-title">รายการที่ค้างส่งคืนมากที่สุด</div>
      ${
        reportData.mostOverdueItem
          ? `<div class="highlight-main">${escapeHtml(reportData.mostOverdueItem.name)}</div>
             <div class="highlight-sub">รหัส: ${escapeHtml(reportData.mostOverdueItem.code)} • ค้างส่ง ${reportData.mostOverdueItem.unreturnedCount} รายการ (${reportData.mostOverdueItem.maxOverdueDays > 0 ? `เกินกำหนดสูงสุด ${reportData.mostOverdueItem.maxOverdueDays} วัน` : 'อยู่ระหว่างกำหนดยืม'})</div>`
          : `<div class="highlight-main" style="color:#007473;">ไม่มีรายการค้างส่งคืน</div>
             <div class="highlight-sub">ครุภัณฑ์ทั้งหมดในรอบนี้ถูกส่งคืนเรียบร้อย</div>`
      }
    </div>
  </div>

  <div class="section-title">1. อันดับครุภัณฑ์ที่มีการยืมมากที่สุด (Top Borrowed Equipment)</div>
  <table>
    <thead>
      <tr>
        <th style="width:45px;">อันดับ</th>
        <th style="width:155px;">รหัสครุภัณฑ์</th>
        <th>รายการครุภัณฑ์</th>
        <th style="width:85px;">ยืมทั้งหมด</th>
        <th style="width:85px;">รับคืนแล้ว</th>
      </tr>
    </thead>
    <tbody>${topBorrowedRowsHtml}</tbody>
  </table>

  <div class="section-title">2. รายการครุภัณฑ์ที่ค้างส่งคืน / เกินกำหนดส่งคืน</div>
  <table>
    <thead>
      <tr>
        <th style="width:85px;">เลขที่คำขอ</th>
        <th style="width:125px;">ผู้ขอยืม</th>
        <th>รายการครุภัณฑ์</th>
        <th style="width:80px;">กำหนดคืน</th>
        <th style="width:105px;">สถานะการค้างส่ง</th>
        <th style="width:90px;">ผู้รับผิดชอบ</th>
      </tr>
    </thead>
    <tbody>${overdueRowsHtml}</tbody>
  </table>

  <div class="section-title">3. สรุปคำขอยืม-คืนทั้งหมดในช่วงเวลา (${reportData.periodRequests.length} รายการ)</div>
  <table>
    <thead>
      <tr>
        <th style="width:85px;">เลขที่คำขอ</th>
        <th style="width:125px;">ผู้ขอยืม</th>
        <th>รายการครุภัณฑ์</th>
        <th style="width:78px;">วันที่ยืม</th>
        <th style="width:78px;">กำหนดคืน</th>
        <th style="width:100px;">สถานะ</th>
      </tr>
    </thead>
    <tbody>${allPeriodRowsHtml}</tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>(..........................................................)</div>
      <div>เจ้าหน้าที่ผู้จัดทำรายงาน</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>(ดร.สพ.ญ. ญาดา ดวงนำสว่าง)</div>
      <div>รองผู้อำนวยการโรงพยาบาลสัตว์ ม.อ.</div>
    </div>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        setIsPrinting(false);
      }, 1000);
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          return;
        }
        const fontsReady = (win.document as any).fonts?.ready;
        const triggerPrint = () => {
          win.focus();
          win.print();
          cleanup();
        };
        if (fontsReady && typeof fontsReady.then === 'function') {
          Promise.race([
            fontsReady,
            new Promise((resolve) => setTimeout(resolve, 600))
          ]).then(triggerPrint);
        } else {
          setTimeout(triggerPrint, 300);
        }
      } catch {
        cleanup();
      }
    };

    iframe.srcdoc = htmlContent;
  };

  return (
    <>
      {/* Dashboard Card: โมดูลรายงานสรุปประจำเดือน */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-blue-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0090FF] to-[#007473] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                รายงานสรุปการยืม-คืนประจำเดือน (PDF Summary Report)
              </h3>
              <p className="text-[11px] text-slate-500">
                สรุปยอดรายการที่ยืมสูงสุดและรายการที่ค้างส่งคืนมากที่สุด เพื่อพิมพ์หรือบันทึกเป็นไฟล์ PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                aria-label="เลือกรอบเดือนสำหรับสร้างรายงานสรุป"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-[#0090FF] cursor-pointer shadow-2xs"
              >
                <option value="LAST_30_DAYS">รอบ 1 เดือนที่ผ่านมา (30 วันล่าสุด)</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    เดือน {formatThaiMonthYear(ym)}
                  </option>
                ))}
                <option value="ALL">สรุปรวมทั้งหมดตั้งแต่เริ่มระบบ</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-[#0090FF]" />
              <span>ดูตัวอย่างรายงาน</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0090FF] to-[#007473] hover:from-[#008EE4] hover:to-[#0083AF] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-[#0090FF]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'กำลังเตรียมไฟล์ PDF...' : 'สร้างรายงาน PDF'}</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics & Highlights inside Dashboard */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Period mini KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500 font-medium">คำขอในช่วงเวลา</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {reportData.totalRequests} <span className="text-xs font-medium text-slate-500">รายการ</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/70">
              <div className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>รับคืนแล้ว</span>
              </div>
              <div className="text-xl font-black text-[#007473] mt-0.5">
                {reportData.returnedRequestsCount} <span className="text-xs font-medium text-teal-700">รายการ</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70">
              <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>กำลังยืม / รอคืน</span>
              </div>
              <div className="text-xl font-black text-amber-700 mt-0.5">
                {reportData.activeLoansCount} <span className="text-xs font-medium text-amber-700">รายการ</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/80">
              <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>เกินกำหนดส่งคืน</span>
              </div>
              <div className="text-xl font-black text-rose-600 mt-0.5">
                {reportData.overdueRequestsCount} <span className="text-xs font-medium text-rose-600">รายการ</span>
              </div>
            </div>
          </div>

          {/* 2 Highlight Cards: Most Borrowed & Most Overdue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlight 1: Most Borrowed */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0083AF]">
                  <Award className="w-4 h-4 text-[#0090FF]" />
                  <span>ยอดรายการที่ยืมสูงสุด ({periodLabel})</span>
                </span>
                {reportData.mostBorrowedItem && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0090FF] text-white">
                    {reportData.mostBorrowedItem.totalBorrows} ครั้ง
                  </span>
                )}
              </div>

              {reportData.mostBorrowedItem ? (
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {reportData.mostBorrowedItem.name}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-x-2">
                    <span className="font-mono">รหัส: {reportData.mostBorrowedItem.code}</span>
                    <span>• คืนแล้ว {reportData.mostBorrowedItem.returnedCount} ครั้ง</span>
                    {reportData.mostBorrowedItem.activeCount > 0 && (
                      <span className="text-amber-700 font-semibold">
                        • กำลังยืม {reportData.mostBorrowedItem.activeCount} รายการ
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">ยังไม่มีรายการยืมในช่วงเวลาที่เลือก</div>
              )}
            </div>

            {/* Highlight 2: Most Overdue / Unreturned */}
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                reportData.mostOverdueItem
                  ? 'bg-rose-50/70 border-rose-200/90'
                  : 'bg-emerald-50/60 border-emerald-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    reportData.mostOverdueItem ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>รายการที่ค้างส่งคืนมากที่สุด</span>
                </span>
                {reportData.mostOverdueItem && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white">
                    {reportData.mostOverdueItem.maxOverdueDays > 0
                      ? `เกินกำหนด ${reportData.mostOverdueItem.maxOverdueDays} วัน`
                      : `ค้างส่ง ${reportData.mostOverdueItem.unreturnedCount} รายการ`}
                  </span>
                )}
              </div>

              {reportData.mostOverdueItem ? (
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {reportData.mostOverdueItem.name}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-x-2">
                    <span className="font-mono">รหัส: {reportData.mostOverdueItem.code}</span>
                    <span>• ค้างส่ง {reportData.mostOverdueItem.unreturnedCount} คำขอ</span>
                    <span>• ผู้ยืม: {reportData.mostOverdueItem.borrowers.join(', ')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-emerald-700">
                  ไม่มีรายการค้างส่งคืนในช่วงเวลาที่เลือก
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                <FileText className="w-4 h-4 text-[#0090FF]" />
                <span>ตัวอย่างรายงานสรุป PDF — {periodLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={isPrinting}
                  className="px-3.5 py-1.5 bg-[#0090FF] hover:bg-[#008EE4] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>บันทึกเป็น PDF / พิมพ์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  aria-label="ปิดตัวอย่างรายงาน"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Preview Body */}
            <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto space-y-5 text-xs text-slate-800 bg-white">
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <div className="flex justify-center mb-2">
                  <img
                    src={`${import.meta.env.BASE_URL}logo-vet-color-transparent.svg`}
                    alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ."
                    className="h-12 w-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  รายงานสรุปสถิติการยืม-คืนครุภัณฑ์และอุปกรณ์ทางการแพทย์
                </h2>
                <p className="text-xs text-slate-600">
                  โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (วิทยาเขตหาดใหญ่)
                </p>
                <p className="text-sm font-bold text-[#0090FF] mt-1">{periodLabel}</p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">คำขอยืมทั้งหมด</div>
                  <div className="text-lg font-black text-slate-900">{reportData.totalRequests} รายการ</div>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                  <div className="text-[11px] text-teal-700">รับคืนแล้ว</div>
                  <div className="text-lg font-black text-[#007473]">{reportData.returnedRequestsCount} รายการ</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] text-amber-800">กำลังยืมใช้งาน</div>
                  <div className="text-lg font-black text-amber-700">{reportData.activeLoansCount} รายการ</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] text-rose-700">เกินกำหนดส่งคืน</div>
                  <div className="text-lg font-black text-rose-600">{reportData.overdueRequestsCount} รายการ</div>
                </div>
              </div>

              {/* Top Borrowed Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 border-l-4 border-[#0090FF] pl-2">
                  1. อันดับรายการครุภัณฑ์ที่มีการยืมสูงสุด
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-300 border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 py-2 px-2 text-center w-14">อันดับ</th>
                        <th className="border border-slate-300 py-2 px-2 text-left">รหัสครุภัณฑ์</th>
                        <th className="border border-slate-300 py-2 px-2 text-left">รายการครุภัณฑ์</th>
                        <th className="border border-slate-300 py-2 px-2 text-center">ยืมทั้งหมด</th>
                        <th className="border border-slate-300 py-2 px-2 text-center">รับคืนแล้ว</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topBorrowedItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-slate-300 py-4 text-center text-slate-400">
                            ไม่พบข้อมูลการยืมในช่วงเวลาที่เลือก
                          </td>
                        </tr>
                      ) : (
                        reportData.topBorrowedItems.slice(0, 10).map((item, idx) => (
                          <tr key={item.code + idx}>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 font-mono">{item.code}</td>
                            <td className="border border-slate-300 py-1.5 px-2">{item.name}</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-[#0083AF]">
                              {item.totalBorrows} ครั้ง
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold text-[#007473]">
                              {item.returnedCount} ครั้ง
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overdue / Unreturned Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 border-l-4 border-rose-500 pl-2">
                  2. รายการครุภัณฑ์ที่ค้างส่งคืน / เกินกำหนดส่งคืนมากที่สุด
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-300 border-collapse text-xs">
                    <thead>
                      <tr className="bg-rose-50 text-slate-800">
                        <th className="border border-slate-300 py-2 px-2 text-left">เลขที่คำขอ</th>
                        <th className="border border-slate-300 py-2 px-2 text-left">ผู้ขอยืม</th>
                        <th className="border border-slate-300 py-2 px-2 text-left">รายการครุภัณฑ์</th>
                        <th className="border border-slate-300 py-2 px-2 text-center">กำหนดคืน</th>
                        <th className="border border-slate-300 py-2 px-2 text-center">สถานะค้างส่ง</th>
                        <th className="border border-slate-300 py-2 px-2 text-left">ผู้รับผิดชอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.overdueDetails.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-slate-300 py-4 text-center text-emerald-700 font-semibold">
                            ไม่มีรายการค้างส่งคืนในช่วงเวลาที่เลือก
                          </td>
                        </tr>
                      ) : (
                        reportData.overdueDetails.map((d) => (
                          <tr key={d.id}>
                            <td className="border border-slate-300 py-1.5 px-2 font-mono font-bold text-[#0090FF]">
                              {d.id}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2">{d.requesterName}</td>
                            <td className="border border-slate-300 py-1.5 px-2">{d.equipmentNames}</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center">{d.borrowTo}</td>
                            <td
                              className={`border border-slate-300 py-1.5 px-2 text-center font-bold ${
                                d.overdueDays > 0 ? 'text-rose-600' : 'text-amber-700'
                              }`}
                            >
                              {d.overdueDays > 0 ? `เกินกำหนด ${d.overdueDays} วัน` : 'อยู่ระหว่างยืม'}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2">{d.responsibleNames}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
