import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Check, 
  Edit2, 
  Trash2, 
  MapPin, 
  User, 
  Package, 
  Layers, 
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { EquipmentMaster, StaffUser } from '../types';

interface InventoryViewProps {
  equipment: EquipmentMaster[];
  onAddNewEquipment: (equipment: EquipmentMaster) => void;
  onUpdateEquipment: (equipment: EquipmentMaster) => void;
  onSelectToBorrow: (equipment: EquipmentMaster) => void;
  isAdmin: boolean;
  staffList?: StaffUser[];
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  equipment,
  onAddNewEquipment,
  onUpdateEquipment,
  onSelectToBorrow,
  isAdmin,
  staffList = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal for adding equipment
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentMaster | null>(null);

  // Form states for adding/editing
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState<EquipmentMaster['category']>('เครื่องมือวินิจฉัย/เอ็กซเรย์');
  const [formLocation, setFormLocation] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formStatus, setFormStatus] = useState<EquipmentMaster['status']>('พร้อมใช้งาน');

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(equipment.map(e => e.category).filter(Boolean)));
  }, [equipment]);

  // Filtered equipment list
  const filteredEquipment = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return equipment.filter(eq => {
      if (categoryFilter !== 'ALL' && eq.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && eq.status !== statusFilter) return false;
      if (!q) return true;

      return (
        eq.name.toLowerCase().includes(q) ||
        eq.code.toLowerCase().includes(q) ||
        (eq.brand || '').toLowerCase().includes(q) ||
        (eq.model || '').toLowerCase().includes(q) ||
        (eq.location || '').toLowerCase().includes(q) ||
        (eq.responsible || '').toLowerCase().includes(q)
      );
    });
  }, [equipment, searchTerm, categoryFilter, statusFilter]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCode(`รพส-${Math.floor(Math.random() * 900 + 100)}`);
    setFormCategory('เครื่องมือวินิจฉัย/เอ็กซเรย์');
    setFormLocation('ห้องผ่าตัด 1');
    setFormResponsible(staffList[0]?.name || 'ดร.สพ.ญ.ญาดา ดวงนำสว่าง');
    setFormBrand('');
    setFormModel('');
    setFormStatus('พร้อมใช้งาน');
    setIsAddModalOpen(true);
  };

  const openEditModal = (eq: EquipmentMaster) => {
    setEditingItem(eq);
    setFormName(eq.name);
    setFormCode(eq.code);
    setFormCategory(eq.category);
    setFormLocation(eq.location || '');
    setFormResponsible(eq.responsible || '');
    setFormBrand(eq.brand || '');
    setFormModel(eq.model || '');
    setFormStatus(eq.status);
    setIsAddModalOpen(true);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    if (editingItem) {
      onUpdateEquipment({
        ...editingItem,
        name: formName.trim(),
        code: formCode.trim(),
        category: formCategory,
        location: formLocation.trim(),
        responsible: formResponsible.trim(),
        brand: formBrand.trim() || undefined,
        model: formModel.trim() || undefined,
        status: formStatus
      });
    } else {
      const newItem: EquipmentMaster = {
        id: `EQ-${Date.now()}`,
        code: formCode.trim(),
        name: formName.trim(),
        category: formCategory,
        location: formLocation.trim(),
        responsible: formResponsible.trim(),
        responsibleEmail: '',
        brand: formBrand.trim() || undefined,
        model: formModel.trim() || undefined,
        status: formStatus,
        condition: 'สภาพสมบูรณ์ พร้อมใช้งาน'
      };
      onAddNewEquipment(newItem);
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Action Bar (Matching Image 3) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหารหัส, ชื่อ, ยี่ห้อ, สถานที่..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0090FF] focus:bg-white focus:ring-1 focus:ring-[#0090FF] transition"
          />
        </div>

        {/* Dropdowns & Add Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0090FF] cursor-pointer"
          >
            <option value="ALL">ทุกหมวดหมู่</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0090FF] cursor-pointer"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
            <option value="ถูกยืมใช้งาน">ถูกยืมใช้งาน</option>
            <option value="ซ่อมบำรุง">ซ่อมบำรุง</option>
            <option value="รอจำหน่าย">รอจำหน่าย</option>
          </select>

          {/* View mode toggle: Grid vs List (Admin & User view adjustment) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0090FF] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="มุมมองแบบการ์ด (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[11px] font-bold">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#0090FF] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="มุมมองแบบตาราง (List)"
            >
              <List className="w-4 h-4" />
              <span className="text-[11px] font-bold">List</span>
            </button>
          </div>

          {/* "+ เพิ่มอุปกรณ์" Button (Styled with Image 2 cyan/blue #0090FF) */}
          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              id="btn-add-inventory-item"
              className="px-4 py-2.5 rounded-xl bg-[#0090FF] hover:bg-[#008EE4] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-[#0090FF]/30 active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ เพิ่มอุปกรณ์</span>
            </button>
          )}
        </div>
      </div>

      {/* RENDER VIEW: GRID vs LIST */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <div className="text-sm font-semibold text-slate-600">ไม่พบครุภัณฑ์ที่ค้นหา</div>
            <div className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</div>
          </div>
        ) : (
          filteredEquipment.map((eq) => {
            const isAvailable = eq.status === 'พร้อมใช้งาน';
            const isBorrowed = eq.status === 'ถูกยืมใช้งาน';

            return (
              <div
                key={eq.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Category Tag & Status Badge (Matching Image 3) */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[130px]">
                      {eq.category || 'อุปกรณ์ทั่วไป'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isBorrowed
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {eq.status}
                    </span>
                  </div>

                  {/* Equipment Title */}
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                    {eq.name}
                  </h4>

                  {/* Code & Specs */}
                  <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                    <div>
                      <span className="text-slate-400">รหัส:</span>{' '}
                      <span className="font-mono text-slate-700 font-semibold">{eq.code}</span>
                    </div>
                    {(eq.brand || eq.model) && (
                      <div className="text-slate-500 truncate">
                        {eq.brand} {eq.model}
                      </div>
                    )}
                  </div>

                  {/* Storage Location & Responsible Person */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">สถานที่จัดเก็บ:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[120px] text-right">
                        {eq.location || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">ผู้ดูแล:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[120px] text-right">
                        {eq.responsible || 'รพ.สัตว์ ม.อ.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Stock count & Action Buttons (Matching Image 3) */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    <span className="text-slate-400">คงเหลือพร้อมใช้: </span>
                    <span className={`font-bold ${isAvailable ? 'text-[#0090FF]' : 'text-slate-400'}`}>
                      {isAvailable ? '1 / 1 เครื่อง' : '0 / 1 เครื่อง'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {isAvailable && (
                      <button
                        type="button"
                        onClick={() => onSelectToBorrow(eq)}
                        className="px-2 py-1 text-[10px] font-bold bg-[#0090FF]/10 text-[#0090FF] hover:bg-[#0090FF] hover:text-white rounded-lg transition cursor-pointer"
                        title="ขอยืมครุภัณฑ์นี้"
                      >
                        ขอยืม
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(eq)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="แก้ไขข้อมูลครุภัณฑ์"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      ) : (
        /* List Mode: Comprehensive Data Table */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">รหัสครุภัณฑ์</th>
                  <th className="py-3.5 px-4">ชื่อครุภัณฑ์ / ยี่ห้อ / รุ่น</th>
                  <th className="py-3.5 px-4">หมวดหมู่</th>
                  <th className="py-3.5 px-4">สถานที่จัดเก็บ</th>
                  <th className="py-3.5 px-4">ผู้รับผิดชอบ (เจ้าของ)</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">คงเหลือ</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบครุภัณฑ์ที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((eq) => {
                    const isAvailable = eq.status === 'พร้อมใช้งาน';
                    const isBorrowed = eq.status === 'ถูกยืมใช้งาน';

                    return (
                      <tr key={eq.id} className="hover:bg-slate-50/70 transition">
                        {/* 1. รหัสครุภัณฑ์ */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0090FF] whitespace-nowrap">
                          {eq.code}
                        </td>

                        {/* 2. ชื่อ & ยี่ห้อ */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-bold text-slate-900">{eq.name}</div>
                          {(eq.brand || eq.model) && (
                            <div className="text-[11px] text-slate-500">
                              {[eq.brand, eq.model].filter(Boolean).join(' ')}
                            </div>
                          )}
                        </td>

                        {/* 3. หมวดหมู่ */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {eq.category || 'ทั่วไป'}
                          </span>
                        </td>

                        {/* 4. สถานที่ */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{eq.location || '-'}</span>
                          </div>
                        </td>

                        {/* 5. ผู้รับผิดชอบ (เจ้าของ) */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{eq.responsible || '-'}</span>
                          </div>
                        </td>

                        {/* 6. สถานะ */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isBorrowed
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {eq.status}
                          </span>
                        </td>

                        {/* 7. คงเหลือ */}
                        <td className="py-3.5 px-4 text-center font-bold text-xs whitespace-nowrap">
                          <span className={isAvailable ? 'text-[#0090FF]' : 'text-slate-400'}>
                            {isAvailable ? '1 / 1' : '0 / 1'}
                          </span>
                        </td>

                        {/* 8. จัดการ */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {isAvailable && (
                              <button
                                type="button"
                                onClick={() => onSelectToBorrow(eq)}
                                className="px-2.5 py-1 text-xs font-bold bg-[#0090FF]/10 text-[#0090FF] hover:bg-[#0090FF] hover:text-white rounded-lg transition cursor-pointer"
                              >
                                ขอยืม
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openEditModal(eq)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* Add / Edit Equipment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-[#0090FF] to-[#007473] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingItem ? 'แก้ไขข้อมูลครุภัณฑ์' : '+ เพิ่มครุภัณฑ์ใหม่'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อครุภัณฑ์ / อุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น เครื่องตรวจคลื่นหัวใจ, Notebook..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0090FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสครุภัณฑ์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <option value="เครื่องมือวินิจฉัย/เอ็กซเรย์">เครื่องมือวินิจฉัย/เอ็กซเรย์</option>
                    <option value="เครื่องมือผ่าตัด/ศัลยกรรม">เครื่องมือผ่าตัด/ศัลยกรรม</option>
                    <option value="เครื่องมือตรวจและเฝ้าระวัง">เครื่องมือตรวจและเฝ้าระวัง</option>
                    <option value="อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู">อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ยี่ห้อ (Brand)</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="เช่น Dell, Sony, Philips..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รุ่น (Model)</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สถานที่จัดเก็บ</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="เช่น ห้องหัตถการ, ชั้น 2..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผู้ดูแลรับผิดชอบ</label>
                  <input
                    type="text"
                    value={formResponsible}
                    onChange={(e) => setFormResponsible(e.target.value)}
                    placeholder="ชื่อผู้ดูแล หรือ เจ้าของ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 cursor-pointer"
                >
                  <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                  <option value="ถูกยืมใช้งาน">ถูกยืมใช้งาน</option>
                  <option value="ซ่อมบำรุง">ซ่อมบำรุง</option>
                  <option value="รอจำหน่าย">รอจำหน่าย</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0090FF] hover:bg-[#008EE4] text-white font-bold cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
