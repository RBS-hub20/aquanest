"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Banknote, Bike, CheckCircle2, Loader2, MapPin, Navigation, Package, Phone, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { ImageUpload } from "@/components/shared/image-upload";
import { EmptyState } from "@/components/shared/empty-state";
import { googleMapsDirectionsUrl } from "@/lib/geo";
import type { SerializedOrder } from "@/lib/serialize";
import { cn, displayPhone, peso } from "@/lib/utils";
import { completeDeliveryAction, startDeliveryAction } from "./actions";

export function DeliveriesClient({ orders, store }: { orders: SerializedOrder[]; store: { lat: number; lng: number } }) {
  const t = useTranslations("rider");
  const te = useTranslations("enums");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [completing, setCompleting] = useState<SerializedOrder | null>(null);
  const [amount, setAmount] = useState("");
  const [via, setVia] = useState<"CASH" | "GCASH" | "MAYA">("CASH");
  const [photo, setPhoto] = useState<File | null>(null);

  const todo = orders.filter((o) => o.status !== "DELIVERED");
  const done = orders.filter((o) => o.status === "DELIVERED");
  const codDue = todo.filter((o) => o.paymentStatus !== "PAID").reduce((s, o) => s + o.total, 0);

  const openComplete = (o: SerializedOrder) => {
    setCompleting(o);
    setAmount(o.paymentStatus === "PAID" ? "0" : String(o.total));
    setVia(o.paymentMethod === "GCASH" || o.paymentMethod === "MAYA" ? o.paymentMethod : "CASH");
    setPhoto(null);
  };

  const complete = () => {
    if (!completing) return;
    const fd = new FormData();
    fd.set("orderId", completing.id);
    fd.set("collectedAmount", amount || "0");
    fd.set("collectedVia", via);
    if (photo) fd.set("photo", photo);
    start(async () => {
      const r = await completeDeliveryAction(fd);
      if (!r.ok) return void toast.error(r.error);
      toast.success(t("deliveredToast"));
      setCompleting(null);
      router.refresh();
    });
  };

  const short = completing && completing.paymentStatus !== "PAID" ? Math.max(0, completing.total - Number(amount || 0)) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          [t("toDeliver"), todo.length, Package],
          [t("delivered"), done.length, CheckCircle2],
          [t("codToCollect"), peso(codDue, { compact: true }), Banknote],
        ].map(([l, v, Icon], i) => {
          const I = Icon as typeof Package;
          return (
            <div key={i} className="rounded-3xl bg-white p-3 text-center shadow-soft ring-1 ring-slate-100">
              <I className="mx-auto h-5 w-5 text-ocean" />
              <p className="mt-1 text-xl font-extrabold">{v as string}</p>
              <p className="text-[11px] text-navy-400">{l as string}</p>
            </div>
          );
        })}
      </div>

      {todo.length === 0 && (
        <div className="rounded-3xl bg-white px-6 shadow-soft">
          <EmptyState title={t("empty")} body={t("emptyBody")} />
        </div>
      )}

      {todo.map((o, i) => (
        <motion.article key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cn("overflow-hidden rounded-3xl bg-white shadow-soft ring-1", o.status === "OUT_FOR_DELIVERY" ? "ring-2 ring-ocean" : "ring-slate-100")}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
              <p className="font-extrabold">{o.code}</p>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div className="space-y-3 p-4">
            <div>
              <p className="text-lg font-bold">{o.customer?.name ?? o.walkInName}</p>
              <p className="flex gap-1.5 text-sm text-navy-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ocean" /> {o.addressText} <span className="shrink-0 text-xs text-navy-400">· {o.distanceKm} km</span>
              </p>
              {o.customer && <p className="mt-1 text-sm text-navy-400">📞 {displayPhone(o.customer.phone)}</p>}
            </div>
            <div className="rounded-2xl bg-mist p-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-navy-400">{t("items")}</p>
              {o.items.map((it) => (
                <p key={it.id} className="text-sm font-semibold">
                  {it.quantity} × {it.productName} <span className="text-xs font-normal text-navy-400">({te(`orderType.${it.orderType}`)})</span>
                </p>
              ))}
            </div>
            {o.notes && (
              <p className="flex gap-1.5 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" /> {o.notes}
              </p>
            )}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
              <PaymentLogo method={o.paymentMethod} className="h-8 text-xs" />
              {o.paymentStatus === "PAID" ? (
                <span className="text-sm font-bold text-emerald-600">✓ {t("paidOnline")}</span>
              ) : (
                <span className="text-right">
                  <span className="block text-[11px] text-navy-400">{t("codToCollect")}</span>
                  <span className="text-2xl font-extrabold text-navy">{peso(o.total)}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" asChild>
                <a href={o.lat != null && o.lng != null ? googleMapsDirectionsUrl({ lat: o.lat, lng: o.lng }, store) : "#"} target="_blank" rel="noreferrer">
                  <Navigation /> {t("navigate")}
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`tel:${o.customer?.phone ?? ""}`}>
                  <Phone /> {t("callCustomer")}
                </a>
              </Button>
              {o.status === "OUT_FOR_DELIVERY" ? (
                <Button size="lg" variant="success" className="col-span-2" onClick={() => openComplete(o)}>
                  <CheckCircle2 /> {t("markDelivered")}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="col-span-2"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await startDeliveryAction(o.id);
                      if (!r.ok) return void toast.error(r.error);
                      toast.success(t("startedToast"));
                      router.refresh();
                    })
                  }
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Bike />} {t("startDelivery")}
                </Button>
              )}
            </div>
          </div>
        </motion.article>
      ))}

      {done.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
          <p className="mb-2 text-sm font-bold">
            {t("delivered")} · {t("today")}
          </p>
          <ul className="divide-y divide-slate-100">
            {done.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-semibold">{o.code}</span> <span className="text-navy-400">· {o.customer?.name}</span>
                </span>
                <span className="font-bold text-emerald-600">
                  {peso(o.collectedAmount)} <span className="text-[10px] text-navy-400">{o.collectedVia}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!completing} onOpenChange={(v) => !v && setCompleting(null)}>
        <DialogContent side="bottom" className="mx-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("confirmDelivery")}</DialogTitle>
            <DialogDescription>
              {completing?.code} · {completing?.customer?.name}
            </DialogDescription>
          </DialogHeader>
          {completing && (
            <div className="space-y-4">
              {completing.paymentStatus === "PAID" ? (
                <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">✓ {t("paidOnline")} — {peso(completing.total)}</p>
              ) : (
                <div className="space-y-3 rounded-2xl bg-mist p-4">
                  <p className="text-sm font-bold">{t("collectPayment")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["CASH", "GCASH", "MAYA"] as const).map((m) => (
                      <button key={m} onClick={() => setVia(m)} className={cn("rounded-2xl border bg-white p-2", via === m ? "border-ocean ring-4 ring-ocean/10" : "border-slate-100")}>
                        <PaymentLogo method={m} className="h-8 w-full justify-center text-xs" />
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="amt">{t("amountCollected")}</Label>
                    <Input id="amt" type="number" inputMode="decimal" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 text-center text-2xl font-extrabold" />
                  </div>
                  {short > 0 && <p className="rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800">⚠️ {t("shortWarning", { amount: peso(short) })}</p>}
                </div>
              )}
              <div>
                <Label>{t("deliveryPhoto")}</Label>
                <ImageUpload value={photo} onChange={setPhoto} label={photo ? t("photoAdded") : t("takePhoto")} capture />
              </div>
              <Button size="xl" variant="success" className="w-full" onClick={complete} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t("confirmDelivery")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
