import { NextRequest } from "next/server";
import { InventoryService } from "@/server/services/inventory.service";
import { requireAdmin } from "@/server/auth/guards";
import { createSlotSchema } from "@/schemas/inventory.schema";
import { handleApiError, ValidationError } from "@/server/errors/api-error";
import { SlotStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const areaId = searchParams.get("areaId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const statusParam = searchParams.get("status") || undefined;

    const status = statusParam && Object.values(SlotStatus).includes(statusParam as SlotStatus)
      ? (statusParam as SlotStatus)
      : undefined;

    const slots = await InventoryService.listSlots({ areaId, categoryId, status });
    return Response.json({ success: true, data: slots });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createSlotSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid slot data", parsed.error.format());
    }

    const created = await InventoryService.createSlot(parsed.data);
    return Response.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
