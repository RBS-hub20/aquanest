import "server-only";
import { prisma } from "@/lib/prisma";
import { manilaDateKey, round2, startOfManilaDay } from "@/lib/utils";

export type Granularity = "daily" | "weekly" | "monthly";

const DAY = 86400000;

function bucketKey(d: Date, g: Granularity) {
  const key = manilaDateKey(d);
  if (g === "monthly") return key.slice(0, 7);
  if (g === "weekly") {
    const day = new Date(`${key}T00:00:00+08:00`);
    const dow = (day.getUTCDay() + 6) % 7; // Monday-based (approx, fine for PH)
    return manilaDateKey(new Date(day.getTime() - dow * DAY));
  }
  return key;
}

function labelFor(key: string, g: Granularity) {
  if (g === "monthly") return new Date(`${key}-01T00:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", year: "2-digit", timeZone: "Asia/Manila" });
  return new Date(`${key}T00:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

export function rangeFor(g: Granularity) {
  const end = new Date();
  const today = startOfManilaDay(end);
  if (g === "monthly") {
    const k = manilaDateKey(end).slice(0, 7);
    const [y, m] = k.split("-").map(Number) as [number, number];
    const start = new Date(Date.UTC(y, m - 12, 1) - 8 * 3600000);
    return { start, end };
  }
  if (g === "weekly") return { start: new Date(today.getTime() - 7 * 11 * DAY - ((today.getUTCDay() + 6) % 7) * DAY), end };
  return { start: new Date(today.getTime() - 13 * DAY), end };
}

function emptyBuckets(start: Date, end: Date, g: Granularity) {
  const keys: string[] = [];
  let t = start.getTime();
  while (t <= end.getTime()) {
    const k = bucketKey(new Date(t), g);
    if (!keys.includes(k)) keys.push(k);
    t += g === "monthly" ? 15 * DAY : DAY;
  }
  const last = bucketKey(end, g);
  if (!keys.includes(last)) keys.push(last);
  return keys;
}

export async function buildReport(g: Granularity) {
  const { start, end } = rangeFor(g);
  const [orders, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { status: "DELIVERED", deliveredAt: { gte: start, lte: end } },
      select: { total: true, deliveredAt: true, paymentMethod: true, channel: true, items: { select: { productName: true, quantity: true, lineTotal: true } } },
    }),
    prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, select: { amount: true, date: true, category: true } }),
  ]);
  const keys = emptyBuckets(start, end, g);
  const rows = new Map(keys.map((k) => [k, { key: k, label: labelFor(k, g), sales: 0, orders: 0, expenses: 0, profit: 0 }]));
  for (const o of orders) {
    const r = rows.get(bucketKey(o.deliveredAt!, g));
    if (r) {
      r.sales += o.total;
      r.orders += 1;
    }
  }
  for (const e of expenses) {
    const r = rows.get(bucketKey(e.date, g));
    if (r) r.expenses += e.amount;
  }
  const series = Array.from(rows.values()).map((r) => ({ ...r, sales: round2(r.sales), expenses: round2(r.expenses), profit: round2(r.sales - r.expenses) }));

  const byMethod = new Map<string, number>();
  const byChannel = new Map<string, number>();
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    const m = o.paymentMethod === "COD" ? "Cash / COD" : o.paymentMethod === "CASH" ? "Cash / COD" : o.paymentMethod === "GCASH" ? "GCash" : "Maya";
    byMethod.set(m, (byMethod.get(m) ?? 0) + o.total);
    byChannel.set(o.channel, (byChannel.get(o.channel) ?? 0) + o.total);
    for (const i of o.items) {
      const p = byProduct.get(i.productName) ?? { qty: 0, revenue: 0 };
      p.qty += i.quantity;
      p.revenue += i.lineTotal;
      byProduct.set(i.productName, p);
    }
  }
  const byExpense = new Map<string, number>();
  for (const e of expenses) byExpense.set(e.category, (byExpense.get(e.category) ?? 0) + e.amount);

  const totals = series.reduce((a, r) => ({ sales: a.sales + r.sales, expenses: a.expenses + r.expenses, orders: a.orders + r.orders }), { sales: 0, expenses: 0, orders: 0 });
  return {
    granularity: g,
    start: start.toISOString(),
    end: end.toISOString(),
    series,
    totals: { sales: round2(totals.sales), expenses: round2(totals.expenses), profit: round2(totals.sales - totals.expenses), orders: totals.orders, avgOrder: totals.orders ? round2(totals.sales / totals.orders) : 0 },
    byMethod: Array.from(byMethod, ([name, value]) => ({ name, value: round2(value) })).sort((a, b) => b.value - a.value),
    byChannel: Array.from(byChannel, ([name, value]) => ({ name: name === "POS" ? "Walk-in (POS)" : name === "SUBSCRIPTION" ? "Suki Mode" : "Online", value: round2(value) })),
    byExpense: Array.from(byExpense, ([name, value]) => ({ name, value: round2(value) })).sort((a, b) => b.value - a.value),
    topProducts: Array.from(byProduct, ([name, v]) => ({ name, qty: v.qty, revenue: round2(v.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;
