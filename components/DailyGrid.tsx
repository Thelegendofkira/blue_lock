// components/DailyGrid.tsx
"use client";

import { useState } from "react";
import { logDailyBlock } from "@/actions/cognitive-engine";
import { BlockType } from "@prisma/client";

export default function DailyGrid({ userId, activeTasks, todaysLogs }: any) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [blockType, setBlockType] = useState<BlockType>("TASK_EXECUTION");
  const [taskId, setTaskId] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleLog = async () => {
    setLoading(true);
    setError("");

    const dateStr = new Date().toISOString().split("T")[0]; // Get today's date
    const today = new Date(dateStr); 

    const res = await logDailyBlock({
      userId,
      date: today,
      hourBlock: selectedHour!,
      blockType,
      taskId: blockType === "TASK_EXECUTION" ? taskId : undefined,
      valueAchieved: blockType === "TASK_EXECUTION" ? Number(value) : undefined,
    });

    if (!res.success) {
      setError(res.error || "Failed to log block.");
    } else {
      window.location.reload(); // Quick refresh to show new data
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      <div className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">Daily Execution</h1>
        <p className="text-zinc-400 mt-1">Log your hours. No excuses.</p>
      </div>

      {/* The 24-Hour Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {hours.map((hour) => {
          const log = todaysLogs.find((l: any) => l.hourBlock === hour);
          const isLogged = !!log;

          return (
            <div
              key={hour}
              onClick={() => !isLogged && setSelectedHour(hour)}
              className={`
                relative h-24 p-3 rounded-lg border flex flex-col justify-between transition-all duration-200
                ${isLogged 
                  ? log.blockType === "SLEEP" || log.blockType === "COLLEGE" 
                    ? "bg-zinc-900 border-zinc-800 opacity-50 cursor-not-allowed" // Shielded blocks
                    : "bg-blue-950/30 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.15)] cursor-default" // Completed tasks
                  : "bg-zinc-900 border-zinc-800 hover:border-blue-500 hover:bg-zinc-800 cursor-pointer" // Empty blocks
                }
              `}
            >
              <span className="text-sm font-bold text-zinc-500">
                {hour.toString().padStart(2, "0")}:00
              </span>
              
              {isLogged && (
                <div className="text-xs font-semibold truncate text-blue-400">
                  {log.blockType === "TASK_EXECUTION" ? `Logged: +${log.valueAchieved}` : log.blockType}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for Logging */}
      {selectedHour !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">
              Log Block: {selectedHour.toString().padStart(2, "0")}:00
            </h2>

            {error && <div className="mb-4 text-red-500 text-sm font-semibold p-2 bg-red-950/30 border border-red-900 rounded">{error}</div>}

            <label className="block text-sm text-zinc-400 mb-1">Block Type</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mb-4 focus:outline-none focus:border-blue-600"
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as BlockType)}
            >
              <option value="TASK_EXECUTION">Execution (Deep/Shallow Work)</option>
              <option value="SLEEP">Sleep (Exempt)</option>
              <option value="COLLEGE">College (Exempt)</option>
            </select>

            {blockType === "TASK_EXECUTION" && (
              <>
                <label className="block text-sm text-zinc-400 mb-1">Select Active Task</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mb-4 focus:outline-none focus:border-blue-600"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                >
                  <option value="">-- Select Task --</option>
                  {activeTasks.map((task: any) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>

                <label className="block text-sm text-zinc-400 mb-1">Value Achieved (e.g., hours, problems)</label>
                <input 
                  type="number"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mb-6 focus:outline-none focus:border-blue-600"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g., 1"
                />
              </>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => setSelectedHour(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLog}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all"
              >
                {loading ? "Locking in..." : "Lock In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}