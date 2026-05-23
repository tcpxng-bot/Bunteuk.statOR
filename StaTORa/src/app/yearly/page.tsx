// src/app/yearly/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/AppShell";
import { OperationDoc, MAIN_GROUPS } from "@/types/database";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export default function YearlyPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [operations, setOperations] = useState<OperationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Query ตาม year field โดยตรง
  useEffect(() => {
    setLoading(true);
    setOperations([]);
    const q = query(
      collection(db, "operations"),
      where("year", "==", year),
      orderBy("operationDate", "asc")
    );
    getDocs(q).then((snap) => {
      setOperations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OperationDoc)));
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [year]);

  const stats = useMemo(() => {
    if (!operations.length) return null;

    const total = operations.length;
    const elective = operations.filter((o) => o.urgency === "Elective").length;
    const emergency = operations.filter((o) => o.urgency === "Emergency").length;
    const other = operations.filter((o) => o.urgency === "Other").length;
    const complicated = operations.filter((o) => o.hasComplication).length;

    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const ops = operations.filter((o) => o.month === m);
      return {
        month: MONTHS_TH[i],
        total: ops.length,
        elective: ops.filter((o) => o.urgency === "Elective").length,
        emergency: ops.filter((o) => o.urgency === "Emergency").length,
      };
    });

    const byGroup = MAIN_GROUPS.map((g) => {
      const ops = operations.filter((o) => o.mainGroup === g);
      return { group: g, total: ops.length };
    }).filter((g) => g.total > 0).sort((a, b) => b.total - a.total);

    const procMap = new Map<string, number>();
    operations.forEach((o) => procMap.set(o.procedureName, (procMap.get(o.procedureName) || 0) + 1));
    const topProcs = [...procMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    const byQuarter = [1, 2, 3, 4].map((q) => {
      const ops = operations.filter((o) => o.quarter === q);
      return { quarter: `Q${q}`, total: ops.length };
    });

    return { total, elective, emergency, other, complicated, byMonth, byGroup, topProcs, byQuarter };
  }, [operations]);

  const maxMonth = stats ? Math.max(...stats.byMonth.map((m) => m.total), 1) : 1;

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-gray-900">Yearly Summary</h1>
            <p className="text-sm text-gray-400 mt-1">สรุปสถิติรายปี</p>
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
        ) : !stats || stats.total === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-1">ไม่มีข้อมูล</p>
            <p className="text-sm">ยังไม่มีการบันทึกเคสในปี {year + 543}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "ทั้งหมด", value: stats.total, color: "text-gray-900" },
                { label: "Elective", value: stats.elective, color: "text-teal-600" },
                { label: "Emergency", value: stats.emergency, color: "text-red-500" },
                { label: "Other", value: stats.other, color: "text-gray-500" },
                { label: "มี Complication", value: stats.complicated, color: "text-amber-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-800 mb-4">เคสรายเดือน</h2>
              <div className="flex items-end gap-2 h-40">
                {stats.byMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{m.total || ""}</span>
                    <div className="w-full flex flex-col gap-0.5" style={{ height: `${Math.round((m.total / maxMonth) * 120)}px` }}>
                      <div className="w-full bg-red-400 rounded-t" style={{ flex: m.emergency }} />
                      <div className="w-full bg-teal-500" style={{ flex: m.elective }} />
                    </div>
                    <span className="text-xs text-gray-400">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />Elective</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Emergency</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-medium text-gray-800 mb-4">สรุปรายไตรมาส</h2>
                <div className="space-y-3">
                  {stats.byQuarter.map((q) => (
                    <div key={q.quarter} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-8">{q.quarter}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.round((q.total / stats.total) * 100)}%` }} />
                      </div>
                      <span className="text-sm text-gray-700 w-12 text-right">{q.total} เคส</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-medium text-gray-800 mb-4">แยกตาม Main Group</h2>
                <div className="space-y-3">
                  {stats.byGroup.map((g) => (
                    <div key={g.group} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-20">{g.group}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.round((g.total / stats.total) * 100)}%` }} />
                      </div>
                      <span className="text-sm text-gray-700 w-12 text-right">{g.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-800 mb-4">Top 10 หัตถการ</h2>
              <div className="space-y-2">
                {stats.topProcs.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1">{name}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.round((count / stats.topProcs[0][1]) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-10 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-medium text-gray-800">ตารางรายเดือน</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">เดือน</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">ทั้งหมด</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-teal-600">Elective</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-red-500">Emergency</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">% Elective</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.byMonth.map((m) => (
                      <tr key={m.month} className={m.total === 0 ? "opacity-40" : ""}>
                        <td className="px-4 py-2.5 text-gray-700">{m.month}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{m.total}</td>
                        <td className="px-4 py-2.5 text-right text-teal-600">{m.elective}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{m.emergency}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">
                          {m.total > 0 ? `${Math.round((m.elective / m.total) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium border-t border-gray-200">
                      <td className="px-4 py-2.5 text-gray-900">รวม</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">{stats.total}</td>
                      <td className="px-4 py-2.5 text-right text-teal-600">{stats.elective}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{stats.emergency}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {Math.round((stats.elective / stats.total) * 100)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
