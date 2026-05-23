// src/app/operations/new/page.tsx
"use client";

import { useState, useMemo, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Field, Select, TextInput, Toggle, PillSelect, Textarea } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useDropdownList, useProceduresByMainGroup } from "@/hooks/useDropdowns";
import { createOperation, getPreOpCase } from "@/lib/firestore";
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
  PreOpCaseDoc,
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

  // Custom input toggles
  useCustomProcedure: boolean;
  procedureNameCustom: string;
  useCustomDiagnosis: boolean;
  diagnosisGroupCustom: string;
  useCustomPostOpDiagnosis: boolean;
  postOpDiagnosisCustom: string;

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
  useCustomProcedure: false,
  procedureNameCustom: "",
  useCustomDiagnosis: false,
  diagnosisGroupCustom: "",
  useCustomPostOpDiagnosis: false,
  postOpDiagnosisCustom: "",
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
};

function NewOperationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preOpCaseId = searchParams.get("preOpCaseId");

  const { user } = useAuth();
  const [form, setForm] = useState<ORFormState>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preOpCase, setPreOpCase] = useState<PreOpCaseDoc | null>(null);

  // Pre-fill form จากข้อมูลหน่วยเปล ถ้ามี preOpCaseId ใน query param
  useEffect(() => {
    if (!preOpCaseId) return;
    getPreOpCase(preOpCaseId).then((c) => {
      if (!c) return;
      setPreOpCase(c);
      setForm((prev) => ({
        ...prev,
        // ใช้ custom input เสมอสำหรับ pre-fill เพราะข้อมูลอาจไม่ match dropdown
        useCustomProcedure: true,
        procedureNameCustom: c.procedureName,
        useCustomDiagnosis: !!c.preOpDiagnosis,
        diagnosisGroupCustom: c.preOpDiagnosis || "",
        surgeon: c.surgeon,
        operationDate: c.operationDate.toDate().toISOString().split("T")[0],
      }));
    });
  }, [preOpCaseId]);

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

  // Effective values
  const effectiveProcedure = form.useCustomProcedure ? form.procedureNameCustom : form.procedureName;
  const effectiveDiagnosis = form.useCustomDiagnosis ? form.diagnosisGroupCustom : form.diagnosisGroup;
  const effectivePostOpDiagnosis = form.useCustomPostOpDiagnosis ? form.postOpDiagnosisCustom : form.postOpDiagnosis;

  // Validate
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.operationDate) errs.operationDate = "กรุณาเลือกวันที่";
    if (!form.mainGroup) errs.mainGroup = "กรุณาเลือก Main Group";
    if (!form.urgency) errs.urgency = "กรุณาเลือกประเภท";
    if (!effectiveProcedure) errs.procedureName = "กรุณาระบุหัตถการ";
    if (!effectiveDiagnosis) errs.diagnosisGroup = "กรุณาระบุ Diagnosis";
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

      await createOperation({
        operationDate: Timestamp.fromDate(opDate),
        mainGroup: form.mainGroup as MainGroup,
        urgency: (form.urgency || "Elective") as Urgency,
        procedureName: effectiveProcedure,
        diagnosisGroup: (effectiveDiagnosis || "Benign") as DiagnosisGroup,
        surgeon: form.surgeon,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        anesthesiaType: (form.anesthesiaType || "GA") as AnesthesiaTypeOR,
        hasComplication: form.hasComplication,
        complicationNote: form.complicationNote,

        // Optional
        ...(effectivePostOpDiagnosis && { postOpDiagnosis: effectivePostOpDiagnosis as DiagnosisGroup }),
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

        createdBy: user?.uid || "",
        status,
        // link กลับไปที่ preOpCase (ถ้ามี) → firestore จะ auto-update caseStatus
        ...(preOpCaseId && { preOpCaseId }),
      });

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
              <div className="space-y-2">
                <div className="flex gap-2 mb-1">
                  <button type="button" onClick={() => set("useCustomProcedure", false)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!form.useCustomProcedure ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    เลือกจาก list
                  </button>
                  <button type="button" onClick={() => set("useCustomProcedure", true)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.useCustomProcedure ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    พิมพ์เอง
                  </button>
                </div>
                {form.useCustomProcedure ? (
                  <TextInput value={form.procedureNameCustom} onChange={(v) => set("procedureNameCustom", v)} placeholder="ระบุหัตถการ..." />
                ) : (
                  <Select value={form.procedureName} onChange={(v) => set("procedureName", v)}
                    options={procedures.map((p) => ({ value: p.value, label: p.label }))}
                    placeholder={form.mainGroup ? "เลือกหัตถการ" : "เลือก Main Group ก่อน"}
                    disabled={!form.mainGroup} />
                )}
              </div>
            </Field>
          </Section>

          {/* ═══════════════════════════════
              Section 2: ข้อมูลผู้ป่วย & แพทย์
          ═══════════════════════════════ */}
          <Section title="ข้อมูลผู้ป่วย & ทีมผ่าตัด">
            <Field label="Pre-op Diagnosis" required error={errors.diagnosisGroup}>
              <div className="space-y-2">
                <div className="flex gap-2 mb-1">
                  <button type="button" onClick={() => set("useCustomDiagnosis", false)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!form.useCustomDiagnosis ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    เลือกจาก list
                  </button>
                  <button type="button" onClick={() => set("useCustomDiagnosis", true)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.useCustomDiagnosis ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    พิมพ์เอง
                  </button>
                </div>
                {form.useCustomDiagnosis ? (
                  <TextInput value={form.diagnosisGroupCustom} onChange={(v) => set("diagnosisGroupCustom", v)} placeholder="ระบุ diagnosis..." />
                ) : (
                  <Select value={form.diagnosisGroup} onChange={(v) => set("diagnosisGroup", v as ORFormState["diagnosisGroup"])}
                    options={DIAGNOSIS_GROUPS.map((d) => ({ value: d, label: d }))} placeholder="เลือก Diagnosis" />
                )}
              </div>
            </Field>

            <Field label="Post-op Diagnosis">
              <div className="space-y-2">
                <div className="flex gap-2 mb-1">
                  <button type="button" onClick={() => set("useCustomPostOpDiagnosis", false)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!form.useCustomPostOpDiagnosis ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    เลือกจาก list
                  </button>
                  <button type="button" onClick={() => set("useCustomPostOpDiagnosis", true)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.useCustomPostOpDiagnosis ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    พิมพ์เอง
                  </button>
                </div>
                {form.useCustomPostOpDiagnosis ? (
                  <TextInput value={form.postOpDiagnosisCustom} onChange={(v) => set("postOpDiagnosisCustom", v)} placeholder="ระบุ post-op diagnosis..." />
                ) : (
                  <Select value={form.postOpDiagnosis} onChange={(v) => set("postOpDiagnosis", v as ORFormState["postOpDiagnosis"])}
                    options={[{ value: "", label: "—" }, ...DIAGNOSIS_GROUPS.map((d) => ({ value: d, label: d }))]} />
                )}
              </div>
            </Field>

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
              <Select
                value={form.surgeon}
                onChange={(v) => set("surgeon", v)}
                options={surgeons.map((s) => ({ value: s.value, label: s.label }))}
                placeholder="เลือกแพทย์"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Scrub Nurse">
                <Select
                  value={form.scrubNurse}
                  onChange={(v) => set("scrubNurse", v)}
                  options={[
                    { value: "", label: "—" },
                    ...scrubNurses.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                />
              </Field>

              <Field label="Circulate Nurse">
                <Select
                  value={form.circulateNurse}
                  onChange={(v) => set("circulateNurse", v)}
                  options={[
                    { value: "", label: "—" },
                    ...circulateNurses.map((s) => ({ value: s.value, label: s.label })),
                  ]}
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
          <Section title="Complication">
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
// Page wrapper — Suspense required for useSearchParams
// ═══════════════════════════════

export default function NewOperationPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    }>
      <NewOperationForm />
    </Suspense>
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
