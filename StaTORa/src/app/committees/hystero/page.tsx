// src/app/committees/hystero/page.tsx
"use client";

import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function HysteroPage() {
  const config = getCommitteeConfig("HYSTERO")!;
  return <CommitteeDashboard config={config} />;
}
