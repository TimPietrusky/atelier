import { generateTextWithRunpod } from "@/lib/providers/runpod";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, workflowContext } = await req.json();
    const clientKey = typeof window === "undefined" ? undefined : undefined;
    const envKey = process.env.RUNPOD_API_KEY;

    const { text } = await generateTextWithRunpod({
      prompt: `You are an AI workflow assistant. Based on the user's request: "${message}"
      
      Current workflow context: ${JSON.stringify(workflowContext)}
      
      Analyze the request and respond with:
      1. A natural language explanation of what you're doing
      2. JSON workflow updates needed (nodes to add/modify)
      
      Keep responses concise and actionable.`,
      apiKey: envKey,
    });

    // Parse the response to extract workflow updates
    const response = {
      message: text,
      workflowUpdates: extractWorkflowUpdates(text, message),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

function extractWorkflowUpdates(aiResponse: string, userMessage: string) {
  const updates = [];

  if (
    userMessage.toLowerCase().includes("image") ||
    userMessage.toLowerCase().includes("portrait")
  ) {
    updates.push({
      type: "add-node",
      nodeType: "image-gen",
      config: { model: "sdxl", prompt: userMessage },
    });
  }

  if (userMessage.toLowerCase().includes("video")) {
    updates.push({
      type: "add-node",
      nodeType: "video-gen",
      config: { duration: 10, prompt: userMessage },
    });
  }

  if (userMessage.toLowerCase().includes("background")) {
    updates.push({
      type: "add-node",
      nodeType: "background-replace",
      config: { prompt: userMessage },
    });
  }

  return updates;
}
