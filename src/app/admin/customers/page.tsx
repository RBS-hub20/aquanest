import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CustomersClient } from "./customers-client";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      gallons: true,
      addresses: { where: { isPrimary: true }, take: 1 },
      orders: { where: { status: "DELIVERED" }, select: { total: true, deliveredAt: true }, orderBy: { deliveredAt: "desc" } },
      subscriptions: { where: { isActive: true }, select: { id: true } },
    },
  });
  const loyalty = await prisma.loyaltyPoint.groupBy({ by: ["userId"], _sum: { points: true } });
  const pts = new Map(loyalty.map((l) => [l.userId, l._sum.points ?? 0]));
  return (
    <CustomersClient
      customers={users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        tags: u.tags,
        balance: u.balance,
        deposit: u.depositBalance,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        address: u.addresses[0] ? `${u.addresses[0].line1}, ${u.addresses[0].barangay ?? ""} ${u.addresses[0].city}` : null,
        orders: u.orders.length,
        spent: u.orders.reduce((s, o) => s + o.total, 0),
        lastOrder: u.orders[0]?.deliveredAt?.toISOString() ?? null,
        gallons: u.gallons.map((g) => ({ container: g.container, owned: g.owned, borrowed: g.borrowed })),
        borrowed: u.gallons.reduce((s, g) => s + g.borrowed, 0),
        suki: u.subscriptions.length > 0,
        points: pts.get(u.id) ?? 0,
      }))}
    />
  );
}
