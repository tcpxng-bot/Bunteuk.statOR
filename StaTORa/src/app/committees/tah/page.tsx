// src/app/committees/tah/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function TAHPage() {
  const config = getCommitteeConfig("TAH")!;
  return <CommitteeDashboard config={config} />;
}
