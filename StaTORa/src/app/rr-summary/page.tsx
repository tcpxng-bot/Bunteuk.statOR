// src/app/rr-summary/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/AppShell";
import { OperationDoc, RRRecordDoc } from "@/types/database";

export default function RRSummaryPage() {
  const router = useRouter();
  const [operations, setOperations] = useState<OperationDoc[]>([]);
  const [rrMap, setRrMap] = useState<Map<string, RRRecordDoc>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const date = new Date(dateFilter);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "operations"),
      where("operationDate", ">=", Timestamp.fromDate(start)),
      where("operationDate", "<=", Timestamp.fromDate(end)),
      orderBy("operationDate", "asc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const ops = snap.docs.map((d) => d.data() as OperationDoc);
      setOperations(ops);

      // Load RR records for these operations
      if (ops.length > 0) {
        const opIds = ops.map((o) => o.id).filter(Boolean);
        if (opIds.length > 0) {
          // Firestore 'in' limited to 30
          const chunks = [];
          for (let i = 0; i < opIds.length; i += 30) {
            chunks.push(opIds.slice(i, i + 30));
          }
          const map = new Map<string, RRRecordDoc>();
          for (const chunk of chunks) {
            const rrQ = query(
              collection(db, "rrRecords"),
              where("operationId", "in", chunk)
            );
            const rrSnap = await getDocs(rrQ);
            rrSnap.docs.forEach((d) => {
              const rr = d.data() as RRRecordDoc;
              map.set(rr.operationId, rr);
            });
          }
          setRrMap(map);
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, [dateFilter]);

  const opsWithRR = operations.filter((o) => rrMap.has(o.id));
  const opsWithoutRR = operations.filter((o) => !rrMap.has(o.id));

  return (
    <AppShell requiredRoles={["rr_incharge", "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium text-gray-900 tracking-tight">RR Summary</h1>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : operations.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center text-sm text-gray-500">
            ไม่มีเคสในวันที่เลือก
          </div>
        ) : (
          <>
            {/* Pending RR */}
            {opsWithoutRR.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-medium text-amber-700 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  รอกรอก RR ({opsWithoutRR.length})
                </h2>
                <div className="space-y-2">
                  {opsWithoutRR.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => router.push(`/rr-summary/new/${op.id}`)}
                      className="flex w-full items-center gap-4 rounded-2xl bg-white border border-amber-100 px-5 py-4 text-left hover:border-amber-200 hover:shadow-sm transition-all"
                    >
                      <div className="h-10 w-1 rounded-full bg-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{op.procedureName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {op.surgeon} · {op.mainGroup} · {op.durationMinutes} min
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        กรอก RR
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Completed RR */}
            {opsWithRR.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  กรอกแล้ว ({opsWithRR.length})
                </h2>
                <div className="space-y-2">
                  {opsWithRR.map((op) => {
                    const rr = rrMap.get(op.id)!;
                    return (
                      <button
                        key={op.id}
                        onClick={() => router.push(`/rr-summary/new/${op.id}`)}
                        className="flex w-full items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-4 text-left hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <div className="h-10 w-1 rounded-full bg-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{op.procedureName}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {op.surgeon} · NRS {rr.painScoreNRS} · {rr.postOpRoute}
                          </div>
                        </div>
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-600">
                          ✓ เสร็จ
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
