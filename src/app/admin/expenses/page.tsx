import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ExpensesClient } from "./expenses-client";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const start = new Date(Date.UTC(y, m - 1, 1) - 8 * 3600000);
  const end = new Date(Date.UTC(y, m, 1) - 8 * 3600000);
  return { start, end };
}

export default async function ExpensesPage({ searchParams }: { searchParams: { month?: string } }) {
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : current;
  const { start, end } = monthRange(month);
  const [expenses, sales] = await Promise.all([
    prisma.expense.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: start, lt: end } }, _sum: { total: true }, _count: true }),
  ]);
  return (
    <ExpensesClient
      month={month}
      currentMonth={current}
      sales={sales._sum.total ?? 0}
      orderCount={sales._count}
      expenses={expenses.map((e) => ({ id: e.id, category: e.category, description: e.description, amount: e.amount, date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(e.date) }))}
    />
  );
}
