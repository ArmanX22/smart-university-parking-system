import { NextRequest } from "next/server";
import { BookingService } from "@/server/services/booking.service";
import { requireAuth } from "@/server/auth/guards";
import { createBookingSchema } from "@/schemas/booking.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const bookings = await BookingService.listUserBookings(user.id);
    return Response.json({ success: true, data: bookings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid booking payload", parsed.error.format());
    }

    const booking = await BookingService.createBooking({
      userId: user.id,
      slotId: parsed.data.slotId,
      vehicleId: parsed.data.vehicleId,
    });

    return Response.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
