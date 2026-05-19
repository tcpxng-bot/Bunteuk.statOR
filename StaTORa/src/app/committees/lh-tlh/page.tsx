// src/app/committees/lh-tlh/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function LHTLHPage() {
  const config = getCommitteeConfig("LH_TLH")!;
  return <CommitteeDashboard config={config} />;
}
