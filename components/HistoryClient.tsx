"use client";

import { useState, useMemo } from "react";
import {
  Flame,
  Skull,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Brain,
  CalendarX2,
  FileText,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  effortType: string;
  quantifierUnit: string | null;
  targetQuantity: number | null;
  currentQuantity: number;
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
  task?: Task | null;
}

interface DailyReport {
  id: string;
  date: Date | string;
  progress: string;
  actionsDoneProperly: string;
  distractions: string;
  rootDiagnosis: string;
  negligenceWarning: string;
  createdAt: Date | string;
}

interface HistoryClientProps {
  logs: DailyLog[];
  reports: DailyReport[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toDateKey(d: Date | string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function fmtHrs(h: number): string {
  if (h <= 0) return "0h";
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.round(h * 60)}m`;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Build 30‑day buckets ───────────────────────────────────────────────────────

interface DayBucket {
  dateKey: string;
  workHours: number;
  wastedHours: number;
  logCount: number;
  logs: DailyLog[];
  report: DailyReport | null;
}

function buildBuckets(logs: DailyLog[], reports: DailyReport[]): DayBucket[] {
  const logMap = new Map<string, DailyLog[]>();
  for (const l of logs) {
    const k = toDateKey(l.date);
    if (!logMap.has(k)) logMap.set(k, []);
    logMap.get(k)!.push(l);
  }

  const reportMap = new Map<string, DailyReport>();
  for (const r of reports) {
    reportMap.set(toDateKey(r.date), r);
  }

  const buckets: DayBucket[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayLogs = logMap.get(k) ?? [];
    const work = dayLogs.filter((l) => l.blockType === "TASK_EXECUTION").reduce((s, l) => s + (l.timeSpent ?? 0), 0);
    const wasted = dayLogs.filter((l) => l.blockType === "DISTRACTION").reduce((s, l) => s + (l.timeSpent ?? 0), 0);
    buckets.push({
      dateKey: k,
      workHours: work,
      wastedHours: wasted,
      logCount: dayLogs.length,
      logs: dayLogs,
      report: reportMap.get(k) ?? null,
    });
  }
  return buckets;
}

// ─── Format clipboard payload ───────────────────────────────────────────────────

function buildClipboardText(buckets: DayBucket[]): string {
  const lines: string[] = [
    "═══════════════════════════════════════════",
    " 30-DAY COGNITIVE LOG — FULL CONTEXT DUMP",
    "═══════════════════════════════════════════",
    "",
  ];

  for (const b of buckets) {
    lines.push(`──── ${b.dateKey} (${getDayLabel(b.dateKey)}) ────`);
    if (b.logCount === 0) {
      lines.push("  [NO LOGS — DAY NEGLECTED]");
    } else {
      lines.push(`  Work: ${fmtHrs(b.workHours)} | Wasted: ${fmtHrs(b.wastedHours)} | Entries: ${b.logCount}`);
      for (const l of b.logs) {
        const type = l.blockType;
        const task = l.task?.title ?? "—";
        const time = l.timeSpent ? fmtHrs(l.timeSpent) : "—";
        const note = l.notes ? ` "${l.notes}"` : "";
        lines.push(`    [${String(l.hourBlock).padStart(2, "0")}:00] ${type} | ${task} | ${time}${note}`);
      }
    }
    if (b.report) {
      lines.push("  --- AI REPORT ---");
      lines.push(`  Root Diagnosis: ${b.report.rootDiagnosis}`);
      lines.push(`  Progress: ${b.report.progress}`);
      lines.push(`  Actions Done Properly: ${b.report.actionsDoneProperly}`);
      lines.push(`  Distractions: ${b.report.distractions}`);
      lines.push(`  Negligence Warning: ${b.report.negligenceWarning}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Sub‑components ─────────────────────────────────────────────────────────────

function HeatmapCell({ bucket, onHover, onLeave }: { bucket: DayBucket; onHover: (b: DayBucket, e: React.MouseEvent) => void; onLeave: () => void }) {
  let bg: string;
  let shadow = "";
  if (bucket.logCount === 0) {
    bg = "bg-zinc-800/60";
  } else if (bucket.workHours > bucket.wastedHours) {
    const intensity = Math.min(1, bucket.workHours / 8);
    bg = intensity > 0.5 ? "bg-blue-500" : "bg-blue-600/70";
    shadow = "shadow-[0_0_8px_rgba(37,99,235,0.4)]";
  } else if (bucket.wastedHours > bucket.workHours) {
    bg = "bg-red-600";
    shadow = "shadow-[0_0_8px_rgba(239,68,68,0.4)]";
  } else {
    bg = "bg-zinc-700";
  }

  const dayNum = new Date(bucket.dateKey + "T00:00:00").getDate();

  return (
    <div
      onMouseEnter={(e) => onHover(bucket, e)}
      onMouseLeave={onLeave}
      className={`relative aspect-square rounded-md ${bg} ${shadow} transition-all duration-200 hover:scale-110 hover:ring-1 hover:ring-white/20 cursor-crosshair flex items-center justify-center`}
    >
      <span className="text-[9px] font-mono font-bold text-white/40 select-none">{dayNum}</span>
    </div>
  );
}

function Tooltip({ bucket, x, y }: { bucket: DayBucket; x: number; y: number }) {
  return (
    <div
      className="fixed z-[999] pointer-events-none bg-zinc-900 border border-zinc-600 rounded-xl px-4 py-3 shadow-2xl shadow-black/80 min-w-[180px]"
      style={{ left: x + 12, top: y - 60 }}
    >
      <p className="text-xs font-black text-white mb-1.5">{getDayLabel(bucket.dateKey)}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-zinc-300">Work: <span className="font-mono font-bold text-blue-400">{fmtHrs(bucket.workHours)}</span></span>
      </div>
      <div className="flex items-center gap-2 text-xs mt-1">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-zinc-300">Wasted: <span className="font-mono font-bold text-red-400">{fmtHrs(bucket.wastedHours)}</span></span>
      </div>
      {bucket.logCount === 0 && (
        <p className="text-[10px] text-red-500 font-bold mt-1.5 uppercase tracking-wider">Day Neglected</p>
      )}
    </div>
  );
}

function DayAccordion({ bucket }: { bucket: DayBucket }) {
  const [open, setOpen] = useState(false);
  const hasReport = !!bucket.report;
  const isEmpty = bucket.logCount === 0 && !hasReport;

  return (
    <div className={`border rounded-xl transition-colors ${open ? "border-zinc-600 bg-zinc-900/80" : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
          <span className="text-sm font-bold text-zinc-200">{getDayLabel(bucket.dateKey)}</span>
          {isEmpty && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Neglected</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {bucket.workHours > 0 && (
            <span className="text-xs font-mono text-blue-400">{fmtHrs(bucket.workHours)} work</span>
          )}
          {bucket.wastedHours > 0 && (
            <span className="text-xs font-mono text-red-400">{fmtHrs(bucket.wastedHours)} wasted</span>
          )}
          {hasReport && <FileText className="w-3.5 h-3.5 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
          {/* AI Report */}
          {bucket.report && (
            <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                <Brain className="w-3 h-3" /> AI Diagnosis
              </p>
              <ReportField label="Root Diagnosis" value={bucket.report.rootDiagnosis} color="text-red-400" />
              <ReportField label="Progress" value={bucket.report.progress} color="text-blue-300" />
              <ReportField label="Actions Done Properly" value={bucket.report.actionsDoneProperly} color="text-green-400" />
              <ReportField label="Distractions" value={bucket.report.distractions} color="text-red-300" />
              <ReportField label="Negligence Warning" value={bucket.report.negligenceWarning} color="text-amber-400" />
            </div>
          )}

          {/* Raw logs summary */}
          {bucket.logs.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Raw Logs ({bucket.logCount})</p>
              {bucket.logs.map((l) => (
                <div key={l.id} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${l.blockType === "DISTRACTION" ? "bg-red-950/20 border border-red-900/30" : "bg-zinc-900/50 border border-zinc-800/50"}`}>
                  <span className="font-mono text-zinc-500 w-12 flex-shrink-0">{String(l.hourBlock).padStart(2, "0")}:00</span>
                  <span className={`font-bold ${l.blockType === "TASK_EXECUTION" ? "text-blue-400" : l.blockType === "DISTRACTION" ? "text-red-400" : "text-zinc-400"}`}>
                    {l.blockType === "TASK_EXECUTION" ? (l.task?.title ?? "Task") : l.blockType === "DISTRACTION" ? "⚠ Distraction" : l.blockType === "SLEEP" ? "💤 Sleep" : "🏫 College"}
                  </span>
                  {l.timeSpent != null && <span className="font-mono text-zinc-500 ml-auto">{fmtHrs(l.timeSpent)}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 italic">No logs recorded this day.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ReportField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${color} mb-0.5`}>{label}</p>
      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function HistoryClient({ logs, reports }: HistoryClientProps) {
  const buckets = useMemo(() => buildBuckets(logs, reports), [logs, reports]);

  const [tooltip, setTooltip] = useState<{ bucket: DayBucket; x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Aggregated stats
  const totalWork = useMemo(() => buckets.reduce((s, b) => s + b.workHours, 0), [buckets]);
  const totalWasted = useMemo(() => buckets.reduce((s, b) => s + b.wastedHours, 0), [buckets]);
  const daysNeglected = useMemo(() => buckets.filter((b) => b.logCount === 0).length, [buckets]);

  const handleCopy = async () => {
    try {
      const text = buildClipboardText(buckets);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Failed to copy to clipboard.");
    }
  };

  const handleHover = (b: DayBucket, e: React.MouseEvent) => {
    setTooltip({ bucket: b, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-10">

        {/* ═══ PAGE HEADER ═══ */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            <span className="text-blue-500">EGO</span> ARCHIVE
          </h1>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            30 days of raw, unfiltered truth. Every hour accounted for. No hiding.
          </p>
        </div>

        {/* ═══ SECTION 1: EGO HEATMAP ═══ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-200">Ego Heatmap</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
            {/* Legend */}
            <div className="flex items-center gap-5 mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Work</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> Wasted</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-800" /> Empty</span>
            </div>

            {/* Grid — 10 columns × 3 rows for 30 days */}
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {buckets.map((b) => (
                <HeatmapCell key={b.dateKey} bucket={b} onHover={handleHover} onLeave={() => setTooltip(null)} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SECTION 2: BRUTAL RATIOS ═══ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Skull className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-200">Brutal Ratios</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Deep Work */}
            <div className="rounded-2xl border border-blue-900/50 bg-gradient-to-br from-blue-950/40 to-zinc-950 p-5 text-center space-y-1.5">
              <Clock className="w-6 h-6 text-blue-500 mx-auto" />
              <p className="text-3xl sm:text-4xl font-black font-mono text-blue-400 tracking-tight">
                {totalWork.toFixed(1)}<span className="text-lg text-blue-600">h</span>
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/70">Deep Work</p>
            </div>

            {/* Distraction */}
            <div className="rounded-2xl border border-red-900/50 bg-gradient-to-br from-red-950/40 to-zinc-950 p-5 text-center space-y-1.5">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
              <p className="text-3xl sm:text-4xl font-black font-mono text-red-400 tracking-tight">
                {totalWasted.toFixed(1)}<span className="text-lg text-red-600">h</span>
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500/70">Distraction</p>
            </div>

            {/* Neglected */}
            <div className="rounded-2xl border border-zinc-700/50 bg-gradient-to-br from-zinc-800/40 to-zinc-950 p-5 text-center space-y-1.5">
              <CalendarX2 className="w-6 h-6 text-zinc-400 mx-auto" />
              <p className="text-3xl sm:text-4xl font-black font-mono text-zinc-300 tracking-tight">
                {daysNeglected}<span className="text-lg text-zinc-500">/30</span>
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Days Neglected</p>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 3: DATA VAULT & LLM EXPORTER ═══ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-200">Data Vault</h2>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`w-full relative overflow-hidden group rounded-2xl border-2 py-5 px-6 text-center font-black text-base uppercase tracking-widest transition-all duration-300 ${
              copied
                ? "border-green-500 bg-green-950/40 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                : "border-blue-600 bg-blue-950/30 text-blue-400 hover:bg-blue-900/40 hover:shadow-[0_0_40px_rgba(37,99,235,0.25)] hover:border-blue-500"
            }`}
          >
            {/* Glow pulse background */}
            {!copied && (
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
            <span className="relative flex items-center justify-center gap-3">
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy 30-Day Context for LLM
                </>
              )}
            </span>
          </button>

          {/* Accordion list */}
          <div className="space-y-2">
            {buckets.slice().reverse().map((b) => (
              <DayAccordion key={b.dateKey} bucket={b} />
            ))}
          </div>
        </section>

      </div>

      {/* Floating tooltip */}
      {tooltip && <Tooltip bucket={tooltip.bucket} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
