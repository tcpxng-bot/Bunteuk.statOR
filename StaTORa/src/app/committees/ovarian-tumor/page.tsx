// src/app/committees/ovarian-tumor/page.tsx
// Ovarian Tumor committee removed — redirect to committees index
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function OvarianTumorPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/committees"); }, [router]);
  return null;
}

