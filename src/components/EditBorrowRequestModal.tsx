import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  Edit3,
  Check,
  Building,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster, BorrowedEquipmentItem, StaffUser } from '../types';

interface EditBorrowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  onSave: (updatedRequest: BorrowRequest) => void;
  masterEquipment: EquipmentMaster[];
  currentUser: StaffUser;
  staffDatabase?: StaffUser[];
}

export const EditBorrowRequestModal: React.FC<EditBorrowRequestModalProps> = ({
  isOpen,
  onClose,
  request,
  onSave,
  masterEquipment,
  currentUser,
  staffDatabase = []
}) => {
  if (!isOpen || !request) return null;

  // Form states
  const [borrowFrom, setBorrowFrom] = useState(request.borrowFrom || '');
  const [borrowFromTime, setBorrowFromTime] = useState(request.borrowFromTime || '08:30');
  const [borrowTo, setBorrowTo] = useState(request.borrowTo || '');
  const [borrowToTime, setBorrowToTime] = useState(request.borrowToTime || '16:30');
  const [purpose, setPurpose] = useState(request.purpose || '');
  
  // Requester states
  const [requesterName, setRequesterName] = useState(request.requesterName || '');
  const [requesterPosition, setRequesterPosition] = useState(request.requesterPosition || '');
  const [requesterDept, setRequesterDept] = useState(request.requesterDept || '');
  const [requesterEmail, setRequesterEmail] = useState(request.requesterEmail || '');
  
  // Equipment items state
  const [equipmentList, setEquipmentList] = useState<BorrowedEquipmentItem[]>(
    request.equipmentList ? JSON.parse(JSON.stringify(request.equipmentList)) : []
  );

  // Search & add new equipment
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  
  // Reason / Note
  const [editReason, setEditReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when request prop changes
  useEffect(() => {
    if (request) {
      setBorrowFrom(request.borrowFrom || '');
      setBorrowFromTime(request.borrowFromTime || '08:30');
      setBorrowTo(request.borrowTo || '');
      setBorrowToTime(request.borrowToTime || '16:30');
      setPurpose(request.purpose || '');
      setRequesterName(request.requesterName || '');
      setRequesterPosition(request.requesterPosition || '');
      setRequesterDept(request.requesterDept || '');
      setRequesterEmail(request.requesterEmail || '');
      setEquipmentList(request.equipmentList ? JSON.parse(JSON.stringify(request.equipmentList)) : []);
      setEditReason('');
      setErrorMsg('');
      setShowAddEquipment(false);
      setEquipmentSearch('');
    }
  }, [request]);

  // Filter available equipment for adding
  const availableEquipment = useMemo(() => {
    const currentCodes = new Set(equipmentList.map(item => item.code.toLowerCase()));
    return masterEquipment
      .filter(eq => !currentCodes.has(eq.code.toLowerCase()))
      .filter(eq => {
        if (!equipmentSearch.trim()) return true;
        const q = equipmentSearch.toLowerCase();
        return (
          eq.name.toLowerCase().includes(q) ||
          eq.code.toLowerCase().includes(q) ||
          (eq.brand && eq.brand.toLowerCase().includes(q)) ||
          (eq.location && eq.location.toLowerCase().includes(q)) ||
          (eq.responsible && eq.responsible.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  }, [masterEquipment, equipmentList, equipmentSearch]);

  // Remove equipment item
  const handleRemoveItem = (code: string) => {
    if (equipmentList.length <= 1) {
      setErrorMsg('คำขอยืมต้องมีครุภัณฑ์อย่างน้อย 1 รายการ (หากต้องการยกเลิกคำขอ ให้ใช้ปุ่มยกเลิกคำขอยืมแทน)');
      return;
    }
    setErrorMsg('');
    setEquipmentList(prev => prev.filter(item => item.code !== code));
  };

  // Add equipment item
  const handleAddEquipment = (eq: EquipmentMaster) => {
    setErrorMsg('');
    const newItem: BorrowedEquipmentItem = {
      code: eq.code,
      name: eq.name,
      location: eq.location || 'คณะสัตวแพทยศาสตร์ ม.อ.',
      responsible: eq.responsible || 'รพ.สัตว์ ม.อ.',
      responsibleEmail: eq.responsibleEmail || 'vethospital@psu.ac.th',
      condBefore: 'ปกติสมบูรณ์',
      ownerStatus: 'รอเจ้าของตกลง'
    };
    setEquipmentList(prev => [...prev, newItem]);
    setEquipmentSearch('');
  };

  // Quick choose requester from staff database
  const handleSelectStaff = (staff: StaffUser) => {
    setRequesterName(staff.name);
    setRequesterPosition(staff.position_th || staff.position || '');
    setRequesterDept(staff.faculty_th || staff.dept || '');
    setRequesterEmail(staff.email);
  };

  // Save handler
  const handleSave = () => {
    if (!borrowFrom || !borrowTo) {
      setErrorMsg('กรุณาระบุวันที่เริ่มยืมและกำหนดส่งคืนให้ครบถ้วน');
      return;
    }
    if (new Date(borrowTo) < new Date(borrowFrom)) {
      setErrorMsg('กำหนดส่งคืนต้องไม่อยู่ก่อนวันที่เริ่มยืม');
      return;
    }
    if (equipmentList.length === 0) {
      setErrorMsg('กรุณาระบุครุภัณฑ์อย่างน้อย 1 รายการ');
      return;
    }
    if (!requesterName.trim()) {
      setErrorMsg('กรุณาระบุชื่อผู้ขอยืม');
      return;
    }

    const nowIso = new Date().toISOString();
    const nowTh = new Date().toLocaleString('th-TH');

    // Build audit note
    const editHistoryEntry = `[แก้ไขโดย ${currentUser.name} (${currentUser.roleLabel || currentUser.role}) เมื่อ ${nowTh}${editReason ? `: ${editReason}` : ''}]`;
    const updatedNotes = request.notes 
      ? `${request.notes}\n${editHistoryEntry}`
      : editHistoryEntry;

    const updatedRequest: BorrowRequest = {
      ...request,
      borrowFrom,
      borrowFromTime,
      borrowTo,
      borrowToTime,
      purpose,
      requesterName,
      requesterPosition,
      requesterDept,
      requesterEmail,
      equipmentList,
      notes: updatedNotes,
      updatedAt: nowIso
    };

    onSave(updatedRequest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-amber-300">แก้ไขคำขอยืม: {request.id}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {request.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ผู้ดูแลระบบสามารถแก้ไขวันที่, สลับ/เปลี่ยนครุภัณฑ์ที่เลือกผิด, หรือปรับแก้ข้อมูลคำขอได้โดยตรง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Dates & Times (แก้ไขช่วงวัน-เวลา) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>กำหนดระยะเวลายืม - ส่งคืน (แก้ไขวันที่/เวลา)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Borrow From */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <span>วันที่เริ่มยืม</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={borrowFrom}
                    onChange={(e) => setBorrowFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="time"
                    value={borrowFromTime}
                    onChange={(e) => setBorrowFromTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Borrow To */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <span>กำหนดส่งคืน</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={borrowTo}
                    onChange={(e) => setBorrowTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900"
                  />
                  <input
                    type="time"
                    value={borrowToTime}
                    onChange={(e) => setBorrowToTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Equipment Items (แก้ไข/ลบรายการที่กดผิด + เพิ่มรายการใหม่) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>รายการครุภัณฑ์ที่ยืม ({equipmentList.length} รายการ)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddEquipment(!showAddEquipment)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddEquipment ? 'ปิดช่องค้นหา' : '+ เพิ่ม/เปลี่ยนครุภัณฑ์'}</span>
              </button>
            </div>

            {/* Existing equipment list */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">รหัส</th>
                    <th className="py-2 px-3">ชื่อครุภัณฑ์</th>
                    <th className="py-2 px-3">สถานที่/ห้อง</th>
                    <th className="py-2 px-3">เจ้าของครุภัณฑ์</th>
                    <th className="py-2 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipmentList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-semibold text-blue-700">{item.code}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{item.name}</td>
                      <td className="py-2 px-3 text-slate-500">{item.location || '-'}</td>
                      <td className="py-2 px-3 text-slate-700">
                        <div>{item.responsible || '-'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.responsibleEmail || ''}</div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.code)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                          title="ลบรายการนี้ (กรณีเลือกผิด)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Equipment Drawer / Search */}
            {showAddEquipment && (
              <div className="p-3 rounded-xl bg-white border border-blue-200 space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    ค้นหาและเลือกครุภัณฑ์จากคลัง 249 รายการ เพื่อเพิ่มลงในคำขอ:
                  </span>
                  <span className="text-[11px] text-slate-500">คลิก "+ เพิ่ม" ที่รายการที่ต้องการ</span>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    placeholder="ค้นหาชื่อครุภัณฑ์, รหัส (รพส-xxx), ยี่ห้อ, ห้องติดตั้ง..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {availableEquipment.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      ไม่พบครุภัณฑ์ที่ตรงกับการค้นหา หรือรายการนี้ถูกเพิ่มไปแล้ว
                    </div>
                  ) : (
                    availableEquipment.map((eq) => (
                      <div key={eq.code} className="p-2 flex items-center justify-between hover:bg-blue-50/50 transition text-xs">
                        <div className="pr-2">
                          <div className="font-semibold text-slate-900">
                            <span className="font-mono text-blue-700 mr-1.5">{eq.code}</span>
                            {eq.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {eq.brand ? `${eq.brand} ` : ''}{eq.model ? `(${eq.model}) ` : ''}• สถานที่: {eq.location || '-'} • ผู้ดูแล: {eq.responsible || '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddEquipment(eq)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md shrink-0 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>เพิ่ม</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Purpose (วัตถุประสงค์) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>วัตถุประสงค์การยืม</span>
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="ระบุวัตถุประสงค์ในการยืม เช่น การเรียนการสอน, ผ่าตัดฉุกเฉิน..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Section 4: Requester Info (ข้อมูลผู้ขอยืม) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>ข้อมูลผู้ขอยืม (สามารถปรับเปลี่ยนได้กรณีระบุผิดคน)</span>
              </h4>
              {staffDatabase.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  ฐานข้อมูลบุคลากร ม.อ. ({staffDatabase.length} ท่าน)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ชื่อ-สกุล ผู้ยืม</label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">อีเมล PSU (email)</label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ตำแหน่ง (position)</label>
                <input
                  type="text"
                  value={requesterPosition}
                  onChange={(e) => setRequesterPosition(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">สังกัด / ภาควิชา (department)</label>
                <input
                  type="text"
                  value={requesterDept}
                  onChange={(e) => setRequesterDept(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Admin Edit Note (หมายเหตุการแก้ไข) */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
              <span>บันทึกเหตุผลการแก้ไขโดยผู้ดูแลระบบ (Audit Note):</span>
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="เช่น แก้ไขกำหนดส่งคืนตามที่ผู้ยืมแจ้งประสานงาน, สลับเปลี่ยนครุภัณฑ์เนื่องจากผู้ยืมเลือกผิดรุ่น"
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <p className="text-[11px] text-amber-800">
              * ระบบจะบันทึกประวัติการแก้ไขและซิงก์อัปเดตบรรทัดของคำขอนี้ลงใน Google Sheets ให้โดยอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการแก้ไข (อัปเดตลง Google Sheets)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
