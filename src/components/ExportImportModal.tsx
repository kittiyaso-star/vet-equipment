import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import { BorrowRequest } from '../types';
import { convertRequestsToCSV, parseRequestsCSV } from '../services/storage';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: BorrowRequest[];
  onImportRequests: (imported: BorrowRequest[], replaceAll: boolean) => void;
  onResetData: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  requests,
  onImportRequests,
  onResetData
}) => {
  const [csvInput, setCsvInput] = useState('');
  const [replaceAll, setReplaceAll] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewRows, setPreviewRows] = useState<BorrowRequest[]>([]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    const csvContent = convertRequestsToCSV(requests);
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `psu-vet-borrow-database-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvInput(text);
      validateAndPreview(text);
    };
    reader.readAsText(file);
  };

  const validateAndPreview = (text: string) => {
    setErrorMsg('');
    try {
      const parsed = parseRequestsCSV(text);
      if (parsed.length === 0) {
        setErrorMsg('ไม่สามารถอ่านข้อมูล CSV ได้ หรือรูปแบบหัวคอลัมน์ไม่ถูกต้อง');
        setPreviewRows([]);
      } else {
        setPreviewRows(parsed);
      }
    } catch (err: any) {
      setErrorMsg(`เกิดข้อผิดพลาดในการประมวลผล CSV: ${err?.message || err}`);
      setPreviewRows([]);
    }
  };

  const handleCommitImport = () => {
    if (previewRows.length === 0) {
      setErrorMsg('กรุณาระบุข้อมูล CSV ที่ถูกต้องก่อนนำเข้า');
      return;
    }
    onImportRequests(previewRows, replaceAll);
    onClose();
  };

  const handleCopyCurrentCSV = () => {
    const csv = convertRequestsToCSV(requests);
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">จัดการฐานข้อมูลยืม-คืน ครุภัณฑ์ (CSV)</h3>
              <p className="text-xs text-slate-400">
                รองรับมาตรฐานข้อมูล โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Export Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">
                ส่งออกข้อมูลคำขอปัจจุบัน ({requests.length} รายการ)
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                ดาวน์โหลดเป็นไฟล์ CSV หรือคัดลอกข้อความสำหรับการสำรองข้อมูล
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCurrentCSV}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-700 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก CSV'}</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                id="btn-download-csv"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด .CSV</span>
              </button>
            </div>
          </div>

          {/* Import CSV Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-600" />
              นำเข้าข้อมูลจากไฟล์ CSV หรือวางข้อความ
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* File input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เลือกไฟล์ .CSV จากเครื่องของคุณ:
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* Textarea for CSV */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                หรือวางข้อความ CSV:
              </label>
              <textarea
                rows={5}
                value={csvInput}
                onChange={(e) => {
                  setCsvInput(e.target.value);
                  validateAndPreview(e.target.value);
                }}
                placeholder="id,status,createdAt,updatedAt,requesterName,requesterPosition,requesterDept,requesterEmail,purpose,borrowFrom,borrowFromTime,borrowTo,borrowToTime,equipmentJSON..."
                className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Import options */}
            <div className="flex items-center gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importOption"
                  checked={replaceAll}
                  onChange={() => setReplaceAll(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>แทนที่ฐานข้อมูลเดิมทั้งหมด</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importOption"
                  checked={!replaceAll}
                  onChange={() => setReplaceAll(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>เพิ่มต่อท้ายข้อมูลเดิม (Append)</span>
              </label>
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  ตรวจพบข้อมูลที่พร้อมนำเข้า: {previewRows.length} รายการ
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-emerald-100 text-xs text-slate-700">
                  {previewRows.map((r, i) => (
                    <div key={i} className="py-1 flex justify-between">
                      <span className="font-mono font-medium text-slate-900">{r.id}</span>
                      <span>{r.requesterName}</span>
                      <span className="text-slate-500">{r.status}</span>
                      <span className="text-slate-400 font-mono">{r.borrowTo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset button */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-amber-900">รีเซ็ตเป็นข้อมูลตัวอย่างเริ่มต้น</div>
              <div className="text-amber-700 text-[11px]">
                กู้คืนข้อมูล 8 รายการเดิมของคณะสัตวแพทยศาสตร์ ม.อ.
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลเป็นชุดเริ่มต้นของโรงพยาบาลสัตว์ ม.อ.?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
            >
              รีเซ็ตข้อมูล
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={previewRows.length === 0}
              onClick={handleCommitImport}
              id="btn-confirm-import"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>ยืนยันการนำเข้าข้อมูล ({previewRows.length} รายการ)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
