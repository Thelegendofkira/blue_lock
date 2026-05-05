// app/api/cron/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";
export const maxDuration = 60;

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const ai = new GoogleGenAI({});
// Calculate Logical Yesterday cleanly at midnight UTC
const now = new Date();
const offsetTime = new Date(now.getTime() - 3 * 3600000);

// Subtract 1 day for yesterday
offsetTime.setDate(offsetTime.getDate() - 1);

const yyyy = offsetTime.getFullYear();
const mm = String(offsetTime.getMonth() + 1).padStart(2, "0");
const dd = String(offsetTime.getDate()).padStart(2, "0");

// Force it to a pure Date object at midnight to satisfy Prisma
const logicalYesterday = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
const targetDate = `${yyyy}-${mm}-${dd}`;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Calculate Logical Yesterday (The day we are analyzing)
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const now = new Date();

    // Shift current UTC time forward by 5.5 hours so JS Date methods read it as IST
    const istNow = new Date(now.getTime() + IST_OFFSET);

    // IMPORTANT: Set to 0 to test TODAY'S logs right now. 
    // Change to 1 when you want the Cron to run automatically for YESTERDAY'S logs.
    const DAYS_TO_LOOK_BACK = 1;

    // Lock onto EXACTLY 18:30 UTC of the previous logical day (Which is 00:00 IST of our target day)
    const startOfDay = new Date(Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() - DAYS_TO_LOOK_BACK - 1,
      18, 30, 0, 0
    ));

    // End of day is exactly 24 hours later
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Format the pretty string for Ego's Prompt (YYYY-MM-DD)
    const targetDate = new Date(startOfDay.getTime() + IST_OFFSET).toISOString().split("T")[0];

    console.log(`Searching DB from: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const REAL_USER_ID = process.env.YOUR_ADMIN_USER_ID;
    if (!REAL_USER_ID) {
      throw new Error("Missing YOUR_ADMIN_USER_ID in .env file");
    }
    // 2. Fetch the entire Goal Hierarchy for context
    const allNodes = await prisma.goalNode.findMany({ where: { userId: REAL_USER_ID } });

    // 3. Fetch yesterday's execution data
    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: REAL_USER_ID,
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      include: { task: true },
    });
    // 4. Format Hierarchy Data
    const hierarchySummary = allNodes.filter(n => !n.isTask).map(goal => {
      const children = allNodes.filter(n => n.parentId === goal.id && n.isTask);
      let goalProgress = 0;
      if (children.length > 0) {
        const totalPct = children.reduce((sum, task) => {
          if (!task.targetQuantity || task.targetQuantity === 0) return sum;
          return sum + (task.currentQuantity / task.targetQuantity);
        }, 0);
        goalProgress = Math.round((totalPct / children.length) * 100);
      }
      return `Goal: ${goal.title} (Progress: ${goalProgress}%)`;
    }).join("\n");

    // 5. Format Execution Logs (including missing blocks as Negligence)
    let logSummary = "";
    let actionCount = 0;

    for (let i = 0; i < 24; i++) {
      const logsForHour = logs.filter(l => l.hourBlock === i);
      if (logsForHour.length === 0) continue;

      logsForHour.forEach(log => {
        // FIX 2: Let the AI see EVERYTHING you logged, not just tasks
        if (log.blockType === "TASK_EXECUTION") {
          actionCount++;
          logSummary += `[${i}:00] EXECUTED: ${log.task?.title} | Time: ${log.timeSpent}h | Notes: "${log.notes || "None"}"\n`;
        } else if (log.blockType === "DISTRACTION") {
          logSummary += `[${i}:00] DISTRACTION: Wasted ${log.timeSpent}h | Confession: "${log.notes || "None"}"\n`;
        } else {
          logSummary += `[${i}:00] EXEMPT: ${log.blockType}\n`;
        }
      });
    }
    // 6. The Egoist Prompt
    const prompt = `
      You are an uncompromising accountability analyst you see the numbers and decide success or failure as numbers matter most.
      Review the user's execution data from yesterday (${targetDate}).

      OVERALL GOAL PROGRESS:
      ${hierarchySummary}

      YESTERDAY'S ACTIONS & DISTRACTIONS:
      ${logSummary === "" ? "USER LOGGED ZERO BLOCKS. COMPLETE NEGLIGENCE. Not knowing where you are wrong is worse than making a mistake." : logSummary}
      Analyze their performance based ONLY on the data above. Your tone must be serious, analytical and should tell about consequneces if 
      the person continues they will fail and you need to tell them the consequences they will face in future if they dont work on themselves . 
      You MUST return your response as a strict JSON object with this exact structure:
      {
        "progress": "Summarize the aggregated progress of their main goals based on the data and it should be in it format goal and progress .",
        "actionsDoneProperly": "Acknowledge what they actually executed correctly.",
        "distractions": "Identify where focus leaked based strictly on DISTRACTION blocks and notes.",
        "rootDiagnosis": "Psychological breakdown: Identify the character flaw causing the distractions/negligence, how to fix it, and the serious consequences of failing like is it  a deep routed habit or what analyse it ",
        "negligenceWarning": "If there are few/no actions logged,  explain how this negligence directly causes goal failure. If they worked hard, say 'No severe negligence detected.'",
        "time_metrics":"no of hours distracted the amount of productive hours ,amount of deep work ,amount of hours with no actions seperagte all hours even distracted and unaccounted hours"
      }
    `;

    // 7. Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedReport = JSON.parse(response.text!);


    // NEW: 7.5 Save the report to the Database
    await prisma.dailyReport.upsert({
      where: {
        userId_date: {
          userId: REAL_USER_ID,
          date: logicalYesterday,
        }
      },
      update: {
        progress: parsedReport.progress,
        actionsDoneProperly: parsedReport.actionsDoneProperly,
        distractions: parsedReport.distractions,
        rootDiagnosis: parsedReport.rootDiagnosis,
        negligenceWarning: parsedReport.negligenceWarning,
      },
      create: {
        userId: REAL_USER_ID,
        date: logicalYesterday,
        progress: parsedReport.progress,
        actionsDoneProperly: parsedReport.actionsDoneProperly,
        distractions: parsedReport.distractions,
        rootDiagnosis: parsedReport.rootDiagnosis,
        negligenceWarning: parsedReport.negligenceWarning,
      }
    });

    // 8. Format the final WhatsApp Message
    const whatsappMessage = `

* ${targetDate}*

*📊 AGGREGATED PROGRESS*
${parsedReport.progress}

*✅ PROPER EXECUTION*
${parsedReport.actionsDoneProperly}

*⚠️ DISTRACTIONS IDENTIFIED*
${parsedReport.distractions}

*🧠 ROOT DIAGNOSIS & CONSEQUENCES*
${parsedReport.rootDiagnosis}

*☠️ NEGLIGENCE WARNING*
${parsedReport.negligenceWarning}

*⏳ TIME METRICS* 
${parsedReport.time_metrics}
    `;

    await twilioClient.messages.create({
      body: whatsappMessage,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.MY_WHATSAPP_NUMBER!,
    });

    return NextResponse.json({ success: true, report: parsedReport });

  } catch (error) {
    console.error("Cron Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}