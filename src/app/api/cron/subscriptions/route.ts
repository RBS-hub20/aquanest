import { NextResponse } from "next/server";
import { runDueSubscriptions } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

/** Suki Mode scheduler — call daily (e.g. Vercel Cron 06:00 PHT) with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueSubscriptions();
  return NextResponse.json({ ok: true, ...result });
}
