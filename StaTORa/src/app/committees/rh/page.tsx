// src/app/committees/rh/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function RHPage() {
  const config = getCommitteeConfig("RH")!;
  return <CommitteeDashboard config={config} />;
}
