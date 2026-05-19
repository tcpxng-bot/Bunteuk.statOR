// src/components/AuthGuard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/types/database";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requiredRoles,
  fallback,
}: AuthGuardProps) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      fallback ?? (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      )
    );
  }

  // Not logged in
  if (!user || !userDoc) {
    return null;
  }

  // Check roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess =
      userDoc.roles.includes("super_admin") ||
      requiredRoles.some((role) => userDoc.roles.includes(role));

    if (!hasAccess) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-gray-500">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อ admin
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
          >
            กลับหน้าหลัก
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
}
