import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { peso } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RiderHistory() {
  const user = await requireUser("RIDER");
  const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
  const orders = rider
    ? await prisma.order.findMany({ where: { riderId: rider.id, status: "DELIVERED" }, orderBy: { deliveredAt: "desc" }, take: 40, include: { customer: { select: { name: true } } } })
    : [];
  const byDay = new Map<string, typeof orders>();
  for (const o of orders) {
    const k = o.deliveredAt!.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Manila" });
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }
  return (
    <div className="space-y-4">
      {Array.from(byDay).map(([day, list]) => (
        <section key={day} className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">{day}</p>
            <p className="text-sm font-semibold text-ocean">
              {list.length} · {peso(list.reduce((s, o) => s + o.collectedAmount, 0))}
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {list.map((o) => (
              <li key={o.id} className="flex justify-between py-2 text-sm">
                <span>
                  <span className="font-semibold">{o.code}</span> <span className="text-navy-400">· {o.customer?.name ?? o.walkInName}</span>
                </span>
                <span className="font-semibold">{peso(o.collectedAmount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {orders.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-sm text-navy-400 shadow-soft">No deliveries yet.</p>}
    </div>
  );
}
