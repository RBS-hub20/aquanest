import "server-only";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/orders";
import { manilaDateKey, manilaWeekday } from "@/lib/utils";

/**
 * Suki Mode: creates today's auto-orders for active subscriptions whose weekday matches.
 * Idempotent per day (lastRunDate). Called by /api/cron/subscriptions and lazily from the admin dashboard.
 */
export async function runDueSubscriptions(now = new Date()) {
  const today = manilaDateKey(now);
  const weekday = manilaWeekday(now);
  const due = await prisma.subscription.findMany({
    where: { isActive: true, days: { has: weekday }, OR: [{ lastRunDate: null }, { lastRunDate: { not: today } }] },
  });
  let created = 0;
  for (const sub of due) {
    // claim the run first so concurrent callers don't double-order
    const claimed = await prisma.subscription.updateMany({
      where: { id: sub.id, OR: [{ lastRunDate: null }, { lastRunDate: { not: today } }] },
      data: { lastRunDate: today },
    });
    if (!claimed.count) continue;
    const items = (sub.items as { productId: string; quantity: number }[]) ?? [];
    try {
      await createOrder({
        customerId: sub.userId,
        addressId: sub.addressId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, orderType: "REFILL" })),
        paymentMethod: sub.paymentMethod,
        isAsap: false,
        scheduledDate: new Date(`${today}T00:00:00+08:00`),
        timeSlot: sub.timeSlot,
        channel: "SUBSCRIPTION",
        subscriptionId: sub.id,
        notes: "Suki Mode auto-order",
      });
      created++;
    } catch (e) {
      console.warn("[suki] failed for", sub.id, e);
    }
  }
  return { created, checked: due.length };
}
