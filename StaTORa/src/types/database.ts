// src/types/database.ts
// ===============================================
// OR Ward Statistics — Firestore Database Schema
// ===============================================

import { Timestamp } from "firebase/firestore";

// ─── Roles ────────────────────────────────────
export const ROLES = [
  "super_admin",
  "statistician", // คนเก็บสถิติประจำเดือน
  "rr_incharge", // RR Incharge
  "stretcher_unit", // หน่วยเปล
  "committee_hystero",
  "committee_tah",
  "committee_lh_tlh",
  "committee_rh",
  "committee_cs",
  "committee_ca_cervix",
  "committee_pop",
] as const;

export type Role = (typeof ROLES)[number];

// ─── Users Collection ─────────────────────────
// Path: /users/{uid}
export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  roles: Role[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // uid ของ super_admin ที่สร้าง
}

// ─── Statistician Assignment ──────────────────
// Path: /statisticianAssignments/{year-month}
// เช่น /statisticianAssignments/2026-05
export interface StatisticianAssignment {
  yearMonth: string; // "2026-05"
  assignedUid: string;
  assignedName: string;
  assignedBy: string; // super_admin uid
  assignedAt: Timestamp;
}

// ─── Enums / Dropdown values ──────────────────
export const MAIN_GROUPS = [
  "GYN",
  "OB",
  "LAP_SURG",
  "HYSTERO",
  "ATR",
  "NOTES",
  "LASER",
  "OTHER",
] as const;
export type MainGroup = (typeof MAIN_GROUPS)[number];

export const URGENCY_TYPES = ["Elective", "Emergency", "Other"] as const;
export type Urgency = (typeof URGENCY_TYPES)[number];

export const ANESTHESIA_TYPES_OR = ["GA", "Spinal", "Epidural", "LA"] as const;
export type AnesthesiaTypeOR = (typeof ANESTHESIA_TYPES_OR)[number];

export const ANESTHESIA_TYPES_RR = [
  "GA",
  "RA",
  "IV Sedation",
  "Combined",
  "Local",
] as const;
export type AnesthesiaTypeRR = (typeof ANESTHESIA_TYPES_RR)[number];

export const DIAGNOSIS_GROUPS = [
  "Benign",
  "Ovarian tumor",
  "CA ovary",
  "CA cervix",
  "CA corpus",
  "CA endometrium",
  "CA tube",
] as const;
export type DiagnosisGroup = (typeof DIAGNOSIS_GROUPS)[number];

export const ASA_CLASSES = ["I", "II", "III", "IV"] as const;
export type ASAClass = (typeof ASA_CLASSES)[number];

export const AGE_RANGES = ["<20", "20-40", ">40"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const GENDER_OPTIONS = ["Female", "Male"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

// ─── Operations Collection ────────────────────
// Path: /operations/{operationId}
export interface OperationDoc {
  id: string;

  // ── Required fields ──
  operationDate: Timestamp;
  month: number; // 1-12
  quarter: number; // 1-4
  year: number;
  mainGroup: MainGroup;
  urgency: Urgency;
  procedureName: string; // จาก dropdown list
  diagnosisGroup: DiagnosisGroup; // Pre-op
  surgeon: string; // จาก dropdown list
  startTime: Timestamp;
  endTime: Timestamp;
  durationMinutes: number; // auto-calculated
  anesthesiaType: AnesthesiaTypeOR;
  hasComplication: boolean;
  complicationNote: string;

  // ── Optional fields ──
  postOpDiagnosis?: DiagnosisGroup;
  gender?: Gender;
  ageRange?: AgeRange;
  asaClass?: ASAClass;
  operatingRoom?: string; // OR1, OR2, ...
  scrubNurse?: string;
  circulateNurse?: string;

  // ── Post-op transfer ──
  postOpTransfer?: "RR" | "ICU_NO_RR" | "ER_CONDITION_RR" | "HOME" | "UNPLANNED_ICU";
  unplannedConsult?: boolean; // Unplanned consult in OR
  preOpCaseId?: string; // link กับ preOpCase ของหน่วยเปล

  // ── OB/C/S specific ──
  ebl?: number; // cc — auto flag PPH if >1000
  isPPH?: boolean; // auto: ebl > 1000
  gestationalAge?: number; // weeks — auto flag Preterm if <37
  isPreterm?: boolean; // auto: GA < 37
  unplannedICU?: boolean;

  // ── HYSTERO specific ──
  fluidBalance?: "<500" | "500-1000" | ">1000"; // cc
  unplannedAdmission?: boolean;

  // ── NOTES specific rule ──
  // นับเฉพาะ NOTEs Assist to hysterectomy
  isNotesAssistHysterectomy?: boolean;

  // ── Metadata ──
  createdBy: string; // uid
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: "draft" | "confirmed";
}

// ─── Stretcher Unit (หน่วยเปล) Pre-Op ────────
// Path: /preOpCases/{caseId}
export interface PreOpCaseDoc {
  id: string;
  operationDate: Timestamp; // วันพรุ่งนี้
  procedureName: string;
  surgeon: string;
  preOpDiagnosis: string;
  hnLast3: string; // เช่น "123" → แสดงเป็น HN-xxxx123
  setReady: boolean; // จัด Set เรียบร้อย ✓
  chargeWritten: boolean; // เขียน Charge เรียบร้อย ✓

  // Plan Consult (หน่วยเปลระบุล่วงหน้า)
  planConsultUro?: boolean; // plan consult uro
  planConsultColo?: boolean; // plan consult colo

  // ติดตามผลการผ่าตัด (หน่วยเปลอัปเดต)
  surgeryStatus?: "success" | "postponed" | "cancelled";
  surgeryStatusNote?: string; // หมายเหตุ

  // Link to operation (หลังจากสร้าง operation record)
  operationId?: string;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── RR Records (link กับ operation) ──────────
// Path: /rrRecords/{rrId}
export interface RRRecordDoc {
  id: string;
  operationId: string; // FK → operations

  // ── RR Incharge กรอก ──
  postOpRoute:
    | "RR"
    | "ICU_NO_RR"
    | "ER_CONDITION_RR"
    | "HOME"
    | "UNPLANNED_ICU";
  anesthesiaType: AnesthesiaTypeRR;
  airway: "ON_ETT_FROM_OR" | "RETUBE_IN_RR" | "NONE";
  patientLevel: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4";

  // ── ภาวะหลังผ่าตัด ──
  hasChill: boolean;
  hasHypothermia: boolean; // <36.0
  hasHypoxia: boolean;

  // ── Pain scores ──
  painScoreNRS: number; // 0-10
  painScoreVRS:
    | "NO_PAIN"
    | "MILD"
    | "MODERATE"
    | "SEVERE";

  // ── Pre-op pain score (สำหรับ LH&TLH เปรียบเทียบ) ──
  preOpPainScoreNRS?: number;

  // ── Metadata ──
  isAutoFilled?: boolean; // auto-created เมื่อไม่ผ่าน RR
  createdBy: string; // RR Incharge uid
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Committee Indicators ─────────────────────
// Path: /committeeIndicators/{indicatorId}
// กรรมการแต่ละคนกรอก per operation
export interface CommitteeIndicatorDoc {
  id: string;
  operationId: string; // FK → operations
  committeeType: CommitteeType;

  // ── Common indicators (shared across committees) ──
  foreignBodyRetained?: boolean; // ผ้าซับโลหิต/เครื่องมือตกค้าง
  woundInfection?: boolean; // การติดเชื้อของแผลผ่าตัด
  adjacentOrganInjury?: boolean; // บาดเจ็บอวัยวะข้างเคียง
  preventableIncident?: boolean; // อุบัติการณ์ที่ป้องกันได้
  preventableIncidentNote?: string;

  // ── C/S specific ──
  unplannedConsultInOR?: boolean;
  unplannedICU?: boolean;
  maternalFetalInjury?: boolean; // บาดเจ็บมารดา/ทารก

  // ── LH&TLH specific ──
  unplannedConsultInOR_LH?: boolean;

  // ── Hystero specific ──
  unplannedAdmission?: boolean;
  fluidOverload?: "<500" | "500-1000" | ">1000";

  // ── CA Cervix / RH specific ──
  surgeryPostponed?: boolean; // เลื่อน/งดผ่าตัด
  unplannedConsultInOR_CA?: boolean;
  transferToICU?: boolean; // ย้าย Observe ICU-OB
  surgeryType?: string; // TAH / EH / RH / LH etc.

  // ── Ovarian Tumor specific ──
  tumorType?: string; // ชนิด tumor (กรอกเพิ่ม)

  // ── Metadata ──
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const COMMITTEE_TYPES = [
  "TAH",
  "LH_TLH",
  "CS",
  "HYSTERO",
  "CA_CERVIX",
  "RH",
  "POP",
] as const;
export type CommitteeType = (typeof COMMITTEE_TYPES)[number];

// ─── Dropdown Lists (admin-managed) ───────────
// Path: /dropdownLists/{listName}
export interface DropdownListDoc {
  listName: string; // "procedures", "surgeons", "scrubNurses", "circulateNurses", "operatingRooms"
  items: DropdownItem[];
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface DropdownItem {
  value: string;
  label: string;
  mainGroup?: MainGroup; // filter procedure by main group
  isActive: boolean;
  sortOrder: number;
}

// ─── Helper: Pain Score Interpretation ────────
export interface PainInterpretation {
  committeeType: CommitteeType;
  nrs: number;
  interpretation: string;
}

export function interpretPainScore(
  committeeType: CommitteeType,
  nrs: number
): string {
  switch (committeeType) {
    case "HYSTERO":
    case "TAH":
      return nrs < 5 ? "NRS <5" : "NRS ≥5";
    case "CS":
      return nrs <= 5 ? "NRS ≤5 (ผ่าน)" : "NRS >5 (ไม่ผ่าน)";
    case "CA_CERVIX":
    case "RH":
    case "POP":
      if (nrs <= 3) return "NRS ≤3";
      if (nrs <= 5) return "NRS 4-5";
      return "NRS >5";
    case "LH_TLH":
      return "เปรียบเทียบก่อน-หลังผ่าตัด";
    default:
      return `NRS ${nrs}`;
  }
}

// ─── Helper: Auto-computed fields ─────────────
export function computeOperationFlags(op: Partial<OperationDoc>): {
  isPPH: boolean;
  isPreterm: boolean;
  durationMinutes: number;
} {
  const isPPH = (op.ebl ?? 0) > 1000;
  const isPreterm = (op.gestationalAge ?? 40) < 37;

  let durationMinutes = 0;
  if (op.startTime && op.endTime) {
    durationMinutes = Math.round(
      (op.endTime.toMillis() - op.startTime.toMillis()) / 60000
    );
  }

  return { isPPH, isPreterm, durationMinutes };
}
