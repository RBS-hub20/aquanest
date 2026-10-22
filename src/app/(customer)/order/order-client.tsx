"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeftRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Gift,
  Info,
  Loader2,
  MapPin,
  PackagePlus,
  RotateCcw,
  ShoppingCart,
  Tag,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/brand/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { Droplet } from "@/components/brand/water-decor";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { QtyStepper } from "@/components/shared/qty-stepper";
import { ImageUpload } from "@/components/shared/image-upload";
import { useCart } from "@/components/shared/cart-provider";
import { FadeIn } from "@/components/shared/reveal";
import { computeCart, type OrderTypeKey, type PromoInput } from "@/lib/pricing";
import type { OrderingContext } from "@/lib/customer";
import { cn, manilaDateKey, peso } from "@/lib/utils";
import { placeOrderAction, validatePromoAction } from "../actions";

const ORDER_TYPES: { key: OrderTypeKey; icon: typeof Zap }[] = [
  { key: "REFILL", icon: RotateCcw },
  { key: "NEW_GALLON", icon: PackagePlus },
  { key: "BORROW", icon: ArrowLeftRight },
  { key: "RETURN", icon: Undo2 },
];
const WATER = ["PURIFIED", "MINERAL", "ALKALINE"] as const;

export function OrderClient({
  ctx,
  preferredPayment,
  initialSize,
  jumpToCheckout,
}: {
  ctx: OrderingContext;
  preferredPayment: string;
  initialSize?: string;
  jumpToCheckout?: boolean;
}) {
  const t = useTranslations("order");
  const te = useTranslations("enums");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const cart = useCart();
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [orderType, setOrderType] = useState<OrderTypeKey>("REFILL");
  const [water, setWater] = useState<(typeof WATER)[number]>("PURIFIED");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [addressId, setAddressId] = useState(ctx.addresses[0]?.id ?? "");
  const [asap, setAsap] = useState(ctx.settings.isOpen);
  const [date, setDate] = useState(() => manilaDateKey(new Date(Date.now() + (ctx.settings.isOpen ? 0 : 86400000))));
  const [slot, setSlot] = useState(ctx.settings.timeSlots[1] ?? ctx.settings.timeSlots[0] ?? "");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"COD" | "GCASH" | "MAYA">(["COD", "GCASH", "MAYA"].includes(preferredPayment) ? (preferredPayment as "COD") : "COD");
  const [proof, setProof] = useState<File | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<(PromoInput & { description?: string | null }) | null>(null);
  const [useFree, setUseFree] = useState(false);
  const [pending, start] = useTransition();
  const [success, setSuccess] = useState<{ id: string; code: string } | null>(null);

  useEffect(() => {
    if (jumpToCheckout) setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    if (initialSize === "BOTTLED_CASE") document.getElementById("size-grid")?.scrollIntoView({ behavior: "smooth" });
  }, [jumpToCheckout, initialSize]);

  const productsById = useMemo(() => new Map(ctx.products.map((p) => [p.id, p])), [ctx.products]);
  const visible = ctx.products.filter((p) => {
    if (orderType !== "REFILL" && !p.isReturnable) return false;
    if (initialSize === "BOTTLED_CASE" && !p.isReturnable) return true;
    return p.waterType === water || (!p.isReturnable && water === "PURIFIED");
  });
  const address = ctx.addresses.find((a) => a.id === addressId);
  const lines = cart.items.filter((i) => productsById.has(i.productId)).map((i) => ({ product: productsById.get(i.productId)!, orderType: i.orderType, quantity: i.quantity }));
  const totals = computeCart(lines, {
    settings: ctx.settings,
    holdings: ctx.holdings,
    distanceKm: address?.distanceKm ?? 0,
    promo,
    freeRefillsToUse: useFree ? ctx.freeRefills : 0,
  });
  const name = (id: string) => {
    const p = productsById.get(id);
    return locale === "tl" && p?.nameTl ? p.nameTl : p?.name ?? "";
  };

  const addToCart = (productId: string) => {
    const q = qty[productId] ?? 1;
    cart.add({ productId, orderType, quantity: q });
    toast.success(`${q} × ${name(productId)}`, { description: te(`orderType.${orderType}`) });
    setQty((s) => ({ ...s, [productId]: 1 }));
  };

  const applyPromo = () =>
    start(async () => {
      const r = await validatePromoAction(promoInput);
      if (!r.ok) {
        setPromo(null);
        return void toast.error(t("promoInvalid"));
      }
      setPromo(r.data);
      toast.success(t("promoApplied"), { description: r.data.description ?? r.data.code });
    });

  const place = () => {
    if (!lines.length) return toast.error(t("emptyCart"));
    if (!address) return toast.error(t("deliverTo"));
    if (payment !== "COD" && !proof) return toast.error(t("uploadProof"));
    if (address.distanceKm > ctx.settings.maxDeliveryKm) return toast.error(`Max ${ctx.settings.maxDeliveryKm} km`);
    const fd = new FormData();
    fd.set("items", JSON.stringify(cart.items.filter((i) => productsById.has(i.productId))));
    fd.set("addressId", address.id);
    fd.set("paymentMethod", payment);
    fd.set("isAsap", String(asap));
    fd.set("date", date);
    fd.set("timeSlot", slot);
    fd.set("notes", notes);
    if (promo && !totals.promoError) fd.set("promoCode", promo.code);
    fd.set("freeRefills", String(totals.freeRefillsUsed));
    if (proof) fd.set("proof", proof);
    start(async () => {
      const r = await placeOrderAction(fd);
      if (!r.ok) return void toast.error(r.error);
      cart.clear();
      setSuccess(r.data!);
      router.refresh();
    });
  };

  const qrValue = (method: "GCASH" | "MAYA") =>
    `${method === "GCASH" ? "GCASH" : "MAYA"}|${method === "GCASH" ? ctx.settings.gcashNumber : ctx.settings.mayaNumber}|${method === "GCASH" ? ctx.settings.gcashName : ctx.settings.mayaName}|PHP${totals.total.toFixed(2)}`;

  const heldOf = (container: string) => ctx.gallons.find((g) => g.container === container);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
          <p className="text-sm text-navy-400">{t("subtitle")}</p>
        </FadeIn>

        {!ctx.settings.isOpen && (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800 ring-1 ring-amber-100">
            <Info className="h-5 w-5 shrink-0" /> {t("storeClosed")} ({ctx.settings.openTime}–{ctx.settings.closeTime})
          </div>
        )}

        {/* 1. Water */}
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ocean text-xs font-bold text-white">1</span> {t("step1")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>{t("orderType")}</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ORDER_TYPES.map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOrderType(key)}
                      className={cn(
                        "relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition",
                        orderType === key ? "border-ocean bg-ocean-50 ring-4 ring-ocean/10" : "border-slate-100 bg-white hover:border-sky-200"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", orderType === key ? "text-ocean" : "text-navy-400")} />
                      <span className="text-sm font-bold">{te(`orderType.${key}`)}</span>
                      <span className="text-[11px] leading-tight text-navy-400">{te(`orderTypeHint.${key}`)}</span>
                      {orderType === key && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-ocean" />}
                    </button>
                  ))}
                </div>
              </div>

              {orderType !== "RETURN" && (
                <div>
                  <Label>{t("waterType")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {WATER.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWater(w)}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
                          water === w ? "bg-navy text-white ring-navy" : "bg-white text-navy-500 ring-slate-200 hover:ring-sky-300"
                        )}
                      >
                        💧 {te(`waterType.${w}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div id="size-grid">
                <Label>{t("size")}</Label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                  {visible.map((p) => {
                    const held = heldOf(p.container);
                    const unit = orderType === "RETURN" ? 0 : p.price + (orderType === "NEW_GALLON" ? p.containerPrice : 0);
                    return (
                      <motion.div key={p.id} layout className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white p-2.5 transition hover:border-sky-200 hover:shadow-lift">
                        {p.isPopular && <span className="absolute left-3.5 top-3.5 z-10 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">Popular</span>}
                        <span className="absolute right-3.5 top-3.5 z-10 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-ocean ring-1 ring-sky-100 backdrop-blur">{te(`waterType.${p.waterType}`)}</span>
                        <div className="h-40 rounded-xl bg-[radial-gradient(ellipse_at_50%_35%,#FFFFFF_0%,#F0F8FF_60%,#E3F2FC_100%)] px-4 pb-2 pt-7 transition duration-300 group-hover:[&_img]:scale-[1.04]">
                          <ProductImage container={p.container} float sizes="160px" />
                        </div>
                        <p className="mt-2 text-sm font-bold leading-tight">{locale === "tl" && p.nameTl ? p.nameTl : p.name}</p>
                        <p className="text-[11px] text-navy-400">{p.sizeLabel}</p>
                        {p.isReturnable && held && (
                          <span className="mt-1 w-fit rounded-md bg-ocean-50 px-1.5 py-0.5 text-[10px] font-semibold text-ocean">
                            {t("withYou", { count: held.owned + held.borrowed })}
                          </span>
                        )}
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-lg font-extrabold">{orderType === "RETURN" ? `−${peso(p.depositPrice)}` : peso(unit)}</span>
                          {orderType === "BORROW" && <span className="text-[10px] text-navy-400">+{peso(p.depositPrice)} dep.</span>}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QtyStepper size="sm" min={1} value={qty[p.id] ?? 1} onChange={(v) => setQty((s) => ({ ...s, [p.id]: v }))} />
                          <Button size="icon-sm" onClick={() => addToCart(p.id)} aria-label={t("addToCart")}>
                            <ShoppingCart />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 2. Delivery */}
        <FadeIn delay={0.1}>
          <div ref={checkoutRef} className="scroll-mt-24" />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ocean text-xs font-bold text-white">2</span> {t("step2")}
              </CardTitle>
              <Link href="/addresses" className="text-sm font-semibold text-ocean hover:underline">
                {t("manageAddresses")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>{t("deliverTo")}</Label>
                {ctx.addresses.length === 0 ? (
                  <Button asChild variant="secondary" className="w-full">
                    <Link href="/addresses">
                      <MapPin /> {tc("add")} address
                    </Link>
                  </Button>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ctx.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAddressId(a.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition",
                          addressId === a.id ? "border-ocean bg-ocean-50 ring-4 ring-ocean/10" : "border-slate-100 hover:border-sky-200"
                        )}
                      >
                        <MapPin className={cn("mt-0.5 h-5 w-5 shrink-0", addressId === a.id ? "text-ocean" : "text-navy-400")} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            {a.label} {a.isPrimary && <Badge variant="success">{tc("primary")}</Badge>}
                          </p>
                          <p className="truncate text-xs text-navy-500">
                            {a.line1}, {a.barangay}, {a.city}
                          </p>
                          <p className="text-[11px] text-navy-400">{t("distance", { km: a.distanceKm })}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>{t("schedule")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!ctx.settings.isOpen}
                    onClick={() => setAsap(true)}
                    className={cn("flex items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-50", asap ? "border-ocean bg-ocean-50 ring-4 ring-ocean/10" : "border-slate-100")}
                  >
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span>
                      <span className="block text-sm font-bold">{t("asap")}</span>
                      <span className="block text-[11px] text-navy-400">{t("asapHint")}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsap(false)}
                    className={cn("flex items-center gap-3 rounded-2xl border p-3.5 text-left transition", !asap ? "border-ocean bg-ocean-50 ring-4 ring-ocean/10" : "border-slate-100")}
                  >
                    <CalendarClock className="h-5 w-5 text-ocean" />
                    <span className="text-sm font-bold">{t("pickDate")}</span>
                  </button>
                </div>
                <AnimatePresence>
                  {!asap && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
                        <div>
                          <Label htmlFor="date">{t("date")}</Label>
                          <Input id="date" type="date" min={manilaDateKey()} value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div>
                          <Label>{t("timeSlot")}</Label>
                          <div className="flex flex-wrap gap-2">
                            {ctx.settings.timeSlots.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSlot(s)}
                                className={cn("rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition", slot === s ? "bg-ocean text-white ring-ocean" : "bg-white ring-slate-200 hover:ring-sky-300")}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <Label htmlFor="notes">
                  {t("notes")} <span className="font-normal text-navy-400">({tc("optional")})</span>
                </Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} maxLength={500} />
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 3. Payment */}
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ocean text-xs font-bold text-white">3</span> {t("step3")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["COD", "GCASH", "MAYA"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayment(m)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition",
                      payment === m ? "border-ocean bg-ocean-50 ring-4 ring-ocean/10" : "border-slate-100 hover:border-sky-200"
                    )}
                  >
                    <PaymentLogo method={m} className="h-9 text-xs" />
                    <span className="text-center text-[11px] font-semibold text-navy-500">{te(`payment.${m}`)}</span>
                    {payment === m && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-ocean" />}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {payment !== "COD" && (
                  <motion.div key={payment} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-4 rounded-2xl bg-mist p-4 sm:grid-cols-[180px_1fr]">
                    <div className="mx-auto rounded-2xl bg-white p-3 shadow-soft">
                      {(payment === "GCASH" ? ctx.settings.gcashQrUrl : ctx.settings.mayaQrUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(payment === "GCASH" ? ctx.settings.gcashQrUrl : ctx.settings.mayaQrUrl)!} alt={`${payment} QR`} className="h-40 w-40 object-contain" />
                      ) : (
                        <QRCodeSVG value={qrValue(payment)} size={156} fgColor={payment === "GCASH" ? "#0B5AD8" : "#0E0E0E"} imageSettings={{ src: "/brand/logo-icon.png", height: 30, width: 34, excavate: true }} />
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-lg font-extrabold">{t("scanToPay", { amount: peso(totals.total) })}</p>
                      <div className="text-sm">
                        <p className="text-navy-400">{t("accountName")}</p>
                        <p className="font-semibold">{payment === "GCASH" ? ctx.settings.gcashName : ctx.settings.mayaName}</p>
                        <p className="font-mono font-semibold text-ocean">{payment === "GCASH" ? ctx.settings.gcashNumber : ctx.settings.mayaNumber}</p>
                      </div>
                      <ImageUpload value={proof} onChange={setProof} label={proof ? t("proofUploaded") : t("uploadProof")} hint="PNG / JPG · max 6MB" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <FadeIn delay={0.1}>
          <Card className="overflow-hidden">
            <div className="relative bg-navy-gradient px-5 py-4 text-white">
              <Droplet className="absolute -right-2 -top-3 h-20 w-16 opacity-30" />
              <p className="flex items-center gap-2 font-bold">
                <ShoppingCart className="h-5 w-5" /> {t("cart")} <span className="rounded-full bg-white/20 px-2 text-xs">{cart.count}</span>
              </p>
            </div>
            <CardContent className="space-y-4 pt-4">
              {totals.lines.length === 0 ? (
                <EmptyState size="sm" title={t("emptyCart")} body={t("emptyCartBody")} />
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {totals.lines.map((l) => {
                      const p = productsById.get(l.productId)!;
                      return (
                        <motion.li key={`${l.productId}-${l.orderType}`} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="rounded-2xl border border-slate-100 p-3">
                          <div className="flex gap-3">
                            <div className="h-14 w-12 shrink-0 rounded-xl bg-mist p-1">
                              <ProductImage container={p.container} ground={false} sizes="48px" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">{name(l.productId)}</p>
                              <p className="text-[11px] text-navy-400">
                                {te(`orderType.${l.orderType}`)} · {peso(l.unitPrice + l.containerPrice)}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <QtyStepper size="sm" value={l.quantity} onChange={(v) => cart.setQty(l.productId, l.orderType, v)} />
                                <button onClick={() => cart.remove(l.productId, l.orderType)} className="text-slate-400 hover:text-rose-500" aria-label="Remove">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm font-bold">{peso(l.lineTotal)}</p>
                          </div>
                          {l.note === "AUTO_DEPOSIT" && (
                            <p className="mt-2 flex gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                              <Info className="mt-0.5 h-3 w-3 shrink-0" />
                              {t("autoDeposit", { have: Math.max(0, l.quantity - l.borrowQty), fee: p.depositPrice })}
                            </p>
                          )}
                          {l.note === "RETURN_LIMIT" && <p className="mt-2 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">{t("returnLimit")}</p>}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}

              {/* Promo */}
              <div>
                <Label htmlFor="promo" className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-ocean" /> {t("promoCode")}
                </Label>
                <div className="flex gap-2">
                  <Input id="promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="WELCOME20" className="uppercase" />
                  <Button variant="secondary" onClick={applyPromo} disabled={!promoInput || pending}>
                    {t("apply")}
                  </Button>
                </div>
                {promo && totals.promoError === "MIN_ORDER" && <p className="mt-1 text-xs text-amber-700">{t("promoMin", { min: peso(promo.minOrder) })}</p>}
                {promo && !totals.promoError && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {promo.code} — {promo.type === "PERCENT" ? `${promo.value}%` : peso(promo.value)} off
                  </p>
                )}
              </div>

              {ctx.freeRefills > 0 && (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-3 ring-1 ring-amber-100">
                  <Gift className="h-5 w-5 text-amber-600" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-amber-900">{t("freeRefills")}</span>
                    <span className="block text-[11px] text-amber-700">{t("freeRefillsAvailable", { count: ctx.freeRefills })}</span>
                  </span>
                  <Switch checked={useFree} onCheckedChange={setUseFree} />
                </label>
              )}

              <dl className="space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm">
                <Row label={tc("subtotal")} value={peso(totals.subtotal)} />
                {totals.depositTotal !== 0 && <Row label={t("deposit")} value={peso(totals.depositTotal)} />}
                <Row
                  label={
                    <span>
                      {t("deliveryFee")} {address && <span className="text-[11px] text-navy-400">({address.distanceKm} km)</span>}
                    </span>
                  }
                  value={totals.deliveryFee === 0 ? <span className="font-bold text-emerald-600">{t("free")}</span> : peso(totals.deliveryFee)}
                />
                {totals.discount > 0 && <Row label={t("discount")} value={<span className="text-emerald-600">−{peso(totals.discount)}</span>} />}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <dt className="font-bold">{tc("total")}</dt>
                  <dd className="text-2xl font-extrabold text-ocean">{peso(totals.total)}</dd>
                </div>
                {!totals.freeDelivery && <p className="text-[11px] text-navy-400">{t("freeDeliveryHint", { amount: peso(ctx.settings.freeDeliveryThreshold) })}</p>}
              </dl>

              <Button size="lg" className="w-full" onClick={place} disabled={pending || totals.lines.length === 0}>
                {pending ? <Loader2 className="animate-spin" /> : <Check />}
                {pending ? t("placing") : t("placeOrder", { total: peso(totals.total) })}
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </aside>

      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)}>
        <DialogContent className="text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="relative mx-auto mt-2 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[0_20px_40px_-12px_rgb(16_185_129/0.6)]">
            <Check className="h-12 w-12" strokeWidth={3} />
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="absolute"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: Math.cos((i / 5) * Math.PI * 2) * 70, y: Math.sin((i / 5) * Math.PI * 2) * 70, opacity: 0 }}
                transition={{ duration: 1.1, delay: 0.15 }}
              >
                <Droplet className="h-6 w-5" />
              </motion.span>
            ))}
          </motion.div>
          <DialogTitle className="mt-2 text-2xl">Salamat po! 💧</DialogTitle>
          <p className="text-sm text-navy-500">{t("success")}</p>
          <p className="font-mono text-lg font-bold text-ocean">{success?.code}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">{tc("back")}</Link>
            </Button>
            <Button asChild>
              <Link href={`/tracking?order=${success?.id}`}>Track order</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-navy-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
