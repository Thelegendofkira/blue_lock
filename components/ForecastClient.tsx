"use client";

import { useMemo } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Flame,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface GoalNode {
  id: string;
  title: string;
  reason: string;
  deadline: string | Date;
  parentId: string | null;
  isTask: boolean;
  quantifierUnit: string | null;
  targetQuantity: number | null;
  currentQuantity: number;
  status: string;
}

interface DailyLog {
  id: string;
  date: Date | string;
  hourBlock: number;
  blockType: string;
  taskId: string | null;
  timeSpent: number | null;
  valueAchieved: number | null;
  notes: string | null;
}

interface ForecastClientProps {
  mode: "weekly" | "monthly";
  goals: GoalNode[];
  logs: DailyLog[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toDateKey(d: Date | string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Data Processing ────────────────────────────────────────────────────────────

interface GoalForecast {
  goal: GoalNode;
  childTaskIds: string[];
  aggregateTarget: number;
  aggregateCurrent: number;
  periodProgress: number;          // quantity achieved in this period
  dailyProgressData: { dateKey: string; cumulative: number }[];
  dailyRate: number;               // average quantity per day this period
  daysRemaining: number;
  forecastedTotal: number;         // currentQuantity + dailyRate * daysRemaining
  willSucceed: boolean;
}

function buildForecasts(
  goals: GoalNode[],
  logs: DailyLog[],
  periodDays: number
): GoalForecast[] {
  const topGoals = goals.filter((g) => !g.parentId && g.status === "ACTIVE");
  if (topGoals.length === 0) return [];

  // Build child-task lookup: goalId -> all descendant task ids
  const childrenMap = new Map<string, GoalNode[]>();
  for (const n of goals) {
    if (n.parentId) {
      if (!childrenMap.has(n.parentId)) childrenMap.set(n.parentId, []);
      childrenMap.get(n.parentId)!.push(n);
    }
  }

  function collectTaskIds(nodeId: string): string[] {
    const ids: string[] = [];
    const children = childrenMap.get(nodeId) ?? [];
    for (const c of children) {
      if (c.isTask) ids.push(c.id);
      ids.push(...collectTaskIds(c.id));
    }
    return ids;
  }

  // Build date range keys
  const now = new Date();
  const dateKeys: string[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateKeys.push(toDateKey(d));
  }

  // Map logs by taskId + date
  const logMap = new Map<string, Map<string, number>>(); // taskId -> dateKey -> valueSum
  for (const l of logs) {
    if (l.blockType !== "TASK_EXECUTION" || !l.taskId) continue;
    const val = l.valueAchieved ?? 0;
    if (!logMap.has(l.taskId)) logMap.set(l.taskId, new Map());
    const dayMap = logMap.get(l.taskId)!;
    const dk = toDateKey(l.date);
    dayMap.set(dk, (dayMap.get(dk) ?? 0) + val);
  }

  const forecasts: GoalForecast[] = [];

  for (const goal of topGoals) {
    const taskIds = collectTaskIds(goal.id);
    // If the goal itself is a task, include it
    if (goal.isTask) taskIds.push(goal.id);

    // Aggregate target/current across all tasks under this goal
    const tasks = goals.filter((n) => taskIds.includes(n.id));
    const aggregateTarget = tasks.reduce((s, t) => s + (t.targetQuantity ?? 0), 0);
    const aggregateCurrent = tasks.reduce((s, t) => s + t.currentQuantity, 0);

    if (aggregateTarget <= 0) continue; // skip goals with no measurable target

    // Build daily cumulative progress for this period
    let cumulative = 0;
    const dailyProgressData: { dateKey: string; cumulative: number }[] = [];
    for (const dk of dateKeys) {
      let dayTotal = 0;
      for (const tid of taskIds) {
        dayTotal += logMap.get(tid)?.get(dk) ?? 0;
      }
      cumulative += dayTotal;
      dailyProgressData.push({ dateKey: dk, cumulative });
    }

    const periodProgress = cumulative;
    const dailyRate = periodProgress / periodDays;
    const daysRemaining = Math.max(0, daysBetween(now, new Date(goal.deadline)));
    const forecastedTotal = aggregateCurrent + dailyRate * daysRemaining;
    const willSucceed = forecastedTotal >= aggregateTarget;

    forecasts.push({
      goal,
      childTaskIds: taskIds,
      aggregateTarget,
      aggregateCurrent,
      periodProgress,
      dailyProgressData,
      dailyRate,
      daysRemaining,
      forecastedTotal,
      willSucceed,
    });
  }

  return forecasts;
}

// ─── SVG Chart ──────────────────────────────────────────────────────────────────

function ProgressChart({
  forecast,
  periodDays,
}: {
  forecast: GoalForecast;
  periodDays: number;
}) {
  const { dailyProgressData, aggregateTarget, aggregateCurrent, dailyRate, daysRemaining, willSucceed } = forecast;

  const W = 500;
  const H = 200;
  const PAD_L = 10;
  const PAD_R = 10;
  const PAD_T = 15;
  const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Total days = period + daysRemaining (forecast)
  const totalDays = periodDays + Math.min(daysRemaining, periodDays * 2);
  const remaining = aggregateTarget - aggregateCurrent;
  const maxY = Math.max(
    aggregateTarget * 1.15,
    (dailyProgressData[dailyProgressData.length - 1]?.cumulative ?? 0) * 1.2,
    remaining > 0 ? remaining * 1.15 : 1
  );

  const xScale = (i: number) => PAD_L + (i / Math.max(totalDays - 1, 1)) * chartW;
  const yScale = (v: number) => PAD_T + chartH - (v / maxY) * chartH;

  // Actual progress line (relative to remaining target, showing progress within period)
  const actualPoints = dailyProgressData.map((d, i) => `${xScale(i)},${yScale(d.cumulative)}`).join(" ");

  // Forecast line (continuing from last actual point)
  const lastCum = dailyProgressData[dailyProgressData.length - 1]?.cumulative ?? 0;
  const forecastPoints: string[] = [`${xScale(periodDays - 1)},${yScale(lastCum)}`];
  const forecastDaysToShow = Math.min(daysRemaining, periodDays * 2);
  for (let i = 1; i <= forecastDaysToShow; i++) {
    const val = lastCum + dailyRate * i;
    forecastPoints.push(`${xScale(periodDays - 1 + i)},${yScale(Math.min(val, maxY))}`);
  }

  // Target line (horizontal)
  const targetY = yScale(remaining > 0 ? remaining : aggregateTarget);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={PAD_L}
          y1={yScale(maxY * frac)}
          x2={W - PAD_R}
          y2={yScale(maxY * frac)}
          stroke="#27272a"
          strokeWidth="0.5"
        />
      ))}

      {/* Target line */}
      <line
        x1={PAD_L}
        y1={targetY}
        x2={W - PAD_R}
        y2={targetY}
        stroke="#dc2626"
        strokeWidth="1"
        strokeDasharray="6 3"
        opacity="0.6"
      />
      <text x={W - PAD_R - 2} y={targetY - 4} textAnchor="end" fill="#dc2626" fontSize="9" fontWeight="bold" opacity="0.8">
        REMAINING: {remaining > 0 ? remaining.toFixed(0) : "0"}
      </text>

      {/* Area fill under actual */}
      <polygon
        points={`${xScale(0)},${yScale(0)} ${actualPoints} ${xScale(periodDays - 1)},${yScale(0)}`}
        fill="url(#blueGrad)"
        opacity="0.3"
      />

      {/* Actual line */}
      <polyline
        points={actualPoints}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forecast line */}
      <polyline
        points={forecastPoints.join(" ")}
        fill="none"
        stroke={willSucceed ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.7"
      />

      {/* Day labels */}
      <text x={PAD_L} y={H - 4} fill="#52525b" fontSize="8" fontWeight="bold">
        {dailyProgressData[0]?.dateKey.slice(5)}
      </text>
      <text x={xScale(periodDays - 1)} y={H - 4} fill="#52525b" fontSize="8" fontWeight="bold" textAnchor="middle">
        Today
      </text>
      {forecastDaysToShow > 0 && (
        <text x={xScale(totalDays - 1)} y={H - 4} fill="#52525b" fontSize="8" fontWeight="bold" textAnchor="end">
          +{forecastDaysToShow}d
        </text>
      )}

      <defs>
        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Verdict Card ───────────────────────────────────────────────────────────────

function VerdictCard({ forecast }: { forecast: GoalForecast }) {
  const { goal, willSucceed, dailyRate, daysRemaining, aggregateTarget, aggregateCurrent, forecastedTotal, periodProgress } = forecast;
  const pct = aggregateTarget > 0 ? Math.round((aggregateCurrent / aggregateTarget) * 100) : 0;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 transition-all ${
        willSucceed
          ? "border-green-800/50 bg-gradient-to-br from-green-950/30 to-zinc-950"
          : "border-red-800/50 bg-gradient-to-br from-red-950/30 to-zinc-950"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-black text-white truncate">{goal.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Deadline: {fmtDate(goal.deadline)} · {daysRemaining}d remaining
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
            willSucceed
              ? "border-green-700 bg-green-950/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
              : "border-red-700 bg-red-950/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          }`}
        >
          {willSucceed ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              On Track
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              Will Fail
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-400 font-mono">
            {aggregateCurrent.toFixed(0)}<span className="text-zinc-600"> / {aggregateTarget.toFixed(0)}</span>
          </span>
          <span className={`font-bold font-mono ${pct >= 80 ? "text-green-400" : pct >= 40 ? "text-blue-400" : "text-red-400"}`}>
            {pct}%
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-center">
          <p className="text-lg font-black font-mono text-blue-400">{periodProgress.toFixed(0)}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Period +</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-center">
          <p className="text-lg font-black font-mono text-zinc-300">{dailyRate.toFixed(1)}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">/day avg</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-center">
          <p className={`text-lg font-black font-mono ${willSucceed ? "text-green-400" : "text-red-400"}`}>
            {forecastedTotal.toFixed(0)}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Forecast</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/80 p-2 sm:p-3">
        <ProgressChart forecast={forecast} periodDays={forecast.dailyProgressData.length} />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ForecastClient({ mode, goals, logs }: ForecastClientProps) {
  const periodDays = mode === "weekly" ? 7 : 30;
  const label = mode === "weekly" ? "Weekly" : "Monthly";

  const forecasts = useMemo(
    () => buildForecasts(goals, logs, periodDays),
    [goals, logs, periodDays]
  );

  const onTrackCount = forecasts.filter((f) => f.willSucceed).length;
  const failingCount = forecasts.filter((f) => !f.willSucceed).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            <span className="text-blue-500">{label}</span> Forecast
          </h1>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto">
            {mode === "weekly" ? "Last 7 days" : "Last 30 days"} of progress per goal.
            Forecasted at the same daily rate to your deadline.
          </p>
        </div>

        {/* Summary strip */}
        {forecasts.length > 0 && (
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-800/40 bg-green-950/20">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-bold text-green-400">{onTrackCount} On Track</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-800/40 bg-red-950/20">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-red-400">{failingCount} Failing</span>
            </div>
          </div>
        )}

        {/* Goal forecast cards */}
        {forecasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Target className="w-12 h-12 text-zinc-700 mb-4" />
            <p className="text-lg font-bold text-zinc-400">No measurable goals found</p>
            <p className="text-sm text-zinc-600 mt-1 max-w-sm">
              Create goals with tasks that have a <span className="text-blue-400 font-bold">target quantity</span> to see forecasts here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {forecasts.map((f) => (
              <VerdictCard key={f.goal.id} forecast={f} />
            ))}
          </div>
        )}

        {/* Footer legend */}
        {forecasts.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded bg-blue-500 inline-block" /> Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded bg-green-500 inline-block border-dashed" /> Forecast (pass)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded bg-red-500 inline-block" /> Forecast (fail)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded bg-red-600/50 inline-block border-dashed" /> Target
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
