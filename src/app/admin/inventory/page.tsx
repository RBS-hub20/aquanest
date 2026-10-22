import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./inventory-client";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [rows, gallons, customers] = await Promise.all([
    prisma.inventory.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
    prisma.gallon.findMany({ orderBy: { serial: "asc" } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true, name: true } }),
  ]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  return (
    <InventoryClient
      rows={rows.map(({ createdAt, updatedAt, ...r }) => ({ ...r, updatedAt: updatedAt.toISOString() }))}
      gallons={gallons.map((g) => ({ id: g.id, serial: g.serial, container: g.container, status: g.status, customer: g.customerId ? names.get(g.customerId) ?? null : null }))}
    />
  );
}
