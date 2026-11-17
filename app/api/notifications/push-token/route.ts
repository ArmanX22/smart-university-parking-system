import { NextRequest } from "next/server";
import { NotificationService } from "@/server/services/notification.service";
import { requireAuth } from "@/server/auth/guards";
import { handleApiError, ValidationError } from "@/server/errors/api-error";
import { z } from "zod";

const registerTokenSchema = z.object({
  token: z.string().min(10, "Valid device push token is required"),
  platform: z.string().default("web"),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = registerTokenSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid push token registration payload", parsed.error.format());
    }

    const registered = await NotificationService.registerToken(
      user.id,
      parsed.data.token,
      parsed.data.platform
    );

    return Response.json({ success: true, data: registered });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.token) {
      throw new ValidationError("Device push token is required for unregistration");
    }

    await NotificationService.unregisterToken(body.token);
    return Response.json({ success: true, message: "Token unregistered successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
