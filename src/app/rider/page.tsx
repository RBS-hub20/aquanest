import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { orderInclude } from "@/lib/orders";
import { serializeOrder } from "@/lib/serialize";
import { getSettings } from "@/lib/settings";
import { startOfManilaDay } from "@/lib/utils";
import { DeliveriesClient } from "./deliveries-client";

export const dynamic = "force-dynamic";

export default async function RiderHome() {
  const user = await requireUser("RIDER");
  const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
  if (!rider) return <p className="rounded-3xl bg-white p-8 text-center shadow-soft">Rider profile not found.</p>;
  const today = startOfManilaDay();
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { riderId: rider.id, OR: [{ status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] } }, { status: "DELIVERED", deliveredAt: { gte: today } }] },
      orderBy: [{ createdAt: "asc" }],
      include: orderInclude,
    }),
    getSettings(),
  ]);
  return <DeliveriesClient orders={orders.map(serializeOrder)} store={{ lat: settings.lat, lng: settings.lng }} />;
}
