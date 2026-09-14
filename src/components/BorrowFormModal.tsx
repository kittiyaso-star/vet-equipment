import React, { useState, useEffect, useMemo } from 'react';
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
  KeyRound,
  UserCheck,
  Users,
  Edit3,
  UserPlus
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster, BorrowedEquipmentItem, StaffUser } from '../types';
import { formatStaffFullName } from '../services/storage';
import { extractThaiTitleAndName } from '../services/googleSheetsSync';

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
  currentUser,
  staffDatabase = []
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [isBorrowingForOther, setIsBorrowingForOther] = useState(false);
  const [otherStaffSearch, setOtherStaffSearch] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

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

  const resetToCurrentUser = () => {
    const title = (currentUser.title_th || '').trim();
    setTitleTh(title);
    let cleanName = (currentUser.name || '').trim();
    if (title && cleanName.startsWith(title)) {
      cleanName = cleanName.substring(title.length).trim();
    }
    const parts = cleanName.split(/\s+/);
    setFirstNameTh(currentUser.first_name_th || parts[0] || '');
    setLastNameTh(currentUser.last_name_th || parts.slice(1).join(' ') || '');
    setUsername(currentUser.username || currentUser.preferred_username || currentUser.email.split('@')[0]);
    setEmail(currentUser.email);
    setPositionTh(currentUser.position_th || currentUser.position || 'บุคลากร');
    setFacultyTh(currentUser.faculty_th || currentUser.dept || 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์');
    setOtherStaffSearch('');
    setIsStaffDropdownOpen(false);
  };

  const handleSelectStaff = (staff: StaffUser) => {
    let title = (staff.title_th || '').trim();
    let cleanName = (staff.name || '').trim();

    if (!title) {
      const parsed = extractThaiTitleAndName(cleanName);
      if (parsed.title) {
        title = parsed.title;
        cleanName = parsed.pureName;
      }
    } else if (cleanName.startsWith(title)) {
      cleanName = cleanName.substring(title.length).trim();
    }

    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    let first = staff.first_name_th || nameParts[0] || '';
    let last = staff.last_name_th || nameParts.slice(1).join(' ') || '';

    // If first contains space and last is empty, split correctly
    if (!last && first.includes(' ')) {
      const parts = first.split(/\s+/).filter(Boolean);
      first = parts[0] || '';
      last = parts.slice(1).join(' ') || '';
    }

    setTitleTh(title);
    setFirstNameTh(first);
    setLastNameTh(last);
    setUsername(staff.username || staff.preferred_username || staff.email.split('@')[0]);
    setEmail(staff.email);
    setPositionTh(staff.position_th || staff.position || 'บุคลากร');
    setFacultyTh(staff.faculty_th || staff.dept || 'โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์');
    setOtherStaffSearch(formatStaffFullName(title, `${first} ${last}`.trim() || cleanName));
    setIsStaffDropdownOpen(false);
  };

  const handleApplyCustomStaffName = (customNameInput: string) => {
    const raw = (customNameInput || '').trim();
    if (!raw) return;

    // Check if there is a close match in database
    const rawCompact = raw.replace(/\s+/g, '').toLowerCase();
    const matched = staffDatabase.find(s => {
      const sFull = `${s.title_th || ''}${s.name}`.replace(/\s+/g, '').toLowerCase();
      return sFull.includes(rawCompact) || rawCompact.includes(sFull);
    });

    if (matched) {
      handleSelectStaff(matched);
      return;
    }

    const parsed = extractThaiTitleAndName(raw);
    setTitleTh(parsed.title);
    setFirstNameTh(parsed.firstName || raw);
    setLastNameTh(parsed.lastName);
    
    // Generate placeholder username/email if not set
    const tempUser = `staff.${Date.now().toString().slice(-4)}`;
    setUsername(tempUser);
    setEmail(`${tempUser}@psu.ac.th`);
    setOtherStaffSearch(raw);
    setIsStaffDropdownOpen(false);
  };

  // Filter staff database for autocomplete with token & fuzzy matching
  const filteredStaff = useMemo(() => {
    if (!otherStaffSearch.trim()) return staffDatabase;
    const q = otherStaffSearch.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    return staffDatabase.filter(staff => {
      const fullName = formatStaffFullName(staff.title_th, staff.name).toLowerCase();
      const pureName = (staff.name || '').toLowerCase();
      const first = (staff.first_name_th || '').toLowerCase();
      const last = (staff.last_name_th || '').toLowerCase();
      const pos = (staff.position_th || staff.position || '').toLowerCase();
      const dept = (staff.faculty_th || staff.dept || '').toLowerCase();
      const mail = (staff.email || '').toLowerCase();
      const combined = `${fullName} ${pureName} ${first} ${last} ${pos} ${dept} ${mail}`;

      if (combined.includes(q)) return true;
      return tokens.some(tok => tok.length >= 2 && combined.includes(tok));
    });
  }, [staffDatabase, otherStaffSearch]);

  // Sync with current authenticated user whenever modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setIsBorrowingForOther(false);
      resetToCurrentUser();
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

    const fullThaiName = formatStaffFullName(titleTh, `${firstNameTh} ${lastNameTh}`.trim()) || firstNameTh || currentUser.name;

    const isDelegated = isAdmin && isBorrowingForOther;

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
      equipmentList: selectedItems,
      submittedByAdmin: isDelegated,
      submittedByAdminName: isDelegated ? currentUser.name : undefined,
      submittedByAdminEmail: isDelegated ? currentUser.email : undefined,
      notes: isDelegated
        ? `[แอดมินยื่นคำขอแทน] ผู้ดำเนินการ: ${currentUser.name} (${currentUser.email}) ยื่นขอยืมแทน: ${fullThaiName}`
        : undefined
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

          {/* Section 1: Requester Information */}
          <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            {/* Header of Section 1 */}
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
                    {isAdmin && isBorrowingForOther
                      ? 'สิทธิ์แอดมิน: ยื่นคำขอแทนบุคลากร/อาจารย์ในสังกัด'
                      : 'ดึงข้อมูลอัตโนมัติจากระบบยืนยันตัวตน PSU SSO / OpenID Connect'}
                  </p>
                </div>
              </div>
              
              {isAdmin && isBorrowingForOther ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 rounded-full shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>โหมดแอดมินยื่นแทน ({currentUser.name})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full shadow-2xs">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ยืนยันตัวตนแล้วจาก psusso.psu.ac.th</span>
                </div>
              )}
            </div>

            {/* Admin Delegation Mode Selector */}
            {isAdmin && (
              <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-200 text-purple-800 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <span>สิทธิ์ผู้ดูแลระบบ (Admin Delegation)</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-200 text-purple-900 font-semibold">แอดมิน</span>
                      </div>
                      <p className="text-[11px] text-purple-700">
                        คุณมีสิทธิ์เลือกยื่นคำขอในนามตนเอง หรือยื่นคำขอแทนบุคลากร/อาจารย์ท่านอื่นได้
                      </p>
                    </div>
                  </div>

                  {/* Mode Buttons */}
                  <div className="inline-flex p-1 bg-white rounded-lg border border-purple-200 shadow-2xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBorrowingForOther(false);
                        resetToCurrentUser();
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        !isBorrowingForOther
                          ? 'bg-purple-700 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>ขอยืมด้วยตนเอง</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsBorrowingForOther(true);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        isBorrowingForOther
                          ? 'bg-purple-700 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>ยื่นขอยืมแทนผู้อื่น</span>
                    </button>
                  </div>
                </div>

                {/* When Admin chooses to borrow for someone else */}
                {isBorrowingForOther && (
                  <div className="pt-2.5 border-t border-purple-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-purple-950 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        เลือกบุคลากรจากระบบ (Auto-fill ข้อมูล OIDC):
                      </span>
                      <span className="text-[11px] text-purple-700 font-medium">
                        พบ {staffDatabase.length} รายชื่อ หรือพิมพ์กรอกเองด้านล่างได้
                      </span>
                    </div>

                    <div className="relative">
                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="พิมพ์ค้นหาชื่อบุคลากร (เช่น เสาวคนธ์, นพ., ญาดา) หรืออีเมล..."
                          value={otherStaffSearch}
                          onChange={(e) => {
                            setOtherStaffSearch(e.target.value);
                            setIsStaffDropdownOpen(true);
                          }}
                          onFocus={() => setIsStaffDropdownOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredStaff.length > 0) {
                                handleSelectStaff(filteredStaff[0]);
                              } else if (otherStaffSearch.trim()) {
                                handleApplyCustomStaffName(otherStaffSearch);
                              }
                            }
                          }}
                          className="w-full pl-9 pr-8 py-2 bg-white border border-purple-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 placeholder-slate-400 shadow-2xs"
                        />
                        {otherStaffSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtherStaffSearch('');
                              setIsStaffDropdownOpen(true);
                            }}
                            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown list */}
                      {isStaffDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-purple-200 rounded-xl shadow-xl divide-y divide-slate-100">
                          {filteredStaff.length > 0 ? (
                            filteredStaff.map((staff) => (
                              <button
                                key={staff.id || staff.email}
                                type="button"
                                onClick={() => handleSelectStaff(staff)}
                                className="w-full px-3 py-2 text-left hover:bg-purple-50/70 transition flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <span>{formatStaffFullName(staff.title_th, staff.name)}</span>
                                    <span className="text-[10px] text-purple-700 font-normal">({staff.roleLabel || staff.role})</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {staff.position_th || staff.position} • {staff.faculty_th || staff.dept}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-[11px] text-blue-700">{staff.email}</span>
                                  <span className="block text-[10px] text-purple-700 font-medium">คลิกเพื่อเลือก</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-xs text-slate-500 text-center">
                              ไม่พบบุคลากรที่ตรงกับคำว่า &quot;{otherStaffSearch}&quot;
                            </div>
                          )}

                          {otherStaffSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => handleApplyCustomStaffName(otherStaffSearch)}
                              className="w-full px-3 py-2.5 text-left bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-medium flex items-center justify-between gap-2 border-t border-purple-200"
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span>นำชื่อนี้ไปใช้ทันที: <strong className="font-semibold text-purple-950">&quot;{otherStaffSearch.trim()}&quot;</strong></span>
                              </span>
                              <span className="text-[11px] text-purple-700 shrink-0 underline">กรอกลงฟอร์ม</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notification Banner */}
            {isAdmin && isBorrowingForOther ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-amber-950">โหมดแอดมินยื่นคำขอแทน:</span>{' '}
                  คุณกำลังยื่นคำขอในฐานะแอดมินแทนผู้ขอยืม คุณสามารถพิมพ์หรือแก้ไขข้อมูลผู้ขอยืมในช่องด้านล่างนี้ได้โดยตรง ระบบจะบันทึกประวัติว่าแอดมิน (<span className="font-semibold">{currentUser.name}</span>) เป็นผู้ดำเนินการให้
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-sky-50 border border-sky-200/80 rounded-lg text-xs text-sky-900 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-sky-950">ข้อมูลจาก OpenID Connect Endpoint:</span>{' '}
                  ระบบนำค่า Claims จาก <code className="bg-sky-100/90 text-sky-900 px-1 py-0.5 rounded text-[11px] font-mono">psusso.psu.ac.th/application/o/vet-hr/.well-known/openid-configuration</code> ที่เข้าใช้งานมาแสดงในแบบฟอร์มโดยตรงเพื่อความถูกต้องของสิทธิ์ ไม่ต้องพิมพ์หรือเลือกชื่อผู้ใช้อื่น
                </div>
              </div>
            )}

            {/* Row 1: Thai Name Claims (title_th, first_name_th, last_name_th) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>ชื่อ-นามสกุล ภาษาไทย (Thai Name Claims)</span>
                <span className="text-slate-400 font-normal lowercase">
                  {isAdmin && isBorrowingForOther ? '(แอดมินสามารถพิมพ์แก้ไขได้)' : '(title_th + first_name_th + last_name_th)'}
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly={!isAdmin || !isBorrowingForOther}
                      value={titleTh}
                      onChange={(e) => setTitleTh(e.target.value)}
                      placeholder="นาย / นาง / ผศ.ดร."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${
                        isAdmin && isBorrowingForOther
                          ? 'border-purple-300 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-purple-500 outline-none'
                          : 'border-slate-200 bg-white text-slate-800 font-semibold cursor-not-allowed select-none'
                      } shadow-2xs`}
                      title="คำนำหน้านามภาษาไทย (title_th)"
                    />
                    {isAdmin && isBorrowingForOther ? (
                      <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">คำนำหน้านาม (title_th)</span>
                </div>

                <div className="sm:col-span-4">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly={!isAdmin || !isBorrowingForOther}
                      value={firstNameTh}
                      onChange={(e) => setFirstNameTh(e.target.value)}
                      placeholder="ชื่อจริง"
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${
                        isAdmin && isBorrowingForOther
                          ? 'border-purple-300 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-purple-500 outline-none'
                          : 'border-slate-200 bg-white text-slate-800 font-semibold cursor-not-allowed select-none'
                      } shadow-2xs`}
                      title="ชื่อจริงภาษาไทย (first_name_th)"
                    />
                    {isAdmin && isBorrowingForOther ? (
                      <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">ชื่อจริงภาษาไทย (first_name_th)</span>
                </div>

                <div className="sm:col-span-5">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly={!isAdmin || !isBorrowingForOther}
                      value={lastNameTh}
                      onChange={(e) => setLastNameTh(e.target.value)}
                      placeholder="นามสกุล"
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${
                        isAdmin && isBorrowingForOther
                          ? 'border-purple-300 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-purple-500 outline-none'
                          : 'border-slate-200 bg-white text-slate-800 font-semibold cursor-not-allowed select-none'
                      } shadow-2xs`}
                      title="นามสกุลภาษาไทย (last_name_th)"
                    />
                    {isAdmin && isBorrowingForOther ? (
                      <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
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
                    readOnly={!isAdmin || !isBorrowingForOther}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. somchai.p"
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${
                      isAdmin && isBorrowingForOther
                        ? 'border-purple-300 bg-white text-slate-800 font-mono focus:ring-2 focus:ring-purple-500 outline-none'
                        : 'border-slate-200 bg-white text-slate-800 font-mono cursor-not-allowed select-none'
                    } shadow-2xs`}
                  />
                  {isAdmin && isBorrowingForOther ? (
                    <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  ) : (
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
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
                    readOnly={!isAdmin || !isBorrowingForOther}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@psu.ac.th"
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${
                      isAdmin && isBorrowingForOther
                        ? 'border-purple-300 bg-white text-blue-800 font-mono font-medium focus:ring-2 focus:ring-purple-500 outline-none'
                        : 'border-slate-200 bg-white text-blue-800 font-mono font-medium cursor-not-allowed select-none'
                    } shadow-2xs`}
                  />
                  {isAdmin && isBorrowingForOther ? (
                    <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  ) : (
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
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
                    readOnly={!isAdmin || !isBorrowingForOther}
                    value={positionTh}
                    onChange={(e) => setPositionTh(e.target.value)}
                    placeholder="เช่น สัตวแพทย์, อาจารย์, เจ้าหน้าที่"
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${
                      isAdmin && isBorrowingForOther
                        ? 'border-purple-300 bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none'
                        : 'border-slate-200 bg-white text-slate-800 cursor-not-allowed select-none'
                    } shadow-2xs`}
                  />
                  {isAdmin && isBorrowingForOther ? (
                    <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  ) : (
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ชื่อคณะ หรือ หน่วยงานระดับคณะ (faculty_th)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly={!isAdmin || !isBorrowingForOther}
                    value={facultyTh}
                    onChange={(e) => setFacultyTh(e.target.value)}
                    placeholder="คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์"
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${
                      isAdmin && isBorrowingForOther
                        ? 'border-purple-300 bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none'
                        : 'border-slate-200 bg-white text-slate-800 cursor-not-allowed select-none'
                    } shadow-2xs`}
                  />
                  {isAdmin && isBorrowingForOther ? (
                    <Edit3 className="w-3 h-3 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  ) : (
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
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
