"use client";

import { useState, useTransition } from "react";
import { addGoalNode, toggleNodeStatus } from "@/actions/cognitive-engine";
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

function fmtHrs(h: number | null | undefined) {
  if (h == null) return null;
  return h >= 1 ? `${h}h` : `${Math.round(h * 60)}m`;
}

const effortPill: Record<string, string> = {
  DEEP_WORK:     "bg-blue-950/70 text-blue-300 border-blue-700",
  SHALLOW_WORK:  "bg-zinc-800 text-zinc-300 border-zinc-600",
  NO_EFFORT:     "bg-zinc-900 text-zinc-400 border-zinc-700",
  NOT_APPLICABLE:"bg-indigo-950/50 text-indigo-400 border-indigo-800",
};

// ─── Status Control (Pause / Resume) ──────────────────────────────────────────
function StatusToggle({ node }: { node: GoalNode }) {
  const [isPending, startTransition] = useTransition();
  const isPaused = node.status === "PAUSED";

  const handleToggle = () => {
    startTransition(async () => {
      await toggleNodeStatus(node.id, isPaused ? "ACTIVE" : "PAUSED");
      window.location.reload();
    });
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleToggle(); }}
      disabled={isPending}
      title={isPaused ? "Resume" : "Pause"}
      className={`
        flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
        border transition-all disabled:opacity-40
        ${isPaused
          ? "border-green-700 bg-green-950/40 text-green-400 hover:bg-green-900/60"
          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-yellow-600 hover:text-yellow-400 hover:bg-yellow-950/30"
        }
      `}
    >
      {isPending ? (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isPaused ? (
        <>▶ Resume</>
      ) : (
        <>⏸ Pause</>
      )}
    </button>
  );
}

// ─── Task Metrics Strip ────────────────────────────────────────────────────────
function TaskMetrics({ node }: { node: GoalNode }) {
  const progress =
    node.targetQuantity && node.targetQuantity > 0
      ? Math.min(100, Math.round((node.currentQuantity / node.targetQuantity) * 100))
      : null;

  const barColor =
    progress == null ? "" :
    progress >= 100  ? "bg-green-500" :
    progress >= 60   ? "bg-blue-500"  : "bg-red-500";

  const pctColor =
    progress == null ? "" :
    progress >= 100  ? "text-green-400" :
    progress >= 60   ? "text-blue-400"  : "text-red-400";

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex flex-wrap gap-2">
        {node.estimatedTime != null && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1 text-zinc-300">
            <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
            </svg>
            {fmtHrs(node.estimatedTime)} est.
          </span>
        )}
        {node.targetQuantity != null && (
          <span className="inline-flex items-center gap-1 text-xs bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1 text-zinc-300 font-mono">
            <span className="text-white font-bold">{node.currentQuantity}</span>
            <span className="text-zinc-600">/</span>
            <span>{node.targetQuantity}</span>
            {node.quantifierUnit && (
              <span className="text-zinc-500 ml-0.5 font-sans">{node.quantifierUnit}</span>
            )}
          </span>
        )}
      </div>

      {progress !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-xs font-bold font-mono w-8 text-right ${pctColor}`}>{progress}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Child Card ────────────────────────────────────────────────────────────────
function ChildCard({ node, allNodes }: { node: GoalNode; allNodes: GoalNode[] }) {
  const [open, setOpen] = useState(false);
  const children = allNodes.filter((n) => n.parentId === node.id);
  const isPaused = node.status === "PAUSED";

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isPaused
          ? "border-zinc-800/50 bg-zinc-950/30 opacity-50"
          : node.isTask
          ? "border-zinc-700 bg-zinc-950"
          : "border-zinc-800 bg-zinc-950/60"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex-1 flex items-center gap-3 min-w-0 text-left group"
        >
          <span
            className="text-zinc-600 text-xs flex-shrink-0 transition-transform duration-200"
            style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${node.isTask ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "bg-indigo-500/40"}`} />
          <span className={`text-sm font-semibold truncate ${isPaused ? "text-zinc-500 line-through decoration-zinc-700" : "text-zinc-100"}`}>
            {node.title}
          </span>
          <span className={`hidden sm:inline-block flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${effortPill[node.effortType]}`}>
            {node.isTask ? node.effortType.replace("_", " ") : "Sub-goal"}
          </span>
          {isPaused && (
            <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded border bg-yellow-950/40 text-yellow-500 border-yellow-800">
              PAUSED
            </span>
          )}
        </button>

        {/* Controls: deadline + Pause/Resume */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:block text-xs text-zinc-700">{fmtDate(node.deadline)}</span>
          <StatusToggle node={node} />
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-zinc-800/60 px-4 py-3">
          {node.isTask && <TaskMetrics node={node} />}
          {children.length > 0 && (
            <div className="mt-3 space-y-2">
              {children.map((c) => <ChildCard key={c.id} node={c} allNodes={allNodes} />)}
            </div>
          )}
          {!node.isTask && children.length === 0 && (
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
  const isPaused = goal.status === "PAUSED";
  const taskCount = allNodes.filter((n) => n.parentId === goal.id && n.isTask).length;

  return (
    <div
      className={`rounded-2xl border bg-zinc-900 shadow-lg transition-all ${
        isPaused
          ? "border-zinc-800/50 opacity-60"
          : open
          ? "border-blue-700/50 shadow-blue-950/20"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Card header */}
      <div className="px-6 py-5 flex items-start gap-4">
        {/* Clickable title area */}
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex-1 text-left min-w-0 group"
        >
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className={`text-lg font-black transition-colors truncate ${isPaused ? "text-zinc-500 line-through decoration-zinc-600" : "text-white group-hover:text-blue-300"}`}>
              {goal.title}
            </h3>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                isPaused
                  ? "bg-yellow-950/40 text-yellow-500 border-yellow-800"
                  : deadlinePast
                  ? "bg-red-950/50 text-red-400 border-red-800"
                  : "bg-blue-950/50 text-blue-400 border-blue-800"
              }`}
            >
              {isPaused ? "⏸ Paused" : deadlinePast ? "⚠ Overdue" : `Due ${fmtDate(goal.deadline)}`}
            </span>
          </div>
          <p className="text-sm text-zinc-500 italic line-clamp-1">{goal.reason}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
            <span>{children.length} item{children.length !== 1 ? "s" : ""}</span>
            {taskCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </button>

        {/* Right controls */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-0.5">
          <StatusToggle node={goal} />
          <span
            className="text-zinc-500 text-sm cursor-pointer select-none transition-transform duration-200"
            onClick={() => setOpen((p) => !p)}
            style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-2">
          <p className="text-sm text-zinc-400 italic border-l-2 border-blue-700 pl-3 mb-4">
            {goal.reason}
          </p>
          {children.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">No sub-goals or tasks yet.</p>
          ) : (
            children.map((child) => <ChildCard key={child.id} node={child} allNodes={allNodes} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Goal / Task Modal ─────────────────────────────────────────────────────
function AddNodeModal({
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
  const [isTask, setIsTask]     = useState(false);

  // Common fields
  const [title, setTitle]       = useState("");
  const [reason, setReason]     = useState("");
  const [deadline, setDeadline] = useState("");
  const [parentId, setParentId] = useState("");

  // Task-only fields
  const [effortType, setEffortType]           = useState<EffortType>("DEEP_WORK");
  const [estimatedTime, setEstimatedTime]     = useState("");
  const [targetQuantity, setTargetQuantity]   = useState("");
  const [quantifierUnit, setQuantifierUnit]   = useState("");

  // Only goals (non-tasks) can be parents
  const goalNodes = allNodes.filter((n) => !n.isTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTask && !parentId) {
      setError("A task must be attached to a parent goal.");
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
      estimatedTime:  isTask && estimatedTime  ? Number(estimatedTime)  : undefined,
      targetQuantity: isTask && targetQuantity ? Number(targetQuantity) : undefined,
      quantifierUnit: isTask && quantifierUnit ? quantifierUnit         : undefined,
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
  const labelCls =
    "block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 z-10 max-h-[92vh] overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-white">
              New {isTask ? "Task" : "Goal"}
            </h2>
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
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Goal / Task type selector */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-800">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">
            What are you creating?
          </p>
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
              <span className={`text-sm font-bold ${!isTask ? "text-indigo-300" : "text-zinc-400"}`}>
                High-Level Goal
              </span>
              <span className="text-xs text-zinc-600 text-center leading-tight">
                A broad objective. Break it down into tasks.
              </span>
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
              <span className={`text-sm font-bold ${isTask ? "text-red-300" : "text-zinc-400"}`}>
                Executable Task
              </span>
              <span className="text-xs text-zinc-600 text-center leading-tight">
                A measurable action logged daily.
              </span>
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
              className={`${inputCls} [color-scheme:dark]`}
            />
          </div>

          {/* Parent Goal */}
          <div>
            <label className={labelCls}>
              Parent Goal
              {isTask && (
                <span className="ml-1 text-red-400 normal-case tracking-normal font-normal">
                  * required for tasks
                </span>
              )}
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required={isTask}
              className={`${inputCls} [color-scheme:dark]`}
            >
              <option value="">— Top-level (no parent) —</option>
              {goalNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

          {/* ── TASK-ONLY FIELDS ── */}
          {isTask && (
            <div className="bg-zinc-950/90 border border-red-900/40 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                  Task Execution Metrics
                </p>
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

              {/* Estimated Time + Target Qty */}
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
                <label className={labelCls}>Quantifier Unit</label>
                <input
                  type="text"
                  value={quantifierUnit}
                  onChange={(e) => setQuantifierUnit(e.target.value)}
                  placeholder="e.g. LeetCode Problems, Pages, Commits"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-zinc-600">
                  Label shown next to the progress counter.
                </p>
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
  const totalTasks    = allNodes.filter((n) => n.isTask).length;
  const activeTasks   = allNodes.filter((n) => n.isTask && n.status === "ACTIVE").length;
  const pausedCount   = allNodes.filter((n) => n.status === "PAUSED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sticky header */}
      <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6 py-5 sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Goal Hierarchy</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              {topLevelGoals.length} goal{topLevelGoals.length !== 1 ? "s" : ""} ·{" "}
              <span className="text-red-400">{activeTasks}</span>/{totalTasks} tasks active
              {pausedCount > 0 && (
                <span className="text-yellow-500 ml-1">· {pausedCount} paused</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95"
          >
            <span className="text-lg leading-none">+</span>
            New Goal / Task
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        {topLevelGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-5xl">🎯</div>
            <p className="text-lg font-bold text-zinc-400">No goals yet</p>
            <p className="text-sm text-zinc-600 mt-1 mb-6">
              Define a high-level goal, then attach executable tasks to it.
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

      {/* Mobile FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 sm:hidden z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-2xl shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-colors"
        aria-label="Add goal or task"
      >
        +
      </button>

      {modalOpen && (
        <AddNodeModal
          userId={userId}
          allNodes={allNodes}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}