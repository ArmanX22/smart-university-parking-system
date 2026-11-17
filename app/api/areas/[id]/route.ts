import { NextRequest } from "next/server";
import { InventoryService } from "@/server/services/inventory.service";
import { requireAdmin } from "@/server/auth/guards";
import { updateAreaSchema } from "@/schemas/inventory.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const area = await InventoryService.getAreaById(params.id);
    return Response.json({ success: true, data: area });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = updateAreaSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid update data", parsed.error.format());
    }

    const updated = await InventoryService.updateArea(params.id, parsed.data);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    await InventoryService.deleteArea(params.id);
    return Response.json({ success: true, message: "Parking Area deleted successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
