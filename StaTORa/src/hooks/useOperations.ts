// src/hooks/useOperations.ts
"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OperationDoc, PreOpCaseDoc, MainGroup } from "@/types/database";

interface UseOperationsOptions {
  date?: Date;
  year?: number;
  month?: number;
  mainGroup?: MainGroup;
  enabled?: boolean;
}

export function useOperations(options: UseOperationsOptions = {}) {
  const { date, year, month, mainGroup, enabled = true } = options;
  const [operations, setOperations] = useState<OperationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [];

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      constraints.push(
        where("operationDate", ">=", Timestamp.fromDate(start)),
        where("operationDate", "<=", Timestamp.fromDate(end))
      );
    } else {
      if (year) constraints.push(where("year", "==", year));
      if (month) constraints.push(where("month", "==", month));
    }

    if (mainGroup) {
      constraints.push(where("mainGroup", "==", mainGroup));
    }

    constraints.push(orderBy("operationDate", "desc"));

    const q = query(collection(db, "operations"), ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      setOperations(snap.docs.map((d) => d.data() as OperationDoc));
      setLoading(false);
    });

    return () => unsub();
  }, [date?.toISOString(), year, month, mainGroup, enabled]);

  return { operations, loading };
}

export function useTodayOperations() {
  return useOperations({ date: new Date() });
}

export function useTomorrowPreOpCases() {
  const [cases, setCases] = useState<PreOpCaseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "preOpCases"),
      where("operationDate", ">=", Timestamp.fromDate(start)),
      where("operationDate", "<=", Timestamp.fromDate(end)),
      orderBy("operationDate", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setCases(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PreOpCaseDoc)));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { cases, loading };
}
