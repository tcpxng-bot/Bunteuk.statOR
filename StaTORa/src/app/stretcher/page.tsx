// src/app/stretcher/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/AppShell";
import { Field, Select, TextInput } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useDropdownList } from "@/hooks/useDropdowns";
import { createPreOpCase, updatePreOpCase, deletePreOpCase } from "@/lib/firestore";
import { PreOpCaseDoc } from "@/types/database";

// Default date — ศุกร์ → จันทร์, เสาร์ → จันทร์, อื่นๆ → พรุ่งนี้
function getDefaultOpDate(): string {
  const today = new Date();
  const day = today.getDay();
  const daysAhead = day === 5 ? 3 : day === 6 ? 2 : 1;
  const d = new Date(today);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

function formatDateTH(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function StretcherPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cases, setCases] = useState<PreOpCaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Selected date to view/add cases
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultOpDate());

  // Form state
  const [procName, setProcName] = useState("");
  const [surgeon, setSurgeon] = useState("");
  const [preOpDx, setPreOpDx] = useState("");
  const [hnLast3, setHnLast3] = useState("");
  const [opDate, setOpDate] = useState<string>(getDefaultOpDate());
  const [patientType, setPatientType] = useState<"OPD" | "IPD">("OPD");
  const [planConsultUro, setPlanConsultUro] = useState(false);
  const [planConsultColo, setPlanConsultColo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusModal, setStatusModal] = useState<{ id: string; current?: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const { items: surgeons } = useDropdownList("surgeons");

  // Load cases for selected date
  useEffect(() => {
    const date = new Date(selectedDate);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
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
  }, [selectedDate]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deletePreOpCase(id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const date = new Date(opDate);
      date.setHours(8, 0, 0, 0);
      await createPreOpCase({
        operationDate: Timestamp.fromDate(date),
        procedureName: procName,
        surgeon,
        preOpDiagnosis: preOpDx,
        hnLast3,
        setReady: false,
        chargeWritten: false,
        patientType,
        planConsultUro,
        planConsultColo,
        createdBy: user?.uid || "",
      });
      setProcName(""); setSurgeon(""); setPreOpDx(""); setHnLast3("");
      setPatientType("OPD"); setPlanConsultUro(false); setPlanConsultColo(false);
      // Switch view to the date we just added
      setSelectedDate(opDate);
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

  const updateStatus = async (id: string, status: "success" | "postponed" | "cancelled", note: string) => {
    await updatePreOpCase(id, { surgeryStatus: status, surgeryStatusNote: note });
    setStatusModal(null);
    setStatusNote("");
  };

  return (
    <AppShell requiredRoles={["stretcher_unit", "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium text-gray-900 tracking-tight">หน่วยเปล</h1>
          <button
            onClick={() => { setOpDate(getDefaultOpDate()); setShowAdd(!showAdd); }}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            เพิ่มเคส
          </button>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setLoading(true); }}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
          <p className="text-sm text-gray-400">{formatDateTH(selectedDate)}</p>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">เพิ่มเคสใหม่</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Date picker for new case */}
              <Field label="วันผ่าตัด" required>
                <input
                  type="date"
                  value={opDate}
                  onChange={(e) => setOpDate(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="หัตถการ" required>
                  <TextInput value={procName} onChange={setProcName} placeholder="ชื่อหัตถการ" />
                </Field>
                <Field label="แพทย์ผ่าตัด" required>
                  <Select value={surgeon} onChange={setSurgeon}
                    options={surgeons.map((s) => ({ value: s.value, label: s.label }))}
                    placeholder="เลือกแพทย์" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pre-op Diagnosis">
                  <TextInput value={preOpDx} onChange={setPreOpDx} placeholder="Diagnosis" />
                </Field>
                <Field label="HN 3 ตัวท้าย" required>
                  <TextInput value={hnLast3}
                    onChange={(v) => setHnLast3(v.replace(/\D/g, "").slice(0, 3))}
                    placeholder="123" />
                </Field>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">ประเภทผู้ป่วย</p>
                <div className="flex gap-2">
                  {(["OPD", "IPD"] as const).map((type) => (
                    <button key={type} type="button" onClick={() => setPatientType(type)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${patientType === type ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">Plan Consult ล่วงหน้า</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={planConsultUro} onChange={(e) => setPlanConsultUro(e.target.checked)} className="rounded" />
                    Urology
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={planConsultColo} onChange={(e) => setPlanConsultColo(e.target.checked)} className="rounded" />
                    Colorectal
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !procName || !surgeon || !hnLast3}
                  className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "กำลังบันทึก..." : "เพิ่มเคส"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  ยกเลิก
                </button>
              </div>
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
            ยังไม่มีเคสในวันที่เลือก
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{c.procedureName}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{c.surgeon}</span>
                    <span>·</span>
                    <span>HN-xxxx{c.hnLast3}</span>
                    {c.preOpDiagnosis && <><span>·</span><span>{c.preOpDiagnosis}</span></>}
                    {c.patientType && <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c.patientType === "IPD" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-500"}`}>{c.patientType}</span>}
                    {c.planConsultUro && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Plan Uro</span>}
                    {c.planConsultColo && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Plan Colo</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => router.push(`/operations/new?preOpCaseId=${c.id}`)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                  >
                    + OR
                  </button>
                  <button
                    onClick={() => { setStatusModal({ id: c.id, current: c.surgeryStatus }); setStatusNote(c.surgeryStatusNote || ""); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      c.surgeryStatus === "success" ? "bg-green-50 text-green-700" :
                      c.surgeryStatus === "postponed" ? "bg-amber-50 text-amber-700" :
                      c.surgeryStatus === "cancelled" ? "bg-red-50 text-red-600" :
                      "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {c.surgeryStatus === "success" ? "✓ สำเร็จ" :
                     c.surgeryStatus === "postponed" ? "⏸ เลื่อน" :
                     c.surgeryStatus === "cancelled" ? "✕ งด" : "ผลผ่าตัด"}
                  </button>
                  <button onClick={() => toggleField(c.id, "setReady", c.setReady)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${c.setReady ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                    {c.setReady ? "✓" : "○"} Set
                  </button>
                  <button onClick={() => toggleField(c.id, "chargeWritten", c.chargeWritten)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${c.chargeWritten ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                    {c.chargeWritten ? "✓" : "○"} Charge
                  </button>
                  <button onClick={() => setDeleteConfirm(c.id)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-end gap-4 pt-2 text-xs text-gray-400">
              <span>ทั้งหมด {cases.length} เคส</span>
              <span>Set {cases.filter((c) => c.setReady).length}/{cases.length}</span>
              <span>Charge {cases.filter((c) => c.chargeWritten).length}/{cases.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-medium text-gray-900 mb-2">ลบเคสนี้?</h3>
            <p className="text-xs text-red-500 mb-6">การลบไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-60">
                {deleting ? "กำลังลบ..." : "ลบเคส"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surgery Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-medium text-gray-900 mb-4">อัปเดตผลการผ่าตัด</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                { value: "success", label: "✓ สำเร็จ", color: "bg-green-50 text-green-700 border-green-200" },
                { value: "postponed", label: "⏸ เลื่อน", color: "bg-amber-50 text-amber-700 border-amber-200" },
                { value: "cancelled", label: "✕ งด", color: "bg-red-50 text-red-600 border-red-200" },
              ] as const).map((opt) => (
                <button key={opt.value}
                  onClick={() => updateStatus(statusModal.id, opt.value, statusNote)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors ${opt.color}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)..." rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3" />
            <button onClick={() => { setStatusModal(null); setStatusNote(""); }}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
