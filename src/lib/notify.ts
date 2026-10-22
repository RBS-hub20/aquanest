import "server-only";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/realtime";

export async function notifyUser(userId: string, title: string, body: string, link?: string) {
  const n = await prisma.notification.create({ data: { userId, title, body, link } });
  await broadcast(`user:${userId}`, "notification", { id: n.id, title, body, link });
  return n;
}

/** Mock SMS gateway — logs to SmsLog. Swap for Semaphore / Twilio in production. */
export async function sendSms(to: string, message: string, opts?: { name?: string; campaign?: string }) {
  console.info(`[sms:mock] → ${to}: ${message}`);
  return prisma.smsLog.create({ data: { to, message, name: opts?.name, campaign: opts?.campaign } });
}
