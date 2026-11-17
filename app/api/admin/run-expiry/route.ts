import { requireAdmin } from "@/server/auth/guards";
import { ExpiryService } from "@/server/services/expiry.service";
import { handleApiError } from "@/server/errors/api-error";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();
    const result = await ExpiryService.processExpiries();
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
