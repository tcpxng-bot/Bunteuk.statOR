// src/lib/firebase-admin.ts
// Firebase Admin SDK — ใช้ฝั่ง server (API routes, SSR) เท่านั้น
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Option 1: Use service account JSON (development)
  // Option 2: Use GOOGLE_APPLICATION_CREDENTIALS env var (production on GCP)
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
