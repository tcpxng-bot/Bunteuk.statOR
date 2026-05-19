// src/app/committees/record/[operationId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Field, Select, Toggle, TextInput, Textarea } from "@/components/FormFields";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOperation,
  getRRRecordByOperationId,
  getCommitteeIndicator,
  createCommitteeIndicator,
  updateCommitteeIndicator,
} from "@/lib/firestore";
import {
  OperationDoc,
  RRRecordDoc,
  CommitteeIndicatorDoc,
  CommitteeType,
  interpretPainScore,
} from "@/types/database";
import { getCommitteeConfig, CommitteeConfig, IndicatorField } from "@/lib/committeeConfig";

const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDate(ts: any): string {
  if (!ts || !ts.toDate) return "-";
  const d = ts.toDate();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function CommitteeRecordPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const operationId = params.operationId as string;
  const committeeType = searchParams.get("type") as CommitteeType;
  const { user } = useAuth();

  const config = committeeType ? getCommitteeConfig(committeeType) : undefined;

  const [operation, setOperation] = useState<OperationDoc | null>(null);
  const [rr, setRR] = useState<RRRecordDoc | null>(null);
  const [existing, setExisting] = useState<CommitteeIndicatorDoc | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [preventableNote, setPreventableNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!committeeType || !config) return;

    const load = async () => {
      try {
        const [op, rrRec, ind] = await Promise.all([
          getOperation(operationId),
          getRRRecordByOperationId(operationId),
          getCommitteeIndicator(operationId, committeeType),
        ]);
        setOperation(op);
        setRR(rrRec);
        setExisting(ind);

        if (ind) {
          // Populate form from existing
          const vals: Record<string, any> = {};
          for (const f of [...config.manualIndicators, ...(config.extraFields || [])]) {
            vals[f.key] = (ind as any)[f.key] ?? (f.type === "boolean" ? false : "");
          }
          setFormValues(vals);
          setPreventableNote(ind.preventableIncidentNote || "");
        } else {
          // Initialize defaults
          const vals: Record<string, any> = {};
          for (const f of [...config.manualIndicators, ...(config.extraFields || [])]) {
            vals[f.key] = f.type === "boolean" ? false : "";
          }
          setFormValues(vals);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [operationId, committeeType]);

  if (!config || !committeeType) {
    return (
      <AppShell>
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          ไม่พบประเภทกรรมการ
        </div>
      </AppShell>
    );
  }

  const setValue = (key: string, val: any) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      const data: Record<string, any> = {
        operationId,
        committeeType,
        ...formValues,
        createdBy: user?.uid || "",
      };

      // Add preventable note if preventableIncident is true
      if (formValues.preventableIncident) {
        data.preventableIncidentNote = preventableNote;
      }

      if (existing) {
        await updateCommitteeIndicator(existing.id, data);
      } else {
        await createCommitteeIndicator(data as any);
      }

      setSaveMsg({ type: "success", text: "บันทึกตัวชี้วัดสำเร็จ" });
      setTimeout(() => router.push(config.href), 1000);
    } catch (err: any) {
      setSaveMsg({ type: "error", text: "บันทึกไม่สำเร็จ: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell requiredRoles={[config.role, "super_admin"]}>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!operation) {
    return (
      <AppShell requiredRoles={[config.role, "super_admin"]}>
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500 text-sm">ไม่พบ Operation นี้</p>
          <button
            onClick={() => router.push(config.href)}
            className="mt-4 text-teal-600 text-sm hover:underline"
          >
            กลับหน้ากรรมการ {config.label}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredRoles={[config.role, "super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl">
        {/* Back button */}
        <button
          onClick={() => router.push(config.href)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          กลับ {config.label}
        </button>

        <h1 className="text-xl font-medium text-gray-900 mb-1 tracking-tight">
          {existing ? "แก้ไข" : "บันทึก"}ตัวชี้วัด — {config.label}
        </h1>

        {/* Operation info card */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 mb-8 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-gray-900">{operation.procedureName}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{operation.surgeon}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{formatDate(operation.operationDate)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 font-mono">{operation.durationMinutes} min</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{operation.mainGroup}</span>
            {operation.hasComplication && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Complication</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Manual indicators */}
          {config.manualIndicators.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-4">
              <h2 className="text-base font-medium text-gray-900">
                ตัวชี้วัด (กรอกเอง)
              </h2>

              {config.manualIndicators.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={formValues[field.key]}
                  onChange={(val) => setValue(field.key, val)}
                />
              ))}

              {/* Preventable incident note */}
              {formValues.preventableIncident && (
                <Field label="รายละเอียดอุบัติการณ์">
                  <Textarea
                    value={preventableNote}
                    onChange={setPreventableNote}
                    placeholder="ระบุรายละเอียด..."
                  />
                </Field>
              )}
            </div>
          )}

          {/* Extra fields */}
          {config.extraFields && config.extraFields.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-4">
              <h2 className="text-base font-medium text-gray-900">
                ข้อมูลเพิ่มเติม
              </h2>

              {config.extraFields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={formValues[field.key]}
                  onChange={(val) => setValue(field.key, val)}
                />
              ))}
            </div>
          )}

          {/* C/S specific auto-flags */}
          {config.type === "CS" && (
            <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-3">
              <h2 className="text-base font-medium text-gray-900">
                ข้อมูลจาก Operation (auto)
              </h2>
              <AutoFlag
                label="EBL (cc)"
                value={operation.ebl != null ? `${operation.ebl} cc` : "-"}
                flag={operation.isPPH ? "PPH" : undefined}
              />
              <AutoFlag
                label="Gestational Age"
                value={operation.gestationalAge != null ? `${operation.gestationalAge} สัปดาห์` : "-"}
                flag={operation.isPreterm ? "Preterm" : undefined}
              />
              <AutoFlag
                label="Unplanned ICU"
                value={operation.unplannedICU ? "ใช่" : "ไม่"}
                flag={operation.unplannedICU ? "ICU" : undefined}
              />
            </div>
          )}

          {/* Hystero specific */}
          {config.type === "HYSTERO" && (
            <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-3">
              <h2 className="text-base font-medium text-gray-900">
                ข้อมูลจาก Operation (auto)
              </h2>
              <AutoFlag
                label="Fluid Balance"
                value={operation.fluidBalance || "-"}
                flag={operation.fluidBalance === ">1000" ? ">1000cc" : undefined}
              />
              <AutoFlag
                label="Unplanned Admission"
                value={operation.unplannedAdmission ? "ใช่" : "ไม่"}
                flag={operation.unplannedAdmission ? "Unplanned" : undefined}
              />
            </div>
          )}

          {/* RR Data (read-only) */}
          {config.rrIndicators.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-medium text-gray-900">
                  ข้อมูลจาก RR
                </h2>
                {rr ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    มีข้อมูล
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    ยังไม่มี
                  </span>
                )}
              </div>

              {rr ? (
                <>
                  {config.rrIndicators.map((field) => (
                    <RRDataRow
                      key={field.key}
                      label={field.label}
                      value={(rr as any)[field.key]}
                      type="boolean"
                    />
                  ))}

                  {/* Pain score */}
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <RRDataRow
                      label="Pain Score NRS"
                      value={rr.painScoreNRS}
                      type="number"
                    />
                    <div className="mt-1 ml-4">
                      <span className="text-xs text-gray-400">
                        Interpretation ({config.label}):{" "}
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {interpretPainScore(config.type, rr.painScoreNRS)}
                      </span>
                    </div>
                    <RRDataRow
                      label="Pain Score VRS"
                      value={
                        rr.painScoreVRS === "NO_PAIN" ? "ไม่เจ็บ" :
                        rr.painScoreVRS === "MILD" ? "เล็กน้อย" :
                        rr.painScoreVRS === "MODERATE" ? "ปานกลาง" :
                        rr.painScoreVRS === "SEVERE" ? "มาก" : rr.painScoreVRS
                      }
                      type="text"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 py-2">
                  RR Incharge ยังไม่ได้กรอกข้อมูล RR สำหรับเคสนี้
                </p>
              )}
            </div>
          )}

          {/* Save */}
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

          {/* Only show save button if there are manual indicators or extra fields */}
          {(config.manualIndicators.length > 0 || (config.extraFields && config.extraFields.length > 0)) && (
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
                "บันทึกตัวชี้วัด"
              )}
            </button>
          )}
        </form>
      </div>
    </AppShell>
  );
}

// ── Sub-components ──

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: IndicatorField;
  value: any;
  onChange: (val: any) => void;
}) {
  switch (field.type) {
    case "boolean":
      return (
        <Toggle
          checked={!!value}
          onChange={onChange}
          label={field.label}
        />
      );

    case "select":
      return (
        <Field label={field.label}>
          <Select
            value={value || ""}
            onChange={onChange}
            options={field.options || []}
            placeholder="เลือก..."
          />
        </Field>
      );

    case "text":
      return (
        <Field label={field.label}>
          <TextInput
            value={value || ""}
            onChange={onChange}
            placeholder="ระบุ..."
          />
        </Field>
      );

    default:
      return null;
  }
}

function AutoFlag({
  label,
  value,
  flag,
}: {
  label: string;
  value: string;
  flag?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-gray-900">{value}</span>
        {flag && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
            {flag}
          </span>
        )}
      </div>
    </div>
  );
}

function RRDataRow({
  label,
  value,
  type,
}: {
  label: string;
  value: any;
  type: "boolean" | "number" | "text";
}) {
  let displayValue: string;
  let color = "text-gray-900";

  if (type === "boolean") {
    displayValue = value ? "มี" : "ไม่มี";
    if (value) color = "text-red-600 font-medium";
  } else if (type === "number") {
    displayValue = String(value ?? "-");
  } else {
    displayValue = value ?? "-";
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-mono ${color}`}>{displayValue}</span>
    </div>
  );
}
