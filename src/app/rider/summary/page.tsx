import { getTranslations } from "next-intl/server";
import { Banknote, CheckCircle2, Smartphone, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { peso, startOfManilaDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RiderSummary() {
  const user = await requireUser("RIDER");
  const t = await getTranslations("rider");
  const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
  const delivered = rider
    ? await prisma.order.findMany({ where: { riderId: rider.id, status: "DELIVERED", deliveredAt: { gte: startOfManilaDay() } }, orderBy: { deliveredAt: "desc" }, include: { customer: { select: { name: true } } } })
    : [];
  const cash = delivered.filter((o) => o.collectedVia === "CASH").reduce((s, o) => s + o.collectedAmount, 0);
  const ewallet = delivered.filter((o) => o.collectedVia === "GCASH" || o.collectedVia === "MAYA").reduce((s, o) => s + o.collectedAmount, 0);
  // Cash collected on orders the customer had already prepaid isn't money to remit
  const remit = delivered.filter((o) => o.collectedVia === "CASH" && o.paymentMethod === "COD").reduce((s, o) => s + o.collectedAmount, 0);
  const short = delivered.reduce((s, o) => s + Math.max(0, o.total - o.collectedAmount), 0);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-100">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <Wallet className="h-4 w-4" /> {t("summary")} · {t("today")}
          </p>
          <p className="mt-2 text-4xl font-extrabold">{peso(cash + ewallet)}</p>
          <p className="mt-1 text-sm text-white/85">
            {t("remit")}: <span className="font-bold">{peso(remit)}</span> cash
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 p-2 text-center">
          {[
            [Banknote, t("totalCash"), peso(cash)],
            [Smartphone, t("totalGcash"), peso(ewallet)],
            [CheckCircle2, t("ordersDelivered"), String(delivered.length)],
          ].map(([Icon, l, v], i) => {
            const I = Icon as typeof Banknote;
            return (
              <div key={i} className="p-3">
                <I className="mx-auto h-5 w-5 text-ocean" />
                <p className="mt-1 text-lg font-extrabold">{v as string}</p>
                <p className="text-[11px] text-navy-400">{l as string}</p>
              </div>
            );
          })}
        </div>
        {short > 0 && <p className="mx-4 mb-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">⚠️ {peso(short)} recorded as customer utang today.</p>}
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
        <ul className="divide-y divide-slate-100">
          {delivered.length === 0 && <li className="py-8 text-center text-sm text-navy-400">—</li>}
          {delivered.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold">{o.code}</p>
                <p className="text-xs text-navy-400">
                  {o.customer?.name} · {o.deliveredAt?.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{peso(o.collectedAmount)}</p>
                <p className="text-[10px] font-semibold text-navy-400">{o.collectedVia}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
