import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
You are the official Smart Campus AI Parking Advisor for the Smart University Parking Management and Reservation System.
The system is built based on university parking requirements and field visit guidelines.

Key System Invariants:
1. 15-Minute Pre-Arrival Reservation Rule:
   - When a student, faculty member, or visitor reserves a parking slot, they receive a digital parking e-ticket (PNR) with an active 15-minute countdown timer.
   - The driver must arrive at the campus security gate and check in before the 15-minute timer expires.
   - If the vehicle does not arrive within 15 minutes, the system's background worker automatically cancels the reservation as NO_SHOW, releases the slot back to AVAILABLE, and offers it to the next driver on the waiting list.
   - No reservation fee is charged if cancelled, but abuse of slots is logged.

2. Parking Zones & Architecture:
   - Two-Sided Motorcycle Parking (Lot M): Designed with Side A (M01-M12) and Side B (M13-M24) parking stalls separated by an unobstructed central driveway to prevent traffic bottlenecks.
   - Car Parking (Lot C): Stalls C01-C20 located near Administrative and Faculty Buildings.
   - Fulbaria Route Bus Planner & Bay (Lot B): B01-B08 designated exclusively for university transit and student shuttles (Fulbaria - Campus route).

3. Portal Roles:
   - Student & Faculty Driver Portal: Search available slots, reserve in 3 simple steps (similar to Bangladesh Railway ticketing flow), view live 15-minute countdown e-ticket, and cancel or check-in.
   - Campus Admin Console: Real-time inventory telemetry, single and batch slot generator (Mxx, Cxx, Bxx), maintenance toggles, and occupancy metrics.
   - Security Gate Staff Portal: In-gate license plate check-in and out-gate release.

Always respond professionally, politely, and concisely in English. If asked for directions, recommendations, or rules, cite the exact 15-minute countdown policy and slot architecture.
`;

export async function askCampusParkingAI(prompt: string, context?: {
  availableSlots?: { name: string; category: string; area: string }[];
  currentRole?: string;
  activeReservation?: { slotName: string; expiresAt: string; minutesRemaining?: number } | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Context enrichment
  let enrichedPrompt = `User question: "${prompt}"\n`;
  if (context?.currentRole) {
    enrichedPrompt += `User role: ${context.currentRole}\n`;
  }
  if (context?.activeReservation) {
    enrichedPrompt += `Active booking: Slot ${context.activeReservation.slotName}, expires at ${context.activeReservation.expiresAt}\n`;
  }
  if (context?.availableSlots && context.availableSlots.length > 0) {
    const slotNames = context.availableSlots.slice(0, 10).map((s) => `${s.name} (${s.category})`).join(", ");
    enrichedPrompt += `Currently free slots sample: ${slotNames} (total ${context.availableSlots.length} available)\n`;
  }

  if (!apiKey) {
    // Intelligent offline rule engine fallback when no API key is configured yet
    return getOfflineRuleBasedResponse(prompt, context);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(enrichedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI API Error, falling back to intelligent rule engine:", error);
    return getOfflineRuleBasedResponse(prompt, context);
  }
}

function getOfflineRuleBasedResponse(prompt: string, context?: any): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("15") || lower.includes("time") || lower.includes("cancel") || lower.includes("expire") || lower.includes("rule")) {
    return (
      "⏱️ **15-Minute Pre-Arrival Rule:**\n" +
      "Once you reserve a parking slot, you have exactly **15 minutes** to reach the campus entry gate. " +
      "Your digital e-ticket displays a live countdown timer. If you do not check in at the gate within 15 minutes, " +
      "the system automatically cancels your booking as `NO_SHOW`, immediately re-opens the slot to other campus members, " +
      "and notifies the next driver on the waiting list."
    );
  }

  if (lower.includes("motorcycle") || lower.includes("bike") || lower.includes("two-sided") || lower.includes("side a") || lower.includes("side b")) {
    return (
      "🏍️ **Two-Sided Motorcycle Zone (Lot M):**\n" +
      "Motorcycle parking is organized into **Side A (Stalls M01-M12)** and **Side B (Stalls M13-M24)**, " +
      "divided by a clear central passage. This layout prevents congestion and allows students and faculty to park and exit smoothly."
    );
  }

  if (lower.includes("bus") || lower.includes("fulbaria") || lower.includes("shuttle")) {
    return (
      "🚌 **Fulbaria Route Bus Planner (Lot B):**\n" +
      "Bays B01 through B08 are dedicated to university shuttle buses. University buses operate on a scheduled route connecting " +
      "Fulbaria and Campus, with peak departures from 07:30 to 08:30 AM and afternoon returns."
    );
  }

  if (lower.includes("slot") || lower.includes("available") || lower.includes("free") || lower.includes("recommend") || lower.includes("car")) {
    if (context?.availableSlots && context.availableSlots.length > 0) {
      const first = context.availableSlots[0];
      return (
        `🚗 **Available Parking Recommendation:**\n` +
        `There are currently ${context.availableSlots.length} slots available. We recommend reserving slot **${first.name}** in ${first.area || "Zone A"}. ` +
        `Remember to reserve only when you are within 15 minutes of arriving at the university campus gate!`
      );
    }
    return (
      "🚗 **Slot Availability:**\n" +
      "Please select your vehicle type (Motorcycle, Car, or Bus) from the Student & Faculty Portal. " +
      "The system will show real-time available bays with green indicators."
    );
  }

  if (lower.includes("admin") || lower.includes("batch") || lower.includes("generate")) {
    return (
      "⚙️ **Admin Capabilities:**\n" +
      "Campus administrators can monitor live lot occupancy, generate slots in batches (e.g. M01-M24 for motorcycles, C01-C20 for cars), " +
      "toggle maintenance statuses, and inspect automated 15-minute expiry logs."
    );
  }

  return (
    "🤖 **Smart Campus AI Parking Advisor (Google AI Studio / Gemini):**\n" +
    "Welcome to the University Parking Management System. You can ask me about:\n" +
    "• The **15-Minute Pre-Arrival Rule** and auto-cancellation\n" +
    "• Two-Sided Motorcycle Parking layout (Side A & Side B)\n" +
    "• Fulbaria Route Bus scheduling and Bays (B01-B08)\n" +
    "• Real-time slot recommendations for your vehicle\n\n" +
    "*(Powered by Google Gemini 1.5 Flash. To connect live Google AI Studio credentials, set `GEMINI_API_KEY` in `.env.local`)*"
  );
}
