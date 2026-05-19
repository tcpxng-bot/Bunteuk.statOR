// src/middleware.ts
// Next.js middleware สำหรับ redirect ไป login ถ้ายังไม่ได้ login
// Note: middleware ทำงานที่ edge — ตรวจ cookie เบื้องต้นเท่านั้น
// การตรวจ role จริงๆ ทำฝั่ง client ผ่าน AuthContext

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// หน้าที่ไม่ต้อง login
const PUBLIC_PATHS = ["/login", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for Firebase auth cookie/token
  // Note: Firebase Auth ใช้ IndexedDB ไม่ใช้ cookie
  // ดังนั้น middleware ไม่สามารถตรวจ auth state ได้จริง
  // ใช้ client-side guard แทน (AuthGuard component)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
