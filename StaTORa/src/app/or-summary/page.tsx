// src/app/or-summary/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useOperations } from "@/hooks/useOperations";
import { OperationDoc, MAIN_GROUPS } from "@/types/database";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatTime(date: any): string {
  if (!date) return "-";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: any): string {
  if (!date) return "-";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function getDuration(start: any, end: any): string {
  if (!start || !end) return "-";
  const s = start.toDate ? start.toDate() : new Date(start);
  const e = end.toDate ? end.toDate() : new Date(end);
  const mins = Math.round((e.getTime() - s.getTime()) / 60000);
  if (mins < 0) return "-";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function ORSummaryPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");

  const { operations, loading } = useOperations({ year, month });

  const filtered = operations.filter((op) => {
    const matchGroup = filterGroup === "ALL" || op.mainGroup === filterGroup;
    const matchSearch =
      !search ||
      op.procedureName.toLowerCase().includes(search.toLowerCase()) ||
      op.surgeon?.toLowerCase().includes(search.toLowerCase()) ||
      op.postOpDiagnosis?.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const total = filtered.length;
  const elective = filtered.filter((o) => o.urgency === "Elective").length;
  const emergency = filtered.filter((o) => o.urgency === "Emergency").length;
  const complicated = filtered.filter((o) => o.hasComplication).length;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-medium text-gray-900">OR Summary</h1>
            <p className="text-sm text-gray-400 mt-1">รายการผ่าตัดประจำเดือน</p>
          </div>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {MONTHS_TH.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "ทั้งหมด", value: total, color: "text-gray-900" },
            { label: "Elective", value: elective, color: "text-teal-600" },
            { label: "Emergency", value: emergency, color: "text-red-500" },
            { label: "มี Complication", value: complicated, color: "text-amber-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="ค้นหา หัตถการ / แพทย์ / diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">ทุก Main Group</option>
            {MAIN_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-1">ไม่มีข้อมูล</p>
            <p className="text-sm">ยังไม่มีการบันทึกเคสในเดือนนี้</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">วันที่</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Main Group</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">หัตถการ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">แพทย์</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ประเภท</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">เวลา</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ระยะเวลา</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Complication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => router.push(`/operations/${op.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(op.operationDate)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {op.mainGroup}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{op.procedureName}</td>
                      <td className="px-4 py-3 text-gray-600">{op.surgeon || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          op.urgency === "Elective"
                            ? "bg-green-50 text-green-700"
                            : op.urgency === "Emergency"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {op.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatTime(op.startTime)} – {formatTime(op.endTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{getDuration(op.startTime, op.endTime)}</td>
                      <td className="px-4 py-3">
                        {op.hasComplication ? (
                          <span className="inline-block bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">มี</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              แสดง {filtered.length} จาก {operations.length} เคส
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
