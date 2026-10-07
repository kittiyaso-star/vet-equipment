import { BorrowRequest, EquipmentMaster, StaffUser } from '../types';
import { convertRequestsToCSV, parseRequestsCSV, formatStaffFullName, fetchGoogleSheetCSV, parseEquipmentSheetCSV } from './storage';

export const SPREADSHEET_ID = '1jGol5v7T8hyZO8dBNo8i-MaoCnW_b7WSsGn2P63MYts';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=326365193#gid=326365193`;
export const TAB_REQUESTS = 'คำขอยืมครุภัณฑ์';
export const TAB_EQUIPMENT = 'ครุภัณฑ์';
export const TAB_STAFF = 'รายชื่อ';
export const GID_EQUIPMENT = '326365193';

// Official Web App URL deployed by PSU Vet Hospital Apps Script
export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwdkkTIlImb3ZlqgnXqwVXZwEpBb_H0VAvWCYx2tQJucTxactjfff0XpZ16o7DXYMNi/exec';

const STORAGE_KEY_WEBHOOK = 'psu_vet_sheets_webhook_url_v1';
const STORAGE_KEY_LAST_SYNC_TIME = 'psu_vet_sheets_last_sync_time_v1';
const STORAGE_KEY_LAST_SYNC_STATUS = 'psu_vet_sheets_last_sync_status_v1';
const STORAGE_KEY_LAST_SYNC_MSG = 'psu_vet_sheets_last_sync_msg_v1';

export function getStoredWebhookUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_WEBHOOK);
    if (saved && saved.trim()) return saved.trim();
    return DEFAULT_WEBHOOK_URL;
  } catch {
    return DEFAULT_WEBHOOK_URL;
  }
}

export function saveStoredWebhookUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
  } catch (err) {
    console.error('Error saving webhook URL', err);
  }
}

export function getLastSyncInfo(): { time: string; status: 'success' | 'error' | 'idle' | 'syncing'; message: string } {
  try {
    const time = localStorage.getItem(STORAGE_KEY_LAST_SYNC_TIME) || '';
    const status = (localStorage.getItem(STORAGE_KEY_LAST_SYNC_STATUS) as any) || 'idle';
    const message = localStorage.getItem(STORAGE_KEY_LAST_SYNC_MSG) || '';
    return { time, status, message };
  } catch {
    return { time: '', status: 'idle', message: '' };
  }
}

export function saveLastSyncInfo(status: 'success' | 'error' | 'idle' | 'syncing', message: string): void {
  try {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, now);
    localStorage.setItem(STORAGE_KEY_LAST_SYNC_STATUS, status);
    localStorage.setItem(STORAGE_KEY_LAST_SYNC_MSG, message);
  } catch (err) {
    console.error('Error saving last sync info', err);
  }
}

/**
 * Converts equipment master list to Google Sheets CSV matching tab 'ครุภัณฑ์'
 * Columns: รหัสครุภัณฑ์, วันที่ตรวจรับ, ชื่อ, ยี่ห้อ, รุ่น, สถานที่ติดตั้ง, Serial number, ราคา
 */
export function convertEquipmentToCSV(equipment: EquipmentMaster[]): string {
  const headers = [
    'รหัสครุภัณฑ์',
    'วันที่ตรวจรับ',
    'ชื่อ',
    'ยี่ห้อ',
    'รุ่น',
    'สถานที่ติดตั้ง',
    'Serial number',
    'ราคา'
  ];

  const rows = equipment.map(item => [
    `"${(item.code || '').replace(/"/g, '""')}"`,
    `"${(item.receivedDate || '').replace(/"/g, '""')}"`,
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${(item.brand || '').replace(/"/g, '""')}"`,
    `"${(item.model || '').replace(/"/g, '""')}"`,
    `"${(item.location || '').replace(/"/g, '""')}"`,
    `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
    `"${item.price !== undefined ? item.price : ''}"`
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Sends all borrow requests to Google Sheet via Google Apps Script Webhook
 */
export async function syncRequestsToGoogleSheet(
  requests: BorrowRequest[],
  overrideWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = overrideWebhookUrl || getStoredWebhookUrl();
  if (!url) {
    // When no webhook is configured yet, we still record that data is safely saved in local storage
    saveLastSyncInfo('idle', `บันทึกข้อมูลในระบบแล้ว (${requests.length} คำขอ) — ใส่ Webhook URL เพื่อซิงค์เข้า Google Sheets อัตโนมัติ`);
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Apps Script (ดูวิธีตั้งค่าได้ในหน้าต่างการเชื่อมต่อ)'
    };
  }

  try {
    saveLastSyncInfo('syncing', 'กำลังส่งข้อมูลไปยัง Google Sheets...');

    const payload = {
      action: 'sync_requests',
      spreadsheetId: SPREADSHEET_ID,
      sheetName: TAB_REQUESTS,
      timestamp: new Date().toISOString(),
      requests: requests.map(r => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        requesterName: r.requesterName,
        requesterPosition: r.requesterPosition,
        requesterDept: r.requesterDept,
        requesterEmail: r.requesterEmail,
        purpose: r.purpose,
        borrowFrom: r.borrowFrom,
        borrowFromTime: r.borrowFromTime || '',
        borrowTo: r.borrowTo,
        borrowToTime: r.borrowToTime || '',
        equipmentList: r.equipmentList || []
      }))
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Text plain prevents preflight CORS issues in Apps Script
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const text = await res.text();
    let resJson: any = {};
    try {
      resJson = JSON.parse(text);
    } catch {
      resJson = { status: 'success', message: text };
    }

    const msg = `ซิงค์คำขอยืม ${requests.length} รายการ ไปยังแท็บ "${TAB_REQUESTS}" เรียบร้อยแล้ว`;
    saveLastSyncInfo('success', msg);
    return { success: true, message: msg };
  } catch (err: any) {
    const errorMsg = `เกิดข้อผิดพลาดในการซิงค์ไปยัง Google Sheets: ${err?.message || err}`;
    saveLastSyncInfo('error', errorMsg);
    return { success: false, message: errorMsg };
  }
}

/**
 * Sends a single borrow request to Google Sheet (Upsert) & triggers real-time email notifications
 */
export async function syncSingleRequestToGoogleSheet(
  request: BorrowRequest,
  overrideWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = overrideWebhookUrl || getStoredWebhookUrl();
  if (!url) {
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Apps Script'
    };
  }

  try {
    const payload = {
      action: 'upsert_request',
      spreadsheetId: SPREADSHEET_ID,
      sheetName: TAB_REQUESTS,
      timestamp: new Date().toISOString(),
      request: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        requesterName: request.requesterName,
        requesterPosition: request.requesterPosition,
        requesterDept: request.requesterDept,
        requesterEmail: request.requesterEmail,
        purpose: request.purpose,
        borrowFrom: request.borrowFrom,
        borrowFromTime: request.borrowFromTime || '',
        borrowTo: request.borrowTo,
        borrowToTime: request.borrowToTime || '',
        equipmentList: request.equipmentList || []
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const text = await res.text();
    let resJson: any = {};
    try {
      resJson = JSON.parse(text);
    } catch {
      resJson = { status: 'success', message: text };
    }

    const msg = `บันทึกคำขอ ${request.id} (${request.status}) ลงใน Google Sheet และส่งแจ้งเตือนเรียบร้อยแล้ว`;
    saveLastSyncInfo('success', msg);
    return { success: true, message: msg };
  } catch (err: any) {
    console.warn('Error syncing single request to Google Sheets', err);
    return { success: false, message: err?.message || String(err) };
  }
}

/**
 * Sends all equipment items to Google Sheet via Google Apps Script Webhook
 */
export async function syncEquipmentToGoogleSheet(
  equipment: EquipmentMaster[],
  overrideWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = overrideWebhookUrl || getStoredWebhookUrl();
  if (!url) {
    saveLastSyncInfo('idle', `บันทึกครุภัณฑ์ ${equipment.length} รายการในระบบแล้ว`);
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Apps Script'
    };
  }

  try {
    saveLastSyncInfo('syncing', 'กำลังส่งข้อมูลครุภัณฑ์ไปยัง Google Sheets...');

    const payload = {
      action: 'sync_equipment',
      spreadsheetId: SPREADSHEET_ID,
      sheetName: TAB_EQUIPMENT,
      timestamp: new Date().toISOString(),
      equipment: equipment.map(eq => ({
        code: eq.code,
        receivedDate: eq.receivedDate || '',
        name: eq.name,
        brand: eq.brand || '',
        model: eq.model || '',
        location: eq.location || '',
        serialNumber: eq.serialNumber || '',
        price: eq.price || ''
      }))
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const msg = `ซิงค์ครุภัณฑ์ ${equipment.length} รายการ ไปยังแท็บ "${TAB_EQUIPMENT}" เรียบร้อยแล้ว`;
    saveLastSyncInfo('success', msg);
    return { success: true, message: msg };
  } catch (err: any) {
    const errorMsg = `เกิดข้อผิดพลาดในการซิงค์ครุภัณฑ์ไปยัง Google Sheets: ${err?.message || err}`;
    saveLastSyncInfo('error', errorMsg);
    return { success: false, message: errorMsg };
  }
}

/**
 * Appends a new equipment item directly to the bottom row of Google Sheets tab 'ครุภัณฑ์'
 * Does NOT overwrite existing items and guarantees new items are added at the bottom, not the top.
 */
export async function appendEquipmentToGoogleSheet(
  item: EquipmentMaster,
  overrideWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = overrideWebhookUrl || getStoredWebhookUrl();
  if (!url) {
    saveLastSyncInfo('idle', `บันทึกครุภัณฑ์ "${item.name}" ในระบบแล้ว`);
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Apps Script'
    };
  }

  try {
    const payload = {
      action: 'append_equipment',
      spreadsheetId: SPREADSHEET_ID,
      sheetName: TAB_EQUIPMENT,
      timestamp: new Date().toISOString(),
      equipment: {
        code: item.code,
        receivedDate: item.receivedDate || '',
        name: item.name,
        brand: item.brand || '',
        model: item.model || '',
        location: item.location || '',
        serialNumber: item.serialNumber || '',
        price: item.price !== undefined ? item.price : '',
        responsible: item.responsible || '',
        responsibleEmail: item.responsibleEmail || ''
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const msg = `เพิ่มครุภัณฑ์ "${item.name}" (${item.code}) ต่อท้ายฐานข้อมูล Google Sheets เรียบร้อยแล้ว`;
    saveLastSyncInfo('success', msg);
    return { success: true, message: msg };
  } catch (err: any) {
    console.warn('Error appending equipment to Google Sheet', err);
    return { success: false, message: err?.message || String(err) };
  }
}

/**
 * Complete Google Apps Script code to paste into Extensions > Apps Script in Google Sheets
 */
export function getAppsScriptCode(): string {
  return `/**
 * ==============================================================================
 * Google Apps Script Web App สำหรับระบบยืม-คืน ครุภัณฑ์ รพ.สัตว์ ม.อ.
 * ฐานข้อมูล: ฐานข้อมูลยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ.
 * Spreadsheet ID: ${SPREADSHEET_ID}
 * ==============================================================================
 * วิธีติดตั้ง (ทำเพียงครั้งเดียว ภายใน 1 นาที):
 * 1. ใน Google Sheet ให้ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 2. ลบโค้ดเดิมทั้งหมดออก แล้วนำโค้ดนี้ทั้งหมดไปวางแทนที่
 * 3. กดบันทึก (ไอคอนแผ่นดิสก์)
 * 4. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 5. คลิกที่รูปฟันเฟือง เลือกประเภทเป็น "เว็บแอป" (Web App)
 *    - คำอธิบาย: Webhook ระบบยืมคืนครุภัณฑ์
 *    - ดำเนินการในฐานะ: บัญชีของฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone) **(สำคัญที่สุด: ต้องเลือก "ทุกคน" เพื่อไม่ให้ระบบแจ้งเตือน 404)**
 * 6. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) และให้สิทธิ์การเข้าถึง (Authorize access)
 * 7. คัดลอก "URL ของเว็บแอป" (Web App URL) นำมาใส่ในหน้าระบบยืมคืนได้ทันที!
 * ==============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // -------------------------------------------------------------
    // 1. ซิงค์ข้อมูลคำขอยืมครุภัณฑ์ (แท็บ "คำขอยืมครุภัณฑ์")
    // -------------------------------------------------------------
    if (data.action === "sync_requests" && data.requests) {
      var sheetName = data.sheetName || "คำขอยืมครุภัณฑ์";
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // ล้างข้อมูลเดิมและเขียนหัวตาราง
      sheet.clearContents();
      var headers = [
        "id",
        "status",
        "createdAt",
        "updatedAt",
        "requesterName",
        "requesterPosition",
        "requesterDept",
        "requesterEmail",
        "purpose",
        "borrowFrom",
        "borrowFromTime",
        "borrowTo",
        "borrowToTime",
        "equipmentJSON"
      ];
      sheet.appendRow(headers);

      // เขียนข้อมูลแต่ละแถว
      if (data.requests.length > 0) {
        var rows = data.requests.map(function(r) {
          return [
            r.id || "",
            r.status || "",
            r.createdAt || "",
            r.updatedAt || "",
            r.requesterName || "",
            r.requesterPosition || "",
            r.requesterDept || "",
            r.requesterEmail || "",
            r.purpose || "",
            r.borrowFrom || "",
            r.borrowFromTime || "",
            r.borrowTo || "",
            r.borrowToTime || "",
            JSON.stringify(r.equipmentList || [])
          ];
        });

        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }

      // จัดฟอร์แมตหัวตาราง
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#1e293b")
        .setFontColor("#ffffff");

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "บันทึกคำขอยืมลง Google Sheet เรียบร้อยแล้ว จำนวน " + data.requests.length + " รายการ",
        count: data.requests.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -------------------------------------------------------------
    // 2. ซิงค์ข้อมูลครุภัณฑ์และอุปกรณ์ (แท็บ "ครุภัณฑ์")
    // -------------------------------------------------------------
    if (data.action === "sync_equipment" && data.equipment) {
      var sheetName = data.sheetName || "ครุภัณฑ์";
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      sheet.clearContents();
      var headers = [
        "รหัสครุภัณฑ์",
        "วันที่ตรวจรับ",
        "ชื่อ",
        "ยี่ห้อ",
        "รุ่น",
        "สถานที่ติดตั้ง",
        "Serial number",
        "ราคา"
      ];
      sheet.appendRow(headers);

      if (data.equipment.length > 0) {
        var rows = data.equipment.map(function(eq) {
          return [
            eq.code || "",
            eq.receivedDate || "",
            eq.name || "",
            eq.brand || "",
            eq.model || "",
            eq.location || "",
            eq.serialNumber || "",
            eq.price !== undefined ? eq.price : ""
          ];
        });

        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }

      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#15803d")
        .setFontColor("#ffffff");

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "บันทึกข้อมูลครุภัณฑ์ลง Google Sheet เรียบร้อยแล้ว จำนวน " + data.equipment.length + " รายการ",
        count: data.equipment.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -------------------------------------------------------------
    // 3. เพิ่ม/อัปเดตคำขอรายเดียว (Upsert Single Request)
    // -------------------------------------------------------------
    if (data.action === "upsert_request" && data.request) {
      var sheetName = data.sheetName || "คำขอยืมครุภัณฑ์";
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        var headers = [
          "id", "status", "createdAt", "updatedAt", "requesterName",
          "requesterPosition", "requesterDept", "requesterEmail", "purpose",
          "borrowFrom", "borrowFromTime", "borrowTo", "borrowToTime", "equipmentJSON"
        ];
        sheet.appendRow(headers);
      }

      var r = data.request;
      var lastRow = sheet.getLastRow();
      var foundRow = -1;

      if (lastRow > 1) {
        var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < idValues.length; i++) {
          if (idValues[i][0] === r.id) {
            foundRow = i + 2;
            break;
          }
        }
      }

      var rowData = [
        r.id || "",
        r.status || "",
        r.createdAt || "",
        r.updatedAt || "",
        r.requesterName || "",
        r.requesterPosition || "",
        r.requesterDept || "",
        r.requesterEmail || "",
        r.purpose || "",
        r.borrowFrom || "",
        r.borrowFromTime || "",
        r.borrowTo || "",
        r.borrowToTime || "",
        JSON.stringify(r.equipmentList || [])
      ];

      if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }

      // ส่งอีเมลแจ้งเตือนอัตโนมัติตามสถานะ (ถ้ามีอีเมลระบุ)
      sendNotificationEmail(r);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "อัปเดตคำขอ " + r.id + " ลงในชีตและส่งแจ้งเตือนเรียบร้อย",
        row: foundRow > 0 ? foundRow : lastRow + 1
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -------------------------------------------------------------
    // 4. เพิ่มครุภัณฑ์ใหม่ต่อท้ายแถวล่างสุดเสมอ (Append Equipment to Bottom)
    // -------------------------------------------------------------
    if (data.action === "append_equipment" && data.equipment) {
      var sheetName = data.sheetName || "ครุภัณฑ์";
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        var headers = [
          "รหัสครุภัณฑ์",
          "วันที่ตรวจรับ",
          "ชื่อ",
          "ยี่ห้อ",
          "รุ่น",
          "สถานที่ติดตั้ง",
          "Serial number",
          "ราคา"
        ];
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length)
          .setFontWeight("bold")
          .setBackground("#15803d")
          .setFontColor("#ffffff");
      }

      var eq = data.equipment;
      var newRow = [
        eq.code || "",
        eq.receivedDate || "",
        eq.name || "",
        eq.brand || "",
        eq.model || "",
        eq.location || "",
        eq.serialNumber || "",
        eq.price !== undefined ? eq.price : ""
      ];
      if (eq.responsible) {
        newRow.push(eq.responsible);
      }

      sheet.appendRow(newRow); // ต่อท้ายแถวล่างสุดเสมอ ไม่ไปแทรกแถวบนสุด!

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "เพิ่มครุภัณฑ์ " + eq.code + " (" + eq.name + ") ต่อท้ายแถวล่างสุดของชีตเรียบร้อยแล้ว",
        row: sheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "ไม่พบคำสั่ง action ที่ระบุ: " + data.action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * ฟังก์ชันส่งอีเมลแจ้งเตือนอัตโนมัติ (Google MailApp / PSU Email)
 * ทำงานผ่านสิทธิ์ของบัญชีผู้ Deploy (ไม่เสียค่าบริการและส่งตรงถึง @psu.ac.th ได้ทันที)
 */
function sendNotificationEmail(r) {
  try {
    if (!r) return;
    var reqId = r.id || "";
    var reqName = r.requesterName || "ผู้ใช้บริการ";
    var reqDept = r.requesterDept || "";
    var reqEmail = r.requesterEmail || "";
    var purpose = r.purpose || "เพื่อการปฏิบัติงาน/การเรียนการสอน";
    var dateRange = (r.borrowFrom || "") + " ถึง " + (r.borrowTo || "");
    
    var eqItems = r.equipmentList || [];
    var eqSummaryLines = [];
    var ownerEmails = {};

    for (var i = 0; i < eqItems.length; i++) {
      var item = eqItems[i];
      eqSummaryLines.push("  - " + (item.code || "") + " : " + (item.name || "") + " (ผู้รับผิดชอบ: " + (item.responsible || "-") + " | " + (item.responsibleEmail || "-") + ")");
      if (item.responsibleEmail && item.responsibleEmail.indexOf("@") > -1) {
        var em = item.responsibleEmail.trim();
        ownerEmails[em] = item.responsible || "อาจารย์/เจ้าหน้าที่ผู้ดูแลครุภัณฑ์";
      }
    }
    var eqListText = eqSummaryLines.join("\\n");

    // 1. กรณี: ยื่นคำขอใหม่ -> แจ้งเตือนเจ้าของครุภัณฑ์แต่ละท่าน
    if (r.status === "ยื่นขออนุมัติ") {
      for (var email in ownerEmails) {
        var ownerName = ownerEmails[email];
        var subject = "[ระบบยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ.] แจ้งเตือนคำขอยืมครุภัณฑ์ใหม่ (" + reqId + ")";
        var body = "เรียน " + ownerName + ",\\n\\n" +
          "มีบุคลากรยื่นคำขอยืมครุภัณฑ์ในความดูแลของท่าน ผ่านระบบยืม-คืนครุภัณฑ์ โรงพยาบาลสัตว์ ม.อ. โดยมีรายละเอียดดังนี้:\\n\\n" +
          "• รหัสคำขอ: " + reqId + "\\n" +
          "• ผู้ขอยืม: " + reqName + " (" + reqDept + ")\\n" +
          "• วันที่ประสงค์จะยืม: " + dateRange + "\\n" +
          "• วัตถุประสงค์: " + purpose + "\\n\\n" +
          "รายการครุภัณฑ์ที่ขอยืม:\\n" + eqListText + "\\n\\n" +
          "โปรดเข้าสู่ระบบยืม-คืนครุภัณฑ์ เพื่อตรวจสอบสภาพและกด 'ยินยอมให้ยืม' หรือ 'ไม่อนุมัติ':\\n" +
          "ระบบยืม-คืนครุภัณฑ์ โรงพยาบาลสัตว์ ม.อ. คณะสัตวแพทยศาสตร์\\n\\n" +
          "--------------------------------------------------\\n" +
          "อีเมลอัตโนมัติจากระบบฐานข้อมูลยืม-คืนครุภัณฑ์ โรงพยาบาลสัตว์ ม.อ.";

        MailApp.sendEmail({
          to: email,
          replyTo: reqEmail ? reqEmail : undefined,
          subject: subject,
          body: body
        });
      }
    }

    // 2. กรณี: เจ้าของกดยินยอมแล้ว -> แจ้งเตือนผู้บริหาร (ดร.สพ.ญ.ญาดา ดวงนำสว่าง)
    else if (r.status === "รอผู้บริหารอนุมัติ") {
      var execEmail = "yada.d@psu.ac.th";
      var subject = "[ระบบยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ.] รอผู้บริหารอนุมัติคำขอยืม (" + reqId + ")";
      var body = "เรียน ดร.สพ.ญ.ญาดา ดวงนำสว่าง (รองผู้อำนวยการ รพ.สัตว์ ม.อ.),\\n\\n" +
        "คำขอยืมครุภัณฑ์เลขที่ " + reqId + " ได้รับการยินยอมจากเจ้าของครุภัณฑ์เรียบร้อยแล้ว ขณะนี้รอการอนุมัติขั้นสุดท้ายจากท่าน:\\n\\n" +
        "• ผู้ขอยืม: " + reqName + " (" + reqDept + ")\\n" +
        "• กำหนดวันยืม: " + dateRange + "\\n" +
        "• วัตถุประสงค์: " + purpose + "\\n\\n" +
        "รายการครุภัณฑ์:\\n" + eqListText + "\\n\\n" +
        "--------------------------------------------------\\n" +
        "ระบบยืม-คืนครุภัณฑ์ โรงพยาบาลสัตว์ ม.อ.";

      MailApp.sendEmail({
        to: execEmail,
        subject: subject,
        body: body
      });
    }

    // 3. กรณี: อนุมัติแล้ว -> แจ้งยืนยันแก่ผู้ขอยืม
    else if (r.status === "เจ้าของให้ยืมแล้ว" || r.status === "กำลังยืมใช้งาน") {
      if (reqEmail && reqEmail.indexOf("@") > -1) {
        var subject = "[ระบบยืม-คืนครุภัณฑ์ รพ.สัตว์ ม.อ.] คำขอยืม (" + reqId + ") ได้รับการอนุมัติแล้ว";
        var body = "เรียน " + reqName + ",\\n\\n" +
          "คำขอยืมครุภัณฑ์เลขที่ " + reqId + " ของท่านได้รับการอนุมัติเรียบร้อยแล้ว\\n\\n" +
          "• กำหนดวันยืม: " + dateRange + "\\n" +
          "• วัตถุประสงค์: " + purpose + "\\n\\n" +
          "รายการครุภัณฑ์:\\n" + eqListText + "\\n\\n" +
          "ท่านสามารถติดต่อรับครุภัณฑ์ได้ตามกำหนดเวลา และพิมพ์ใบยืม-คืน (แบบฟอร์ม ม.อ.) จากระบบได้\\n\\n" +
          "โรงพยาบาลสัตว์ ม.อ. คณะสัตวแพทยศาสตร์";

        MailApp.sendEmail({
          to: reqEmail,
          subject: subject,
          body: body
        });
      }
    }
  } catch (err) {
    Logger.log("Email error: " + err);
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "status";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ดึงข้อมูลครุภัณฑ์จากชีต "ครุภัณฑ์"
  if (action === "get_equipment") {
    var sheet = ss.getSheetByName("ครุภัณฑ์");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "ไม่พบแท็บ ครุภัณฑ์"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var values = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rows: values
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ดึงรายชื่อบุคลากรจริงจากชีต "รายชื่อ"
  if (action === "get_staff" || action === "get_personnel") {
    var sheet = ss.getSheetByName("รายชื่อ");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "ไม่พบแท็บ รายชื่อ"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var values = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rows: values
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ดึงรายการคำขอยืมครุภัณฑ์จากชีต "คำขอยืมครุภัณฑ์"
  if (action === "get_requests" || action === "get_borrow_requests") {
    var sheet = ss.getSheetByName("คำขอยืมครุภัณฑ์");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "ไม่พบแท็บ คำขอยืมครุภัณฑ์"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var values = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rows: values
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "PSU Vet Hospital Google Sheets API is running",
    spreadsheetId: "${SPREADSHEET_ID}",
    currentTime: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}

/**
 * Parse 2D rows from Google Sheets tab 'ครุภัณฑ์' into EquipmentMaster array
 */
export function parseEquipmentRows(rows: any[][]): EquipmentMaster[] {
  if (!rows || rows.length < 2) return [];
  const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());

  const findCol = (keywords: string[], fallbackIdx: number) => {
    const idx = headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    return idx !== -1 ? idx : fallbackIdx;
  };

  const colCode = findCol(['รหัสครุภัณฑ์', 'รหัส', 'code', 'asset'], 0);
  const colDate = findCol(['วันที่ตรวจรับ', 'วันที่รับ', 'ตรวจรับ', 'date'], 1);
  const colName = findCol(['ชื่อ', 'รายการ', 'name', 'item'], 2);
  const colBrand = findCol(['ยี่ห้อ', 'brand'], 3);
  const colModel = findCol(['รุ่น', 'model'], 4);
  const colLocation = findCol(['สถานที่', 'ห้อง', 'location'], 5);
  const colSerial = findCol(['serial', 's/n', 'ซีเรียล'], 6);
  const colPrice = findCol(['ราคา', 'price'], 7);
  const colResp = findCol(['ผู้รับผิดชอบ', 'เจ้าของ', 'responsible', 'owner'], 8);
  const colRespEmail = findCol(['อีเมล', 'email'], 9);
  const colCategory = findCol(['หมวด', 'ประเภท', 'category'], -1);

  const items: EquipmentMaster[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const code = String(row[colCode] || '').trim();
    const name = String(row[colName] || '').trim();
    if (!code && !name) continue;

    const catRaw = colCategory >= 0 ? String(row[colCategory] || '').trim() : '';
    let category: EquipmentMaster['category'] = 'อื่นๆ';
    if (catRaw.includes('วินิจฉัย') || catRaw.includes('เอ็กซเรย์') || name.includes('X-Ray') || name.includes('Ultrasound') || name.includes('เอ็กซเรย์')) {
      category = 'เครื่องมือวินิจฉัย/เอ็กซเรย์';
    } else if (catRaw.includes('ผ่าตัด') || catRaw.includes('ศัลยกรรม') || name.includes('ผ่าตัด') || name.includes('ดมยา')) {
      category = 'เครื่องมือผ่าตัด/ศัลยกรรม';
    } else if (catRaw.includes('ตรวจ') || catRaw.includes('เฝ้าระวัง') || name.includes('Monitor') || name.includes('วัด') || name.includes('ตรวจ')) {
      category = 'เครื่องมือตรวจและเฝ้าระวัง';
    } else if (catRaw.includes('กายภาพ') || catRaw.includes('ฟื้นฟู') || name.includes('เลเซอร์') || name.includes('ธารา')) {
      category = 'อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู';
    }

    items.push({
      id: code || `EQ-${i}`,
      code: code || `ITEM-${i}`,
      name: name || code,
      category,
      receivedDate: String(row[colDate] || '').trim(),
      brand: String(row[colBrand] || '').trim(),
      model: String(row[colModel] || '').trim(),
      location: String(row[colLocation] || '').trim() || 'รพ.สัตว์ ม.อ.',
      serialNumber: String(row[colSerial] || '').trim(),
      price: row[colPrice] !== undefined && row[colPrice] !== '' ? (isNaN(Number(row[colPrice])) ? String(row[colPrice]) : Number(row[colPrice])) : '',
      responsible: String(row[colResp] || '').trim() || 'รพ.สัตว์ ม.อ.',
      responsibleEmail: String(row[colRespEmail] || '').trim(),
      status: 'พร้อมใช้งาน',
      condition: 'ปกติสมบูรณ์'
    });
  }
  return items;
}

/**
 * Extract Thai title, first name, last name from a combined full string
 * e.g. "นางสาวเสาวคนธ์ อินทร์ด้วง" -> title: "นางสาว", firstName: "เสาวคนธ์", lastName: "อินทร์ด้วง"
 * e.g. "สพ.ญ.ณัฏฐนิช  เหมทานนท์" -> title: "สพ.ญ.", firstName: "ณัฏฐนิช", lastName: "เหมทานนท์"
 * e.g. "น.สพ.ทักษ์ สุวรรณโอภาส" -> title: "น.สพ.", firstName: "ทักษ์", lastName: "สุวรรณโอภาส"
 */
export function extractThaiTitleAndName(rawString: string): {
  title: string;
  firstName: string;
  lastName: string;
  pureName: string;
  displayName: string;
} {
  const trimmed = (rawString || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { title: '', firstName: '', lastName: '', pureName: '', displayName: '' };
  }

  // Ordered from longest to shortest prefix to prevent greedy partial match
  const KNOWN_TITLES = [
    'ศ.ดร.', 'รศ.ดร.', 'ผศ.ดร.', 'สพ.ญ.ดร.', 'น.สพ.ดร.',
    'สพ.ญ.', 'สพ.ญ', 'น.สพ.', 'น.สพ', 'นางสาว',
    'นาย', 'นาง', 'ผศ.', 'รศ.', 'ศ.', 'ดร.', 'อ.',
    'นพ.', 'พญ.', 'ทพ.', 'ทพญ.', 'น.ส.'
  ];

  let detectedTitle = '';
  let remainder = trimmed;

  for (const t of KNOWN_TITLES) {
    if (remainder.startsWith(t)) {
      detectedTitle = t;
      remainder = remainder.substring(t.length).trim();
      break;
    }
  }

  const parts = remainder.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const pureName = lastName ? `${firstName} ${lastName}` : firstName;
  const displayName = detectedTitle ? `${detectedTitle} ${pureName}` : pureName;

  return {
    title: detectedTitle,
    firstName,
    lastName,
    pureName,
    displayName
  };
}

/**
 * Parse 2D rows from Google Sheets tab 'รายชื่อ' into StaffUser array
 */
export function parseStaffRows(rows: any[][]): StaffUser[] {
  if (!rows || rows.length < 2) return [];
  const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());

  const findCol = (keywords: string[]) => {
    return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const colTitle = findCol(['คำนำหน้า', 'title', 'คำนำหน้านาม']);
  const colFullName = findCol(['ชื่อ-สกุล', 'ชื่อ - สกุล', 'ชื่อ สกุล', 'ชื่อและนามสกุล', 'fullname']);
  const colFirstName = findCol(['ชื่อจริง', 'ชื่อ', 'first_name', 'firstname']);
  const colLastName = findCol(['นามสกุล', 'last_name', 'lastname']);
  const colEmail = findCol(['อีเมล', 'อีเมล์', 'email', 'e-mail', 'mail']);
  const colPosition = findCol(['ตำแหน่ง', 'position']);
  const colDept = findCol(['หน่วยงาน', 'สังกัด', 'คณะ', 'ฝ่าย', 'dept', 'faculty']);
  const colRole = findCol(['สิทธิ์', 'บทบาท', 'สถานะ', 'role']);
  const colPhone = findCol(['โทร', 'เบอร์', 'phone', 'tel']);
  const colUsername = findCol(['username', 'ชื่อผู้ใช้', 'account']);

  const staffList: StaffUser[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let titleRaw = colTitle !== -1 ? String(row[colTitle] || '').trim() : '';
    let firstRaw = colFirstName !== -1 ? String(row[colFirstName] || '').trim() : '';
    let lastRaw = colLastName !== -1 ? String(row[colLastName] || '').trim() : '';
    const fullRaw = colFullName !== -1 ? String(row[colFullName] || '').trim() : '';

    const combinedName = fullRaw || (colLastName === -1 ? firstRaw : '');
    if (combinedName && (!lastRaw || colLastName === -1)) {
      const parsed = extractThaiTitleAndName(combinedName);
      if (!titleRaw && parsed.title) titleRaw = parsed.title;
      firstRaw = parsed.firstName;
      lastRaw = parsed.lastName;
    } else {
      // Prevent duplicate title if first name already starts with title
      if (titleRaw && firstRaw.startsWith(titleRaw)) {
        firstRaw = firstRaw.substring(titleRaw.length).trim();
      }
    }

    const emailRaw = colEmail !== -1 ? String(row[colEmail] || '').trim() : '';
    const posRaw = colPosition !== -1 ? String(row[colPosition] || '').trim() : 'บุคลากร';
    const deptRaw = colDept !== -1 ? String(row[colDept] || '').trim() : 'โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์';
    const phoneRaw = colPhone !== -1 ? String(row[colPhone] || '').trim() : '';
    const roleRaw = colRole !== -1 ? String(row[colRole] || '').trim().toLowerCase() : '';

    if (!firstRaw && !emailRaw) continue;

    let role: 'admin' | 'executive' | 'user' = 'user';
    let roleLabel = 'ผู้ขอยืม (User)';

    const isExplicitAdmin = (
      roleRaw === 'admin' ||
      roleRaw.includes('ผู้ดูแลระบบ') ||
      (roleRaw.includes('แอดมิน') && !roleRaw.includes('ไม่')) ||
      emailRaw.toLowerCase() === 'kittiya.so@psu.ac.th'
    ) && !roleRaw.includes('ดูแลสัตว์');

    const isExplicitExecutive = (
      roleRaw.includes('exec') ||
      roleRaw.includes('ผู้บริหาร') ||
      roleRaw.includes('รอง ผอ') ||
      emailRaw.toLowerCase() === 'yada.d@psu.ac.th'
    );

    if (isExplicitAdmin) {
      role = 'admin';
      roleLabel = 'ผู้ดูแลระบบ (Admin)';
    } else if (isExplicitExecutive) {
      role = 'executive';
      roleLabel = 'ผู้มีอำนาจอนุมัติ (รอง ผอ. รพ.สัตว์)';
    }

    const username = (colUsername !== -1 && row[colUsername]) 
      ? String(row[colUsername]).trim()
      : (emailRaw ? emailRaw.split('@')[0] : `user-${i}`);

    const email = emailRaw ? (emailRaw.includes('@') ? emailRaw : `${emailRaw}@psu.ac.th`) : `${username}@psu.ac.th`;
    const pureName = `${firstRaw} ${lastRaw}`.trim();
    const displayName = formatStaffFullName(titleRaw, pureName);

    staffList.push({
      id: `STAFF-GS-${i}`,
      name: pureName || displayName,
      username,
      preferred_username: username,
      title_th: titleRaw || undefined,
      first_name_th: firstRaw || undefined,
      last_name_th: lastRaw || undefined,
      position_th: posRaw,
      faculty_th: deptRaw,
      display_name_th: displayName,
      email,
      position: posRaw,
      dept: deptRaw,
      role,
      roleLabel,
      phone: phoneRaw,
      authProvider: 'psu_sso',
      permissions: {
        canManageEquipment: role === 'admin' || role === 'executive',
        canManageUsers: role === 'admin',
        canApproveExecutive: role === 'admin' || role === 'executive',
        canReceiveReturn: role === 'admin' || role === 'executive',
      }
    });
  }

  return staffList;
}

/**
 * Parses raw CSV string from tab 'รายชื่อ' into StaffUser array
 */
export function parseStaffCSV(csvText: string): StaffUser[] {
  const lines = csvText.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const rows: string[][] = lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });

  return parseStaffRows(rows);
}

/**
 * Fetches real equipment catalog from Google Sheet (via Webhook or direct CSV)
 */
export async function fetchEquipmentFromGoogleSheets(
  overrideWebhookUrl?: string
): Promise<{ success: boolean; equipment: EquipmentMaster[]; message: string }> {
  const url = (overrideWebhookUrl || getStoredWebhookUrl()).trim();

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const targetUrl = `${url}${sep}action=get_equipment&t=${Date.now()}`;
      const res = await fetch(targetUrl, {
        method: 'GET'
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.rows)) {
        const parsed = parseEquipmentRows(data.rows);
        if (parsed.length > 0) {
          saveLastSyncInfo('success', `ดึงข้อมูลครุภัณฑ์ ${parsed.length} รายการจากชีตสำเร็จ`);
          return { success: true, equipment: parsed, message: `ดึงข้อมูลครุภัณฑ์ ${parsed.length} รายการจากชีตสำเร็จ` };
        }
      } else if (data.status === 'error') {
        throw new Error(data.message || 'Apps Script รายงานข้อผิดพลาด');
      }
    } catch (err: any) {
      console.warn('Failed to fetch equipment via webhook, attempting direct fallback...', err);
    }
  }

  // Fallback: direct Google Sheets CSV export
  try {
    const csvText = await fetchGoogleSheetCSV();
    const parsed = parseEquipmentSheetCSV(csvText);
    if (parsed.length > 0) {
      return { success: true, equipment: parsed, message: `ดึงข้อมูลครุภัณฑ์ ${parsed.length} รายการสำเร็จ (Direct CSV)` };
    }
  } catch (err: any) {
    if (!url) {
      return {
        success: false,
        equipment: [],
        message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Apps Script (เนื่องจากสเปรดชีตอยู่ในโดเมน PSU จึงต้องใช้ Webhook URL ในการเชื่อมต่อ)'
      };
    }
    return {
      success: false,
      equipment: [],
      message: `ไม่สามารถดึงข้อมูลครุภัณฑ์ได้: ${err?.message || err}`
    };
  }

  return { success: false, equipment: [], message: 'ไม่พบรายการครุภัณฑ์ในชีต "ครุภัณฑ์"' };
}

/**
 * Fetches real staff list from Google Sheet tab 'รายชื่อ' (via Webhook or direct CSV)
 */
export async function fetchStaffFromGoogleSheets(
  overrideWebhookUrl?: string
): Promise<{ success: boolean; staff: StaffUser[]; message: string }> {
  const url = (overrideWebhookUrl || getStoredWebhookUrl()).trim();

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const targetUrl = `${url}${sep}action=get_staff&t=${Date.now()}`;
      const res = await fetch(targetUrl, {
        method: 'GET'
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.rows)) {
        const parsed = parseStaffRows(data.rows);
        if (parsed.length > 0) {
          saveLastSyncInfo('success', `ดึงรายชื่อบุคลากรจริง ${parsed.length} ท่านจากชีต "รายชื่อ" สำเร็จ`);
          return { success: true, staff: parsed, message: `ดึงรายชื่อบุคลากรจริง ${parsed.length} ท่านจากชีต "รายชื่อ" สำเร็จ` };
        }
      } else if (data.status === 'error') {
        throw new Error(data.message || 'Apps Script แจ้งเตือน: ไม่พบแท็บ "รายชื่อ"');
      }
    } catch (err: any) {
      console.warn('Failed to fetch staff via webhook...', err);
    }
  }

  // Fallback: direct export if sheet is shared
  try {
    const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB_STAFF)}`;
    const res = await fetch(directUrl);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('<!DOCTYPE html>') && !text.includes('accounts.google.com')) {
        const parsed = parseStaffCSV(text);
        if (parsed.length > 0) {
          return { success: true, staff: parsed, message: `ดึงรายชื่อบุคลากร ${parsed.length} ท่านสำเร็จ (Direct)` };
        }
      }
    }
  } catch {
    // fallback failed
  }

  if (!url) {
    return {
      success: false,
      staff: [],
      message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Apps Script (เนื่องจากชีตอยู่ในโดเมนองค์กร กรุณาบันทึก Webhook URL เพื่อให้อ่านแท็บ "รายชื่อ" ได้)'
    };
  }

  return {
    success: false,
    staff: [],
    message: 'ไม่สามารถดึงข้อมูลจากแท็บ "รายชื่อ" ได้ กรุณาตรวจสอบว่ามีแท็บชื่อ "รายชื่อ" อยู่ใน Google Sheet และบันทึก Webhook แล้ว'
  };
}

/**
 * Parses rows array from Google Sheet tab 'คำขอยืมครุภัณฑ์' into BorrowRequest array
 */
export function parseRequestRows(rows: any[][]): BorrowRequest[] {
  if (!rows || rows.length < 2) return [];

  const requests: BorrowRequest[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const id = String(row[0]).trim();
    if (!id) continue;

    let equipmentList: any[] = [];
    const eqRaw = row[13];
    if (eqRaw) {
      try {
        equipmentList = typeof eqRaw === 'string' ? JSON.parse(eqRaw) : eqRaw;
      } catch (e) {
        console.warn('Could not parse equipment JSON from row', id, e);
      }
    }

    requests.push({
      id,
      status: (row[1] as any) || 'ยื่นขออนุมัติ',
      createdAt: row[2] ? String(row[2]) : new Date().toISOString(),
      updatedAt: row[3] ? String(row[3]) : new Date().toISOString(),
      requesterName: row[4] ? String(row[4]).trim() : '',
      requesterPosition: row[5] ? String(row[5]).trim() : '',
      requesterDept: row[6] ? String(row[6]).trim() : '',
      requesterEmail: row[7] ? String(row[7]).trim() : '',
      purpose: row[8] ? String(row[8]).trim() : '',
      borrowFrom: row[9] ? String(row[9]).trim() : '',
      borrowFromTime: row[10] ? String(row[10]).trim() : '',
      borrowTo: row[11] ? String(row[11]).trim() : '',
      borrowToTime: row[12] ? String(row[12]).trim() : '',
      equipmentList: Array.isArray(equipmentList) ? equipmentList : []
    });
  }

  return requests;
}

/**
 * Fetches real borrow requests from Google Sheet tab 'คำขอยืมครุภัณฑ์' (via Webhook or direct CSV)
 */
export async function fetchRequestsFromGoogleSheets(
  overrideWebhookUrl?: string
): Promise<{ success: boolean; requests: BorrowRequest[]; message: string }> {
  const url = (overrideWebhookUrl || getStoredWebhookUrl()).trim();

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const targetUrl = `${url}${sep}action=get_requests&t=${Date.now()}`;
      const res = await fetch(targetUrl, {
        method: 'GET'
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.rows)) {
        const parsed = parseRequestRows(data.rows);
        if (parsed.length > 0) {
          saveLastSyncInfo('success', `ดึงรายการคำขอยืม ${parsed.length} รายการจากชีต "คำขอยืมครุภัณฑ์" สำเร็จ`);
          return { success: true, requests: parsed, message: `ดึงรายการคำขอยืม ${parsed.length} รายการจากชีตสำเร็จ` };
        }
      } else if (data.status === 'error') {
        throw new Error(data.message || 'Apps Script แจ้งเตือน: ไม่พบแท็บ "คำขอยืมครุภัณฑ์"');
      }
    } catch (err: any) {
      console.warn('Failed to fetch requests via webhook, checking direct fallback...', err);
    }
  }

  // Direct CSV fallback
  try {
    const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB_REQUESTS)}`;
    const res = await fetch(directUrl);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('<!DOCTYPE html>') && !text.includes('accounts.google.com')) {
        const parsed = parseRequestsCSV(text);
        if (parsed.length > 0) {
          return { success: true, requests: parsed, message: `ดึงรายการคำขอยืม ${parsed.length} รายการสำเร็จ (Direct)` };
        }
      }
    }
  } catch {
    // fallback failed
  }

  return {
    success: false,
    requests: [],
    message: 'ยังไม่สามารถดึงข้อมูลรายการคำขอยืมจากชีตได้'
  };
}

/**
 * Tests Webhook connection and verifies Apps Script Web App responds correctly
 */
export async function testWebhookConnection(
  overrideWebhookUrl?: string
): Promise<{ success: boolean; status: string; message: string; details?: any }> {
  const url = (overrideWebhookUrl || getStoredWebhookUrl()).trim();
  if (!url) {
    return {
      success: false,
      status: 'no_url',
      message: 'ยังไม่ได้ระบุ Webhook URL กรุณากรอก Web App URL ที่ได้จาก Apps Script'
    };
  }

  if (url.includes('/edit') || url.includes('/home/projects/')) {
    return {
      success: false,
      status: 'invalid_url_type',
      message: '⚠️ URL ที่ระบุเป็นหน้าแก้ไขโค้ด Apps Script (/edit) ไม่ใช่ Web App URL กรุณากดปุ่ม Deploy > New deployment > Web App และคัดลอก URL ที่ลงท้ายด้วย /exec'
    };
  }

  try {
    const sep = url.includes('?') ? '&' : '?';
    const testUrl = `${url}${sep}action=status&t=${Date.now()}`;
    const res = await fetch(testUrl, {
      method: 'GET'
    });

    if (res.status === 404) {
      return {
        success: false,
        status: '404_not_found',
        message: 'Google แจ้งเตือน 404 Not Found: URL ไม่ถูกต้อง หรือยังไม่ได้ทำการ Deploy เป็น "เว็บแอป" (Web App) โดยเลือก Who has access: Anyone'
      };
    }

    if (!res.ok) {
      return {
        success: false,
        status: `http_${res.status}`,
        message: `เชื่อมต่อไม่สำเร็จ HTTP Error ${res.status}`
      };
    }

    const data = await res.json();
    return {
      success: true,
      status: 'ok',
      message: 'การเชื่อมต่อสำเร็จ! Webhook ออนไลน์และพร้อมรับส่งข้อมูลสองทิศทางกับ Google Sheets อัตโนมัติ',
      details: data
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'network_error',
      message: `ไม่สามารถเชื่อมต่อได้: ${err?.message || err} (กรุณาตรวจสอบว่าเลือก Who has access: Anyone ในการ Deploy)`
    };
  }
}
