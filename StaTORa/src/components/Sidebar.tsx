// src/components/Sidebar.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRoles?: Role[];
  children?: { label: string; href: string; requiredRoles?: Role[] }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    label: "บันทึก Operation",
    href: "/operations/new",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    requiredRoles: ["statistician", "super_admin"],
  },
  {
    label: "OR Summary",
    href: "/or-summary",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-8" />
      </svg>
    ),
  },
  {
    label: "RR Summary",
    href: "/rr-summary",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    requiredRoles: ["rr_incharge", "super_admin"],
  },
  {
    label: "หน่วยเปล",
    href: "/stretcher",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 21h10M12 17v4" />
      </svg>
    ),
    requiredRoles: ["stretcher_unit", "super_admin"],
  },
  {
    label: "กรรมการ",
    href: "/committees",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    children: [
      { label: "Hystero", href: "/committees/hystero", requiredRoles: ["committee_hystero", "super_admin"] },
      { label: "TAH", href: "/committees/tah", requiredRoles: ["committee_tah", "super_admin"] },
      { label: "LH & TLH", href: "/committees/lh-tlh", requiredRoles: ["committee_lh_tlh", "super_admin"] },
      { label: "RH", href: "/committees/rh", requiredRoles: ["committee_rh", "super_admin"] },
      { label: "C/S", href: "/committees/cs", requiredRoles: ["committee_cs", "super_admin"] },
      { label: "CA Cervix", href: "/committees/ca-cervix", requiredRoles: ["committee_ca_cervix", "super_admin"] },
      { label: "Ovarian Tumor", href: "/committees/ovarian-tumor", requiredRoles: ["committee_ovarian_tumor", "super_admin"] },
    ],
  },
  {
    label: "Yearly",
    href: "/yearly",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Export",
    href: "/export",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    ),
    requiredRoles: ["super_admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    requiredRoles: ["super_admin"],
  },
];

export function Sidebar() {
  const { userDoc, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(
    pathname.startsWith("/committees") ? "กรรมการ" : null
  );

  const hasAccess = (requiredRoles?: Role[]) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userDoc) return false;
    if (userDoc.roles.includes("super_admin")) return true;
    return requiredRoles.some((r) => userDoc.roles.includes(r));
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <aside className="hidden lg:flex lg:w-[260px] flex-col h-screen sticky top-0" style={{background: "#F8FBF9", borderRight: "0.5px solid #D9EDE6"}}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5" style={{borderBottom: "0.5px solid #D9EDE6"}}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{background: "#1D9E75"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 tracking-tight">OR Ward Stats</div>
          <div className="text-[11px] text-gray-400">GYN-OB</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          if (!hasAccess(item.requiredRoles)) return null;

          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          // Has children (expandable)
          if (item.children) {
            const isExpanded = expandedSection === item.label;
            const childActive = item.children.some((c) => pathname.startsWith(c.href));

            return (
              <div key={item.label}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : item.label)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    childActive
                      ? "text-teal-800 font-medium" style={{background: "#E1F5EE", borderRadius: "12px"}}
                      : "text-gray-500 hover:text-gray-900" style={{borderRadius: "12px"}}
                  }`}
                >
                  <span className={childActive ? "text-teal-700" : "text-gray-400"}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="ml-9 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                    {item.children.map((child) => {
                      if (!hasAccess(child.requiredRoles)) return null;
                      const childIsActive = pathname === child.href;
                      return (
                        <button
                          key={child.href}
                          onClick={() => router.push(child.href)}
                          className={`block w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                            childIsActive
                              ? "text-teal-700 font-medium" style={{background: "#E1F5EE", borderRadius: "8px"}}
                              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "text-teal-700 font-medium" style={{background: "#E1F5EE", borderRadius: "8px"}}
                  : "text-gray-500 hover:text-gray-900" style={{borderRadius: "12px"}}
              }`}
            >
              <span className={isActive ? "text-teal-700" : "text-gray-400"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4" style={{borderTop: "0.5px solid #D9EDE6"}}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium shrink-0" style={{background: "#9FE1CB", color: "#085041"}}>
            {userDoc?.displayName?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {userDoc?.displayName}
            </div>
            <div className="text-[11px] text-gray-400 truncate">
              {userDoc?.roles
                .map((r) => ROLE_LABELS[r] || r)
                .join(", ")}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title="ออกจากระบบ"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

// Bottom nav for mobile
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { userDoc } = useAuth();

  const mobileItems = [
    { label: "หน้าหลัก", href: "/", icon: "dashboard" },
    { label: "OR", href: "/or-summary", icon: "chart" },
    { label: "เพิ่ม", href: "/operations/new", icon: "plus", requiredRoles: ["statistician", "super_admin"] as Role[] },
    { label: "กรรมการ", href: "/committees", icon: "users" },
    { label: "อื่นๆ", href: "/settings", icon: "more" },
  ];

  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    chart: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-8" />
      </svg>
    ),
    plus: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    users: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      </svg>
    ),
    more: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
      </svg>
    ),
  };

  const hasAccess = (requiredRoles?: Role[]) => {
    if (!requiredRoles) return true;
    if (!userDoc) return false;
    if (userDoc.roles.includes("super_admin")) return true;
    return requiredRoles.some((r) => userDoc.roles.includes(r));
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around py-1.5">
        {mobileItems.map((item) => {
          if (!hasAccess(item.requiredRoles)) return null;
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                item.icon === "plus" ? "" : ""
              } ${
                isActive ? "text-teal-700" : "text-gray-400"
              }`}
            >
              {item.icon === "plus" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-white -mt-4" style={{background: "#1D9E75", boxShadow: "0 4px 12px rgba(29,158,117,0.35)"}}>
                  {icons[item.icon]}
                </div>
              ) : (
                icons[item.icon]
              )}
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  statistician: "สถิติ",
  rr_incharge: "RR",
  stretcher_unit: "หน่วยเปล",
  committee_hystero: "กก.Hystero",
  committee_tah: "กก.TAH",
  committee_lh_tlh: "กก.LH&TLH",
  committee_rh: "กก.RH",
  committee_cs: "กก.C/S",
  committee_ca_cervix: "กก.CA Cervix",
  committee_ovarian_tumor: "กก.Ovarian",
};
