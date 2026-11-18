import { NextRequest } from "next/server";
import { InventoryService } from "@/server/services/inventory.service";
import { requireAdmin } from "@/server/auth/guards";
import { createAreaSchema } from "@/schemas/inventory.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";

export async function GET() {
  try {
    const areas = await InventoryService.listAreas();
    return Response.json({ success: true, data: areas, areas });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createAreaSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid area data", parsed.error.format());
    }

    const created = await InventoryService.createArea(parsed.data);
    return Response.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
