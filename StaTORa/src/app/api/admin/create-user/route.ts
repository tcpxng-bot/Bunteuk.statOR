// src/app/api/admin/create-user/route.ts
// Super admin สร้าง account ใหม่ผ่าน API route นี้
// ต้องใช้ Firebase Admin SDK เพราะ client SDK สร้าง user แล้วจะ auto-login

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { Role, ROLES } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    // Check super_admin role from Firestore
    const callerDoc = await adminDb.doc(`users/${decoded.uid}`).get();
    if (!callerDoc.exists || !callerDoc.data()?.roles?.includes("super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { email, password, displayName, roles } = body as {
      email: string;
      password: string;
      displayName: string;
      roles: Role[];
    };

    // Validate
    if (!email || !password || !displayName || !roles?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate roles
    const invalidRoles = roles.filter((r: string) => !ROLES.includes(r as Role));
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore user doc
    const now = Timestamp.now();
    await adminDb.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      displayName,
      roles,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      email,
      displayName,
      roles,
    });
  } catch (err: any) {
    console.error("Create user error:", err);

    if (err.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "อีเมลนี้มีในระบบแล้ว" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "สร้างบัญชีไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
