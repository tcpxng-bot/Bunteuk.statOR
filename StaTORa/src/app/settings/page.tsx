// src/app/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const { isSuperAdmin, signOut, userDoc } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const items = [
    ...(isSuperAdmin
      ? [
          {
            label: "จัดการบัญชีผู้ใช้",
            desc: "สร้าง/แก้ไข/กำหนด role",
            href: "/settings/users",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
          },
          {
            label: "กำหนดคนเก็บสถิติ",
            desc: "assign รายเดือน",
            href: "/settings/statistician",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            ),
          },
          {
            label: "จัดการ Dropdown",
            desc: "แก้ไข list หัตถการ, แพทย์, พยาบาล",
            href: "/settings/dropdowns",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" /><rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            ),
          },
        ]
      : []),
    {
      label: "เปลี่ยนรหัสผ่าน",
      desc: "เปลี่ยนรหัสผ่านของตัวเอง",
      href: "/settings/change-password",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="text-xl font-medium text-gray-900 mb-6">ตั้งค่า</h1>

        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex w-full items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-4 text-left hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <span className="text-gray-400">{item.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/50 px-5 py-3.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          ออกจากระบบ
        </button>

        <p className="mt-6 text-center text-xs text-gray-300">
          {userDoc?.displayName} · {userDoc?.email}
        </p>
      </div>
    </AppShell>
  );
}
