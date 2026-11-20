import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/server/auth/guards";
import { SseService, SseSlotUpdateEvent, SseBookingUpdateEvent, SseMetricsUpdateEvent } from "@/server/services/sse.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Check authenticated session
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      const initialPayload = `event: connected\ndata: ${JSON.stringify({
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialPayload));

      // 15-second heartbeat ping to prevent proxy/browser timeout
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // Event handlers
      const unsubscribeSlot = SseService.onSlotUpdate((event: SseSlotUpdateEvent) => {
        try {
          const payload = `event: slot-update\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      });

      const unsubscribeBooking = SseService.onBookingUpdate((event: SseBookingUpdateEvent) => {
        try {
          const payload = `event: booking-update\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      });

      const unsubscribeMetrics = SseService.onMetricsUpdate((event: SseMetricsUpdateEvent) => {
        try {
          const payload = `event: metrics-update\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      });

      function cleanup() {
        clearInterval(pingInterval);
        unsubscribeSlot();
        unsubscribeBooking();
        unsubscribeMetrics();
      }

      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
