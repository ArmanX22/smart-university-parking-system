import { BookingService } from "@/server/services/booking.service";
import { requireAuth } from "@/server/auth/guards";
import { handleApiError } from "@/server/errors/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const active = await BookingService.getActiveBooking(user.id);
    return Response.json({ success: true, data: active, booking: active });
  } catch (error) {
    return handleApiError(error);
  }
}
