import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PromosClient } from "./promos-client";

export const metadata: Metadata = { title: "Promo Codes" };

export default async function PromosPage() {
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: true } } } });
  return (
    <PromosClient
      promos={promos.map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description ?? "",
        type: p.type,
        value: p.value,
        minOrder: p.minOrder,
        maxUses: p.maxUses,
        usedCount: p.usedCount,
        expiresAt: p.expiresAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(p.expiresAt) : null,
        isActive: p.isActive,
        orders: p._count.orders,
      }))}
    />
  );
}
