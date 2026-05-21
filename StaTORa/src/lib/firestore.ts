// src/lib/firestore.ts
// Firestore CRUD helpers — ใช้ฝั่ง client

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  onSnapshot,
  DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  OperationDoc,
  PreOpCaseDoc,
  RRRecordDoc,
  CommitteeIndicatorDoc,
  DropdownListDoc,
  UserDoc,
  StatisticianAssignment,
  MainGroup,
  CommitteeType,
  CaseStatus,
} from "@/types/database";

// ═══════════════════════════════════════════
// Generic helpers
// ═══════════════════════════════════════════

function toDateFields(date: Date) {
  return {
    month: date.getMonth() + 1,
    quarter: Math.ceil((date.getMonth() + 1) / 3),
    year: date.getFullYear(),
  };
}

// ═══════════════════════════════════════════
// Operations
// ═══════════════════════════════════════════

export async function createOperation(
  data: Omit<OperationDoc, "id" | "createdAt" | "updatedAt" | "month" | "quarter" | "year" | "durationMinutes" | "isPPH" | "isPreterm" | "caseStatus">
): Promise<string> {
  const opDate = data.operationDate.toDate();
  const dateFields = toDateFields(opDate);

  let durationMinutes = 0;
  if (data.startTime && data.endTime) {
    durationMinutes = Math.round(
      (data.endTime.toMillis() - data.startTime.toMillis()) / 60000
    );
  }

  const isPPH = (data.ebl ?? 0) > 1000;
  const isPreterm = (data.gestationalAge ?? 40) < 37;

  const now = Timestamp.now();
  const ref = await addDoc(collection(db, "operations"), {
    ...data,
    ...dateFields,
    durationMinutes,
    isPPH,
    isPreterm,
    // เคสใหม่ที่คนเก็บสถิติกรอก OR form → รอ RR Incharge กรอก RR form
    caseStatus: "pending_rr" satisfies CaseStatus,
    createdAt: now,
    updatedAt: now,
  });

  await updateDoc(ref, { id: ref.id });

  // ถ้ามี preOpCaseId → link กลับและอัปเดต caseStatus ของ preOpCase ด้วย
  if (data.preOpCaseId) {
    await updateDoc(doc(db, "preOpCases", data.preOpCaseId), {
      operationId: ref.id,
      caseStatus: "pending_rr" satisfies CaseStatus,
      updatedAt: now,
    });
  }

  return ref.id;
}

export async function updateOperation(
  id: string,
  data: Partial<OperationDoc>
): Promise<void> {
  const ref = doc(db, "operations", id);

  // Recompute derived fields if relevant data changed
  const updates: Record<string, any> = { ...data, updatedAt: Timestamp.now() };

  if (data.operationDate) {
    const opDate = data.operationDate.toDate();
    Object.assign(updates, toDateFields(opDate));
  }
  if (data.startTime && data.endTime) {
    updates.durationMinutes = Math.round(
      (data.endTime.toMillis() - data.startTime.toMillis()) / 60000
    );
  }
  if (data.ebl !== undefined) {
    updates.isPPH = data.ebl > 1000;
  }
  if (data.gestationalAge !== undefined) {
    updates.isPreterm = data.gestationalAge < 37;
  }

  await updateDoc(ref, updates);
}

export async function getOperation(id: string): Promise<OperationDoc | null> {
  const snap = await getDoc(doc(db, "operations", id));
  return snap.exists() ? (snap.data() as OperationDoc) : null;
}

export async function queryOperations(
  constraints: QueryConstraint[]
): Promise<OperationDoc[]> {
  const q = query(collection(db, "operations"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as OperationDoc);
}

export function queryOperationsByDate(date: Date): QueryConstraint[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return [
    where("operationDate", ">=", Timestamp.fromDate(start)),
    where("operationDate", "<=", Timestamp.fromDate(end)),
    orderBy("operationDate", "asc"),
  ];
}

export function queryOperationsByMonth(
  year: number,
  month: number
): QueryConstraint[] {
  return [
    where("year", "==", year),
    where("month", "==", month),
    orderBy("operationDate", "desc"),
  ];
}

export function queryOperationsByMainGroup(
  mainGroup: MainGroup
): QueryConstraint[] {
  return [
    where("mainGroup", "==", mainGroup),
    orderBy("operationDate", "desc"),
  ];
}

// ═══════════════════════════════════════════
// Pre-Op Cases (หน่วยเปล)
// ═══════════════════════════════════════════

export async function createPreOpCase(
  data: Omit<PreOpCaseDoc, "id" | "createdAt" | "updatedAt" | "caseStatus">
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, "preOpCases"), {
    ...data,
    // หน่วยเปลสร้างเคสใหม่ → เริ่มต้นที่ pending_or เสมอ
    caseStatus: "pending_or" satisfies CaseStatus,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function updatePreOpCase(
  id: string,
  data: Partial<PreOpCaseDoc>
): Promise<void> {
  await updateDoc(doc(db, "preOpCases", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function getPreOpCase(id: string): Promise<PreOpCaseDoc | null> {
  const snap = await getDoc(doc(db, "preOpCases", id));
  return snap.exists() ? (snap.data() as PreOpCaseDoc) : null;
}

export function queryPreOpCasesByDate(date: Date): QueryConstraint[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return [
    where("operationDate", ">=", Timestamp.fromDate(start)),
    where("operationDate", "<=", Timestamp.fromDate(end)),
    orderBy("operationDate", "asc"),
  ];
}

// ═══════════════════════════════════════════
// RR Records
// ═══════════════════════════════════════════

export async function createRRRecord(
  data: Omit<RRRecordDoc, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, "rrRecords"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(ref, { id: ref.id });

  // เมื่อ RR form ครบ → อัปเดต operation เป็น complete (นับเข้าสถิติได้แล้ว)
  await updateDoc(doc(db, "operations", data.operationId), {
    caseStatus: "complete" satisfies CaseStatus,
    updatedAt: now,
  });

  // อัปเดต preOpCase ด้วย (ถ้ามี) — ดึง operationDoc มาหา preOpCaseId
  const opSnap = await getDoc(doc(db, "operations", data.operationId));
  if (opSnap.exists()) {
    const opData = opSnap.data() as OperationDoc;
    if (opData.preOpCaseId) {
      await updateDoc(doc(db, "preOpCases", opData.preOpCaseId), {
        caseStatus: "complete" satisfies CaseStatus,
        updatedAt: now,
      });
    }
  }

  return ref.id;
}

export async function updateRRRecord(
  id: string,
  data: Partial<RRRecordDoc>
): Promise<void> {
  await updateDoc(doc(db, "rrRecords", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function getRRRecordByOperationId(
  operationId: string
): Promise<RRRecordDoc | null> {
  const q = query(
    collection(db, "rrRecords"),
    where("operationId", "==", operationId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as RRRecordDoc);
}

// ═══════════════════════════════════════════
// Committee Indicators
// ═══════════════════════════════════════════

export async function createCommitteeIndicator(
  data: Omit<CommitteeIndicatorDoc, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, "committeeIndicators"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function updateCommitteeIndicator(
  id: string,
  data: Partial<CommitteeIndicatorDoc>
): Promise<void> {
  await updateDoc(doc(db, "committeeIndicators", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function getCommitteeIndicator(
  operationId: string,
  committeeType: CommitteeType
): Promise<CommitteeIndicatorDoc | null> {
  const q = query(
    collection(db, "committeeIndicators"),
    where("operationId", "==", operationId),
    where("committeeType", "==", committeeType),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as CommitteeIndicatorDoc);
}

export function queryCommitteeIndicatorsByType(
  committeeType: CommitteeType
): QueryConstraint[] {
  return [where("committeeType", "==", committeeType)];
}

// ═══════════════════════════════════════════
// Dropdown Lists
// ═══════════════════════════════════════════

export async function getDropdownList(
  listName: string
): Promise<DropdownListDoc | null> {
  const snap = await getDoc(doc(db, "dropdownLists", listName));
  return snap.exists() ? (snap.data() as DropdownListDoc) : null;
}

export async function setDropdownList(
  listName: string,
  data: Omit<DropdownListDoc, "updatedAt">
): Promise<void> {
  await setDoc(doc(db, "dropdownLists", listName), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ═══════════════════════════════════════════
// Users (admin)
// ═══════════════════════════════════════════

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("displayName"))
  );
  return snap.docs.map((d) => d.data() as UserDoc);
}

export async function updateUserDoc(
  uid: string,
  data: Partial<UserDoc>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ═══════════════════════════════════════════
// Statistician Assignments
// ═══════════════════════════════════════════

export async function setStatisticianAssignment(
  yearMonth: string,
  data: Omit<StatisticianAssignment, "assignedAt">
): Promise<void> {
  await setDoc(doc(db, "statisticianAssignments", yearMonth), {
    ...data,
    assignedAt: Timestamp.now(),
  });
}

export async function getStatisticianAssignment(
  yearMonth: string
): Promise<StatisticianAssignment | null> {
  const snap = await getDoc(doc(db, "statisticianAssignments", yearMonth));
  return snap.exists() ? (snap.data() as StatisticianAssignment) : null;
}

// ═══════════════════════════════════════════
// Real-time listeners
// ═══════════════════════════════════════════

export function subscribeToOperationsByDate(
  date: Date,
  callback: (ops: OperationDoc[]) => void
) {
  const constraints = queryOperationsByDate(date);
  const q = query(collection(db, "operations"), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as OperationDoc));
  });
}

export function subscribeToPreOpCasesByDate(
  date: Date,
  callback: (cases: PreOpCaseDoc[]) => void
) {
  const constraints = queryPreOpCasesByDate(date);
  const q = query(collection(db, "preOpCases"), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as PreOpCaseDoc));
  });
}
