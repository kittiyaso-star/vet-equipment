import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  Clock,
  Calendar
} from 'lucide-react';
import { BorrowRequest, BorrowedEquipmentItem, StaffUser } from '../types';
import { STAFF_USERS } from '../data/initialData';

interface ReturnCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  onConfirmReturn: (
    requestId: string,
    updatedItems: BorrowedEquipmentItem[],
    receiverName: string,
    returnNote: string
  ) => void;
  currentUser: StaffUser;
}

const COMMON_CONDITIONS = [
  { label: 'ปกติสมบูรณ์', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
  { label: 'ชำรุดเสียหาย', color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
  { label: 'สูญหาย', color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' },
  { label: 'ต้องส่งซ่อมบำรุง', color: 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100' },
  { label: 'ผ่านการทำความสะอาด/ฆ่าเชื้อแล้ว', color: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100' },
];

export const ReturnCheckInModal: React.FC<ReturnCheckInModalProps> = ({
  isOpen,
  onClose,
  request,
  onConfirmReturn,
  currentUser
}) => {
  const [itemsCondition, setItemsCondition] = useState<BorrowedEquipmentItem[]>([]);
  const [receiverName, setReceiverName] = useState(currentUser.name);
  const [returnNote, setReturnNote] = useState('');

  useEffect(() => {
    if (request) {
      // Per user spec: "เจ้าหน้าที่ผู้ตรวจรับคืน ควรเป็นชื่อเจ้าของครุภัณฑ์ที่ยืมแต่ละรายการ"
      const mapped = request.equipmentList.map(item => ({
        ...item,
        condAfter: item.condAfter || 'ปกติสมบูรณ์',
        returnInspector: item.returnInspector || item.responsible || currentUser.name
      }));
      setItemsCondition(mapped);

      // Default receiver to the owner of first item or current user
      const initialInspector = request.equipmentList[0]?.responsible || currentUser.name;
      setReceiverName(initialInspector);
      setReturnNote(request.returnNote || '');
    }
  }, [request, currentUser]);

  if (!isOpen || !request) return null;

  const handleConditionChange = (index: number, val: string) => {
    const updated = [...itemsCondition];
    updated[index] = { ...updated[index], condAfter: val };
    setItemsCondition(updated);
  };

  const handleInspectorChange = (index: number, val: string) => {
    const updated = [...itemsCondition];
    updated[index] = { ...updated[index], returnInspector: val };
    setItemsCondition(updated);
  };

  const handleQuickSetAll = (status: string) => {
    const updated = itemsCondition.map(item => ({
      ...item,
      condAfter: status
    }));
    setItemsCondition(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReturn(request.id, itemsCondition, receiverName, returnNote);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <RotateCcw className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">ตรวจรับคืนครุภัณฑ์และอุปกรณ์</h3>
              <p className="text-xs text-emerald-200">
                เลขที่คำขอ: {request.id} • ผู้ยืม: {request.requesterName} ({request.requesterDept})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick preset banner */}
          <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 gap-2">
            <span className="text-xs font-semibold text-slate-700">
              ตั้งค่าสภาพครุภัณฑ์หลังส่งคืนทั้งหมด:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickSetAll('ปกติสมบูรณ์')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer"
              >
                ✓ ปกติสมบูรณ์ทุกชิ้น
              </button>
              <button
                type="button"
                onClick={() => handleQuickSetAll('ชำรุดเสียหาย')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 transition cursor-pointer"
              >
                ⚠ ชำรุดเสียหาย
              </button>
            </div>
          </div>

          {/* Equipment list condition inspection */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>รายการและผลการตรวจสอบสภาพ ({itemsCondition.length} รายการ)</span>
              <span className="text-[11px] font-normal text-slate-500">
                * ผู้ตรวจรับคืนดึงชื่อจากเจ้าของครุภัณฑ์
              </span>
            </h4>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {itemsCondition.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between text-xs gap-1">
                    <div>
                      <span className="font-bold text-slate-900">{idx + 1}. {item.name}</span>
                      <span className="text-slate-500 ml-2 font-mono text-[11px]">[{item.code}]</span>
                    </div>
                    <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ก่อนยืม: <span className="text-slate-800 font-medium">{item.condBefore || 'ปกติสมบูรณ์'}</span>
                    </span>
                  </div>

                  {/* Inspector per item & Condition Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        เจ้าหน้าที่ผู้ตรวจรับคืน (ชื่อเจ้าของครุภัณฑ์):
                      </label>
                      <input
                        type="text"
                        required
                        value={item.returnInspector || item.responsible}
                        onChange={(e) => handleInspectorChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:ring-2 focus:ring-teal-600 outline-none font-medium"
                        placeholder="ชื่อเจ้าของครุภัณฑ์ที่ตรวจรับ"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        สภาพหลังคืน (เลือกจากรายการ):
                      </label>
                      <select
                        value={item.condAfter || 'ปกติสมบูรณ์'}
                        onChange={(e) => handleConditionChange(idx, e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium ${
                          item.condAfter === 'ชำรุดเสียหาย' || item.condAfter === 'สูญหาย'
                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="ปกติสมบูรณ์">ปกติสมบูรณ์</option>
                        <option value="ชำรุดเสียหาย">ชำรุดเสียหาย</option>
                        <option value="สูญหาย">สูญหาย</option>
                        <option value="ต้องส่งซ่อมบำรุง">ต้องส่งซ่อมบำรุง</option>
                        <option value="ผ่านการทำความสะอาด/ฆ่าเชื้อแล้ว">ผ่านการทำความสะอาด/ฆ่าเชื้อแล้ว</option>
                      </select>
                    </div>
                  </div>

                  {/* Condition Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {COMMON_CONDITIONS.map((cond) => (
                      <button
                        key={cond.label}
                        type="button"
                        onClick={() => handleConditionChange(idx, cond.label)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          item.condAfter === cond.label
                            ? `${cond.color} ring-2 ring-teal-600/30 font-bold`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Receiver details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เจ้าหน้าที่บันทึกการรับคืนหลัก <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-teal-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                วันและเวลาที่รับคืน
              </label>
              <input
                type="text"
                readOnly
                value={new Date().toLocaleString('th-TH')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              หมายเหตุการรับคืนเพิ่มเติม (ถ้ามี)
            </label>
            <textarea
              rows={2}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="เช่น อุปกรณ์ผ่านการฆ่าเชื้อเรียบร้อย, นำเก็บเข้าที่ตู้ผ่าตัด 2..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              id="btn-confirm-return"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ยืนยันตรวจรับคืนครุภัณฑ์ (เสร็จสิ้น)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
