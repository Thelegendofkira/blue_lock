// app/api/cron/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Gemini SDK (Automatically picks up GEMINI_API_KEY from env)
const ai = new GoogleGenAI({});

export async function GET(request: Request) {
  try {
    // 1. Secure the CRON route so only your scheduler can trigger it
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. We need to analyze YESTERDAY'S logs.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

    // TODO: Replace with real Auth ID when implemented
    const DUMMY_USER_ID = "user_1"; 

    // 3. Fetch yesterday's execution data
    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: DUMMY_USER_ID,
        date: new Date(targetDate),
      },
      include: { task: true },
    });

    if (logs.length === 0) {
      // Send a warning text if no logs exist
      await twilioClient.messages.create({
        body: "⚠️ [BLUE LOCK SYSTEM] Zero hours logged yesterday. If you don't execute, you get left behind. Log your blocks today.",
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: process.env.MY_WHATSAPP_NUMBER!,
      });
      return NextResponse.json({ success: true, message: "No logs found, warning sent." });
    }

    // 4. Format data for the LLM
    const summary = logs.map(log => {
      if (log.blockType === "TASK_EXECUTION") {
        return `[${log.hourBlock}:00] Executed: ${log.task?.title} | Time: ${log.timeSpent}h | Output: +${log.valueAchieved} | Notes: ${log.notes ?? "none"}`;
      }
      return `[${log.hourBlock}:00] Shielded Block: ${log.blockType}`;
    }).join("\n");

    // 5. THE MASTER PROMPT (Egoist/Blue Lock persona)
    const prompt = `
      You are an uncompromising, aggressive accountability coach (inspired by Blue Lock). 
      Review the user's execution logs from yesterday:
      
      ${summary}

      Analyze their performance. Do not calculate math, just evaluate behavior.
      You MUST return your response as a strict JSON object with this exact structure:
      {
        "progressAnalysis": "A short, sharp 2-sentence breakdown of their output.",
        "badHabits": "Identify 1 distraction or weakness from their logs.",
        "actionableAdvice": "Aggressive, ego-driven advice for today to force deep work."
      }
    `;

    // 6. Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        // This physically forces Gemini to output pure JSON, preventing parsing errors
        responseMimeType: "application/json", 
      }
    });
    
    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    // Parse the JSON string returned by Gemini
    const parsedReport = JSON.parse(response.text); 

    // 7. Format the final WhatsApp Message
    const whatsappMessage = `
*🔥 BLUE LOCK REPORT | ${targetDate}*

*📊 Analysis:* ${parsedReport.progressAnalysis}

*⚠️ Weakness Identified:* ${parsedReport.badHabits}

*🎯 Directive for Today:* ${parsedReport.actionableAdvice}
    `;

    // 8. Fire the WhatsApp Message
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