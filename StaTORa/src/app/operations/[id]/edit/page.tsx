// src/app/operations/[id]/edit/page.tsx
"use client";

import { useState, useMemo, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Field, Select, TextInput, Toggle, PillSelect, Textarea } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useDropdownList, useProceduresByMainGroup } from "@/hooks/useDropdowns";
import { getOperation, updateOperation } from "@/lib/firestore";
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
  OperationDoc,
} from "@/types/database";

interface ORFormState {
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
  postOpDiagnosis: DiagnosisGroup | "";
  gender: Gender | "";
  ageRange: AgeRange | "";
  asaClass: ASAClass | "";
  operatingRoom: string;
  scrubNurse: string;
  circulateNurse: string;
  ebl: string;
  gestationalAge: string;
  unplannedICU: boolean;
  fluidBalance: "" | "<500" | "500-1000" | ">1000";
  unplannedAdmission: boolean;
  isNotesAssistHysterectomy: boolean;
}

function toTimeString(ts: any): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function opDocToForm(op: OperationDoc): ORFormState {
  return {
    operationDate: op.operationDate.toDate().toISOString().split("T")[0],
    mainGroup: op.mainGroup,
    urgency: op.urgency,
    procedureName: op.procedureName,
    diagnosisGroup: op.diagnosisGroup,
    surgeon: op.surgeon,
    startTime: toTimeString(op.startTime),
    endTime: toTimeString(op.endTime),
    anesthesiaType: op.anesthesiaType,
    hasComplication: op.hasComplication,
    complicationNote: op.complicationNote || "",
    postOpDiagnosis: op.postOpDiagnosis || "",
    gender: op.gender || "",
    ageRange: op.ageRange || "",
    asaClass: op.asaClass || "",
    operatingRoom: op.operatingRoom || "",
    scrubNurse: op.scrubNurse || "",
    circulateNurse: op.circulateNurse || "",
    ebl: op.ebl !== undefined ? String(op.ebl) : "",
    gestationalAge: op.gestationalAge !== undefined ? String(op.gestationalAge) : "",
    unplannedICU: op.unplannedICU || false,
    fluidBalance: op.fluidBalance || "",
    unplannedAdmission: op.unplannedAdmission || false,
    isNotesAssistHysterectomy: op.isNotesAssistHysterectomy || false,
  };
}

export default function EditOperationPage() {
  const router = useRouter();
  const params = useParams();
  const operationId = params.id as string;

  const { user } = useAuth();
  const [form, setForm] = useState<ORFormState | null>(null);
  const [originalOp, setOriginalOp] = useState<OperationDoc | null>(null);
  const [loadingOp, setLoadingOp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing operation
  useEffect(() => {
    if (!operationId) return;
    getOperation(operationId).then((op) => {
      if (!op) {
        setSaveMsg({ type: "error", text: "ไม่พบข้อมูลเคสนี้" });
        setLoadingOp(false);
        return;
      }
      setOriginalOp(op);
      setForm(opDocToForm(op));
      setLoadingOp(false);
    });
  }, [operationId]);

  const { procedures } = useProceduresByMainGroup((form?.mainGroup as MainGroup) || null);

  // ถ้า procedureName เดิมไม่อยู่ใน dropdown ให้เพิ่มเข้าไปชั่วคราว
  const proceduresWithCurrent = useMemo(() => {
    if (!form?.procedureName) return procedures;
    const exists = procedures.some((p) => p.value === form.procedureName);
    if (exists) return procedures;
    return [
      { value: form.procedureName, label: form.procedureName, isActive: true, sortOrder: -1 },
      ...procedures,
    ];
  }, [procedures, form?.procedureName]);

  const { items: surgeons } = useDropdownList("surgeons");
  const { items: scrubNurses } = useDropdownList("scrubNurses");
  const { items: circulateNurses } = useDropdownList("circulateNurses");
  const { items: operatingRooms } = useDropdownList("operatingRooms");

  const durationMinutes = useMemo(() => {
    if (!form?.startTime || !form?.endTime) return null;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  }, [form?.startTime, form?.endTime]);

  const isOB = form?.mainGroup === "OB";
  const isHystero = form?.mainGroup === "HYSTERO";
  const isNotes = form?.mainGroup === "NOTES";

  const set = <K extends keyof ORFormState>(key: K, val: ORFormState[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: val } : prev);
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleMainGroupChange = (val: string) => {
    set("mainGroup", val as MainGroup);
    set("procedureName", "");
  };

  const validate = (): boolean => {
    if (!form) return false;
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
    if (form.hasComplication && !form.complicationNote.trim()) errs.complicationNote = "กรุณาระบุรายละเอียด complication";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !validate()) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const opDate = new Date(form.operationDate);
      const [sh, sm] = (form.startTime || "0:0").split(":").map(Number);
      const [eh, em] = (form.endTime || "0:0").split(":").map(Number);
      const startDate = new Date(opDate); startDate.setHours(sh, sm, 0);
      const endDate = new Date(opDate); endDate.setHours(eh, em, 0);

      await updateOperation(operationId, {
        operationDate: Timestamp.fromDate(opDate),
        mainGroup: form.mainGroup as MainGroup,
        urgency: form.urgency as Urgency,
        procedureName: form.procedureName,
        diagnosisGroup: form.diagnosisGroup as DiagnosisGroup,
        surgeon: form.surgeon,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        anesthesiaType: form.anesthesiaType as AnesthesiaTypeOR,
        hasComplication: form.hasComplication,
        complicationNote: form.complicationNote,

        postOpDiagnosis: (form.postOpDiagnosis || undefined) as DiagnosisGroup | undefined,
        gender: (form.gender || undefined) as Gender | undefined,
        ageRange: (form.ageRange || undefined) as AgeRange | undefined,
        asaClass: (form.asaClass || undefined) as ASAClass | undefined,
        operatingRoom: form.operatingRoom || undefined,
        scrubNurse: form.scrubNurse || undefined,
        circulateNurse: form.circulateNurse || undefined,

        ...(isOB && form.ebl && { ebl: parseInt(form.ebl) }),
        ...(isOB && form.gestationalAge && { gestationalAge: parseFloat(form.gestationalAge) }),
        ...(isOB && { unplannedICU: form.unplannedICU }),

        ...(isHystero && form.fluidBalance && { fluidBalance: form.fluidBalance as "<500" | "500-1000" | ">1000" }),
        ...(isHystero && { unplannedAdmission: form.unplannedAdmission }),

        ...(isNotes && { isNotesAssistHysterectomy: form.isNotesAssistHysterectomy }),
      });

      setSaveMsg({ type: "success", text: "แก้ไขสำเร็จ" });
      setTimeout(() => router.back(), 1200);
    } catch (err: any) {
      setSaveMsg({ type: "error", text: "บันทึกไม่สำเร็จ: " + (err.message || "unknown error") });
    } finally {
      setSaving(false);
    }
  };

  if (loadingOp) {
    return (
      <AppShell requiredRoles={["statistician", "super_admin"]}>
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!form) {
    return (
      <AppShell requiredRoles={["statistician", "super_admin"]}>
        <div className="px-4 py-8 text-center text-sm text-gray-500">ไม่พบข้อมูลเคสนี้</div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredRoles={["statistician", "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-xl font-medium text-gray-900 tracking-tight">แก้ไข Operation</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8 ml-9">
          {originalOp?.procedureName} · {originalOp?.operationDate.toDate().toLocaleDateString("th-TH")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: ข้อมูลหลัก */}
          <Section title="ข้อมูลหลัก">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="วันที่ผ่าตัด" required error={errors.operationDate}>
                <TextInput type="date" value={form.operationDate} onChange={(v) => set("operationDate", v)} />
              </Field>
              <Field label="ห้องผ่าตัด">
                <Select value={form.operatingRoom} onChange={(v) => set("operatingRoom", v)} options={operatingRooms.map((r) => ({ value: r.value, label: r.label }))} placeholder="เลือกห้อง" />
              </Field>
            </div>
            <Field label="Main Group" required error={errors.mainGroup}>
              <PillSelect value={form.mainGroup} onChange={handleMainGroupChange} options={MAIN_GROUPS.map((g) => ({ value: g, label: g }))} />
            </Field>
            <Field label="ประเภท" required error={errors.urgency}>
              <PillSelect value={form.urgency} onChange={(v) => set("urgency", v as Urgency)} options={URGENCY_TYPES.map((u) => ({ value: u, label: u }))} />
            </Field>
            <Field label="หัตถการ" required error={errors.procedureName}>
              <Select value={form.procedureName} onChange={(v) => set("procedureName", v)} options={proceduresWithCurrent.map((p) => ({ value: p.value, label: p.label }))} placeholder={form.mainGroup ? "เลือกหัตถการ" : "เลือก Main Group ก่อน"} disabled={!form.mainGroup} />
            </Field>
          </Section>

          {/* Section 2: ผู้ป่วย & ทีม */}
          <Section title="ข้อมูลผู้ป่วย & ทีมผ่าตัด">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Pre-op Diagnosis" required error={errors.diagnosisGroup}>
                <Select value={form.diagnosisGroup} onChange={(v) => set("diagnosisGroup", v as DiagnosisGroup)} options={DIAGNOSIS_GROUPS.map((d) => ({ value: d, label: d }))} placeholder="เลือก Diagnosis" />
              </Field>
              <Field label="Post-op Diagnosis">
                <Select value={form.postOpDiagnosis} onChange={(v) => set("postOpDiagnosis", v as DiagnosisGroup | "")} options={[{ value: "", label: "—" }, ...DIAGNOSIS_GROUPS.map((d) => ({ value: d, label: d }))]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="เพศ">
                <Select value={form.gender} onChange={(v) => set("gender", v as Gender | "")} options={[{ value: "", label: "—" }, ...GENDER_OPTIONS.map((g) => ({ value: g, label: g }))]} />
              </Field>
              <Field label="ช่วงอายุ">
                <Select value={form.ageRange} onChange={(v) => set("ageRange", v as AgeRange | "")} options={[{ value: "", label: "—" }, ...AGE_RANGES.map((a) => ({ value: a, label: a }))]} />
              </Field>
              <Field label="ASA Class">
                <Select value={form.asaClass} onChange={(v) => set("asaClass", v as ASAClass | "")} options={[{ value: "", label: "—" }, ...ASA_CLASSES.map((a) => ({ value: a, label: `ASA ${a}` }))]} />
              </Field>
            </div>
            <Field label="แพทย์ผ่าตัด" required error={errors.surgeon}>
              <Select value={form.surgeon} onChange={(v) => set("surgeon", v)} options={surgeons.map((s) => ({ value: s.value, label: s.label }))} placeholder="เลือกแพทย์" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Scrub Nurse">
                <Select value={form.scrubNurse} onChange={(v) => set("scrubNurse", v)} options={[{ value: "", label: "—" }, ...scrubNurses.map((s) => ({ value: s.value, label: s.label }))]} />
              </Field>
              <Field label="Circulate Nurse">
                <Select value={form.circulateNurse} onChange={(v) => set("circulateNurse", v)} options={[{ value: "", label: "—" }, ...circulateNurses.map((s) => ({ value: s.value, label: s.label }))]} />
              </Field>
            </div>
          </Section>

          {/* Section 3: เวลา & Anesthesia */}
          <Section title="เวลาผ่าตัด & การระงับความรู้สึก">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="เวลาเริ่ม" required error={errors.startTime}>
                <TextInput type="time" value={form.startTime} onChange={(v) => set("startTime", v)} />
              </Field>
              <Field label="เวลาสิ้นสุด" required error={errors.endTime}>
                <TextInput type="time" value={form.endTime} onChange={(v) => set("endTime", v)} />
              </Field>
              <div className="flex items-end pb-1">
                {durationMinutes !== null && (
                  <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 w-full text-center">
                    <span className="text-lg font-mono font-medium text-teal-700">{durationMinutes}</span>
                    <span className="text-xs text-teal-600 ml-1">นาที</span>
                  </div>
                )}
              </div>
            </div>
            <Field label="วิธีระงับความรู้สึก" required error={errors.anesthesiaType}>
              <PillSelect value={form.anesthesiaType} onChange={(v) => set("anesthesiaType", v as AnesthesiaTypeOR)} options={ANESTHESIA_TYPES_OR.map((a) => ({ value: a, label: a }))} />
            </Field>
          </Section>

          {/* Section 4: Complication */}
          <Section title="Complication">
            <Toggle checked={form.hasComplication} onChange={(v) => set("hasComplication", v)} label="มี Complication" description="ระบุหากมีภาวะแทรกซ้อนระหว่าง/หลังผ่าตัด" />
            {form.hasComplication && (
              <Field label="รายละเอียด Complication" required error={errors.complicationNote}>
                <Textarea value={form.complicationNote} onChange={(v) => set("complicationNote", v)} placeholder="ระบุรายละเอียด..." rows={3} />
              </Field>
            )}
          </Section>

          {/* Section 5: OB specific */}
          {isOB && (
            <Section title="ข้อมูลเฉพาะ OB/C/S" accent="amber">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="EBL (cc)" hint="≥1000 cc = PPH">
                  <TextInput type="number" value={form.ebl} onChange={(v) => set("ebl", v)} placeholder="0" min={0} />
                  {form.ebl && parseInt(form.ebl) >= 1000 && (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-600 font-medium">PPH</span>
                  )}
                </Field>
                <Field label="Gestational Age (weeks)" hint="<37 weeks = Preterm">
                  <TextInput type="number" value={form.gestationalAge} onChange={(v) => set("gestationalAge", v)} placeholder="40" min={20} max={44} step={0.1} />
                  {form.gestationalAge && parseFloat(form.gestationalAge) < 37 && (
                    <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 font-medium">Preterm</span>
                  )}
                </Field>
              </div>
              <Toggle checked={form.unplannedICU} onChange={(v) => set("unplannedICU", v)} label="Unplanned ICU admission" />
            </Section>
          )}

          {/* Section 6: Hystero specific */}
          {isHystero && (
            <Section title="ข้อมูลเฉพาะ Hysteroscopy" accent="purple">
              <Field label="Fluid Balance (cc)">
                <PillSelect value={form.fluidBalance} onChange={(v) => set("fluidBalance", v as ORFormState["fluidBalance"])} options={[{ value: "<500", label: "<500 cc" }, { value: "500-1000", label: "500-1000 cc" }, { value: ">1000", label: ">1000 cc" }]} />
              </Field>
              <Toggle checked={form.unplannedAdmission} onChange={(v) => set("unplannedAdmission", v)} label="Unplanned admission" description="รับเข้า admit โดยไม่ได้วางแผน" />
            </Section>
          )}

          {/* Section 7: NOTES specific */}
          {isNotes && (
            <Section title="ข้อมูลเฉพาะ NOTEs" accent="blue">
              <Toggle checked={form.isNotesAssistHysterectomy} onChange={(v) => set("isNotesAssistHysterectomy", v)} label="NOTEs Assist to Hysterectomy" description="นับเฉพาะกรณี NOTEs assist to hysterectomy เท่านั้น" />
            </Section>
          )}

          {/* Save message */}
          {saveMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm ${saveMsg.type === "success" ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
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
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />กำลังบันทึก...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>บันทึกการแก้ไข</>
              )}
            </button>
            <button type="button" onClick={() => router.back()} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Section({ title, accent, children }: { title: string; accent?: "teal" | "amber" | "purple" | "blue"; children: React.ReactNode }) {
  const borderColors = { teal: "border-l-teal-400", amber: "border-l-amber-400", purple: "border-l-purple-400", blue: "border-l-blue-400" };
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-5 ${accent ? `border-l-4 ${borderColors[accent]}` : ""}`}>
      <h2 className="text-base font-medium text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
