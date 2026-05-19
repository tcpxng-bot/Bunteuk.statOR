// src/app/settings/dropdowns/page.tsx
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getDropdownList, setDropdownList } from "@/lib/firestore";
import { DropdownItem } from "@/types/database";

type ListKey = "surgeons" | "scrubNurses" | "circulateNurses" | "operatingRooms" | "procedures";

const LIST_CONFIG: { key: ListKey; label: string; placeholder: string }[] = [
  { key: "surgeons", label: "รายชื่อแพทย์", placeholder: "เช่น นพ.สมชาย ใจดี" },
  { key: "scrubNurses", label: "พยาบาล Scrub", placeholder: "เช่น พย.สมหญิง ขยัน" },
  { key: "circulateNurses", label: "พยาบาล Circulate", placeholder: "เช่น พย.สมศรี มานะ" },
  { key: "operatingRooms", label: "ห้องผ่าตัด", placeholder: "เช่น OR1, OR2" },
  { key: "procedures", label: "หัตถการ (Procedures)", placeholder: "เช่น TAH, C/S, Hysteroscopy" },
];

export default function DropdownsPage() {
  const [lists, setLists] = useState<Record<ListKey, DropdownItem[]>>({
    surgeons: [],
    scrubNurses: [],
    circulateNurses: [],
    operatingRooms: [],
    procedures: [],
  });
  const [inputs, setInputs] = useState<Record<ListKey, string>>({
    surgeons: "",
    scrubNurses: "",
    circulateNurses: "",
    operatingRooms: "",
    procedures: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ListKey | null>(null);

  useEffect(() => {
    async function load() {
      const results = await Promise.all(
        LIST_CONFIG.map((c) => getDropdownList(c.key))
      );
      const newLists = { ...lists };
      LIST_CONFIG.forEach((c, i) => {
        newLists[c.key] = results[i]?.items ?? [];
      });
      setLists(newLists);
      setLoading(false);
    }
    load();
  }, []);

  async function addItem(key: ListKey) {
    const val = inputs[key].trim();
    if (!val || lists[key].some((i) => i.value === val)) return;
    const newItem: DropdownItem = { value: val, label: val, isActive: true, sortOrder: lists[key].length };
    const newItems = [...lists[key], newItem].sort((a, b) => a.label.localeCompare(b.label, "th"));
    setSaving(key);
    await setDropdownList(key, { listName: key, items: newItems, updatedBy: "" });
    setLists((prev) => ({ ...prev, [key]: newItems }));
    setInputs((prev) => ({ ...prev, [key]: "" }));
    setSaving(null);
  }

  async function removeItem(key: ListKey, val: string) {
    const newItems = lists[key].filter((i) => i.value !== val);
    setSaving(key);
    await setDropdownList(key, { listName: key, items: newItems, updatedBy: "" });
    setLists((prev) => ({ ...prev, [key]: newItems }));
    setSaving(null);
  }

  if (loading) {
    return (
      <AppShell requiredRoles={["super_admin"]}>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredRoles={["super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium text-gray-900">จัดการ Dropdown</h1>
          <p className="text-sm text-gray-400 mt-1">เพิ่ม/ลบรายการที่ใช้ใน dropdown ต่างๆ</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {LIST_CONFIG.map((config) => (
            <div key={config.key} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-800 mb-4">{config.label}</h2>

              {/* Add input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={inputs[config.key]}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [config.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addItem(config.key)}
                  placeholder={config.placeholder}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => addItem(config.key)}
                  disabled={saving === config.key}
                  className="rounded-lg bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  + เพิ่ม
                </button>
              </div>

              {/* List */}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {lists[config.key].length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีรายการ</p>
                ) : (
                  lists[config.key].map((item) => (
                    <div key={item.value} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <button
                        onClick={() => removeItem(config.key, item.value)}
                        disabled={saving === config.key}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">{lists[config.key].length} รายการ</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
