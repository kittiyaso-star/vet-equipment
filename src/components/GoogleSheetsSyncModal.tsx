import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  Check, 
  Copy, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  HelpCircle, 
  CloudCheck, 
  Link2,
  ChevronDown,
  ChevronUp,
  Database,
  Mail,
  Users,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { BorrowRequest, EquipmentMaster, StaffUser } from '../types';
import { 
  SPREADSHEET_ID, 
  SPREADSHEET_URL, 
  TAB_REQUESTS, 
  TAB_EQUIPMENT, 
  TAB_STAFF,
  DEFAULT_WEBHOOK_URL,
  getStoredWebhookUrl, 
  saveStoredWebhookUrl, 
  getLastSyncInfo, 
  syncRequestsToGoogleSheet, 
  syncEquipmentToGoogleSheet, 
  getAppsScriptCode, 
  convertEquipmentToCSV,
  testWebhookConnection
} from '../services/googleSheetsSync';
import { convertRequestsToCSV } from '../services/storage';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: BorrowRequest[];
  equipment: EquipmentMaster[];
  staffList?: StaffUser[];
  onRefreshEquipmentFromSheet?: (overrideWebhookUrl?: string) => Promise<any>;
  onRefreshStaffFromSheet?: (overrideWebhookUrl?: string) => Promise<any>;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  requests,
  equipment,
  staffList = [],
  onRefreshEquipmentFromSheet,
  onRefreshStaffFromSheet
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSavedWebhook, setIsSavedWebhook] = useState(false);
  const [isSyncingRequests, setIsSyncingRequests] = useState(false);
  const [isSyncingEquipment, setIsSyncingEquipment] = useState(false);
  const [isRefreshingSheet, setIsRefreshingSheet] = useState(false);
  const [isRefreshingStaff, setIsRefreshingStaff] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRequestsCsv, setCopiedRequestsCsv] = useState(false);
  const [copiedEquipmentCsv, setCopiedEquipmentCsv] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [lastSync, setLastSync] = useState(getLastSyncInfo());

  useEffect(() => {
    if (isOpen) {
      const saved = getStoredWebhookUrl();
      setWebhookUrl(saved);
      setIsSavedWebhook(!!saved);
      setLastSync(getLastSyncInfo());
      setFeedback(null);
      setWebhookTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isInvalidUrl = webhookUrl.includes('/edit') || webhookUrl.includes('/home/projects/');

  const handleSaveWebhook = () => {
    saveStoredWebhookUrl(webhookUrl);
    setIsSavedWebhook(!!webhookUrl.trim());
    setFeedback({
      type: 'success',
      message: webhookUrl.trim() 
        ? 'บันทึก Webhook URL เรียบร้อยแล้ว ระบบจะทำการส่งข้อมูลไปยัง Google Sheets อัตโนมัติทุกครั้งที่มีการบันทึกหรือแก้ไข'
        : 'ลบ Webhook URL เรียบร้อยแล้ว'
    });
    setLastSync(getLastSyncInfo());
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอก Webhook URL ก่อนกดทดสอบ' });
      return;
    }
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    setFeedback(null);
    try {
      const res = await testWebhookConnection(webhookUrl);
      setWebhookTestResult({ success: res.success, message: res.message });
      if (res.success) {
        setFeedback({ type: 'success', message: '✓ ทดสอบการเชื่อมต่อสำเร็จ! Webhook ออนไลน์และตอบสนองถูกต้อง' });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setWebhookTestResult({ success: false, message: `เกิดข้อผิดพลาด: ${err?.message || err}` });
      setFeedback({ type: 'error', message: `ทดสอบไม่สำเร็จ: ${err?.message || err}` });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSyncRequests = async () => {
    setIsSyncingRequests(true);
    setFeedback(null);
    try {
      const res = await syncRequestsToGoogleSheet(requests, webhookUrl);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `เกิดข้อผิดพลาด: ${err?.message || err}` });
    } finally {
      setIsSyncingRequests(false);
      setLastSync(getLastSyncInfo());
    }
  };

  const handleSyncEquipment = async () => {
    setIsSyncingEquipment(true);
    setFeedback(null);
    try {
      const res = await syncEquipmentToGoogleSheet(equipment, webhookUrl);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `เกิดข้อผิดพลาด: ${err?.message || err}` });
    } finally {
      setIsSyncingEquipment(false);
      setLastSync(getLastSyncInfo());
    }
  };

  const handleRefreshFromSheet = async () => {
    if (!onRefreshEquipmentFromSheet) return;
    setIsRefreshingSheet(true);
    setFeedback(null);
    try {
      await onRefreshEquipmentFromSheet(webhookUrl);
      setFeedback({ type: 'success', message: 'ดึงข้อมูลครุภัณฑ์ล่าสุดจากแท็บ "ครุภัณฑ์" เรียบร้อยแล้ว' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `ไม่สามารถดึงข้อมูลครุภัณฑ์ได้: ${err?.message || err}` });
    } finally {
      setIsRefreshingSheet(false);
    }
  };

  const handleRefreshStaffClick = async () => {
    if (!onRefreshStaffFromSheet) return;
    setIsRefreshingStaff(true);
    setFeedback(null);
    try {
      await onRefreshStaffFromSheet(webhookUrl);
      setFeedback({ type: 'success', message: 'ดึงรายชื่อบุคลากรจริงจากแท็บ "รายชื่อ" ใน Google Sheet สำเร็จแล้ว' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `ไม่สามารถดึงข้อมูลจากแท็บ "รายชื่อ" ได้: ${err?.message || err}` });
    } finally {
      setIsRefreshingStaff(false);
    }
  };

  const handleCopyAppsScript = () => {
    const code = getAppsScriptCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyRequestsCsv = () => {
    const csv = convertRequestsToCSV(requests);
    navigator.clipboard.writeText(csv);
    setCopiedRequestsCsv(true);
    setTimeout(() => setCopiedRequestsCsv(false), 2500);
  };

  const handleCopyEquipmentCsv = () => {
    const csv = convertEquipmentToCSV(equipment);
    navigator.clipboard.writeText(csv);
    setCopiedEquipmentCsv(true);
    setTimeout(() => setCopiedEquipmentCsv(false), 2500);
  };

  const handleDownloadRequestsCsv = () => {
    const csv = convertRequestsToCSV(requests);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `คำขอยืมครุภัณฑ์-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadEquipmentCsv = () => {
    const csv = convertEquipmentToCSV(equipment);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ครุภัณฑ์-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300 border border-white/10 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">เชื่อมต่อฐานข้อมูล Google Sheets</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-medium">
                  สองทิศทาง (2-Way Sync)
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                ฐานข้อมูลยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ. (มหาวิทยาลัยสงขลานครินทร์)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          
          {/* Active Database Link Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border border-emerald-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-xs font-bold text-emerald-950">
                  ฐานข้อมูล Google Sheets ที่เชื่อมต่อ:
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  ฐานข้อมูลยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ.
                </span>
              </div>
              <a
                href={SPREADSHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                <span>เปิดดูสเปรดชีตต้นทาง</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Sub-tabs stats - 3 Primary Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Tab 1: Requests */}
              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">แท็บที่ 1: คำขอยืมครุภัณฑ์</div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <span>"{TAB_REQUESTS}"</span>
                    <span className="text-[11px] px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                      {requests.length} รายการ
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    14 คอลัมน์ (สถานะ, ผู้ขอ, วันที่, รายการ)
                  </div>
                </div>
                <button
                  onClick={handleSyncRequests}
                  disabled={isSyncingRequests}
                  className="w-full px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="ส่งคำขอยืมทั้งหมดไปยังชีต"
                >
                  <Upload className={`w-3.5 h-3.5 ${isSyncingRequests ? 'animate-bounce' : ''}`} />
                  <span>{isSyncingRequests ? 'กำลังส่ง...' : 'ส่งข้อมูลไปชีต'}</span>
                </button>
              </div>

              {/* Tab 2: Equipment Master */}
              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">แท็บที่ 2: ครุภัณฑ์และอุปกรณ์</div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <span>"{TAB_EQUIPMENT}"</span>
                    <span className="text-[11px] px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      {equipment.length} รายการ
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    8 คอลัมน์ (รหัส, ชื่อ, ยี่ห้อ, ห้อง, ราคา)
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSyncEquipment}
                    disabled={isSyncingEquipment}
                    className="flex-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                    title="ส่งข้อมูลครุภัณฑ์ทั้งหมดไปยังชีต"
                  >
                    <Upload className={`w-3 h-3 ${isSyncingEquipment ? 'animate-bounce' : ''}`} />
                    <span>ส่งไปชีต</span>
                  </button>
                  {onRefreshEquipmentFromSheet && (
                    <button
                      onClick={handleRefreshFromSheet}
                      disabled={isRefreshingSheet}
                      className="flex-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                      title="ดึงข้อมูลครุภัณฑ์ล่าสุดจากชีต"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingSheet ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingSheet ? 'กำลังดึง...' : 'ดึงจากชีต'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tab 3: Staff Roster */}
              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">แท็บที่ 3: รายชื่อบุคลากร</div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <span>"{TAB_STAFF}"</span>
                    <span className="text-[11px] px-2 py-0.2 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                      {staffList.length} ท่าน
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    บุคลากร, คำนำหน้า, สังกัด, อีเมล, สิทธิ์
                  </div>
                </div>
                <div>
                  {onRefreshStaffFromSheet && (
                    <button
                      onClick={handleRefreshStaffClick}
                      disabled={isRefreshingStaff}
                      className="w-full px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                      title="ดึงรายชื่อบุคลากรจริงจากชีต"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStaff ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingStaff ? 'กำลังดึงข้อมูล...' : 'ดึงรายชื่อจากชีต'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sync status info banner */}
            <div className="text-[11px] text-emerald-900 bg-emerald-100/50 p-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>การจัดเก็บข้อมูล:</strong> บันทึกคำขอใหม่, การอนุมัติ, ตรวจรับคืน, และครุภัณฑ์ลงระบบทันที พร้อมซิงค์เข้า-ออกกับ Google Sheets ทั้ง 3 แท็บอัตโนมัติ
              </span>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedback.message}</div>
            </div>
          )}

          {/* Webhook Configuration for Automatic Direct Sync */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span>ตั้งค่าการซิงค์ผ่าน Google Apps Script (Webhook URL)</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                isSavedWebhook 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isSavedWebhook ? '✓ เชื่อมต่อ Webhook แล้ว' : 'ยังไม่ได้เชื่อม Webhook'}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              นำ <strong>URL ของเว็บแอป (Web App URL)</strong> ที่ได้จากการ Deploy ใน Google Apps Script ของชีตนี้มาวาง เพื่อให้ระบบดึงข้อมูลจากชีต <strong>"ครุภัณฑ์"</strong> และ <strong>"รายชื่อ"</strong> รวมถึงส่งข้อมูลกลับไปอัปเดตอัตโนมัติ
            </p>

            {/* Warning if user pasted edit URL */}
            {isInvalidUrl && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-red-900">⚠️ ตรวจพบ URL ผิดประเภท (หน้าแก้ไขโค้ด /edit)</div>
                  <div>URL ที่คุณระบุลงท้ายด้วย <code>/edit</code> ซึ่งเป็นหน้าแก้ไขสคริปต์ ไม่ใช่ API endpoint จึงทำให้ Google ส่งกลับ <strong>404 Not Found</strong> เสมอ</div>
                  <div className="text-[11px] text-red-700">
                    👉 <strong>วิธีแก้ไข:</strong> ในหน้า Apps Script ให้กดปุ่ม <strong>"ทำให้ใช้งานได้" (Deploy)</strong> &gt; <strong>"การทำให้ใช้งานได้ใหม่" (New deployment)</strong> &gt; เลือกประเภท <strong>"เว็บแอป"</strong> &gt; ผู้มีสิทธิ์เข้าถึง: <strong>"ทุกคน (Anyone)"</strong> &gt; แล้วคัดลอก URL ที่ลงท้ายด้วย <code>/exec</code> มาวางแทน
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-mono outline-none focus:ring-2 text-slate-800 ${
                  isInvalidUrl ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSaveWebhook}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-xs"
                >
                  บันทึก URL
                </button>
                <button
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook || !webhookUrl.trim()}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="ทดสอบว่า Webhook ใช้งานได้หรือไม่"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-600 ${isTestingWebhook ? 'animate-pulse' : ''}`} />
                  <span>{isTestingWebhook ? 'กำลังทดสอบ...' : 'ทดสอบเชื่อมต่อ'}</span>
                </button>
              </div>
            </div>

            {webhookUrl !== DEFAULT_WEBHOOK_URL && (
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setWebhookUrl(DEFAULT_WEBHOOK_URL);
                    saveStoredWebhookUrl(DEFAULT_WEBHOOK_URL);
                    setIsSavedWebhook(true);
                    setFeedback({ type: 'success', message: 'รีเซ็ตเป็น Web App URL หลักของระบบเรียบร้อยแล้ว' });
                  }}
                  className="text-[11px] text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
                >
                  ↺ คลิกเพื่อใช้ Web App URL ล่าสุดของ รพ.สัตว์ ม.อ. (ตั้งต้น)
                </button>
              </div>
            )}

            {/* Test result display */}
            {webhookTestResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                webhookTestResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {webhookTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{webhookTestResult.message}</div>
              </div>
            )}

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onRefreshEquipmentFromSheet && (
                <button
                  onClick={handleRefreshFromSheet}
                  disabled={isRefreshingSheet}
                  className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg text-xs font-semibold text-emerald-800 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingSheet ? 'animate-spin' : ''}`} />
                  <span>ดึงข้อมูลครุภัณฑ์จากชีต ({equipment.length})</span>
                </button>
              )}

              {onRefreshStaffFromSheet && (
                <button
                  onClick={handleRefreshStaffClick}
                  disabled={isRefreshingStaff}
                  className="px-3 py-1.5 bg-white border border-purple-300 hover:bg-purple-50 rounded-lg text-xs font-semibold text-purple-800 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Users className={`w-3.5 h-3.5 text-purple-600 ${isRefreshingStaff ? 'animate-pulse' : ''}`} />
                  <span>ดึงรายชื่อบุคลากรจากชีต ({staffList.length})</span>
                </button>
              )}

              <button
                onClick={handleSyncRequests}
                disabled={isSyncingRequests}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Upload className={`w-3.5 h-3.5 text-blue-600 ${isSyncingRequests ? 'animate-bounce' : ''}`} />
                <span>ส่งคำขอยืม ({requests.length}) ไปชีต</span>
              </button>

              <button
                onClick={handleSyncEquipment}
                disabled={isSyncingEquipment}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Upload className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingEquipment ? 'animate-bounce' : ''}`} />
                <span>ส่งครุภัณฑ์ ({equipment.length}) ไปชีต</span>
              </button>
            </div>
          </div>

          {/* Dedicated Troubleshooting & 404 Resolution Guide */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-2.5 text-xs text-amber-950">
            <div className="font-bold flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ทำไม Google Sheet จึงไม่ดึงข้อมูล หรือขึ้นแจ้งเตือน 404 Not Found?</span>
            </div>
            <div className="space-y-1.5 pl-6 text-slate-700 leading-relaxed">
              <div>
                <strong>1. สิทธิ์การเข้าถึง (Who has access) สำคัญที่สุด:</strong> ใน Google Apps Script ตอนกด <code>Deploy &gt; New deployment &gt; Web app</code> ช่อง <strong>"ผู้มีสิทธิ์เข้าถึง (Who has access)"</strong> ต้องเลือกเป็น <strong>"ทุกคน (Anyone)"</strong> เท่านั้น (หากเลือกเป็น "เฉพาะฉัน" หรือ "PSU" Google จะบล็อกการเรียกจากหน้าเว็บ และตอบกลับเป็น 404 เสมอ)
              </div>
              <div>
                <strong>2. ตรวจสอบลิงก์ Web App URL:</strong> ต้องคัดลอกลิงก์ที่ลงท้ายด้วย <code>/exec</code> มาวาง (ห้ามใช้ลิงก์หน้าโค้ดที่ลงท้ายด้วย <code>/edit</code>)
              </div>
              <div>
                <strong>3. ตรวจสอบชื่อแท็บใน Google Sheet:</strong> ในไฟล์ Google Sheet ต้องมีแท็บชื่อ <strong>"ครุภัณฑ์"</strong> และแท็บชื่อ <strong>"รายชื่อ"</strong> สะกดตรงตามนี้เป๊ะ
              </div>
            </div>
          </div>

          {/* Quick Copy / Download CSV (Manual Backup Alternative) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Download className="w-4 h-4 text-slate-600" />
              <span>สำรองข้อมูล / คัดลอกไปวางลงใน Google Sheets โดยตรง (Manual Copy & Paste)</span>
            </div>
            <p className="text-xs text-slate-500">
              หากต้องการนำข้อมูลไปวางใน Google Sheet ด้วยตนเอง สามารถคัดลอกหรือดาวน์โหลดเป็นไฟล์ CSV ที่จัดรูปแบบตรงกับหัวตารางของทั้งสองแท็บได้ทันที
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Requests CSV */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-800">แท็บ "คำขอยืมครุภัณฑ์" ({requests.length} รายการ)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">รวมรหัสคำขอ, สถานะล่าสุด, ผู้ขอ, และรายการอุปกรณ์</div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyRequestsCsv}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedRequestsCsv ? 'คัดลอกแล้ว!' : 'คัดลอก CSV'}</span>
                  </button>
                  <button
                    onClick={handleDownloadRequestsCsv}
                    className="flex-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>โหลดไฟล์ .csv</span>
                  </button>
                </div>
              </div>

              {/* Equipment CSV */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-800">แท็บ "ครุภัณฑ์" ({equipment.length} รายการ)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">รวมรหัสครุภัณฑ์, วันที่ตรวจรับ, ยี่ห้อ, รุ่น, สถานที่ และราคา</div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyEquipmentCsv}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedEquipmentCsv ? 'คัดลอกแล้ว!' : 'คัดลอก CSV'}</span>
                  </button>
                  <button
                    onClick={handleDownloadEquipmentCsv}
                    className="flex-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>โหลดไฟล์ .csv</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Step-by-Step Google Apps Script Code Generator */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCodeGuide(!showCodeGuide)}
              className="w-full p-4 bg-slate-100 hover:bg-slate-200/70 transition flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    วิธีติดตั้ง Google Apps Script สำหรับการซิงค์อัตโนมัติ (ทำเพียง 1 ครั้ง)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    คลิกเพื่อดูขั้นตอนและคัดลอกโค้ด Apps Script สำเร็จรูปที่รองรับชีตนี้โดยเฉพาะ
                  </div>
                </div>
              </div>
              <div className="text-slate-500 p-1">
                {showCodeGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showCodeGuide && (
              <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4 text-xs text-slate-700">
                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>ขั้นตอนการนำโค้ดไปวางใน Google Sheet (ใช้เวลาไม่เกิน 1 นาที):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
                    <li>
                      เปิด Google Sheet: <a href={SPREADSHEET_URL} target="_blank" rel="noreferrer" className="text-blue-700 underline font-semibold">ฐานข้อมูลยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ.</a>
                    </li>
                    <li>ไปที่เมนูด้านบน <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
                    <li>ลบโค้ดเริ่มต้นออก แล้วกดปุ่มด้านล่างเพื่อ <strong>คัดลอกโค้ดสำเร็จรูป</strong> ไปวางแทนที่ทั้งหมด</li>
                    <li>กดปุ่มบันทึก (ไอคอนรูปแผ่นดิสก์)</li>
                    <li>
                      กดปุ่ม <strong>ทำให้ใช้งานได้ (Deploy)</strong> มุมขวาบน &gt; เลือก <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong>
                    </li>
                    <li>
                      คลิกฟันเฟือง เลือกชนิดเป็น <strong>เว็บแอป (Web App)</strong>
                      <div className="ml-4 mt-1 text-[11px] text-slate-500">
                        • คำอธิบาย: <code>ระบบยืมคืนครุภัณฑ์ รพ.สัตว์</code><br />
                        • ดำเนินการในฐานะ: <strong>บัญชีของฉัน (Me)</strong><br />
                        • ผู้มีสิทธิ์เข้าถึง: <strong>ทุกคน (Anyone)</strong> หรือ <strong>ทุกคนใน psu.ac.th</strong>
                      </div>
                    </li>
                    <li>กดปุ่ม <strong>ทำให้ใช้งานได้</strong> และกดยอมรับสิทธิ์ (Authorize access)</li>
                    <li>คัดลอก <strong>URL ของเว็บแอป (Web App URL)</strong> มาใส่ในช่อง Webhook ด้านบน แล้วกดบันทึก!</li>
                  </ol>

                  {/* Email Notification Feature Highlight */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ระบบแจ้งเตือนทางอีเมลอัตโนมัติ (Google MailApp) รวมอยู่ในโค้ดแล้ว:</span>
                    </div>
                    <ul className="list-disc list-inside text-emerald-800 text-[11px] space-y-0.5 pl-1">
                      <li><strong>เมื่อมีผู้ยื่นคำขอยืม:</strong> ระบบจะส่งอีเมลแจ้งเตือนไปยัง <strong>เจ้าของครุภัณฑ์แต่ละท่าน</strong> (@psu.ac.th) ทันที พร้อมระบุชื่อผู้ขอ, รายการ และช่วงเวลา</li>
                      <li><strong>เมื่อเจ้าของกดยินยอม:</strong> ระบบจะส่งอีเมลส่งต่อไปยัง <strong>ผู้บริหาร (ดร.สพ.ญ.ญาดา ดวงนำสว่าง)</strong> เพื่อพิจารณาอนุมัติขั้นสุดท้าย</li>
                      <li><strong>เมื่ออนุมัติเรียบร้อย:</strong> ระบบจะส่งอีเมลยืนยันผลการอนุมัติให้แก่ <strong>ผู้ขอยืม</strong> เพื่อเตรียมรับอุปกรณ์</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="font-semibold text-slate-800 text-[11px]">โค้ด Google Apps Script สำเร็จรูป:</span>
                    <button
                      onClick={handleCopyAppsScript}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode ? 'คัดลอกโค้ดเรียบร้อยแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-700 select-all">
                    {getAppsScriptCode()}
                  </pre>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            ฐานข้อมูล: <strong>1jGol5v7T8hyZO8dBNo8i-MaoCnW_b7WSsGn2P63MYts</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
