import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { startOfManilaDay } from "@/lib/utils";
import { RidersClient } from "./riders-client";

export const metadata: Metadata = { title: "Riders" };
export const dynamic = "force-dynamic";

export default async function RidersPage() {
  const today = startOfManilaDay();
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const [riders, settings] = await Promise.all([
    prisma.rider.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, phone: true } },
        orders: {
          where: { OR: [{ status: "OUT_FOR_DELIVERY" }, { status: "DELIVERED", deliveredAt: { gte: monthAgo } }] },
          select: { status: true, deliveredAt: true, outForDeliveryAt: true, collectedAmount: true, collectedVia: true, total: true },
        },
      },
    }),
    getSettings(),
  ]);
  return (
    <RidersClient
      store={{ lat: settings.lat, lng: settings.lng }}
      riders={riders.map((r) => {
        const delivered = r.orders.filter((o) => o.status === "DELIVERED");
        const todayD = delivered.filter((o) => o.deliveredAt! >= today);
        const mins = delivered.filter((o) => o.outForDeliveryAt).map((o) => (o.deliveredAt!.getTime() - o.outForDeliveryAt!.getTime()) / 60000);
        return {
          id: r.id,
          name: r.user.name,
          phone: r.user.phone,
          photoUrl: r.photoUrl,
          area: r.area,
          vehicle: r.vehicle,
          plateNumber: r.plateNumber ?? "",
          isActive: r.isActive,
          isOnline: r.isOnline,
          lat: r.lat,
          lng: r.lng,
          rating: r.rating,
          lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
          active: r.orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length,
          today: todayD.length,
          month: delivered.length,
          cashToday: todayD.filter((o) => o.collectedVia === "CASH").reduce((s, o) => s + o.collectedAmount, 0),
          ewalletToday: todayD.filter((o) => o.collectedVia === "GCASH" || o.collectedVia === "MAYA").reduce((s, o) => s + o.collectedAmount, 0),
          avgMins: mins.length ? Math.round(mins.reduce((s, m) => s + m, 0) / mins.length) : null,
        };
      })}
    />
  );
}
