import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { CalendarDays, CheckCircle2, ChevronRight, Droplets, Gift, MapPin, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getLoyaltyBalance, orderInclude } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { serializeOrder } from "@/lib/serialize";
import { CONTAINER_SHORT, WEEKDAYS, WEEKDAYS_TL } from "@/lib/constants";
import { manilaDateKey, manilaWeekday, peso } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/brand/product-image";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { QuickIcons } from "@/components/customer/quick-icons";
import { TrustBadges } from "@/components/customer/trust-badges";
import { ProductQuickCard } from "@/components/customer/product-quick-card";
import { DeliveryStatusCard } from "@/components/customer/delivery-status-card";
import { ReminderToggle, RepeatOrderButton } from "@/components/customer/widgets";
import { FadeIn } from "@/components/shared/reveal";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  const user = await requireUser("CUSTOMER");
  const t = await getTranslations("dashboard");
  const te = await getTranslations("enums");
  const tc = await getTranslations("common");
  const f = await getFormatter();
  const tl = user.language === "tl";

  const [products, address, subscription, scheduled, active, history, loyalty, gallons, settings] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true, waterType: "PURIFIED", isReturnable: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
    prisma.subscription.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.order.findFirst({ where: { customerId: user.id, isAsap: false, status: { in: ["PENDING", "PREPARING"] } }, orderBy: { scheduledDate: "asc" } }),
    prisma.order.findFirst({ where: { customerId: user.id, status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] } }, orderBy: { createdAt: "desc" }, include: orderInclude }),
    prisma.order.findMany({ where: { customerId: user.id, status: "DELIVERED" }, orderBy: { deliveredAt: "desc" }, take: 3, include: { items: { include: { product: { select: { container: true } } } } } }),
    getLoyaltyBalance(user.id),
    prisma.customerGallon.findMany({ where: { userId: user.id } }),
    getSettings(),
  ]);

  // Next delivery: earliest scheduled order or next subscription weekday
  let nextDelivery: { date: Date; slot: string } | null = null;
  if (scheduled?.scheduledDate) nextDelivery = { date: scheduled.scheduledDate, slot: scheduled.timeSlot ?? "" };
  if (subscription && subscription.days.length) {
    const today = manilaWeekday();
    const ranToday = subscription.lastRunDate === manilaDateKey();
    const offset = Math.min(...subscription.days.map((d) => ((d - today + 7) % 7) || (ranToday ? 7 : 0)));
    const d = new Date(Date.now() + offset * 86400000);
    if (!nextDelivery || d < nextDelivery.date) nextDelivery = { date: d, slot: subscription.timeSlot };
  }
  const dayNames = (subscription?.days ?? []).map((d) => (tl ? WEEKDAYS_TL : WEEKDAYS)[d]).join(", ");
  const gallonSummary =
    gallons
      .filter((g) => g.owned + g.borrowed > 0)
      .map((g) => `${g.owned + g.borrowed} ${CONTAINER_SHORT[g.container]}`)
      .join(" · ") || "0";
  const target = settings.loyaltyRefillsForFree;
  const progress = loyalty % target;
  const latest = history[0];

  return (
    <div className="space-y-6">
      <QuickIcons />

      {/* mini stats */}
      <FadeIn className="grid gap-3 sm:grid-cols-3">
        <Link href="/profile" className="card-premium flex items-center gap-3 p-4 transition hover:shadow-lift">
          <span className="icon-bubble h-11 w-11">
            <Droplets className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-navy-400">{t("gallonsWithYou")} · {tl ? "Galon" : "Gallons"}</p>
            <p className="truncate font-extrabold">{gallonSummary}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-navy-400" />
        </Link>
        <Link href="/profile" className="card-premium flex items-center gap-3 p-4 transition hover:shadow-lift">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-navy-400">{t("freeRefillProgress", { count: progress, target })}</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: `${(progress / target) * 100}%` }} />
            </div>
          </div>
        </Link>
        <Link href="/payment" className="card-premium flex items-center gap-3 p-4 transition hover:shadow-lift">
          <span className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${user.balance > 0 ? "bg-rose-50 text-rose-600 ring-rose-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100"}`}>
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-navy-400">Utang · Deposit</p>
            <p className="font-extrabold">
              {peso(user.balance)} <span className="text-sm font-semibold text-navy-400">· {peso(user.depositBalance)}</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-navy-400" />
        </Link>
      </FadeIn>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Water order */}
        <FadeIn>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("waterOrder")}</CardTitle>
              <Link href="/order" className="text-sm font-semibold text-ocean hover:underline">
                {tc("viewAll")}
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2.5">
                {products.map((p) => (
                  <ProductQuickCard key={p.id} p={{ id: p.id, name: p.name, sizeLabel: p.sizeLabel, container: p.container, waterType: p.waterType, price: p.price, isPopular: p.isPopular }} />
                ))}
              </div>
              <Button asChild className="mt-4 w-full">
                <Link href="/order">{t("quickOrder")}</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Delivery schedule */}
        <FadeIn delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("deliverySchedule")}</CardTitle>
              <Link href="/schedule" className="text-sm font-semibold text-ocean hover:underline">
                {tc("edit")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextDelivery ? (
                <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-50/40 p-4 ring-1 ring-emerald-100">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ocean shadow-sm">
                    <CalendarDays className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-navy-400">{t("nextDelivery")}</p>
                    <p className="font-bold">{f.dateTime(nextDelivery.date, { month: "long", day: "numeric", year: "numeric", weekday: "long" })}</p>
                    <p className="text-sm text-navy-500">{nextDelivery.slot}</p>
                  </div>
                  <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.5} />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-mist p-4">
                  <p className="text-sm font-medium text-navy-500">{t("noSchedule")}</p>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/schedule">{t("setupSuki")}</Link>
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 p-3.5">
                  <p className="text-xs text-navy-400">{t("frequency")}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                    <RefreshCw className="h-4 w-4 text-ocean" /> {subscription ? t("everyWeek") : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-3.5">
                  <p className="text-xs text-navy-400">{t("deliveryDay")}</p>
                  <p className="mt-1 truncate text-sm font-semibold">{dayNames || "—"}</p>
                </div>
              </div>
              <ReminderToggle initial={user.remindersEnabled} />
            </CardContent>
          </Card>
        </FadeIn>

        {/* Address */}
        <FadeIn>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("deliveryAddress")}</CardTitle>
              <Link href="/addresses" className="flex items-center gap-1 text-sm font-semibold text-ocean hover:underline">
                <Plus className="h-3.5 w-3.5" /> {tc("add")}
              </Link>
            </CardHeader>
            <CardContent>
              {address ? (
                <Link href="/addresses" className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-sky-200 hover:bg-mist/50">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ocean-50 text-ocean">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-bold">
                      {address.label} {address.isPrimary && <Badge variant="success">{tc("primary")}</Badge>}
                    </p>
                    <p className="truncate text-sm text-navy-500">
                      {address.line1}, {address.barangay}, {address.city}
                    </p>
                    <p className="truncate text-xs text-navy-400">
                      {address.landmark} · {address.distanceKm} km
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-navy-400" />
                </Link>
              ) : (
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/addresses">
                    <MapPin /> {t("noAddress")}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Payment */}
        <FadeIn delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("payment")}</CardTitle>
              <Link href="/payment" className="text-sm font-semibold text-ocean hover:underline">
                {tc("edit")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                <div>
                  <PaymentLogo method={user.preferredPayment} />
                  <p className="mt-2 text-xs text-navy-400">
                    {t("paymentMethod")} · <span className="font-semibold text-navy">{te(`payment.${user.preferredPayment}`)}</span>
                  </p>
                </div>
                <Badge variant="success">{tc("primary")}</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-mist p-3.5">
                <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-ocean">{t("securePayment")}</p>
                  <p className="text-xs text-navy-400">{t("securePaymentBody")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Delivery status */}
        <FadeIn>
          <DeliveryStatusCard order={active ? serializeOrder(active) : null} />
        </FadeIn>

        {/* Order history */}
        <FadeIn delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("orderHistory")}</CardTitle>
              <Link href="/orders" className="text-sm font-semibold text-ocean hover:underline">
                {tc("viewAll")}
              </Link>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="rounded-2xl bg-mist p-5 text-sm text-navy-500">{t("noOrders")}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {history.map((o) => {
                    const first = o.items[0];
                    const summary = o.items.map((i) => `${i.productName.replace(/ Refill$/, "")} × ${i.quantity}`).join(", ");
                    return (
                      <li key={o.id}>
                        <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-3">
                          <span className="h-12 w-11 shrink-0 rounded-xl bg-mist p-1">
                            <ProductImage container={first?.product.container ?? "ROUND_19L"} ground={false} sizes="44px" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{summary}</p>
                            <p className="text-xs text-navy-400">{o.deliveredAt ? f.dateTime(o.deliveredAt, { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                          </div>
                          <p className="text-sm font-bold">{peso(o.total)}</p>
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            {te("status.DELIVERED")} <CheckCircle2 className="h-4 w-4" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {latest && (
                <RepeatOrderButton
                  variant="secondary"
                  className="mt-3 w-full"
                  label={t("repeatOrder")}
                  items={latest.items.map((i) => ({ productId: i.productId, orderType: i.orderType, quantity: i.quantity }))}
                />
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <TrustBadges />
    </div>
  );
}
