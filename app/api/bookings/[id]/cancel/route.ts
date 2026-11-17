import { NextRequest } from "next/server";
import { BookingService } from "@/server/services/booking.service";
import { requireAuth } from "@/server/auth/guards";
import { handleApiError } from "@/server/errors/api-error";

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    let reason: string | undefined;

    try {
      const body = await req.json();
      reason = body?.reason;
    } catch {
      // Body is optional
    }

    const cancelled = await BookingService.cancelBooking({
      userId: user.id,
      bookingId: params.id,
      reason,
    });

    return Response.json({ success: true, data: cancelled });
  } catch (error) {
    return handleApiError(error);
  }
}
