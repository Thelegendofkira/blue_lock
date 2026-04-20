// app/api/voice-log/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK
const ai = new GoogleGenAI({});

export async function POST(request: Request) {
    try {
        const { transcript, activeTasks } = await request.json();

        if (!transcript || !activeTasks || activeTasks.length === 0) {
            return new NextResponse("Missing transcript or active tasks", { status: 400 });
        }

        // Prepare the context for Gemini so it knows what tasks you actually have
        const taskListString = activeTasks.map((t: any) => `ID: ${t.id} | Title: ${t.title}`).join("\n");

        const prompt = `
      You are an ultra-fast data extraction assistant for a productivity app.
      The user just spoke this sentence into their microphone to log their work:
      "${transcript}"

      Here is the list of their currently active tasks:
      ${taskListString}

      Your job is to match their spoken words to the closest Task Title, and extract the numbers.
      - timeSpent: Convert spoken time into a float representing hours (e.g., "30 minutes" = 0.5, "1 hour" = 1.0). Max is 1.0.
      - valueAchieved: Extract the quantity of work done (e.g., "5 problems" = 5).
      - notes: Any extra context they provided (summarize briefly).

      You MUST return a strict JSON object with this exact structure:
      {
        "taskId": "The ID of the matched task",
        "timeSpent": 0.5,
        "valueAchieved": 5,
        "notes": "Summarized notes here"
      }
    `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        if (!response.text) throw new Error("Gemini returned an empty response.");

        const parsedData = JSON.parse(response.text);

        return NextResponse.json({ success: true, parsedData });

    } catch (error) {
        console.error("Voice Log Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}