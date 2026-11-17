import { NextRequest } from "next/server";
import { WaitingListService } from "@/server/services/waiting-list.service";
import { requireAuth } from "@/server/auth/guards";
import { handleApiError } from "@/server/errors/api-error";

interface RouteContext {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const cancelled = await WaitingListService.cancelQueueEntry(user.id, params.id);
    return Response.json({ success: true, data: cancelled });
  } catch (error) {
    return handleApiError(error);
  }
}
