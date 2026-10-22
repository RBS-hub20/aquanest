import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowUpRight, Banknote, Bike, Boxes, ClipboardList, Droplets, PackageOpen, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { runDueSubscriptions } from "@/lib/subscriptions";
import { getSettings } from "@/lib/settings";
import { buildReport } from "@/lib/reports";
import { peso, startOfManilaDay } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { KpiCard, PageHeader } from "@/components/admin/page-header";
import { BreakdownDonut, SalesAreaChart } from "@/components/admin/charts";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { RidersMap } from "@/components/admin/riders-map";
import { VerifyPaymentButtons } from "@/components/admin/verify-payment";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await runDueSubscriptions().catch(() => null);
  const today = startOfManilaDay();
  const yesterday = new Date(today.getTime() - 86400000);

  const [todayAgg, yAgg, pending, preparing, outFor, gallonInv, supplies, riders, verify, recent, report, settings, todayExp] = await Promise.all([
    prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: today } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: yesterday, lt: today } }, _sum: { total: true } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PREPARING" } }),
    prisma.order.count({ where: { status: "OUT_FOR_DELIVERY" } }),
    prisma.inventory.findMany({ where: { category: "GALLON" } }),
    prisma.inventory.findMany({ where: { category: "SUPPLY" } }),
    prisma.rider.findMany({ where: { isActive: true }, include: { user: { select: { name: true, phone: true } }, _count: { select: { orders: { where: { status: "OUT_FOR_DELIVERY" } } } } } }),
    prisma.order.findMany({ where: { paymentStatus: "FOR_VERIFICATION", status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" }, take: 5, include: { customer: { select: { name: true } } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { customer: { select: { name: true } }, items: true } }),
    buildReport("daily"),
    getSettings(),
    prisma.expense.aggregate({ where: { date: { gte: today } }, _sum: { amount: true } }),
  ]);

  const sales = todayAgg._sum.total ?? 0;
  const ySales = yAgg._sum.total ?? 0;
  const delta = ySales ? ((sales - ySales) / ySales) * 100 : 0;
  const gallonsOut = gallonInv.reduce((s, g) => s + g.atCustomer, 0);
  const low = [
    ...gallonInv.filter((g) => g.filled < g.lowStockThreshold).map((g) => ({ id: g.id, name: `${g.name} (filled)`, qty: g.filled, unit: "pcs", min: g.lowStockThreshold })),
    ...supplies.filter((s) => s.quantity < s.lowStockThreshold).map((s) => ({ id: s.id, name: s.name, qty: s.quantity, unit: s.unit, min: s.lowStockThreshold })),
  ];
  const online = riders.filter((r) => r.isOnline).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Magandang araw! ☀️"
        subtitle={new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/reports">Reports</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/orders">
                <ClipboardList /> Order board
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          label="Today's Sales"
          value={peso(sales)}
          tone="ocean"
          icon={<Banknote className="h-5 w-5" />}
          sub={
            <span className={`inline-flex items-center gap-1 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(0)}% vs yesterday · {todayAgg._count} orders
            </span>
          }
        />
        <KpiCard label="Pending Orders" value={pending + preparing} tone="amber" icon={<ClipboardList className="h-5 w-5" />} sub={`${pending} new · ${preparing} preparing · ${outFor} on the road`} />
        <KpiCard label="Gallons Out" value={gallonsOut} tone="aqua" icon={<Droplets className="h-5 w-5" />} sub="On loan at customers' homes" />
        <KpiCard label="Low Stock" value={low.length} tone={low.length ? "rose" : "emerald"} icon={<Boxes className="h-5 w-5" />} sub={low.length ? low.map((l) => l.name.split(" (")[0]).slice(0, 2).join(", ") : "All stocked up"} />
        <KpiCard label="Riders Active" value={`${online}/${riders.length}`} tone="violet" icon={<Bike className="h-5 w-5" />} sub={`${riders.reduce((s, r) => s + r._count.orders, 0)} deliveries in progress`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales · last 14 days</CardTitle>
              <p className="mt-1 text-xs text-navy-400">
                {peso(report.totals.sales)} revenue · {report.totals.orders} delivered orders · avg {peso(report.totals.avgOrder)}
              </p>
            </div>
            <Link href="/admin/reports" className="flex items-center gap-1 text-sm font-semibold text-ocean">
              Details <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <SalesAreaChart data={report.series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment mix · 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownDonut data={report.byMethod} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-mist p-3">
                <p className="text-xs text-navy-400">Expenses today</p>
                <p className="font-extrabold">{peso(todayExp._sum.amount ?? 0)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs text-navy-400">Profit today</p>
                <p className="font-extrabold text-emerald-700">{peso(sales - (todayExp._sum.amount ?? 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <Link href="/admin/orders" className="text-sm font-semibold text-ocean">
              View board
            </Link>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Items</TH>
                <TH>Payment</TH>
                <TH>Status</TH>
                <TH className="text-right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {recent.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <p className="font-semibold">{o.code}</p>
                    <p className="text-[11px] text-navy-400">{formatDistanceToNow(o.createdAt, { addSuffix: true })}</p>
                  </TD>
                  <TD className="max-w-[160px] truncate">{o.customer?.name ?? o.walkInName ?? "Walk-in"}</TD>
                  <TD className="max-w-[200px] truncate text-navy-500">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</TD>
                  <TD>
                    <PaymentLogo method={o.paymentMethod} className="h-7 px-2 text-[11px]" />
                  </TD>
                  <TD>
                    <StatusBadge status={o.status} />
                  </TD>
                  <TD className="text-right font-bold">{peso(o.total)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" /> Verify payments
              </CardTitle>
              <Badge variant="warning">{verify.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {verify.length === 0 && <p className="rounded-2xl bg-mist p-4 text-sm text-navy-400">No GCash/Maya proofs waiting. 🎉</p>}
              {verify.map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  {o.paymentProofUrl && (
                    <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-mist ring-1 ring-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.paymentProofUrl} alt="proof" className="h-full w-full object-cover" />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {o.code} · {o.customer?.name}
                    </p>
                    <p className="text-xs text-navy-400">
                      {o.paymentMethod} · {peso(o.total)}
                    </p>
                  </div>
                  <VerifyPaymentButtons orderId={o.id} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" /> Low stock
              </CardTitle>
              <Link href="/admin/inventory" className="text-sm font-semibold text-ocean">
                Inventory
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {low.length === 0 && (
                <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  <PackageOpen className="h-4 w-4" /> Everything is above threshold.
                </p>
              )}
              {low.map((l) => (
                <div key={l.id} className="rounded-2xl bg-rose-50/60 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{l.name}</span>
                    <span className="font-bold text-rose-600">
                      {l.qty} {l.unit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(100, (l.qty / l.min) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-navy-400">Reorder below {l.min}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riders · live map</CardTitle>
          <Link href="/admin/riders" className="text-sm font-semibold text-ocean">
            Manage riders
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="h-80">
            <RidersMap store={{ lat: settings.lat, lng: settings.lng }} riders={riders.map((r) => ({ id: r.id, name: r.user.name, lat: r.lat, lng: r.lng, isOnline: r.isOnline }))} />
          </div>
          <ul className="space-y-2">
            {riders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                <span className={`h-2.5 w-2.5 rounded-full ${r.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.user.name}</p>
                  <p className="text-xs text-navy-400">
                    {r.area} · {r._count.orders} on the road
                  </p>
                </div>
                <Badge variant={r.isOnline ? "success" : "outline"}>{r.isOnline ? "Online" : "Offline"}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
