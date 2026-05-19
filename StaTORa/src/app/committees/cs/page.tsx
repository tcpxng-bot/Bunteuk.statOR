// src/app/committees/cs/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function CSPage() {
  const config = getCommitteeConfig("CS")!;
  return <CommitteeDashboard config={config} />;
}
