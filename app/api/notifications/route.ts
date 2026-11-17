import { NextRequest } from "next/server";
import { NotificationService } from "@/server/services/notification.service";
import { requireAuth } from "@/server/auth/guards";
import { handleApiError } from "@/server/errors/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const notifications = await NotificationService.listUserNotifications(user.id);
    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return Response.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    let notificationIds: string[] | undefined;

    try {
      const body = await req.json();
      notificationIds = body?.ids;
    } catch {
      // Empty body marks all as read
    }

    const updated = await NotificationService.markAsRead(user.id, notificationIds);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
