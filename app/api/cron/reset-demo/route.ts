import { DemoResetService } from "@/server/services/demo-reset.service";
import { isResetAuthorized } from "@/server/auth/cron-policy";
import { requireProductionSecret } from "@/lib/auth-policy";

export const dynamic = "force-dynamic";

async function handleReset(req: Request, secretName: "CRON_SECRET" | "RESET_SECRET") {
  const secret = requireProductionSecret(
    secretName,
    process.env[secretName],
    process.env.NODE_ENV,
    secretName === "CRON_SECRET"
      ? "local-development-cron-secret"
      : "local-development-reset-secret"
  );

  if (!isResetAuthorized(req.headers.get("authorization"), secret)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await DemoResetService.reset();
    return Response.json({ success: true, data: summary });
  } catch (error) {
    console.error("Demo reset failed:", error);
    return Response.json(
      { success: false, error: "Demo reset failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleReset(req, "CRON_SECRET");
}

export async function POST(req: Request) {
  return handleReset(req, "RESET_SECRET");
}
