// src/app/settings/users/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, updateUserDoc } from "@/lib/firestore";
import { UserDoc, Role, ROLES } from "@/types/database";

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  statistician: "คนเก็บสถิติ",
  rr_incharge: "RR Incharge",
  stretcher_unit: "หน่วยเปล",
  committee_hystero: "กก. Hystero",
  committee_tah: "กก. TAH",
  committee_lh_tlh: "กก. LH & TLH",
  committee_rh: "กก. RH",
  committee_cs: "กก. C/S",
  committee_ca_cervix: "กก. CA Cervix",
  committee_ovarian_tumor: "กก. Ovarian Tumor",
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoles, setNewRoles] = useState<Role[]>([]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const all = await getAllUsers();
      setUsers(all);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: Role) => {
    setNewRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);

    if (newRoles.length === 0) {
      setCreateMsg({ type: "error", text: "กรุณาเลือกอย่างน้อย 1 role" });
      return;
    }

    setCreating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newName,
          roles: newRoles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "สร้างไม่สำเร็จ");
      }

      setCreateMsg({ type: "success", text: `สร้างบัญชี ${newEmail} สำเร็จ` });
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRoles([]);
      loadUsers();
    } catch (err: any) {
      setCreateMsg({ type: "error", text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (uid: string, currentlyActive: boolean) => {
    try {
      await updateUserDoc(uid, { isActive: !currentlyActive });
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell requiredRoles={["super_admin"]}>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium text-gray-900">จัดการบัญชีผู้ใช้</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            สร้างบัญชีใหม่
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-8 rounded-2xl bg-white border border-gray-100 p-6">
            <h2 className="text-base font-medium text-gray-900 mb-4">สร้างบัญชีใหม่</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ชื่อ</label>
                  <input
                    required value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">อีเมล</label>
                  <input
                    type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">รหัสผ่าน</label>
                  <input
                    type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        newRoles.includes(role)
                          ? "bg-teal-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              {createMsg && (
                <div className={`rounded-lg px-4 py-2.5 text-sm ${
                  createMsg.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  {createMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {creating ? "กำลังสร้าง..." : "สร้างบัญชี"}
              </button>
            </form>
          </div>
        )}

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">ชื่อ</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">อีเมล</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Roles</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.displayName}</td>
                    <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700"
                          >
                            {ROLE_LABELS[r] || r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleActive(u.uid, u.isActive)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          u.isActive
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-400"}`} />
                        {u.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
