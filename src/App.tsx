/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getStoredRequests, 
  saveStoredRequests, 
  getStoredEquipment, 
  saveStoredEquipment, 
  generateSystemNotifications, 
  resetToDefaults,
  getStoredStaffUsers,
  saveStoredStaffUsers,
  getStoredActiveUserEmail,
  saveStoredActiveUserEmail,
  getStoredIsAuthenticated,
  saveStoredIsAuthenticated,
  clearUserSession
} from './services/storage';
import { BorrowRequest, EquipmentMaster, SystemNotification, BorrowedEquipmentItem, BorrowRequestStatus, StaffUser } from './types';
import { STAFF_USERS } from './data/initialData';

import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { RequestList } from './components/RequestList';
import { BorrowFormModal } from './components/BorrowFormModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { ReturnCheckInModal } from './components/ReturnCheckInModal';
import { EquipmentCatalogModal } from './components/EquipmentCatalogModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PrintBorrowSlipModal } from './components/PrintBorrowSlipModal';
import { ExportImportModal } from './components/ExportImportModal';
import { PsuSsoLoginModal } from './components/PsuSsoLoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { OidcLoginScreen } from './components/OidcLoginScreen';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { EditBorrowRequestModal } from './components/EditBorrowRequestModal';
import { 
  getStoredWebhookUrl, 
  syncRequestsToGoogleSheet, 
  syncSingleRequestToGoogleSheet,
  syncEquipmentToGoogleSheet,
  appendEquipmentToGoogleSheet,
  fetchEquipmentFromGoogleSheets,
  fetchStaffFromGoogleSheets,
  fetchRequestsFromGoogleSheets
} from './services/googleSheetsSync';
import { fetchGoogleSheetCSV, parseEquipmentSheetCSV } from './services/storage';

import { 
  Bell, 
  AlertTriangle, 
  Building2, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  Search,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [equipment, setEquipment] = useState<EquipmentMaster[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [staffDatabase, setStaffDatabase] = useState<StaffUser[]>([]);
  const [currentUser, setCurrentUser] = useState<StaffUser>(STAFF_USERS[0]); // กิตติยา สุนทรเจริญนนท์
  const [currentPortal, setCurrentPortal] = useState<'user' | 'admin'>('user');
  const [activeStatFilter, setActiveStatFilter] = useState('ALL');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Modal states
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isGoogleSheetsSyncModalOpen, setIsGoogleSheetsSyncModalOpen] = useState(false);
  const [isOidcModalOpen, setIsOidcModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<BorrowRequest | null>(null);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<BorrowRequest | null>(null);
  const [selectedPrintRequest, setSelectedPrintRequest] = useState<BorrowRequest | null>(null);
  const [selectedEditRequest, setSelectedEditRequest] = useState<BorrowRequest | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    const loadedRequests = getStoredRequests();
    const loadedEquipment = getStoredEquipment();
    const loadedStaff = getStoredStaffUsers();
    const authStatus = getStoredIsAuthenticated();

    setRequests(loadedRequests);
    setEquipment(loadedEquipment);
    setStaffDatabase(loadedStaff);
    setNotifications(generateSystemNotifications(loadedRequests));
    setIsAuthenticated(authStatus);

    const activeEmail = getStoredActiveUserEmail();
    const matched = loadedStaff.find(u => u.email.toLowerCase() === activeEmail.toLowerCase()) || loadedStaff[0];
    if (matched) {
      setCurrentUser(matched);
      if (matched.role === 'admin') {
        setCurrentPortal('admin');
      }
    }

    // Auto-fetch latest staff, equipment, and requests from Google Sheets in the background
    const syncFromLiveSheets = async () => {
      try {
        const [staffRes, eqRes, reqRes] = await Promise.allSettled([
          fetchStaffFromGoogleSheets(),
          fetchEquipmentFromGoogleSheets(),
          fetchRequestsFromGoogleSheets()
        ]);

        if (staffRes.status === 'fulfilled' && staffRes.value.success && staffRes.value.staff.length > 0) {
          const liveStaff = staffRes.value.staff;
          setStaffDatabase(liveStaff);
          saveStoredStaffUsers(liveStaff);
          const currentActive = getStoredActiveUserEmail();
          const matchedLive = liveStaff.find(u => u.email.toLowerCase() === currentActive.toLowerCase());
          if (matchedLive) {
            setCurrentUser(matchedLive);
          }
        }

        if (eqRes.status === 'fulfilled' && eqRes.value.success && eqRes.value.equipment.length > 0) {
          setEquipment(eqRes.value.equipment);
          saveStoredEquipment(eqRes.value.equipment);
        }

        if (reqRes.status === 'fulfilled' && reqRes.value.success && reqRes.value.requests.length > 0) {
          const liveReqs = reqRes.value.requests;
          // Merge with current state so no local unsynced edits are lost
          const existingIds = new Set(liveReqs.map(r => r.id));
          const currentLocal = getStoredRequests();
          const localOnly = currentLocal.filter(r => !existingIds.has(r.id));
          const merged = [...liveReqs, ...localOnly];
          setRequests(merged);
          saveStoredRequests(merged);
          setNotifications(generateSystemNotifications(merged));
        }
      } catch (err) {
        console.warn('Background sync from Google Sheets:', err);
      }
    };

    syncFromLiveSheets();
  }, []);

  const handleSelectUser = (u: StaffUser) => {
    setCurrentUser(u);
    saveStoredActiveUserEmail(u.email);
    if (u.role === 'admin') {
      setCurrentPortal('admin');
    }
  };

  const handleUpdateStaffList = (updated: StaffUser[]) => {
    setStaffDatabase(updated);
    saveStoredStaffUsers(updated);
    const refreshedCurrent = updated.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (refreshedCurrent) {
      setCurrentUser(refreshedCurrent);
    }
  };

  const handleLoginSuccess = (user: StaffUser, updatedList: StaffUser[]) => {
    setStaffDatabase(updatedList);
    saveStoredStaffUsers(updatedList);
    setCurrentUser(user);
    saveStoredActiveUserEmail(user.email);
    setIsAuthenticated(true);
    saveStoredIsAuthenticated(true);
    setIsOidcModalOpen(false);
    if (user.role === 'admin') {
      setCurrentPortal('admin');
    } else {
      setCurrentPortal('user');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    saveStoredIsAuthenticated(false);
    clearUserSession();
  };

  const triggerSyncToast = (msg: string) => {
    setSyncToastMessage(msg);
    setTimeout(() => {
      setSyncToastMessage(null);
    }, 4500);
  };

  // Auto-sync requests to Google Sheets
  const triggerRequestsSync = async (updatedRequests: BorrowRequest[], singleReq?: BorrowRequest) => {
    const webhookUrl = getStoredWebhookUrl();
    if (webhookUrl) {
      try {
        if (singleReq) {
          await syncSingleRequestToGoogleSheet(singleReq, webhookUrl);
        } else {
          await syncRequestsToGoogleSheet(updatedRequests, webhookUrl);
        }
      } catch (err) {
        console.warn('Auto-sync to Google Sheets failed', err);
      }
    }
  };

  // Auto-sync equipment to Google Sheets
  const triggerEquipmentSync = async (updatedEq: EquipmentMaster[], newItem?: EquipmentMaster) => {
    const webhookUrl = getStoredWebhookUrl();
    if (webhookUrl) {
      try {
        if (newItem) {
          await appendEquipmentToGoogleSheet(newItem, webhookUrl);
        } else {
          await syncEquipmentToGoogleSheet(updatedEq, webhookUrl);
        }
      } catch (err) {
        console.warn('Auto-sync equipment to Google Sheets failed', err);
      }
    }
  };

  // Update requests helper
  const updateRequestsState = (updatedList: BorrowRequest[], changedRequest?: BorrowRequest) => {
    setRequests(updatedList);
    saveStoredRequests(updatedList);
    setEquipment(getStoredEquipment());
    setNotifications(generateSystemNotifications(updatedList));
    triggerRequestsSync(updatedList, changedRequest);
  };

  // Submit new request
  const handleCreateRequest = (newRequest: BorrowRequest) => {
    const updated = [newRequest, ...requests];
    updateRequestsState(updated, newRequest);
    setIsBorrowModalOpen(false);
    triggerSyncToast(`บันทึกคำขอยืม ${newRequest.id} สำเร็จ — ข้อมูลถูกบันทึกลงในฐานข้อมูลแล้ว`);
  };

  // Approve request
  const handleApproveRequest = (request: BorrowRequest) => {
    const updated = requests.map(r => {
      if (r.id === request.id) {
        return {
          ...r,
          status: 'เจ้าของให้ยืมแล้ว' as BorrowRequestStatus,
          updatedAt: new Date().toISOString(),
          equipmentList: r.equipmentList.map(eq => ({
            ...eq,
            ownerStatus: 'ยินยอม'
          }))
        };
      }
      return r;
    });

    const changedReq = updated.find(r => r.id === request.id);
    updateRequestsState(updated, changedReq);
    if (selectedDetailRequest && selectedDetailRequest.id === request.id) {
      setSelectedDetailRequest(changedReq || null);
    }
  };

  // Handle per-item owner approval (แต่ละรายการเจ้าของกดให้ยืมเอง)
  const handleApproveItem = (requestId: string, itemCode: string, isAgreed: boolean, note?: string) => {
    let changedReq: BorrowRequest | undefined;
    const updated = requests.map(r => {
      if (r.id === requestId) {
        const updatedList = r.equipmentList.map(item => {
          if (item.code === itemCode) {
            return {
              ...item,
              ownerStatus: isAgreed ? ('ยินยอม' as const) : ('ไม่ยินยอม' as const),
              ownerDecisionAt: new Date().toISOString(),
              ownerDecisionBy: currentUser.name,
              ownerDecisionNote: note || ''
            };
          }
          return item;
        });

        // If all items are agreed by their respective owners, route to executive
        const allAgreed = updatedList.every(i => i.ownerStatus === 'ยินยอม');
        const anyDisagreed = updatedList.some(i => i.ownerStatus === 'ไม่ยินยอม');

        let nextStatus = r.status;
        if (anyDisagreed) {
          nextStatus = 'ยกเลิกคำขอ';
        } else if (allAgreed) {
          nextStatus = 'รอผู้บริหารอนุมัติ';
        }

        const modified = {
          ...r,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          equipmentList: updatedList
        };
        changedReq = modified;
        return modified;
      }
      return r;
    });

    updateRequestsState(updated, changedReq);
    if (selectedDetailRequest && selectedDetailRequest.id === requestId) {
      setSelectedDetailRequest(changedReq || null);
    }
  };

  // Handle executive approval (รอง ผอ. สพ.ญ.ญาดา ดวงนำสว่าง หรือ Admin อนุมัติขั้นสุดท้าย)
  const handleExecutiveApprove = (requestId: string, executiveNote?: string) => {
    let changedReq: BorrowRequest | undefined;
    const updated = requests.map(r => {
      if (r.id === requestId) {
        const modified = {
          ...r,
          status: 'เจ้าของให้ยืมแล้ว' as BorrowRequestStatus,
          updatedAt: new Date().toISOString(),
          executiveApprovedAt: new Date().toISOString(),
          executiveApprovedBy: currentUser.name || 'สพ.ญ.ญาดา ดวงนำสว่าง',
          notes: executiveNote ? `${r.notes || ''} [ความเห็นผู้บริหาร: ${executiveNote}]` : r.notes
        };
        changedReq = modified;
        return modified;
      }
      return r;
    });

    updateRequestsState(updated, changedReq);
    if (selectedDetailRequest && selectedDetailRequest.id === requestId) {
      setSelectedDetailRequest(changedReq || null);
    }
  };

  // Confirm return check-in
  const handleConfirmReturn = (
    requestId: string,
    updatedItems: BorrowedEquipmentItem[],
    receiverName: string,
    returnNote: string
  ) => {
    let changedReq: BorrowRequest | undefined;
    const updated = requests.map(r => {
      if (r.id === requestId) {
        const modified = {
          ...r,
          status: 'รับคืนเรียบร้อย' as BorrowRequestStatus,
          updatedAt: new Date().toISOString(),
          returnedAt: new Date().toISOString(),
          returnReceivedBy: receiverName,
          notes: returnNote ? `${r.notes || ''} [บันทึกรับคืน: ${returnNote}]` : r.notes,
          equipmentList: updatedItems
        };
        changedReq = modified;
        return modified;
      }
      return r;
    });

    updateRequestsState(updated, changedReq);
    setSelectedReturnRequest(null);
    if (selectedDetailRequest && selectedDetailRequest.id === requestId) {
      setSelectedDetailRequest(changedReq || null);
    }
  };

  // Cancel request
  const handleCancelRequest = (requestId: string) => {
    if (!confirm('ยืนยันการยกเลิกคำขอยืมครุภัณฑ์นี้หรือไม่?')) return;
    const updated = requests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'ยกเลิกคำขอ' as BorrowRequestStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    updateRequestsState(updated);
    setSelectedDetailRequest(null);
  };

  // Open edit borrow request modal
  const handleOpenEditRequest = (req: BorrowRequest) => {
    setSelectedEditRequest(req);
    setIsEditModalOpen(true);
  };

  // Save edited borrow request
  const handleSaveEditedRequest = (updatedReq: BorrowRequest) => {
    const updatedList = requests.map(r => r.id === updatedReq.id ? updatedReq : r);
    updateRequestsState(updatedList, updatedReq);
    if (selectedDetailRequest && selectedDetailRequest.id === updatedReq.id) {
      setSelectedDetailRequest(updatedReq);
    }
    triggerSyncToast(`บันทึกการแก้ไขคำขอ ${updatedReq.id} สำเร็จ (ข้อมูลอัปเดตลง Google Sheets เรียบร้อยแล้ว)`);
  };

  // Add equipment to catalog - append to end of list so it doesn't prepend to top row of Google Sheets
  const handleAddNewEquipment = (item: EquipmentMaster) => {
    const updatedEq = [...equipment, item];
    setEquipment(updatedEq);
    saveStoredEquipment(updatedEq);
    triggerEquipmentSync(updatedEq, item);
    triggerSyncToast(`เพิ่มครุภัณฑ์ "${item.name}" สำเร็จ — บันทึกลงต่อท้ายฐานข้อมูลแล้ว`);
  };

  // Update equipment in catalog
  const handleUpdateEquipment = (item: EquipmentMaster) => {
    const updatedEq = equipment.map(eq => eq.id === item.id ? item : eq);
    setEquipment(updatedEq);
    saveStoredEquipment(updatedEq);
    triggerEquipmentSync(updatedEq);
    triggerSyncToast(`แก้ไขข้อมูลครุภัณฑ์ "${item.name}" เรียบร้อยแล้ว — บันทึกลงฐานข้อมูลแล้ว`);
  };

  // Batch update equipment (e.g. from Google Sheets sync or CSV import)
  const handleBatchUpdateEquipment = (items: EquipmentMaster[]) => {
    setEquipment(items);
    saveStoredEquipment(items);
    triggerEquipmentSync(items);
    triggerSyncToast(`อัปเดตข้อมูลครุภัณฑ์ ${items.length} รายการจากชีตเรียบร้อยแล้ว`);
  };

  // Refresh equipment directly from Google Sheets (tab 'ครุภัณฑ์')
  const handleRefreshEquipmentFromSheet = async (overrideWebhookUrl?: string) => {
    const res = await fetchEquipmentFromGoogleSheets(overrideWebhookUrl);
    if (res.success && res.equipment.length > 0) {
      setEquipment(res.equipment);
      saveStoredEquipment(res.equipment);
      triggerSyncToast(`ดึงข้อมูลครุภัณฑ์ ${res.equipment.length} รายการจากชีต "ครุภัณฑ์" เรียบร้อยแล้ว`);
      return res;
    }
    throw new Error(res.message || 'ไม่สามารถดึงข้อมูลครุภัณฑ์ได้');
  };

  // Refresh staff list directly from Google Sheets (tab 'รายชื่อ')
  const handleRefreshStaffFromSheet = async (overrideWebhookUrl?: string) => {
    const res = await fetchStaffFromGoogleSheets(overrideWebhookUrl);
    if (res.success && res.staff.length > 0) {
      setStaffDatabase(res.staff);
      saveStoredStaffUsers(res.staff);
      triggerSyncToast(`ดึงรายชื่อบุคลากรจริง ${res.staff.length} ท่านจากชีต "รายชื่อ" เรียบร้อยแล้ว`);
      return res;
    }
    throw new Error(res.message || 'ไม่สามารถดึงรายชื่อบุคลากรได้');
  };

  // Refresh borrow requests directly from Google Sheets (tab 'คำขอยืมครุภัณฑ์')
  const handleRefreshRequestsFromSheet = async (overrideWebhookUrl?: string) => {
    const res = await fetchRequestsFromGoogleSheets(overrideWebhookUrl);
    if (res.success && res.requests.length > 0) {
      const existingIds = new Set(res.requests.map(r => r.id));
      const currentLocal = getStoredRequests();
      const localOnly = currentLocal.filter(r => !existingIds.has(r.id));
      const merged = [...res.requests, ...localOnly];
      setRequests(merged);
      saveStoredRequests(merged);
      setNotifications(generateSystemNotifications(merged));
      triggerSyncToast(`ดึงรายการคำขอยืม ${res.requests.length} รายการจากชีตเรียบร้อยแล้ว`);
      return res;
    }
    throw new Error(res.message || 'ไม่สามารถดึงข้อมูลคำขอยืมจากชีตได้');
  };

  // Reset to initial dataset
  const handleResetData = () => {
    resetToDefaults();
    const loadedRequests = getStoredRequests();
    const loadedEquipment = getStoredEquipment();
    setRequests(loadedRequests);
    setEquipment(loadedEquipment);
    setNotifications(generateSystemNotifications(loadedRequests));
  };

  // Import CSV data
  const handleImportRequests = (imported: BorrowRequest[], replaceAll: boolean) => {
    let finalRequests: BorrowRequest[] = [];
    if (replaceAll) {
      finalRequests = imported;
    } else {
      // Append non-duplicate IDs
      const existingIds = new Set(requests.map(r => r.id));
      const filteredImported = imported.filter(r => !existingIds.has(r.id));
      finalRequests = [...filteredImported, ...requests];
    }

    updateRequestsState(finalRequests);
  };

  // Overdue count for top alert bar
  const overdueCount = notifications.filter(n => n.type === 'overdue').length;

  // If user is not authenticated via OIDC, render the official OIDC Login Screen Gate
  if (!isAuthenticated) {
    return (
      <OidcLoginScreen
        staffDatabase={staffDatabase.length > 0 ? staffDatabase : STAFF_USERS}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        currentUser={currentUser}
        staffDatabase={staffDatabase}
        onSelectUser={handleSelectUser}
        unreadNotifsCount={notifications.length}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        onOpenNewBorrow={() => setIsBorrowModalOpen(true)}
        onOpenCatalog={() => setIsCatalogModalOpen(true)}
        onOpenExportImport={() => setIsExportImportModalOpen(true)}
        onResetData={handleResetData}
        currentPortal={currentPortal}
        onChangePortal={setCurrentPortal}
        onOpenOidcLogin={() => setIsOidcModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenGoogleSheetsSync={() => setIsGoogleSheetsSyncModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Admin Preview Mode Banner */}
        {currentUser.role === 'admin' && currentPortal === 'user' && (
          <div className="p-3 px-4 rounded-xl bg-sky-50/80 border border-sky-200 text-sky-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-sky-200/80 text-sky-900 font-bold text-[11px]">
                มุมมองจำลอง
              </span>
              <span>
                กำลังแสดงหน้าจอในมุมมองของ <strong>บุคลากรทั่วไป (ผู้ขอยืม / เจ้าของครุภัณฑ์)</strong> — ปุ่ม Google Sheets, จัดการสิทธิ์ และคลังครุภัณฑ์จะถูกซ่อนไว้เพื่อความเรียบง่าย
              </span>
            </div>
            <button
              onClick={() => setCurrentPortal('admin')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer shadow-2xs"
            >
              สลับกลับหน้า Admin
            </button>
          </div>
        )}

        {/* Urgent Overdue Alert Banner if overdue loans exist */}
        {overdueCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-500/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-bold">ระบบแจ้งเตือนด่วน:</span>{' '}
                พบครุภัณฑ์เกินกำหนดส่งคืนจำนวน{' '}
                <span className="font-bold underline underline-offset-2">{overdueCount} รายการ</span>{' '}
                กรุณาตรวจสอบและดำเนินการติดตามคืนอุปกรณ์
              </div>
            </div>
            <button
              onClick={() => setIsNotifDrawerOpen(true)}
              className="px-3 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer shadow-xs"
            >
              ดูรายการแจ้งเตือน
            </button>
          </div>
        )}

        {/* Dashboard Metrics Overview */}
        <StatsOverview
          requests={requests}
          equipment={equipment}
          activeFilter={activeStatFilter}
          onFilterChange={(val) => setActiveStatFilter(val)}
        />

        {/* Requests Management Table */}
        <RequestList
          requests={requests}
          currentStaffEmail={currentUser.email}
          currentPortal={currentPortal}
          isAdmin={currentUser.role === 'admin'}
          onViewDetails={(req) => setSelectedDetailRequest(req)}
          onApproveRequest={handleApproveRequest}
          onReturnCheckIn={(req) => setSelectedReturnRequest(req)}
          onPrintSlip={(req) => setSelectedPrintRequest(req)}
          onEditRequest={handleOpenEditRequest}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-700" />
            <span className="font-medium text-slate-700">
              โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (PSU Animal Hospital)
            </span>
          </div>
          <div className="text-slate-400">
            ระบบบริการจัดการยืม-คืน ครุภัณฑ์และอุปกรณ์ทางการแพทย์ออนไลน์แบบเรียลไทม์
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <BorrowFormModal
        isOpen={isBorrowModalOpen}
        onClose={() => setIsBorrowModalOpen(false)}
        onSubmit={handleCreateRequest}
        masterEquipment={equipment}
        currentUser={currentUser}
        staffDatabase={staffDatabase}
      />

      <RequestDetailModal
        isOpen={Boolean(selectedDetailRequest)}
        onClose={() => setSelectedDetailRequest(null)}
        request={selectedDetailRequest}
        onApprove={handleApproveRequest}
        onReturnCheckIn={(req) => setSelectedReturnRequest(req)}
        onPrintSlip={(req) => setSelectedPrintRequest(req)}
        onCancelRequest={handleCancelRequest}
        currentUser={currentUser}
        onApproveItem={handleApproveItem}
        onExecutiveApprove={handleExecutiveApprove}
        onOpenEdit={handleOpenEditRequest}
      />

      <EditBorrowRequestModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEditRequest(null);
        }}
        request={selectedEditRequest}
        onSave={handleSaveEditedRequest}
        masterEquipment={equipment}
        currentUser={currentUser}
        staffDatabase={staffDatabase}
      />

      <ReturnCheckInModal
        isOpen={Boolean(selectedReturnRequest)}
        onClose={() => setSelectedReturnRequest(null)}
        request={selectedReturnRequest}
        onConfirmReturn={handleConfirmReturn}
        currentUser={currentUser}
      />

      <EquipmentCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        equipmentList={equipment}
        onAddNewEquipment={handleAddNewEquipment}
        onUpdateEquipment={handleUpdateEquipment}
        onBatchUpdateEquipment={handleBatchUpdateEquipment}
        isAdmin={currentPortal === 'admin'}
        staffList={staffDatabase}
        onOpenGoogleSheetsSync={() => setIsGoogleSheetsSyncModalOpen(true)}
        onSelectToBorrow={(eq) => {
          setIsCatalogModalOpen(false);
          setIsBorrowModalOpen(true);
        }}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onSelectRequest={(reqId) => {
          const found = requests.find(r => r.id === reqId);
          if (found) setSelectedDetailRequest(found);
        }}
        onMarkAllRead={() => {}}
      />

      <PrintBorrowSlipModal
        isOpen={Boolean(selectedPrintRequest)}
        onClose={() => setSelectedPrintRequest(null)}
        request={selectedPrintRequest}
      />

      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        requests={requests}
        onImportRequests={handleImportRequests}
        onResetData={handleResetData}
      />

      {/* PSU SSO (OIDC) Authentication Modal */}
      <PsuSsoLoginModal
        isOpen={isOidcModalOpen}
        onClose={() => setIsOidcModalOpen(false)}
        currentUser={currentUser}
        staffDatabase={staffDatabase}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* User & Role Permissions Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        staffList={staffDatabase}
        currentUserId={currentUser.id}
        onUpdateStaffList={handleUpdateStaffList}
        onSwitchUser={handleSelectUser}
      />

      {/* Google Sheets Database Synchronization Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsSyncModalOpen}
        onClose={() => setIsGoogleSheetsSyncModalOpen(false)}
        requests={requests}
        equipment={equipment}
        staffList={staffDatabase}
        onRefreshEquipmentFromSheet={handleRefreshEquipmentFromSheet}
        onRefreshStaffFromSheet={handleRefreshStaffFromSheet}
        onRefreshRequestsFromSheet={handleRefreshRequestsFromSheet}
      />

      {/* Floating Real-Time Sync Notification Toast */}
      {syncToastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-emerald-500/40 flex items-center gap-3 text-xs max-w-md">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 font-medium">{syncToastMessage}</div>
            <button
              onClick={() => setSyncToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
