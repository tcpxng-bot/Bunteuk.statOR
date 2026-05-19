// src/app/settings/change-password/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านไม่ตรงกัน" });
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(newPassword);
      setMessage({ type: "success", text: "เปลี่ยนรหัสผ่านสำเร็จ" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.code === "auth/requires-recent-login"
          ? "กรุณา logout แล้ว login ใหม่ก่อนเปลี่ยนรหัสผ่าน"
          : "เปลี่ยนรหัสผ่านไม่สำเร็จ",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-md mx-auto">
        <h1 className="text-xl font-medium text-gray-900 mb-6">เปลี่ยนรหัสผ่าน</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 mb-1.5">
              รหัสผ่านใหม่
            </label>
            <input
              id="new-pw"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="confirm-pw" className="block text-sm font-medium text-gray-700 mb-1.5">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              id="confirm-pw"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>

          {message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {isLoading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
