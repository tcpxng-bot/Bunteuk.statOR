// src/app/operations/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getOperation, updateOperation, getRRRecordByOperationId } from "@/lib/firestore";
import { OperationDoc, RRRecordDoc } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

function formatDateTime(ts: any): string {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(ts: any): string {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right max-w-xs">{value || "—"}</span>
    </div>
  );
}

export default function OperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isSuperAdmin, userDoc } = useAuth();
  const [op, setOp] = useState<OperationDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [rr, setRr] = useState<RRRecordDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getOperation(id), getRRRecordByOperationId(id)]).then(([opData, rrData]) => {
      setOp(opData);
      setRr(rrData);
      setLoading(false);
    });
  }, [id]);

  async function handleConfirm() {
    if (!op || !userDoc) return;
    setConfirming(true);
    await updateOperation(op.id, { status: "confirmed" });
    setOp((prev) => prev ? { ...prev, status: "confirmed" } : prev);
    setConfirming(false);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!op) {
    return (
      <AppShell>
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-gray-400">
          <p className="text-lg">ไม่พบข้อมูลเคสนี้</p>
          <button onClick={() => router.back()} className="text-teal-600 text-sm hover:underline">← กลับ</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
              ← กลับ
            </button>
            <h1 className="text-xl font-medium text-gray-900">{op.procedureName}</h1>
            <p className="text-sm text-gray-400 mt-1">{formatDateTime(op.operationDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              op.status === "confirmed"
                ? "bg-teal-50 text-teal-700"
                : "bg-amber-50 text-amber-600"
            }`}>
              {op.status === "confirmed" ? "✓ ยืนยันแล้ว" : "Draft"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Main Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-700 mb-3 text-sm">ข้อมูลหลัก</h2>
            <Row label="Main Group" value={
              <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full text-xs">{op.mainGroup}</span>
            } />
            <Row label="ประเภท" value={
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                op.urgency === "Elective" ? "bg-green-50 text-green-700" :
                op.urgency === "Emergency" ? "bg-red-50 text-red-600" :
                "bg-gray-100 text-gray-600"
              }`}>{op.urgency}</span>
            } />
            <Row label="หัตถการ" value={
              <div>
                <span>{op.procedureName}</span>
                {op.planChanged && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔄 เปลี่ยนแผน</span>}
              </div>
            } />
            {op.plannedProcedure && op.plannedProcedure !== op.procedureName && (
              <Row label="วางแผนไว้" value={<span className="text-gray-500 line-through">{op.plannedProcedure}</span>} />
            )}
            <Row label="แพทย์ผู้ผ่าตัด" value={op.surgeon} />
            <Row label="Pre-op Diagnosis" value={op.diagnosisGroup} />
            <Row label="Post-op Diagnosis" value={op.postOpDiagnosis} />
            <Row label="ห้องผ่าตัด" value={op.operatingRoom} />
          </div>

          {/* Time */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-700 mb-3 text-sm">เวลา</h2>
            <Row label="เริ่ม" value={formatTime(op.startTime)} />
            <Row label="สิ้นสุด" value={formatTime(op.endTime)} />
            <Row label="ระยะเวลา" value={`${op.durationMinutes} นาที`} />
            <Row label="Anesthesia" value={op.anesthesiaType} />
          </div>

          {/* Patient Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-700 mb-3 text-sm">ข้อมูลผู้ป่วย</h2>
            <Row label="เพศ" value={op.gender} />
            <Row label="ช่วงอายุ" value={op.ageRange} />
            <Row label="ASA" value={op.asaClass} />
            {op.hnLast3 && <Row label="HN" value={`HN-xxxx${op.hnLast3}`} />}
          </div>

          {/* Team */}
          {(op.assistantSurgeons && op.assistantSurgeons.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-700 mb-3 text-sm">ทีมแพทย์</h2>
              <Row label="แพทย์ร่วมผ่าตัด" value={
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {op.assistantSurgeons.map((s) => (
                    <span key={s} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{s}</span>
                  ))}
                </div>
              } />
            </div>
          )}

          {/* Nursing */}
          {(op.scrubNurse || op.circulateNurse || (op.scrubNurses && op.scrubNurses.length > 0) || (op.circulateNurses && op.circulateNurses.length > 0)) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-700 mb-3 text-sm">พยาบาล</h2>
              <Row label="Scrub Nurse" value={
                op.scrubNurses && op.scrubNurses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {op.scrubNurses.map((s) => (
                      <span key={s} className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-xs">{s}</span>
                    ))}
                  </div>
                ) : op.scrubNurse
              } />
              <Row label="Circulate Nurse" value={
                op.circulateNurses && op.circulateNurses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {op.circulateNurses.map((s) => (
                      <span key={s} className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-xs">{s}</span>
                    ))}
                  </div>
                ) : op.circulateNurse
              } />
            </div>
          )}

          {/* Complication */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-700 mb-3 text-sm">Complication</h2>
            <Row label="มี Complication" value={op.hasComplication ? "✓ มี" : "ไม่มี"} />
            {op.hasComplication && <Row label="หมายเหตุ" value={op.complicationNote} />}
          </div>

          {/* OB/CS specific */}
          {(op.ebl !== undefined || op.gestationalAge !== undefined || op.unplannedICU !== undefined) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-700 mb-3 text-sm">ข้อมูล OB/C/S</h2>
              {op.ebl !== undefined && <Row label="EBL (cc)" value={
                <span className={op.isPPH ? "text-red-600" : undefined}>
                  {op.ebl} cc {op.isPPH ? "⚠️ PPH" : ""}
                </span>
              } />}
              {op.gestationalAge !== undefined && <Row label="GA (สัปดาห์)" value={
                <span className={op.isPreterm ? "text-amber-600" : undefined}>
                  {op.gestationalAge} สัปดาห์ {op.isPreterm ? "⚠️ Preterm" : ""}
                </span>
              } />}
              {op.unplannedICU !== undefined && <Row label="Unplanned ICU" value={op.unplannedICU ? "✓ ใช่" : "ไม่มี"} />}
            </div>
          )}

          {/* HYSTERO specific */}
          {(op.fluidBalance || op.unplannedAdmission !== undefined) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-medium text-gray-700 mb-3 text-sm">ข้อมูล Hystero</h2>
              {op.fluidBalance && <Row label="Fluid Balance" value={op.fluidBalance + " cc"} />}
              {op.unplannedAdmission !== undefined && <Row label="Unplanned Admission" value={op.unplannedAdmission ? "✓ ใช่" : "ไม่มี"} />}
            </div>
          )}

          {/* RR Record */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-700 text-sm">ข้อมูล RR</h2>
              <button
                onClick={() => router.push(`/rr-summary/new/${op.id}`)}
                className="text-xs text-teal-600 hover:underline"
              >
                {rr ? "แก้ไข RR →" : "+ บันทึก RR"}
              </button>
            </div>
            {rr ? (
              <>
                <Row label="เส้นทาง" value={rr.postOpRoute} />
                <Row label="Anesthesia (RR)" value={rr.anesthesiaType} />
                <Row label="Patient Level" value={rr.patientLevel} />
                <Row label="Pain Score NRS" value={rr.painScoreNRS !== undefined ? `${rr.painScoreNRS}/10` : undefined} />
                <Row label="Pain Score VRS" value={rr.painScoreVRS} />
                {rr.hasChill && <Row label="ภาวะหนาวสั่น" value="✓ มี" />}
                {rr.hasHypothermia && <Row label="อุณหภูมิต่ำ" value="✓ มี" />}
                {rr.hasHypoxia && <Row label="Hypoxia" value="✓ มี" />}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3">ยังไม่มีข้อมูล RR</p>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-700 mb-3 text-sm">ข้อมูลการบันทึก</h2>
            <Row label="บันทึกเมื่อ" value={formatDateTime(op.createdAt)} />
            <Row label="แก้ไขล่าสุด" value={formatDateTime(op.updatedAt)} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {op.status !== "confirmed" && (isSuperAdmin || true) && (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 rounded-xl bg-teal-600 text-white py-3 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {confirming ? "กำลังยืนยัน..." : "✓ ยืนยันเคสนี้"}
              </button>
            )}
            <button
              onClick={() => router.push(`/operations/new?edit=${op.id}`)}
              className="flex-1 rounded-xl border border-gray-200 text-gray-700 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              แก้ไข
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
