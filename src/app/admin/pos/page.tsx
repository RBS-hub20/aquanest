import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings, pricingSettings } from "@/lib/settings";
import { startOfManilaDay } from "@/lib/utils";
import { PosClient } from "./pos-client";

export const metadata: Metadata = { title: "POS" };

export default async function PosPage() {
  const [products, settings, todayPos] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    prisma.order.aggregate({ where: { channel: "POS", createdAt: { gte: startOfManilaDay() } }, _sum: { total: true }, _count: true }),
  ]);
  return (
    <PosClient
      products={products.map((p) => ({ id: p.id, name: p.name, container: p.container, sizeLabel: p.sizeLabel, waterType: p.waterType, price: p.price, containerPrice: p.containerPrice, depositPrice: p.depositPrice, isReturnable: p.isReturnable, isPopular: p.isPopular }))}
      pricing={pricingSettings(settings)}
      store={{ name: settings.storeName, address: settings.address, phone: settings.phone }}
      today={{ total: todayPos._sum.total ?? 0, count: todayPos._count }}
    />
  );
}
