export interface BorrowedEquipmentItem {
  id?: number | string;
  code: string;
  name: string;
  location: string;
  responsible: string;
  responsibleEmail: string;
  condBefore?: string;
  condAfter?: string;
  ownerStatus?: 'รอเจ้าของตกลง' | 'ยินยอม' | 'ไม่อนุมัติ' | string;
  ownerCondition?: string;
  ownerNote?: string;
  ownerApprovedAt?: string;
  ownerApprovedBy?: string;
  returnInspector?: string; // เจ้าหน้าที่ผู้ตรวจรับคืนของรายการนี้ (ปกติคือเจ้าของครุภัณฑ์)
  returnNote?: string;
}

export type BorrowRequestStatus = 
  | 'ยื่นขออนุมัติ' 
  | 'รอผู้บริหารอนุมัติ'
  | 'เจ้าของให้ยืมแล้ว' 
  | 'กำลังยืมใช้งาน'
  | 'คืนครุภัณฑ์แล้ว' 
  | 'รับคืนเรียบร้อย' 
  | 'เสร็จสิ้น'
  | 'ยกเลิกคำขอ';

export interface BorrowRequest {
  id: string; // e.g. REQ-6ZDL4E
  status: BorrowRequestStatus;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  requesterName: string;
  requesterPosition: string;
  requesterDept: string;
  requesterEmail: string;
  // PSU OIDC Claim Fields
  requesterUsername?: string; // username / preferred_username
  requesterTitleTh?: string; // คำนำหน้านามภาษาไทย
  requesterFirstNameTh?: string; // ชื่อจริงภาษาไทย
  requesterLastNameTh?: string; // นามสกุลภาษาไทย
  requesterPositionTh?: string; // ตำแหน่งงานภาษาไทย
  requesterFacultyTh?: string; // ชื่อคณะ หรือ หน่วยงานระดับคณะ ภาษาไทย
  requesterPhone?: string; // เบอร์โทรศัพท์ติดต่อ
  purpose: string;
  borrowFrom: string; // YYYY-MM-DD
  borrowFromTime?: string; // HH:mm
  borrowTo: string; // YYYY-MM-DD
  borrowToTime?: string; // HH:mm
  equipmentList: BorrowedEquipmentItem[];
  notes?: string;
  returnedAt?: string;
  returnReceivedBy?: string;
  executiveApprovedAt?: string;
  executiveApprovedBy?: string;
  executiveNotes?: string;
  // Admin delegation fields (ยื่นขอยืมแทนโดยแอดมิน)
  submittedByAdmin?: boolean;
  submittedByAdminName?: string;
  submittedByAdminEmail?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  position: string;
  dept: string;
  role: 'admin' | 'user' | 'owner' | 'executive';
  roleLabel: string;
  phone?: string;
  // OIDC & PSU Single Sign-On Fields (from psusso.psu.ac.th)
  username?: string; // ชื่อบัญชีผู้ใช้ (preferred_username)
  preferred_username?: string; // ชื่อบัญชีผู้ใช้
  title_th: string; // คำนำหน้านามภาษาไทย (เช่น นาย, นางสาว, ดร., ผศ.)
  first_name_th: string; // ชื่อจริงภาษาไทย
  last_name_th: string; // นามสกุลภาษาไทย
  position_th: string; // ตำแหน่งงานภาษาไทย (เช่น อาจารย์, นักวิชาการคอมพิวเตอร์)
  faculty_th: string; // ชื่อคณะ หรือ หน่วยงานระดับคณะ ภาษาไทย
  display_name_th: string; // ชื่อสำหรับแสดงผลภาษาไทย
  authProvider?: 'psu_sso' | 'local';
  oidcSub?: string;
  lastLoginAt?: string;
  permissions?: {
    canManageEquipment: boolean;
    canManageUsers: boolean;
    canApproveExecutive: boolean;
    canReceiveReturn: boolean;
  };
}

export interface EquipmentMaster {
  id: string;
  code: string;
  name: string;
  category: 'เครื่องมือวินิจฉัย/เอ็กซเรย์' | 'เครื่องมือผ่าตัด/ศัลยกรรม' | 'เครื่องมือตรวจและเฝ้าระวัง' | 'อุปกรณ์กายภาพ/เวชศาสตร์ฟื้นฟู' | 'อื่นๆ';
  location: string;
  responsible: string;
  responsibleEmail: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  receivedDate?: string;
  price?: number | string;
  status: 'พร้อมใช้งาน' | 'ถูกยืมใช้งาน' | 'ซ่อมบำรุง' | 'รอจำหน่าย';
  condition: string;
  imageUrl?: string;
  currentBorrowRequestId?: string;
  currentBorrowerName?: string;
  currentDueTo?: string;
}

export interface SystemNotification {
  id: string;
  requestId: string;
  type: 'overdue' | 'due_today' | 'due_soon' | 'new_request' | 'approved' | 'returned';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  requesterName: string;
  equipmentSummary: string;
  dueDate: string;
}
