import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { displayPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "SMS Log" };
export const dynamic = "force-dynamic";

export default async function SmsLogPage() {
  const logs = await prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="space-y-5">
      <PageHeader title="SMS Log" subtitle="Mock gateway — swap src/lib/notify.ts › sendSms for Semaphore/Twilio in production" />
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>When</TH>
              <TH>To</TH>
              <TH>Message</TH>
              <TH>Campaign</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((l) => (
              <TR key={l.id}>
                <TD className="text-xs text-navy-400">{l.createdAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</TD>
                <TD>
                  <p className="font-semibold">{l.name ?? "—"}</p>
                  <p className="text-xs text-navy-400">{displayPhone(l.to)}</p>
                </TD>
                <TD className="max-w-md whitespace-normal text-sm">{l.message}</TD>
                <TD>
                  <Badge variant="outline">{l.campaign ?? "—"}</Badge>
                </TD>
                <TD>
                  <Badge variant="success">{l.status}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {logs.length === 0 && <p className="p-10 text-center text-sm text-navy-400">No messages yet.</p>}
      </Card>
    </div>
  );
}
