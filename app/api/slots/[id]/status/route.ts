import { NextRequest } from "next/server";
import { InventoryService } from "@/server/services/inventory.service";
import { getAttendantAssignedAreaId, requireAttendant } from "@/server/auth/guards";
import { updateSlotStatusSchema } from "@/schemas/inventory.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const actor = await requireAttendant();
    const assignedAreaId = await getAttendantAssignedAreaId(actor.id);
    const body = await req.json();
    const parsed = updateSlotStatusSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid slot status", parsed.error.format());
    }

    const updated = await InventoryService.updateSlotStatus(params.id, parsed.data.status, {
      role: actor.role,
      assignedAreaId,
    });
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
