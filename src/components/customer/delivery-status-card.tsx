"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Package, Phone, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottleSilhouette } from "@/components/brand/product-image";
import { useLiveUpdates } from "@/hooks/use-realtime";
import type { SerializedOrder } from "@/lib/serialize";
import { cn, firstName } from "@/lib/utils";

export function DeliveryStatusCard({ order }: { order: SerializedOrder | null }) {
  const t = useTranslations("dashboard");
  const f = useFormatter();
  const router = useRouter();
  useLiveUpdates(order ? `order:${order.id}` : null, () => router.refresh(), 10000);

  const fmt = (d: string | null) => (d ? f.dateTime(new Date(d), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null);
  const steps = order
    ? [
        { label: t("orderReceived"), sub: fmt(order.createdAt), done: true, icon: Check },
        {
          label: t("onTheWay"),
          sub: order.outForDeliveryAt ? `${fmt(order.outForDeliveryAt)}` : t("waiting"),
          extra: order.status === "OUT_FOR_DELIVERY" ? t("courierNearby") : null,
          done: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status),
          active: order.status === "OUT_FOR_DELIVERY",
          icon: Truck,
        },
        { label: t("delivered"), sub: order.deliveredAt ? fmt(order.deliveredAt) : t("waiting"), done: order.status === "DELIVERED", icon: Package },
      ]
    : [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("deliveryStatus")}</CardTitle>
        {order && (
          <Link href={`/tracking?order=${order.id}`} className="text-sm font-semibold text-ocean hover:underline">
            {order.code}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {!order ? (
          <div className="flex items-center gap-4 rounded-2xl bg-mist p-5">
            <div className="relative h-24 w-16 shrink-0">
              <BottleSilhouette tone="soft" className="absolute inset-0 animate-float-soft" />
            </div>
            <div>
              <p className="font-semibold">{t("noActive")}</p>
              <Button size="sm" className="mt-3" asChild>
                <Link href="/order">{t("quickOrder")}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <ol className="relative space-y-5">
              {steps.map((s, i) => (
                <li key={i} className="relative flex gap-3">
                  {i < steps.length - 1 && <span className={cn("absolute left-[13px] top-8 h-[calc(100%-4px)] w-0.5", s.done && steps[i + 1]!.done ? "bg-emerald-400" : "bg-slate-200")} />}
                  <span
                    className={cn(
                      "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-white",
                      s.done ? (s.active ? "bg-ocean text-white" : "bg-emerald-500 text-white") : "border-2 border-slate-200 bg-white text-slate-300"
                    )}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.active && <span className="absolute inset-0 animate-ping rounded-full bg-ocean/40" />}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", !s.done && "text-navy-400")}>{s.label}</p>
                    <p className="text-xs text-navy-400">{s.sub}</p>
                    {"extra" in s && s.extra && <p className="text-xs font-medium text-ocean">{s.extra}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="relative w-36 sm:w-44">
              <div className="relative mx-auto h-32 w-32 sm:h-36 sm:w-36">
                <Image src={"/brand/courier.svg"} alt="Courier" fill className="object-contain" />
              </div>
              {order.rider && (
                <div className="absolute -bottom-1 left-0 right-0 flex items-center justify-between gap-2 rounded-2xl bg-white/95 p-2.5 shadow-lift ring-1 ring-slate-100 backdrop-blur">
                  <div className="min-w-0">
                    <p className="text-[11px] text-navy-400">{t("courier")}</p>
                    <p className="truncate text-sm font-bold">{firstName(order.rider.name)}</p>
                  </div>
                  <a href={`tel:${order.rider.phone}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean text-white shadow-glow" aria-label="Call courier">
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
