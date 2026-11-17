import { NextRequest } from "next/server";
import { BookingService } from "@/server/services/booking.service";
import { requireAttendant } from "@/server/auth/guards";
import { verifyArrivalSchema } from "@/schemas/booking.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAttendant();
    const body = await req.json();
    const parsed = verifyArrivalSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid check-in parameters", parsed.error.format());
    }

    const result = await BookingService.verifyArrival({
      actorId: actor.id,
      bookingCode: parsed.data.bookingCode,
      qrSecret: parsed.data.qrSecret,
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
