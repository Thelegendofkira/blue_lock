// actions/cognitive-engine.ts
"use server";

import { prisma } from "@/lib/prisma";
import { EffortType, BlockType, FocusState } from "@prisma/client";

// ------------------------------------------------------------------
// 1. ADD A NODE (Goal, SubGoal, or Task)
// ------------------------------------------------------------------
export async function addGoalNode(data: {
  userId: string;
  title: string;
  reason: string;
  deadline: Date;
  parentId?: string; // Null if it's a top-level Goal
  effortType: EffortType;
  targetQuantity?: number;
}) {
  try {
    const newNode = await prisma.goalNode.create({
      data: {
        userId: data.userId,
        title: data.title,
        reason: data.reason,
        deadline: data.deadline,
        parentId: data.parentId,
        effortType: data.effortType,
        targetQuantity: data.targetQuantity,
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
// 2. LOG A DAILY BLOCK (The Cognitive Gatekeeper)
// ------------------------------------------------------------------
export async function logDailyBlock(data: {
  userId: string;
  date: Date; // The specific day (midnight local time)
  hourBlock: number; // 0-23
  blockType: BlockType; // TASK_EXECUTION, SLEEP, or COLLEGE
  focusState?: FocusState;
  taskId?: string;
  valueAchieved?: number; // e.g., 5 problems solved, or 1 hour
}) {
  try {
    // SCENARIO A: User is logging Sleep or College. No cognitive checks needed.
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

    // SCENARIO B: User is logging execution. We must run the Cognitive Checks.
    if (!data.taskId || !data.valueAchieved) {
      throw new Error("Task Execution requires a taskId and a value achieved.");
    }

    // 1. Fetch the specific Task to know its Effort Type
    const task = await prisma.goalNode.findUnique({
      where: { id: data.taskId },
    });

    if (!task) throw new Error("Task not found.");
    if (task.status !== "ACTIVE") throw new Error("Cannot log time to an inactive or paused task.");

    // 2. Fetch all logs for this specific user on this specific date
    const todaysLogs = await prisma.dailyLog.findMany({
      where: {
        userId: data.userId,
        date: data.date,
        blockType: "TASK_EXECUTION",
      },
      include: { task: true },
    });

    // 3. Tally up the cognitive load for the day (1 block = 1 hour)
    let deepWorkHours = 0;
    let shallowWorkHours = 0;
    let totalWorkHours = todaysLogs.length; // Each log is exactly 1 hour

    todaysLogs.forEach((log) => {
      if (log.task?.effortType === "DEEP_WORK") deepWorkHours++;
      if (log.task?.effortType === "SHALLOW_WORK") shallowWorkHours++;
    });

    // 4. THE STRICT GATEKEEPER: Enforce the limits
    if (task.effortType === "DEEP_WORK" && deepWorkHours >= 4) {
      return { success: false, error: "Deep Work limit (4 hours) exceeded for today. Execution denied." };
    }
    if (task.effortType === "SHALLOW_WORK" && shallowWorkHours >= 2) {
      return { success: false, error: "Shallow Work limit (2 hours) exceeded for today. Execution denied." };
    }
    if (totalWorkHours >= 12) {
      return { success: false, error: "Total daily capacity (12 hours) exceeded. Go to sleep." };
    }

    // 5. Passed all checks. Execute the transaction.
    const transaction = await prisma.$transaction([
      // Create the daily log
      prisma.dailyLog.create({
        data: {
          userId: data.userId,
          date: data.date,
          hourBlock: data.hourBlock,
          blockType: data.blockType,
          focusState: data.focusState || "FOCUSED",
          taskId: data.taskId,
          valueAchieved: data.valueAchieved,
        },
      }),
      // Increment the task's overarching progress
      prisma.goalNode.update({
        where: { id: data.taskId },
        data: {
          currentQuantity: {
            increment: data.valueAchieved,
          },
        },
      }),
    ]);

    return { success: true, log: transaction[0], taskUpdated: transaction[1] };
  } catch (error) {
    console.error("Logging Failed:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
       return { success: false, error: "You have already logged an action for this specific hour block." };
    }
    return { success: false, error: "Failed to log action." };
  }
}