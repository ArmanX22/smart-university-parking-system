import { NextRequest } from "next/server";
import { InventoryService } from "@/server/services/inventory.service";
import { requireAdmin } from "@/server/auth/guards";
import { updatePolicySchema } from "@/schemas/inventory.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

interface RouteContext {
  params: { categoryId: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = updatePolicySchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid policy data", parsed.error.format());
    }

    const updated = await InventoryService.updatePolicy(params.categoryId, parsed.data);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
