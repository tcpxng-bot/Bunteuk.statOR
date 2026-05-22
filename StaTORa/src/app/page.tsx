// src/app/page.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useTodayOperations, useTomorrowPreOpCases, useOperations } from "@/hooks/useOperations";
import { usePendingCases } from "@/hooks/usePendingCases";
import { OperationDoc, PreOpCaseDoc } from "@/types/database";

type Tab = "today" | "tomorrow";


// ── Count Up animation hook ──────────────────
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    setValue(0);
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);
  return value;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const { userDoc, hasRole } = useAuth();
  const router = useRouter();
  const { operations: todayOps, loading: todayLoading } = useTodayOperations();
  const { cases: tomorrowCases, loading: tomorrowLoading } = useTomorrowPreOpCases();
  const { pendingORCount, pendingRRCount, pendingORCases, loading: pendingLoading } = usePendingCases();

  const now = new Date();
  const { operations: monthOps, loading: monthLoading } = useOperations({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const stats = useMemo(() => {
    if (monthOps.length === 0) return null;

    const total = monthOps.length;
    const elective = monthOps.filter((o) => o.urgency === "Elective").length;
    const emergency = monthOps.filter((o) => o.urgency === "Emergency").length;
    const complicated = monthOps.filter((o) => o.hasComplication).length;

    const procMap = new Map<string, { elective: number; emergency: number; other: number }>();
    monthOps.forEach((op) => {
      const existing = procMap.get(op.procedureName) || { elective: 0, emergency: 0, other: 0 };
      if (op.urgency === "Elective") existing.elective++;
      else if (op.urgency === "Emergency") existing.emergency++;
      else existing.other++;
      procMap.set(op.procedureName, existing);
    });
    const topProcedures = [...procMap.entries()]
      .map(([name, counts]) => ({ name, ...counts, total: counts.elective + counts.emergency + counts.other }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const groupMap = new Map<string, number>();
    monthOps.forEach((op) => {
      groupMap.set(op.mainGroup, (groupMap.get(op.mainGroup) || 0) + 1);
    });

    return {
      total,
      elective,
      emergency,
      electivePercent: Math.round((elective / total) * 100),
      emergencyPercent: Math.round((emergency / total) * 100),
      complicationRate: total > 0 ? ((complicated / total) * 100).toFixed(1) : "0",
      topProcedures,
      groups: [...groupMap.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [monthOps]);

  const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl lg:text-2xl font-medium text-gray-900 tracking-tight">
            สวัสดี, {userDoc?.displayName?.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Today / Tomorrow tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{background: "#E1F5EE"}}>
          <button
            onClick={() => setActiveTab("today")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "today" ? "bg-white font-medium" : "hover:bg-white/50"
            }`}
          >
            Today
            {todayOps.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-100 px-1.5 text-xs font-mono text-teal-700">
                {todayOps.length}
              </span>
            )}
            {pendingORCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1.5 text-xs font-mono text-orange-700">
                {pendingORCount} รอกรอก
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("tomorrow")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "tomorrow" ? "bg-white font-medium" : "hover:bg-white/50"
            }`}
          >
            Tomorrow
            {tomorrowCases.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-mono text-amber-700">
                {tomorrowCases.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "today" ? (
          <TodayTab operations={todayOps} loading={todayLoading} pendingCases={pendingORCases} pendingLoading={pendingLoading} pendingRRCount={pendingRRCount} onOpenORForm={(id) => router.push(`/operations/new?preOpCaseId=${id}`)} canFillOR={hasRole("statistician") || hasRole("super_admin")} />
        ) : (
          <TomorrowTab cases={tomorrowCases} loading={tomorrowLoading} />
        )}

        {/* Monthly summary */}
        <div className="mt-10">
          <h2 className="text-base font-medium text-gray-900 mb-4">
            สถิติ {MONTHS_TH[now.getMonth()]} {now.getFullYear() + 543}
          </h2>

          {monthLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard label="ทั้งหมด" value={stats.total} color="teal" animate />
                <StatCard label="Elective" value={stats.elective} sub={`${stats.electivePercent}%`} color="blue" animate />
                <StatCard label="Emergency" value={stats.emergency} sub={`${stats.emergencyPercent}%`} color="amber" animate />
                <StatCard label="Complication" value={`${stats.complicationRate}%`} color="red" />
              </div>

              {stats.topProcedures.length > 0 && (
                <div className="rounded-2xl p-5 mb-6" style={{background: "#fff", border: "0.5px solid #D9EDE6"}}>
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
                            {proc.elective > 0 && (
                              <div className="bg-teal-400 transition-all" style={{ width: `${(proc.elective / maxTotal) * 100}%` }} title={`Elective: ${proc.elective}`} />
                            )}
                            {proc.emergency > 0 && (
                              <div className="bg-amber-400 transition-all" style={{ width: `${(proc.emergency / maxTotal) * 100}%` }} title={`Emergency: ${proc.emergency}`} />
                            )}
                            {proc.other > 0 && (
                              <div className="bg-gray-300 transition-all" style={{ width: `${(proc.other / maxTotal) * 100}%` }} title={`Other: ${proc.other}`} />
                            )}
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
                <div className="rounded-2xl p-5" style={{background: "#fff", border: "0.5px solid #D9EDE6"}}>
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
            <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center text-sm text-gray-400">
              ยังไม่มีข้อมูลเดือนนี้
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function TodayTab({
  operations,
  loading,
  pendingCases,
  pendingLoading,
  pendingRRCount,
  onOpenORForm,
  canFillOR,
}: {
  operations: OperationDoc[];
  loading: boolean;
  pendingCases: PreOpCaseDoc[];
  pendingLoading: boolean;
  pendingRRCount: number;
  onOpenORForm: (preOpCaseId: string) => void;
  canFillOR: boolean;
}) {
  if (loading || pendingLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" /></div>;

  const hasPending = pendingCases.length > 0 || pendingRRCount > 0;

  return (
    <div className="space-y-4">
      {/* Pending alert banner */}
      {hasPending && (
        <div className="rounded-2xl bg-orange-50 border border-orange-100 px-5 py-4">
          <p className="text-sm font-medium text-orange-800 mb-2">เคสที่ยังรอกรอกข้อมูล</p>
          <div className="flex gap-3">
            {pendingCases.length > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                รอกรอก OR form {pendingCases.length} เคส
              </span>
            )}
            {pendingRRCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                รอกรอก RR form {pendingRRCount} เคส
              </span>
            )}
          </div>
          {/* Pending OR cases list */}
          {pendingCases.length > 0 && (
            <div className="mt-3 space-y-2">
              {pendingCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => canFillOR && onOpenORForm(c.id)}
                  className={`flex items-center gap-3 rounded-xl bg-white border border-orange-100 px-4 py-3 transition-all ${canFillOR ? "cursor-pointer hover:border-orange-300 hover:shadow-sm" : ""}`}
                >
                  <div className="h-8 w-1 rounded-full bg-orange-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{c.procedureName}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{c.surgeon}</span>
                      <span>·</span>
                      <span>HN-xxxx{c.hnLast3}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">รอกรอก OR</span>
                    {canFillOR && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed today cases */}
      {operations.length === 0 && !hasPending && (
        <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500">ไม่มีเคสวันนี้</p>
        </div>
      )}
      {operations.length > 0 && (
        <div className="space-y-2">
          {operations.map((op) => (
            <div key={op.id} className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
              <div className={`h-10 w-1 rounded-full shrink-0 ${op.urgency === "Emergency" ? "bg-amber-400" : op.urgency === "Elective" ? "bg-teal-400" : "bg-gray-300"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{op.procedureName}</span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">{op.mainGroup}</span>
                  {op.caseStatus === "pending_rr" && (
                    <span className="shrink-0 rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700">รอกรอก RR</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>{op.surgeon}</span>
                  <span>·</span>
                  <span className="font-mono">{op.durationMinutes} min</span>
                  {op.operatingRoom && <><span>·</span><span>{op.operatingRoom}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {op.hasComplication && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-600 font-medium">Complication</span>}
                {op.isPPH && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 font-medium">PPH</span>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TomorrowTab({ cases, loading }: { cases: PreOpCaseDoc[]; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" /></div>;
  if (cases.length === 0) return <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center"><p className="text-sm text-gray-500">ยังไม่มีเคสพรุ่งนี้</p></div>;

  return (
    <div className="space-y-2">
      {cases.map((c) => (
        <div key={c.id} className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 px-5 py-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900">{c.procedureName}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>{c.surgeon}</span><span>·</span><span>HN-xxxx{c.hnLast3}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.setReady ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
              {c.setReady ? "✓" : "○"} Set
            </span>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.chargeWritten ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
              {c.chargeWritten ? "✓" : "○"} Charge
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color, animate = false }: { label: string; value: string | number; sub?: string; color: "teal" | "blue" | "amber" | "red"; animate?: boolean }) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  const isNumeric = typeof value === "number" || (!isNaN(parseFloat(String(value))) && !String(value).includes("%"));
  const animated = useCountUp(isNumeric && animate ? numericValue : numericValue, 1000, 0);

  const styles = {
    teal: { bg: "#E1F5EE", text: "#085041", sub: "#0F6E56" },
    blue: { bg: "#EEEDFE", text: "#3C3489", sub: "#534AB7" },
    amber: { bg: "#FAEEDA", text: "#633806", sub: "#854F0B" },
    red: { bg: "#FCEBEB", text: "#791F1F", sub: "#A32D2D" },
  };
  const s = styles[color];

  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: s.bg }}>
      <div className="text-2xl font-mono font-medium" style={{ color: s.text }}>
        {animate && isNumeric ? animated : value}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs" style={{ color: s.sub }}>{label}</span>
        {sub && <span className="text-xs" style={{ color: s.sub, opacity: 0.7 }}>{sub}</span>}
      </div>
    </div>
  );
}
