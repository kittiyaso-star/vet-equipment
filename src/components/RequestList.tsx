import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  RotateCcw, 
  Printer, 
  Calendar, 
  Clock, 
  AlertCircle, 
  User, 
  Package, 
  Building,
  Check,
  XCircle,
  Tag,
  Award,
  ShieldCheck,
  UserCheck,
  Edit3
} from 'lucide-react';
import { BorrowRequest, BorrowRequestStatus } from '../types';

interface RequestListProps {
  requests: BorrowRequest[];
  currentStaffEmail: string;
  onViewDetails: (request: BorrowRequest) => void;
  onApproveRequest: (request: BorrowRequest) => void;
  onReturnCheckIn: (request: BorrowRequest) => void;
  onPrintSlip: (request: BorrowRequest) => void;
  onQuickStatusChange?: (requestId: string, newStatus: BorrowRequestStatus) => void;
  currentPortal?: 'user' | 'admin';
  isAdmin?: boolean;
  onEditRequest?: (request: BorrowRequest) => void;
}

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  currentStaffEmail,
  onViewDetails,
  onApproveRequest,
  onReturnCheckIn,
  onPrintSlip,
  currentPortal = 'user',
  isAdmin = false,
  onEditRequest
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [userRoleTab, setUserRoleTab] = useState<'ALL' | 'MY_REQUESTS' | 'AWAITING_MY_APPROVAL' | 'AWAITING_EXECUTIVE'>('ALL');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Extract unique departments for filtering
  const departments = Array.from(new Set(requests.map(r => r.requesterDept))).filter(Boolean);

  const getDueStatus = (req: BorrowRequest) => {
    if (['เสร็จสิ้น', 'รับคืนเรียบร้อย', 'คืนครุภัณฑ์แล้ว', 'ยกเลิกคำขอ'].includes(req.status)) {
      return { type: 'done', text: 'ส่งคืนแล้ว', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }

    if (!req.borrowTo) {
      return { type: 'unknown', text: 'ไม่ระบุวันส่งคืน', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200' };
    }

    const dueDate = new Date(req.borrowTo);
    dueDate.setHours(23, 59, 59, 999);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        type: 'overdue', 
        text: `เกินกำหนด ${Math.abs(diffDays)} วัน!`, 
        badgeClass: 'bg-red-50 text-red-700 border-red-300 font-semibold animate-pulse' 
      };
    } else if (diffDays === 0) {
      return { 
        type: 'today', 
        text: 'ครบกำหนดวันนี้', 
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold' 
      };
    } else if (diffDays <= 3) {
      return { 
        type: 'soon', 
        text: `เหลืออีก ${diffDays} วัน`, 
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' 
      };
    } else {
      return { 
        type: 'normal', 
        text: `เหลืออีก ${diffDays} วัน`, 
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' 
      };
    }
  };

  const getStatusBadge = (status: BorrowRequestStatus) => {
    switch (status) {
      case 'ยื่นขออนุมัติ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            1. ยื่นขออนุมัติ
          </span>
        );
      case 'รอผู้บริหารอนุมัติ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Award className="w-3.5 h-3.5 text-amber-700" />
            2. รอผู้บริหารอนุมัติ
          </span>
        );
      case 'เจ้าของให้ยืมแล้ว':
      case 'กำลังยืมใช้งาน':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3 text-emerald-600" />
            2. เจ้าของให้ยืมแล้ว (ส่งเมลแจ้งผู้บริหารแล้ว)
          </span>
        );
      case 'คืนครุภัณฑ์แล้ว':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <RotateCcw className="w-3 h-3" />
            3. ส่งคืนแล้ว
          </span>
        );
      case 'รับคืนเรียบร้อย':
      case 'เสร็จสิ้น':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            <CheckCircle className="w-3 h-3" />
            4. {status}
          </span>
        );
      case 'ยกเลิกคำขอ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3" />
            ยกเลิกคำขอ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const filteredRequests = requests.filter(req => {
    // User Role Tab filter
    if (userRoleTab === 'MY_REQUESTS') {
      if (req.requesterEmail.toLowerCase() !== currentStaffEmail.toLowerCase()) return false;
    } else if (userRoleTab === 'AWAITING_MY_APPROVAL') {
      const hasMyItem = req.equipmentList.some(eq => 
        eq.responsibleEmail && eq.responsibleEmail.toLowerCase() === currentStaffEmail.toLowerCase()
      );
      if (!hasMyItem || req.status !== 'ยื่นขออนุมัติ') return false;
    } else if (userRoleTab === 'AWAITING_EXECUTIVE') {
      if (req.status !== 'รอผู้บริหารอนุมัติ') return false;
    }

    // Search query match
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || 
      req.id.toLowerCase().includes(q) ||
      req.requesterName.toLowerCase().includes(q) ||
      req.requesterEmail.toLowerCase().includes(q) ||
      req.purpose.toLowerCase().includes(q) ||
      req.equipmentList.some(eq => 
        eq.name.toLowerCase().includes(q) || 
        eq.code.toLowerCase().includes(q) ||
        eq.location.toLowerCase().includes(q)
      );

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'ยื่นขออนุมัติ') {
      matchesStatus = req.status === 'ยื่นขออนุมัติ';
    } else if (statusFilter === 'รอผู้บริหารอนุมัติ') {
      matchesStatus = req.status === 'รอผู้บริหารอนุมัติ';
    } else if (statusFilter === 'ACTIVE_LOAN') {
      matchesStatus = req.status === 'เจ้าของให้ยืมแล้ว' || req.status === 'กำลังยืมใช้งาน';
    } else if (statusFilter === 'OVERDUE') {
      const due = new Date(req.borrowTo);
      due.setHours(23, 59, 59, 999);
      matchesStatus = !['เสร็จสิ้น', 'รับคืนเรียบร้อย', 'คืนครุภัณฑ์แล้ว', 'ยกเลิกคำขอ'].includes(req.status) && due.getTime() < today.getTime();
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = ['เสร็จสิ้น', 'รับคืนเรียบร้อย', 'คืนครุภัณฑ์แล้ว'].includes(req.status);
    }

    // Department filter
    const matchesDept = deptFilter === 'ALL' || req.requesterDept === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Count requests awaiting current user's approval as owner
  const myPendingApprovalCount = requests.filter(req => 
    req.status === 'ยื่นขออนุมัติ' && 
    req.equipmentList.some(eq => eq.responsibleEmail && eq.responsibleEmail.toLowerCase() === currentStaffEmail.toLowerCase())
  ).length;

  const executivePendingCount = requests.filter(req => req.status === 'รอผู้บริหารอนุมัติ').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Role Filter Tabs for User Portal */}
      <div className="bg-slate-50/80 px-4 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setUserRoleTab('ALL')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
              userRoleTab === 'ALL'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            คำขอทั้งหมด ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setUserRoleTab('MY_REQUESTS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
              userRoleTab === 'MY_REQUESTS'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            คำขอยืมของฉัน (ที่ฉันยื่น)
          </button>
          <button
            type="button"
            onClick={() => setUserRoleTab('AWAITING_MY_APPROVAL')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              userRoleTab === 'AWAITING_MY_APPROVAL'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <span>รอฉันอนุมัติ (เจ้าของ)</span>
            {myPendingApprovalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                {myPendingApprovalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setUserRoleTab('AWAITING_EXECUTIVE')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              userRoleTab === 'AWAITING_EXECUTIVE'
                ? 'bg-white text-amber-800 border-amber-500 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <span>รอผู้บริหารอนุมัติ</span>
            {executivePendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {executivePendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Table controls header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>
              {currentPortal === 'admin' ? 'รายการคำขอยืม - คืน (Admin Master View)' : 'รายการคำขอยืม - คืน ครุภัณฑ์'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {filteredRequests.length} รายการ
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentPortal === 'admin'
              ? 'ระบบดูแล ปรับปรุง และควบคุมการยืม-คืนอุปกรณ์ทั้งหมดของ รพ.สัตว์ ม.อ.'
              : 'ข้อมูลการยืมอุปกรณ์แบบเรียลไทม์ และการกดให้ยืมของเจ้าของแต่ละท่าน'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-request"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่, ผู้ยืม, ครุภัณฑ์..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            />
          </div>

          {/* Status Quick Filter */}
          <select
            value={statusFilter}
            id="select-status-filter"
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="ยื่นขออนุมัติ">1. รอเจ้าของอนุมัติ</option>
            <option value="รอผู้บริหารอนุมัติ">2. รอผู้บริหารอนุมัติ</option>
            <option value="ACTIVE_LOAN">3. กำลังยืม (เจ้าของให้ยืมแล้ว)</option>
            <option value="OVERDUE">⚠️ เกินกำหนดส่งคืน</option>
            <option value="COMPLETED">4-5. ส่งคืนเสร็จสิ้น</option>
          </select>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={deptFilter}
              id="select-dept-filter"
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">ทุกสังกัด/หน่วยงาน</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Requests Data Table */}
      {filteredRequests.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <p className="text-sm font-medium text-slate-600">ไม่พบข้อมูลคำขอยืมครุภัณฑ์</p>
          <p className="text-xs text-slate-400 mt-1">ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรอง</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setDeptFilter('ALL');
            }}
            className="mt-4 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">เลขที่คำขอ</th>
                <th className="py-3 px-4">สถานะคำขอ</th>
                <th className="py-3 px-4">ผู้ขอยืม / สังกัด</th>
                <th className="py-3 px-4">รายการครุภัณฑ์</th>
                <th className="py-3 px-4">กำหนดวันยืม - ส่งคืน</th>
                <th className="py-3 px-4">กำหนดคืน</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => {
                const dueInfo = getDueStatus(req);
                const isOverdue = dueInfo.type === 'overdue';

                return (
                  <tr 
                    key={req.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOverdue ? 'bg-red-50/30' : ''
                    }`}
                  >
                    {/* Request ID & Creation */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-700 font-bold">{req.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('th-TH') : '-'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Requester Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{req.requesterName}</span>
                        {req.submittedByAdmin && (
                          <span 
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                            title={`แอดมิน ${req.submittedByAdminName || ''} ยื่นคำขอแทน`}
                          >
                            <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>แอดมินยื่นแทน</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {req.requesterPosition} • {req.requesterDept}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {req.requesterEmail}
                      </div>
                    </td>

                    {/* Equipment list preview */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="space-y-1">
                        {req.equipmentList.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                            <div className="truncate">
                              <span className="font-medium text-slate-800">{item.name}</span>
                              <span className="text-slate-400 ml-1">({item.code})</span>
                            </div>
                          </div>
                        ))}
                        {req.equipmentList.length > 2 && (
                          <span className="inline-block text-[10px] text-blue-600 font-medium pl-3">
                            +{req.equipmentList.length - 2} รายการเพิ่มเติม...
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">
                        วัตถุประสงค์: {req.purpose}
                      </div>
                    </td>

                    {/* Borrow dates */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.borrowFrom}</span>
                        {req.borrowFromTime && <span className="text-[11px] text-slate-400">({req.borrowFromTime})</span>}
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                        <span className="text-slate-400 ml-5">ถึง</span>
                        <span>{req.borrowTo}</span>
                        {req.borrowToTime && <span className="text-[11px] text-slate-400">({req.borrowToTime})</span>}
                      </div>
                    </td>

                    {/* Due Countdown Alert */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${dueInfo.badgeClass}`}>
                        {dueInfo.text}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View details */}
                        <button
                          onClick={() => onViewDetails(req)}
                          id={`btn-view-${req.id}`}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="ดูรายละเอียดคำขอ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit request (Admin or requester) */}
                        {onEditRequest && (isAdmin || currentPortal === 'admin' || currentStaffEmail.toLowerCase() === req.requesterEmail.toLowerCase()) && (
                          <button
                            onClick={() => onEditRequest(req)}
                            id={`btn-edit-${req.id}`}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="แก้ไขคำขอยืม (แก้ไขวันที่, สลับ/เปลี่ยนครุภัณฑ์, ข้อมูลผู้ยืม)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Approve button (if pending) */}
                        {req.status === 'ยื่นขออนุมัติ' && (
                          <button
                            onClick={() => onApproveRequest(req)}
                            id={`btn-approve-${req.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                            title="เจ้าของอนุมัติให้ยืม"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติให้ยืม</span>
                          </button>
                        )}

                        {/* Return check-in (if active) */}
                        {(req.status === 'เจ้าของให้ยืมแล้ว' || req.status === 'กำลังยืมใช้งาน') && (
                          <button
                            onClick={() => onReturnCheckIn(req)}
                            id={`btn-return-${req.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                            title="ตรวจรับคืนครุภัณฑ์"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>ตรวจรับคืน</span>
                          </button>
                        )}

                        {/* Print official slip */}
                        <button
                          onClick={() => onPrintSlip(req)}
                          id={`btn-print-${req.id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="พิมพ์ใบยืม-คืน ครุภัณฑ์ (แบบฟอร์ม ม.อ.)"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
