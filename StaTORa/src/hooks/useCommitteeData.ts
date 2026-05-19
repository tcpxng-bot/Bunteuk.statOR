// src/hooks/useCommitteeData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  OperationDoc,
  RRRecordDoc,
  CommitteeIndicatorDoc,
  CommitteeType,
} from "@/types/database";
import { CommitteeConfig } from "@/lib/committeeConfig";

interface UseCommitteeDataOptions {
  config: CommitteeConfig;
  year: number;
  month: number;
}

interface CommitteeDataRow {
  operation: OperationDoc;
  rr: RRRecordDoc | null;
  indicator: CommitteeIndicatorDoc | null;
}

export function useCommitteeData({ config, year, month }: UseCommitteeDataOptions) {
  const [rows, setRows] = useState<CommitteeDataRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Load operations matching this committee's filter
      let ops: OperationDoc[] = [];

      if (config.filterMainGroups && config.filterMainGroups.length > 0) {
        // Filter by main group
        for (const mg of config.filterMainGroups) {
          const q = query(
            collection(db, "operations"),
            where("year", "==", year),
            where("month", "==", month),
            where("mainGroup", "==", mg),
            orderBy("operationDate", "desc")
          );
          const snap = await getDocs(q);
          ops.push(...snap.docs.map((d) => d.data() as OperationDoc));
        }
      } else if (config.filterPostOpDiagnosis && config.filterPostOpDiagnosis.length > 0) {
        // Filter by post-op diagnosis
        for (const diag of config.filterPostOpDiagnosis) {
          const q = query(
            collection(db, "operations"),
            where("year", "==", year),
            where("month", "==", month),
            where("postOpDiagnosis", "==", diag),
            orderBy("operationDate", "desc")
          );
          const snap = await getDocs(q);
          ops.push(...snap.docs.map((d) => d.data() as OperationDoc));
        }
      } else if (config.filterProcedures && config.filterProcedures.length > 0) {
        // Load all ops for the month, then filter by procedure name client-side
        const q = query(
          collection(db, "operations"),
          where("year", "==", year),
          where("month", "==", month),
          orderBy("operationDate", "desc")
        );
        const snap = await getDocs(q);
        const allOps = snap.docs.map((d) => d.data() as OperationDoc);
        ops = allOps.filter((op) =>
          config.filterProcedures!.some(
            (p) => op.procedureName.toUpperCase().includes(p.toUpperCase())
          )
        );
      } else {
        // No filter — load all for the month
        const q = query(
          collection(db, "operations"),
          where("year", "==", year),
          where("month", "==", month),
          orderBy("operationDate", "desc")
        );
        const snap = await getDocs(q);
        ops = snap.docs.map((d) => d.data() as OperationDoc);
      }

      // Deduplicate by id
      const opMap = new Map<string, OperationDoc>();
      ops.forEach((op) => opMap.set(op.id, op));
      ops = Array.from(opMap.values());

      if (ops.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const opIds = ops.map((o) => o.id).filter(Boolean);

      // 2) Load RR records
      const rrMap = new Map<string, RRRecordDoc>();
      for (let i = 0; i < opIds.length; i += 30) {
        const chunk = opIds.slice(i, i + 30);
        const rrQ = query(
          collection(db, "rrRecords"),
          where("operationId", "in", chunk)
        );
        const rrSnap = await getDocs(rrQ);
        rrSnap.docs.forEach((d) => {
          const rr = d.data() as RRRecordDoc;
          rrMap.set(rr.operationId, rr);
        });
      }

      // 3) Load committee indicators
      const indMap = new Map<string, CommitteeIndicatorDoc>();
      for (let i = 0; i < opIds.length; i += 30) {
        const chunk = opIds.slice(i, i + 30);
        const indQ = query(
          collection(db, "committeeIndicators"),
          where("committeeType", "==", config.type),
          where("operationId", "in", chunk)
        );
        const indSnap = await getDocs(indQ);
        indSnap.docs.forEach((d) => {
          const ind = d.data() as CommitteeIndicatorDoc;
          indMap.set(ind.operationId, ind);
        });
      }

      // 4) Combine
      const combined: CommitteeDataRow[] = ops.map((op) => ({
        operation: op,
        rr: rrMap.get(op.id) || null,
        indicator: indMap.get(op.id) || null,
      }));

      // Sort by date desc
      combined.sort((a, b) => {
        const da = a.operation.operationDate?.toMillis?.() || 0;
        const db2 = b.operation.operationDate?.toMillis?.() || 0;
        return db2 - da;
      });

      setRows(combined);
    } catch (err) {
      console.error("Error loading committee data:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config.type, year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { rows, loading, reload: loadData };
}

// ── Summary stats helper ──
export function computeCommitteeSummary(rows: CommitteeDataRow[], config: CommitteeConfig) {
  const total = rows.length;
  const withIndicators = rows.filter((r) => r.indicator !== null).length;
  const withRR = rows.filter((r) => r.rr !== null).length;

  // Count positive indicators
  const indicatorCounts: Record<string, number> = {};
  for (const field of [...config.manualIndicators, ...(config.extraFields || [])]) {
    if (field.type === "boolean") {
      indicatorCounts[field.key] = rows.filter(
        (r) => r.indicator && (r.indicator as any)[field.key] === true
      ).length;
    }
  }

  // Count RR positive conditions
  const rrCounts: Record<string, number> = {};
  for (const field of config.rrIndicators) {
    rrCounts[field.key] = rows.filter(
      (r) => r.rr && (r.rr as any)[field.key] === true
    ).length;
  }

  // C/S-specific: count PPH and Preterm from operations
  const pphCount = rows.filter((r) => r.operation.isPPH).length;
  const pretermCount = rows.filter((r) => r.operation.isPreterm).length;

  // Pain score summary
  const painScores = rows
    .filter((r) => r.rr)
    .map((r) => r.rr!.painScoreNRS);

  return {
    total,
    withIndicators,
    withRR,
    indicatorCounts,
    rrCounts,
    pphCount,
    pretermCount,
    painScores,
  };
}
