// src/app/stretcher/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/AppShell";
import { Field, Select, TextInput } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useDropdownList } from "@/hooks/useDropdowns";
import { createPreOpCase, updatePreOpCase } from "@/lib/firestore";
import { PreOpCaseDoc } from "@/types/database";

export default function StretcherPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<PreOpCaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [procName, setProcName] = useState("");
  const [surgeon, setSurgeon] = useState("");
  const [preOpDx, setPreOpDx] = useState("");
  const [hnLast3, setHnLast3] = useState("");
  const [saving, setSaving] = useState(false);

  const { items: surgeons } = useDropdownList("surgeons");

  // Tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
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
      setCases(snap.docs.map((d) => d.data() as PreOpCaseDoc));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const opDate = new Date(tomorrow);
      opDate.setHours(8, 0, 0, 0);
      await createPreOpCase({
        operationDate: Timestamp.fromDate(opDate),
        procedureName: procName,
        surgeon,
        preOpDiagnosis: preOpDx,
        hnLast3,
        setReady: false,
        chargeWritten: false,
        createdBy: user?.uid || "",
      });
      setProcName("");
      setSurgeon("");
      setPreOpDx("");
      setHnLast3("");
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (id: string, field: "setReady" | "chargeWritten", current: boolean) => {
    await updatePreOpCase(id, { [field]: !current });
  };

  return (
    <AppShell requiredRoles={["stretcher_unit", "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-medium text-gray-900 tracking-tight">หน่วยเปล</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            เพิ่มเคส
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-6">เคสพรุ่งนี้ — {tomorrowStr}</p>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5 mb-6">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="หัตถการ" required>
                  <TextInput
                    value={procName}
                    onChange={setProcName}
                    placeholder="ชื่อหัตถการ"
                  />
                </Field>
                <Field label="แพทย์ผ่าตัด" required>
                  <Select
                    value={surgeon}
                    onChange={setSurgeon}
                    options={surgeons.map((s) => ({ value: s.value, label: s.label }))}
                    placeholder="เลือกแพทย์"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pre-op Diagnosis">
                  <TextInput value={preOpDx} onChange={setPreOpDx} placeholder="Diagnosis" />
                </Field>
                <Field label="HN 3 ตัวท้าย" required>
                  <TextInput
                    value={hnLast3}
                    onChange={(v) => setHnLast3(v.replace(/\D/g, "").slice(0, 3))}
                    placeholder="123"
                  />
                </Field>
              </div>
              <button
                type="submit"
                disabled={saving || !procName || !surgeon || !hnLast3}
                className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "กำลังบันทึก..." : "เพิ่มเคส"}
              </button>
            </form>
          </div>
        )}

        {/* Cases list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : cases.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center text-sm text-gray-500">
            ยังไม่มีเคสพรุ่งนี้
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{c.procedureName}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{c.surgeon}</span>
                    <span>·</span>
                    <span>HN-xxxx{c.hnLast3}</span>
                    {c.preOpDiagnosis && (
                      <>
                        <span>·</span>
                        <span>{c.preOpDiagnosis}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleField(c.id, "setReady", c.setReady)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      c.setReady
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {c.setReady ? "✓" : "○"} Set
                  </button>
                  <button
                    onClick={() => toggleField(c.id, "chargeWritten", c.chargeWritten)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      c.chargeWritten
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {c.chargeWritten ? "✓" : "○"} Charge
                  </button>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="flex items-center justify-end gap-4 pt-2 text-xs text-gray-400">
              <span>ทั้งหมด {cases.length} เคส</span>
              <span>Set {cases.filter((c) => c.setReady).length}/{cases.length}</span>
              <span>Charge {cases.filter((c) => c.chargeWritten).length}/{cases.length}</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
