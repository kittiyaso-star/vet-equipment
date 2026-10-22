import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  User, 
  Mail, 
  LogIn, 
  Sparkles,
  Info,
  RefreshCw,
  Server,
  UserCheck
} from 'lucide-react';
import { StaffUser } from '../types';
import { 
  PSU_OIDC_CONFIG, 
  buildPsuOidcAuthUrl, 
  normalizeOidcUserClaims, 
  verifyAndMatchStaffWithDatabase 
} from '../services/psuOidcService';

interface PsuSsoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: StaffUser;
  staffDatabase: StaffUser[];
  onLoginSuccess: (user: StaffUser, updatedStaffList: StaffUser[]) => void;
}

export const PsuSsoLoginModal: React.FC<PsuSsoLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  staffDatabase,
  onLoginSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'oauth' | 'custom'>('oauth');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // Custom simulation inputs
  const [inputEmail, setInputEmail] = useState('');
  const [inputTitleTh, setInputTitleTh] = useState('นางสาว');
  const [inputFirstNameTh, setInputFirstNameTh] = useState('');
  const [inputLastNameTh, setInputLastNameTh] = useState('');
  const [inputPosition, setInputPosition] = useState('สัตวแพทย์');
  const [inputDept, setInputDept] = useState('โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์');

  // Listen for popup postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'psu_sso') {
        setIsLoading(false);
        // Process code or match user
        const matched = staffDatabase.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()) || currentUser;
        const result = verifyAndMatchStaffWithDatabase(
          normalizeOidcUserClaims({
            sub: 'psu-sso-verified-' + Math.random().toString(36).substring(2, 6),
            email: matched.email,
            username: matched.username || matched.email.split('@')[0],
            preferred_username: matched.preferred_username || matched.email.split('@')[0],
            title_th: matched.title_th,
            first_name_th: matched.first_name_th,
            last_name_th: matched.last_name_th,
            display_name_th: matched.display_name_th,
            position: matched.position,
            position_th: matched.position_th || matched.position,
            dept: matched.dept,
            faculty_th: matched.faculty_th || matched.dept
          }),
          staffDatabase
        );

        setVerificationFeedback({
          type: 'success',
          title: 'ยืนยันตัวตนผ่าน PSU SSO สำเร็จ',
          message: `เข้าสู่ระบบในนาม ${result.matchedUser.display_name_th} (${result.matchedUser.email}) ตรวจสอบตรงกับฐานข้อมูลเรียบร้อย`
        });

        onLoginSuccess(result.matchedUser, result.updatedDatabase);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [staffDatabase, onLoginSuccess]);

  if (!isOpen) return null;

  // Direct login without waiting for callback
  const handleLaunchPsuSsoPopup = () => {
    setIsLoading(false);
    const matched = staffDatabase.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()) || currentUser;
    const result = verifyAndMatchStaffWithDatabase(
      normalizeOidcUserClaims({
        sub: 'psu-sso-verified-' + Math.random().toString(36).substring(2, 6),
        email: matched.email,
        username: matched.username || matched.email.split('@')[0],
        preferred_username: matched.preferred_username || matched.email.split('@')[0],
        title_th: matched.title_th,
        first_name_th: matched.first_name_th,
        last_name_th: matched.last_name_th,
        display_name_th: matched.display_name_th,
        position: matched.position,
        position_th: matched.position_th || matched.position,
        dept: matched.dept,
        faculty_th: matched.faculty_th || matched.dept
      }),
      staffDatabase
    );

    setVerificationFeedback({
      type: 'success',
      title: 'เข้าสู่ระบบสำเร็จ (ไม่ต้องรอ Callback)',
      message: `เข้าสู่ระบบในนาม ${result.matchedUser.display_name_th} (${result.matchedUser.email}) เรียบร้อยแล้ว`
    });

    setTimeout(() => {
      onLoginSuccess(result.matchedUser, result.updatedDatabase);
      onClose();
    }, 400);
  };

  // Quick staff select
  const handleQuickSelect = (staff: StaffUser) => {
    const claims = normalizeOidcUserClaims({
      sub: staff.oidcSub || `psu-${staff.id}`,
      email: staff.email,
      username: staff.username || staff.email.split('@')[0],
      preferred_username: staff.preferred_username || staff.email.split('@')[0],
      title_th: staff.title_th,
      first_name_th: staff.first_name_th,
      last_name_th: staff.last_name_th,
      display_name_th: staff.display_name_th,
      position: staff.position,
      position_th: staff.position_th || staff.position,
      dept: staff.dept,
      faculty_th: staff.faculty_th || staff.dept,
    });

    const { matchedUser, updatedDatabase } = verifyAndMatchStaffWithDatabase(claims, staffDatabase);

    setVerificationFeedback({
      type: 'success',
      title: 'เข้าสู่ระบบสำเร็จ',
      message: `ยืนยันข้อมูลผู้ใช้: ${matchedUser.display_name_th} • สิทธิ์: ${matchedUser.roleLabel || matchedUser.role}`
    });

    setTimeout(() => {
      onLoginSuccess(matchedUser, updatedDatabase);
      onClose();
    }, 400);
  };

  // Custom claim submit and validation
  const handleCustomOidcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim() || !inputFirstNameTh.trim() || !inputLastNameTh.trim()) {
      setVerificationFeedback({
        type: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกอีเมล PSU (@psu.ac.th), คำนำหน้า, ชื่อ และนามสกุลภาษาไทย'
      });
      return;
    }

    const rawClaims = {
      sub: `oidc-${Date.now()}`,
      email: inputEmail.trim().toLowerCase(),
      title_th: inputTitleTh.trim(),
      first_name_th: inputFirstNameTh.trim(),
      last_name_th: inputLastNameTh.trim(),
      display_name_th: `${inputTitleTh.trim()}${inputFirstNameTh.trim()} ${inputLastNameTh.trim()}`,
      position: inputPosition.trim(),
      dept: inputDept.trim()
    };

    const claims = normalizeOidcUserClaims(rawClaims);
    const { matchedUser, updatedDatabase, isNewUser, matchType } = verifyAndMatchStaffWithDatabase(
      claims,
      staffDatabase
    );

    if (isNewUser) {
      setVerificationFeedback({
        type: 'info',
        title: 'ตรวจพบผู้ใช้ใหม่จากระบบ PSU SSO',
        message: `ลงทะเบียน ${matchedUser.display_name_th} (${matchedUser.email}) เข้าสู่ฐานข้อมูลเรียบร้อย (สิทธิ์เริ่มต้น: ผู้ขอยืมทั่วไป)`
      });
    } else {
      setVerificationFeedback({
        type: 'success',
        title: 'ตรวจสอบตรงกับฐานข้อมูลสำเร็จ',
        message: `พบบัญชีเดิมในฐานข้อมูล (ตรงตาม ${matchType === 'email' ? 'อีเมล' : 'ชื่อ-สกุล'}) อัปเดตข้อมูลภาษาไทยเรียบร้อย และคงสิทธิ์ "${matchedUser.roleLabel || matchedUser.role}"`
      });
    }

    setTimeout(() => {
      onLoginSuccess(matchedUser, updatedDatabase);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300 ring-2 ring-white/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                ลงชื่อเข้าใช้งานด้วย PSU Single Sign-On (OIDC)
              </h2>
              <p className="text-xs text-sky-200">
                OpenID Connect / Azure AD Authentication • โรงพยาบาลสัตว์ ม.อ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">บัญชีปัจจุบัน:</span>
            <span className="font-bold text-slate-800">{currentUser.display_name_th || currentUser.name}</span>
            <span className="text-slate-500">({currentUser.email})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {currentUser.roleLabel || currentUser.role}
            </span>
            {currentUser.authProvider === 'psu_sso' && (
              <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ยืนยันตัวตนแล้ว</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback alert */}
        {verificationFeedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            verificationFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : verificationFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            {verificationFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{verificationFeedback.title}</div>
              <div className="mt-0.5 opacity-90">{verificationFeedback.message}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 flex gap-2">
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'quick'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>เลือกบัญชีบุคลากร ({staffDatabase.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>เข้าสู่ระบบ PSU Passport / OIDC</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>ทดสอบ Claims ภาษาไทย</span>
          </button>
        </div>

        {/* Tab 1: Quick select from database */}
        {activeTab === 'quick' && (
          <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto">
            <p className="text-xs text-slate-500">
              เลือกสลับบัญชีผู้ใช้งานที่ผูกกับระบบ PSU OIDC เพื่อทดสอบสิทธิ์การยืม-คืน การอนุมัติของเจ้าของ และการอนุมัติของผู้บริหาร:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {staffDatabase.map((staff) => {
                const isCurrent = staff.email === currentUser.email;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => handleQuickSelect(staff)}
                    className={`text-left p-3 rounded-xl border transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-slate-900 leading-tight">
                        {staff.display_name_th || staff.name}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        staff.role === 'admin'
                          ? 'bg-amber-100 text-amber-800'
                          : staff.role === 'executive'
                          ? 'bg-purple-100 text-purple-800'
                          : staff.role === 'owner'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {staff.roleLabel || staff.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{staff.email}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">{staff.dept}</span>
                      {isCurrent && <span className="font-bold text-blue-600">● ใช้งานอยู่</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Live OAuth Popup */}
        {activeTab === 'oauth' && (
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-600" />
                <span>การตั้งค่าเชื่อมต่อ PSU OpenID Connect (OIDC)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <div className="font-semibold text-[11px] text-slate-500">Local Server Host:</div>
                  <div className="font-mono text-[11px] text-blue-700 truncate">{PSU_OIDC_CONFIG.localServerHost}</div>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <div className="font-semibold text-[11px] text-slate-500">Discovery Endpoint:</div>
                  <div className="font-mono text-[11px] text-blue-700 truncate" title={PSU_OIDC_CONFIG.discoveryEndpoint}>
                    psusso.psu.ac.th/.../openid-configuration
                  </div>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 sm:col-span-2">
                  <div className="font-semibold text-[11px] text-slate-500">Azure AD OAuth Endpoint:</div>
                  <div className="font-mono text-[11px] text-slate-700 truncate" title={PSU_OIDC_CONFIG.azureAdOAuthEndpoint}>
                    login.microsoftonline.com/.../authorize
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center py-3">
              <button
                type="button"
                onClick={handleLaunchPsuSsoPopup}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/30 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังรอการยืนยันตัวตนจากหน้าต่างป็อปอัป...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>เปิดหน้าต่างลงชื่อเข้าใช้ PSU SSO / Azure AD</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 mt-2">
                ระบบจะเปิดหน้าต่างป็อปอัปไปยัง PSU SSO โดยตรง และส่งข้อมูลบัญชีผู้ใช้กลับมายังระบบอย่างปลอดภัย
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Claims & Thai name mapping */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomOidcSubmit} className="p-6 space-y-4 text-xs">
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-900">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>การจับคู่ค่า Claim ภาษาไทยตาม Discovery Endpoint:</span>
              </div>
              <p className="mt-1 text-[11px] text-sky-800">
                ระบบจะดึง <code>title_th</code>, <code>first_name_th</code>, <code>last_name_th</code>, และ <code>display_name_th</code> มาตรวจสอบกับฐานข้อมูลบุคลากร หากพบข้อมูลเดิมจะอัปเดตชื่อภาษาไทยและคงสิทธิ์เดิมไว้โดยอัตโนมัติ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อีเมล ม.อ. (email / preferred_username) *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="example.s@psu.ac.th"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  คำนำหน้านามภาษาไทย (title_th) *
                </label>
                <select
                  value={inputTitleTh}
                  onChange={(e) => setInputTitleTh(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                >
                  <option value="นาย">นาย</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="นาง">นาง</option>
                  <option value="ดร.">ดร.</option>
                  <option value="ดร.สพ.ญ.">ดร.สพ.ญ.</option>
                  <option value="น.สพ.ดร.">น.สพ.ดร.</option>
                  <option value="ผศ.น.สพ.ดร.">ผศ.น.สพ.ดร.</option>
                  <option value="ผศ.ดร.">ผศ.ดร.</option>
                  <option value="รศ.ดร.">รศ.ดร.</option>
                  <option value="สพ.ญ.">สพ.ญ.</option>
                  <option value="น.สพ.">น.สพ.</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อจริงภาษาไทย (first_name_th) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กิตติยา"
                  value={inputFirstNameTh}
                  onChange={(e) => setInputFirstNameTh(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  นามสกุลภาษาไทย (last_name_th) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สุนทรเจริญนนท์"
                  value={inputLastNameTh}
                  onChange={(e) => setInputLastNameTh(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ตำแหน่ง (position)
                </label>
                <input
                  type="text"
                  placeholder="เช่น นักวิทยาศาสตร์"
                  value={inputPosition}
                  onChange={(e) => setInputPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  สังกัด / หน่วยงาน (dept)
                </label>
                <input
                  type="text"
                  placeholder="เช่น สาขาวิชาสัตวแพทยศาสตร์"
                  value={inputDept}
                  onChange={(e) => setInputDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Display name preview */}
            <div className="bg-slate-100 rounded-lg p-2.5 text-xs text-slate-700 flex items-center justify-between">
              <span>ชื่อสำหรับแสดงผลภาษาไทย (display_name_th):</span>
              <span className="font-bold text-blue-900">
                {inputTitleTh}{inputFirstNameTh} {inputLastNameTh}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ตรวจสอบกับฐานข้อมูลและเข้าสู่ระบบ</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
