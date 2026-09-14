import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Check, 
  RotateCcw, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Building, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  ShieldCheck,
  Ban,
  Award,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import { BorrowRequest, BorrowRequestStatus, StaffUser } from '../types';

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  onApprove: (request: BorrowRequest) => void;
  onReturnCheckIn: (request: BorrowRequest) => void;
  onPrintSlip: (request: BorrowRequest) => void;
  onCancelRequest: (requestId: string) => void;
  currentUser: StaffUser;
  onApproveItem?: (requestId: string, itemCode: string, isAgreed: boolean, note?: string) => void;
  onExecutiveApprove?: (requestId: string, executiveNote?: string) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReturnCheckIn,
  onPrintSlip,
  onCancelRequest,
  currentUser,
  onApproveItem,
  onExecutiveApprove
}) => {
  const [executiveNote, setExecutiveNote] = useState('');

  if (!isOpen || !request) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = request.borrowTo ? new Date(request.borrowTo) : null;
  if (dueDate) dueDate.setHours(23, 59, 59, 999);
  const isOverdue = dueDate && ['ยื่นขออนุมัติ', 'รอผู้บริหารอนุมัติ', 'เจ้าของให้ยืมแล้ว', 'กำลังยืมใช้งาน'].includes(request.status) && dueDate.getTime() < today.getTime();

  // Check if current user is Executive (Dr. Yada) or Admin
  const isExecutiveUser = currentUser.email.toLowerCase() === 'yada.d@psu.ac.th' || currentUser.role === 'executive' || currentUser.role === 'admin';

  // Check owner approval progress
  const allOwnersApproved = request.equipmentList.every(item => item.ownerStatus === 'ยินยอม' || item.ownerApprovedAt);
  const someOwnersApproved = request.equipmentList.some(item => item.ownerStatus === 'ยินยอม' || item.ownerApprovedAt);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-400">{request.id}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  request.status === 'รอผู้บริหารอนุมัติ'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : request.status === 'เจ้าของให้ยืมแล้ว'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : request.status === 'รับคืนเรียบร้อย'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {request.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                รายละเอียดการยืม-คืน ครุภัณฑ์ โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintSlip(request)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="พิมพ์แบบฟอร์ม ม.อ."
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบยืม</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Overdue alert banner if applicable */}
          {isOverdue && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <div className="text-xs font-bold">แจ้งเตือน: เกินกำหนดส่งคืนครุภัณฑ์!</div>
                <div className="text-xs text-red-700 mt-0.5">
                  กำหนดส่งคืนคือ {request.borrowTo} {request.borrowToTime || ''} น. กรุณาประสานงานผู้ขอยืมเพื่อส่งมอบคืนและตรวจสภาพ
                </div>
              </div>
            </div>
          )}

          {/* Workflow Progress Steps */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-3">ลำดับขั้นตอนการอนุมัติ (Approval Workflow):</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className={`p-2 rounded-lg border ${
                ['ยื่นขออนุมัติ', 'รอผู้บริหารอนุมัติ', 'เจ้าของให้ยืมแล้ว', 'กำลังยืมใช้งาน', 'คืนครุภัณฑ์แล้ว', 'รับคืนเรียบร้อย', 'เสร็จสิ้น'].includes(request.status)
                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                1. ยื่นขออนุมัติ
              </div>
              <div className={`p-2 rounded-lg border ${
                allOwnersApproved || ['รอผู้บริหารอนุมัติ', 'เจ้าของให้ยืมแล้ว', 'กำลังยืมใช้งาน', 'คืนครุภัณฑ์แล้ว', 'รับคืนเรียบร้อย', 'เสร็จสิ้น'].includes(request.status)
                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                  : someOwnersApproved
                  ? 'bg-amber-50 border-amber-300 text-amber-800 font-medium'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                2. เจ้าของให้ยืม
              </div>
              <div className={`p-2 rounded-lg border ${
                ['เจ้าของให้ยืมแล้ว', 'กำลังยืมใช้งาน', 'คืนครุภัณฑ์แล้ว', 'รับคืนเรียบร้อย', 'เสร็จสิ้น'].includes(request.status)
                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                  : request.status === 'รอผู้บริหารอนุมัติ'
                  ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold animate-pulse'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                3. ผู้บริหารอนุมัติ
              </div>
              <div className={`p-2 rounded-lg border ${
                ['รับคืนเรียบร้อย', 'เสร็จสิ้น'].includes(request.status)
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                4. ตรวจรับคืน
              </div>
            </div>
          </div>

          {/* Section: Executive Approval Box (ดร.สพ.ญ.ญาดา ดวงนำสว่าง) */}
          {request.status === 'รอผู้บริหารอนุมัติ' && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-200 text-amber-900 mt-0.5">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                    <span>ขั้นตอนสำคัญ: รอผู้มีอำนาจอนุมัติให้ยืมครุภัณฑ์</span>
                    <span className="bg-amber-200/80 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      ขั้นที่ 3
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-1">
                    <strong>ผู้มีอำนาจอนุมัติ:</strong> รองผู้อำนวยการโรงพยาบาลสัตว์ ฝ่ายบริหารผลิตภัณฑ์ และเวชภัณฑ์{' '}
                    <span className="text-indigo-900 font-semibold">(ดร.สพ.ญ.ญาดา ดวงนำสว่าง, email: yada.d@psu.ac.th)</span>
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    * เจ้าของครุภัณฑ์ทุกรายการได้กดยินยอมให้ยืมแล้ว รอการอนุมัติขั้นสุดท้ายจากผู้บริหารก่อนเริ่มยืมใช้งาน
                  </p>
                </div>
              </div>

              {isExecutiveUser ? (
                <div className="pt-2 border-t border-amber-200 space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      ข้อคิดเห็น / คำสั่งการของผู้บริหาร (ดร.สพ.ญ.ญาดา ดวงนำสว่าง):
                    </label>
                    <input
                      type="text"
                      value={executiveNote}
                      onChange={(e) => setExecutiveNote(e.target.value)}
                      placeholder="เช่น อนุมัติให้ยืมตามระเบียบโรงพยาบาลสัตว์ ม.อ., ขอให้ดูแลความสะอาด..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onExecutiveApprove ? onExecutiveApprove(request.id, executiveNote) : onApprove(request)}
                      className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>อนุมัติการยืมครุภัณฑ์ (ดร.สพ.ญ.ญาดา ดวงนำสว่าง)</span>
                    </button>
                    <span className="text-[11px] text-amber-800">
                      คุณกำลังปฏิบัติหน้าที่ในฐานะ {currentUser.name} ({currentUser.roleLabel || currentUser.role})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-white/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    ระบบกำลังรอการลงนาม/กดอนุมัติจาก <strong>ดร.สพ.ญ.ญาดา ดวงนำสว่าง</strong> (yada.d@psu.ac.th) หรือ ผู้ดูแลระบบ (Admin)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Executive Approved Badge if already approved */}
          {request.executiveApprovedAt && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong>ผ่านการอนุมัติจากผู้บริหารแล้ว:</strong> {request.executiveApprovedBy || 'ดร.สพ.ญ.ญาดา ดวงนำสว่าง'}
                </span>
                {request.executiveNotes && (
                  <span className="text-slate-600 italic">"{request.executiveNotes}"</span>
                )}
              </div>
              <span className="text-[11px] text-emerald-700 font-mono">
                {new Date(request.executiveApprovedAt).toLocaleString('th-TH')}
              </span>
            </div>
          )}

          {/* Requester & Schedule Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Requester Info */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>ข้อมูลผู้ขอยืม (ยืนยันตัวตน PSU SSO / OIDC)</span>
                </span>
                {request.requesterUsername && (
                  <span className="text-[10px] font-mono bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 font-medium">
                    @{request.requesterUsername}
                  </span>
                )}
              </h4>
              <div className="text-xs space-y-1.5 text-slate-600">
                <div>
                  <span className="text-slate-400">ชื่อ-สกุล:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {request.requesterTitleTh ? `${request.requesterTitleTh}${request.requesterFirstNameTh || ''} ${request.requesterLastNameTh || ''}`.trim() : request.requesterName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">ตำแหน่ง (position_th):</span>{' '}
                  <span>{request.requesterPositionTh || request.requesterPosition}</span>
                </div>
                <div>
                  <span className="text-slate-400">สังกัด/คณะ (faculty_th):</span>{' '}
                  <span>{request.requesterFacultyTh || request.requesterDept}</span>
                </div>
                <div>
                  <span className="text-slate-400">อีเมล PSU (email):</span>{' '}
                  <span className="font-mono text-blue-700 font-medium">{request.requesterEmail}</span>
                </div>
              </div>

              {request.submittedByAdmin && (
                <div className="mt-3 p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-purple-950">ดำเนินการยื่นคำขอโดยผู้ดูแลระบบ:</span>{' '}
                    <span>{request.submittedByAdminName || 'ผู้ดูแลระบบ'} ({request.submittedByAdminEmail || '-'}) ได้ดำเนินการยื่นคำขอยืมครุภัณฑ์แทนบุคลากรท่านนี้</span>
                  </div>
                </div>
              )}
            </div>

            {/* Borrow Schedule */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                กำหนดระยะเวลายืม - ส่งคืน
              </h4>
              <div className="text-xs space-y-1.5 text-slate-600">
                <div>
                  <span className="text-slate-400">วันที่เริ่มยืม:</span>{' '}
                  <span className="font-semibold text-slate-900">{request.borrowFrom}</span>{' '}
                  {request.borrowFromTime && <span>เวลา {request.borrowFromTime} น.</span>}
                </div>
                <div>
                  <span className="text-slate-400">กำหนดส่งคืน:</span>{' '}
                  <span className="font-semibold text-red-700">{request.borrowTo}</span>{' '}
                  {request.borrowToTime && <span>เวลา {request.borrowToTime} น.</span>}
                </div>
                <div>
                  <span className="text-slate-400">วัตถุประสงค์:</span>{' '}
                  <span className="text-slate-900 font-medium">{request.purpose}</span>
                </div>
                <div>
                  <span className="text-slate-400">บันทึกเมื่อ:</span>{' '}
                  <span>{new Date(request.createdAt).toLocaleString('th-TH')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Items List & Per-Item Owner Approval */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                รายการครุภัณฑ์และการอนุมัติของเจ้าของแต่ละท่าน ({request.equipmentList.length} รายการ)
              </h4>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                * แยกให้เจ้าของแต่ละรายการเป็นผู้กดยินยอมเอง
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">ลำดับ</th>
                    <th className="py-2.5 px-3">รหัส/ชื่อครุภัณฑ์</th>
                    <th className="py-2.5 px-3">สถานที่จัดเก็บ</th>
                    <th className="py-2.5 px-3">เจ้าของครุภัณฑ์</th>
                    <th className="py-2.5 px-3 text-center">การอนุมัติของเจ้าของ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {request.equipmentList.map((item, idx) => {
                    // Check if current user is owner of this specific item or admin
                    const isOwnerOfThisItem = 
                      currentUser.role === 'admin' ||
                      (item.responsibleEmail && currentUser.email.toLowerCase() === item.responsibleEmail.toLowerCase()) ||
                      (currentUser.name && item.responsible && currentUser.name.trim() === item.responsible.trim());

                    const isItemApproved = item.ownerStatus === 'ยินยอม' || item.ownerApprovedAt;
                    const isItemRejected = item.ownerStatus === 'ไม่อนุมัติ';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-slate-800 font-semibold">{item.code}</div>
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400">สภาพก่อนยืม: {item.condBefore || 'ปกติสมบูรณ์'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{item.location || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <div className="font-semibold text-slate-900">{item.responsible}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.responsibleEmail || '-'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isItemApproved ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                เจ้าของยินยอมแล้ว
                              </span>
                              {item.ownerApprovedAt && (
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(item.ownerApprovedAt).toLocaleDateString('th-TH')}
                                </span>
                              )}
                            </div>
                          ) : isItemRejected ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              ✕ ไม่อนุมัติ
                            </span>
                          ) : (
                            <div>
                              {request.status === 'ยื่นขออนุมัติ' || request.status === 'รอผู้บริหารอนุมัติ' ? (
                                isOwnerOfThisItem ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onApproveItem && onApproveItem(request.id, item.code, true)}
                                      className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                                      title="กดให้ยืมในฐานะเจ้าของครุภัณฑ์นี้"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>ยินยอมให้ยืม</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onApproveItem && onApproveItem(request.id, item.code, false)}
                                      className="p-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="ปฏิเสธคำขอ"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                    รอคุณ {item.responsible} อนุมัติ
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              {['ยื่นขออนุมัติ', 'รอผู้บริหารอนุมัติ'].includes(request.status) && (
                <button
                  onClick={() => onCancelRequest(request.id)}
                  className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition font-medium cursor-pointer flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>ยกเลิกคำขอยืม</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              {/* Quick Overall Owner Approval (only if current user is admin or owner) */}
              {request.status === 'ยื่นขออนุมัติ' && (currentUser.role === 'admin' || someOwnersApproved) && (
                <button
                  onClick={() => onApprove(request)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ส่งต่อผู้บริหารอนุมัติ</span>
                </button>
              )}

              {/* Return Check In button */}
              {(request.status === 'เจ้าของให้ยืมแล้ว' || request.status === 'กำลังยืมใช้งาน') && (
                <button
                  onClick={() => onReturnCheckIn(request)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ตรวจรับคืนครุภัณฑ์</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
