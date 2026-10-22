import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  HelpCircle, 
  Check, 
  X, 
  Printer, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Mail,
  Edit3,
  ShieldCheck,
  Lock,
  Info
} from 'lucide-react';
import { BorrowRequest, BorrowRequestStatus, StaffUser } from '../types';

interface RequestsApprovalViewProps {
  requests: BorrowRequest[];
  onApproveRequest: (request: BorrowRequest) => void;
  onRejectRequest?: (requestId: string) => void;
  onViewDetails: (request: BorrowRequest) => void;
  onPrintSlip: (request: BorrowRequest) => void;
  onOpenEdit?: (request: BorrowRequest) => void;
  currentStaffEmail: string;
  isAdmin: boolean;
}

export const RequestsApprovalView: React.FC<RequestsApprovalViewProps> = ({
  requests,
  onApproveRequest,
  onRejectRequest,
  onViewDetails,
  onPrintSlip,
  onOpenEdit,
  currentStaffEmail,
  isAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Confirmation modal state matching Image 5
  const [confirmApproveTarget, setConfirmApproveTarget] = useState<BorrowRequest | null>(null);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return requests.filter(req => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (!q) return true;

      return (
        req.id.toLowerCase().includes(q) ||
        req.requesterName.toLowerCase().includes(q) ||
        req.requesterEmail.toLowerCase().includes(q) ||
        req.purpose.toLowerCase().includes(q) ||
        req.equipmentList.some(eq => eq.name.toLowerCase().includes(q) || eq.code.toLowerCase().includes(q))
      );
    });
  }, [requests, searchTerm, statusFilter]);

  const handleConfirmApprovalAction = () => {
    if (!confirmApproveTarget) return;
    onApproveRequest(confirmApproveTarget);
    setConfirmApproveTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Controls Bar (Matching Image 5) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#0090FF]" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              รายการคำขอยืม & การอนุมัติ
            </h2>
            <p className="text-[11px] text-slate-500">
              ตรวจสอบคำขออนุมัติยืมครุภัณฑ์ และบันทึกผลการอนุมัติของเจ้าของ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่, ผู้ขอยืม, อุปกรณ์..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0090FF]"
            />
          </div>

          {/* Status Filter dropdown (Matching Image 5: สถานะทั้งหมด) */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0090FF] cursor-pointer"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="ยื่นขออนุมัติ">ยื่นขออนุมัติ</option>
            <option value="เจ้าของให้ยืมแล้ว">เจ้าของให้ยืมแล้ว</option>
            <option value="กำลังยืมใช้งาน">กำลังยืมใช้งาน</option>
            <option value="คืนครุภัณฑ์แล้ว">คืนครุภัณฑ์แล้ว</option>
            <option value="รับคืนเรียบร้อย">รับคืนเรียบร้อย</option>
            <option value="ยกเลิกคำขอ">ยกเลิกคำขอ</option>
          </select>
        </div>
      </div>

      {/* Approval Permissions & Workflow Explanatory Banner (Answers user's question directly) */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#0090FF]/10 text-[#0090FF] shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-[#0090FF]" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <span>ขั้นตอนและสิทธิ์การกดอนุมัติคำขอยืม</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0090FF] text-white text-[10px] font-semibold">
                  เฉพาะเจ้าของครุภัณฑ์ / Admin
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 text-[11px] leading-relaxed pt-1">
              <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100">
                <span className="font-bold text-slate-800">👤 ใครสามารถกดอนุมัติได้? :</span>{' '}
                <strong>เฉพาะ 'เจ้าของครุภัณฑ์'</strong> ที่รับผิดชอบอุปกรณ์ในคำขอนั้น หรือ <strong>'Admin ผู้ดูแลระบบ'</strong> เท่านั้น 
                <span className="text-rose-600 font-semibold block mt-0.5">
                  *(บุคคลอื่นหรือผู้ขอยืม ไม่สามารถกดอนุมัติแทนเจ้าของได้)*
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100">
                <span className="font-bold text-slate-800">✉️ ขั้นตอนหลังกดอนุมัติ :</span>{' '}
                เมื่อเจ้าของกดอนุญาต ระบบจะอนุมัติให้ยืมทันที พร้อม<strong>ส่งอีเมลยืนยันผลไปยัง ดร.สพ.ญ.ญาดา ดวงนำสว่าง</strong> โดยอัตโนมัติ เพื่อเป็นหลักฐานรับทราบ โดยไม่ต้องเข้ามากดอนุมัติซ้ำซ้อน
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table (Matching Image 5 layout) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">เลขที่คำขอ</th>
                <th className="py-3.5 px-4">วันที่ขอ</th>
                <th className="py-3.5 px-4">ผู้ขอ / หน่วยงาน</th>
                <th className="py-3.5 px-4">วัตถุประสงค์</th>
                <th className="py-3.5 px-4">รายการอุปกรณ์</th>
                <th className="py-3.5 px-4">กำหนดคืน</th>
                <th className="py-3.5 px-4 text-center">สถานะ</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบคำขอยืมที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isPending = req.status === 'ยื่นขออนุมัติ' || req.status === 'รอผู้บริหารอนุมัติ';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition">
                      {/* 1. เลขที่คำขอ */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0090FF]">
                        {req.id}
                      </td>

                      {/* 2. วันที่ขอ */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : '-'}
                      </td>

                      {/* 3. ผู้ขอ / หน่วยงาน */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{req.requesterName}</div>
                        <div className="text-[11px] text-slate-500">
                          {req.requesterDept || req.requesterFacultyTh || '-'}
                        </div>
                      </td>

                      {/* 4. วัตถุประสงค์ */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-[180px] truncate" title={req.purpose}>
                        {req.purpose}
                      </td>

                      {/* 5. รายการอุปกรณ์ */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="text-slate-900 font-medium truncate">
                          {req.equipmentList.map(eq => `${eq.name} (${eq.code})`).join(', ') || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {req.equipmentList.length} รายการ
                        </div>
                      </td>

                      {/* 6. กำหนดคืน */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {req.borrowTo}
                      </td>

                      {/* 7. สถานะ (Matching Image 5) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          req.status === 'ยื่นขออนุมัติ'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : req.status === 'เจ้าของให้ยืมแล้ว' || req.status === 'กำลังยืมใช้งาน'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : req.status === 'รับคืนเรียบร้อย' || req.status === 'เสร็จสิ้น'
                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {req.status}
                        </span>
                      </td>

                      {/* 8. จัดการ (Matching Image 5 action links: อนุมัติ / ไม่อนุมัติ / ดูรายละเอียด) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {isPending ? (
                            (isAdmin || req.equipmentList.some(eq => eq.responsibleEmail?.toLowerCase() === currentStaffEmail.toLowerCase())) ? (
                              <button
                                type="button"
                                onClick={() => setConfirmApproveTarget(req)}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition cursor-pointer border border-emerald-300"
                                title="ท่านมีสิทธิ์อนุมัติคำขอนี้ในฐานะเจ้าของครุภัณฑ์ หรือ Admin"
                              >
                                อนุมัติ
                              </button>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 cursor-help"
                                title="สิทธิ์การอนุมัติ: เฉพาะเจ้าของครุภัณฑ์รายการนี้ หรือ ผู้ดูแลระบบ (Admin) เท่านั้นที่กดอนุมัติได้"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                รอเจ้าของอนุมัติ
                              </span>
                            )
                          ) : null}

                          <button
                            type="button"
                            onClick={() => onViewDetails(req)}
                            className="px-2 py-1 text-xs font-semibold text-[#0090FF] hover:bg-[#0090FF]/10 rounded-lg transition cursor-pointer"
                            title="ดูรายละเอียดคำขอ"
                          >
                            ดูรายละเอียด
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintSlip(req)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="พิมพ์ใบยืม"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal (Exact match to Image 5!) */}
      {confirmApproveTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Top Question Mark Circle matching Image 5 */}
            <div className="w-20 h-20 rounded-full border-2 border-slate-300 text-slate-400 flex items-center justify-center mx-auto shadow-inner bg-slate-50/50">
              <span className="text-4xl font-light select-none">?</span>
            </div>

            {/* Modal Heading */}
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                ยืนยันการอนุมัติ?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                อนุมัติคำขอเลขที่ <span className="font-mono font-bold text-slate-800">{confirmApproveTarget.id}</span>
              </p>
              <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 mt-2">
                เมื่ออนุมัติ ระบบจะส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง ทันที
              </p>
            </div>

            {/* Modal Buttons matching Image 5 */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmApprovalAction}
                id="btn-confirm-approve-action"
                className="px-6 py-2.5 rounded-xl bg-[#007473] hover:bg-[#0083AF] text-white font-bold text-xs shadow-md shadow-[#007473]/30 active:scale-98 transition cursor-pointer"
              >
                อนุมัติคำขอ
              </button>
              <button
                type="button"
                onClick={() => setConfirmApproveTarget(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs active:scale-98 transition cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
