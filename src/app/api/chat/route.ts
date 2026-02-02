import { NextRequest, NextResponse } from "next/server";
import { app } from "@/lib/agent/graph";

export async function POST(req: NextRequest) {
  try {
    const { destination } = await req.json();

    if (!destination) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    }

    // Check for required API keys
    const missingKeys = [];
    if (!process.env.GROQ_API_KEY) missingKeys.push("GROQ_API_KEY");
    if (!process.env.TAVILY_API_KEY) missingKeys.push("TAVILY_API_KEY");
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_API_KEY) missingKeys.push("GOOGLE_API_KEY");

    if (missingKeys.length > 0) {
      return NextResponse.json({ 
        error: `Missing API keys: ${missingKeys.join(", ")}. Please follow the setup instructions.` 
      }, { status: 400 });
    }

    const result = await app.invoke({
      destination,
      query: `trip to ${destination} itinerary recent 2024 2025`,
    });

    return NextResponse.json({ itinerary: result.itinerary });
  } catch (error: any) {
    console.error("Agent error:", error);
    const errorMessage = error.message || "Failed to generate itinerary";
    return NextResponse.json({ 
      error: errorMessage.includes("API key") 
        ? `${errorMessage}. Please check your environment variables.` 
        : "Failed to generate itinerary. Please check the terminal logs for details." 
    }, { status: 500 });
  }
}
