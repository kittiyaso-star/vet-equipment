import React from 'react';
import { X, Printer, Check } from 'lucide-react';
import { BorrowRequest } from '../types';

interface PrintBorrowSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
}

export const PrintBorrowSlipModal: React.FC<PrintBorrowSlipModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="bg-slate-900 px-6 py-3.5 text-white flex items-center justify-between print:hidden">
          <div className="text-xs font-semibold">
            พรีวิวใบยืม-คืน ครุภัณฑ์ โรงพยาบาลสัตว์ ม.อ.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-trigger-print"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 text-slate-800 text-xs font-serif leading-relaxed max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-8">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
            <div className="flex justify-center mb-2">
              <img 
                src={`${import.meta.env.BASE_URL}logo-vet-color-transparent.svg`} 
                alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์" 
                className="h-14 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="text-base font-bold tracking-wide">
              โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์
            </h2>
            <h3 className="text-xs font-semibold text-slate-700">
              คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
            </h3>
            <p className="text-sm font-bold mt-2 underline">
              แบบฟอร์มการขออนุมัติยืม - คืน ครุภัณฑ์และอุปกรณ์ทางการแพทย์
            </p>
          </div>

          {/* Document Reference Info */}
          <div className="flex justify-between items-center mb-4 text-xs">
            <div>
              <span className="font-bold">เลขที่คำขอ:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{request.id}</span>
            </div>
            <div>
              <span className="font-bold">วันที่ยื่นขอ:</span>{' '}
              <span>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
            </div>
          </div>

          {/* Section 1: Requester Details */}
          <div className="mb-4 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
              <span>1. ข้อมูลผู้ขอยืม (ยืนยันตัวตน PSU SSO / OpenID Connect)</span>
              {request.requesterUsername && (
                <span className="font-mono text-[11px] text-slate-500 font-normal">
                  PSU Passport: @{request.requesterUsername}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <div>
                <span className="text-slate-600">ชื่อ - สกุล:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {request.requesterTitleTh ? `${request.requesterTitleTh}${request.requesterFirstNameTh || ''} ${request.requesterLastNameTh || ''}`.trim() : request.requesterName}
                </span>
              </div>
              <div>
                <span className="text-slate-600">ตำแหน่ง:</span> {request.requesterPositionTh || request.requesterPosition}
              </div>
              <div>
                <span className="text-slate-600">สังกัด/คณะ:</span> {request.requesterFacultyTh || request.requesterDept}
              </div>
              <div>
                <span className="text-slate-600">อีเมล PSU:</span>{' '}
                <span className="font-mono">{request.requesterEmail}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Purpose & Schedule */}
          <div className="mb-4 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-900 mb-1.5">2. วัตถุประสงค์และกำหนดเวลายืม</div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-slate-600">วัตถุประสงค์ในการยืม:</span>{' '}
                <span className="font-semibold text-slate-900">{request.purpose}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 pt-1">
                <div>
                  <span className="text-slate-600">ขอยืมตั้งแต่วันที่:</span>{' '}
                  <span className="font-semibold">{request.borrowFrom}</span>{' '}
                  {request.borrowFromTime && <span>เวลา {request.borrowFromTime} น.</span>}
                </div>
                <div>
                  <span className="text-slate-600">กำหนดส่งคืนภายในวันที่:</span>{' '}
                  <span className="font-semibold text-red-700">{request.borrowTo}</span>{' '}
                  {request.borrowToTime && <span>เวลา {request.borrowToTime} น.</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Equipment Items Table */}
          <div className="mb-6">
            <div className="font-bold text-slate-900 mb-1.5">3. รายการครุภัณฑ์และอุปกรณ์ที่ขอยืม</div>
            <table className="w-full border border-slate-400 text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-8">ที่</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-left">หมายเลขครุภัณฑ์</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-left">รายการครุภัณฑ์</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-left">สถานที่จัดเก็บ</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center">สภาพก่อนยืม</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center">สภาพหลังส่งคืน</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center">ผู้รับผิดชอบ</th>
                </tr>
              </thead>
              <tbody>
                {request.equipmentList.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-400 py-1.5 px-2 font-mono">{item.code}</td>
                    <td className="border border-slate-400 py-1.5 px-2 font-medium">{item.name}</td>
                    <td className="border border-slate-400 py-1.5 px-2">{item.location || '-'}</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{item.condBefore || 'ปกติสมบูรณ์'}</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{item.condAfter || '-'}</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{item.responsible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
            <div className="space-y-6">
              <div>ลงชื่อ.......................................................</div>
              <div>( {request.requesterName} )</div>
              <div className="text-[11px] text-slate-500">ผู้ขอยืมครุภัณฑ์</div>
              <div className="text-[11px] text-slate-400">วันที่ ...../...../..........</div>
            </div>

            <div className="space-y-6">
              <div>ลงชื่อ.......................................................</div>
              <div>( ....................................................... )</div>
              <div className="text-[11px] text-slate-500">ผู้รับผิดชอบ / เจ้าของครุภัณฑ์</div>
              <div className="text-[11px] text-slate-400">วันที่ ...../...../..........</div>
            </div>

            <div className="space-y-6">
              <div>ลงชื่อ.......................................................</div>
              <div>( ....................................................... )</div>
              <div className="text-[11px] text-slate-500">เจ้าหน้าที่ผู้ตรวจรับคืนครุภัณฑ์</div>
              <div className="text-[11px] text-slate-400">วันที่ ...../...../..........</div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 print:block">
            ระบบยืม-คืน ครุภัณฑ์และอุปกรณ์ โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์ (สถานะปัจจุบัน: {request.status})
          </div>
        </div>
      </div>
    </div>
  );
};
