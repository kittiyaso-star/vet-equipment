import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Database, 
  CheckCircle2, 
  MapPin, 
  User, 
  Tag, 
  ArrowRight, 
  ShieldCheck, 
  Lock,
  RefreshCw,
  Upload,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  FileSpreadsheet,
  Check,
  DollarSign,
  Calendar,
  Layers,
  Mail,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { EquipmentMaster, StaffUser } from '../types';
import { fetchGoogleSheetCSV, parseEquipmentSheetCSV, getStoredStaffUsers } from '../services/storage';

interface EquipmentCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentList: EquipmentMaster[];
  onAddNewEquipment: (equipment: EquipmentMaster) => void;
  onUpdateEquipment?: (equipment: EquipmentMaster) => void;
  onBatchUpdateEquipment?: (items: EquipmentMaster[]) => void;
  onSelectToBorrow: (equipment: EquipmentMaster) => void;
  isAdmin?: boolean;
  staffList?: StaffUser[];
  onOpenGoogleSheetsSync?: () => void;
}

// แปลงวันที่จาก ISO YYYY-MM-DD เป็นรูปแบบไทย วว/ดด/ปปปป (พ.ศ.)
function isoToThaiDateString(iso: string, useBE: boolean = true): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const year = parseInt(parts[0], 10);
  const month = parts[1];
  const day = parts[2];
  if (isNaN(year)) return iso;
  const displayYear = useBE ? year + 543 : year;
  return `${day}/${month}/${displayYear}`;
}

// แปลงวันที่จาก วว/ดด/ปปปป (พ.ศ. หรือ ค.ศ.) เป็น YYYY-MM-DD สำหรับ Native Date Picker
function thaiDateStringToIso(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parseInt(parts[2], 10);
    if (isNaN(year)) return '';
    if (year > 2400) {
      year = year - 543; // แปลง พ.ศ. เป็น ค.ศ.
    }
    return `${year}-${month}-${day}`;
  }
  return '';
}

interface PersonnelSuggestion {
  name: string;
  email: string;
  dept: string;
  position: string;
  roleLabel: string;
}

export const EquipmentCatalogModal: React.FC<EquipmentCatalogModalProps> = ({
  isOpen,
  onClose,
  equipmentList,
  onAddNewEquipment,
  onUpdateEquipment,
  onBatchUpdateEquipment,
  onSelectToBorrow,
  isAdmin = true,
  staffList,
  onOpenGoogleSheetsSync
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);

  // Sync / Import states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'idle' | 'success' | 'restricted' | 'error';
    message?: string;
    count?: number;
  }>({ type: 'idle' });

  const [showImportModal, setShowImportModal] = useState(false);
  const [csvInputText, setCsvInputText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<EquipmentMaster['category']>('เครื่องมือวินิจฉัย/เอ็กซเรย์');
  const [newLocation, setNewLocation] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newResponsibleEmail, setNewResponsibleEmail] = useState('');
  const [newCondition, setNewCondition] = useState('ปกติสมบูรณ์ พร้อมใช้งาน');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newReceivedDate, setNewReceivedDate] = useState('');

  // Date picker & Autocomplete states
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const [emailAutoFilled, setEmailAutoFilled] = useState(false);
  const responsibleDropdownRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLFormElement>(null);

  // Click outside to close responsible dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        responsibleDropdownRef.current &&
        !responsibleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsResponsibleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Personnel database for autocomplete
  const personnelSuggestions: PersonnelSuggestion[] = useMemo(() => {
    const staff = staffList && staffList.length > 0 ? staffList : getStoredStaffUsers();
    const map = new Map<string, PersonnelSuggestion>();

    // Add staff users
    staff.forEach((s) => {
      const key = (s.name || '').trim().toLowerCase();
      if (!key) return;
      map.set(key, {
        name: s.display_name_th || s.name,
        email: s.email || '',
        dept: s.faculty_th || s.dept || 'คณะสัตวแพทยศาสตร์',
        position: s.position_th || s.position || '',
        roleLabel: s.roleLabel || (s.role === 'owner' ? 'เจ้าของครุภัณฑ์' : s.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน')
      });
    });

    // Add distinct responsible personnel from existing equipmentList
    equipmentList.forEach((eq) => {
      if (eq.responsible && eq.responsible !== 'N/A') {
        const key = eq.responsible.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            name: eq.responsible.trim(),
            email: eq.responsibleEmail?.trim() || '',
            dept: eq.location || 'โรงพยาบาลสัตว์ ม.อ.',
            position: 'เจ้าหน้าที่/ผู้ดูแล',
            roleLabel: 'เจ้าของครุภัณฑ์'
          });
        } else if (!map.get(key)!.email && eq.responsibleEmail) {
          map.get(key)!.email = eq.responsibleEmail.trim();
        }
      }
    });

    return Array.from(map.values());
  }, [staffList, equipmentList]);

  // Filtered personnel matching current typed text
  const filteredPersonnel = useMemo(() => {
    if (!newResponsible.trim()) {
      return personnelSuggestions;
    }
    const q = newResponsible.toLowerCase().trim();
    return personnelSuggestions.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.dept.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q)
    );
  }, [personnelSuggestions, newResponsible]);

  if (!isOpen) return null;

  const categories = [
    'เครื่องมือวินิจฉัย/เอ็กซเรย์',
    'เครื่องมือผ่าตัด/ศัลยกรรม',
    'เครื่องมือตรวจและเฝ้าระวัง',
    'อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู',
    'อื่นๆ'
  ];

  // Filter items
  const filtered = equipmentList.filter((item) => {
    const matchSearch =
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.responsible.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchSearch && matchCat && matchStatus;
  });

  const resetFormFields = () => {
    setNewCode('');
    setNewName('');
    setNewLocation('');
    setNewResponsible('');
    setNewResponsibleEmail('');
    setNewBrand('');
    setNewModel('');
    setNewPrice('');
    setNewReceivedDate('');
    setNewCondition('ปกติสมบูรณ์ พร้อมใช้งาน');
    setEditingEquipmentId(null);
    setEmailAutoFilled(false);
    setIsResponsibleDropdownOpen(false);
  };

  const handleStartEdit = (item: EquipmentMaster) => {
    setEditingEquipmentId(item.id);
    setNewCode(item.code);
    setNewName(item.name);
    setNewCategory(item.category);
    setNewLocation(item.location || '');
    setNewResponsible(item.responsible || '');
    setNewResponsibleEmail(item.responsibleEmail || '');
    setNewBrand(item.brand && item.brand !== 'N/A' ? item.brand : '');
    setNewModel(item.model && item.model !== 'N/A' ? item.model : '');
    setNewPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
    setNewReceivedDate(item.receivedDate || '');
    setNewCondition(item.condition || 'ปกติสมบูรณ์ พร้อมใช้งาน');
    setEmailAutoFilled(Boolean(item.responsibleEmail));
    setShowAddForm(true);

    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเพิ่มหรือแก้ไขครุภัณฑ์ได้');
      return;
    }
    if (!newCode.trim() || !newName.trim()) return;

    if (editingEquipmentId) {
      // Update existing equipment
      const existing = equipmentList.find(eq => eq.id === editingEquipmentId);
      const updatedItem: EquipmentMaster = {
        ...existing,
        id: editingEquipmentId,
        code: newCode.trim(),
        name: newName.trim(),
        category: newCategory,
        location: newLocation.trim() || 'โรงพยาบาลสัตว์ ม.อ.',
        responsible: newResponsible.trim() || 'เจ้าหน้าที่พยาบาลสัตว์',
        responsibleEmail: newResponsibleEmail.trim() || 'vet.hospital@psu.ac.th',
        brand: newBrand.trim() || 'N/A',
        model: newModel.trim() || 'N/A',
        price: newPrice.trim() ? Number(newPrice.replace(/,/g, '')) || newPrice.trim() : undefined,
        receivedDate: newReceivedDate.trim() || undefined,
        status: existing?.status || 'พร้อมใช้งาน',
        condition: newCondition.trim()
      };

      if (onUpdateEquipment) {
        onUpdateEquipment(updatedItem);
      } else {
        onAddNewEquipment(updatedItem);
      }
    } else {
      // Add new equipment
      const newItem: EquipmentMaster = {
        id: `EQ-${Date.now().toString().slice(-4)}`,
        code: newCode.trim(),
        name: newName.trim(),
        category: newCategory,
        location: newLocation.trim() || 'โรงพยาบาลสัตว์ ม.อ.',
        responsible: newResponsible.trim() || 'เจ้าหน้าที่พยาบาลสัตว์',
        responsibleEmail: newResponsibleEmail.trim() || 'vet.hospital@psu.ac.th',
        brand: newBrand.trim() || 'N/A',
        model: newModel.trim() || 'N/A',
        price: newPrice.trim() ? Number(newPrice.replace(/,/g, '')) || newPrice.trim() : undefined,
        receivedDate: newReceivedDate.trim() || undefined,
        status: 'พร้อมใช้งาน',
        condition: newCondition.trim()
      };

      onAddNewEquipment(newItem);
    }

    resetFormFields();
    setShowAddForm(false);
  };

  // Sync from Google Sheets (GID 326365193)
  const handleSyncFromGoogleSheet = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: 'idle' });

    try {
      const csvText = await fetchGoogleSheetCSV();
      const parsedItems = parseEquipmentSheetCSV(csvText);

      if (parsedItems.length === 0) {
        setSyncStatus({
          type: 'error',
          message: 'ไม่พบรายการข้อมูลครุภัณฑ์ที่ถูกต้องในชีต'
        });
      } else {
        if (onBatchUpdateEquipment) {
          onBatchUpdateEquipment(parsedItems);
        }
        setSyncStatus({
          type: 'success',
          count: parsedItems.length,
          message: `ซิงค์สำเร็จ ดึงข้อมูลครุภัณฑ์จากชีตได้ทั้งหมด ${parsedItems.length} รายการ`
        });
      }
    } catch (err: any) {
      console.warn('Sync failed:', err);
      if (err.message === 'RESTRICTED_ACCESS' || err.message?.includes('404') || err.message?.includes('401')) {
        setSyncStatus({
          type: 'restricted',
          message: 'ไม่สามารถดึงข้อมูลตรงได้ เนื่องจากสิทธิ์การแชร์ของ Google Sheets ตั้งค่าเป็น "จำกัด (Restricted)"'
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: `การเชื่อมต่อขัดข้อง (${err.message || 'Network Error'}) กรุณาใช้ตัวเลือกนำเข้าไฟล์ CSV`
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Manual CSV Import or Paste
  const handleProcessCsv = (csvText: string) => {
    try {
      const parsedItems = parseEquipmentSheetCSV(csvText);
      if (parsedItems.length === 0) {
        alert('ไม่พบข้อมูลครุภัณฑ์ในรูปแบบที่ถูกต้อง กรุณาตรวจสอบว่ามีคอลัมน์ "รหัสครุภัณฑ์" และ "ชื่อ"');
        return;
      }

      if (onBatchUpdateEquipment) {
        onBatchUpdateEquipment(parsedItems);
      }
      setSyncStatus({
        type: 'success',
        count: parsedItems.length,
        message: `นำเข้าข้อมูลสำเร็จ ${parsedItems.length} รายการจากแท็บครุภัณฑ์`
      });
      setShowImportModal(false);
      setCsvInputText('');
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาดในการประมวลผลไฟล์ CSV: ${e.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessCsv(content);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div id="equipment-catalog-modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/20 text-amber-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">คลังครุภัณฑ์และอุปกรณ์ทางการแพทย์</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
                  ฐานข้อมูลครุภัณฑ์แท้ ({equipmentList.length} รายการ)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ ม.อ. • เชื่อมโยงข้อมูลจาก Sheet ครุภัณฑ์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              title="ตรวจสอบสาเหตุและขั้นตอนการซิงค์ข้อมูล"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-amber-300" />
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync & Integration Control Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Google Sheet ครุภัณฑ์ (gid: 326365193):{' '}
              <strong className="text-slate-900">{equipmentList.length} รายการ</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromGoogleSheet}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังเชื่อมต่อ Sheet...' : 'ซิงค์จาก Google Sheet'}</span>
            </button>

            {onOpenGoogleSheetsSync && (
              <button
                onClick={onOpenGoogleSheetsSync}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="ตั้งค่าหรือส่งข้อมูลไปยัง Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>ส่งข้อมูลกลับเข้า Sheet</span>
              </button>
            )}

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>นำเข้า / วางตารางจากชีต (Ctrl+V)</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'ปิดฟอร์ม' : 'เพิ่มรายการ'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Notification Banner */}
        {syncStatus.type === 'success' && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatus.message}</span>
            </div>
            <button onClick={() => setSyncStatus({ type: 'idle' })} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {syncStatus.type === 'restricted' && (
          <div className="bg-amber-50 border-b border-amber-300 px-6 py-3 text-xs text-amber-950 flex items-start justify-between shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  ระบบเชื่อมต่อตรงไม่ผ่าน (Google แจ้ง 404 / ติดสิทธิ์ความปลอดภัย)
                </p>
                <p className="text-amber-800 mt-1 leading-relaxed">
                  เนื่องจากเป็นบัญชีองค์กรมหาวิทยาลัย (<span className="font-mono font-bold">@psu.ac.th</span>) Google Workspace จะบล็อกการดึงไฟล์ตรงจากภายนอก หรือปุ่ม <strong>"เสร็จสิ้น"</strong> ในหน้าต่างแชร์ยังไม่ได้ถูกกด
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded font-semibold text-xs transition cursor-pointer shadow-xs"
                  >
                    กดวางตารางตรงนี้ได้ทันที (Ctrl+C & Ctrl+V)
                  </button>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 rounded font-semibold text-xs cursor-pointer"
                  >
                    ดูขั้นตอนวิธีแก้ใน Google Sheets
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setSyncStatus({ type: 'idle' })} className="text-amber-700 hover:text-amber-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add / Edit Equipment Form (Admin Only) */}
        {showAddForm && isAdmin && (
          <form
            ref={formTopRef}
            onSubmit={handleCreateSubmit}
            className="p-5 bg-gradient-to-b from-amber-50/90 to-amber-50/40 border-b border-amber-200 space-y-4 shrink-0 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>
                  {editingEquipmentId
                    ? `แก้ไขข้อมูลครุภัณฑ์: ${newCode || editingEquipmentId}`
                    : 'ลงทะเบียนครุภัณฑ์/อุปกรณ์ใหม่เข้าสู่ระบบ (เฉพาะผู้ดูแลระบบ)'}
                </span>
                {editingEquipmentId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-semibold">
                    โหมดแก้ไข
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetFormFields();
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
                title="ปิดฟอร์ม"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {/* รหัสครุภัณฑ์ */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  รหัสครุภัณฑ์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สพ.6525-004-0001"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                />
              </div>

              {/* ชื่อครุภัณฑ์ */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  ชื่อครุภัณฑ์และอุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เครื่องตรวจคลื่นไฟฟ้าหัวใจ (ECG)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              {/* หมวดหมู่ */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  หมวดหมู่
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none text-xs"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* ยี่ห้อ */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  ยี่ห้อ (Brand)
                </label>
                <input
                  type="text"
                  placeholder="เช่น Mindray, GE, Olympus"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none text-xs"
                />
              </div>

              {/* รุ่น */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  รุ่น (Model)
                </label>
                <input
                  type="text"
                  placeholder="เช่น BeneHeart R3, Vetus 7"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none text-xs"
                />
              </div>

              {/* วันที่ตรวจรับ (มีปฏิทินให้เลือกตามคำขอข้อ 1) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>วันที่ตรวจรับ</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const todayIso = new Date().toISOString().split('T')[0];
                      setNewReceivedDate(isoToThaiDateString(todayIso, true));
                    }}
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-medium hover:underline cursor-pointer"
                    title="คลิกเพื่อเลือกวันปัจจุบัน (พ.ศ.)"
                  >
                    วันนี้
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="วว/ดด/ปปปป (พ.ศ.) หรือคลิกปฏิทิน"
                    value={newReceivedDate}
                    onChange={(e) => setNewReceivedDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-1.5 bg-white border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-xs text-slate-800"
                  />
                  {/* Invisible native date picker over the calendar icon button */}
                  <div className="absolute right-1 flex items-center">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={thaiDateStringToIso(newReceivedDate)}
                      onChange={(e) => {
                        const iso = e.target.value;
                        if (iso) {
                          setNewReceivedDate(isoToThaiDateString(iso, true));
                        }
                      }}
                      className="w-7 h-7 opacity-0 absolute right-0 cursor-pointer z-10"
                      title="คลิกเพื่อเลือกจากปฏิทิน"
                    />
                    <div className="p-1 text-amber-700 hover:text-amber-900 rounded pointer-events-none">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                {newReceivedDate && (
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>วันที่เลือก:</span>
                    <span className="font-semibold text-amber-900">{newReceivedDate}</span>
                  </div>
                )}
              </div>

              {/* ราคา */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  ราคา (บาท)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="เช่น 150,000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 bg-white border border-amber-200 rounded-lg outline-none text-xs"
                  />
                  <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none">฿</span>
                </div>
              </div>

              {/* สถานที่จัดเก็บ/ห้อง */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>สถานที่จัดเก็บ / ติดตั้ง / ห้อง</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น ห้องผ่าตัดสัตว์เล็ก ชั้น 2, ห้องชันสูตรโรคสัตว์"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none text-xs"
                />
              </div>

              {/* สภาพครุภัณฑ์ */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  สภาพครุภัณฑ์
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปกติสมบูรณ์ พร้อมใช้งาน"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none text-xs"
                />
              </div>

              {/* ผู้รับผิดชอบ/เจ้าของ พร้อมระบบพิมพ์ชื่อขึ้นรายชื่ออัตโนมัติตามคำขอข้อ 2 */}
              <div className="space-y-1 sm:col-span-2 relative" ref={responsibleDropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    <span>ผู้รับผิดชอบ / เจ้าของ</span>
                    <span className="text-[10px] text-amber-700 font-normal">(พิมพ์เพื่อเลือกรายชื่อ)</span>
                  </label>
                  {newResponsible && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewResponsible('');
                        setNewResponsibleEmail('');
                        setEmailAutoFilled(false);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                    >
                      ล้างชื่อ
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ นามสกุล หรือค้นหาผู้ดูแล..."
                    value={newResponsible}
                    onFocus={() => setIsResponsibleDropdownOpen(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewResponsible(val);
                      setIsResponsibleDropdownOpen(true);
                      setEmailAutoFilled(false);

                      // ตรวจสอบว่าตรงกับชื่อบุคลากรที่มีในระบบหรือไม่ หากตรงกัน ให้ดึงอีเมลทันที
                      const exactMatch = personnelSuggestions.find(
                        p => p.name.trim().toLowerCase() === val.trim().toLowerCase()
                      );
                      if (exactMatch && exactMatch.email) {
                        setNewResponsibleEmail(exactMatch.email);
                        setEmailAutoFilled(true);
                      }
                    }}
                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setIsResponsibleDropdownOpen(!isResponsibleDropdownOpen)}
                    className="absolute right-1 p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    title="แสดงรายชื่อบุคลากรทั้งหมด"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown รายชื่อบุคลากร */}
                {isResponsibleDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[10px] font-semibold text-slate-600 flex items-center justify-between sticky top-0 border-b border-slate-200">
                      <span>รายชื่อบุคลากร ({filteredPersonnel.length} รายการ)</span>
                      <span className="text-amber-800 font-medium">✓ คลิกชื่อเพื่อดึงอีเมลอัตโนมัติ</span>
                    </div>
                    {filteredPersonnel.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        ไม่พบรายชื่อที่ตรงกับ "{newResponsible}"
                        <p className="text-[10px] text-slate-400 mt-0.5">สามารถใช้ชื่อนี้ต่อได้ และกรอกอีเมลในช่องถัดไป</p>
                      </div>
                    ) : (
                      filteredPersonnel.map((person, idx) => (
                        <div
                          key={person.email || `${person.name}-${idx}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setNewResponsible(person.name);
                            if (person.email) {
                              setNewResponsibleEmail(person.email);
                              setEmailAutoFilled(true);
                            }
                            setIsResponsibleDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-amber-50/80 cursor-pointer transition flex items-start justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{person.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {person.roleLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {person.position && <span>{person.position} • </span>}
                              <span>{person.dept}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 block">
                              {person.email || '-'}
                            </span>
                            <div className="text-[10px] text-emerald-700 mt-0.5 flex items-center justify-end gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              <span>ดึงเมลทันที</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* อีเมลผู้รับผิดชอบ (@psu.ac.th) ดึงอัตโนมัติจากรายชื่อตามคำขอข้อ 2 */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>อีเมลผู้รับผิดชอบ (@psu.ac.th)</span>
                  </label>
                  {emailAutoFilled && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ดึงอีเมลมาให้อัตโนมัติแล้ว
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    placeholder="ดึงอัตโนมัติเมื่อเลือกรายชื่อ หรือพิมพ์อีเมล @psu.ac.th"
                    value={newResponsibleEmail}
                    onChange={(e) => {
                      setNewResponsibleEmail(e.target.value);
                      setEmailAutoFilled(false);
                    }}
                    className={`w-full pl-3 pr-8 py-1.5 bg-white border rounded-lg outline-none focus:ring-2 text-xs transition ${
                      emailAutoFilled
                        ? 'border-emerald-300 bg-emerald-50/30 text-emerald-950 font-mono font-medium focus:ring-emerald-500'
                        : 'border-amber-200 focus:ring-amber-500 text-slate-800'
                    }`}
                  />
                  <div className="absolute right-2 text-slate-400 pointer-events-none">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  {emailAutoFilled
                    ? '✓ ระบบดึงอีเมลจากฐานข้อมูลบุคลากร ม.อ. โดยตรง ไม่จำเป็นต้องพิมพ์ซ้ำ'
                    : 'เลือกรายชื่อในช่องผู้รับผิดชอบ ระบบจะดึงอีเมลมาใส่ให้อัตโนมัติทันที'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
              <div className="text-[11px] text-slate-500">
                {editingEquipmentId ? (
                  <span>กำลังแก้ไขข้อมูลครุภัณฑ์รหัส <strong>{newCode}</strong></span>
                ) : (
                  <span>ครุภัณฑ์ที่เพิ่มใหม่จะถูกจัดเก็บเข้าสู่ระบบและพร้อมให้บุคลากรทำเรื่องยืมได้ทันที</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetFormFields();
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingEquipmentId ? 'บันทึกการแก้ไขครุภัณฑ์' : 'บันทึกครุภัณฑ์ใหม่'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2.5 items-center justify-between shrink-0">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสครุภัณฑ์, ยี่ห้อ, รุ่น, สถานที่ หรือผู้ดูแล..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">ทุกหมวดหมู่ ({equipmentList.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">ทุกสถานะความพร้อม</option>
              <option value="พร้อมใช้งาน">พร้อมใช้งาน (ว่าง)</option>
              <option value="ถูกยืมใช้งาน">กำลังถูกยืมใช้งาน</option>
              <option value="ซ่อมบำรุง">ส่งซ่อมบำรุง</option>
            </select>
          </div>
        </div>

        {/* Equipment Catalog Grid/List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              ไม่พบครุภัณฑ์ตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filtered.map((item) => {
                const isAvailable = item.status === 'พร้อมใช้งาน';

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status & category tag */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Name & Code */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {item.name}
                      </h4>
                      <p className="text-xs font-mono text-blue-700 mt-1 font-semibold select-all">
                        {item.code}
                      </p>

                      {/* Details list */}
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {item.brand && item.brand !== 'N/A' && (
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>ยี่ห้อ: <strong className="text-slate-800">{item.brand}</strong> {item.model && item.model !== 'N/A' ? `(รุ่น: ${item.model})` : ''}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>สถานที่ติดตั้ง: <span className="font-medium text-slate-800">{item.location}</span></span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>ผู้ดูแล: {item.responsible} ({item.responsibleEmail})</span>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          {item.receivedDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>ตรวจรับ: {item.receivedDate}</span>
                            </div>
                          )}
                          {item.price !== undefined && item.price !== null && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-emerald-600" />
                              <span>ราคา: {typeof item.price === 'number' ? `${item.price.toLocaleString()} บาท` : `${item.price} บาท`}</span>
                            </div>
                          )}
                          {item.serialNumber && item.serialNumber !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <span>S/N: {item.serialNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Currently borrowed by info */}
                      {!isAvailable && item.currentBorrowerName && (
                        <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                          <div className="font-semibold">ผู้ยืมขณะนี้: {item.currentBorrowerName}</div>
                          <div className="text-[11px]">กำหนดส่งคืน: {item.currentDueTo || 'ตามคำขอ'}</div>
                        </div>
                      )}
                    </div>

                    {/* Bottom action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        รหัสภายใน: {item.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 rounded-lg transition cursor-pointer"
                            title="แก้ไขข้อมูลครุภัณฑ์นี้"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>แก้ไข</span>
                          </button>
                        )}
                        {isAvailable ? (
                          <button
                            onClick={() => {
                              onSelectToBorrow(item);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition cursor-pointer"
                          >
                            <span>ขอยืมรายการนี้</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-amber-700 font-medium px-2 py-1 bg-amber-50 rounded-md">
                            อยู่ระหว่างใช้งาน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CSV / Direct Sheet Paste Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">นำเข้าข้อมูลครุภัณฑ์จาก Google Sheets</h4>
                  <p className="text-[11px] text-slate-500">เลือกวิธีที่สะดวกที่สุดเพื่อดึงข้อมูลทั้งหมดเข้าสู่ระบบ</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 mt-4 space-y-4 text-xs">
              {/* Option 1: Quick Copy-Paste from Google Sheets (Easiest & 100% Reliable) */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                    วิธีที่ 1 (แนะนำ - เร็วที่สุด 5 วินาที): คัดลอกจากชีตแล้ววาง (Ctrl+C & Ctrl+V)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-semibold">
                    ไม่ต้องแก้สิทธิ์ Google
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  1. ในหน้า Google Sheets แผ่นงานแท็บ <strong className="text-blue-900">"ครุภัณฑ์"</strong> กด <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl + A</kbd> (หรือลากคลุมแถวที่ต้องการ)<br/>
                  2. กด <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl + C</kbd> เพื่อคัดลอก<br/>
                  3. นำมากด <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl + V</kbd> วางในกล่องข้อความด้านล่างนี้ได้เลย
                </p>

                <div className="mt-2">
                  <textarea
                    rows={5}
                    value={csvInputText}
                    onChange={(e) => setCsvInputText(e.target.value)}
                    placeholder="คลิกที่นี่แล้วกด Ctrl + V เพื่อวางข้อมูลตารางที่คัดลอกมาจาก Google Sheets (รองรับทั้งแบบตาราง Tab และ CSV)..."
                    className="w-full p-3 font-mono text-[11px] border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  />
                </div>

                {/* Live Preview if text pasted */}
                {csvInputText.trim() && (
                  (() => {
                    const parsed = parseEquipmentSheetCSV(csvInputText);
                    return (
                      <div className="p-2.5 bg-white border border-blue-200 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-800 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ตรวจพบข้อมูลถูกต้องจำนวน {parsed.length} รายการ
                          </span>
                          <button
                            type="button"
                            onClick={() => handleProcessCsv(csvInputText)}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold cursor-pointer transition shadow-xs"
                          >
                            บันทึกนำเข้า {parsed.length} รายการทันที
                          </button>
                        </div>
                        {parsed.length > 0 && (
                          <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded max-h-24 overflow-y-auto">
                            <span className="font-semibold text-slate-700">ตัวอย่างข้อมูลที่ตรวจพบ:</span>
                            {parsed.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="truncate mt-0.5">
                                • {item.code} : <span className="text-slate-800 font-medium">{item.name}</span> ({item.location})
                              </div>
                            ))}
                            {parsed.length > 3 && <div className="text-slate-400 mt-0.5">...และอีก {parsed.length - 3} รายการ</div>}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Option 2: Upload CSV File */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                    วิธีที่ 2: ดาวน์โหลดเป็นไฟล์ CSV จาก Google Sheets แล้วนำมาอัปโหลด
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  ใน Google Sheets ไปที่เมนู <strong>ไฟล์ (File) &gt; ดาวน์โหลด (Download) &gt; ค่าที่คั่นด้วยจุลภาค (.csv, แผ่นงานปัจจุบัน)</strong> จากนั้นเลือกไฟล์ที่บันทึกไว้ในเครื่อง:
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                />
              </div>

              {/* Option 3: Publish to Web Explanation */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                    วิธีที่ 3: ซิงค์อัตโนมัติด้วย "เผยแพร่ไปยังเว็บ (Publish to web)"
                  </span>
                </div>
                <p className="text-amber-900 text-[11px] leading-relaxed">
                  เนื่องจากบัญชี Google ของมหาวิทยาลัย (<span className="font-mono text-amber-950 font-bold">@psu.ac.th</span>) มักมีการตั้งค่านโยบายความปลอดภัยบล็อกการเข้าถึงไฟล์โดยตรงจากภายนอก (Google จะตอบกลับเป็น 404)<br/>
                  <strong>วิธีตั้งค่าให้ดึงได้ตลอด:</strong> ใน Google Sheets ไปที่เมนู <strong>ไฟล์ &gt; แชร์ &gt; เผยแพร่ไปยังเว็บ</strong> &gt; เลือกแผ่นงาน <strong>"ครุภัณฑ์"</strong> &gt; เลือกรูปแบบ <strong>"ค่าที่คั่นด้วยจุลภาค (.csv)"</strong> &gt; คลิก <strong>เผยแพร่</strong> แล้วนำลิงก์ที่ได้มากรอกในระบบ
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
              >
                ปิดหน้าต่าง
              </button>
              {csvInputText.trim() && (
                <button
                  type="button"
                  onClick={() => handleProcessCsv(csvInputText)}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs transition shadow-xs"
                >
                  บันทึกนำเข้าข้อมูลทันที
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explanation & Sharing Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <h4 className="text-sm font-bold text-slate-900">แนะนำวิธีแก้ปัญหาเมื่อดึงข้อมูล Google Sheet ไม่ผ่าน</h4>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <h5 className="font-bold text-amber-950">1. อย่าลืมคลิกปุ่มสีฟ้า "เสร็จสิ้น" (Done)</h5>
                <p className="text-amber-900 text-[11px] leading-relaxed">
                  จากภาพที่คุณได้เปลี่ยนสิทธิ์เป็น <em>"ทุกคนที่มีลิงก์" (ผู้มีสิทธิ์อ่าน)</em> แล้ว สังเกตว่าปุ่มสีฟ้า <strong>"เสร็จสิ้น"</strong> ที่มุมล่างขวาของหน้าต่างแชร์ยังแสดงอยู่ หากปิดหน้าต่างหรือสลับแอปโดยไม่ได้กดปุ่มนี้ Google จะยังไม่บันทึกการตั้งค่า
                </p>
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <h5 className="font-bold text-red-950">2. นโยบายความปลอดภัยของบัญชีมหาวิทยาลัย (@psu.ac.th)</h5>
                <p className="text-red-900 text-[11px] leading-relaxed">
                  เนื่องจากบัญชี Google Workspace ของ ม.อ. มีการจำกัดไม่ให้บุคคลภายนอกดาวน์โหลดไฟล์ผ่าน API สาธารณะ เมื่อเว็บแอปพยายามดึงข้อมูล Google จะส่งผลลัพธ์เป็น <strong>404 (找不到網頁 / Not Found)</strong> เสมอ
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                <h5 className="font-bold">3. วิธีแก้ปัญหาที่ง่ายและได้ผล 100% ทันที:</h5>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>
                    <strong>วิธีคัดลอกวาง (แนะนำที่สุด):</strong> ไปที่ชีตแท็บ "ครุภัณฑ์" กด <kbd className="px-1 bg-white border border-slate-300 rounded font-mono">Ctrl+A</kbd> แล้ว <kbd className="px-1 bg-white border border-slate-300 rounded font-mono">Ctrl+C</kbd> จากนั้นกลับมากดปุ่ม <strong>"นำเข้า / วางตารางจากชีต"</strong> ในระบบแล้วกดวาง
                  </li>
                  <li>
                    <strong>วิธีดาวน์โหลดไฟล์ CSV:</strong> เมนู <em>ไฟล์ &gt; ดาวน์โหลด &gt; ค่าที่คั่นด้วยจุลภาค (.csv, แผ่นงานปัจจุบัน)</em> แล้วกดปุ่มนำเข้าไฟล์ในระบบ
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowHelpModal(false);
                  setShowImportModal(true);
                }}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs transition"
              >
                เปิดหน้าต่างนำเข้าข้อมูล (Ctrl+V)
              </button>
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
