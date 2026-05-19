// scripts/seed-firestore.ts
// ────────────────────────────────────────────────────
// Run once to seed dropdown lists & create first admin
// Usage: npx ts-node --esm scripts/seed-firestore.ts
// ────────────────────────────────────────────────────

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const authAdmin = getAuth(app);
const dbAdmin = getFirestore(app);

// ═══════════════════════════════════════════
// Dropdown data
// ═══════════════════════════════════════════

const PROCEDURES = [
  { value: "TAH", label: "Total Abdominal Hysterectomy (TAH)", mainGroup: "GYN" },
  { value: "TLH", label: "Total Laparoscopic Hysterectomy (TLH)", mainGroup: "GYN" },
  { value: "LAVH", label: "Laparoscopic Assisted Vaginal Hysterectomy (LAVH)", mainGroup: "GYN" },
  { value: "LH", label: "Laparoscopic Hysterectomy (LH)", mainGroup: "GYN" },
  { value: "RH", label: "Radical Hysterectomy (RH)", mainGroup: "GYN" },
  { value: "RHPL", label: "Radical Hysterectomy + Pelvic Lymphadenectomy (RHPL)", mainGroup: "GYN" },
  { value: "EH", label: "Extrafascial Hysterectomy (EH)", mainGroup: "GYN" },
  { value: "EHPL", label: "EH + Pelvic Lymphadenectomy (EHPL)", mainGroup: "GYN" },
  { value: "LRHPL", label: "Laparoscopic RH + PL (LRHPL)", mainGroup: "GYN" },
  { value: "VH", label: "Vaginal Hysterectomy (VH)", mainGroup: "GYN" },
  { value: "SO", label: "Salpingo-oophorectomy (SO)", mainGroup: "GYN" },
  { value: "BSO", label: "Bilateral Salpingo-oophorectomy (BSO)", mainGroup: "GYN" },
  { value: "SALPINGECTOMY", label: "Salpingectomy", mainGroup: "GYN" },
  { value: "CYSTECTOMY", label: "Ovarian Cystectomy", mainGroup: "GYN" },
  { value: "MYOMECTOMY", label: "Myomectomy", mainGroup: "GYN" },
  { value: "CS", label: "Cesarean Section (C/S)", mainGroup: "OB" },
  { value: "CS_HYSTERECTOMY", label: "C/S + Hysterectomy", mainGroup: "OB" },
  { value: "HYSTEROSCOPY", label: "Hysteroscopy", mainGroup: "HYSTERO" },
  { value: "HYSTEROSCOPIC_MYOMECTOMY", label: "Hysteroscopic Myomectomy", mainGroup: "HYSTERO" },
  { value: "HYSTEROSCOPIC_POLYPECTOMY", label: "Hysteroscopic Polypectomy", mainGroup: "HYSTERO" },
  { value: "ATR", label: "ATR", mainGroup: "ATR" },
  { value: "NOTES_ASSIST", label: "NOTEs Assist to Hysterectomy", mainGroup: "NOTES" },
  { value: "LASER", label: "Laser", mainGroup: "LASER" },
  { value: "LAP_SURG", label: "Laparoscopic Surgery", mainGroup: "LAP_SURG" },
  { value: "D_AND_C", label: "D&C", mainGroup: "GYN" },
  { value: "EUA", label: "EUA", mainGroup: "GYN" },
  { value: "COLPOSCOPY", label: "Colposcopy", mainGroup: "GYN" },
  { value: "LEEP", label: "LEEP", mainGroup: "GYN" },
  { value: "CONE_BIOPSY", label: "Cone Biopsy", mainGroup: "GYN" },
];

const SURGEONS = [
  "อ.สมชาย",
  "อ.สมศรี",
  "อ.วิภา",
  "อ.ประเสริฐ",
  "อ.นพดล",
  "อ.สุวรรณ",
  "อ.จิราภรณ์",
  "อ.ธนากร",
];

const SCRUB_NURSES = [
  "พว.สมใจ",
  "พว.สุดา",
  "พว.มาลี",
  "พว.วิไล",
  "พว.อรุณ",
  "พว.นิภา",
];

const CIRCULATE_NURSES = [
  "พว.ประภา",
  "พว.สุภาพร",
  "พว.รัตนา",
  "พว.จันทรา",
  "พว.อัญชลี",
];

const OPERATING_ROOMS = [
  "OR1",
  "OR2",
  "OR3",
  "OR4",
  "OR5",
  "OR6",
  "OR7",
  "OR8",
];

// ═══════════════════════════════════════════
// Seed functions
// ═══════════════════════════════════════════

async function seedDropdownList(
  listName: string,
  items: { value: string; label: string; mainGroup?: string }[]
) {
  const now = Timestamp.now();
  await dbAdmin.doc(`dropdownLists/${listName}`).set({
    listName,
    items: items.map((item, i) => ({
      ...item,
      isActive: true,
      sortOrder: i,
    })),
    updatedAt: now,
    updatedBy: "seed_script",
  });
  console.log(`✅ Seeded dropdownLists/${listName} (${items.length} items)`);
}

async function createSuperAdmin(
  email: string,
  password: string,
  displayName: string
) {
  try {
    // Create Auth user
    const userRecord = await authAdmin.createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore user doc
    const now = Timestamp.now();
    await dbAdmin.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      displayName,
      roles: ["super_admin"],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed_script",
    });

    console.log(`✅ Created super admin: ${email} (uid: ${userRecord.uid})`);
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      console.log(`⚠️  User ${email} already exists, skipping`);
    } else {
      throw err;
    }
  }
}

// ═══════════════════════════════════════════
// Run
// ═══════════════════════════════════════════

async function main() {
  console.log("🚀 Seeding Firestore...\n");

  // Seed dropdown lists
  await seedDropdownList("procedures", PROCEDURES);
  await seedDropdownList(
    "surgeons",
    SURGEONS.map((s) => ({ value: s, label: s }))
  );
  await seedDropdownList(
    "scrubNurses",
    SCRUB_NURSES.map((s) => ({ value: s, label: s }))
  );
  await seedDropdownList(
    "circulateNurses",
    CIRCULATE_NURSES.map((s) => ({ value: s, label: s }))
  );
  await seedDropdownList(
    "operatingRooms",
    OPERATING_ROOMS.map((s) => ({ value: s, label: s }))
  );

  // Create super admin
  // ⚠️ เปลี่ยน email/password ก่อน deploy จริง!
  await createSuperAdmin(
    "admin@orward.local",
    "ChangeMe123!",
    "Super Admin"
  );

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
