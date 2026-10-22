import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ScheduleClient } from "./schedule-client";

export const metadata: Metadata = { title: "Delivery Schedule" };

export default async function SchedulePage() {
  const user = await requireUser("CUSTOMER");
  const [subs, addresses, products, settings, upcoming] = await Promise.all([
    prisma.subscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isPrimary: "desc" }] }),
    prisma.product.findMany({ where: { isActive: true, isReturnable: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    prisma.order.findMany({
      where: { customerId: user.id, status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true },
    }),
  ]);
  return (
    <ScheduleClient
      subs={subs.map((s) => ({ id: s.id, days: s.days, items: s.items as { productId: string; quantity: number }[], timeSlot: s.timeSlot, addressId: s.addressId ?? "", paymentMethod: s.paymentMethod as "COD", isActive: s.isActive }))}
      addresses={addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1 }))}
      products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, container: p.container, waterType: p.waterType }))}
      timeSlots={settings.timeSlots}
      upcoming={upcoming.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        date: (o.scheduledDate ?? o.createdAt).toISOString(),
        slot: o.timeSlot,
        isAsap: o.isAsap,
        summary: o.items.map((i) => `${i.productName} × ${i.quantity}`).join(", "),
        suki: o.channel === "SUBSCRIPTION",
      }))}
    />
  );
}
