// src/hooks/usePendingCases.ts
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PreOpCaseDoc, OperationDoc, CaseStatus } from "@/types/database";

// ─── ข้อมูล pending ทั้งหมดที่ hook คืนกลับ ───
export interface PendingCaseSummary {
  // จำนวนเคสแต่ละสถานะ (ใช้แสดง badge บน Dashboard)
  pendingORCount: number;   // หน่วยเปลสร้างแล้ว รอคนเก็บสถิติกรอก OR form
  pendingRRCount: number;   // OR ครบแล้ว รอ RR Incharge กรอก
  totalPending: number;     // รวมทั้งหมดที่ยังไม่ complete

  // รายการแยกตามสถานะ
  pendingORCases: PreOpCaseDoc[];   // มาจาก preOpCases collection
  pendingRRCases: OperationDoc[];   // มาจาก operations collection

  loading: boolean;
}

// ─── Hook หลัก ────────────────────────────────
// ดึงเคสที่ยัง pending จากทั้ง 2 collections แบบ real-time
// pending_or → ดูจาก preOpCases ที่ยังไม่มี operationId
// pending_rr → ดูจาก operations ที่ caseStatus = "pending_rr"
export function usePendingCases(): PendingCaseSummary {
  const [pendingORCases, setPendingORCases] = useState<PreOpCaseDoc[]>([]);
  const [pendingRRCases, setPendingRRCases] = useState<OperationDoc[]>([]);
  const [loadingOR, setLoadingOR] = useState(true);
  const [loadingRR, setLoadingRR] = useState(true);

  // ── Listener 1: preOpCases ที่ยัง pending_or ──
  useEffect(() => {
    const q = query(
      collection(db, "preOpCases"),
      where("caseStatus", "==", "pending_or" satisfies CaseStatus),
      orderBy("operationDate", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setPendingORCases(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as PreOpCaseDoc))
      );
      setLoadingOR(false);
    });

    return () => unsub();
  }, []);

  // ── Listener 2: operations ที่ยัง pending_rr ──
  useEffect(() => {
    const q = query(
      collection(db, "operations"),
      where("caseStatus", "==", "pending_rr" satisfies CaseStatus),
      orderBy("operationDate", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setPendingRRCases(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as OperationDoc))
      );
      setLoadingRR(false);
    });

    return () => unsub();
  }, []);

  const summary = useMemo<PendingCaseSummary>(() => ({
    pendingORCount: pendingORCases.length,
    pendingRRCount: pendingRRCases.length,
    totalPending: pendingORCases.length + pendingRRCases.length,
    pendingORCases,
    pendingRRCases,
    loading: loadingOR || loadingRR,
  }), [pendingORCases, pendingRRCases, loadingOR, loadingRR]);

  return summary;
}

// ─── Hook เสริม: เฉพาะ role ที่เกี่ยวข้อง ────
// statistician → สนใจแค่ pending_or (ต้องกรอก OR form)
// rr_incharge  → สนใจแค่ pending_rr (ต้องกรอก RR form)
export function usePendingORCases() {
  const { pendingORCases, pendingORCount, loading } = usePendingCases();
  return { cases: pendingORCases, count: pendingORCount, loading };
}

export function usePendingRRCases() {
  const { pendingRRCases, pendingRRCount, loading } = usePendingCases();
  return { cases: pendingRRCases, count: pendingRRCount, loading };
}
