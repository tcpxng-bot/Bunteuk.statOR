// src/components/CommitteeDashboard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useCommitteeData, computeCommitteeSummary } from "@/hooks/useCommitteeData";
import { CommitteeConfig } from "@/lib/committeeConfig";
import { interpretPainScore } from "@/types/database";
import { Role } from "@/types/database";

const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDate(ts: any): string {
  if (!ts || !ts.toDate) return "-";
  const d = ts.toDate();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

interface CommitteeDashboardProps {
  config: CommitteeConfig;
}

export function CommitteeDashboard({ config }: CommitteeDashboardProps) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { rows, loading } = useCommitteeData({ config, year, month });
  const summary = computeCommitteeSummary(rows, config);

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    yearOptions.push({ value: y, label: `${y + 543}` });
  }

  return (
    <AppShell requiredRoles={[config.role, "super_admin"] as Role[]}>
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-medium text-gray-900 tracking-tight">
              {config.label}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{config.labelTH}</p>
          </div>

          {/* Month/Year picker */}
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_8px_center] bg-no-repeat pr-8"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_8px_center] bg-no-repeat pr-8"
            >
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <SummaryCard
                label="เคสทั้งหมด"
                value={summary.total}
                color="gray"
              />
              <SummaryCard
                label="กรอกตัวชี้วัดแล้ว"
                value={summary.withIndicators}
                sub={`/ ${summary.total}`}
                color="teal"
              />
              <SummaryCard
                label="มี RR"
                value={summary.withRR}
                sub={`/ ${summary.total}`}
                color="blue"
              />
              {config.type === "CS" && (
                <SummaryCard
                  label="PPH (EBL>1000)"
                  value={summary.pphCount}
                  color="red"
                />
              )}
            </div>

            {/* Indicator summary */}
            {(config.manualIndicators.length > 0 || config.rrIndicators.length > 0) && (
              <div className="rounded-2xl bg-white border border-gray-100 p-5 lg:p-6 mb-6">
                <h2 className="text-sm font-medium text-gray-900 mb-4">
                  สรุปตัวชี้วัด
                </h2>
                <div className="space-y-2.5">
                  {config.manualIndicators
                    .filter((f) => f.type === "boolean")
                    .map((field) => {
                      const AUTO_KEYS = ["adjacentOrganInjury", "foreignBodyRetained", "woundInfection", "preventableIncident", "unplannedAdmission", "icuObserve"];
                      const isAuto = AUTO_KEYS.includes(field.key);
                      return (
                        <IndicatorRow
                          key={field.key}
                          label={field.label}
                          count={summary.indicatorCounts[field.key] || 0}
                          total={summary.total}
                          tag={isAuto ? "auto จาก OR" : "กรอกเอง"}
                        />
                      );
                    })}
                  {config.rrIndicators
                    .filter((f) => f.type === "boolean")
                    .map((field) => (
                      <IndicatorRow
                        key={field.key}
                        label={field.label}
                        count={summary.rrCounts[field.key] || 0}
                        total={summary.withRR}
                        tag="RR"
                      />
                    ))}
                  {config.type === "CS" && (
                    <>
                      <IndicatorRow
                        label="ภาวะตกเลือดหลังคลอด (EBL >1000)"
                        count={summary.pphCount}
                        total={summary.total}
                        tag="auto"
                      />
                      <IndicatorRow
                        label="ทารกคลอดก่อนกำหนด (GA<37)"
                        count={summary.pretermCount}
                        total={summary.total}
                        tag="auto"
                      />
                    </>
                  )}
                </div>

                {/* Pain score summary */}
                {summary.painScores.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-50">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">
                      Pain Score (NRS) — {config.label}
                    </h3>
                    <PainScoreSummary
                      scores={summary.painScores}
                      committeeType={config.type}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Cases list */}
            <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900">
                  รายการเคส ({rows.length})
                </h2>
              </div>

              {rows.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-400">
                  ไม่มีเคสในเดือนที่เลือก
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {rows.map((row) => {
                    const hasInd = !!row.indicator;
                    const hasRR = !!row.rr;

                    return (
                      <button
                        key={row.operation.id}
                        onClick={() =>
                          router.push(
                            `/committees/record/${row.operation.id}?type=${config.type}`
                          )
                        }
                        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Status bar */}
                        <div
                          className={`h-10 w-1 rounded-full shrink-0 ${
                            hasInd
                              ? "bg-green-400"
                              : "bg-amber-400"
                          }`}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {row.operation.procedureName}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDate(row.operation.operationDate)} ·{" "}
                            {row.operation.surgeon} ·{" "}
                            <span className="font-mono">
                              {row.operation.durationMinutes} min
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasRR && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              RR
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              hasInd
                                ? "bg-green-50 text-green-600"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {hasInd ? "✓ เสร็จ" : "กรอก"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-components ──

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color: "gray" | "teal" | "blue" | "red";
}) {
  const colors = {
    gray: "bg-gray-50 text-gray-900",
    teal: "bg-teal-50 text-teal-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-2xl px-4 py-4 ${colors[color]}`}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-semibold font-mono">
        {value}
        {sub && (
          <span className="text-sm font-normal opacity-50 ml-0.5">{sub}</span>
        )}
      </div>
    </div>
  );
}

function IndicatorRow({
  label,
  count,
  total,
  tag,
}: {
  label: string;
  count: number;
  total: number;
  tag: string;
}) {
  const rate = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
  const hasPositive = count > 0;

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 truncate block">{label}</span>
      </div>
      <span
        className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
          tag === "RR"
            ? "bg-blue-50 text-blue-500"
            : tag === "auto"
              ? "bg-purple-50 text-purple-500"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        {tag}
      </span>
      <span
        className={`text-sm font-mono tabular-nums w-20 text-right ${
          hasPositive ? "text-red-600 font-medium" : "text-gray-400"
        }`}
      >
        {count}/{total}
        <span className="text-xs ml-1 opacity-60">({rate}%)</span>
      </span>
    </div>
  );
}

function PainScoreSummary({
  scores,
  committeeType,
}: {
  scores: number[];
  committeeType: string;
}) {
  // Group by interpretation
  const groups: Record<string, number> = {};
  for (const s of scores) {
    const label = interpretPainScore(committeeType as any, s);
    groups[label] = (groups[label] || 0) + 1;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(groups).map(([label, count]) => (
        <div
          key={label}
          className="rounded-lg bg-gray-50 px-3 py-2 text-center"
        >
          <div className="text-lg font-mono font-semibold text-gray-900">
            {count}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}
