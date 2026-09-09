import React, { useState } from 'react';
import { 
  X, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Search, 
  Filter, 
  Edit3, 
  UserPlus, 
  Save, 
  Check, 
  RefreshCw, 
  Building2, 
  Mail, 
  Award,
  Crown,
  Lock,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { StaffUser } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffUser[];
  currentUserId: string;
  onUpdateStaffList: (updatedList: StaffUser[]) => void;
  onSwitchUser?: (user: StaffUser) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUserId,
  onUpdateStaffList,
  onSwitchUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'executive' | 'owner' | 'user'>('all');
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState<Partial<StaffUser>>({
    title_th: 'นางสาว',
    first_name_th: '',
    last_name_th: '',
    email: '',
    position: 'นักวิทยาศาสตร์',
    dept: 'สาขาวิชาสัตวแพทยศาสตร์',
    role: 'user',
    roleLabel: 'ผู้ขอยืม (User)',
    phone: '074-289600'
  });

  if (!isOpen) return null;

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.first_name_th && staff.first_name_th.includes(searchTerm)) ||
      (staff.last_name_th && staff.last_name_th.includes(searchTerm)) ||
      (staff.display_name_th && staff.display_name_th.includes(searchTerm)) ||
      staff.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.dept.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'executive' | 'owner' | 'user') => {
    const roleLabels: Record<string, string> = {
      admin: 'ผู้ดูแลระบบ (Admin)',
      executive: 'ผู้มีอำนาจอนุมัติ (รอง ผอ. รพ.สัตว์)',
      owner: 'เจ้าของ/ผู้รับผิดชอบครุภัณฑ์',
      user: 'ผู้ขอยืม (User)'
    };

    const updated = staffList.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          role: newRole,
          roleLabel: roleLabels[newRole],
          permissions: {
            canManageEquipment: newRole === 'admin' || newRole === 'owner' || newRole === 'executive',
            canManageUsers: newRole === 'admin',
            canApproveExecutive: newRole === 'admin' || newRole === 'executive',
            canReceiveReturn: newRole === 'admin' || newRole === 'owner' || newRole === 'executive',
          }
        };
      }
      return user;
    });

    onUpdateStaffList(updated);
    showNotice('อัปเดตสิทธิ์ผู้ใช้งานเรียบร้อยแล้ว');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const display_name_th = `${editingUser.title_th || ''}${editingUser.first_name_th || ''} ${editingUser.last_name_th || ''}`.trim();
    const updatedUser: StaffUser = {
      ...editingUser,
      display_name_th,
      name: display_name_th || editingUser.name
    };

    const updated = staffList.map(u => (u.id === updatedUser.id ? updatedUser : u));
    onUpdateStaffList(updated);
    setEditingUser(null);
    showNotice('บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.first_name_th || !newUser.last_name_th || !newUser.email) {
      alert('กรุณากรอกข้อมูลชื่อ นามสกุล และอีเมลให้ครบถ้วน');
      return;
    }

    const display_name_th = `${newUser.title_th || ''}${newUser.first_name_th || ''} ${newUser.last_name_th || ''}`.trim();
    const roleLabels: Record<string, string> = {
      admin: 'ผู้ดูแลระบบ (Admin)',
      executive: 'ผู้มีอำนาจอนุมัติ (รอง ผอ. รพ.สัตว์)',
      owner: 'เจ้าของ/ผู้รับผิดชอบครุภัณฑ์',
      user: 'ผู้ขอยืม (User)'
    };

    const created: StaffUser = {
      id: `STAFF-${(staffList.length + 1).toString().padStart(3, '0')}`,
      name: display_name_th,
      username: newUser.email.split('@')[0].toLowerCase().trim(),
      preferred_username: newUser.email.split('@')[0].toLowerCase().trim(),
      title_th: newUser.title_th || 'นาย',
      first_name_th: newUser.first_name_th || '',
      last_name_th: newUser.last_name_th || '',
      display_name_th: display_name_th,
      email: newUser.email.toLowerCase().trim(),
      position: newUser.position || 'บุคลากร รพ.สัตว์',
      position_th: newUser.position || 'บุคลากร รพ.สัตว์',
      dept: newUser.dept || 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์',
      faculty_th: newUser.dept || 'คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์',
      role: newUser.role || 'user',
      roleLabel: roleLabels[newUser.role || 'user'],
      phone: newUser.phone || '',
      authProvider: 'psu_sso',
      permissions: {
        canManageEquipment: newUser.role === 'admin' || newUser.role === 'owner' || newUser.role === 'executive',
        canManageUsers: newUser.role === 'admin',
        canApproveExecutive: newUser.role === 'admin' || newUser.role === 'executive',
        canReceiveReturn: newUser.role === 'admin' || newUser.role === 'owner' || newUser.role === 'executive',
      }
    };

    onUpdateStaffList([...staffList, created]);
    setIsAddingNew(false);
    setNewUser({
      title_th: 'นางสาว',
      first_name_th: '',
      last_name_th: '',
      email: '',
      position: 'นักวิทยาศาสตร์',
      dept: 'สาขาวิชาสัตวแพทยศาสตร์',
      role: 'user',
      roleLabel: 'ผู้ขอยืม (User)',
      phone: '074-289600'
    });
    showNotice('เพิ่มผู้ใช้งานใหม่เข้าสู่ฐานข้อมูลสำเร็จ');
  };

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>จัดการสิทธิ์ผู้ใช้งานและฐานข้อมูลบุคลากร</span>
                <span className="text-xs bg-amber-400/20 text-amber-300 font-normal px-2 py-0.5 rounded-full border border-amber-400/30">
                  {staffList.length} รายการ
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ควบคุมสิทธิ์ Admin, เจ้าของครุภัณฑ์, ผู้บริหารอนุมัติ และตรวจสอบข้อมูล OIDC (title_th, first_name_th, last_name_th, display_name_th)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>เพิ่มบุคลากร</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Toolbar (Search & Filter) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ, นามสกุล, อีเมล ม.อ., ตำแหน่ง หรือสังกัด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
            {(['all', 'admin', 'executive', 'owner', 'user'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  roleFilter === role
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {role === 'all' && 'ทั้งหมด'}
                {role === 'admin' && 'ผู้ดูแลระบบ (Admin)'}
                {role === 'executive' && 'ผู้บริหาร (รอง ผอ.)'}
                {role === 'owner' && 'เจ้าของครุภัณฑ์'}
                {role === 'user' && 'ผู้ขอยืม (User)'}
              </button>
            ))}
          </div>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="py-2.5 px-4">ชื่อ-สกุล (ภาษาไทยตาม OIDC)</th>
                <th className="py-2.5 px-4">อีเมล ม.อ.</th>
                <th className="py-2.5 px-4">ตำแหน่ง & สังกัด</th>
                <th className="py-2.5 px-4">ระดับสิทธิ์ (Role)</th>
                <th className="py-2.5 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStaff.map((staff) => {
                const isCurrent = staff.id === currentUserId;
                return (
                  <tr key={staff.id} className={`hover:bg-slate-50 transition ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{staff.display_name_th || staff.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                            กำลังใช้งาน
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 space-x-1 font-mono">
                        <span className="text-slate-400">คำนำหน้า:</span>
                        <span className="text-slate-700 font-semibold">{staff.title_th || '-'}</span>
                        <span className="text-slate-400">| ชื่อ:</span>
                        <span className="text-slate-700">{staff.first_name_th || '-'}</span>
                        <span className="text-slate-400">| นามสกุล:</span>
                        <span className="text-slate-700">{staff.last_name_th || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">{staff.email}</div>
                      {staff.authProvider === 'psu_sso' && (
                        <div className="mt-0.5">
                          <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 rounded font-semibold">
                            PSU SSO
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="font-semibold text-slate-800 truncate" title={staff.position}>
                        {staff.position}
                      </div>
                      <div className="text-slate-500 text-[11px] truncate" title={staff.dept}>
                        {staff.dept}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={staff.role}
                        onChange={(e) => handleRoleChange(staff.id, e.target.value as any)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border cursor-pointer outline-none transition ${
                          staff.role === 'admin'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : staff.role === 'executive'
                            ? 'bg-purple-50 text-purple-900 border-purple-300'
                            : staff.role === 'owner'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        <option value="user">ผู้ขอยืม (User)</option>
                        <option value="owner">เจ้าของครุภัณฑ์ (Owner)</option>
                        <option value="executive">ผู้บริหาร (Executive รอง ผอ.)</option>
                        <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditingUser(staff)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="แก้ไขข้อมูลบุคลากร"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {onSwitchUser && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchUser(staff);
                            showNotice(`สลับการใช้งานเป็น ${staff.display_name_th || staff.name}`);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer"
                          title="สลับเป็นผู้ใช้นี้ทันที"
                        >
                          สลับใช้
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Edit User Modal Drawer */}
        {editingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>แก้ไขข้อมูลบุคลากรและค่า Claim ภาษาไทย</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">คำนำหน้า (title_th)</label>
                    <select
                      value={editingUser.title_th}
                      onChange={(e) => setEditingUser({ ...editingUser, title_th: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                      <option value="ดร.">ดร.</option>
                      <option value="ดร.สพ.ญ.">ดร.สพ.ญ.</option>
                      <option value="น.สพ.ดร.">น.สพ.ดร.</option>
                      <option value="ผศ.น.สพ.ดร.">ผศ.น.สพ.ดร.</option>
                      <option value="ผศ.ดร.">ผศ.ดร.</option>
                      <option value="รศ.ดร.">รศ.ดร.</option>
                      <option value="สพ.ญ.">สพ.ญ.</option>
                      <option value="น.สพ.">น.สพ.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ชื่อจริง (first_name_th)</label>
                    <input
                      type="text"
                      required
                      value={editingUser.first_name_th}
                      onChange={(e) => setEditingUser({ ...editingUser, first_name_th: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">นามสกุล (last_name_th)</label>
                    <input
                      type="text"
                      required
                      value={editingUser.last_name_th}
                      onChange={(e) => setEditingUser({ ...editingUser, last_name_th: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล ม.อ.</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={editingUser.position}
                    onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สังกัด / ภาควิชา / หน่วยงาน</label>
                  <input
                    type="text"
                    value={editingUser.dept}
                    onChange={(e) => setEditingUser({ ...editingUser, dept: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึกการแก้ไข</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Modal Drawer */}
        {isAddingNew && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>เพิ่มบุคลากรใหม่เข้าสู่ฐานข้อมูล</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewUser} className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">คำนำหน้า (title_th)</label>
                    <select
                      value={newUser.title_th}
                      onChange={(e) => setNewUser({ ...newUser, title_th: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                      <option value="ดร.">ดร.</option>
                      <option value="ดร.สพ.ญ.">ดร.สพ.ญ.</option>
                      <option value="น.สพ.ดร.">น.สพ.ดร.</option>
                      <option value="ผศ.น.สพ.ดร.">ผศ.น.สพ.ดร.</option>
                      <option value="ผศ.ดร.">ผศ.ดร.</option>
                      <option value="รศ.ดร.">รศ.ดร.</option>
                      <option value="สพ.ญ.">สพ.ญ.</option>
                      <option value="น.สพ.">น.สพ.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ชื่อจริง (first_name_th) *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น วรัญญา"
                      value={newUser.first_name_th}
                      onChange={(e) => setNewUser({ ...newUser, first_name_th: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">นามสกุล (last_name_th) *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น มณีรัตน์"
                      value={newUser.last_name_th}
                      onChange={(e) => setNewUser({ ...newUser, last_name_th: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล ม.อ. (@psu.ac.th) *</label>
                  <input
                    type="email"
                    required
                    placeholder="waranya.m@psu.ac.th"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      value={newUser.position}
                      onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">สิทธิ์เริ่มต้น</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none font-semibold"
                    >
                      <option value="user">ผู้ขอยืม (User)</option>
                      <option value="owner">เจ้าของครุภัณฑ์ (Owner)</option>
                      <option value="executive">ผู้มีอำนาจอนุมัติ (รอง ผอ.)</option>
                      <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สังกัด / ภาควิชา</label>
                  <input
                    type="text"
                    value={newUser.dept}
                    onChange={(e) => setNewUser({ ...newUser, dept: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>สร้างบัญชีบุคลากร</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
