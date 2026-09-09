import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  LogIn, 
  AlertCircle, 
  Lock, 
  CheckCircle2
} from 'lucide-react';
import { StaffUser } from '../types';
import { 
  loginWithPsuOidcPopup, 
  processOidcClaimsToStaffUser 
} from '../services/psuOidcService';

interface OidcLoginScreenProps {
  staffDatabase: StaffUser[];
  onLoginSuccess: (user: StaffUser, updatedList: StaffUser[]) => void;
}

export const OidcLoginScreen: React.FC<OidcLoginScreenProps> = ({
  staffDatabase,
  onLoginSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Primary Official PSU SSO / OIDC Login
  const handleOidcLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const claims = await loginWithPsuOidcPopup();
      const { user, updatedList } = processOidcClaimsToStaffUser(claims, staffDatabase);
      onLoginSuccess(user, updatedList);
    } catch (err: any) {
      console.warn('OIDC Popup notification:', err);
      setErrorMessage(
        err?.message || 
        'ไม่สามารถเชื่อมต่อหน้าต่างยืนยันตัวตน PSU SSO ได้ กรุณาตรวจสอบการอนุญาตป็อปอัปในเบราว์เซอร์'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Subtle Gradient & Accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 z-0 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-white/20 shadow-md flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src={`${import.meta.env.BASE_URL}site-icon.jpg`} 
                alt="ตราสัญลักษณ์โรงพยาบาลสัตว์ ม.อ." 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                มหาวิทยาลัยสงขลานครินทร์ • Prince of Songkla University
              </div>
              <div className="text-sm font-bold text-white leading-tight">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>PSU Single Sign-On (OIDC)</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md">
          {/* Main Login Card */}
          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />

            {/* System Title & Official Logo */}
            <div className="text-center mb-6">
              <div className="inline-flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-white shadow-xl shadow-blue-950/60 border border-white/40 mb-4 mx-auto">
                <img 
                  src={`${import.meta.env.BASE_URL}logo-vet-color-transparent.svg`} 
                  alt="โรงพยาบาลสัตว์ มหาวิทยาลัยสงขลานครินทร์" 
                  className="h-11 sm:h-13 w-auto max-w-[260px] sm:max-w-[280px] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ระบบบริหารจัดการยืม-คืนครุภัณฑ์
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-1 font-medium">
                โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ ม.อ.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/70 px-3 py-1 rounded-full border border-slate-700/70">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>เข้าสู่ระบบด้วยบัญชีผู้ใช้ PSU Passport</span>
              </div>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold mb-0.5">แจ้งเตือน</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Primary Action Button: PSU SSO */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleOidcLogin}
                disabled={loading}
                id="btn-login-psu-passport"
                className="w-full relative group overflow-hidden rounded-xl p-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 active:scale-[0.99] transition shadow-lg shadow-blue-900/40 border border-blue-400/40 text-left flex items-center justify-between cursor-pointer disabled:opacity-75"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-105 transition">
                    <KeyRound className="w-6 h-6 text-sky-200" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                      <span>เข้าสู่ระบบด้วย PSU Passport</span>
                    </div>
                    <div className="text-xs text-blue-200/90 font-medium mt-0.5">
                      อีเมลและรหัสผ่าน @psu.ac.th
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-white pr-1">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition" />
                  )}
                </div>
              </button>

              {/* Service Information */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>คำแนะนำการเข้าใช้งานระบบ:</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 pl-4 list-disc leading-relaxed">
                  <li>เข้าสู่ระบบด้วยชื่อผู้ใช้ (Username) และรหัสผ่าน <strong>PSU Passport (@psu.ac.th)</strong></li>
                  <li>รองรับอาจารย์ สัตวแพทย์ นักวิทยาศาสตร์ เจ้าหน้าที่ และนักศึกษา มหาวิทยาลัยสงขลานครินทร์</li>
                  <li>ระบบจะตรวจสอบระดับสิทธิ์การใช้งาน (ผู้ขอยืม, เจ้าของครุภัณฑ์, ผู้บริหารอนุมัติ) ตามข้อมูลสังกัดโดยอัตโนมัติ</li>
                </ul>
              </div>
            </div>

            {/* Bottom Security Note */}
            <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ยืนยันตัวตนผ่าน PSU Central Authentication Service</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            โรงพยาบาลสัตว์ คณะสัตวแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (วิทยาเขตหาดใหญ่)
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OIDC Authentication Service Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
