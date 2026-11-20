import { NextRequest, NextResponse } from "next/server";
import { askCampusParkingAI } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "A valid message string is required." },
        { status: 400 }
      );
    }

    const reply = await askCampusParkingAI(message, context);

    return NextResponse.json({
      success: true,
      reply,
      provider: process.env.GEMINI_API_KEY ? "Google AI Studio (Gemini 1.5 Flash)" : "Intelligent Rule Engine (Fallback)",
    });
  } catch (error: any) {
    console.error("AI Chat Route Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response. Please try again." },
      { status: 500 }
    );
  }
}
