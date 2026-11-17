import { NextRequest } from "next/server";
import { WaitingListService } from "@/server/services/waiting-list.service";
import { requireAuth } from "@/server/auth/guards";
import { joinWaitingListSchema } from "@/schemas/booking.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const entries = await WaitingListService.listUserWaiting(user.id);
    return Response.json({ success: true, data: entries });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = joinWaitingListSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid waiting list parameters", parsed.error.format());
    }

    const entry = await WaitingListService.joinQueue({
      userId: user.id,
      areaId: parsed.data.areaId,
      categoryId: parsed.data.categoryId,
      vehicleId: parsed.data.vehicleId,
    });

    return Response.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
