import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Building, 
  Check, 
  Info,
  ShieldCheck,
  AlertCircle,
  Lock,
  BadgeCheck,
  KeyRound
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster, BorrowedEquipmentItem, StaffUser } from '../types';

interface BorrowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: BorrowRequest) => void;
  masterEquipment: EquipmentMaster[];
  currentUser: StaffUser;
  staffDatabase?: StaffUser[];
}

export const BorrowFormModal: React.FC<BorrowFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  masterEquipment,
  currentUser
}) => {
  // OIDC Claims extracted from psusso.psu.ac.th/application/o/vet-hr/.well-known/openid-configuration
  const [titleTh, setTitleTh] = useState(currentUser.title_th || '');
  const [firstNameTh, setFirstNameTh] = useState(currentUser.first_name_th || currentUser.name.split(' ')[0] || '');
  const [lastNameTh, setLastNameTh] = useState(currentUser.last_name_th || currentUser.name.split(' ').slice(1).join(' ') || '');
  const [username, setUsername] = useState(currentUser.username || currentUser.preferred_username || currentUser.email.split('@')[0]);
  const [email, setEmail] = useState(currentUser.email);
  const [positionTh, setPositionTh] = useState(currentUser.position_th || currentUser.position || 'บุคลากร');
  const [facultyTh, setFacultyTh] = useState(currentUser.faculty_th || currentUser.dept || 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์');
  const [purpose, setPurpose] = useState('');
  
  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const [borrowFrom, setBorrowFrom] = useState(todayStr);
  const [borrowFromTime, setBorrowFromTime] = useState('08:30');
  const [borrowTo, setBorrowTo] = useState(tomorrowStr);
  const [borrowToTime, setBorrowToTime] = useState('16:30');

  const [selectedItems, setSelectedItems] = useState<BorrowedEquipmentItem[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync with current authenticated user whenever modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setTitleTh(currentUser.title_th || '');
      setFirstNameTh(currentUser.first_name_th || currentUser.name.split(' ')[0] || '');
      setLastNameTh(currentUser.last_name_th || currentUser.name.split(' ').slice(1).join(' ') || '');
      setUsername(currentUser.username || currentUser.preferred_username || currentUser.email.split('@')[0]);
      setEmail(currentUser.email);
      setPositionTh(currentUser.position_th || currentUser.position || 'บุคลากร');
      setFacultyTh(currentUser.faculty_th || currentUser.dept || 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์');
      setErrorMsg('');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleToggleSelectMaster = (eq: EquipmentMaster) => {
    const exists = selectedItems.some(i => i.code === eq.code);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.code !== eq.code));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          code: eq.code,
          name: eq.name,
          location: eq.location,
          responsible: eq.responsible,
          responsibleEmail: eq.responsibleEmail,
          condBefore: eq.condition || 'ปกติสมบูรณ์',
          ownerStatus: 'รอเจ้าของตกลง',
          ownerCondition: 'ปกติ',
          ownerNote: ''
        }
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!purpose.trim()) {
      setErrorMsg('กรุณากรอกวัตถุประสงค์ในการยืม');
      return;
    }
    if (!borrowFrom || !borrowTo) {
      setErrorMsg('กรุณาระบุวันที่จะยืมและวันส่งคืนให้ครบถ้วน');
      return;
    }
    if (new Date(borrowTo) < new Date(borrowFrom)) {
      setErrorMsg('วันส่งคืนต้องไม่น้อยกว่าวันที่เริ่มยืม');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('กรุณาเลือกครุภัณฑ์/อุปกรณ์ที่ต้องการยืมอย่างน้อย 1 รายการ');
      return;
    }

    // Generate Request ID similar to REQ-XXXXXX
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `REQ-${randomHex}`;

    const fullThaiName = `${titleTh ? titleTh : ''}${firstNameTh} ${lastNameTh}`.trim() || currentUser.name;

    const newRequest: BorrowRequest = {
      id: newId,
      status: 'ยื่นขออนุมัติ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requesterName: fullThaiName,
      requesterTitleTh: titleTh,
      requesterFirstNameTh: firstNameTh,
      requesterLastNameTh: lastNameTh,
      requesterUsername: username,
      requesterEmail: email,
      requesterPositionTh: positionTh,
      requesterPosition: positionTh,
      requesterFacultyTh: facultyTh,
      requesterDept: facultyTh,
      purpose: purpose.trim(),
      borrowFrom,
      borrowFromTime,
      borrowTo,
      borrowToTime,
      equipmentList: selectedItems
    };

    onSubmit(newRequest);
  };

  // Filter master catalog
  const filteredCatalog = masterEquipment.filter(eq => {
    const q = equipmentSearch.toLowerCase();
    const matchQ = !q || eq.name.toLowerCase().includes(q) || eq.code.toLowerCase().includes(q) || eq.responsible.toLowerCase().includes(q);
    const matchCat = categoryFilter === 'ALL' || eq.category === categoryFilter;
    return matchQ && matchCat;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Plus className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">แบบฟอร์มขอยืมครุภัณฑ์และอุปกรณ์</h3>
              <p className="text-xs text-blue-200">โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Requester Information - Directly from PSU OIDC Claims */}
          <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. ข้อมูลผู้ขอยืม (Requester Profile)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ดึงข้อมูลอัตโนมัติจากระบบยืนยันตัวตน PSU SSO / OpenID Connect
                  </p>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full shadow-2xs">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>ยืนยันตัวตนแล้วจาก psusso.psu.ac.th</span>
              </div>
            </div>

            {/* OIDC Claims Connection Notification */}
            <div className="p-2.5 bg-sky-50 border border-sky-200/80 rounded-lg text-xs text-sky-900 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-sky-950">ข้อมูลจาก OpenID Connect Endpoint:</span>{' '}
                ระบบนำค่า Claims จาก <code className="bg-sky-100/90 text-sky-900 px-1 py-0.5 rounded text-[11px] font-mono">psusso.psu.ac.th/application/o/vet-hr/.well-known/openid-configuration</code> ที่เข้าใช้งานมาแสดงในแบบฟอร์มโดยตรงเพื่อความถูกต้องของสิทธิ์ ไม่ต้องพิมพ์หรือเลือกชื่อผู้ใช้อื่น
              </div>
            </div>

            {/* Row 1: Thai Name Claims (title_th, first_name_th, last_name_th) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>ชื่อ-นามสกุล ภาษาไทย (Thai Name Claims)</span>
                <span className="text-slate-400 font-normal lowercase">(title_th + first_name_th + last_name_th)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={titleTh}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold cursor-not-allowed select-none shadow-2xs"
                      title="คำนำหน้านามภาษาไทย (title_th)"
                    />
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">คำนำหน้านาม (title_th)</span>
                </div>

                <div className="sm:col-span-4">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={firstNameTh}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold cursor-not-allowed select-none shadow-2xs"
                      title="ชื่อจริงภาษาไทย (first_name_th)"
                    />
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">ชื่อจริงภาษาไทย (first_name_th)</span>
                </div>

                <div className="sm:col-span-5">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={lastNameTh}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold cursor-not-allowed select-none shadow-2xs"
                      title="นามสกุลภาษาไทย (last_name_th)"
                    />
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">นามสกุลภาษาไทย (last_name_th)</span>
                </div>
              </div>
            </div>

            {/* Row 2: Account Claims (username / preferred_username & email) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>ชื่อบัญชีผู้ใช้ (username / preferred_username)</span>
                  <span className="text-slate-400 text-[10px] lowercase font-mono">PSU Passport</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={username}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-mono cursor-not-allowed select-none shadow-2xs"
                  />
                  <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>อีเมลผู้ใช้งาน (email)</span>
                  <span className="text-slate-400 text-[10px] lowercase font-mono">PSU Email</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-blue-800 font-mono font-medium cursor-not-allowed select-none shadow-2xs"
                  />
                  <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Row 3: Position & Faculty Claims (position_th & faculty_th) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ตำแหน่งงานภาษาไทย (position_th)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={positionTh}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 cursor-not-allowed select-none shadow-2xs"
                  />
                  <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ชื่อคณะ หรือ หน่วยงานระดับคณะ (faculty_th)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={facultyTh}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 cursor-not-allowed select-none shadow-2xs"
                  />
                  <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Purpose & Borrow Period */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              2. กำหนดเวลาและวัตถุประสงค์ในการยืม
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                วัตถุประสงค์ในการนำไปใช้งาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="เช่น การเรียนการสอนรายวิชา 145-694 คลินิกปฏิบัติสัตว์น้ำ หรือ ผ่าตัดฉุกเฉิน"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  วันที่เริ่มขอยืม
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={borrowFrom}
                    onChange={(e) => setBorrowFrom(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="time"
                    value={borrowFromTime}
                    onChange={(e) => setBorrowFromTime(e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  กำหนดส่งคืนครุภัณฑ์ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={borrowTo}
                    onChange={(e) => setBorrowTo(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="time"
                    value={borrowToTime}
                    onChange={(e) => setBorrowToTime(e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Select Equipment */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                3. เลือกรายการครุภัณฑ์และอุปกรณ์ที่ขอยืม ({selectedItems.length} รายการ)
              </h4>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>ดึงข้อมูลจาก Sheet ครุภัณฑ์ เท่านั้น ({masterEquipment.length} รายการ)</span>
              </span>
            </div>

            {/* Selected equipment chips */}
            {selectedItems.length > 0 && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                <span className="text-[11px] font-semibold text-blue-900 block">
                  รายการที่เลือกยืมแล้ว:
                </span>
                <div className="space-y-1.5">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-2xs text-xs"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="text-slate-500 font-mono ml-2">[{item.code}]</span>
                        <span className="text-slate-400 ml-2">ผู้ดูแล: {item.responsible}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-md transition"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Master Selector Search & Catalog */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    placeholder="ค้นหาชื่อครุภัณฑ์, รหัส หรือผู้รับผิดชอบ..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                >
                  <option value="ALL">หมวดหมู่ทั้งหมด</option>
                  <option value="เครื่องมือวินิจฉัย/เอ็กซเรย์">เครื่องมือวินิจฉัย/เอ็กซเรย์</option>
                  <option value="เครื่องมือผ่าตัด/ศัลยกรรม">เครื่องมือผ่าตัด/ศัลยกรรม</option>
                  <option value="เครื่องมือตรวจและเฝ้าระวัง">เครื่องมือตรวจและเฝ้าระวัง</option>
                  <option value="อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู">อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู</option>
                </select>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {filteredCatalog.map((eq) => {
                  const isSelected = selectedItems.some(i => i.code === eq.code);
                  const isBorrowed = eq.status === 'ถูกยืมใช้งาน';

                  return (
                    <div
                      key={eq.id}
                      onClick={() => handleToggleSelectMaster(eq)}
                      className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{eq.name}</span>
                            {isBorrowed && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800">
                                กำลังถูกยืม (ส่งคืน {eq.currentDueTo || ''})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-blue-700 font-medium">{eq.code}</span>
                            {eq.brand && eq.brand !== 'N/A' && <span className="ml-1.5">• ยี่ห้อ: {eq.brand}</span>}
                            {eq.location && <span className="ml-1.5">• สถานที่: {eq.location}</span>}
                            {eq.responsible && <span className="ml-1.5">• ผู้ดูแล: {eq.responsible}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          eq.status === 'พร้อมใช้งาน' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {eq.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              id="btn-submit-borrow-request"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:scale-98 rounded-lg shadow-sm shadow-blue-700/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ส่งคำขอยืมครุภัณฑ์ (ยื่นขออนุมัติ)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
