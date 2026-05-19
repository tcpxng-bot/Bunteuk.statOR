// src/app/export/page.tsx
"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/FormFields";
import {
  OperationDoc,
  RRRecordDoc,
  CommitteeIndicatorDoc,
  CommitteeType,
  COMMITTEE_TYPES,
  interpretPainScore,
} from "@/types/database";
import { COMMITTEE_CONFIGS } from "@/lib/committeeConfig";
import * as XLSX from "xlsx";

const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDateStr(ts: any): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
}

function formatTimeStr(ts: any): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ExportType = "operations" | "rr" | "committee";

export default function ExportPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(lastDay.toISOString().split("T")[0]);
  const [exportType, setExportType] = useState<ExportType>("operations");
  const [committeeFilter, setCommitteeFilter] = useState<CommitteeType | "ALL">("ALL");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);

    try {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // 1) Load operations in date range
      const opQ = query(
        collection(db, "operations"),
        where("operationDate", ">=", Timestamp.fromDate(startDate)),
        where("operationDate", "<=", Timestamp.fromDate(endDate)),
        orderBy("operationDate", "asc")
      );
      const opSnap = await getDocs(opQ);
      const operations = opSnap.docs.map((d) => d.data() as OperationDoc);

      if (operations.length === 0) {
        setExportMsg({ type: "error", text: "ไม่มีข้อมูลในช่วงวันที่เลือก" });
        setExporting(false);
        return;
      }

      const opIds = operations.map((o) => o.id).filter(Boolean);

      // 2) Load RR records
      const rrMap = new Map<string, RRRecordDoc>();
      for (let i = 0; i < opIds.length; i += 30) {
        const chunk = opIds.slice(i, i + 30);
        const rrQ = query(
          collection(db, "rrRecords"),
          where("operationId", "in", chunk)
        );
        const rrSnap = await getDocs(rrQ);
        rrSnap.docs.forEach((d) => {
          const rr = d.data() as RRRecordDoc;
          rrMap.set(rr.operationId, rr);
        });
      }

      // 3) Load committee indicators (if needed)
      const indMap = new Map<string, CommitteeIndicatorDoc[]>();
      if (exportType === "committee" || exportType === "operations") {
        for (let i = 0; i < opIds.length; i += 30) {
          const chunk = opIds.slice(i, i + 30);
          let indQ;
          if (committeeFilter !== "ALL") {
            indQ = query(
              collection(db, "committeeIndicators"),
              where("operationId", "in", chunk),
              where("committeeType", "==", committeeFilter)
            );
          } else {
            indQ = query(
              collection(db, "committeeIndicators"),
              where("operationId", "in", chunk)
            );
          }
          const indSnap = await getDocs(indQ);
          indSnap.docs.forEach((d) => {
            const ind = d.data() as CommitteeIndicatorDoc;
            const arr = indMap.get(ind.operationId) || [];
            arr.push(ind);
            indMap.set(ind.operationId, arr);
          });
        }
      }

      // 4) Build workbook
      const wb = XLSX.utils.book_new();

      if (exportType === "operations") {
        const sheet = buildOperationsSheet(operations);
        XLSX.utils.book_append_sheet(wb, sheet, "Operations");
      } else if (exportType === "rr") {
        const sheet = buildRRSheet(operations, rrMap);
        XLSX.utils.book_append_sheet(wb, sheet, "RR Records");
      } else if (exportType === "committee") {
        if (committeeFilter === "ALL") {
          // One sheet per committee type
          for (const cType of COMMITTEE_TYPES) {
            const cConfig = COMMITTEE_CONFIGS.find((c) => c.type === cType);
            if (!cConfig) continue;
            const filteredOps = filterOperationsForCommittee(operations, cConfig);
            if (filteredOps.length === 0) continue;
            const sheet = buildCommitteeSheet(
              filteredOps,
              rrMap,
              indMap,
              cType,
              cConfig
            );
            XLSX.utils.book_append_sheet(wb, sheet, cConfig.label);
          }
        } else {
          const cConfig = COMMITTEE_CONFIGS.find((c) => c.type === committeeFilter);
          if (cConfig) {
            const filteredOps = filterOperationsForCommittee(operations, cConfig);
            const sheet = buildCommitteeSheet(
              filteredOps,
              rrMap,
              indMap,
              committeeFilter,
              cConfig
            );
            XLSX.utils.book_append_sheet(wb, sheet, cConfig.label);
          }
        }
      }

      // 5) Download
      const fromStr = dateFrom.replace(/-/g, "");
      const toStr = dateTo.replace(/-/g, "");
      const fileName = `OR_Stats_${exportType}_${fromStr}-${toStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportMsg({
        type: "success",
        text: `Export สำเร็จ: ${fileName} (${operations.length} เคส)`,
      });
    } catch (err: any) {
      console.error(err);
      setExportMsg({ type: "error", text: "Export ไม่สำเร็จ: " + err.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell requiredRoles={["super_admin"]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl">
        <h1 className="text-xl font-medium text-gray-900 tracking-tight mb-1">
          Export Excel
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          ส่งออกข้อมูลเป็นไฟล์ Excel เลือกช่วงวันที่และประเภทข้อมูล
        </p>

        <div className="space-y-6">
          {/* Date range */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-4">
            <h2 className="text-base font-medium text-gray-900">ช่วงวันที่</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ตั้งแต่">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </Field>
              <Field label="ถึง">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </Field>
            </div>

            {/* Quick-pick buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "เดือนนี้", fn: () => setQuickRange("thisMonth") },
                { label: "เดือนก่อน", fn: () => setQuickRange("lastMonth") },
                { label: "ไตรมาสนี้", fn: () => setQuickRange("thisQuarter") },
                { label: "ปีนี้", fn: () => setQuickRange("thisYear") },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={btn.fn}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export type */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 space-y-4">
            <h2 className="text-base font-medium text-gray-900">ประเภทข้อมูล</h2>

            <div className="space-y-2">
              {([
                { value: "operations", label: "Operation หลัก", desc: "ข้อมูลการผ่าตัดทั้งหมด" },
                { value: "rr", label: "RR Records", desc: "ข้อมูล Recovery Room ทั้งหมด" },
                { value: "committee", label: "ตัวชี้วัดกรรมการ", desc: "ข้อมูลตัวชี้วัดแยกตามกรรมการ" },
              ] as { value: ExportType; label: string; desc: string }[]).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 cursor-pointer transition-all ${
                    exportType === opt.value
                      ? "border-teal-300 bg-teal-50/50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={opt.value}
                    checked={exportType === opt.value}
                    onChange={() => setExportType(opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      exportType === opt.value
                        ? "border-teal-600"
                        : "border-gray-300"
                    }`}
                  >
                    {exportType === opt.value && (
                      <div className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Committee filter */}
            {exportType === "committee" && (
              <div className="pt-2">
                <Field label="กรรมการ">
                  <select
                    value={committeeFilter}
                    onChange={(e) => setCommitteeFilter(e.target.value as any)}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10"
                  >
                    <option value="ALL">ทั้งหมด (แยก Sheet)</option>
                    {COMMITTEE_CONFIGS.map((c) => (
                      <option key={c.type} value={c.type}>{c.label} — {c.labelTH}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

          {/* Export button */}
          {exportMsg && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                exportMsg.type === "success"
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}
            >
              {exportMsg.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-medium text-white hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {exporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                กำลัง Export...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export Excel
              </>
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );

  function setQuickRange(range: string) {
    const now = new Date();
    let start: Date, end: Date;

    switch (range) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "thisQuarter": {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end = new Date(now.getFullYear(), q * 3 + 3, 0);
        break;
      }
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setDateFrom(start.toISOString().split("T")[0]);
    setDateTo(end.toISOString().split("T")[0]);
  }
}

// ═══════════════════════════════════════════
// Sheet builders
// ═══════════════════════════════════════════

function buildOperationsSheet(operations: OperationDoc[]) {
  const headers = [
    "ลำดับ",
    "วันที่",
    "Main Group",
    "Urgency",
    "Procedure",
    "Diagnosis (Pre-op)",
    "Post-op Diagnosis",
    "แพทย์",
    "เวลาเริ่ม",
    "เวลาสิ้นสุด",
    "Duration (min)",
    "Anesthesia",
    "Complication",
    "Complication Note",
    "เพศ",
    "ช่วงอายุ",
    "ASA",
    "ห้องผ่าตัด",
    "Scrub Nurse",
    "Circulate Nurse",
    "EBL",
    "PPH",
    "GA (wk)",
    "Preterm",
    "Unplanned ICU",
    "Fluid Balance",
    "Unplanned Admission",
  ];

  const data = operations.map((op, i) => [
    i + 1,
    formatDateStr(op.operationDate),
    op.mainGroup,
    op.urgency,
    op.procedureName,
    op.diagnosisGroup,
    op.postOpDiagnosis || "",
    op.surgeon,
    formatTimeStr(op.startTime),
    formatTimeStr(op.endTime),
    op.durationMinutes,
    op.anesthesiaType,
    op.hasComplication ? "มี" : "ไม่มี",
    op.complicationNote || "",
    op.gender || "",
    op.ageRange || "",
    op.asaClass || "",
    op.operatingRoom || "",
    op.scrubNurse || "",
    op.circulateNurse || "",
    op.ebl ?? "",
    op.isPPH ? "PPH" : "",
    op.gestationalAge ?? "",
    op.isPreterm ? "Preterm" : "",
    op.unplannedICU ? "ใช่" : "",
    op.fluidBalance || "",
    op.unplannedAdmission ? "ใช่" : "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Column widths
  ws["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 25 },
    { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 8 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 6 },
    { wch: 8 }, { wch: 5 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
    { wch: 6 }, { wch: 5 }, { wch: 7 }, { wch: 8 }, { wch: 14 },
    { wch: 14 }, { wch: 18 },
  ];

  return ws;
}

function buildRRSheet(
  operations: OperationDoc[],
  rrMap: Map<string, RRRecordDoc>
) {
  const headers = [
    "ลำดับ",
    "วันที่",
    "Procedure",
    "แพทย์",
    "Main Group",
    "Post-op Route",
    "Anesthesia (RR)",
    "Airway",
    "Patient Level",
    "Chill",
    "Hypothermia",
    "Hypoxia",
    "Pain NRS",
    "Pain VRS",
    "Pre-op NRS",
  ];

  const data = operations.map((op, i) => {
    const rr = rrMap.get(op.id);
    return [
      i + 1,
      formatDateStr(op.operationDate),
      op.procedureName,
      op.surgeon,
      op.mainGroup,
      rr?.postOpRoute || "",
      rr?.anesthesiaType || "",
      rr?.airway || "",
      rr?.patientLevel || "",
      rr?.hasChill ? "มี" : rr ? "ไม่มี" : "",
      rr?.hasHypothermia ? "มี" : rr ? "ไม่มี" : "",
      rr?.hasHypoxia ? "มี" : rr ? "ไม่มี" : "",
      rr?.painScoreNRS ?? "",
      rr?.painScoreVRS || "",
      rr?.preOpPainScoreNRS ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 25 }, { wch: 18 }, { wch: 12 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 6 },
    { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];

  return ws;
}

function filterOperationsForCommittee(
  operations: OperationDoc[],
  config: typeof COMMITTEE_CONFIGS[number]
): OperationDoc[] {
  if (config.filterMainGroups && config.filterMainGroups.length > 0) {
    return operations.filter((op) =>
      config.filterMainGroups!.includes(op.mainGroup)
    );
  }
  if (config.filterPostOpDiagnosis && config.filterPostOpDiagnosis.length > 0) {
    return operations.filter((op) =>
      op.postOpDiagnosis && config.filterPostOpDiagnosis!.includes(op.postOpDiagnosis)
    );
  }
  if (config.filterProcedures && config.filterProcedures.length > 0) {
    return operations.filter((op) =>
      config.filterProcedures!.some((p) =>
        op.procedureName.toUpperCase().includes(p.toUpperCase())
      )
    );
  }
  return operations;
}

function buildCommitteeSheet(
  operations: OperationDoc[],
  rrMap: Map<string, RRRecordDoc>,
  indMap: Map<string, CommitteeIndicatorDoc[]>,
  committeeType: CommitteeType,
  config: typeof COMMITTEE_CONFIGS[number]
) {
  // Build headers
  const baseHeaders = ["ลำดับ", "วันที่", "Procedure", "แพทย์"];

  const manualHeaders = config.manualIndicators.map((f) => f.label);
  const extraHeaders = (config.extraFields || []).map((f) => f.label);
  const rrHeaders = config.rrIndicators.map((f) => f.label);
  const painHeaders = ["Pain NRS", "Pain Interpretation", "Pain VRS"];

  const headers = [
    ...baseHeaders,
    ...manualHeaders,
    ...extraHeaders,
    ...rrHeaders,
    ...painHeaders,
  ];

  const data = operations.map((op, i) => {
    const rr = rrMap.get(op.id);
    const inds = indMap.get(op.id) || [];
    const ind = inds.find((x) => x.committeeType === committeeType);

    const base = [
      i + 1,
      formatDateStr(op.operationDate),
      op.procedureName,
      op.surgeon,
    ];

    const manualVals = config.manualIndicators.map((f) => {
      if (!ind) return "";
      const val = (ind as any)[f.key];
      if (f.type === "boolean") return val ? "มี" : "ไม่มี";
      return val ?? "";
    });

    const extraVals = (config.extraFields || []).map((f) => {
      if (!ind) return "";
      return (ind as any)[f.key] ?? "";
    });

    const rrVals = config.rrIndicators.map((f) => {
      if (!rr) return "";
      const val = (rr as any)[f.key];
      if (f.type === "boolean") return val ? "มี" : "ไม่มี";
      return val ?? "";
    });

    const painVals = [
      rr?.painScoreNRS ?? "",
      rr ? interpretPainScore(committeeType, rr.painScoreNRS) : "",
      rr?.painScoreVRS || "",
    ];

    return [...base, ...manualVals, ...extraVals, ...rrVals, ...painVals];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Auto-width
  const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 4, 12) }));
  ws["!cols"] = colWidths;

  return ws;
}
