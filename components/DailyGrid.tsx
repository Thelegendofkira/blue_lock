// components/DailyGrid.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import { logDailyBlock, deleteDailyLog } from "@/actions/cognitive-engine";
import { BlockType } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  hourBlock: number;
  blockType: BlockType;
  taskId: string | null;
  timeSpent: number | null;
  valueAchieved: number | null;
  notes: string | null;
  task?: Task | null;
}

interface DailyGridProps {
  userId: string;
  activeTasks: Task[];
  todaysLogs: DailyLog[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtHrs(h: number | null | undefined) {
  if (h == null || h === 0) return "0m";
  if (h >= 1) return `${h}h`;
  return `${Math.round(h * 60)}m`;
}

const blockTypeLabel: Record<string, string> = {
  SLEEP:   "💤 Sleep",
  COLLEGE: "🏫 College",
};

// ─── Delete Button (with optimistic pending state) ─────────────────────────────
function DeleteLogButton({ logId }: { logId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteDailyLog(logId);
      window.location.reload();
    });
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-2 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : "Confirm"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-2 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="px-2.5 py-1 rounded-lg text-xs font-bold border border-red-900/60 bg-red-950/30 text-red-500 hover:bg-red-900/50 hover:text-red-400 transition-all"
    >
      Delete
    </button>
  );
}

// ─── Review Entry ──────────────────────────────────────────────────────────────
function ReviewEntry({ log }: { log: DailyLog }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2.5">
      {/* Task name + delete */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white leading-tight">
          {log.task?.title ?? <span className="italic text-zinc-500">Unknown task</span>}
        </p>
        <DeleteLogButton logId={log.id} />
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
          </svg>
          {fmtHrs(log.timeSpent)}
        </span>

        {log.valueAchieved != null && (
          <span className="flex items-center gap-1.5 text-zinc-300">
            <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/>
            </svg>
            <span className="text-green-400 font-bold">+{log.valueAchieved}</span>
            {log.task?.quantifierUnit && (
              <span className="text-zinc-600 font-sans">{log.task.quantifierUnit}</span>
            )}
          </span>
        )}
      </div>

      {/* Notes */}
      {log.notes && (
        <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-700 pl-2.5 leading-relaxed">
          {log.notes}
        </p>
      )}
    </div>
  );
}

// ─── Block Cell ────────────────────────────────────────────────────────────────
function BlockCell({
  hour,
  logs,
  onClick,
}: {
  hour: number;
  logs: DailyLog[];
  onClick: () => void;
}) {
  const taskLogs   = logs.filter((l) => l.blockType === "TASK_EXECUTION");
  const nonTaskLog = logs.find((l)  => l.blockType !== "TASK_EXECUTION");
  const totalTime  = taskLogs.reduce((s, l) => s + (l.timeSpent ?? 0), 0);
  const isNow      = new Date().getHours() === hour;

  let cellCls = "bg-zinc-900/70 border-zinc-800 hover:border-blue-500/60 hover:bg-zinc-800/80 cursor-pointer";
  let content: React.ReactNode = null;

  if (nonTaskLog) {
    cellCls = "bg-zinc-900/50 border-zinc-700/40 opacity-55 cursor-default";
    content = <span className="text-xs font-semibold text-zinc-400 truncate">{blockTypeLabel[nonTaskLog.blockType]}</span>;
  } else if (taskLogs.length === 1) {
    cellCls = "bg-blue-950/35 border-blue-700/55 shadow-[0_0_12px_rgba(37,99,235,0.1)] cursor-pointer";
    content = (
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-blue-300 truncate">{taskLogs[0].task?.title ?? "Task"}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 font-mono">{fmtHrs(taskLogs[0].timeSpent)}</span>
          {taskLogs[0].valueAchieved != null && (
            <span className="text-xs text-green-400 font-mono">+{taskLogs[0].valueAchieved}</span>
          )}
        </div>
      </div>
    );
  } else if (taskLogs.length > 1) {
    cellCls = "bg-blue-950/40 border-blue-600/60 shadow-[0_0_15px_rgba(37,99,235,0.15)] cursor-pointer";
    content = (
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-blue-200">{taskLogs.length} Logs</p>
        <p className="text-xs text-zinc-400 font-mono">{fmtHrs(totalTime)} total</p>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative h-[6.5rem] p-3 rounded-xl border flex flex-col justify-between transition-all duration-200 group ${cellCls}`}
    >
      {/* Hour + now indicator */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold font-mono ${isNow ? "text-blue-400" : "text-zinc-600"}`}>
          {hour.toString().padStart(2, "0")}:00
        </span>
        {isNow && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      </div>

      {/* Content */}
      <div className="truncate">{content}</div>

      {/* Multi-log dots */}
      {taskLogs.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {taskLogs.slice(0, 4).map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
          ))}
        </div>
      )}

      {/* Empty hover hint */}
      {logs.length === 0 && (
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-500">
          + Log
        </span>
      )}
    </div>
  );
}

// ─── Block Modal ───────────────────────────────────────────────────────────────
function BlockModal({
  hour,
  logsForHour,
  activeTasks,
  userId,
  onClose,
}: {
  hour: number;
  logsForHour: DailyLog[];
  activeTasks: Task[];
  userId: string;
  onClose: () => void;
}) {
  const taskLogs   = logsForHour.filter((l) => l.blockType === "TASK_EXECUTION");
  const nonTaskLog = logsForHour.find((l)  => l.blockType !== "TASK_EXECUTION");

  // Default to Review tab when there are existing logs, else Add
  const [tab, setTab] = useState<"review" | "add">(taskLogs.length > 0 ? "review" : "add");

  // Form state
  const [blockType, setBlockType]         = useState<BlockType>(nonTaskLog ? nonTaskLog.blockType : "TASK_EXECUTION");
  const [taskId, setTaskId]               = useState("");
  const [timeSpent, setTimeSpent]         = useState("");
  const [valueAchieved, setValueAchieved] = useState("");
  const [notes, setNotes]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  // Remaining budget in this block
  const usedTime  = taskLogs.reduce((s, l) => s + (l.timeSpent ?? 0), 0);
  const remaining = Math.max(0, parseFloat((1.0 - usedTime).toFixed(2)));

  const selectedTask = activeTasks.find((t) => t.id === taskId);

  const handleLog = async () => {
    setError("");

    if (blockType === "TASK_EXECUTION") {
      if (!taskId) { setError("Please select a task."); return; }
      if (!timeSpent || Number(timeSpent) <= 0) { setError("Time spent must be greater than 0."); return; }
      if (Number(timeSpent) > remaining + 0.001) {
        setError(`Only ${fmtHrs(remaining)} of budget remains in this block.`);
        return;
      }
    }

    setLoading(true);
    const dateStr = new Date().toISOString().split("T")[0];
    const today   = new Date(dateStr);

    const res = await logDailyBlock({
      userId,
      date:      today,
      hourBlock: hour,
      blockType,
      taskId:        blockType === "TASK_EXECUTION" ? taskId : undefined,
      timeSpent:     blockType === "TASK_EXECUTION" ? Number(timeSpent) : undefined,
      valueAchieved: blockType === "TASK_EXECUTION" ? (valueAchieved ? Number(valueAchieved) : 0) : undefined,
      notes:         notes || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to log.");
    } else {
      window.location.reload();
    }
  };

  const inputCls =
    "w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 z-10 max-h-[92vh] flex flex-col">
        {/* Sticky header */}
        <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-white">
              Block {hour.toString().padStart(2, "0")}:00 – {(hour + 1).toString().padStart(2, "0")}:00
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Budget used:{" "}
              <span className="font-mono text-blue-400">{fmtHrs(usedTime)}</span>
              {" · "}
              <span className="font-mono text-zinc-400">{fmtHrs(remaining)} left</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Budget bar */}
        <div className="px-5 pt-3 flex-shrink-0">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usedTime >= 1 ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, usedTime * 100)}%` }}
            />
          </div>
        </div>

        {/* Tabs (only when task logs already exist) */}
        {taskLogs.length > 0 && (
          <div className="px-5 pt-3 flex gap-1 flex-shrink-0">
            <button
              onClick={() => setTab("review")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                tab === "review" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              📋 Review ({taskLogs.length})
            </button>
            <button
              onClick={() => setTab("add")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                tab === "add" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              + Add New
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── SECTION A: REVIEW ── */}
          {tab === "review" && taskLogs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Logged in this block
              </p>
              {taskLogs.map((log) => (
                <ReviewEntry key={log.id} log={log} />
              ))}
              <button
                onClick={() => setTab("add")}
                disabled={remaining <= 0}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-500 hover:border-blue-600/60 hover:text-blue-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                + Log Another Task in This Block
              </button>
            </div>
          )}

          {/* ── SECTION B: ADD NEW ── */}
          {tab === "add" && (
            <div className="space-y-4">
              {/* Block type selector (only when block is fresh / no non-task log) */}
              {taskLogs.length === 0 && !nonTaskLog && (
                <div>
                  <label className={labelCls}>Block Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["TASK_EXECUTION", "SLEEP", "COLLEGE"] as BlockType[]).map((bt) => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBlockType(bt)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          blockType === bt
                            ? bt === "TASK_EXECUTION"
                              ? "border-blue-600 bg-blue-950/50 text-blue-300"
                              : bt === "SLEEP"
                              ? "border-zinc-500 bg-zinc-800 text-zinc-300"
                              : "border-indigo-600 bg-indigo-950/50 text-indigo-300"
                            : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600"
                        }`}
                      >
                        {bt === "TASK_EXECUTION" ? "⚡ Work" : bt === "SLEEP" ? "💤 Sleep" : "🏫 College"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-task confirmation */}
              {blockType !== "TASK_EXECUTION" && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-center space-y-1">
                  <p className="text-3xl">{blockType === "SLEEP" ? "💤" : "🏫"}</p>
                  <p className="text-sm font-bold text-zinc-300">
                    Mark as {blockType === "SLEEP" ? "Sleep" : "College / Class"}
                  </p>
                  <p className="text-xs text-zinc-600">
                    This block is shielded — no logging quota applies.
                  </p>
                </div>
              )}

              {/* Task execution form */}
              {blockType === "TASK_EXECUTION" && (
                <>
                  {remaining <= 0 ? (
                    <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">
                      ⛔ This block is full. No more time can be logged here.
                    </div>
                  ) : (
                    <>
                      {error && (
                        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
                          {error}
                        </div>
                      )}

                      {/* Task selector */}
                      <div>
                        <label className={labelCls}>Select Active Task</label>
                        <select
                          value={taskId}
                          onChange={(e) => setTaskId(e.target.value)}
                          className={`${inputCls} [color-scheme:dark]`}
                        >
                          <option value="">— Choose a task —</option>
                          {activeTasks.map((t) => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                        {selectedTask && (
                          <p className="mt-1.5 text-xs text-zinc-500">
                            Progress:{" "}
                            <span className="font-mono text-blue-400">
                              {selectedTask.currentQuantity}/{selectedTask.targetQuantity}
                            </span>
                            {selectedTask.quantifierUnit && ` ${selectedTask.quantifierUnit}`}
                          </p>
                        )}
                      </div>

                      {/* Time + Value */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>
                            Time Spent (hrs)
                            <span className="ml-1 text-zinc-600 normal-case tracking-normal font-normal">
                              max {remaining}h
                            </span>
                          </label>
                          <input
                            type="number"
                            min={0.05}
                            max={remaining}
                            step={0.05}
                            value={timeSpent}
                            onChange={(e) => setTimeSpent(e.target.value)}
                            placeholder="e.g. 0.5"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>
                            {selectedTask?.quantifierUnit
                              ? `${selectedTask.quantifierUnit} Done`
                              : "Qty Achieved"}
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={valueAchieved}
                            onChange={(e) => setValueAchieved(e.target.value)}
                            placeholder="e.g. 3"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className={labelCls}>Session Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          placeholder="What did you do? Any blockers? Quality of focus?"
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        {tab === "add" && (
          <div className="border-t border-zinc-800 px-5 py-4 flex gap-3 flex-shrink-0 rounded-b-2xl bg-zinc-900">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm font-bold text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleLog}
              disabled={loading || (blockType === "TASK_EXECUTION" && remaining <= 0)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
            >
              {loading ? "Locking in…" : "Lock In ⚡"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day Summary Bar ───────────────────────────────────────────────────────────
function DaySummaryBar({ logs }: { logs: DailyLog[] }) {
  const taskLogs  = logs.filter((l) => l.blockType === "TASK_EXECUTION");
  const totalTime = taskLogs.reduce((s, l) => s + (l.timeSpent ?? 0), 0);
  const deepTime  = taskLogs
    .filter((l) => l.task?.effortType === "DEEP_WORK")
    .reduce((s, l) => s + (l.timeSpent ?? 0), 0);
  const logCount  = taskLogs.length;

  const stats = [
    { label: "Total Work",  value: fmtHrs(totalTime), color: "text-blue-400" },
    { label: "Deep Work",   value: fmtHrs(deepTime),  color: "text-indigo-400" },
    { label: "Daily Cap",   value: "12h",              color: "text-zinc-600" },
    { label: "Sessions",    value: String(logCount),   color: "text-green-400" },
  ];

  return (
    <div className="grid grid-cols-4 divide-x divide-zinc-800 border border-zinc-800 rounded-2xl bg-zinc-900/60 mb-8 overflow-hidden">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center py-4">
          <span className={`text-xl font-black font-mono ${s.color}`}>{s.value}</span>
          <span className="text-xs text-zinc-600 uppercase tracking-wider mt-0.5">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DailyGrid({ userId, activeTasks, todaysLogs }: DailyGridProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Group logs by hour
  const logsByHour = useMemo(() => {
    const map = new Map<number, DailyLog[]>();
    for (let h = 0; h < 24; h++) map.set(h, []);
    for (const log of todaysLogs) {
      map.get(log.hourBlock)?.push(log);
    }
    return map;
  }, [todaysLogs]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      {/* Header */}
      <div className="mb-8 border-b border-zinc-800 pb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Daily Execution</h1>
          <p className="text-zinc-500 mt-1 text-sm">{today}</p>
        </div>
        <div className="text-right text-xs text-zinc-600 font-mono leading-relaxed">
          <p>Deep Work cap: <span className="text-blue-500">4h</span></p>
          <p>Shallow cap: <span className="text-zinc-400">2h</span></p>
          <p>Daily cap: <span className="text-zinc-400">12h</span></p>
        </div>
      </div>

      {/* Summary bar */}
      <DaySummaryBar logs={todaysLogs} />

      {/* 24-hour grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {hours.map((hour) => {
          const logsForHour = logsByHour.get(hour) ?? [];
          return (
            <BlockCell
              key={hour}
              hour={hour}
              logs={logsForHour}
              onClick={() => setSelectedHour(hour)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-950/60 border border-blue-700/60 inline-block" />
          Work logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800/50 border border-zinc-700/40 opacity-60 inline-block" />
          Exempt (Sleep / College)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
          Current hour
        </span>
      </div>

      {/* Block modal */}
      {selectedHour !== null && (
        <BlockModal
          hour={selectedHour}
          logsForHour={logsByHour.get(selectedHour) ?? []}
          activeTasks={activeTasks}
          userId={userId}
          onClose={() => setSelectedHour(null)}
        />
      )}
    </div>
  );
}