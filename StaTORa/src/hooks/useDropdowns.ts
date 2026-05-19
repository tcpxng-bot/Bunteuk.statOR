// src/hooks/useDropdowns.ts
"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DropdownListDoc, DropdownItem, MainGroup } from "@/types/database";

export function useDropdownList(listName: string) {
  const [items, setItems] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "dropdownLists", listName), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DropdownListDoc;
        setItems(
          data.items
            .filter((i) => i.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
      }
      setLoading(false);
    });
    return () => unsub();
  }, [listName]);

  return { items, loading };
}

export function useProceduresByMainGroup(mainGroup: MainGroup | null) {
  const { items, loading } = useDropdownList("procedures");

  const filtered = mainGroup
    ? items.filter((i) => i.mainGroup === mainGroup)
    : items;

  return { procedures: filtered, loading };
}
