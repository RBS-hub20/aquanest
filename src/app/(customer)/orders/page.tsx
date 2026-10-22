import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderInclude } from "@/lib/orders";
import { serializeOrder } from "@/lib/serialize";
import { getSettings, storeInfo } from "@/lib/settings";
import { OrdersClient } from "./orders-client";

export const metadata: Metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const user = await requireUser("CUSTOMER");
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: orderInclude }),
    getSettings(),
  ]);
  return <OrdersClient orders={orders.map(serializeOrder)} store={storeInfo(settings)} />;
}
