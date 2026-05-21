// src/lib/committeeConfig.ts
// Committee configuration — ตัวชี้วัดกรรมการแต่ละประเภท

import { CommitteeType, MainGroup } from "@/types/database";
import { Role } from "@/types/database";

export interface IndicatorField {
  key: string;
  label: string;
  type: "boolean" | "text" | "select";
  options?: { value: string; label: string }[];
  fromRR?: boolean; // ดึงจาก RR record
}

export interface CommitteeConfig {
  type: CommitteeType;
  label: string;
  labelTH: string;
  role: Role;
  href: string;
  // Which mainGroups to filter operations
  filterMainGroups?: MainGroup[];
  // Filter by procedure name pattern
  filterProcedures?: string[];
  // Filter by postOpDiagnosis
  filterPostOpDiagnosis?: string[];
  // Manually entered indicators
  manualIndicators: IndicatorField[];
  // RR-linked indicators (auto from RR data)
  rrIndicators: IndicatorField[];
  // Extra fields specific to this committee
  extraFields?: IndicatorField[];
}

export const COMMITTEE_CONFIGS: CommitteeConfig[] = [
  // ── TAH ──
  {
    type: "TAH",
    label: "TAH",
    labelTH: "กรรมการ TAH",
    role: "committee_tah",
    href: "/committees/tah",
    filterProcedures: ["TAH"],
    manualIndicators: [
      { key: "foreignBodyRetained", label: "อัตราผ้าซับโลหิต/เครื่องมือตกค้างในร่างกาย", type: "boolean" },
      { key: "woundInfection", label: "อัตราการติดเชื้อของแผลผ่าตัด", type: "boolean" },
      { key: "adjacentOrganInjury", label: "อัตราการได้รับบาดเจ็บของอวัยวะข้างเคียง", type: "boolean" },
      { key: "preventableIncident", label: "อุบัติการณ์ที่ป้องกันได้ (เคลื่อนย้าย/จัดท่า/เครื่องจี้ไฟฟ้า)", type: "boolean" },
    ],
    rrIndicators: [
      { key: "hasChill", label: "ภาวะหนาวสั่นหลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasHypothermia", label: "ภาวะอุณหภูมิต่ำหลังผ่าตัด (<36°C)", type: "boolean", fromRR: true },
      { key: "hasHypoxia", label: "ภาวะ Hypoxia ขณะผ่าตัด", type: "boolean", fromRR: true },
    ],
  },

  // ── LH & TLH ──
  {
    type: "LH_TLH",
    label: "LH & TLH",
    labelTH: "กรรมการ LH & TLH",
    role: "committee_lh_tlh",
    href: "/committees/lh-tlh",
    filterMainGroups: ["LAP_SURG"],
    manualIndicators: [
      { key: "foreignBodyRetained", label: "อัตราลืมสิ่งแปลกปลอมในร่างกาย", type: "boolean" },
      { key: "woundInfection", label: "อัตราการติดเชื้อแผลผ่าตัด", type: "boolean" },
      { key: "adjacentOrganInjury", label: "การบาดเจ็บอวัยวะข้างเคียง", type: "boolean" },
      { key: "preventableIncident", label: "อุบัติการณ์ที่ป้องกันได้ (จัดท่า/เคลื่อนย้าย/เครื่องจี้/อุปกรณ์ไฟฟ้า)", type: "boolean" },
      { key: "unplannedConsultInOR_LH", label: "Unplanned consult in OR", type: "boolean" },
    ],
    rrIndicators: [
      { key: "hasHypoxia", label: "ภาวะ Hypoxia หลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasChill", label: "ภาวะหนาวสั่นหลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasHypothermia", label: "ภาวะอุณหภูมิกายต่ำ (<36.0)", type: "boolean", fromRR: true },
    ],
  },

  // ── C/S ──
  {
    type: "CS",
    label: "C/S",
    labelTH: "กรรมการ C/S",
    role: "committee_cs",
    href: "/committees/cs",
    filterMainGroups: ["OB"],
    manualIndicators: [
      { key: "foreignBodyRetained", label: "อัตราการมีผ้าซับโลหิตตกค้าง", type: "boolean" },
      { key: "woundInfection", label: "อัตราการติดเชื้อของแผลผ่าตัด", type: "boolean" },
      { key: "maternalFetalInjury", label: "อัตราการได้รับบาดเจ็บของมารดา/ทารก", type: "boolean" },
      { key: "unplannedConsultInOR", label: "อัตราการ Consult in OR โดยไม่ได้วางแผน", type: "boolean" },
      { key: "unplannedICU", label: "Unplanned ICU admission", type: "boolean" },
      { key: "preventableIncident", label: "อุบัติการณ์ที่ป้องกันได้ (จัดท่า/เคลื่อนย้าย/เครื่องจี้/อุปกรณ์ไฟฟ้า)", type: "boolean" },
    ],
    rrIndicators: [],
  },

  // ── Hystero ──
  {
    type: "HYSTERO",
    label: "Hystero",
    labelTH: "กรรมการ Hystero",
    role: "committee_hystero",
    href: "/committees/hystero",
    filterMainGroups: ["HYSTERO"],
    manualIndicators: [
      { key: "adjacentOrganInjury", label: "การบาดเจ็บของอวัยวะข้างเคียง", type: "boolean" },
      { key: "foreignBodyRetained", label: "อัตราการลืมสิ่งแปลกปลอมในร่างกาย", type: "boolean" },
      { key: "unplannedAdmission", label: "Unplanned admission", type: "boolean" },
      {
        key: "fluidOverload",
        label: "อัตราน้ำเกินในร่างกายผู้ป่วย",
        type: "select",
        options: [
          { value: "<500", label: "<500 cc" },
          { value: "500-1000", label: "500-1000 cc" },
          { value: ">1000", label: ">1000 cc" },
        ],
      },
    ],
    rrIndicators: [
      { key: "hasChill", label: "ภาวะหนาวสั่นหลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasHypoxia", label: "อัตราการเกิดภาวะ Hypoxia", type: "boolean", fromRR: true },
    ],
  },

  // ── CA Cervix ──
  {
    type: "CA_CERVIX",
    label: "CA Cervix",
    labelTH: "กรรมการ CA Cervix",
    role: "committee_ca_cervix",
    href: "/committees/ca-cervix",
    filterPostOpDiagnosis: ["CA cervix"],
    manualIndicators: [
      { key: "foreignBodyRetained", label: "อัตราการลืมสิ่งแปลกปลอมในร่างกาย", type: "boolean" },
      { key: "surgeryPostponed", label: "เลื่อน/งดผ่าตัด", type: "boolean" },
      { key: "woundInfection", label: "การติดเชื้อของแผลผ่าตัด", type: "boolean" },
      { key: "adjacentOrganInjury", label: "การบาดเจ็บของอวัยวะข้างเคียง", type: "boolean" },
      { key: "unplannedConsultInOR_CA", label: "Consult in OR โดยไม่ได้วางแผน", type: "boolean" },
      { key: "preventableIncident", label: "อุบัติเหตุที่ป้องกันได้ (จัดท่า, Burn, อุบัติเหตุ)", type: "boolean" },
      { key: "transferToICU", label: "ย้าย Observe ICU-OB", type: "boolean" },
    ],
    extraFields: [
      {
        key: "surgeryType",
        label: "ประเภทการผ่าตัด",
        type: "select",
        options: [
          { value: "TAH", label: "TAH" },
          { value: "EH/EHPL", label: "EH/EHPL" },
          { value: "RH/RHPL", label: "RH/RHPL" },
          { value: "LH/LRHPL", label: "LH/LRHPL" },
          { value: "OTHER", label: "อื่นๆ" },
        ],
      },
    ],
    rrIndicators: [
      { key: "hasChill", label: "ภาวะหนาวสั่นหลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasHypoxia", label: "อัตราการเกิดภาวะ Hypoxia", type: "boolean", fromRR: true },
    ],
  },

  // ── RH ──
  {
    type: "RH",
    label: "RH",
    labelTH: "กรรมการ RH",
    role: "committee_rh",
    href: "/committees/rh",
    filterProcedures: ["RH", "RHPL"],
    manualIndicators: [
      { key: "foreignBodyRetained", label: "อัตราการลืมสิ่งแปลกปลอมในร่างกาย", type: "boolean" },
      { key: "surgeryPostponed", label: "เลื่อน/งดผ่าตัด", type: "boolean" },
      { key: "woundInfection", label: "การติดเชื้อของแผลผ่าตัด", type: "boolean" },
      { key: "adjacentOrganInjury", label: "การบาดเจ็บของอวัยวะข้างเคียง", type: "boolean" },
      { key: "unplannedConsultInOR_CA", label: "Consult in OR โดยไม่ได้วางแผน", type: "boolean" },
      { key: "preventableIncident", label: "อุบัติเหตุที่ป้องกันได้ (จัดท่า, Burn, อุบัติเหตุ)", type: "boolean" },
      { key: "transferToICU", label: "ย้าย Observe ICU-OB", type: "boolean" },
    ],
    rrIndicators: [
      { key: "hasChill", label: "ภาวะหนาวสั่นหลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasHypoxia", label: "อัตราการเกิดภาวะ Hypoxia", type: "boolean", fromRR: true },
    ],
  },

  // ── Ovarian Tumor ──
  {
    type: "OVARIAN_TUMOR",
    label: "Ovarian Tumor",
    labelTH: "กรรมการ Ovarian Tumor",
    role: "committee_ovarian_tumor",
    href: "/committees/ovarian-tumor",
    filterPostOpDiagnosis: ["Ovarian tumor"],
    manualIndicators: [],
    extraFields: [
      { key: "tumorType", label: "ชนิด Tumor (Post-op diagnosis)", type: "text" },
    ],
    rrIndicators: [],
  },

  // ── POP ──
  {
    type: "POP",
    label: "POP",
    labelTH: "กรรมการ POP",
    role: "committee_pop",
    href: "/committees/pop",
    manualIndicators: [
      { key: "foreignBodyRetained", label: "อัตราการลืมสิ่งแปลกปลอมในร่างกาย", type: "boolean" },
      { key: "surgeryPostponed", label: "เลื่อน/งดผ่าตัด", type: "boolean" },
      { key: "woundInfection", label: "การติดเชื้อของแผลผ่าตัด", type: "boolean" },
      { key: "adjacentOrganInjury", label: "การบาดเจ็บของอวัยวะข้างเคียง", type: "boolean" },
      { key: "unplannedConsultInOR_CA", label: "Consult in OR โดยไม่ได้วางแผน", type: "boolean" },
      { key: "preventableIncident", label: "อุบัติเหตุที่ป้องกันได้ (จัดท่า, Burn, อุบัติเหตุ)", type: "boolean" },
      { key: "transferToICU", label: "ย้าย Observe ICU-OB", type: "boolean" },
    ],
    extraFields: [
      {
        key: "surgeryType",
        label: "ประเภทการผ่าตัด",
        type: "select",
        options: [
          { value: "TAH", label: "TAH" },
          { value: "EH/EHPL", label: "EH/EHPL" },
          { value: "RH/RHPL", label: "RH/RHPL" },
          { value: "LH/LRHPL", label: "LH/LRHPL" },
          { value: "OTHER", label: "อื่นๆ" },
        ],
      },
    ],
    rrIndicators: [
      { key: "hasChill", label: "ภาวะหนาวสั่นหลังผ่าตัด", type: "boolean", fromRR: true },
      { key: "hasHypoxia", label: "อัตราการเกิดภาวะ Hypoxia", type: "boolean", fromRR: true },
    ],
  },
];

export function getCommitteeConfig(type: CommitteeType): CommitteeConfig | undefined {
  return COMMITTEE_CONFIGS.find((c) => c.type === type);
}

export function getCommitteeConfigBySlug(slug: string): CommitteeConfig | undefined {
  const slugMap: Record<string, CommitteeType> = {
    "tah": "TAH",
    "lh-tlh": "LH_TLH",
    "cs": "CS",
    "hystero": "HYSTERO",
    "ca-cervix": "CA_CERVIX",
    "rh": "RH",
    "ovarian-tumor": "OVARIAN_TUMOR",
    "pop": "POP",
  };
  const type = slugMap[slug];
  return type ? getCommitteeConfig(type) : undefined;
}
