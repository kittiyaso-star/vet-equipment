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
  clearUserSession,
  getStoredLoginLogs,
  recordLoginEvent,
  recordLogoutEvent,
  revokeSessionByAdmin,
  revokeUserAllSessions,
  revokeAllActiveSessionsExceptAdmin,
  checkCurrentSessionValid,
  SESSION_MAX_DURATION_MS
} from './services/storage';
import { BorrowRequest, EquipmentMaster, SystemNotification, BorrowedEquipmentItem, BorrowRequestStatus, StaffUser, LoginLog } from './types';
import { STAFF_USERS } from './data/initialData';

import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { RequestList } from './components/RequestList';
import { Sidebar, NavViewKey } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { RequestsApprovalView } from './components/RequestsApprovalView';
import { BorrowFormModal } from './components/BorrowFormModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { ReturnCheckInModal } from './components/ReturnCheckInModal';
import { EquipmentCatalogModal } from './components/EquipmentCatalogModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PrintBorrowSlipModal } from './components/PrintBorrowSlipModal';
import { ExportImportModal } from './components/ExportImportModal';
import { PsuSsoLoginModal } from './components/PsuSsoLoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { LoginAuditModal } from './components/LoginAuditModal';
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
  FileSpreadsheet,
  Menu,
  RefreshCw,
  Clock,
  PlusCircle,
  Package,
  Layers,
  History,
  ShieldCheck,
  Check
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
  const [isLoginAuditOpen, setIsLoginAuditOpen] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number>(SESSION_MAX_DURATION_MS);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Layout & Sidebar Navigation States matching Images 3, 4, 5
  const [currentNavView, setCurrentNavView] = useState<NavViewKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isRefreshingSheets, setIsRefreshingSheets] = useState<boolean>(false);
  
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
    setLoginLogs(getStoredLoginLogs());

    const activeEmail = getStoredActiveUserEmail();
    const matched = loadedStaff.find(u => u.email.toLowerCase() === activeEmail.toLowerCase()) || loadedStaff[0];
    if (matched) {
      setCurrentUser(matched);
      if (matched.role === 'admin') {
        setCurrentPortal('admin');
      } else {
        setCurrentPortal('user');
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
            if (matchedLive.role !== 'admin') {
              setCurrentPortal('user');
            }
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

  // Safeguard: strictly force 'user' portal whenever currentUser is not admin
  useEffect(() => {
    if (currentUser.role !== 'admin' && currentPortal === 'admin') {
      setCurrentPortal('user');
    }
  }, [currentUser.role, currentPortal]);

  // Session timer (15 minutes limit) & Live detection if admin force-kicked this user's session
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check validity every 1.5 seconds
    const interval = setInterval(() => {
      const check = checkCurrentSessionValid();
      setSessionRemainingMs(check.remainingMs);

      if (!check.isValid) {
        setIsAuthenticated(false);
        saveStoredIsAuthenticated(false);
        clearUserSession();
        if (check.reason === 'expired') {
           triggerSyncToast('หมดเวลาการใช้งาน 15 นาที ระบบทำการออกจากระบบอัตโนมัติเพื่อความปลอดภัย');
        } else if (check.reason === 'revoked_by_admin') {
           triggerSyncToast('เซสชันของคุณถูกบังคับให้ออกจากระบบโดยผู้ดูแลระบบ (Force Logout)');
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleSelectUser = (u: StaffUser) => {
    setCurrentUser(u);
    saveStoredActiveUserEmail(u.email);
    if (u.role === 'admin') {
      setCurrentPortal('admin');
    } else {
      setCurrentPortal('user');
    }
  };

  const handleChangePortal = (portal: 'user' | 'admin') => {
    if (portal === 'admin' && currentUser.role !== 'admin') {
      triggerSyncToast('ไม่อนุญาต: บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้า Admin (สงวนสิทธิ์เฉพาะผู้ดูแลระบบ)');
      return;
    }
    setCurrentPortal(portal);
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

    // Record login in audit log and initialize 15-minute countdown
    const { updatedLogs } = recordLoginEvent(user);
    setLoginLogs(updatedLogs);
    setSessionRemainingMs(SESSION_MAX_DURATION_MS);

    if (user.role === 'admin') {
      setCurrentPortal('admin');
    } else {
      setCurrentPortal('user');
    }
  };

  const handleLogout = () => {
    recordLogoutEvent(undefined, 'ผู้ใช้งานกดออกจากระบบ');
    setLoginLogs(getStoredLoginLogs());
    setIsAuthenticated(false);
    saveStoredIsAuthenticated(false);
    clearUserSession();
  };

  // Admin session revocation actions
  const handleRevokeSession = (sessionId: string) => {
    const updated = revokeSessionByAdmin(sessionId, currentUser.display_name_th || currentUser.name);
    setLoginLogs(updated);
    triggerSyncToast(`บังคับเซสชัน ${sessionId} ออกจากระบบเรียบร้อยแล้ว`);
  };

  const handleRevokeUserAllSessions = (userEmail: string) => {
    const updated = revokeUserAllSessions(userEmail, currentUser.display_name_th || currentUser.name);
    setLoginLogs(updated);
    triggerSyncToast(`บังคับบัญชี ${userEmail} ออกจากระบบทุกเซสชันเรียบร้อยแล้ว`);
  };

  const handleRevokeAllExceptCurrentAdmin = () => {
    const updated = revokeAllActiveSessionsExceptAdmin(currentUser.display_name_th || currentUser.name);
    setLoginLogs(updated);
    triggerSyncToast('บังคับผู้ใช้งานทั้งหมดออกจากระบบเรียบร้อยแล้ว');
  };

  const handleRefreshLogs = () => {
    setLoginLogs(getStoredLoginLogs());
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

        // If all items are agreed by their respective owners, approve immediately and confirm via email to Dr. Yada
        const allAgreed = updatedList.every(i => i.ownerStatus === 'ยินยอม');
        const anyDisagreed = updatedList.some(i => i.ownerStatus === 'ไม่ยินยอม');

        let nextStatus = r.status;
        if (anyDisagreed) {
          nextStatus = 'ยกเลิกคำขอ';
        } else if (allAgreed) {
          // ปรับปรุงโครงสร้าง: เจ้าของกดยินยอมครบแล้ว อนุมัติการยืมได้ทันที และส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา
          nextStatus = 'เจ้าของให้ยืมแล้ว';
        }

        const modified: BorrowRequest = {
          ...r,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          equipmentList: updatedList,
          ...(allAgreed ? {
            executiveApprovedAt: new Date().toISOString(),
            executiveApprovedBy: 'ส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง (yada.d@psu.ac.th)',
            executiveNotes: 'เจ้าของครุภัณฑ์กดยินยอมให้ยืมครบถ้วนแล้ว ระบบได้ส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง เรียบร้อยแล้ว (ผู้บริหารไม่ต้องเข้ามากดในระบบ)',
            executiveNotifiedAt: new Date().toISOString(),
            executiveNotifiedEmail: 'yada.d@psu.ac.th',
            executiveEmailConfirmed: true
          } : {})
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

    if (changedReq && changedReq.status === 'เจ้าของให้ยืมแล้ว') {
      triggerSyncToast(`เจ้าของครุภัณฑ์กดยินยอมครบแล้ว — อนุมัติคำขอ ${requestId} สำเร็จ และระบบได้ส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง (yada.d@psu.ac.th) เรียบร้อยแล้ว`);
    }
  };

  // Handle executive approval / email confirmation (ส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง)
  const handleExecutiveApprove = (requestId: string, executiveNote?: string) => {
    let changedReq: BorrowRequest | undefined;
    const updated = requests.map(r => {
      if (r.id === requestId) {
        const modified = {
          ...r,
          status: 'เจ้าของให้ยืมแล้ว' as BorrowRequestStatus,
          updatedAt: new Date().toISOString(),
          executiveApprovedAt: new Date().toISOString(),
          executiveApprovedBy: 'ส่งอีเมลยืนยันถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง (yada.d@psu.ac.th)',
          notes: executiveNote ? `${r.notes || ''} [ส่งอีเมลยืนยันผู้บริหาร: ${executiveNote}]` : r.notes,
          executiveNotifiedAt: new Date().toISOString(),
          executiveNotifiedEmail: 'yada.d@psu.ac.th',
          executiveEmailConfirmed: true
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
    triggerSyncToast(`ส่งอีเมลยืนยันคำขอ ${requestId} ถึง ดร.สพ.ญ.ญาดา ดวงนำสว่าง เรียบร้อยแล้ว — สามารถเริ่มยืมใช้งานได้ทันที`);
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
  const pendingRequestsCount = requests.filter(r => r.status === 'ยื่นขออนุมัติ' || r.status === 'รอผู้บริหารอนุมัติ').length;
  const activeLoansCount = requests.filter(r => r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน').length;

  const formatTimer = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualLiveSync = async () => {
    setIsRefreshingSheets(true);
    try {
      const [eqRes, reqRes] = await Promise.allSettled([
        fetchEquipmentFromGoogleSheets(),
        fetchRequestsFromGoogleSheets()
      ]);
      if (eqRes.status === 'fulfilled' && eqRes.value.success && eqRes.value.equipment.length > 0) {
        setEquipment(eqRes.value.equipment);
        saveStoredEquipment(eqRes.value.equipment);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value.success && reqRes.value.requests.length > 0) {
        const liveReqs = reqRes.value.requests;
        const currentLocal = getStoredRequests();
        const existingIds = new Set(liveReqs.map(r => r.id));
        const merged = [...liveReqs, ...currentLocal.filter(r => !existingIds.has(r.id))];
        setRequests(merged);
        saveStoredRequests(merged);
        setNotifications(generateSystemNotifications(merged));
      }
      triggerSyncToast('ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จเรียบร้อยแล้ว');
    } catch (e) {
      triggerSyncToast('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets');
    } finally {
      setIsRefreshingSheets(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-[#0090FF] selection:text-white">
      {/* 1. Left Sidebar Navigation (Matching Image 3 & 4) */}
      <Sidebar
        currentView={currentNavView}
        onSelectView={(view) => setCurrentNavView(view)}
        onOpenNewBorrow={() => setIsBorrowModalOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsSyncModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenLoginAudit={() => setIsLoginAuditOpen(true)}
        pendingRequestsCount={pendingRequestsCount}
        activeLoansCount={activeLoansCount}
        currentUser={currentUser}
        currentPortal={currentPortal}
        onChangePortal={handleChangePortal}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Workspace (Padded for Desktop Sidebar: lg:pl-64) */}
      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-200">
        {/* Top App Bar Header (Matching Image 3 & 4 top header) */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Official Hospital Emblem Logo */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50/80 p-1 border border-purple-200/80 shadow-xs flex items-center justify-center shrink-0 ring-2 ring-purple-100/60 overflow-hidden">
              <img 
                src={`${import.meta.env.BASE_URL}site-icon.jpg`} 
                alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ." 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* System Title and Current View */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight">
                  Online Equipment Borrowing System
                </span>
                <span className="hidden md:inline-block text-[11px] font-semibold text-slate-500">
                  ระบบยืม-คืน ครุภัณฑ์ รพ.สัตว์ ม.อ.
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {currentUser.role === 'admin' ? '🛡️ Admin' : '👤 บุคลากร'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-[#0090FF]">
                  {currentNavView === 'dashboard' && 'แดชบอร์ดภาพรวม (Dashboard)'}
                  {currentNavView === 'inventory' && 'คลังอุปกรณ์ (Inventory)'}
                  {currentNavView === 'requests' && 'รายการคำขอยืม & อนุมัติ'}
                  {currentNavView === 'returns' && 'รับคืน & ตรวจสภาพครุภัณฑ์'}
                  {currentNavView === 'history' && 'ประวัติทำรายการ (History)'}
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-400">
                  • โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ ม.อ.
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls (Session timer, Refresh, Notifications, Add button) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 15-Minute Session Timer Pill */}
            <div 
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                sessionRemainingMs <= 3 * 60 * 1000
                  ? 'bg-rose-50 text-rose-700 border border-rose-300 animate-pulse'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="เซสชันจะหมดอายุอัตโนมัติภายใน 15 นาทีตามนโยบายความปลอดภัย"
            >
              <Clock className="w-3.5 h-3.5 text-[#0090FF]" />
              <span>{formatTimer(sessionRemainingMs)}</span>
            </div>

            {/* Refresh Live Data from Google Sheets (Matching Image 3 & 4 refresh icon) */}
            <button
              type="button"
              onClick={handleManualLiveSync}
              disabled={isRefreshingSheets}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer shadow-2xs"
              title="รีเฟรชข้อมูลจาก Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingSheets ? 'animate-spin text-[#0090FF]' : ''}`} />
            </button>

            {/* Notification Drawer Button */}
            <button
              type="button"
              onClick={() => setIsNotifDrawerOpen(true)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer shadow-2xs"
              title="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Quick Borrow Button */}
            <button
              type="button"
              onClick={() => setIsBorrowModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0090FF] hover:bg-[#008EE4] text-white font-bold text-xs shadow-sm shadow-[#0090FF]/30 active:scale-98 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ขอยืมอุปกรณ์</span>
            </button>
          </div>
        </header>

        {/* Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Overdue Alert Banner if overdue loans exist */}
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

          {/* VIEW 1: แดชบอร์ด (Dashboard View - Image 4) */}
          {currentNavView === 'dashboard' && (
            <DashboardView
              equipment={equipment}
              requests={requests}
              onViewAllRequests={() => setCurrentNavView('requests')}
              onSelectRequest={(req) => setSelectedDetailRequest(req)}
              onOpenNewBorrow={() => setIsBorrowModalOpen(true)}
            />
          )}

          {/* VIEW 2: คลังอุปกรณ์ (Inventory View - Image 3) */}
          {currentNavView === 'inventory' && (
            <InventoryView
              equipment={equipment}
              onAddNewEquipment={handleAddNewEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onSelectToBorrow={(eq) => {
                setIsBorrowModalOpen(true);
              }}
              isAdmin={currentUser.role === 'admin'}
              staffList={staffDatabase}
            />
          )}

          {/* VIEW 3: คำขอยืม & อนุมัติ (Requests & Approval View - Image 5) */}
          {currentNavView === 'requests' && (
            <RequestsApprovalView
              requests={requests}
              onApproveRequest={handleApproveRequest}
              onViewDetails={(req) => setSelectedDetailRequest(req)}
              onPrintSlip={(req) => setSelectedPrintRequest(req)}
              onOpenEdit={handleOpenEditRequest}
              currentStaffEmail={currentUser.email}
              isAdmin={currentUser.role === 'admin'}
            />
          )}

          {/* VIEW 4: รับคืน & ตรวจสภาพ (Returns & Check-in View) */}
          {currentNavView === 'returns' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-5 h-5 text-[#0090FF]" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">รับคืน & ตรวจสภาพครุภัณฑ์</h2>
                    <p className="text-xs text-slate-500">ตรวจสอบรายการที่กำลังยืมใช้งานและดำเนินการตรวจรับคืน</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0090FF]/10 text-[#0090FF]">
                  กำลังยืม {activeLoansCount} รายการ
                </span>
              </div>

              {/* Explanatory Banner: Who performs the return check-in (Answers user's question directly) */}
              <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-slate-50 border border-teal-200/80 rounded-2xl p-4 text-xs text-slate-700 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#007473]/10 text-[#007473] shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-[#007473]" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>ขั้นตอนการรับคืน & ใครต้องเข้ามากดรับคืน?</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#007473] text-white text-[10px] font-semibold">
                          เจ้าของครุภัณฑ์ / เจ้าหน้าที่พัสดุ / Admin
                        </span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 text-[11px] leading-relaxed pt-1">
                      <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100">
                        <span className="font-bold text-slate-800">👤 ใครต้องเข้ามากดรับคืน? :</span>{' '}
                        <strong>เจ้าของครุภัณฑ์ (Equipment Owner)</strong> หรือ <strong>เจ้าหน้าที่พัสดุ / Admin</strong> เป็นผู้กดตรวจรับคืนเมื่อผู้ยืมนำอุปกรณ์มาส่งคืน ณ จุดจัดเก็บ
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100">
                        <span className="font-bold text-slate-800">🔍 ขั้นตอนการตรวจสภาพ :</span>{' '}
                        ตรวจสอบสภาพเครื่องจริง (ปกติสมบูรณ์ / ชำรุด / สูญหาย) แล้วกด <strong>"ยืนยันตรวจรับคืน"</strong> ระบบจะปรับสถานะครุภัณฑ์ในคลังให้กลับมาเป็น <strong>"พร้อมใช้งาน"</strong> ทันที
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">เลขที่คำขอ</th>
                        <th className="py-3 px-4">ผู้ยืม</th>
                        <th className="py-3 px-4">หน่วยงาน</th>
                        <th className="py-3 px-4">รายการครุภัณฑ์</th>
                        <th className="py-3 px-4">เจ้าของ / ผู้ตรวจรับ</th>
                        <th className="py-3 px-4">กำหนดส่งคืน</th>
                        <th className="py-3 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.filter(r => r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน').length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            ไม่มีรายการที่อยู่ระหว่างการยืมใช้งานในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        requests.filter(r => r.status === 'เจ้าของให้ยืมแล้ว' || r.status === 'กำลังยืมใช้งาน').map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/60">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#0090FF]">{req.id}</td>
                            <td className="py-3.5 px-4 font-medium text-slate-900">{req.requesterName}</td>
                            <td className="py-3.5 px-4 text-slate-600">{req.requesterDept || '-'}</td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {req.equipmentList.map(eq => eq.name).join(', ')}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              <span className="font-medium text-slate-800">
                                {req.equipmentList.map(eq => eq.responsible).filter(Boolean).join(', ') || 'เจ้าของครุภัณฑ์'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-rose-600">{req.borrowTo}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedReturnRequest(req)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0090FF] to-[#007473] hover:from-[#008EE4] hover:to-[#0083AF] text-white font-bold text-xs shadow-xs cursor-pointer"
                              >
                                ตรวจรับคืน
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: ประวัติทำรายการ (Transaction History) */}
          {currentNavView === 'history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-[#9A89FF]" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">ประวัติการทำรายการ (History & Logs)</h2>
                    <p className="text-xs text-slate-500">บันทึกประวัติการยืม-คืนที่เสร็จสิ้นแล้วในระบบ</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                  เสร็จสิ้น {requests.filter(r => r.status === 'รับคืนเรียบร้อย' || r.status === 'เสร็จสิ้น').length} รายการ
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">เลขที่คำขอ</th>
                        <th className="py-3 px-4">ผู้ยืม</th>
                        <th className="py-3 px-4">วันที่รับคืน</th>
                        <th className="py-3 px-4">ผู้ตรวจรับคืน</th>
                        <th className="py-3 px-4">รายการอุปกรณ์</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-right">พิมพ์ใบยืม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.filter(r => r.status === 'รับคืนเรียบร้อย' || r.status === 'เสร็จสิ้น' || r.status === 'คืนครุภัณฑ์แล้ว').length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            ยังไม่มีรายการที่ส่งคืนเรียบร้อย
                          </td>
                        </tr>
                      ) : (
                        requests.filter(r => r.status === 'รับคืนเรียบร้อย' || r.status === 'เสร็จสิ้น' || r.status === 'คืนครุภัณฑ์แล้ว').map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/60">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{req.id}</td>
                            <td className="py-3.5 px-4 font-medium text-slate-900">{req.requesterName}</td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {req.returnedAt ? new Date(req.returnedAt).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">{req.returnReceivedBy || '-'}</td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {req.equipmentList.map(eq => eq.name).join(', ')}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                {req.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedPrintRequest(req)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              >
                                พิมพ์ใบยืม
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer with Developer Credit */}
        <footer className="mt-auto border-t border-slate-200/90 bg-white py-5 text-center text-xs text-slate-500 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0090FF] shrink-0" />
              <span className="font-semibold text-slate-700">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (PSU Animal Hospital)
              </span>
            </div>

            {/* Developer Credit matching user's requested specification */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs shadow-2xs">
              <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#F77CF5] via-[#0090FF] to-[#007473] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                ก
              </span>
              <span>
                พัฒนาโดย <strong>นางสาวกิตติยา สุนทรเจริญนนท์</strong> นักวิชาการอุดมศึกษา สำนักงานบริหารคณะ คณะสัตวแพทยศาสตร์
              </span>
            </div>
          </div>
        </footer>
      </div>

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

      {/* Login Audit Logs & Force Logout Modal (Admin only) */}
      <LoginAuditModal
        isOpen={isLoginAuditOpen}
        onClose={() => setIsLoginAuditOpen(false)}
        logs={loginLogs}
        currentAdminEmail={currentUser.email}
        onRevokeSession={handleRevokeSession}
        onRevokeUserAllSessions={handleRevokeUserAllSessions}
        onRevokeAllExceptCurrentAdmin={handleRevokeAllExceptCurrentAdmin}
        onRefreshLogs={handleRefreshLogs}
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
