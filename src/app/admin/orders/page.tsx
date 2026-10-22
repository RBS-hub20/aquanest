import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { orderInclude } from "@/lib/orders";
import { serializeOrder } from "@/lib/serialize";
import { startOfManilaDay } from "@/lib/utils";
import { KanbanBoard } from "./kanban";

export const metadata: Metadata = { title: "Order Board" };
export const dynamic = "force-dynamic";

export default async function OrdersBoardPage() {
  const today = startOfManilaDay();
  const [orders, riders] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] } },
          { status: "DELIVERED", deliveredAt: { gte: today } },
          { status: "CANCELLED", cancelledAt: { gte: today } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: orderInclude,
    }),
    prisma.rider.findMany({ where: { isActive: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  return <KanbanBoard orders={orders.map(serializeOrder)} riders={riders.map((r) => ({ id: r.id, name: r.user.name, isOnline: r.isOnline }))} />;
}
