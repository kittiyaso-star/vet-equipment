import { BorrowRequest, EquipmentMaster } from '../types';
import { convertRequestsToCSV, parseRequestsCSV } from './storage';

export const SPREADSHEET_ID = '1jGol5v7T8hyZO8dBNo8i-MaoCnW_b7WSsGn2P63MYts';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=326365193#gid=326365193`;
export const TAB_REQUESTS = 'คำขอยืมครุภัณฑ์';
export const TAB_EQUIPMENT = 'ครุภัณฑ์';
export const TAB_STAFF = 'รายชื่อ';
export const GID_EQUIPMENT = '326365193';

const STORAGE_KEY_WEBHOOK = 'psu_vet_sheets_webhook_url_v1';
const STORAGE_KEY_LAST_SYNC_TIME = 'psu_vet_sheets_last_sync_time_v1';
const STORAGE_KEY_LAST_SYNC_STATUS = 'psu_vet_sheets_last_sync_status_v1';
const STORAGE_KEY_LAST_SYNC_MSG = 'psu_vet_sheets_last_sync_msg_v1';

export function getStoredWebhookUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_WEBHOOK) || '';
  } catch {
    return '';
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
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone) หรือ ทุกคนใน psu.ac.th
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
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "PSU Vet Hospital Google Sheets API is running",
    spreadsheetId: "${SPREADSHEET_ID}",
    currentTime: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}
