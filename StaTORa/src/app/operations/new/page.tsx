// src/app/operations/new/page.tsx
"use client";

import { useState, useMemo, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PreOpCaseDoc } from "@/types/database";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Field, Select, TextInput, Toggle, PillSelect, Textarea } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useDropdownList, useProceduresByMainGroup } from "@/hooks/useDropdowns";
import { createOperation, createRRRecord, setDropdownList, getDropdownList, updatePreOpCase } from "@/lib/firestore";
import { DropdownItem } from "@/types/database";

// ── Inline Add Select ──────────────────────────
function InlineAddSelect({
  value, onChange, items, placeholder, listName,
}: {
  value: string;
  onChange: (v: string) => void;
  items: DropdownItem[];
  placeholder: string;
  listName: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const val = newVal.trim();
    if (!val) return;
    setSaving(true);
    const existing = await getDropdownList(listName);
    const currentItems = existing?.items ?? [];
    if (!currentItems.some((i) => i.value === val)) {
      const newItem: DropdownItem = { value: val, label: val, isActive: true, sortOrder: currentItems.length };
      await setDropdownList(listName, { listName, items: [...currentItems, newItem], updatedBy: "" });
    }
    onChange(val);
    setNewVal("");
    setAdding(false);
    setSaving(false);
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
          placeholder="พิมพ์แล้วกด Enter"
          className="flex-1 rounded-lg border border-teal-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={handleAdd} disabled={saving} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm disabled:opacity-50">
          {saving ? "..." : "เพิ่ม"}
        </button>
        <button onClick={() => setAdding(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">ยกเลิก</button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="">{placeholder}</option>
          {items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </div>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="px-3 py-2 rounded-lg border border-gray-200 text-teal-600 text-sm hover:bg-teal-50 transition-colors whitespace-nowrap"
        title="เพิ่มรายการใหม่"
      >
        + เพิ่ม
      </button>
    </div>
  );
}
import {
  MAIN_GROUPS,
  URGENCY_TYPES,
  ANESTHESIA_TYPES_OR,
  DIAGNOSIS_GROUPS,
  ASA_CLASSES,
  AGE_RANGES,
  GENDER_OPTIONS,
  MainGroup,
  Urgency,
  AnesthesiaTypeOR,
  DiagnosisGroup,
  ASAClass,
  AgeRange,
  Gender,
} from "@/types/database";

// Form state type
interface ORFormState {
  // Required
  operationDate: string;
  mainGroup: MainGroup | "";
  urgency: Urgency | "";
  procedureName: string;
  diagnosisGroup: DiagnosisGroup | "";
  surgeon: string;
  startTime: string;
  endTime: string;
  anesthesiaType: AnesthesiaTypeOR | "";
  hasComplication: boolean;
  complicationNote: string;

  // Optional
  postOpDiagnosis: DiagnosisGroup | "";
  gender: Gender | "";
  ageRange: AgeRange | "";
  asaClass: ASAClass | "";
  operatingRoom: string;
  scrubNurse: string;
  circulateNurse: string;

  // OB/C/S specific
  ebl: string;
  gestationalAge: string;
  unplannedICU: boolean;

  // Hystero specific
  fluidBalance: "" | "<500" | "500-1000" | ">1000";
  unplannedAdmission: boolean;

  // NOTES specific
  isNotesAssistHysterectomy: boolean;

  // Post-op transfer & consult
  postOpTransfer: "RR" | "ICU_NO_RR" | "ER_CONDITION_RR" | "HOME" | "UNPLANNED_ICU" | "";
  unplannedConsult: boolean;
  preOpCaseId: string;
}

const INITIAL_STATE: ORFormState = {
  operationDate: new Date().toISOString().split("T")[0],
  mainGroup: "",
  urgency: "",
  procedureName: "",
  diagnosisGroup: "",
  surgeon: "",
  startTime: "",
  endTime: "",
  anesthesiaType: "",
  hasComplication: false,
  complicationNote: "",
  postOpDiagnosis: "",
  gender: "",
  ageRange: "",
  asaClass: "",
  operatingRoom: "",
  scrubNurse: "",
  circulateNurse: "",
  ebl: "",
  gestationalAge: "",
  unplannedICU: false,
  fluidBalance: "",
  unplannedAdmission: false,
  isNotesAssistHysterectomy: false,
  postOpTransfer: "",
  unplannedConsult: false,
  preOpCaseId: "",
};

function NewOperationPageInner({ preOpId }: { preOpId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<ORFormState>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Pre-fill from หน่วยเปล case — preOpId passed as prop from parent
  useEffect(() => {
    if (!preOpId) return;
    getDoc(doc(db, "preOpCases", preOpId)).then((snap) => {
      if (!snap.exists()) return;
      const c = snap.data() as PreOpCaseDoc;
      setForm((prev) => ({
        ...prev,
        procedureName: c.procedureName || prev.procedureName,
        surgeon: c.surgeon || prev.surgeon,
        diagnosisGroup: (c.preOpDiagnosis as any) || prev.diagnosisGroup,
        preOpCaseId: preOpId,
      }));
    });
  }, [preOpId]);

  // Dropdowns
  const { procedures } = useProceduresByMainGroup(form.mainGroup as MainGroup || null);
  const { items: surgeons } = useDropdownList("surgeons");
  const { items: scrubNurses } = useDropdownList("scrubNurses");
  const { items: circulateNurses } = useDropdownList("circulateNurses");
  const { items: operatingRooms } = useDropdownList("operatingRooms");

  // Computed duration
  const durationMinutes = useMemo(() => {
    if (!form.startTime || !form.endTime) return null;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  }, [form.startTime, form.endTime]);

  // Show conditional sections
  const isOB = form.mainGroup === "OB";
  const isHystero = form.mainGroup === "HYSTERO";
  const isNotes = form.mainGroup === "NOTES";

  // Update field
  const set = <K extends keyof ORFormState>(key: K, val: ORFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Reset procedure when mainGroup changes
  const handleMainGroupChange = (val: string) => {
    set("mainGroup", val as MainGroup);
    set("procedureName", "");
  };

  // Validate
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.operationDate) errs.operationDate = "กรุณาเลือกวันที่";
    if (!form.mainGroup) errs.mainGroup = "กรุณาเลือก Main Group";
    if (!form.urgency) errs.urgency = "กรุณาเลือกประเภท";
    if (!form.procedureName) errs.procedureName = "กรุณาเลือกหัตถการ";
    if (!form.diagnosisGroup) errs.diagnosisGroup = "กรุณาเลือก Diagnosis";
    if (!form.surgeon) errs.surgeon = "กรุณาเลือกแพทย์ผ่าตัด";
    if (!form.startTime) errs.startTime = "กรุณาระบุเวลาเริ่ม";
    if (!form.endTime) errs.endTime = "กรุณาระบุเวลาสิ้นสุด";
    if (!form.anesthesiaType) errs.anesthesiaType = "กรุณาเลือกวิธีระงับความรู้สึก";
    if (form.hasComplication && !form.complicationNote.trim()) {
      errs.complicationNote = "กรุณาระบุรายละเอียด complication";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit
  const handleSubmit = async (e: FormEvent, status: "draft" | "confirmed") => {
    e.preventDefault();
    if (status === "confirmed" && !validate()) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const opDate = new Date(form.operationDate);
      const [sh, sm] = (form.startTime || "0:0").split(":").map(Number);
      const [eh, em] = (form.endTime || "0:0").split(":").map(Number);

      const startDate = new Date(opDate);
      startDate.setHours(sh, sm, 0);
      const endDate = new Date(opDate);
      endDate.setHours(eh, em, 0);

      const newOpId = await createOperation({
        operationDate: Timestamp.fromDate(opDate),
        mainGroup: form.mainGroup as MainGroup,
        urgency: (form.urgency || "Elective") as Urgency,
        procedureName: form.procedureName,
        diagnosisGroup: (form.diagnosisGroup || "Benign") as DiagnosisGroup,
        surgeon: form.surgeon,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        anesthesiaType: (form.anesthesiaType || "GA") as AnesthesiaTypeOR,
        hasComplication: form.hasComplication,
        complicationNote: form.complicationNote,

        // Optional
        ...(form.postOpDiagnosis && { postOpDiagnosis: form.postOpDiagnosis as DiagnosisGroup }),
        ...(form.gender && { gender: form.gender as Gender }),
        ...(form.ageRange && { ageRange: form.ageRange as AgeRange }),
        ...(form.asaClass && { asaClass: form.asaClass as ASAClass }),
        ...(form.operatingRoom && { operatingRoom: form.operatingRoom }),
        ...(form.scrubNurse && { scrubNurse: form.scrubNurse }),
        ...(form.circulateNurse && { circulateNurse: form.circulateNurse }),

        // OB
        ...(isOB && form.ebl && { ebl: parseInt(form.ebl) }),
        ...(isOB && form.gestationalAge && { gestationalAge: parseFloat(form.gestationalAge) }),
        ...(isOB && { unplannedICU: form.unplannedICU }),

        // Hystero
        ...(isHystero && form.fluidBalance && { fluidBalance: form.fluidBalance as "<500" | "500-1000" | ">1000" }),
        ...(isHystero && { unplannedAdmission: form.unplannedAdmission }),

        // NOTES
        ...(isNotes && { isNotesAssistHysterectomy: form.isNotesAssistHysterectomy }),

        // Post-op transfer & consult
        ...(form.postOpTransfer && { postOpTransfer: form.postOpTransfer as any }),
        unplannedConsult: form.unplannedConsult,
        ...(form.preOpCaseId && { preOpCaseId: form.preOpCaseId }),

        createdBy: user?.uid || "",
        status,
      });

      // ถ้า transfer ไม่ผ่าน RR → auto-create RR record
      if (form.postOpTransfer && form.postOpTransfer !== "RR" && newOpId) {
        await createRRRecord({
          operationId: newOpId,
          postOpRoute: form.postOpTransfer as any,
          anesthesiaType: (form.anesthesiaType || "GA") as any,
          airway: "NONE",
          patientLevel: "LEVEL_2",
          hasChill: false,
          hasHypothermia: false,
          hasHypoxia: false,
          painScoreNRS: 0,
          painScoreVRS: "NO_PAIN",
          createdBy: user?.uid || "",
          isAutoFilled: true,
        });
      }

      // link preOpCase กับ operation ที่สร้าง
      if (form.preOpCaseId && newOpId) {
        await updatePreOpCase(form.preOpCaseId, { operationId: newOpId });
      }

      setSaveMsg({ type: "success", text: `บันทึก${status === "confirmed" ? "สำเร็จ" : " draft สำเร็จ"}` });

      if (status === "confirmed") {
        setTimeout(() => router.push("/"), 1200);
      } else {
        setForm(INITIAL_STATE);
      }
    } catch (err: any) {
      console.error(err);
      setSaveMsg({ type: "error", text: "บันทึกไม่สำเร็จ: " + (err.message || "unknown error") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell requiredRoles={["statistician", "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl">
        <h1 className="text-xl font-medium text-gray-900 mb-1 tracking-tight">
          บันทึก Operation
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          กรอกข้อมูลหัตถการ — ช่องที่มี <span className="text-red-400">*</span> ต้องกรอก
        </p>

        <form onSubmit={(e) => handleSubmit(e, "confirmed")} className="space-y-8">
          {/* ═══════════════════════════════
              Section 1: ข้อมูลหลัก
          ═══════════════════════════════ */}
          <Section title="ข้อมูลหลัก">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="วันที่ผ่าตัด" required error={errors.operationDate}>
                <TextInput
                  type="date"
                  value={form.operationDate}
                  onChange={(v) => set("operationDate", v)}
                />
              </Field>

              <Field label="ห้องผ่าตัด">
                <Select
                  value={form.operatingRoom}
                  onChange={(v) => set("operatingRoom", v)}
                  options={operatingRooms.map((r) => ({ value: r.value, label: r.label }))}
                  placeholder="เลือกห้อง"
                />
              </Field>
            </div>

            <Field label="Main Group" required error={errors.mainGroup}>
              <PillSelect
                value={form.mainGroup}
                onChange={handleMainGroupChange}
                options={MAIN_GROUPS.map((g) => ({ value: g, label: g }))}
              />
            </Field>

            <Field label="ประเภท" required error={errors.urgency}>
              <PillSelect
                value={form.urgency}
                onChange={(v) => set("urgency", v as Urgency)}
                options={URGENCY_TYPES.map((u) => ({ value: u, label: u }))}
              />
            </Field>

            <Field label="หัตถการ" required error={errors.procedureName}>
              {form.mainGroup ? (
                <InlineAddSelect
                  value={form.procedureName}
                  onChange={(v) => set("procedureName", v)}
                  items={procedures}
                  placeholder="เลือกหรือพิมพ์เพิ่มหัตถการ"
                  listName="procedures"
                />
              ) : (
                <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  เลือก Main Group ก่อน
                </div>
              )}
            </Field>
          </Section>

          {/* ═══════════════════════════════
              Section 2: ข้อมูลผู้ป่วย & แพทย์
          ═══════════════════════════════ */}
          <Section title="ข้อมูลผู้ป่วย & ทีมผ่าตัด">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Pre-op Diagnosis" required error={errors.diagnosisGroup}>
                <Select
                  value={form.diagnosisGroup}
                  onChange={(v) => set("diagnosisGroup", v as ORFormState["diagnosisGroup"])}
                  options={DIAGNOSIS_GROUPS.map((d) => ({ value: d, label: d }))}
                  placeholder="เลือก Diagnosis"
                />
              </Field>

              <Field label="Post-op Diagnosis">
                <Select
                  value={form.postOpDiagnosis}
                  onChange={(v) => set("postOpDiagnosis", v as ORFormState["postOpDiagnosis"])}
                  options={[
                    { value: "", label: "—" },
                    ...DIAGNOSIS_GROUPS.map((d) => ({ value: d, label: d })),
                  ]}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="เพศ">
                <Select
                  value={form.gender}
                  onChange={(v) => set("gender", v as ORFormState["gender"])}
                  options={[
                    { value: "", label: "—" },
                    ...GENDER_OPTIONS.map((g) => ({ value: g, label: g })),
                  ]}
                />
              </Field>

              <Field label="ช่วงอายุ">
                <Select
                  value={form.ageRange}
                  onChange={(v) => set("ageRange", v as ORFormState["ageRange"])}
                  options={[
                    { value: "", label: "—" },
                    ...AGE_RANGES.map((a) => ({ value: a, label: a })),
                  ]}
                />
              </Field>

              <Field label="ASA Class">
                <Select
                  value={form.asaClass}
                  onChange={(v) => set("asaClass", v as ORFormState["asaClass"])}
                  options={[
                    { value: "", label: "—" },
                    ...ASA_CLASSES.map((a) => ({ value: a, label: `ASA ${a}` })),
                  ]}
                />
              </Field>
            </div>

            <Field label="แพทย์ผ่าตัด" required error={errors.surgeon}>
              <InlineAddSelect
                value={form.surgeon}
                onChange={(v) => set("surgeon", v)}
                items={surgeons}
                placeholder="เลือกแพทย์"
                listName="surgeons"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Scrub Nurse">
                <InlineAddSelect
                  value={form.scrubNurse}
                  onChange={(v) => set("scrubNurse", v)}
                  items={scrubNurses}
                  placeholder="เลือก Scrub Nurse"
                  listName="scrubNurses"
                />
              </Field>

              <Field label="Circulate Nurse">
                <InlineAddSelect
                  value={form.circulateNurse}
                  onChange={(v) => set("circulateNurse", v)}
                  items={circulateNurses}
                  placeholder="เลือก Circulate Nurse"
                  listName="circulateNurses"
                />
              </Field>
            </div>
          </Section>

          {/* ═══════════════════════════════
              Section 3: เวลา & Anesthesia
          ═══════════════════════════════ */}
          <Section title="เวลาผ่าตัด & การระงับความรู้สึก">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="เวลาเริ่ม" required error={errors.startTime}>
                <TextInput
                  type="time"
                  value={form.startTime}
                  onChange={(v) => set("startTime", v)}
                />
              </Field>

              <Field label="เวลาสิ้นสุด" required error={errors.endTime}>
                <TextInput
                  type="time"
                  value={form.endTime}
                  onChange={(v) => set("endTime", v)}
                />
              </Field>

              <div className="flex items-end pb-1">
                {durationMinutes !== null && (
                  <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 w-full text-center">
                    <span className="text-lg font-mono font-medium text-teal-700">
                      {durationMinutes}
                    </span>
                    <span className="text-xs text-teal-600 ml-1">นาที</span>
                  </div>
                )}
              </div>
            </div>

            <Field label="วิธีระงับความรู้สึก" required error={errors.anesthesiaType}>
              <PillSelect
                value={form.anesthesiaType}
                onChange={(v) => set("anesthesiaType", v as AnesthesiaTypeOR)}
                options={ANESTHESIA_TYPES_OR.map((a) => ({ value: a, label: a }))}
              />
            </Field>
          </Section>

          {/* ═══════════════════════════════
              Section 4: Complication
          ═══════════════════════════════ */}
          <Section title="Complication & Consult">
            <Toggle
              checked={form.hasComplication}
              onChange={(v) => set("hasComplication", v)}
              label="มี Complication"
              description="ระบุหากมีภาวะแทรกซ้อนระหว่าง/หลังผ่าตัด"
            />

            {form.hasComplication && (
              <Field label="รายละเอียด Complication" required error={errors.complicationNote}>
                <Textarea
                  value={form.complicationNote}
                  onChange={(v) => set("complicationNote", v)}
                  placeholder="ระบุรายละเอียด..."
                  rows={3}
                />
              </Field>
            )}

            <Toggle
              checked={form.unplannedConsult}
              onChange={(v) => set("unplannedConsult", v)}
              label="Unplanned Consult in OR"
              description="มีการ consult โดยไม่ได้วางแผนล่วงหน้า"
            />
          </Section>

          {/* Post-op Transfer */}
          <Section title="ย้ายผู้ป่วยหลังผ่าตัด">
            <Field label="ย้ายไปที่" hint="เลือกเส้นทางหลังผ่าตัด">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  { value: "RR", label: "ไป RR" },
                  { value: "ICU_NO_RR", label: "ICU (ไม่ผ่าน RR)" },
                  { value: "ER_CONDITION_RR", label: "ER Condition RR" },
                  { value: "HOME", label: "กลับบ้าน" },
                  { value: "UNPLANNED_ICU", label: "Unplanned ICU" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("postOpTransfer", form.postOpTransfer === opt.value ? "" : opt.value)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium border transition-colors ${
                      form.postOpTransfer === opt.value
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            {form.postOpTransfer && form.postOpTransfer !== "RR" && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ ระบบจะ auto-บันทึก RR record ให้อัตโนมัติ — RR Incharge สามารถแก้ไขเพิ่มเติมได้ภายหลัง
              </p>
            )}
          </Section>

          {/* ═══════════════════════════════
              Section 5: OB specific
          ═══════════════════════════════ */}
          {isOB && (
            <Section title="ข้อมูลเฉพาะ OB/C/S" accent="amber">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="EBL (cc)" hint="Estimated Blood Loss — ≥1000 cc = PPH">
                  <TextInput
                    type="number"
                    value={form.ebl}
                    onChange={(v) => set("ebl", v)}
                    placeholder="0"
                    min={0}
                  />
                  {form.ebl && parseInt(form.ebl) >= 1000 && (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-600 font-medium">
                      PPH
                    </span>
                  )}
                </Field>

                <Field label="Gestational Age (weeks)" hint="<37 weeks = Preterm">
                  <TextInput
                    type="number"
                    value={form.gestationalAge}
                    onChange={(v) => set("gestationalAge", v)}
                    placeholder="40"
                    min={20}
                    max={44}
                    step={0.1}
                  />
                  {form.gestationalAge && parseFloat(form.gestationalAge) < 37 && (
                    <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 font-medium">
                      Preterm
                    </span>
                  )}
                </Field>
              </div>

              <Toggle
                checked={form.unplannedICU}
                onChange={(v) => set("unplannedICU", v)}
                label="Unplanned ICU admission"
              />
            </Section>
          )}

          {/* ═══════════════════════════════
              Section 6: Hystero specific
          ═══════════════════════════════ */}
          {isHystero && (
            <Section title="ข้อมูลเฉพาะ Hysteroscopy" accent="purple">
              <Field label="Fluid Balance (cc)">
                <PillSelect
                  value={form.fluidBalance}
                  onChange={(v) => set("fluidBalance", v as ORFormState["fluidBalance"])}
                  options={[
                    { value: "<500", label: "<500 cc" },
                    { value: "500-1000", label: "500-1000 cc" },
                    { value: ">1000", label: ">1000 cc" },
                  ]}
                />
              </Field>

              <Toggle
                checked={form.unplannedAdmission}
                onChange={(v) => set("unplannedAdmission", v)}
                label="Unplanned admission"
                description="รับเข้า admit โดยไม่ได้วางแผน"
              />
            </Section>
          )}

          {/* ═══════════════════════════════
              Section 7: NOTES specific
          ═══════════════════════════════ */}
          {isNotes && (
            <Section title="ข้อมูลเฉพาะ NOTEs" accent="blue">
              <Toggle
                checked={form.isNotesAssistHysterectomy}
                onChange={(v) => set("isNotesAssistHysterectomy", v)}
                label="NOTEs Assist to Hysterectomy"
                description="นับเฉพาะกรณี NOTEs assist to hysterectomy เท่านั้น"
              />
            </Section>
          )}

          {/* ═══════════════════════════════
              Save message + buttons
          ═══════════════════════════════ */}
          {saveMsg && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                saveMsg.type === "success"
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}
            >
              {saveMsg.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-medium text-white hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  บันทึก (Confirmed)
                </>
              )}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e as any, "draft")}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              บันทึก Draft
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════
// Section wrapper
// ═══════════════════════════════

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: "teal" | "amber" | "purple" | "blue";
  children: React.ReactNode;
}) {
  const borderColors = {
    teal: "border-l-teal-400",
    amber: "border-l-amber-400",
    purple: "border-l-purple-400",
    blue: "border-l-blue-400",
  };

  return (
    <div
      className={`rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-5 ${
        accent ? `border-l-4 ${borderColors[accent]}` : ""
      }`}
    >
      <h2 className="text-base font-medium text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function SearchParamsReader() {
  const searchParams = useSearchParams();
  const preOpId = searchParams.get("from") ?? undefined;
  return <NewOperationPageInner preOpId={preOpId} />;
}

export default function NewOperationPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" /></div>}>
      <SearchParamsReader />
    </Suspense>
  );
}
