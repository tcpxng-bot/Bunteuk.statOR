// src/app/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useTodayOperations, useTomorrowPreOpCases, useOperations } from "@/hooks/useOperations";
import { OperationDoc, PreOpCaseDoc } from "@/types/database";
import { deleteOperation } from "@/lib/firestore";

type Tab = "today" | "tomorrow";
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const { userDoc, hasAnyRole } = useAuth();
  const router = useRouter();
  const { operations: todayOps, loading: todayLoading } = useTodayOperations();
  const { cases: tomorrowCases, loading: tomorrowLoading } = useTomorrowPreOpCases();
  const now = new Date();
  const { operations: monthOps, loading: monthLoading } = useOperations({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const canAddCase = hasAnyRole(["statistician", "super_admin"]);

  const stats = useMemo(() => {
    if (!monthOps.length) return null;
    const total = monthOps.length;
    const elective = monthOps.filter((o) => o.urgency === "Elective").length;
    const emergency = monthOps.filter((o) => o.urgency === "Emergency").length;
    const complicated = monthOps.filter((o) => o.hasComplication).length;
    const procMap = new Map<string, { elective: number; emergency: number; other: number }>();
    monthOps.forEach((op) => {
      const e = procMap.get(op.procedureName) || { elective: 0, emergency: 0, other: 0 };
      if (op.urgency === "Elective") e.elective++; else if (op.urgency === "Emergency") e.emergency++; else e.other++;
      procMap.set(op.procedureName, e);
    });
    const topProcedures = [...procMap.entries()].map(([name, c]) => ({ name, ...c, total: c.elective + c.emergency + c.other })).sort((a, b) => b.total - a.total).slice(0, 5);
    const groupMap = new Map<string, number>();
    monthOps.forEach((op) => groupMap.set(op.mainGroup, (groupMap.get(op.mainGroup) || 0) + 1));
    return { total, elective, emergency, electivePercent: Math.round((elective / total) * 100), emergencyPercent: Math.round((emergency / total) * 100), complicationRate: total > 0 ? ((complicated / total) * 100).toFixed(1) : "0", topProcedures, groups: [...groupMap.entries()].sort((a, b) => b[1] - a[1]) };
  }, [monthOps]);

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-900 tracking-tight">สวัสดี, {userDoc?.displayName?.split(" ")[0]}</h1>
            <p className="text-sm text-gray-400 mt-1">{now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          {canAddCase && (
            <button onClick={() => router.push("/operations/new")} className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              เพิ่มเคส
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
          {(["today", "tomorrow"] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab === "today" ? "Today" : "Tomorrow"}
              {tab === "today" && todayOps.length > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-100 px-1.5 text-xs font-mono text-teal-700">{todayOps.length}</span>}
              {tab === "tomorrow" && tomorrowCases.length > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-mono text-amber-700">{tomorrowCases.length}</span>}
            </button>
          ))}
        </div>

        {activeTab === "today" ? <TodayTab operations={todayOps} loading={todayLoading} canEdit={canAddCase} /> : <TomorrowTab cases={tomorrowCases} loading={tomorrowLoading} canAdd={canAddCase} />}

        <div className="mt-10">
          <h2 className="text-base font-medium text-gray-900 mb-4">สถิติ {MONTHS_TH[now.getMonth()]} {now.getFullYear() + 543}</h2>
          {monthLoading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard label="ทั้งหมด" value={stats.total} color="teal" />
                <StatCard label="Elective" value={stats.elective} sub={`${stats.electivePercent}%`} color="blue" />
                <StatCard label="Emergency" value={stats.emergency} sub={`${stats.emergencyPercent}%`} color="amber" />
                <StatCard label="Complication" value={`${stats.complicationRate}%`} color="red" />
              </div>
              {stats.topProcedures.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-100 p-5 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Top 5 หัตถการ</h3>
                  <div className="space-y-3">
                    {stats.topProcedures.map((proc) => {
                      const maxTotal = stats.topProcedures[0].total;
                      return (
                        <div key={proc.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-gray-700">{proc.name}</span>
                            <span className="text-sm font-mono text-gray-500">{proc.total}</span>
                          </div>
                          <div className="flex h-6 rounded-lg overflow-hidden bg-gray-50">
                            {proc.elective > 0 && <div className="bg-teal-400" style={{ width: `${(proc.elective / maxTotal) * 100}%` }} />}
                            {proc.emergency > 0 && <div className="bg-amber-400" style={{ width: `${(proc.emergency / maxTotal) * 100}%` }} />}
                            {proc.other > 0 && <div className="bg-gray-300" style={{ width: `${(proc.other / maxTotal) * 100}%` }} />}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 pt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-400" /> Elective</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Emergency</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Other</span>
                    </div>
                  </div>
                </div>
              )}
              {stats.groups.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-100 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">แยกตาม Main Group</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {stats.groups.map(([group, count]) => (
                      <div key={group} className="rounded-xl bg-gray-50 p-3 text-center">
                        <div className="text-lg font-mono font-medium text-gray-900">{count}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{group}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูลเดือนนี้</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function TodayTab({ operations, loading, canEdit }: { operations: OperationDoc[]; loading: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteOperation(id);
    setDeleting(null);
    setConfirmDelete(null);
  }

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" /></div>;
  if (!operations.length) return <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center"><p className="text-sm text-gray-500">ไม่มีเคสวันนี้</p></div>;

  return (
    <>
      <div className="space-y-2">
        {operations.map((op) => (
          <div key={op.id} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-4 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className={`h-10 w-1 rounded-full shrink-0 ${op.urgency === "Emergency" ? "bg-amber-400" : op.urgency === "Elective" ? "bg-teal-400" : "bg-gray-300"}`} />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/operations/${op.id}`)}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 truncate">{op.procedureName}</span>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">{op.mainGroup}</span>
                {op.status === "confirmed" && <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-600">✓</span>}
                {op.hasComplication && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-600">Complication</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                <span>{op.surgeon || "—"}</span>
                {op.durationMinutes > 0 && <><span>·</span><span>{op.durationMinutes} min</span></>}
                {op.operatingRoom && <><span>·</span><span>{op.operatingRoom}</span></>}
                {op.postOpTransfer && <><span>·</span><span className="text-blue-500">{op.postOpTransfer}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => router.push(`/rr-summary/new/${op.id}`)} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap">
                RR
              </button>
              {canEdit && (
                <button onClick={() => setConfirmDelete(op.id)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-medium text-gray-900 mb-2">ลบเคสนี้?</h3>
            <p className="text-sm text-gray-500 mb-4">ข้อมูลจะถูกลบถาวร ไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600">ยกเลิก</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deleting} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm text-white hover:bg-red-600 disabled:opacity-50">{deleting ? "กำลังลบ..." : "ลบเลย"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TomorrowTab({ cases, loading, canAdd }: { cases: PreOpCaseDoc[]; loading: boolean; canAdd: boolean }) {
  const router = useRouter();
  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" /></div>;
  if (!cases.length) return <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center"><p className="text-sm text-gray-500">ยังไม่มีเคสพรุ่งนี้</p></div>;

  return (
    <div className="space-y-2">
      {cases.map((c: any) => (
        <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-4 hover:border-gray-200 transition-all">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900">{c.procedureName}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
              <span>{c.surgeon}</span><span>·</span><span>HN-xxxx{c.hnLast3}</span>
              {c.preOpDiagnosis && <><span>·</span><span>{c.preOpDiagnosis}</span></>}
              {c.planConsultUro && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Plan Uro</span>}
              {c.planConsultColo && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Plan Colo</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.setReady ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>{c.setReady ? "✓" : "○"} Set</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.chargeWritten ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>{c.chargeWritten ? "✓" : "○"} Charge</span>
            {canAdd && !c.operationId && (
              <button onClick={() => router.push(`/operations/new?from=${c.id}`)} className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-100 transition-colors">
                + OR
              </button>
            )}
            {c.operationId && (
              <button onClick={() => router.push(`/operations/${c.operationId}`)} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                ดู OR →
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: "teal" | "blue" | "amber" | "red" }) {
  const colors = { teal: "bg-teal-50 border-teal-100", blue: "bg-blue-50 border-blue-100", amber: "bg-amber-50 border-amber-100", red: "bg-red-50 border-red-100" };
  const textColors = { teal: "text-teal-700", blue: "text-blue-700", amber: "text-amber-700", red: "text-red-700" };
  return (
    <div className={`rounded-2xl border px-4 py-4 ${colors[color]}`}>
      <div className={`text-2xl font-mono font-medium ${textColors[color]}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">{label}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}
