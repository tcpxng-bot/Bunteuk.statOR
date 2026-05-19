// src/app/committees/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { COMMITTEE_CONFIGS } from "@/lib/committeeConfig";
import { Role } from "@/types/database";

const COMMITTEE_ICONS: Record<string, React.ReactNode> = {
  TAH: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  LH_TLH: <><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></>,
  CS: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  HYSTERO: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></>,
  CA_CERVIX: <><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></>,
  RH: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
  OVARIAN_TUMOR: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></>,
};

export default function CommitteesIndexPage() {
  const router = useRouter();
  const { userDoc } = useAuth();

  const hasAccess = (role: Role) => {
    if (!userDoc) return false;
    if (userDoc.roles.includes("super_admin")) return true;
    return userDoc.roles.includes(role);
  };

  const accessibleCommittees = COMMITTEE_CONFIGS.filter((c) =>
    hasAccess(c.role)
  );

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <h1 className="text-xl font-medium text-gray-900 tracking-tight mb-1">
          กรรมการ
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          บันทึกตัวชี้วัดและติดตามข้อมูล RR ตามกรรมการแต่ละประเภท
        </p>

        {accessibleCommittees.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center text-sm text-gray-500">
            ไม่มีสิทธิ์เข้าถึงหน้ากรรมการ กรุณาติดต่อ admin
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accessibleCommittees.map((c) => (
              <button
                key={c.type}
                onClick={() => router.push(c.href)}
                className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-5 text-left hover:border-teal-200 hover:shadow-sm transition-all group"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shrink-0 group-hover:bg-teal-100 transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {COMMITTEE_ICONS[c.type]}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {c.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c.labelTH}
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-300 group-hover:text-teal-500 transition-colors"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
