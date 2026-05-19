// src/app/rr-summary/new/[operationId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Field, Select, PillSelect, Toggle, TextInput, Textarea } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import { getOperation, createRRRecord, getRRRecordByOperationId, updateRRRecord } from "@/lib/firestore";
import {
  OperationDoc,
  RRRecordDoc,
  ANESTHESIA_TYPES_RR,
  AnesthesiaTypeRR,
} from "@/types/database";

interface RRFormState {
  postOpRoute: string;
  anesthesiaType: string;
  airway: string;
  patientLevel: string;
  hasChill: boolean;
  hasHypothermia: boolean;
  hasHypoxia: boolean;
  painScoreNRS: string;
  painScoreVRS: string;
  preOpPainScoreNRS: string;
}

const INITIAL: RRFormState = {
  postOpRoute: "",
  anesthesiaType: "",
  airway: "",
  patientLevel: "",
  hasChill: false,
  hasHypothermia: false,
  hasHypoxia: false,
  painScoreNRS: "",
  painScoreVRS: "",
  preOpPainScoreNRS: "",
};

const POST_OP_ROUTES = [
  { value: "RR", label: "RR" },
  { value: "ICU_NO_RR", label: "ICU (ไม่ผ่าน RR)" },
  { value: "ER_CONDITION_RR", label: "ER condition → RR" },
  { value: "HOME", label: "กลับบ้าน" },
  { value: "UNPLANNED_ICU", label: "Unplanned ICU" },
];

const AIRWAY_OPTIONS = [
  { value: "ON_ETT_FROM_OR", label: "On ETT จาก OR" },
  { value: "RETUBE_IN_RR", label: "Retube ใน RR" },
  { value: "NONE", label: "ไม่มี" },
];

const PATIENT_LEVELS = [
  { value: "LEVEL_1", label: "Level 1" },
  { value: "LEVEL_2", label: "Level 2" },
  { value: "LEVEL_3", label: "Level 3" },
  { value: "LEVEL_4", label: "Level 4" },
];

const VRS_OPTIONS = [
  { value: "NO_PAIN", label: "ไม่เจ็บ" },
  { value: "MILD", label: "เจ็บเล็กน้อย" },
  { value: "MODERATE", label: "เจ็บปานกลาง" },
  { value: "SEVERE", label: "เจ็บมาก" },
];

export default function RRFormPage() {
  const router = useRouter();
  const params = useParams();
  const operationId = params.operationId as string;
  const { user } = useAuth();

  const [operation, setOperation] = useState<OperationDoc | null>(null);
  const [existingRR, setExistingRR] = useState<RRRecordDoc | null>(null);
  const [form, setForm] = useState<RRFormState>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load operation & existing RR
  useEffect(() => {
    const load = async () => {
      try {
        const [op, rr] = await Promise.all([
          getOperation(operationId),
          getRRRecordByOperationId(operationId),
        ]);
        setOperation(op);
        setExistingRR(rr);

        if (rr) {
          setForm({
            postOpRoute: rr.postOpRoute,
            anesthesiaType: rr.anesthesiaType,
            airway: rr.airway,
            patientLevel: rr.patientLevel,
            hasChill: rr.hasChill,
            hasHypothermia: rr.hasHypothermia,
            hasHypoxia: rr.hasHypoxia,
            painScoreNRS: String(rr.painScoreNRS),
            painScoreVRS: rr.painScoreVRS,
            preOpPainScoreNRS: rr.preOpPainScoreNRS != null ? String(rr.preOpPainScoreNRS) : "",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [operationId]);

  const set = <K extends keyof RRFormState>(key: K, val: RRFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const isLHTLH = operation?.mainGroup === "LAP_SURG" || operation?.procedureName?.includes("LH") || operation?.procedureName?.includes("TLH");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      const data = {
        operationId,
        postOpRoute: form.postOpRoute as RRRecordDoc["postOpRoute"],
        anesthesiaType: form.anesthesiaType as AnesthesiaTypeRR,
        airway: form.airway as RRRecordDoc["airway"],
        patientLevel: form.patientLevel as RRRecordDoc["patientLevel"],
        hasChill: form.hasChill,
        hasHypothermia: form.hasHypothermia,
        hasHypoxia: form.hasHypoxia,
        painScoreNRS: parseInt(form.painScoreNRS) || 0,
        painScoreVRS: form.painScoreVRS as RRRecordDoc["painScoreVRS"],
        ...(isLHTLH && form.preOpPainScoreNRS && { preOpPainScoreNRS: parseInt(form.preOpPainScoreNRS) }),
        createdBy: user?.uid || "",
      };

      if (existingRR) {
        await updateRRRecord(existingRR.id, data);
      } else {
        await createRRRecord(data);
      }

      setSaveMsg({ type: "success", text: "บันทึก RR สำเร็จ" });
      setTimeout(() => router.push("/rr-summary"), 1000);
    } catch (err: any) {
      setSaveMsg({ type: "error", text: "บันทึกไม่สำเร็จ: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell requiredRoles={["rr_incharge", "super_admin"]}>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!operation) {
    return (
      <AppShell requiredRoles={["rr_incharge", "super_admin"]}>
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">ไม่พบ Operation นี้</p>
          <button onClick={() => router.push("/rr-summary")} className="mt-4 text-teal-600 text-sm hover:underline">
            กลับหน้า RR Summary
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredRoles={["rr_incharge", "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl">
        <h1 className="text-xl font-medium text-gray-900 mb-1 tracking-tight">
          {existingRR ? "แก้ไข" : "บันทึก"} RR Record
        </h1>

        {/* Operation info card */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 mb-8 text-sm">
          <span className="font-medium text-gray-900">{operation.procedureName}</span>
          <span className="text-gray-400 mx-2">·</span>
          <span className="text-gray-500">{operation.surgeon}</span>
          <span className="text-gray-400 mx-2">·</span>
          <span className="text-gray-500 font-mono">{operation.durationMinutes} min</span>
          <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{operation.mainGroup}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Post-op route & Anesthesia */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-5">
            <h2 className="text-base font-medium text-gray-900">ข้อมูล RR</h2>

            <Field label="Post-op route" required>
              <PillSelect
                value={form.postOpRoute}
                onChange={(v) => set("postOpRoute", v)}
                options={POST_OP_ROUTES}
              />
            </Field>

            <Field label="Anesthesia Type" required>
              <PillSelect
                value={form.anesthesiaType}
                onChange={(v) => set("anesthesiaType", v)}
                options={ANESTHESIA_TYPES_RR.map((a) => ({ value: a, label: a }))}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Airway" required>
                <Select
                  value={form.airway}
                  onChange={(v) => set("airway", v)}
                  options={AIRWAY_OPTIONS}
                  placeholder="เลือก..."
                />
              </Field>

              <Field label="Patient Level" required>
                <Select
                  value={form.patientLevel}
                  onChange={(v) => set("patientLevel", v)}
                  options={PATIENT_LEVELS}
                  placeholder="เลือก..."
                />
              </Field>
            </div>
          </div>

          {/* Post-op conditions */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-4">
            <h2 className="text-base font-medium text-gray-900">ภาวะหลังผ่าตัด</h2>

            <Toggle
              checked={form.hasChill}
              onChange={(v) => set("hasChill", v)}
              label="Chill / สั่น"
            />
            <Toggle
              checked={form.hasHypothermia}
              onChange={(v) => set("hasHypothermia", v)}
              label="Hypothermia (<36°C)"
            />
            <Toggle
              checked={form.hasHypoxia}
              onChange={(v) => set("hasHypoxia", v)}
              label="Hypoxia"
            />
          </div>

          {/* Pain scores */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-5">
            <h2 className="text-base font-medium text-gray-900">Pain Score</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="NRS (0-10)" required>
                <TextInput
                  type="number"
                  value={form.painScoreNRS}
                  onChange={(v) => set("painScoreNRS", v)}
                  placeholder="0"
                  min={0}
                  max={10}
                />
                {form.painScoreNRS && (
                  <NRSIndicator score={parseInt(form.painScoreNRS)} />
                )}
              </Field>

              <Field label="VRS" required>
                <Select
                  value={form.painScoreVRS}
                  onChange={(v) => set("painScoreVRS", v)}
                  options={VRS_OPTIONS}
                  placeholder="เลือก..."
                />
              </Field>
            </div>

            {/* LH&TLH pre-op pain score comparison */}
            {isLHTLH && (
              <Field label="Pre-op NRS (สำหรับ LH&TLH เปรียบเทียบ)">
                <TextInput
                  type="number"
                  value={form.preOpPainScoreNRS}
                  onChange={(v) => set("preOpPainScoreNRS", v)}
                  placeholder="0"
                  min={0}
                  max={10}
                />
              </Field>
            )}
          </div>

          {/* Save */}
          {saveMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              saveMsg.type === "success" ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-700"
            }`}>
              {saveMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-medium text-white hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก RR Record"
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function NRSIndicator({ score }: { score: number }) {
  const color =
    score <= 3 ? "text-green-600 bg-green-50" :
    score <= 5 ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";

  const label =
    score === 0 ? "ไม่เจ็บ" :
    score <= 3 ? "เจ็บเล็กน้อย" :
    score <= 5 ? "เจ็บปานกลาง" :
    score <= 7 ? "เจ็บมาก" :
    "เจ็บรุนแรง";

  return (
    <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
