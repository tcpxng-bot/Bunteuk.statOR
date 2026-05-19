// src/components/AppShell.tsx
"use client";

import { AuthGuard } from "./AuthGuard";
import { Sidebar, BottomNav } from "./Sidebar";
import { Role } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
}

export function AppShell({ children, requiredRoles }: AppShellProps) {
  return (
    <AuthGuard requiredRoles={requiredRoles}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
