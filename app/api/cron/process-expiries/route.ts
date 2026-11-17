import { NextRequest } from "next/server";
import { ExpiryService } from "@/server/services/expiry.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-cron-secret");
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("key");

  const expectedSecret = process.env.CRON_SECRET || "dev-cron-secret-key";

  // Check authorization
  const isAuthorized =
    authHeader === `Bearer ${expectedSecret}` ||
    customHeader === expectedSecret ||
    querySecret === expectedSecret;

  if (!isAuthorized) {
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
