// src/app/api/setup/route.ts
// สร้าง Super Admin คนแรก — ใช้ได้เฉพาะตอนที่ยังไม่มี user ในระบบเท่านั้น

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    // Check if any user already exists — ถ้ามีแล้วห้ามใช้ endpoint นี้
    const usersSnapshot = await adminDb.collection("users").limit(1).get();
    if (!usersSnapshot.empty) {
      return NextResponse.json(
        { error: "ระบบมี user อยู่แล้ว ไม่สามารถใช้ setup ได้อีก" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, displayName } = body as {
      email: string;
      password: string;
      displayName: string;
    };

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "กรุณากรอก email, password, displayName" },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore user doc with super_admin role
    const now = Timestamp.now();
    await adminDb.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      displayName,
      roles: ["super_admin"],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userRecord.uid,
    });

    return NextResponse.json({
      success: true,
      message: `สร้าง Super Admin สำเร็จ! เข้าสู่ระบบด้วย ${email} ได้เลย`,
      uid: userRecord.uid,
    });
  } catch (err: any) {
    console.error("Setup error:", err);
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "อีเมลนี้มีใน Firebase Auth แล้ว" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด: " + err.message },
      { status: 500 }
    );
  }
}

// หน้า HTML สำหรับกรอกข้อมูล
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup — OR Ward Stats</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #1D9E75; }
    p { font-size: 0.875rem; color: #666; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.875rem; color: #333; margin-bottom: 0.25rem; }
    input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; outline: none; }
    input:focus { border-color: #1D9E75; }
    button { width: 100%; padding: 0.75rem; background: #1D9E75; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    button:hover { background: #178a65; }
    .result { margin-top: 1rem; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; display: none; }
    .success { background: #e8f8f2; color: #0f6e56; }
    .error { background: #fdecea; color: #c0392b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>ตั้งค่าระบบครั้งแรก</h1>
    <p>สร้าง Super Admin — ใช้ได้เฉพาะครั้งแรกที่ยังไม่มี user ในระบบ</p>
    <label>ชื่อ-นามสกุล</label>
    <input type="text" id="displayName" placeholder="เช่น พยาบาลสมใจ" />
    <label>อีเมล</label>
    <input type="email" id="email" placeholder="example@cmu.ac.th" />
    <label>รหัสผ่าน (อย่างน้อย 6 ตัว)</label>
    <input type="password" id="password" placeholder="รหัสผ่าน" />
    <button onclick="setup()">สร้าง Super Admin</button>
    <div class="result" id="result"></div>
  </div>
  <script>
    async function setup() {
      const displayName = document.getElementById('displayName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const result = document.getElementById('result');
      if (!displayName || !email || !password) {
        result.className = 'result error'; result.style.display = 'block';
        result.textContent = 'กรุณากรอกข้อมูลให้ครบ'; return;
      }
      try {
        const res = await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          result.className = 'result success'; result.style.display = 'block';
          result.innerHTML = '✅ ' + data.message + '<br><br><a href="/" style="color:#0f6e56">→ ไปหน้า Login</a>';
        } else {
          result.className = 'result error'; result.style.display = 'block';
          result.textContent = '❌ ' + data.error;
        }
      } catch(e) {
        result.className = 'result error'; result.style.display = 'block';
        result.textContent = '❌ เกิดข้อผิดพลาด กรุณาลองใหม่';
      }
    }
  </script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
