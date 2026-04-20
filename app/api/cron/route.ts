// app/api/cron/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const ai = new GoogleGenAI({});

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Calculate Logical Yesterday (The day we are analyzing)
    const now = new Date();
    const offsetTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const logicalYesterday = new Date(offsetTime);
    logicalYesterday.setDate(logicalYesterday.getDate() - 1);
    const targetDate = logicalYesterday.toISOString().split("T")[0];

    const REAL_USER_ID = process.env.YOUR_ADMIN_USER_ID; // Replace with your actual DB User ID for the cron job

    // 2. Fetch the entire Goal Hierarchy for context
    const allNodes = await prisma.goalNode.findMany({ where: { userId: REAL_USER_ID } });

    // 3. Fetch yesterday's execution data
    const logs = await prisma.dailyLog.findMany({
      where: { userId: REAL_USER_ID, date: logicalYesterday },
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
      if (logsForHour.length === 0) continue; // Empty blocks are implied negligence

      logsForHour.forEach(log => {
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
      You are an uncompromising, aggressive accountability analyst (inspired by Blue Lock). 
      Review the user's execution data from yesterday (${targetDate}).

      OVERALL GOAL PROGRESS:
      ${hierarchySummary}

      YESTERDAY'S ACTIONS & DISTRACTIONS:
      ${actionCount === 0 ? "USER LOGGED ZERO ACTIONS. COMPLETE NEGLIGENCE." : logSummary}

      Analyze their performance based ONLY on the data above. Your tone must be serious, analytical, and unforgiving. 
      You MUST return your response as a strict JSON object with this exact structure:
      {
        "progress": "Summarize the aggregated progress of their main goals based on the data.",
        "actionsDoneProperly": "Acknowledge what they actually executed correctly.",
        "distractions": "Identify where focus leaked based strictly on DISTRACTION blocks and notes.",
        "rootDiagnosis": "Psychological breakdown: Identify the character flaw causing the distractions/negligence, how to fix it, and the serious consequences of failing.",
        "negligenceWarning": "If there are few/no actions logged, ruthlessly explain how this negligence directly causes goal failure. If they worked hard, say 'No severe negligence detected.'"
      }
    `;

    // 7. Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Keep the model version you verified
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedReport = JSON.parse(response.text!);

    // 8. Format the final WhatsApp Message
    const whatsappMessage = `
*🔥 BLUE LOCK INTELLIGENCE | ${targetDate}*

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