"use client";
import Image from "next/image";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Bike, Check, ClipboardCheck, Download, FlaskConical, Loader2, MapPin, MessageSquare, Phone, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapView, type MapMarker } from "@/components/maps/map-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { RepeatOrderButton } from "@/components/customer/widgets";
import { useLiveUpdates } from "@/hooks/use-realtime";
import { useRiderPosition } from "@/hooks/use-rider-position";
import { downloadInvoice } from "@/lib/invoice";
import type { SerializedOrder } from "@/lib/serialize";
import { cn, displayPhone, firstName, peso } from "@/lib/utils";
import { cancelOrderAction } from "@/app/(customer)/actions";

export interface StoreInfo {
  lat: number;
  lng: number;
  name: string;
  address: string;
  phone: string;
  website: string;
}

export function OrderTracker({ order, store, compact = false }: { order: SerializedOrder; store: StoreInfo; compact?: boolean }) {
  const t = useTranslations("tracking");
  const to = useTranslations("orders");
  const te = useTranslations("enums");
  const tc = useTranslations("common");
  const f = useFormatter();
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"].includes(order.status);
  useLiveUpdates(active ? `order:${order.id}` : null, () => router.refresh(), 6000);

  const dest = order.lat != null && order.lng != null ? { lat: order.lat, lng: order.lng } : null;
  const { pos, etaMin, progress, live } = useRiderPosition({
    status: order.status,
    outForDeliveryAt: order.outForDeliveryAt,
    distanceKm: order.distanceKm,
    dest,
    store,
    rider: order.rider,
  });

  const markers: MapMarker[] = [{ id: "store", kind: "store", lat: store.lat, lng: store.lng }];
  if (dest) markers.push({ id: "home", kind: "home", ...dest });
  if (pos && order.status === "OUT_FOR_DELIVERY") markers.push({ id: "rider", kind: "rider", ...pos });

  const time = (d: string | null) => (d ? f.dateTime(new Date(d), { hour: "numeric", minute: "2-digit" }) : null);
  const idx = { PENDING: 0, PREPARING: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3, CANCELLED: -1 }[order.status];
  const steps = [
    { label: t("stepPending"), at: time(order.createdAt), icon: ClipboardCheck },
    { label: t("stepPreparing"), at: time(order.preparingAt), icon: FlaskConical },
    { label: t("stepOut"), at: time(order.outForDeliveryAt), icon: Bike },
    { label: t("stepDelivered"), at: time(order.deliveredAt), icon: Check },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* Map */}
        {dest && order.status !== "CANCELLED" && (
          <Card className="overflow-hidden p-0">
            <div className="relative h-[320px] sm:h-[400px]">
              <MapView center={pos ?? dest} zoom={14} markers={markers} path={pos ? [pos, dest] : [store, dest]} fitToMarkers className="rounded-none" />
              <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start justify-between gap-2">
                <div className="glass pointer-events-auto rounded-2xl px-4 py-2.5 shadow-lift">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{order.code}</p>
                  <StatusBadge status={order.status} className="mt-1" />
                </div>
                {order.status === "OUT_FOR_DELIVERY" && (
                  <div className="glass pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lift">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </span>
                    <span className="text-xs font-bold text-rose-600">{live ? "GPS" : t("live")}</span>
                    <span className="text-sm font-extrabold">{etaMin && etaMin > 1 ? t("eta", { min: etaMin }) : t("arrived")}</span>
                  </div>
                )}
              </div>
              {order.status === "OUT_FOR_DELIVERY" && (
                <div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl bg-white/95 p-3 shadow-lift backdrop-blur">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-ocean to-aqua" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ duration: 1 }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-navy-400">
                    <span>AquaNest Station</span>
                    <span>{order.addressText?.split(",")[0]}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Stepper */}
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <span className="text-xs text-navy-400">{to("placedOn", { date: f.dateTime(new Date(order.createdAt), { dateStyle: "medium" }) })}</span>
          </CardHeader>
          <CardContent>
            {order.status === "CANCELLED" ? (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-bold">{te("status.CANCELLED")}</p>
                  {order.cancelReason && <p className="text-sm">{order.cancelReason}</p>}
                </div>
              </div>
            ) : (
              <ol className="grid grid-cols-4 gap-2">
                {steps.map((s, i) => {
                  const done = i <= idx;
                  const current = i === idx && order.status !== "DELIVERED";
                  return (
                    <li key={i} className="relative flex flex-col items-center text-center">
                      {i < steps.length - 1 && (
                        <span className="absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-5 h-1 rounded-full bg-slate-100">
                          <motion.span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" initial={{ width: 0 }} animate={{ width: i < idx ? "100%" : "0%" }} transition={{ duration: 0.6, delay: i * 0.15 }} />
                        </span>
                      )}
                      <span
                        className={cn(
                          "relative z-10 grid h-10 w-10 place-items-center rounded-2xl transition",
                          done ? (current ? "bg-ocean text-white shadow-glow" : "bg-emerald-500 text-white") : "bg-slate-100 text-slate-400"
                        )}
                      >
                        <s.icon className="h-5 w-5" />
                        {current && <span className="absolute inset-0 animate-ping rounded-2xl bg-ocean/30" />}
                      </span>
                      <p className={cn("mt-2 text-[11px] font-bold leading-tight sm:text-xs", !done && "text-navy-400")}>{s.label}</p>
                      <p className="text-[10px] text-navy-400">{s.at ?? "—"}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Proofs */}
        {(order.deliveryPhotoUrl || order.paymentProofUrl) && !compact && (
          <div className="grid gap-4 sm:grid-cols-2">
            {order.deliveryPhotoUrl && (
              <Card className="overflow-hidden">
                <p className="px-4 pt-4 text-sm font-bold">{t("proof")}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.deliveryPhotoUrl} alt="Delivery proof" className="mt-3 h-52 w-full object-cover" />
              </Card>
            )}
            {order.paymentProofUrl && (
              <Card className="overflow-hidden">
                <p className="px-4 pt-4 text-sm font-bold">{t("paymentProof")}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.paymentProofUrl} alt="Payment proof" className="mt-3 h-52 w-full bg-mist object-contain" />
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Rider */}
        <Card className="overflow-hidden">
          <div className="relative bg-navy-gradient p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{t("rider")}</p>
            {order.rider ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white ring-2 ring-white/40">
                  <Image src={order.rider.photoUrl ?? "/brand/rider-ivan.svg"} alt={order.rider.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold">Kuya {firstName(order.rider.name)}</p>
                  <p className="flex items-center gap-1 text-xs text-white/75">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" /> {order.rider.rating.toFixed(1)} · {order.rider.vehicle} {order.rider.plateNumber && `· ${order.rider.plateNumber}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("awaiting")}
              </p>
            )}
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-aqua/20 blur-xl" />
          </div>
          {order.rider && (
            <div className="grid grid-cols-2 gap-2 p-4">
              <Button asChild>
                <a href={`tel:${order.rider.phone}`}>
                  <Phone /> {t("callRider")}
                </a>
              </Button>
              <Button variant="secondary" asChild>
                <a href={`sms:${order.rider.phone}`}>
                  <MessageSquare /> SMS
                </a>
              </Button>
              <p className="col-span-2 text-center text-xs text-navy-400">{displayPhone(order.rider.phone)}</p>
            </div>
          )}
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{to("details")}</CardTitle>
            <PaymentLogo method={order.paymentMethod} className="h-8 text-xs" />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">
                      {i.quantity} × {i.productName}
                    </span>
                    <span className="block text-[11px] text-navy-400">{te(`orderType.${i.orderType}`)}</span>
                  </span>
                  <span className="font-semibold">{peso(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-dashed border-slate-200 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">{tc("subtotal")}</dt>
                <dd>{peso(order.subtotal)}</dd>
              </div>
              {order.depositTotal !== 0 && (
                <div className="flex justify-between">
                  <dt className="text-navy-500">Deposit</dt>
                  <dd>{peso(order.depositTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-navy-500">Delivery</dt>
                <dd>{order.deliveryFee ? peso(order.deliveryFee) : <span className="font-semibold text-emerald-600">FREE</span>}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd>−{peso(order.discount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <dt className="font-bold">{tc("total")}</dt>
                <dd className="text-xl font-extrabold text-ocean">{peso(order.total)}</dd>
              </div>
              <div className="flex justify-end">
                <Badge variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FOR_VERIFICATION" ? "warning" : "outline"}>{te(`paymentStatus.${order.paymentStatus}`)}</Badge>
              </div>
            </dl>
            {order.addressText && (
              <p className="flex gap-2 rounded-2xl bg-mist p-3 text-xs text-navy-500">
                <MapPin className="h-4 w-4 shrink-0 text-ocean" /> {order.addressText}
              </p>
            )}
            {order.notes && <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">📝 {order.notes}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => downloadInvoice(order, store).catch(() => toast.error("Could not generate PDF"))}>
                <Download /> {to("invoice")}
              </Button>
              <RepeatOrderButton variant="secondary" items={order.items.map((i) => ({ productId: i.productId, orderType: i.orderType, quantity: i.quantity }))} />
              {order.status === "PENDING" && (
                <Button
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 sm:col-span-2"
                  disabled={pending}
                  onClick={() =>
                    confirm(to("cancelConfirm")) &&
                    start(async () => {
                      const r = await cancelOrderAction(order.id);
                      if (!r.ok) return void toast.error(r.error);
                      toast.success(to("cancelled"));
                      router.refresh();
                    })
                  }
                >
                  <XCircle /> {to("cancel")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
