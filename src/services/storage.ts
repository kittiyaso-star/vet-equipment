import { BorrowRequest, EquipmentMaster, SystemNotification, BorrowedEquipmentItem, StaffUser } from '../types';
import { INITIAL_BORROW_REQUESTS, INITIAL_EQUIPMENT_MASTER, STAFF_USERS } from '../data/initialData';

const STORAGE_KEY_REQUESTS = 'psu_vet_borrow_requests_v3';
const STORAGE_KEY_EQUIPMENT = 'psu_vet_equipment_master_v3';
const STORAGE_KEY_NOTIFS = 'psu_vet_notifications_v1';
const STORAGE_KEY_STAFF = 'psu_vet_staff_users_v3';
const STORAGE_KEY_ACTIVE_USER = 'psu_vet_active_user_email_v2';
const STORAGE_KEY_AUTH_STATUS = 'psu_vet_auth_is_authenticated_v1';

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
      return {
        ...initial,
        ...user,
        title_th: user.title_th || initial?.title_th || '',
        first_name_th: user.first_name_th || initial?.first_name_th || user.name.split(' ')[0] || '',
        last_name_th: user.last_name_th || initial?.last_name_th || user.name.split(' ').slice(1).join(' ') || '',
        display_name_th: user.display_name_th || initial?.display_name_th || `${user.title_th || ''}${user.name}`.trim(),
        role: user.role || initial?.role || 'user',
        roleLabel: user.roleLabel || initial?.roleLabel || 'ผู้ใช้งาน',
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
    return localStorage.getItem(STORAGE_KEY_ACTIVE_USER) || 'kittiya.so@psu.ac.th';
  } catch {
    return 'kittiya.so@psu.ac.th';
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
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(INITIAL_BORROW_REQUESTS));
      return INITIAL_BORROW_REQUESTS;
    }

    const parsed: BorrowRequest[] = JSON.parse(raw);
    // Ensure all canonical requests exist in the list
    const existingIds = new Set(parsed.map(r => r.id));
    const missing = INITIAL_BORROW_REQUESTS.filter(r => !existingIds.has(r.id));
    
    // Also if parsed has fewer items than INITIAL_BORROW_REQUESTS, guarantee full catalog of requests
    const merged = missing.length > 0 ? [...parsed, ...missing] : parsed;
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(merged));
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
      localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(INITIAL_EQUIPMENT_MASTER));
      return INITIAL_EQUIPMENT_MASTER;
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
    const combined = Array.from(map.values());
    if (combined.length !== parsed.length) {
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
  // Column 7: ราคา
  let headerIndex = -1;
  let codeIdx = 0;
  let dateIdx = 1;
  let nameIdx = 2;
  let brandIdx = 3;
  let modelIdx = 4;
  let locIdx = 5;
  let snIdx = 6;
  let priceIdx = 7;
  let respIdx = -1;
  let emailIdx = -1;

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
    const matchesResp = rowStr.includes('เจ้าของ') || rowStr.includes('ผู้รับผิดชอบ') || rowStr.includes('owner') || rowStr.includes('responsible');

    const matchCount = [matchesCode, matchesName, matchesDate, matchesBrand, matchesLoc, matchesSN, matchesPrice, matchesResp].filter(Boolean).length;
    if (matchCount >= 2) {
      headerIndex = r;
      row.forEach((col, idx) => {
        const cLow = col.toLowerCase();
        if (cLow.includes('รหัส') || cLow.includes('code')) codeIdx = idx;
        else if (cLow.includes('ตรวจรับ') || cLow.includes('วันที่') || cLow.includes('date')) dateIdx = idx;
        else if (cLow.includes('ชื่อเจ้าของ') || cLow.includes('ผู้รับผิดชอบ') || cLow.includes('เจ้าของ') || cLow.includes('owner') || cLow.includes('responsible')) respIdx = idx;
        else if (cLow.includes('อีเมล') || cLow.includes('email')) emailIdx = idx;
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

    // Priority Check: If cells[0] clearly looks like an authentic equipment code (e.g. starts with 'สพ.', 'รพส', or alphanumeric code)
    // and codeIdx was accidentally pointing elsewhere, prioritize cells[0]!
    if (cells[0] && (cells[0].includes('สพ.') || cells[0].includes('รพส') || /^[A-Za-z0-9\.\-\/]{4,}$/.test(cells[0]))) {
      code = cells[0].trim();
    }

    // Priority Check: If name is missing or empty, but cells[2] has Thai/English name text
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
    const receivedDate = cells[dateIdx]?.trim() || '';
    const rawPrice = cells[priceIdx]?.replace(/,/g, '') || '';
    const price = !isNaN(Number(rawPrice)) && rawPrice !== '' ? Number(rawPrice) : rawPrice;

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

    // Determine responsible staff
    let responsible = 'เจ้าหน้าที่พยาบาลสัตว์';
    let responsibleEmail = 'vet.hospital@psu.ac.th';

    if (respIdx !== -1 && cells[respIdx]?.trim() && cells[respIdx].trim().toUpperCase() !== 'N/A') {
      responsible = cells[respIdx].trim();
      if (emailIdx !== -1 && cells[emailIdx]?.trim() && cells[emailIdx].trim().includes('@')) {
        responsibleEmail = cells[emailIdx].trim();
      } else {
        // Find staff by name
        const foundStaff = STAFF_USERS.find(s => s.name.includes(responsible) || responsible.includes(s.name.split(' ')[0]));
        if (foundStaff) {
          responsibleEmail = foundStaff.email;
        }
      }
    } else if (loc.includes('ห้องผ่าตัด') || textToMatch.includes('ห้องผ่าตัด')) {
      responsible = 'นภัสกร';
      responsibleEmail = 'naphatsakon.s@psu.ac.th';
    } else if (loc.includes('ศัลยกรรม') || textToMatch.includes('ศัลยกรรม')) {
      responsible = 'เบญจมาศ';
      responsibleEmail = 'benjamas.ji@psu.ac.th';
    } else if (
      loc.includes('เอกซเรย์') || 
      loc.includes('หัตถการ') || 
      loc.includes('ccu') || 
      loc.includes('ชันสูตร') || 
      loc.includes('ธนาคารเลือด')
    ) {
      responsible = 'อัจฉรา';
      responsibleEmail = 'atchara.m@psu.ac.th';
    } else {
      responsible = 'วทันยา';
      responsibleEmail = 'watanya.po@psu.ac.th';
    }

    result.push({
      id: `EQ-SHEET-${i + 1}`,
      code,
      name,
      category,
      location: loc,
      responsible,
      responsibleEmail,
      serialNumber: serial,
      brand,
      model,
      receivedDate,
      price,
      status: 'พร้อมใช้งาน',
      condition: 'ปกติสมบูรณ์'
    });
  }

  return result;
}

export async function fetchGoogleSheetCSV(
  sheetUrl = 'https://docs.google.com/spreadsheets/d/1jGol5v7T8hyZO8dBNo8i-MaoCnW_b7WSsGn2P63MYts/edit?gid=326365193',
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
  const spreadsheetId = match ? match[1] : '1jGol5v7T8hyZO8dBNo8i-MaoCnW_b7WSsGn2P63MYts';
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
        borrowFrom: cells[9] || '',
        borrowFromTime: cells[10] || '',
        borrowTo: cells[11] || '',
        borrowToTime: cells[12] || '',
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
