// src/app/login/page.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signIn, user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err: any) {
      setErrorMsg(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-10 text-white relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-teal-500/20" />
        <div className="absolute bottom-20 -left-10 h-40 w-40 rounded-full bg-teal-400/10" />
        <div className="absolute bottom-40 right-10 h-24 w-24 rounded-full bg-teal-300/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-medium tracking-tight">OR Ward Stats</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-medium leading-tight tracking-tight">
            ระบบเก็บสถิติ
            <br />
            ห้องผ่าตัด GYN-OB
          </h1>
          <p className="text-teal-100/80 text-[15px] leading-relaxed max-w-sm">
            บันทึก ติดตาม และวิเคราะห์ข้อมูลหัตถการ
            <br />
            สำหรับทีมผ่าตัดและกรรมการตัวชี้วัด
          </p>

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            <StatCard label="Main Groups" value="8" />
            <StatCard label="Roles" value="11" />
            <StatCard label="ตัวชี้วัด" value="7+" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-teal-200/50">
          © {new Date().getFullYear()} OR Ward Statistics
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-medium text-gray-900 tracking-tight">OR Ward Stats</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-medium text-gray-900 tracking-tight">
              เข้าสู่ระบบ
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              กรุณาใช้บัญชีที่ได้รับจาก admin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.go.th"
                className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            หากลืมรหัสผ่าน กรุณาติดต่อ admin เพื่อรีเซ็ต
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-3 text-center">
      <div className="text-xl font-medium font-mono">{value}</div>
      <div className="text-[11px] text-teal-200/70 mt-0.5">{label}</div>
    </div>
  );
}
