// src/app/committees/ca-cervix/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function CACervixPage() {
  const config = getCommitteeConfig("CA_CERVIX")!;
  return <CommitteeDashboard config={config} />;
}
