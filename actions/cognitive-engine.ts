// actions/cognitive-engine.ts
"use server";

import { prisma } from "@/lib/prisma";
import { EffortType, BlockType, Status } from "@prisma/client";

// 1. ADD NODE
export async function addGoalNode(data: {
  userId: string; title: string; reason: string; deadline: Date;
  parentId?: string; isTask: boolean; effortType: EffortType;
  targetQuantity?: number; quantifierUnit?: string; estimatedTime?: number;
}) {
  try {
    const newNode = await prisma.goalNode.create({
      data: { ...data, currentQuantity: 0 },
    });
    return { success: true, node: newNode };
  } catch (error) {
    return { success: false, error: "Failed to create node." };
  }
}

// 2. TOGGLE STATUS (The Cascading Pause Logic)
export async function toggleNodeStatus(nodeId: string, status: Status) {
  try {
    const node = await prisma.goalNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error("Node not found");

    const deactivatedAt = status === "ACTIVE" ? null : new Date();

    if (!node.isTask && status === "PAUSED") {
      // Cascade pause to children
      await prisma.$transaction([
        prisma.goalNode.update({ where: { id: nodeId }, data: { status, deactivatedAt } }),
        prisma.goalNode.updateMany({ where: { parentId: nodeId, status: "ACTIVE" }, data: { status, deactivatedAt } })
      ]);
    } else {
      await prisma.goalNode.update({ where: { id: nodeId }, data: { status, deactivatedAt } });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update status." };
  }
}

// 3. LOG DAILY BLOCK (The Strict Gatekeeper)
export async function logDailyBlock(data: {
  userId: string; date: Date; hourBlock: number; blockType: BlockType;
  taskId?: string; valueAchieved?: number; timeSpent?: number; notes?: string;
}) {
  try {
    // ── Shielded blocks (Sleep / College) bypass all capacity rules ──────────
    if (data.blockType === "SLEEP" || data.blockType === "COLLEGE") {
      const log = await prisma.dailyLog.create({
        data: { userId: data.userId, date: data.date, hourBlock: data.hourBlock, blockType: data.blockType },
      });
      return { success: true, log };
    }

    // ── TASK_EXECUTION and DISTRACTION both consume block capacity ───────────
    if (data.timeSpent === undefined || data.timeSpent <= 0) {
      return { success: false, error: "timeSpent is required and must be > 0." };
    }

    if (data.blockType === "TASK_EXECUTION") {
      if (!data.taskId || data.valueAchieved === undefined) throw new Error("Missing task data.");
      const task = await prisma.goalNode.findUnique({ where: { id: data.taskId } });
      if (!task || task.status !== "ACTIVE") throw new Error("Task inactive.");

      // Fetch all capacity-consuming logs for today to run daily-cap checks
      const todaysLogs = await prisma.dailyLog.findMany({
        where: {
          userId: data.userId,
          date: data.date,
          blockType: { in: ["TASK_EXECUTION", "DISTRACTION"] },
        },
        include: { task: true },
      });

      let deepWorkHours = 0, shallowWorkHours = 0, totalWorkHours = 0, timeInBlock = 0;
      todaysLogs.forEach((log) => {
        const t = log.timeSpent ?? 0;
        totalWorkHours += t;
        if (log.hourBlock === data.hourBlock) timeInBlock += t;
        if (log.task?.effortType === "DEEP_WORK")    deepWorkHours += t;
        if (log.task?.effortType === "SHALLOW_WORK") shallowWorkHours += t;
      });

      if (timeInBlock + data.timeSpent > 1.0 + 1e-9)
        return { success: false, error: "Cannot exceed 1 hour per block." };
      if (task.effortType === "DEEP_WORK" && deepWorkHours + data.timeSpent > 4)
        return { success: false, error: "4hr Deep Work limit exceeded." };
      if (task.effortType === "SHALLOW_WORK" && shallowWorkHours + data.timeSpent > 2)
        return { success: false, error: "2hr Shallow Work limit exceeded." };
      if (totalWorkHours + data.timeSpent > 12)
        return { success: false, error: "12hr daily limit exceeded." };

      const [newLog] = await prisma.$transaction([
        prisma.dailyLog.create({ data: { ...data, notes: data.notes ?? "" } }),
        prisma.goalNode.update({
          where: { id: data.taskId },
          data: { currentQuantity: { increment: data.valueAchieved } },
        }),
      ]);
      return { success: true, log: newLog };
    }

    // ── DISTRACTION: consumes block capacity, no task/daily-cap checks ───────
    if (data.blockType === "DISTRACTION") {
      // Count time already used in this block (work + prior distractions)
      const blockLogs = await prisma.dailyLog.findMany({
        where: {
          userId: data.userId,
          date: data.date,
          hourBlock: data.hourBlock,
          blockType: { in: ["TASK_EXECUTION", "DISTRACTION"] },
        },
      });
      const timeInBlock = blockLogs.reduce((s, l) => s + (l.timeSpent ?? 0), 0);
      if (timeInBlock + data.timeSpent > 1.0 + 1e-9)
        return { success: false, error: "Cannot exceed 1 hour per block." };

      const log = await prisma.dailyLog.create({
        data: {
          userId:    data.userId,
          date:      data.date,
          hourBlock: data.hourBlock,
          blockType: "DISTRACTION",
          timeSpent: data.timeSpent,
          notes:     data.notes ?? "",
        },
      });
      return { success: true, log };
    }

    return { success: false, error: "Unknown block type." };
  } catch (error) {
    return { success: false, error: "Failed to log action." };
  }
}

// 4. DELETE LOG (Restores Task Quantity)
export async function deleteDailyLog(logId: string) {
  try {
    const log = await prisma.dailyLog.findUnique({ where: { id: logId } });
    if (!log) throw new Error("Log not found.");

    if (log.blockType === "TASK_EXECUTION" && log.taskId && log.valueAchieved) {
      await prisma.$transaction([
        prisma.goalNode.update({ where: { id: log.taskId }, data: { currentQuantity: { decrement: log.valueAchieved } } }),
        prisma.dailyLog.delete({ where: { id: logId } })
      ]);
    } else {
      await prisma.dailyLog.delete({ where: { id: logId } });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete log." };
  }
}