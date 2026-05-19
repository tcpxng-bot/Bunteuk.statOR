// src/app/committees/ovarian-tumor/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function OvarianTumorPage() {
  const config = getCommitteeConfig("OVARIAN_TUMOR")!;
  return <CommitteeDashboard config={config} />;
}
