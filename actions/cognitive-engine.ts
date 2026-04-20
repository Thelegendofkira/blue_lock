// actions/cognitive-engine.ts
"use server";

import { prisma } from "@/lib/prisma";
import { EffortType, BlockType, FocusState } from "@prisma/client";

// ------------------------------------------------------------------
// 1. ADD A NODE (Goal or Task)
// ------------------------------------------------------------------
export async function addGoalNode(data: {
  userId: string;
  title: string;
  reason: string;
  deadline: Date;
  parentId?: string;
  isTask: boolean;
  effortType: EffortType;
  targetQuantity?: number;
  quantifierUnit?: string;
  estimatedTime?: number;
}) {
  try {
    const newNode = await prisma.goalNode.create({
      data: {
        userId: data.userId,
        title: data.title,
        reason: data.reason,
        deadline: data.deadline,
        parentId: data.parentId,
        isTask: data.isTask,
        effortType: data.effortType,
        targetQuantity: data.targetQuantity,
        quantifierUnit: data.quantifierUnit,
        estimatedTime: data.estimatedTime,
        currentQuantity: 0,
      },
    });
    return { success: true, node: newNode };
  } catch (error) {
    console.error("Node Creation Failed:", error);
    return { success: false, error: "Failed to create goal/task." };
  }
}

// ------------------------------------------------------------------
// 2. LOG A DAILY BLOCK (Upgraded for Multi-Task & Time Tracking)
// ------------------------------------------------------------------
export async function logDailyBlock(data: {
  userId: string;
  date: Date;
  hourBlock: number;
  blockType: BlockType;
  focusState?: FocusState;
  taskId?: string;
  valueAchieved?: number; // Quantity
  timeSpent?: number;     // Hours (e.g., 0.5)
  notes?: string;         // Verbal descriptor
}) {
  try {
    // SCENARIO A: Sleep or College
    if (data.blockType !== "TASK_EXECUTION") {
      const log = await prisma.dailyLog.create({
        data: {
          userId: data.userId,
          date: data.date,
          hourBlock: data.hourBlock,
          blockType: data.blockType,
          focusState: "N_A",
        },
      });
      return { success: true, log };
    }

    // SCENARIO B: Task Execution
    if (!data.taskId || data.valueAchieved === undefined || data.timeSpent === undefined) {
      throw new Error("Execution requires a task, quantity achieved, and time spent.");
    }

    const task = await prisma.goalNode.findUnique({ where: { id: data.taskId } });
    if (!task || task.status !== "ACTIVE") throw new Error("Invalid or inactive task.");

    // 1. Fetch all logs for today
    const todaysLogs = await prisma.dailyLog.findMany({
      where: { userId: data.userId, date: data.date, blockType: "TASK_EXECUTION" },
      include: { task: true },
    });

    // 2. Calculate limits by SUMMING the specific `timeSpent` values
    let deepWorkHours = 0;
    let shallowWorkHours = 0;
    let totalWorkHours = 0;
    let timeInThisSpecificBlock = 0;

    todaysLogs.forEach((log) => {
      const time = log.timeSpent || 0;
      totalWorkHours += time;

      if (log.hourBlock === data.hourBlock) timeInThisSpecificBlock += time;
      if (log.task?.effortType === "DEEP_WORK") deepWorkHours += time;
      if (log.task?.effortType === "SHALLOW_WORK") shallowWorkHours += time;
    });

    // 3. THE UPGRADED GATEKEEPER CHECKS
    if (timeInThisSpecificBlock + data.timeSpent > 1.0) {
      return { success: false, error: "You cannot log more than 1 hour of total work inside a single 1-hour block slot." };
    }
    if (task.effortType === "DEEP_WORK" && (deepWorkHours + data.timeSpent) > 4) {
      return { success: false, error: "Deep Work limit (4 hours) exceeded. Execution denied." };
    }
    if (task.effortType === "SHALLOW_WORK" && (shallowWorkHours + data.timeSpent) > 2) {
      return { success: false, error: "Shallow Work limit (2 hours) exceeded. Execution denied." };
    }
    if ((totalWorkHours + data.timeSpent) > 12) {
      return { success: false, error: "Total daily capacity (12 hours) exceeded. Stop working." };
    }

    // 4. Execute Transaction
    const transaction = await prisma.$transaction([
      prisma.dailyLog.create({
        data: {
          userId: data.userId,
          date: data.date,
          hourBlock: data.hourBlock,
          blockType: data.blockType,
          focusState: data.focusState || "FOCUSED",
          taskId: data.taskId,
          valueAchieved: data.valueAchieved,
          timeSpent: data.timeSpent,
          notes: data.notes || "",
        },
      }),
      prisma.goalNode.update({
        where: { id: data.taskId },
        data: { currentQuantity: { increment: data.valueAchieved } },
      }),
    ]);

    return { success: true, log: transaction[0], taskUpdated: transaction[1] };
  } catch (error) {
    console.error("Logging Failed:", error);
    return { success: false, error: "Failed to log action." };
  }
}