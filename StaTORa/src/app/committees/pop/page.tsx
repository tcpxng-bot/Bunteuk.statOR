// src/app/committees/pop/page.tsx
"use client";
import { CommitteeDashboard } from "@/components/CommitteeDashboard";
import { getCommitteeConfig } from "@/lib/committeeConfig";

export default function POPPage() {
  const config = getCommitteeConfig("POP")!;
  return <CommitteeDashboard config={config} />;
}
