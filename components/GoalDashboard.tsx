"use client";

import { useState } from "react";
import { addGoalNode } from "@/actions/cognitive-engine";
import { EffortType, Status } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GoalNode {
  id: string;
  title: string;
  reason: string;
  deadline: string | Date;
  parentId: string | null;
  isTask: boolean;
  effortType: EffortType;
  quantifierUnit: string | null;
  targetQuantity: number | null;
  currentQuantity: number;
  estimatedTime: number | null;
  status: Status;
}

interface Props {
  userId: string;
  allNodes: GoalNode[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const effortMeta: Record<string, { label: string; pill: string; glow: string }> = {
  DEEP_WORK:      { label: "Deep Work",     pill: "bg-blue-950/70 text-blue-300 border-blue-700",   glow: "shadow-blue-900/40" },
  SHALLOW_WORK:   { label: "Shallow Work",  pill: "bg-zinc-800 text-zinc-300 border-zinc-600",       glow: "shadow-zinc-900/20" },
  NO_EFFORT:      { label: "No Effort",     pill: "bg-zinc-900 text-zinc-400 border-zinc-700",       glow: "" },
  NOT_APPLICABLE: { label: "Goal",          pill: "bg-indigo-950/50 text-indigo-400 border-indigo-800", glow: "" },
};

// ─── Task Metrics Strip ────────────────────────────────────────────────────────
function TaskMetrics({ node }: { node: GoalNode }) {
  const progress =
    node.targetQuantity && node.targetQuantity > 0
      ? Math.min(100, Math.round((node.currentQuantity / node.targetQuantity) * 100))
      : null;

  return (
    <div className="mt-2 space-y-2">
      {/* Metric pills */}
      <div className="flex flex-wrap gap-2">
        {node.estimatedTime != null && (
          <span className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1 text-zinc-300">
            <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
            </svg>
            {node.estimatedTime}h est.
          </span>
        )}
        {node.targetQuantity != null && (
          <span className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1 text-zinc-300">
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span className="font-mono font-bold text-white">{node.currentQuantity}</span>
            <span className="text-zinc-500">/</span>
            <span className="font-mono">{node.targetQuantity}</span>
            {node.quantifierUnit && <span className="text-zinc-500 ml-0.5">{node.quantifierUnit}</span>}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : "bg-red-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-xs font-bold font-mono w-8 text-right ${progress >= 100 ? "text-green-400" : progress >= 60 ? "text-blue-400" : "text-red-400"}`}>
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Child Card (recursive) ────────────────────────────────────────────────────
function ChildCard({ node, allNodes }: { node: GoalNode; allNodes: GoalNode[] }) {
  const [open, setOpen] = useState(false);
  const children = allNodes.filter((n) => n.parentId === node.id);
  const meta = effortMeta[node.effortType] ?? effortMeta.NOT_APPLICABLE;
  const isTask = node.isTask;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${isTask ? "border-zinc-700 bg-zinc-950" : "border-zinc-800 bg-zinc-950/60"}`}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left group hover:bg-zinc-900/80 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-zinc-600 text-xs transition-transform duration-200 flex-shrink-0"
            style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
          {/* Task vs Goal icon dot */}
          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${isTask ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" : "bg-indigo-500/50"}`} />
          <span className="text-sm font-semibold text-zinc-100 truncate">{node.title}</span>
          <span className={`hidden sm:inline-block flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${meta.pill}`}>
            {isTask ? meta.label : "Sub-goal"}
          </span>
        </div>
        <div className="flex-shrink-0 text-xs text-zinc-600">{fmtDate(node.deadline)}</div>
      </button>

      {/* Expanded body for tasks */}
      {open && (
        <div className="border-t border-zinc-800/60 px-4 py-3">
          {isTask && <TaskMetrics node={node} />}

          {children.length > 0 && (
            <div className="mt-3 space-y-2">
              {children.map((c) => (
                <ChildCard key={c.id} node={c} allNodes={allNodes} />
              ))}
            </div>
          )}

          {!isTask && children.length === 0 && (
            <p className="text-xs italic text-zinc-600">No sub-items yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Top-level Goal Card ───────────────────────────────────────────────────────
function GoalCard({ goal, allNodes }: { goal: GoalNode; allNodes: GoalNode[] }) {
  const [open, setOpen] = useState(false);
  const children = allNodes.filter((n) => n.parentId === goal.id);
  const deadlinePast = new Date(goal.deadline) < new Date();
  const taskCount = allNodes.filter((n) => n.parentId === goal.id && n.isTask).length;

  return (
    <div className={`rounded-2xl border bg-zinc-900 shadow-lg transition-all ${open ? "border-blue-700/50 shadow-blue-950/30" : "border-zinc-800 hover:border-zinc-700"}`}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors truncate">
              {goal.title}
            </h3>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                deadlinePast
                  ? "bg-red-950/50 text-red-400 border-red-800"
                  : "bg-blue-950/50 text-blue-400 border-blue-800"
              }`}
            >
              {deadlinePast ? "⚠ Overdue" : `Due ${fmtDate(goal.deadline)}`}
            </span>
          </div>
          <p className="text-sm text-zinc-500 italic line-clamp-1">{goal.reason}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
            <span>{children.length} item{children.length !== 1 ? "s" : ""}</span>
            {taskCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/70 inline-block" />
                {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <span
          className="text-zinc-500 transition-transform duration-200 text-sm mt-1 flex-shrink-0"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-2">
          <p className="text-sm text-zinc-400 italic border-l-2 border-blue-700 pl-3 mb-4">
            {goal.reason}
          </p>
          {children.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">No sub-goals or tasks yet.</p>
          ) : (
            children.map((child) => (
              <ChildCard key={child.id} node={child} allNodes={allNodes} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
        checked ? "bg-red-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-8" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Add Goal / Task Modal ─────────────────────────────────────────────────────
function AddGoalModal({
  userId,
  allNodes,
  onClose,
}: {
  userId: string;
  allNodes: GoalNode[];
  onClose: () => void;
}) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [title, setTitle]       = useState("");
  const [reason, setReason]     = useState("");
  const [deadline, setDeadline] = useState("");
  const [parentId, setParentId] = useState("");
  const [isTask, setIsTask]     = useState(false);

  // Task-specific fields
  const [effortType, setEffortType]           = useState<EffortType>("DEEP_WORK");
  const [estimatedTime, setEstimatedTime]     = useState("");
  const [targetQuantity, setTargetQuantity]   = useState("");
  const [quantifierUnit, setQuantifierUnit]   = useState("");

  // Only non-task nodes can be parents
  const goalNodes = allNodes.filter((n) => !n.isTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTask && !parentId) {
      setError("A Task must have a parent goal.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await addGoalNode({
      userId,
      title,
      reason,
      deadline: new Date(deadline),
      parentId: parentId || undefined,
      isTask,
      effortType: isTask ? effortType : "NOT_APPLICABLE",
      estimatedTime:   isTask && estimatedTime   ? Number(estimatedTime)   : undefined,
      targetQuantity:  isTask && targetQuantity  ? Number(targetQuantity)  : undefined,
      quantifierUnit:  isTask && quantifierUnit  ? quantifierUnit          : undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create.");
    } else {
      window.location.reload();
    }
  };

  const inputCls =
    "w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";
  const labelCls = "block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 z-10 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-white">New {isTask ? "Task" : "Goal"}</h2>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                isTask
                  ? "bg-red-950/50 text-red-400 border-red-800"
                  : "bg-indigo-950/50 text-indigo-400 border-indigo-800"
              }`}
            >
              {isTask ? "⚡ Executable Task" : "🎯 High-Level Goal"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {/* Goal / Task Toggle — the primary UX decision */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">What are you creating?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsTask(false)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                !isTask
                  ? "border-indigo-600 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                  : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-600"
              }`}
            >
              <span className="text-2xl">🎯</span>
              <span className={`text-sm font-bold ${!isTask ? "text-indigo-300" : "text-zinc-400"}`}>High-Level Goal</span>
              <span className="text-xs text-zinc-600 text-center leading-tight">A broad objective. Broken into sub-goals or tasks.</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTask(true)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                isTask
                  ? "border-red-600 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                  : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-600"
              }`}
            >
              <span className="text-2xl">⚡</span>
              <span className={`text-sm font-bold ${isTask ? "text-red-300" : "text-zinc-400"}`}>Executable Task</span>
              <span className="text-xs text-zinc-600 text-center leading-tight">A leaf-level action logged daily. Requires metrics.</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          {/* Title */}
          <div>
            <label className={labelCls}>Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isTask ? "e.g. Solve LeetCode Graph Problems" : "e.g. Master Competitive Programming"}
              className={inputCls}
            />
          </div>

          {/* Reason */}
          <div>
            <label className={labelCls}>Reason / Why</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this non-negotiable?"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className={labelCls}>Deadline</label>
            <input
              required
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Parent Goal */}
          <div>
            <label className={labelCls}>
              Parent Goal {isTask && <span className="text-red-400 normal-case tracking-normal font-normal">*required for tasks</span>}
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required={isTask}
              className={`${inputCls} [color-scheme:dark]`}
            >
              <option value="">— Top-level goal (no parent) —</option>
              {goalNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

          {/* ── TASK-ONLY FIELDS ── */}
          {isTask && (
            <div className="bg-zinc-950/80 border border-red-900/40 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">Task Execution Metrics</p>
              </div>

              {/* Effort Type */}
              <div>
                <label className={labelCls}>Effort Type</label>
                <select
                  value={effortType}
                  onChange={(e) => setEffortType(e.target.value as EffortType)}
                  className={`${inputCls} [color-scheme:dark]`}
                >
                  <option value="DEEP_WORK">Deep Work (max 4 h/day)</option>
                  <option value="SHALLOW_WORK">Shallow Work (max 2 h/day)</option>
                  <option value="NO_EFFORT">No Effort</option>
                </select>
              </div>

              {/* Estimated Time + Target Qty side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Estimated Time (hrs)</label>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="e.g. 10"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Target Quantity</label>
                  <input
                    required={isTask}
                    type="number"
                    min={1}
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Quantifier Unit */}
              <div>
                <label className={labelCls}>Quantifier Unit (label)</label>
                <input
                  type="text"
                  value={quantifierUnit}
                  onChange={(e) => setQuantifierUnit(e.target.value)}
                  placeholder="e.g. LeetCode Problems, Pages, Commits"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-zinc-600">This label appears next to the progress counter.</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-1 w-full rounded-xl py-3 text-sm font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isTask
                ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30"
                : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30"
            }`}
          >
            {loading ? "Saving…" : `Create ${isTask ? "Task" : "Goal"}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function GoalDashboard({ userId, allNodes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const topLevelGoals = allNodes.filter((n) => !n.parentId);
  const totalTasks = allNodes.filter((n) => n.isTask).length;
  const activeTasks = allNodes.filter((n) => n.isTask && n.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6 py-5 sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Goal Hierarchy</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              {topLevelGoals.length} goal{topLevelGoals.length !== 1 ? "s" : ""} ·{" "}
              <span className="text-red-400">{activeTasks}</span>/{totalTasks} tasks active
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/25 active:scale-95"
          >
            <span className="text-lg leading-none">+</span>
            New Goal / Task
          </button>
        </div>
      </div>

      {/* Goal cards */}
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        {topLevelGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-5xl">🎯</div>
            <p className="text-lg font-bold text-zinc-400">No goals yet</p>
            <p className="text-sm text-zinc-600 mt-1 mb-6">
              Define a high-level goal first, then attach executable tasks to it.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
            >
              + New Goal
            </button>
          </div>
        ) : (
          topLevelGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} allNodes={allNodes} />
          ))
        )}
      </div>

      {/* Floating + (mobile) */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 sm:hidden z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-2xl shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-colors"
        aria-label="Add goal or task"
      >
        +
      </button>

      {modalOpen && (
        <AddGoalModal
          userId={userId}
          allNodes={allNodes}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}