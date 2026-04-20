"use client";

import { useState } from "react";
import { addGoalNode } from "@/actions/cognitive-engine";
import { EffortType, Status } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoalNode {
  id: string;
  title: string;
  reason: string;
  deadline: string | Date;
  parentId: string | null;
  effortType: EffortType;
  targetQuantity: number | null;
  currentQuantity: number;
  status: Status;
}

interface Props {
  userId: string;
  allNodes: GoalNode[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const effortColors: Record<string, string> = {
  DEEP_WORK:     "bg-blue-950/60 text-blue-300 border-blue-800",
  SHALLOW_WORK:  "bg-zinc-800 text-zinc-300 border-zinc-700",
  NO_EFFORT:     "bg-zinc-900 text-zinc-400 border-zinc-800",
  NOT_APPLICABLE:"bg-zinc-900 text-zinc-500 border-zinc-800",
};

// ─── Sub-goal / Task card ─────────────────────────────────────────────────────
function ChildCard({ node, allNodes }: { node: GoalNode; allNodes: GoalNode[] }) {
  const [open, setOpen] = useState(false);
  const children = allNodes.filter((n) => n.parentId === node.id);
  const isTask = node.effortType !== "NOT_APPLICABLE";
  const progress =
    isTask && node.targetQuantity
      ? Math.min(100, Math.round((node.currentQuantity / node.targetQuantity) * 100))
      : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left group hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-zinc-600 text-xs transition-transform duration-200" style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
          <span className="text-sm font-semibold text-zinc-100 truncate">{node.title}</span>
          {isTask && (
            <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded border ${effortColors[node.effortType]}`}>
              {node.effortType.replace("_", " ")}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          {isTask && node.targetQuantity && (
            <span className="text-xs text-zinc-400 font-mono">
              {node.currentQuantity}/{node.targetQuantity}
            </span>
          )}
          <span className="text-xs text-zinc-600">{fmtDate(node.deadline)}</span>
        </div>
      </button>

      {/* Progress bar */}
      {progress !== null && (
        <div className="h-0.5 bg-zinc-800">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Nested children */}
      {open && children.length > 0 && (
        <div className="pl-4 pr-3 py-2 space-y-2 border-t border-zinc-800/60">
          {children.map((c) => (
            <ChildCard key={c.id} node={c} allNodes={allNodes} />
          ))}
        </div>
      )}

      {open && children.length === 0 && (
        <div className="px-4 py-3 text-xs italic text-zinc-600 border-t border-zinc-800/60">
          No sub-items.
        </div>
      )}
    </div>
  );
}

// ─── Top-level Goal card ──────────────────────────────────────────────────────
function GoalCard({ goal, allNodes }: { goal: GoalNode; allNodes: GoalNode[] }) {
  const [open, setOpen] = useState(false);
  const children = allNodes.filter((n) => n.parentId === goal.id);
  const deadlinePast = new Date(goal.deadline) < new Date();

  return (
    <div className={`rounded-2xl border bg-zinc-900 shadow-lg transition-all ${open ? "border-blue-700/50" : "border-zinc-800 hover:border-zinc-700"}`}>
      {/* Card header — always visible, click to expand */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors truncate">
              {goal.title}
            </h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${deadlinePast ? "bg-red-950/50 text-red-400 border-red-800" : "bg-blue-950/50 text-blue-400 border-blue-800"}`}>
              {deadlinePast ? "Overdue" : `Due ${fmtDate(goal.deadline)}`}
            </span>
          </div>
          <p className="text-sm text-zinc-500 italic line-clamp-1">{goal.reason}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1 mt-1">
          <span className="text-xs text-zinc-500">{children.length} item{children.length !== 1 ? "s" : ""}</span>
          <span className="text-zinc-500 transition-transform duration-200 text-sm" style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-2">
          {/* Reason in full */}
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

// ─── Add-Goal Modal ───────────────────────────────────────────────────────────
function AddGoalModal({
  userId,
  allNodes,
  onClose,
}: {
  userId: string;
  allNodes: GoalNode[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [title, setTitle]     = useState("");
  const [reason, setReason]   = useState("");
  const [deadline, setDeadline] = useState("");
  const [parentId, setParentId] = useState("");
  const [isTask, setIsTask]   = useState(false);
  const [effortType, setEffortType] = useState<EffortType>("NOT_APPLICABLE");
  const [targetQuantity, setTargetQuantity] = useState("");

  const nonTaskNodes = allNodes.filter((n) => n.effortType === "NOT_APPLICABLE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await addGoalNode({
      userId,
      title,
      reason,
      deadline: new Date(deadline),
      parentId: parentId || undefined,
      effortType: isTask ? effortType : "NOT_APPLICABLE",
      targetQuantity: isTask ? Number(targetQuantity) : undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create goal.");
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">New Goal</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Dynamic Programming"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Reason</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this goal non-negotiable?"
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Deadline</label>
            <input
              required
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Parent Goal (optional)</label>
            <select
              value={parentId}
              onChange={(e) => { setParentId(e.target.value); setIsTask(false); }}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            >
              <option value="">— Top-level goal —</option>
              {nonTaskNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

          {parentId && (
            <div className="border-t border-zinc-800 pt-4">
              <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTask}
                  onChange={(e) => setIsTask(e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                This is an executable task (requires daily logging)
              </label>

              {isTask && (
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Effort Type</label>
                    <select
                      value={effortType}
                      onChange={(e) => setEffortType(e.target.value as EffortType)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    >
                      <option value="DEEP_WORK">Deep Work (max 4 h/day)</option>
                      <option value="SHALLOW_WORK">Shallow Work (max 2 h/day)</option>
                      <option value="NO_EFFORT">No-Effort</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Target Quantity</label>
                    <input
                      required={isTask}
                      type="number"
                      min={1}
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving…" : "Create Goal"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function GoalDashboard({ userId, allNodes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const topLevelGoals = allNodes.filter((n) => !n.parentId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-6">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Goals</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {topLevelGoals.length} active goal{topLevelGoals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
          >
            <span className="text-lg leading-none">+</span>
            New Goal
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
              Hit &ldquo;New Goal&rdquo; to add your first objective.
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

      {/* Floating + button (mobile) */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 sm:hidden z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-2xl shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-colors"
        aria-label="Add goal"
      >
        +
      </button>

      {/* Modal */}
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