import { NextRequest } from "next/server";
import { ExpiryService } from "@/server/services/expiry.service";
import { requireProductionSecret } from "@/lib/auth-policy";
import { isResetAuthorized } from "@/server/auth/cron-policy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  const expectedSecret = requireProductionSecret(
    "CRON_SECRET",
    process.env.CRON_SECRET,
    process.env.NODE_ENV,
    "local-development-cron-secret"
  );

  if (!isResetAuthorized(authHeader, expectedSecret)) {
    return Response.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing cron secret authorization.",
      },
      { status: 401 }
    );
  }

  try {
    const summary = await ExpiryService.processExpiries();
    return Response.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error("Cron expiry processing failed:", err);
    return Response.json(
      {
        success: false,
        error: (err as Error).message || "Internal cron error",
      },
      { status: 500 }
    );
  }
}
