// src/app/settings/statistician/page.tsx
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getAllUsers, getStatisticianAssignment, setStatisticianAssignment } from "@/lib/firestore";
import { UserDoc } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

interface MonthAssignment {
  yearMonth: string;
  month: number;
  year: number;
  assignedUid: string;
  assignedName: string;
}

export default function StatisticianPage() {
  const { userDoc } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // yearMonth → uid
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  // Load users and assignments
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [allUsers, ...monthAssigns] = await Promise.all([
        getAllUsers(),
        ...Array.from({ length: 12 }, (_, i) => {
          const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
          return getStatisticianAssignment(ym);
        }),
      ]);

      const eligible = allUsers.filter(
        (u) => u.isActive && (u.roles.includes("statistician") || u.roles.includes("super_admin"))
      );
      setUsers(eligible);

      const map: Record<string, string> = {};
      monthAssigns.forEach((a, i) => {
        if (a) {
          const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
          map[ym] = a.assignedUid;
        }
      });
      setAssignments(map);
      setLoading(false);
    }
    load();
  }, [year]);

  async function assign(month: number, uid: string) {
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    const user = users.find((u) => u.uid === uid);
    if (!user || !userDoc) return;

    setSaving(ym);
    await setStatisticianAssignment(ym, {
      yearMonth: ym,
      assignedUid: uid,
      assignedName: user.displayName,
      assignedBy: userDoc.uid,
    });
    setAssignments((prev) => ({ ...prev, [ym]: uid }));
    setSaving(null);
    setSaved(ym);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <AppShell requiredRoles={["super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-gray-900">กำหนดคนเก็บสถิติ</h1>
            <p className="text-sm text-gray-400 mt-1">assign ผู้รับผิดชอบรายเดือน</p>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {years.map((y) => <option key={y} value={y}>{y + 543}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>ยังไม่มี user ที่มี role statistician</p>
            <p className="text-sm mt-1">ไปเพิ่ม role ที่ Settings → จัดการบัญชีผู้ใช้</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">เดือน</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">คนเก็บสถิติ</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MONTHS_TH.map((monthName, i) => {
                  const month = i + 1;
                  const ym = `${year}-${String(month).padStart(2, "0")}`;
                  const assignedUid = assignments[ym] || "";
                  const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
                  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;

                  return (
                    <tr key={ym} className={isCurrent ? "bg-teal-50/50" : ""}>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{monthName} {year + 543}</span>
                        {isCurrent && (
                          <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">เดือนนี้</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={assignedUid}
                          onChange={(e) => assign(month, e.target.value)}
                          disabled={saving === ym}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                        >
                          <option value="">— ยังไม่กำหนด —</option>
                          {users.map((u) => (
                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {saving === ym ? (
                          <span className="text-xs text-gray-400">กำลังบันทึก...</span>
                        ) : saved === ym ? (
                          <span className="text-xs text-teal-600">✓ บันทึกแล้ว</span>
                        ) : assignedUid ? (
                          <span className="text-xs text-gray-400">{isPast ? "ผ่านแล้ว" : "กำหนดแล้ว"}</span>
                        ) : (
                          <span className="text-xs text-amber-500">ยังไม่กำหนด</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
