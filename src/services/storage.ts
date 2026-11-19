import { BorrowRequest, EquipmentMaster, SystemNotification, BorrowedEquipmentItem, StaffUser, LoginLog } from '../types';
import { INITIAL_BORROW_REQUESTS, INITIAL_EQUIPMENT_MASTER, STAFF_USERS } from '../data/initialData';

const STORAGE_KEY_REQUESTS = 'psu_vet_borrow_requests_v3';
const STORAGE_KEY_EQUIPMENT = 'psu_vet_equipment_master_v3';
const STORAGE_KEY_NOTIFS = 'psu_vet_notifications_v1';
const STORAGE_KEY_STAFF = 'psu_vet_staff_users_v3';
const STORAGE_KEY_ACTIVE_USER = 'psu_vet_active_user_email_v2';
const STORAGE_KEY_AUTH_STATUS = 'psu_vet_auth_is_authenticated_v1';
const STORAGE_KEY_ADMIN_PASSWORD = 'psu_vet_admin_password_key_v1';
const STORAGE_KEY_LOGIN_LOGS = 'psu_vet_login_logs_v2';
const STORAGE_KEY_CURRENT_SESSION_ID = 'psu_vet_current_session_id_v2';
const STORAGE_KEY_SESSION_START_TIME = 'psu_vet_session_start_time_v2';
const STORAGE_KEY_LOGOUT_REASON = 'psu_vet_logout_reason_v2';

export const DEFAULT_ADMIN_PASSWORD = 'psuvet2026';
export const SESSION_MAX_DURATION_MS = 15 * 60 * 1000; // 15 minutes limit

/**
 * Normalize date strings from Google Sheets (handles UTC-shifted ISO strings like
 * "2026-11-24T17:00:00.000Z" -> "2026-11-25" in Asia/Bangkok, DD/MM/YYYY BE/CE, or YYYY-MM-DD)
 */
export function normalizeSheetDate(raw: any, outputFormat: 'iso' | 'display' = 'iso'): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // Pure YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return s;
  }

  // ISO timestamp e.g. 2026-11-24T17:00:00.000Z (Sheets Date serialized to UTC by Apps Script getValues())
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const bkk = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
      if (outputFormat === 'display') {
        const [y, m, day] = bkk.split('-');
        return `${day}/${m}/${y}`;
      }
      return bkk;
    }
  }

  // DD/MM/YYYY (possibly Thai Buddhist year e.g. 18/11/2569)
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    if (outputFormat === 'display') return s;
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    let yyyy = parseInt(dmyMatch[3], 10);
    if (yyyy > 2400) yyyy -= 543;
    return `${yyyy}-${mm}-${dd}`;
  }

  return s;
}

/**
 * Normalize time strings from Google Sheets (handles 1899-12-30 UTC-shifted ISO timestamps
 * like "1899-12-30T03:17:56.000Z" -> "10:00" in Asia/Bangkok, or "9:00" -> "09:00")
 */
export function normalizeSheetTime(raw: any): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // ISO timestamp from Google Sheets Time cell (e.g. 1899-12-30T03:17:56.000Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d);
      return formatted === '24:00' ? '00:00' : formatted;
    }
  }

  // Standard HH:mm or H:mm or HH:mm:ss or HH.mm
  const hmMatch = s.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (hmMatch) {
    const hh = hmMatch[1].padStart(2, '0');
    const mm = hmMatch[2];
    return `${hh}:${mm}`;
  }

  return s;
}

const GENERIC_OWNER_NAMES = new Set(['', 'n/a', 'รพ.สัตว์ ม.อ.', 'เจ้าหน้าที่พยาบาลสัตว์', 'คณะสัตวแพทยศาสตร์ ม.อ.']);

/**
 * Verified owners matched directly from the hospital's official Excel register
 */
export const VERIFIED_EXCEL_OWNERS_BY_CODE: Record<string, { responsible: string; responsibleEmail?: string }> = {
  'สพ.6530-051-0002-1/3-56/บ.': { responsible: 'เมธาพร', responsibleEmail: '' },
  'สพ.6530-051-0002-2/3-56/บ.': { responsible: 'เมธาพร', responsibleEmail: '' },
  'สพ.6650-002-0001-1/3-57/งป.': { responsible: 'เกียรติดำรงค์', responsibleEmail: 'kietdumrong.k@psu.ac.th' },
  'สพ.6530-040-0008-1/1-57/บ.': { responsible: 'เมธาพร', responsibleEmail: '' },
  'สพ.6525-003-0001-1/1-57/บ.': { responsible: 'อัจฉรา', responsibleEmail: 'atchara.m@psu.ac.th' },
  'สพ.6515-085-0001-1/1-60/ง.': { responsible: 'นิศากร', responsibleEmail: 'nisakorn.sae@psu.ac.th' },
  'สพ.6515-085-0001-1/1-60/ง.(1)': { responsible: 'นิศากร', responsibleEmail: 'nisakorn.sae@psu.ac.th' },
  'รพส.6630-082-0001-1/1-61/รด.': { responsible: 'เกียรติดำรงค์', responsibleEmail: 'kietdumrong.k@psu.ac.th' },
  'รพส.6530-004-0000-1/1-62/งป.(2)': { responsible: 'พีรพัฒน์', responsibleEmail: 'peerapat.ka@psu.ac.th' },
  'รพส.6530-004-0000-1/1-62/งป.(5)': { responsible: 'พีรพัฒน์', responsibleEmail: 'peerapat.ka@psu.ac.th' },
  'รพส.6530-004-0000-1/1-62/งป.(6)': { responsible: 'พีรพัฒน์', responsibleEmail: 'peerapat.ka@psu.ac.th' }
};

export function findStaffEmailByName(respName: string, staffList: StaffUser[] = STAFF_USERS): string {
  const clean = respName.trim().toLowerCase();
  if (!clean || GENERIC_OWNER_NAMES.has(clean)) return '';
  const staffPool = staffList.length > 0 ? staffList : STAFF_USERS;
  const match = staffPool.find(s => {
    const full = `${s.title_th || ''}${s.name || ''}`.toLowerCase();
    const pure = (s.name || '').toLowerCase();
    const first = (s.first_name_th || pure.split(' ')[0] || '').toLowerCase();
    return (
      pure === clean ||
      full === clean ||
      (first && (clean === first || clean.includes(first) || first.includes(clean))) ||
      pure.includes(clean)
    );
  });
  return match?.email || '';
}

/**
 * Resolve authentic equipment owner name and PSU email without losing existing assignments
 */
export function resolveEquipmentOwner(params: {
  code?: string;
  name?: string;
  location?: string;
  explicitResponsible?: string;
  explicitEmail?: string;
  existingEquipment?: EquipmentMaster[];
  staffList?: StaffUser[];
}): { responsible: string; responsibleEmail: string } {
  const {
    code = '',
    name = '',
    location = '',
    explicitResponsible = '',
    explicitEmail = '',
    existingEquipment = [],
    staffList = STAFF_USERS
  } = params;

  const staffPool = staffList.length > 0 ? staffList : STAFF_USERS;
  const findStaffEmail = (respName: string) => findStaffEmailByName(respName, staffPool);

  // 1. Explicit non-generic owner from Google Sheet / Excel / User edit
  // Preserve explicit owner name even if they are not yet in STAFF_USERS / รายชื่อ (so email is '')
  const expResp = explicitResponsible.trim();
  const expEmail = explicitEmail.trim();
  if (expResp && !GENERIC_OWNER_NAMES.has(expResp.toLowerCase())) {
    const resolvedEmail = expEmail && expEmail.includes('@') ? expEmail : findStaffEmail(expResp);
    return { responsible: expResp, responsibleEmail: resolvedEmail };
  }
  if (expEmail && expEmail.includes('@')) {
    return { responsible: 'ผู้ดูแลครุภัณฑ์', responsibleEmail: expEmail };
  }

  // 2. Preserve existing non-generic owner from local catalog or verified Excel map
  const codeNorm = code.trim().toLowerCase();
  const verifiedExcel = codeNorm ? VERIFIED_EXCEL_OWNERS_BY_CODE[codeNorm] : undefined;
  if (verifiedExcel) {
    return {
      responsible: verifiedExcel.responsible,
      responsibleEmail: verifiedExcel.responsibleEmail || findStaffEmail(verifiedExcel.responsible)
    };
  }

  if (codeNorm && codeNorm !== 'n/a') {
    const existing = existingEquipment.find(e => (e.code || '').trim().toLowerCase() === codeNorm);
    if (existing) {
      const exResp = (existing.responsible || '').trim();
      const exEmail = (existing.responsibleEmail || '').trim();
      if (exResp && !GENERIC_OWNER_NAMES.has(exResp.toLowerCase())) {
        return {
          responsible: exResp,
          responsibleEmail: exEmail && exEmail.includes('@') ? exEmail : findStaffEmail(exResp)
        };
      }
      if (exEmail && exEmail.includes('@')) {
        return {
          responsible: 'ผู้ดูแลครุภัณฑ์',
          responsibleEmail: exEmail
        };
      }
    }
  }

  // 3. Location / equipment zone-based owner assignment
  const locLower = location.toLowerCase();
  const textToMatch = `${name} ${location}`.toLowerCase();

  let defaultFirst = 'วทันยา';
  let defaultEmail = 'watanya.po@psu.ac.th';

  if (locLower.includes('ห้องผ่าตัด') || textToMatch.includes('ห้องผ่าตัด')) {
    defaultFirst = 'นภัสกร';
    defaultEmail = 'naphatsakon.s@psu.ac.th';
  } else if (locLower.includes('ศัลยกรรม') || textToMatch.includes('ศัลยกรรม')) {
    defaultFirst = 'เบญจมาศ';
    defaultEmail = 'benjamas.ji@psu.ac.th';
  } else if (
    locLower.includes('เอกซเรย์') ||
    locLower.includes('หัตถการ') ||
    locLower.includes('ccu') ||
    locLower.includes('ชันสูตร') ||
    locLower.includes('ธนาคารเลือด') ||
    locLower.includes('อัลตร้าซาวด์') ||
    textToMatch.includes('เอกซเรย์') ||
    textToMatch.includes('ธนาคารเลือด')
  ) {
    defaultFirst = 'อัจฉรา';
    defaultEmail = 'atchara.m@psu.ac.th';
  }

  const matchedEmail = findStaffEmail(defaultFirst) || defaultEmail;
  return { responsible: defaultFirst, responsibleEmail: matchedEmail };
}

/**
 * Enrich requests so normalized dates/times and real equipment owners/emails are restored
 * even if Google Sheets returned UTC timestamps or lacked owner columns
 */
export function enrichRequestsWithEquipmentOwners(
  requests: BorrowRequest[],
  equipmentCatalog: EquipmentMaster[],
  staffList?: StaffUser[]
): BorrowRequest[] {
  const eqByCode = new Map<string, EquipmentMaster>();
  for (const eq of equipmentCatalog) {
    if (eq.code) eqByCode.set(eq.code.trim().toLowerCase(), eq);
  }

  return requests.map(req => {
    const normBorrowFrom = normalizeSheetDate(req.borrowFrom);
    const normBorrowFromTime = normalizeSheetTime(req.borrowFromTime);
    const normBorrowTo = normalizeSheetDate(req.borrowTo);
    const normBorrowToTime = normalizeSheetTime(req.borrowToTime);

    const enrichedItems = (req.equipmentList || []).map(item => {
      const currentResp = (item.responsible || '').trim();
      const currentEmail = (item.responsibleEmail || '').trim();
      const codeNorm = (item.code || '').trim().toLowerCase();
      const verified = codeNorm ? VERIFIED_EXCEL_OWNERS_BY_CODE[codeNorm] : undefined;
      const matchedEq = codeNorm ? eqByCode.get(codeNorm) : undefined;
      const eqHasRealOwner = matchedEq && matchedEq.responsible && !GENERIC_OWNER_NAMES.has(matchedEq.responsible.trim().toLowerCase());

      // Upgrade if missing owner/email, generic placeholder, or verified Excel owner differs from old stale fallback
      const needsOwnerFix =
        !currentEmail ||
        !currentEmail.includes('@') ||
        GENERIC_OWNER_NAMES.has(currentResp.toLowerCase()) ||
        Boolean(verified && currentResp !== verified.responsible) ||
        Boolean(eqHasRealOwner && currentResp !== matchedEq!.responsible);

      if (!needsOwnerFix) return item;

      const resolved = resolveEquipmentOwner({
        code: item.code,
        name: item.name,
        location: item.location || matchedEq?.location || '',
        explicitResponsible: matchedEq?.responsible || currentResp,
        explicitEmail: matchedEq?.responsibleEmail || currentEmail,
        existingEquipment: equipmentCatalog,
        staffList
      });

      return {
        ...item,
        location: item.location || matchedEq?.location || '',
        responsible: resolved.responsible,
        responsibleEmail: resolved.responsibleEmail
      };
    });

    return {
      ...req,
      borrowFrom: normBorrowFrom || req.borrowFrom,
      borrowFromTime: normBorrowFromTime || req.borrowFromTime,
      borrowTo: normBorrowTo || req.borrowTo,
      borrowToTime: normBorrowToTime || req.borrowToTime,
      equipmentList: enrichedItems
    };
  });
}

/**
 * Initial sample login logs to provide realistic audit records
 */
function createInitialSampleLogs(): LoginLog[] {
  const now = Date.now();
  return [
    {
      id: 'LOG-001',
      sessionId: 'SESS-ADMIN-PREV',
      userId: 'STAFF-002',
      userName: 'นางสาว กิตติยา สุนทรเจริญนนท์',
      userEmail: 'kittiya.so@psu.ac.th',
      role: 'admin',
      loginAt: new Date(now - 45 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(now - 30 * 60 * 1000).toISOString(),
      expiresAt: 'UNLIMITED',
      ipAddress: '172.24.89.14',
      userAgent: 'Chrome 128 (Windows 11)',
      deviceType: 'Desktop',
      status: 'logged_out',
      logoutReason: 'ผู้ดูแลระบบกดออกจากระบบ'
    },
    {
      id: 'LOG-002',
      sessionId: 'SESS-USER-002',
      userId: 'STAFF-001',
      userName: 'ดร.สพ.ญ. ญาดา ดวงนำสว่าง',
      userEmail: 'yada.d@psu.ac.th',
      role: 'user',
      loginAt: new Date(now - 90 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(now - 75 * 60 * 1000).toISOString(),
      expiresAt: new Date(now - 75 * 60 * 1000).toISOString(),
      ipAddress: '172.24.89.52',
      userAgent: 'Safari 17.5 (macOS)',
      deviceType: 'Desktop',
      status: 'logged_out',
      logoutReason: 'ผู้ใช้งานกดออกจากระบบ'
    },
    {
      id: 'LOG-003',
      sessionId: 'SESS-USER-003',
      userId: 'STAFF-003',
      userName: 'นางสาว นลิน ต่อวิวรรธน์',
      userEmail: 'nalin.t@psu.ac.th',
      role: 'user',
      loginAt: new Date(now - 140 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(now - 125 * 60 * 1000).toISOString(),
      expiresAt: new Date(now - 125 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.108',
      userAgent: 'Mobile Chrome (Android 14)',
      deviceType: 'Mobile',
      status: 'expired',
      logoutReason: 'หมดเวลาการใช้งาน (เกิน 15 นาที)'
    }
  ];
}

export function getStoredLoginLogs(): LoginLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGIN_LOGS);
    if (!raw) {
      const initial = createInitialSampleLogs();
      localStorage.setItem(STORAGE_KEY_LOGIN_LOGS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return createInitialSampleLogs();
  }
}

export function saveStoredLoginLogs(logs: LoginLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGIN_LOGS, JSON.stringify(logs.slice(0, 100))); // Keep last 100 logs
  } catch (err) {
    console.error('Error saving login logs', err);
  }
}

export function getCurrentSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT_SESSION_ID);
  } catch {
    return null;
  }
}

export function getSessionStartTime(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SESSION_START_TIME);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export function getStoredLogoutReason(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LOGOUT_REASON);
  } catch {
    return null;
  }
}

export function setStoredLogoutReason(reason: string | null): void {
  try {
    if (reason) {
      localStorage.setItem(STORAGE_KEY_LOGOUT_REASON, reason);
    } else {
      localStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
    }
  } catch (err) {
    console.error('Error setting logout reason', err);
  }
}

function detectClientEnvironment(): { ip: string; agent: string; device: 'Desktop' | 'Mobile' | 'Tablet' } {
  // Generate realistic internal network IP for PSU Campus / local
  const lastOctet = Math.floor(Math.random() * 200) + 10;
  const ip = `172.24.89.${lastOctet}`;

  let agent = 'Chrome Browser';
  let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

    if (ua.includes('Chrome')) agent = 'Google Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) agent = 'Apple Safari';
    else if (ua.includes('Firefox')) agent = 'Mozilla Firefox';
    else if (ua.includes('Edge')) agent = 'Microsoft Edge';

    if (navigator.platform) {
      if (navigator.platform.includes('Win')) agent += ' (Windows)';
      else if (navigator.platform.includes('Mac')) agent += ' (macOS)';
      else if (navigator.platform.includes('Linux')) agent += ' (Linux)';
    }
  }

  return { ip, agent, device };
}

/**
 * Record a new login event into the audit log & initialize session (unlimited for Admin, 15 minutes for standard users)
 */
export function recordLoginEvent(user: StaffUser): { log: LoginLog; updatedLogs: LoginLog[] } {
  const now = Date.now();
  const sessionId = `SESS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const env = detectClientEnvironment();
  const isAdmin = user.role === 'admin';

  const newLog: LoginLog = {
    id: `LOG-${Date.now().toString(36).toUpperCase()}`,
    sessionId,
    userId: user.id || `USER-${user.email}`,
    userName: user.display_name_th || user.name,
    userEmail: user.email,
    role: user.role || 'user',
    loginAt: new Date(now).toISOString(),
    lastActiveAt: new Date(now).toISOString(),
    expiresAt: isAdmin ? 'UNLIMITED' : new Date(now + SESSION_MAX_DURATION_MS).toISOString(),
    ipAddress: env.ip,
    userAgent: env.agent,
    deviceType: env.device,
    status: 'active'
  };

  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_SESSION_ID, sessionId);
    localStorage.setItem(STORAGE_KEY_SESSION_START_TIME, now.toString());
    localStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
  } catch (e) {
    console.error('Error storing session id', e);
  }

  const currentLogs = getStoredLoginLogs();
  const updatedLogs = [newLog, ...currentLogs];
  saveStoredLoginLogs(updatedLogs);

  return { log: newLog, updatedLogs };
}

/**
 * Record a logout event
 */
export function recordLogoutEvent(sessionId?: string, reason: string = 'ผู้ใช้งานกดออกจากระบบ'): LoginLog[] {
  const currentId = sessionId || getCurrentSessionId();
  const currentLogs = getStoredLoginLogs();
  const now = new Date().toISOString();

  const updated = currentLogs.map(log => {
    if (log.sessionId === currentId && log.status === 'active') {
      return {
        ...log,
        status: reason.includes('15 นาที') ? ('expired' as const) : ('logged_out' as const),
        lastActiveAt: now,
        logoutReason: reason
      };
    }
    return log;
  });

  saveStoredLoginLogs(updated);

  try {
    localStorage.removeItem(STORAGE_KEY_CURRENT_SESSION_ID);
    localStorage.removeItem(STORAGE_KEY_SESSION_START_TIME);
  } catch (err) {
    console.error('Error clearing session storage', err);
  }

  return updated;
}

/**
 * Admin action: Force logout a specific session (Kick user)
 */
export function revokeSessionByAdmin(sessionId: string, adminName: string): LoginLog[] {
  const currentLogs = getStoredLoginLogs();
  const now = new Date().toISOString();

  const updated = currentLogs.map(log => {
    if (log.sessionId === sessionId && log.status === 'active') {
      return {
        ...log,
        status: 'revoked_by_admin' as const,
        revokedAt: now,
        revokedBy: adminName,
        logoutReason: `ผู้ดูแลระบบ (${adminName}) สั่งบังคับออกจากระบบ (Force Logout)`
      };
    }
    return log;
  });

  saveStoredLoginLogs(updated);

  // If this browser was holding that session, set notice
  if (getCurrentSessionId() === sessionId) {
    setStoredLogoutReason(`เซสชันของคุณถูกบังคับให้ออกจากระบบโดยผู้ดูแลระบบ (${adminName})`);
  }

  return updated;
}

/**
 * Admin action: Force logout all active sessions for a specific user email
 */
export function revokeUserAllSessions(userEmail: string, adminName: string): LoginLog[] {
  const currentLogs = getStoredLoginLogs();
  const now = new Date().toISOString();
  const emailNorm = userEmail.toLowerCase().trim();

  const updated = currentLogs.map(log => {
    if (log.userEmail.toLowerCase().trim() === emailNorm && log.status === 'active') {
      return {
        ...log,
        status: 'revoked_by_admin' as const,
        revokedAt: now,
        revokedBy: adminName,
        logoutReason: `ผู้ดูแลระบบ (${adminName}) สั่งบังคับออกจากระบบทุกล็อกอิน`
      };
    }
    return log;
  });

  saveStoredLoginLogs(updated);
  return updated;
}

/**
 * Admin action: Force logout all active non-admin users
 */
export function revokeAllActiveSessionsExceptAdmin(adminName: string): LoginLog[] {
  const currentLogs = getStoredLoginLogs();
  const now = new Date().toISOString();

  const updated = currentLogs.map(log => {
    if (log.role !== 'admin' && log.status === 'active') {
      return {
        ...log,
        status: 'revoked_by_admin' as const,
        revokedAt: now,
        revokedBy: adminName,
        logoutReason: `ผู้ดูแลระบบ (${adminName}) สั่งบังคับให้ออกจากระบบทั้งหมด`
      };
    }
    return log;
  });

  saveStoredLoginLogs(updated);
  return updated;
}

/**
 * Check if current active session is valid (unlimited for Admin; 15-minute timeout for standard users; checks Force Logout)
 */
export function checkCurrentSessionValid(currentUserRole?: StaffUser['role']): { 
  isValid: boolean; 
  reason?: 'expired' | 'revoked_by_admin' | 'none'; 
  remainingMs: number;
  isUnlimited?: boolean;
} {
  const startTime = getSessionStartTime();
  const currentSessionId = getCurrentSessionId();
  const logs = getStoredLoginLogs();
  const currentLog = currentSessionId ? logs.find(l => l.sessionId === currentSessionId) : undefined;

  // 1. Check if admin revoked this session explicitly
  if (currentLog && currentLog.status === 'revoked_by_admin') {
    setStoredLogoutReason(currentLog.logoutReason || 'เซสชันของคุณถูกบังคับให้ออกจากระบบโดยผู้ดูแลระบบ');
    return { isValid: false, reason: 'revoked_by_admin', remainingMs: 0 };
  }

  // 2. Determine if this session belongs to an Admin (exempt from 15-minute timeout)
  const activeEmail = getStoredActiveUserEmail().toLowerCase().trim();
  const isAdminSession =
    currentUserRole === 'admin' ||
    currentLog?.role === 'admin' ||
    activeEmail === 'kittiya.so@psu.ac.th';

  if (isAdminSession) {
    return { isValid: true, remainingMs: SESSION_MAX_DURATION_MS, isUnlimited: true };
  }

  if (!startTime || !currentSessionId) {
    return { isValid: false, reason: 'none', remainingMs: 0 };
  }

  const elapsed = Date.now() - startTime;
  const remainingMs = Math.max(0, SESSION_MAX_DURATION_MS - elapsed);

  // 3. For standard users, check if 15 minutes have passed
  if (elapsed >= SESSION_MAX_DURATION_MS) {
    recordLogoutEvent(currentSessionId, 'หมดเวลาการใช้งาน (เกิน 15 นาที)');
    setStoredLogoutReason('หมดเวลาการใช้งาน (เกิน 15 นาที) กรุณาเข้าสู่ระบบอีกครั้ง');
    return { isValid: false, reason: 'expired', remainingMs: 0 };
  }

  return { isValid: true, remainingMs, isUnlimited: false };
}

export function getStoredAdminPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export function saveStoredAdminPassword(password: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_PASSWORD, password.trim());
  } catch (err) {
    console.error('Error saving admin password', err);
  }
}

export function getStoredIsAuthenticated(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTH_STATUS);
    return val === 'true';
  } catch {
    return false;
  }
}

export function saveStoredIsAuthenticated(status: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_STATUS, status ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving auth status to storage', err);
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_STATUS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
  } catch (err) {
    console.error('Error clearing auth session', err);
  }
}

export function getStoredStaffUsers(): StaffUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(STAFF_USERS));
      return STAFF_USERS;
    }
    const parsed: StaffUser[] = JSON.parse(raw);
    // If stored count is less than built-in database (e.g. old 14 entries), merge full 45 entries
    const existingEmails = new Set(parsed.map(u => (u.email || '').toLowerCase()));
    const missingFromBuiltin = STAFF_USERS.filter(u => !existingEmails.has((u.email || '').toLowerCase()));
    const combined = [...parsed, ...missingFromBuiltin];

    // Ensure all items have title_th, first_name_th, last_name_th, display_name_th
    const merged = combined.map(user => {
      const initial = STAFF_USERS.find(s => s.email.toLowerCase() === (user.email || '').toLowerCase());
      const emailLower = (user.email || '').toLowerCase().trim();
      
      // Strict role validation: Only designated admin accounts can have role 'admin'
      let sanitizedRole = user.role || initial?.role || 'user';
      let sanitizedRoleLabel = user.roleLabel || initial?.roleLabel || 'ผู้ขอยืม (User)';
      
      if (sanitizedRole === 'admin' && emailLower !== 'kittiya.so@psu.ac.th' && initial?.role !== 'admin') {
        sanitizedRole = 'user';
        sanitizedRoleLabel = 'ผู้ขอยืม (User)';
      }

      return {
        ...initial,
        ...user,
        title_th: user.title_th || initial?.title_th || '',
        first_name_th: user.first_name_th || initial?.first_name_th || user.name.split(' ')[0] || '',
        last_name_th: user.last_name_th || initial?.last_name_th || user.name.split(' ').slice(1).join(' ') || '',
        display_name_th: user.display_name_th || initial?.display_name_th || `${user.title_th || ''}${user.name}`.trim(),
        role: sanitizedRole,
        roleLabel: sanitizedRoleLabel,
      };
    });

    if (missingFromBuiltin.length > 0) {
      saveStoredStaffUsers(merged);
    }

    return merged;
  } catch (err) {
    console.error('Error reading staff users from storage', err);
    return STAFF_USERS;
  }
}

export function saveStoredStaffUsers(staff: StaffUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staff));
  } catch (err) {
    console.error('Error saving staff users to storage', err);
  }
}

export function getStoredActiveUserEmail(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_USER) || '';
  } catch {
    return '';
  }
}

export function saveStoredActiveUserEmail(email: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, email);
  } catch (err) {
    console.error('Error saving active user email', err);
  }
}

export function getStoredRequests(): BorrowRequest[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
    // If v3 doesn't exist yet, check older versions so user's previous work isn't lost
    if (!raw) {
      const v2Raw = localStorage.getItem('psu_vet_borrow_requests_v2');
      const v1Raw = localStorage.getItem('psu_vet_borrow_requests_v1');
      raw = v2Raw || v1Raw;
    }

    if (!raw) {
      const storedEq = getStoredEquipment();
      const hydratedReqs = enrichRequestsWithEquipmentOwners(INITIAL_BORROW_REQUESTS, storedEq);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(hydratedReqs));
      syncEquipmentAvailability(hydratedReqs);
      return hydratedReqs;
    }

    const parsed: BorrowRequest[] = JSON.parse(raw);
    const existingMap = new Map<string, BorrowRequest>();
    for (const r of parsed) {
      existingMap.set(r.id, r);
    }

    // Always merge in any new canonical requests from INITIAL_BORROW_REQUESTS (e.g. REQ-SR7TYY, REQ-SSKSJY, REQ-K299VC, etc.)
    let hasChanges = false;
    for (const initReq of INITIAL_BORROW_REQUESTS) {
      if (!existingMap.has(initReq.id)) {
        existingMap.set(initReq.id, initReq);
        hasChanges = true;
      } else {
        // If an initial request in the sheet was marked completed or approved in INITIAL_BORROW_REQUESTS
        // and local has an outdated/stale status (e.g. REQ-SR7TYY should be 'เจ้าของให้ยืมแล้ว'), sync it
        const current = existingMap.get(initReq.id)!;
        if (initReq.id === 'REQ-SR7TYY' && current.status !== 'เจ้าของให้ยืมแล้ว') {
          existingMap.set(initReq.id, { ...current, ...initReq });
          hasChanges = true;
        } else if (initReq.id === 'REQ-8HODE2' && current.status !== 'รับคืนเรียบร้อย') {
          existingMap.set(initReq.id, { ...current, ...initReq });
          hasChanges = true;
        } else if (!current.equipmentList || current.equipmentList.length === 0) {
          existingMap.set(initReq.id, { ...current, equipmentList: initReq.equipmentList });
          hasChanges = true;
        }
      }
    }

    const rawMerged = Array.from(existingMap.values());
    const storedEquipment = getStoredEquipment();
    const merged = enrichRequestsWithEquipmentOwners(rawMerged, storedEquipment);
    const normalizedChanged = JSON.stringify(merged) !== JSON.stringify(rawMerged);

    if (hasChanges || normalizedChanged || merged.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(merged));
      syncEquipmentAvailability(merged);
    } else {
      // Ensure equipment availability matches current loan state
      syncEquipmentAvailability(merged);
    }
    return merged;
  } catch (err) {
    console.error('Error reading requests from storage', err);
    return INITIAL_BORROW_REQUESTS;
  }
}

export function saveStoredRequests(requests: BorrowRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    syncEquipmentAvailability(requests);
  } catch (err) {
    console.error('Error saving requests to storage', err);
  }
}

export function getStoredEquipment(): EquipmentMaster[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EQUIPMENT);
    if (!raw) {
      const hydrated = INITIAL_EQUIPMENT_MASTER.map(eq => {
        const owner = resolveEquipmentOwner({
          code: eq.code,
          name: eq.name,
          location: eq.location,
          explicitResponsible: eq.responsible,
          explicitEmail: eq.responsibleEmail
        });
        return { ...eq, ...owner };
      });
      localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(hydrated));
      return hydrated;
    }
    const parsed: EquipmentMaster[] = JSON.parse(raw);
    
    // If parsed is empty or contains less than INITIAL_EQUIPMENT_MASTER, merge with INITIAL_EQUIPMENT_MASTER
    const map = new Map<string, EquipmentMaster>();
    for (const item of INITIAL_EQUIPMENT_MASTER) {
      map.set(item.code.trim().toLowerCase(), item);
    }
    for (const item of parsed) {
      const key = (item.code || '').trim().toLowerCase();
      if (!key || key === 'n/a') {
        map.set(item.id, item);
        continue;
      }
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, ...item });
      } else {
        map.set(key, item);
      }
    }
    const hasMigratedExcelOwners = localStorage.getItem('psu_vet_excel_owners_v1_migrated') === '1';
    let ownerHydrated = false;
    const combined = Array.from(map.values()).map(item => {
      const resp = (item.responsible || '').trim();
      const email = (item.responsibleEmail || '').trim();
      const codeNorm = (item.code || '').trim().toLowerCase();
      const verified = codeNorm ? VERIFIED_EXCEL_OWNERS_BY_CODE[codeNorm] : undefined;

      // Upgrade stale room-heuristic fallback once when verified Excel owner exists (or whenever owner is blank/generic)
      if (verified && resp !== verified.responsible && (!hasMigratedExcelOwners || !resp || GENERIC_OWNER_NAMES.has(resp.toLowerCase()))) {
        const verifiedEmail = verified.responsibleEmail || findStaffEmailByName(verified.responsible);
        ownerHydrated = true;
        return {
          ...item,
          responsible: verified.responsible,
          responsibleEmail: verifiedEmail
        };
      }

      if (GENERIC_OWNER_NAMES.has(resp.toLowerCase())) {
        const resolved = resolveEquipmentOwner({
          code: item.code,
          name: item.name,
          location: item.location,
          explicitResponsible: resp,
          explicitEmail: email
        });
        ownerHydrated = true;
        return {
          ...item,
          responsible: resolved.responsible,
          responsibleEmail: resolved.responsibleEmail
        };
      }
      return item;
    });
    if (!hasMigratedExcelOwners) {
      localStorage.setItem('psu_vet_excel_owners_v1_migrated', '1');
    }
    if (combined.length !== parsed.length || ownerHydrated) {
      localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(combined));
    }
    return combined;
  } catch (err) {
    console.error('Error reading equipment from storage', err);
    return INITIAL_EQUIPMENT_MASTER;
  }
}

export function saveStoredEquipment(equipment: EquipmentMaster[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(equipment));
  } catch (err) {
    console.error('Error saving equipment to storage', err);
  }
}

/**
 * Parses Google Sheets tab 'ครุภัณฑ์' (columns: รหัสครุภัณฑ์, วันที่ตรวจรับ, ชื่อ, ยี่ห้อ, รุ่น, สถานที่ติดตั้ง, Serial number, ราคา)
 * Resilient to merged header cells, missing headers, or shifted rows.
 */
export function parseEquipmentSheetCSV(csvText: string): EquipmentMaster[] {
  if (!csvText || !csvText.trim()) return [];

  // Split into lines handling quotes
  const rawLines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const sampleLines = rawLines.filter(l => l.trim()).slice(0, 5);
  // Detect delimiter: if lines contain tabs (from Ctrl+C in Google Sheets), use '\t', else ','
  const isTsv = sampleLines.some(l => l.includes('\t'));
  const delimiter = isTsv ? '\t' : ',';

  const rows: string[][] = [];

  for (const line of rawLines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const next = line[i + 1];
      if (c === '"' && inQuote && next === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = !inQuote;
      } else if (c === delimiter && !inQuote) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return [];

  // Default standard Google Sheet columns for tab "ครุภัณฑ์":
  // Column 0: รหัสครุภัณฑ์
  // Column 1: วันที่ตรวจรับ
  // Column 2: ชื่อ
  // Column 3: ยี่ห้อ
  // Column 4: รุ่น
  // Column 5: สถานที่ติดตั้ง
  // Column 6: Serial number
  // Column 7: ราคา (or สถานะ in Excel export)
  // Column 8: ผู้รับผิดชอบ
  // Column 9: อีเมลผู้รับผิดชอบ
  let headerIndex = -1;
  let codeIdx = 0;
  let dateIdx = 1;
  let nameIdx = 2;
  let brandIdx = 3;
  let modelIdx = 4;
  let locIdx = 5;
  let snIdx = 6;
  let priceIdx = 7;
  let statusIdx = -1;
  let respIdx = 8;
  let emailIdx = 9;

  // Search for an explicit header row. A real header row MUST have at least 2 matching column titles.
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    const rowStr = row.join(' ').toLowerCase();

    const matchesCode = rowStr.includes('รหัส') || rowStr.includes('code');
    const matchesName = rowStr.includes('ชื่อ') || rowStr.includes('name');
    const matchesDate = rowStr.includes('ตรวจรับ') || rowStr.includes('วันที่') || rowStr.includes('date');
    const matchesBrand = rowStr.includes('ยี่ห้อ') || rowStr.includes('brand');
    const matchesLoc = rowStr.includes('สถานที่') || rowStr.includes('ติดตั้ง') || rowStr.includes('location');
    const matchesSN = rowStr.includes('serial') || rowStr.includes('sn');
    const matchesPrice = rowStr.includes('ราคา') || rowStr.includes('price');
    const matchesStatus = rowStr.includes('สถานะ') || rowStr.includes('status');
    const matchesResp = rowStr.includes('เจ้าของ') || rowStr.includes('ผู้รับผิดชอบ') || rowStr.includes('owner') || rowStr.includes('responsible');

    const matchCount = [matchesCode, matchesName, matchesDate, matchesBrand, matchesLoc, matchesSN, matchesPrice, matchesStatus, matchesResp].filter(Boolean).length;
    if (matchCount >= 2) {
      headerIndex = r;
      // Reset optional column indices when explicit header exists
      priceIdx = -1;
      statusIdx = -1;
      respIdx = -1;
      emailIdx = -1;
      row.forEach((col, idx) => {
        const cLow = col.toLowerCase();
        if (cLow.includes('รหัส') || cLow.includes('code')) codeIdx = idx;
        else if (cLow.includes('ตรวจรับ') || cLow.includes('วันที่') || cLow.includes('date')) dateIdx = idx;
        else if (cLow.includes('อีเมล') || cLow.includes('email')) emailIdx = idx;
        else if (cLow.includes('ชื่อเจ้าของ') || cLow.includes('ผู้รับผิดชอบ') || cLow.includes('เจ้าของ') || cLow.includes('owner') || cLow.includes('responsible')) respIdx = idx;
        else if (cLow.includes('สถานะ') || cLow.includes('status')) statusIdx = idx;
        else if (cLow.includes('ชื่อ') || cLow.includes('name')) nameIdx = idx;
        else if (cLow.includes('ยี่ห้อ') || cLow.includes('brand')) brandIdx = idx;
        else if (cLow.includes('รุ่น') || cLow.includes('model')) modelIdx = idx;
        else if (cLow.includes('สถานที่') || cLow.includes('ติดตั้ง') || cLow.includes('location')) locIdx = idx;
        else if (cLow.includes('serial') || cLow.includes('s/n') || cLow.includes('sn')) snIdx = idx;
        else if (cLow.includes('ราคา') || cLow.includes('price')) priceIdx = idx;
      });
      break;
    }
  }

  // If no multi-column header found, check if row 0 is just a merged banner cell (e.g. contains 'รหัสครุภัณฑ์' while name is blank)
  if (headerIndex === -1 && rows.length > 0) {
    const row0 = rows[0];
    const isBannerRow = row0.some(c => c.toLowerCase().includes('รหัสครุภัณฑ์')) && !row0[2]?.trim();
    if (isBannerRow) {
      headerIndex = 0; // Skip the banner row
    }
  }

  const startRow = headerIndex >= 0 ? headerIndex + 1 : 0;
  const result: EquipmentMaster[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const cells = rows[i];
    let code = cells[codeIdx]?.trim();
    let name = cells[nameIdx]?.trim();

    if (cells[0] && (cells[0].includes('สพ.') || cells[0].includes('รพส') || /^[A-Za-z0-9\.\-\/]{4,}$/.test(cells[0]))) {
      code = cells[0].trim();
    }

    if (!name && cells[2]?.trim() && cells[2].trim().toUpperCase() !== 'N/A') {
      name = cells[2].trim();
    }

    // Skip corrupted, empty, or header lines
    if (!code || !name) continue;
    if (code.toLowerCase().includes('รหัสครุภัณฑ์') || name.toLowerCase().includes('ชื่อ')) continue;
    if (code.toUpperCase() === 'N/A' && !cells[0]) continue;

    const loc = cells[locIdx]?.trim() || 'โรงพยาบาลสัตว์ ม.อ.';
    const brand = cells[brandIdx]?.trim() || 'N/A';
    const model = cells[modelIdx]?.trim() || 'N/A';
    const serial = cells[snIdx]?.trim() || 'N/A';
    const receivedDate = normalizeSheetDate(cells[dateIdx]?.trim() || '', 'display');

    let price: number | string = '';
    if (priceIdx !== -1 && cells[priceIdx] !== undefined) {
      const rawPrice = cells[priceIdx].replace(/,/g, '').trim();
      if (rawPrice && !isNaN(Number(rawPrice))) {
        price = Number(rawPrice);
      }
    }

    const rawExcelStatus = statusIdx !== -1 ? (cells[statusIdx]?.trim() || '') : '';
    let mappedStatus: EquipmentMaster['status'] = 'พร้อมใช้งาน';
    let mappedCondition = 'ปกติสมบูรณ์';
    if (rawExcelStatus.includes('จำหน่าย')) {
      mappedStatus = 'รอจำหน่าย';
      mappedCondition = `สถานะใน Excel: ${rawExcelStatus}`;
    } else if (rawExcelStatus.includes('ชำรุด') || rawExcelStatus.includes('เสื่อม') || rawExcelStatus.includes('ซ่อม')) {
      mappedStatus = 'ซ่อมบำรุง';
      mappedCondition = `สถานะใน Excel: ${rawExcelStatus}`;
    }

    // Determine category
    let category: EquipmentMaster['category'] = 'อื่นๆ';
    const textToMatch = `${name} ${loc}`.toLowerCase();
    if (
      textToMatch.includes('เอ็กซเรย์') || 
      textToMatch.includes('x-ray') || 
      textToMatch.includes('cr') || 
      textToMatch.includes('ฟิล์ม') || 
      textToMatch.includes('อัลตราซาวด์') || 
      textToMatch.includes('กล้องจุลทรรศน์') ||
      textToMatch.includes('ชันสูตร')
    ) {
      category = 'เครื่องมือวินิจฉัย/เอ็กซเรย์';
    } else if (
      textToMatch.includes('ผ่าตัด') || 
      textToMatch.includes('ศัลยกรรม') || 
      textToMatch.includes('retractor') || 
      textToMatch.includes('bone') || 
      textToMatch.includes('กระดูก') || 
      textToMatch.includes('มีด') || 
      textToMatch.includes('คีม') || 
      textToMatch.includes('เจาะ')
    ) {
      category = 'เครื่องมือผ่าตัด/ศัลยกรรม';
    } else if (
      textToMatch.includes('สัญญาณชีพ') || 
      textToMatch.includes('ความดัน') || 
      textToMatch.includes('oximeter') || 
      textToMatch.includes('oxmeter') || 
      textToMatch.includes('capnograph') || 
      textToMatch.includes('suction') || 
      textToMatch.includes('ออกซิเจน') || 
      textToMatch.includes('น้ำเกลือ') || 
      textToMatch.includes('ตรวจสัตว์')
    ) {
      category = 'เครื่องมือตรวจและเฝ้าระวัง';
    } else if (
      textToMatch.includes('เบาะ') || 
      textToMatch.includes('กายภาพ') || 
      textToMatch.includes('ฟื้นฟู')
    ) {
      category = 'อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู';
    }

    const explicitResp = respIdx !== -1 ? (cells[respIdx]?.trim() || '') : '';
    const explicitEmail = emailIdx !== -1 ? (cells[emailIdx]?.trim() || '') : '';
    const resolvedOwner = resolveEquipmentOwner({
      code,
      name,
      location: loc,
      explicitResponsible: explicitResp,
      explicitEmail,
      existingEquipment: INITIAL_EQUIPMENT_MASTER,
      staffList: STAFF_USERS
    });

    result.push({
      id: `EQ-SHEET-${i + 1}`,
      code,
      name,
      category,
      location: loc,
      responsible: resolvedOwner.responsible,
      responsibleEmail: resolvedOwner.responsibleEmail,
      serialNumber: serial,
      brand,
      model,
      receivedDate,
      price,
      status: mappedStatus,
      condition: mappedCondition
    });
  }

  return result;
}

export interface ExcelParsedRow {
  code: string;
  receivedDate: string;
  name: string;
  brand: string;
  model: string;
  location: string;
  serialNumber: string;
  excelStatus: string;
  responsible: string;
}

export interface ExcelReconcileMatch {
  catalogItem: EquipmentMaster;
  excelRow: ExcelParsedRow;
  updatedItem: EquipmentMaster;
  resolvedEmail: string;
  missingStaffEmail: boolean;
  ownerChanged: boolean;
  statusChanged: boolean;
  diffs: string[];
}

export interface ExcelReconcileReport {
  excelRowCount: number;
  sheetCount: number;
  matchedItems: ExcelReconcileMatch[];
  unmatchedSheetItems: { item: EquipmentMaster; closeMatchCode?: string }[];
  unmatchedExcelCount: number;
  missingEmailOwners: { name: string; count: number; codes: string[] }[];
  nonActiveStatusItems: ExcelReconcileMatch[];
  fieldDiffItems: ExcelReconcileMatch[];
  updatedCatalog: EquipmentMaster[];
}

/**
 * Parse raw TSV/CSV exported from the hospital Excel register and reconcile against existing Google Sheet catalog
 * Preserves existing price, category, id, and active loan fields while syncing owner, email, status, and metadata.
 */
export function reconcileEquipmentWithExcel(
  rawText: string,
  currentCatalog: EquipmentMaster[],
  staffList: StaffUser[] = STAFF_USERS,
  options: {
    updateStatusFromExcel?: boolean;
    updateDetailsFromExcel?: boolean;
  } = { updateStatusFromExcel: true, updateDetailsFromExcel: true }
): ExcelReconcileReport {
  const { updateStatusFromExcel = true, updateDetailsFromExcel = true } = options;

  const rawLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const sampleLines = rawLines.filter(l => l.trim()).slice(0, 5);
  const isTsv = sampleLines.some(l => l.includes('\t'));
  const delimiter = isTsv ? '\t' : ',';

  const rows: string[][] = [];
  for (const line of rawLines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const next = line[i + 1];
      if (c === '"' && inQuote && next === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = !inQuote;
      } else if (c === delimiter && !inQuote) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    if (cells.some(c => c.length > 0)) rows.push(cells);
  }

  let headerIdx = -1;
  let codeIdx = 0;
  let dateIdx = 1;
  let nameIdx = 2;
  let brandIdx = 3;
  let modelIdx = 4;
  let locIdx = 5;
  let snIdx = 6;
  let statusIdx = 7;
  let respIdx = 8;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    const rowStr = row.join(' ').toLowerCase();
    if ((rowStr.includes('รหัส') || rowStr.includes('code')) && (rowStr.includes('ชื่อ') || rowStr.includes('ผู้รับผิดชอบ'))) {
      headerIdx = r;
      row.forEach((col, idx) => {
        const cLow = col.toLowerCase();
        if (cLow.includes('รหัส') || cLow.includes('code')) codeIdx = idx;
        else if (cLow.includes('ตรวจรับ') || cLow.includes('วันที่') || cLow.includes('date')) dateIdx = idx;
        else if (cLow.includes('ผู้รับผิดชอบ') || cLow.includes('เจ้าของ') || cLow.includes('owner') || cLow.includes('responsible')) respIdx = idx;
        else if (cLow.includes('สถานะ') || cLow.includes('status')) statusIdx = idx;
        else if (cLow.includes('ชื่อ') || cLow.includes('name')) nameIdx = idx;
        else if (cLow.includes('ยี่ห้อ') || cLow.includes('brand')) brandIdx = idx;
        else if (cLow.includes('รุ่น') || cLow.includes('model')) modelIdx = idx;
        else if (cLow.includes('สถานที่') || cLow.includes('ติดตั้ง') || cLow.includes('location')) locIdx = idx;
        else if (cLow.includes('serial') || cLow.includes('s/n') || cLow.includes('sn')) snIdx = idx;
      });
      break;
    }
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
  const excelByCode = new Map<string, ExcelParsedRow>();
  const excelRows: ExcelParsedRow[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const cells = rows[i];
    const code = (cells[codeIdx] || '').trim();
    const name = (cells[nameIdx] || '').trim();
    if (!code || code.toLowerCase().includes('รหัสครุภัณฑ์')) continue;
    const parsedRow: ExcelParsedRow = {
      code,
      receivedDate: normalizeSheetDate(cells[dateIdx] || '', 'display'),
      name,
      brand: (cells[brandIdx] || '').trim(),
      model: (cells[modelIdx] || '').trim(),
      location: (cells[locIdx] || '').trim(),
      serialNumber: (cells[snIdx] || '').trim(),
      excelStatus: (cells[statusIdx] || '').trim(),
      responsible: (cells[respIdx] || '').trim()
    };
    excelRows.push(parsedRow);
    const normKey = code.replace(/\s+/g, '').toLowerCase();
    if (!excelByCode.has(normKey)) {
      excelByCode.set(normKey, parsedRow);
    }
  }

  const staffPool = staffList.length > 0 ? staffList : STAFF_USERS;
  const matchedItems: ExcelReconcileMatch[] = [];
  const unmatchedSheetItems: { item: EquipmentMaster; closeMatchCode?: string }[] = [];
  const missingEmailMap = new Map<string, { name: string; count: number; codes: string[] }>();
  const matchedExcelKeys = new Set<string>();

  const normClean = (v?: string) => (v || '').trim().replace(/\s+/g, ' ');
  const isNAOrBlank = (v?: string) => {
    const t = normClean(v).toUpperCase();
    return !t || t === 'N/A' || t === '-';
  };

  const updatedCatalog: EquipmentMaster[] = currentCatalog.map(item => {
    const normCode = (item.code || '').replace(/\s+/g, '').toLowerCase();
    const excel = excelByCode.get(normCode);
    if (!excel) {
      // Find possible close code (e.g. 3/3-56 vs 13/3-56)
      const prefix = normCode.split('-').slice(0, 3).join('-');
      const close = prefix.length > 6 ? excelRows.find(er => er.code.replace(/\s+/g, '').toLowerCase().startsWith(prefix)) : undefined;
      unmatchedSheetItems.push({ item, closeMatchCode: close?.code });
      return item;
    }

    matchedExcelKeys.add(normCode);

    const diffs: string[] = [];
    if (normClean(excel.name) && normClean(excel.name) !== normClean(item.name)) {
      diffs.push(`ชื่อ: "${item.name}" → "${excel.name}"`);
    }
    if (!isNAOrBlank(excel.location) && normClean(excel.location) !== normClean(item.location)) {
      diffs.push(`สถานที่: "${item.location || '-'}" → "${excel.location}"`);
    }
    if (!isNAOrBlank(excel.brand) && normClean(excel.brand) !== normClean(item.brand)) {
      diffs.push(`ยี่ห้อ: "${item.brand || '-'}" → "${excel.brand}"`);
    }
    if (!isNAOrBlank(excel.model) && normClean(excel.model) !== normClean(item.model)) {
      diffs.push(`รุ่น: "${item.model || '-'}" → "${excel.model}"`);
    }
    if (!isNAOrBlank(excel.serialNumber) && normClean(excel.serialNumber) !== normClean(item.serialNumber)) {
      diffs.push(`S/N: "${item.serialNumber || '-'}" → "${excel.serialNumber}"`);
    }

    const nextResp = excel.responsible && !GENERIC_OWNER_NAMES.has(excel.responsible.toLowerCase())
      ? excel.responsible
      : item.responsible;
    const resolvedEmail = nextResp ? findStaffEmailByName(nextResp, staffPool) : '';
    const missingStaffEmail = Boolean(nextResp && !GENERIC_OWNER_NAMES.has(nextResp.toLowerCase()) && !resolvedEmail);
    const ownerChanged = normClean(nextResp) !== normClean(item.responsible) || resolvedEmail !== (item.responsibleEmail || '');

    if (missingStaffEmail) {
      const existingMissing = missingEmailMap.get(nextResp) || { name: nextResp, count: 0, codes: [] };
      existingMissing.count += 1;
      if (existingMissing.codes.length < 5) existingMissing.codes.push(item.code);
      missingEmailMap.set(nextResp, existingMissing);
    }

    let nextStatus = item.status;
    let nextCondition = item.condition;
    const st = excel.excelStatus;
    if (updateStatusFromExcel && st) {
      if (st.includes('จำหน่าย')) {
        nextStatus = 'รอจำหน่าย';
        nextCondition = `สถานะใน Excel: ${st}`;
      } else if (st.includes('ชำรุด') || st.includes('เสื่อม') || st.includes('ซ่อม')) {
        nextStatus = 'ซ่อมบำรุง';
        nextCondition = `สถานะใน Excel: ${st}`;
      } else if (st.includes('ใช้งาน') && (item.status === 'ซ่อมบำรุง' || item.status === 'รอจำหน่าย')) {
        nextStatus = 'พร้อมใช้งาน';
        nextCondition = 'ปกติสมบูรณ์';
      }
    }
    const statusChanged = nextStatus !== item.status;

    const updatedItem: EquipmentMaster = {
      ...item,
      responsible: nextResp,
      responsibleEmail: resolvedEmail || (normClean(nextResp) === normClean(item.responsible) ? item.responsibleEmail : ''),
      status: nextStatus,
      condition: nextCondition,
      ...(updateDetailsFromExcel
        ? {
            name: excel.name || item.name,
            location: excel.location ? excel.location : item.location,
            brand: excel.brand || item.brand,
            model: excel.model || item.model,
            serialNumber: excel.serialNumber || item.serialNumber,
            receivedDate: excel.receivedDate || item.receivedDate
          }
        : {})
    };

    const matchEntry: ExcelReconcileMatch = {
      catalogItem: item,
      excelRow: excel,
      updatedItem,
      resolvedEmail,
      missingStaffEmail,
      ownerChanged,
      statusChanged,
      diffs
    };
    matchedItems.push(matchEntry);
    return updatedItem;
  });

  return {
    excelRowCount: excelRows.length,
    sheetCount: currentCatalog.length,
    matchedItems,
    unmatchedSheetItems,
    unmatchedExcelCount: Math.max(0, excelRows.length - matchedExcelKeys.size),
    missingEmailOwners: Array.from(missingEmailMap.values()).sort((a, b) => b.count - a.count),
    nonActiveStatusItems: matchedItems.filter(m => m.excelRow.excelStatus && !m.excelRow.excelStatus.includes('ใช้งาน')),
    fieldDiffItems: matchedItems.filter(m => m.diffs.length > 0),
    updatedCatalog
  };
}

export async function fetchGoogleSheetCSV(
  sheetUrl = 'https://docs.google.com/spreadsheets/d/1jGol5v7T8hyZO8DbNo8i-MaoCnW_b7WSsGn2P63MYts/edit?gid=326365193',
  gid = '326365193'
): Promise<string> {
  // If user provided a direct /pub?output=csv link
  if (sheetUrl.includes('/pub') && sheetUrl.includes('output=csv')) {
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const text = await response.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('Google Drive') || text.includes('accounts.google.com')) {
      throw new Error('RESTRICTED_ACCESS');
    }
    return text;
  }

  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = match ? match[1] : '1jGol5v7T8hyZO8DbNo8i-MaoCnW_b7WSsGn2P63MYts';
  const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
  const targetGid = gidMatch ? gidMatch[1] : gid;

  // Try standard export
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${targetGid}`;

  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }
    const text = await response.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('Google Drive') || text.includes('accounts.google.com') || text.includes('找不到網頁')) {
      throw new Error('RESTRICTED_ACCESS');
    }
    return text;
  } catch (err: any) {
    // If standard export fails, try gviz format
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${targetGid}`;
    const gvizRes = await fetch(gvizUrl);
    if (!gvizRes.ok) {
      throw err;
    }
    const gvizText = await gvizRes.text();
    if (gvizText.includes('<!DOCTYPE html>') || gvizText.includes('Google Drive') || gvizText.includes('accounts.google.com') || gvizText.includes('找不到網頁')) {
      throw err;
    }
    return gvizText;
  }
}

export function resetToDefaults(): void {
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(INITIAL_BORROW_REQUESTS));
  localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(INITIAL_EQUIPMENT_MASTER));
}

// Automatically sync equipment master status based on active requests
export function syncEquipmentAvailability(requests: BorrowRequest[]) {
  const masterList = getStoredEquipment();
  // Find which codes are actively borrowed (status is 'เจ้าของให้ยืมแล้ว' or 'กำลังยืมใช้งาน' or 'รอผู้บริหารอนุมัติ')
  const activeLoans = requests.filter(r => 
    r.status === 'เจ้าของให้ยืมแล้ว' || 
    r.status === 'กำลังยืมใช้งาน' || 
    r.status === 'รอผู้บริหารอนุมัติ'
  );
  
  const updatedMaster = masterList.map(eq => {
    // If it's broken or in maintenance, preserve that
    if (eq.status === 'ซ่อมบำรุง' || eq.status === 'รอจำหน่าย') {
      return eq;
    }
    
    // Check if any active loan includes this equipment
    const loan = activeLoans.find(r => 
      r.equipmentList.some(item => item.code.trim().toLowerCase() === eq.code.trim().toLowerCase() || item.name.trim().toLowerCase() === eq.name.trim().toLowerCase())
    );

    if (loan) {
      return {
        ...eq,
        status: 'ถูกยืมใช้งาน' as const,
        currentBorrowRequestId: loan.id,
        currentBorrowerName: loan.requesterName,
        currentDueTo: loan.borrowTo
      };
    } else {
      return {
        ...eq,
        status: 'พร้อมใช้งาน' as const,
        currentBorrowRequestId: undefined,
        currentBorrowerName: undefined,
        currentDueTo: undefined
      };
    }
  });

  saveStoredEquipment(updatedMaster);
}

// Generate notifications from current state and check due dates
export function generateSystemNotifications(requests: BorrowRequest[]): SystemNotification[] {
  const notifs: SystemNotification[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  requests.forEach(req => {
    if (req.status === 'เสร็จสิ้น' || req.status === 'รับคืนเรียบร้อย' || req.status === 'คืนครุภัณฑ์แล้ว' || req.status === 'ยกเลิกคำขอ') {
      return;
    }

    const dueDate = new Date(req.borrowTo);
    dueDate.setHours(23, 59, 59, 999);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const eqNames = req.equipmentList.map(e => e.name).join(', ');

    if (diffDays < 0) {
      // Overdue
      notifs.push({
        id: `notif-overdue-${req.id}`,
        requestId: req.id,
        type: 'overdue',
        title: `เกินกำหนดส่งคืน (${Math.abs(diffDays)} วัน)!`,
        message: `${req.requesterName} ยังไม่ได้ส่งคืนอุปกรณ์ [${eqNames}] ครบกำหนดส่งคืนเมื่อ ${req.borrowTo} ${req.borrowToTime || ''}`,
        timestamp: req.borrowTo,
        isRead: false,
        requesterName: req.requesterName,
        equipmentSummary: eqNames,
        dueDate: req.borrowTo
      });
    } else if (diffDays === 0) {
      // Due Today
      notifs.push({
        id: `notif-today-${req.id}`,
        requestId: req.id,
        type: 'due_today',
        title: `ครบกำหนดส่งคืนวันนี้!`,
        message: `${req.requesterName} มีกำหนดส่งคืน [${eqNames}] วันนี้ เวลา ${req.borrowToTime || '16:30'} น.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        requesterName: req.requesterName,
        equipmentSummary: eqNames,
        dueDate: req.borrowTo
      });
    } else if (diffDays <= 3) {
      // Due soon
      notifs.push({
        id: `notif-soon-${req.id}`,
        requestId: req.id,
        type: 'due_soon',
        title: `ใกล้ถึงกำหนดส่งคืน (อีก ${diffDays} วัน)`,
        message: `อุปกรณ์ [${eqNames}] ของ ${req.requesterName} ครบกำหนดในวันที่ ${req.borrowTo}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        requesterName: req.requesterName,
        equipmentSummary: eqNames,
        dueDate: req.borrowTo
      });
    }

    if (req.status === 'ยื่นขออนุมัติ') {
      notifs.push({
        id: `notif-pending-${req.id}`,
        requestId: req.id,
        type: 'new_request',
        title: `มีคำขอยืมใหม่รอเจ้าของครุภัณฑ์อนุมัติ`,
        message: `${req.requesterName} ยื่นขอยืม [${eqNames}] วัตถุประสงค์: ${req.purpose}`,
        timestamp: req.createdAt,
        isRead: false,
        requesterName: req.requesterName,
        equipmentSummary: eqNames,
        dueDate: req.borrowTo
      });
    } else if (req.status === 'รอผู้บริหารอนุมัติ') {
      notifs.push({
        id: `notif-executive-${req.id}`,
        requestId: req.id,
        type: 'approved',
        title: `รอผู้บริหารอนุมัติ (ดร.สพ.ญ.ญาดา ดวงนำสว่าง)`,
        message: `เจ้าของครุภัณฑ์กดยินยอมแล้ว ส่งต่อให้ ดร.สพ.ญ.ญาดา ดวงนำสว่าง รอง ผอ. รพ.สัตว์ฯ อนุมัติคำขอ ${req.id}`,
        timestamp: req.updatedAt || req.createdAt,
        isRead: false,
        requesterName: req.requesterName,
        equipmentSummary: eqNames,
        dueDate: req.borrowTo
      });
    }
  });

  return notifs;
}

// CSV Export Generator
export function convertRequestsToCSV(requests: BorrowRequest[]): string {
  const headers = [
    'id',
    'status',
    'createdAt',
    'updatedAt',
    'requesterName',
    'requesterPosition',
    'requesterDept',
    'requesterEmail',
    'purpose',
    'borrowFrom',
    'borrowFromTime',
    'borrowTo',
    'borrowToTime',
    'equipmentJSON'
  ];

  const rows = requests.map(req => {
    const eqJson = JSON.stringify(req.equipmentList).replace(/"/g, '""');
    return [
      req.id,
      req.status,
      req.createdAt,
      req.updatedAt,
      `"${(req.requesterName || '').replace(/"/g, '""')}"`,
      `"${(req.requesterPosition || '').replace(/"/g, '""')}"`,
      `"${(req.requesterDept || '').replace(/"/g, '""')}"`,
      `"${(req.requesterEmail || '').replace(/"/g, '""')}"`,
      `"${(req.purpose || '').replace(/"/g, '""')}"`,
      req.borrowFrom,
      req.borrowFromTime || '',
      req.borrowTo,
      req.borrowToTime || '',
      `"${eqJson}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Simple RFC4180 CSV parser for parsing uploaded CSV
export function parseRequestsCSV(csvText: string): BorrowRequest[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentLine += '"';
      i++; // skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  // Parse header
  const parsedRows: BorrowRequest[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells: string[] = [];
    let curCell = '';
    let inCellQuote = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      const next = line[c + 1];
      if (char === '"' && inCellQuote && next === '"') {
        curCell += '"';
        c++;
      } else if (char === '"') {
        inCellQuote = !inCellQuote;
      } else if (char === ',' && !inCellQuote) {
        cells.push(curCell.trim());
        curCell = '';
      } else {
        curCell += char;
      }
    }
    cells.push(curCell.trim());

    if (cells.length >= 13) {
      let equipmentList: BorrowedEquipmentItem[] = [];
      try {
        if (cells[13]) {
          equipmentList = JSON.parse(cells[13]);
        }
      } catch (e) {
        console.warn('Could not parse equipmentJSON for row', cells[0], e);
      }

      parsedRows.push({
        id: cells[0] || `REQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: (cells[1] as any) || 'ยื่นขออนุมัติ',
        createdAt: cells[2] || new Date().toISOString(),
        updatedAt: cells[3] || new Date().toISOString(),
        requesterName: cells[4] || '',
        requesterPosition: cells[5] || '',
        requesterDept: cells[6] || '',
        requesterEmail: cells[7] || '',
        purpose: cells[8] || '',
        borrowFrom: normalizeSheetDate(cells[9] || ''),
        borrowFromTime: normalizeSheetTime(cells[10] || ''),
        borrowTo: normalizeSheetDate(cells[11] || ''),
        borrowToTime: normalizeSheetTime(cells[12] || ''),
        equipmentList
      });
    }
  }

  return parsedRows;
}

/**
 * Safely format staff full name with Thai title without duplicate prefix
 * e.g., prevents "นางสาวนางสาวกิตติยา" or "ดร.สพ.ญ.ดร.สพ.ญ.ญาดา"
 */
export function formatStaffFullName(title?: string, name?: string): string {
  const cleanName = (name || '').trim();
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return cleanName;
  if (!cleanName) return cleanTitle;
  
  // If cleanName already starts with cleanTitle, don't duplicate
  if (cleanName.startsWith(cleanTitle)) {
    return cleanName;
  }
  
  return `${cleanTitle}${cleanName}`;
}
