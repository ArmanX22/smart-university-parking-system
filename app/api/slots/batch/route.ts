import { NextRequest } from "next/server";
import { InventoryService } from "@/server/services/inventory.service";
import { requireAdmin } from "@/server/auth/guards";
import { batchGenerateSlotsSchema } from "@/schemas/inventory.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = batchGenerateSlotsSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid batch slot generation request", parsed.error.format());
    }

    const result = await InventoryService.batchGenerateSlots(parsed.data);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
