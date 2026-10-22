import type { Metadata } from "next";
import { buildReport, type Granularity } from "@/lib/reports";
import { ReportsClient } from "./reports-client";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { period?: string } }) {
  const g: Granularity = searchParams.period === "weekly" || searchParams.period === "monthly" ? searchParams.period : "daily";
  const report = await buildReport(g);
  return <ReportsClient report={report} />;
}
