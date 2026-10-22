"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CalendarDays, CalendarHeart, Loader2, Pencil, Plus, Repeat, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/brand/product-image";
import { QtyStepper } from "@/components/shared/qty-stepper";
import { StatusBadge } from "@/components/shared/status-badge";
import { FadeIn } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { WEEKDAYS, WEEKDAYS_TL } from "@/lib/constants";
import { cn, peso } from "@/lib/utils";
import { deleteSubscriptionAction, saveSubscriptionAction, toggleSubscriptionAction } from "../actions";
import type { OrderStatus } from "@prisma/client";

type Sub = { id?: string; days: number[]; items: { productId: string; quantity: number }[]; timeSlot: string; addressId: string; paymentMethod: "COD" | "GCASH" | "MAYA"; isActive?: boolean };
type Product = { id: string; name: string; price: number; container: "ROUND_19L" | "SLIM_19L" | "GALLON_10L" | "GALLON_6L" | "BOTTLED_CASE"; waterType: string };

export function ScheduleClient({
  subs,
  addresses,
  products,
  timeSlots,
  upcoming,
}: {
  subs: Sub[];
  addresses: { id: string; label: string; line1: string }[];
  products: Product[];
  timeSlots: string[];
  upcoming: { id: string; code: string; status: OrderStatus; date: string; slot: string | null; isAsap: boolean; summary: string; suki: boolean }[];
}) {
  const t = useTranslations("schedule");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const f = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<Sub | null>(null);
  const [pending, start] = useTransition();
  const days = locale === "tl" ? WEEKDAYS_TL : WEEKDAYS;
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const subTotal = (s: Sub) => s.items.reduce((sum, i) => sum + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.quantity, 0);

  const blank = (): Sub => ({ days: [1, 3, 5], items: [{ productId: products[0]?.id ?? "", quantity: 2 }], timeSlot: timeSlots[1] ?? timeSlots[0] ?? "", addressId: addresses[0]?.id ?? "", paymentMethod: "COD" });

  const save = () =>
    start(async () => {
      if (!editing) return;
      const r = await saveSubscriptionAction({ ...editing, items: editing.items.filter((i) => i.productId && i.quantity > 0) });
      if (!r.ok) return void toast.error(r.error);
      toast.success(t("created"));
      setEditing(null);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <FadeIn className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
          <p className="text-sm text-navy-400">{t("subtitle")}</p>
        </div>
        <Button onClick={() => (addresses.length ? setEditing(blank()) : router.push("/addresses"))}>
          <Plus /> {t("new")}
        </Button>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {subs.length === 0 && (
            <Card className="p-6">
              <EmptyState
                title={t("empty")}
                body={t("emptyBody")}
                action={
                  <Button onClick={() => (addresses.length ? setEditing(blank()) : router.push("/addresses"))}>
                    <Repeat /> Suki Mode
                  </Button>
                }
              />
            </Card>
          )}
          {subs.map((s, i) => (
            <FadeIn key={s.id} delay={i * 0.05}>
              <Card className={cn("overflow-hidden", !s.isActive && "opacity-70")}>
                <div className="flex items-center justify-between bg-gradient-to-r from-ocean to-aqua px-5 py-3 text-white">
                  <p className="flex items-center gap-2 font-bold">
                    <Repeat className="h-4 w-4" /> Suki Mode · {t("every", { days: s.days.map((d) => days[d]).join("/") })}
                  </p>
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    {s.isActive ? t("active") : t("paused")}
                    <Switch
                      checked={!!s.isActive}
                      onCheckedChange={(v) =>
                        start(async () => {
                          await toggleSubscriptionAction(s.id!, v);
                          router.refresh();
                        })
                      }
                      className="data-[state=checked]:bg-white/40"
                    />
                  </label>
                </div>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex gap-1.5">
                    {days.map((d, idx) => (
                      <span key={d} className={cn("grid h-10 flex-1 place-items-center rounded-xl text-xs font-bold", s.days.includes(idx) ? "bg-ocean text-white shadow-glow" : "bg-mist text-navy-400")}>
                        {d}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-2">
                    {s.items.map((it) => {
                      const p = products.find((x) => x.id === it.productId);
                      return (
                        <li key={it.productId} className="flex items-center gap-3 rounded-2xl bg-mist/60 p-2.5">
                          <span className="h-11 w-10 shrink-0 rounded-lg bg-white p-1">
                            <ProductImage container={p?.container} ground={false} sizes="40px" />
                          </span>
                          <span className="flex-1 text-sm font-semibold">{productName(it.productId)}</span>
                          <span className="text-sm font-bold">× {it.quantity}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-slate-100 p-2.5">
                      <p className="text-navy-400">{t("timeSlot")}</p>
                      <p className="font-bold">{s.timeSlot}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 p-2.5">
                      <p className="text-navy-400">{t("payment")}</p>
                      <p className="font-bold">{te(`payment.${s.paymentMethod}`)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 p-2.5">
                      <p className="text-navy-400">~ / delivery</p>
                      <p className="font-bold">{peso(subTotal(s))}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() =>
                        confirm(`${tc("delete")}?`) &&
                        start(async () => {
                          await deleteSubscriptionAction(s.id!);
                          toast.success(t("deleted"));
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 /> {tc("delete")}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                      <Pencil /> {tc("edit")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-ocean" /> {t("upcoming")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="rounded-2xl bg-mist p-4 text-sm text-navy-400">—</p>
              ) : (
                <ol className="space-y-3">
                  {upcoming.map((o) => (
                    <li key={o.id}>
                      <Link href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-sky-200">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ocean-50 text-center leading-none text-ocean">
                          {o.isAsap ? (
                            <Zap className="h-5 w-5" />
                          ) : (
                            <span>
                              <span className="block text-[10px] font-bold uppercase">{f.dateTime(new Date(o.date), { month: "short" })}</span>
                              <span className="block text-lg font-extrabold">{f.dateTime(new Date(o.date), { day: "numeric" })}</span>
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-sm font-bold">
                            {o.code} {o.suki && <Badge variant="aqua">Suki</Badge>}
                          </p>
                          <p className="truncate text-xs text-navy-400">{o.summary}</p>
                          <p className="text-xs text-navy-400">{o.isAsap ? "ASAP" : o.slot}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("new")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>{t("days")}</Label>
                <div className="flex gap-1.5">
                  {days.map((d, idx) => {
                    const on = editing.days.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setEditing({ ...editing, days: on ? editing.days.filter((x) => x !== idx) : [...editing.days, idx] })}
                        className={cn("h-11 flex-1 rounded-xl text-xs font-bold transition", on ? "bg-ocean text-white shadow-glow" : "bg-mist text-navy-500 hover:bg-ocean-50")}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>{t("items")}</Label>
                <div className="space-y-2">
                  {editing.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={it.productId} onValueChange={(v) => setEditing({ ...editing, items: editing.items.map((x, i) => (i === idx ? { ...x, productId: v } : x)) })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {peso(p.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <QtyStepper
                        size="sm"
                        value={it.quantity}
                        onChange={(v) =>
                          setEditing({
                            ...editing,
                            items: v === 0 ? editing.items.filter((_, i) => i !== idx) : editing.items.map((x, i) => (i === idx ? { ...x, quantity: v } : x)),
                          })
                        }
                      />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ ...editing, items: [...editing.items, { productId: products[0]?.id ?? "", quantity: 1 }] })}>
                    <Plus /> {tc("add")}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t("timeSlot")}</Label>
                  <Select value={editing.timeSlot} onValueChange={(v) => setEditing({ ...editing, timeSlot: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("payment")}</Label>
                  <Select value={editing.paymentMethod} onValueChange={(v) => setEditing({ ...editing, paymentMethod: v as Sub["paymentMethod"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["COD", "GCASH", "MAYA"] as const).map((m) => (
                        <SelectItem key={m} value={m}>
                          {te(`payment.${m}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("address")}</Label>
                <Select value={editing.addressId} onValueChange={(v) => setEditing({ ...editing, addressId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label} — {a.line1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  {tc("cancel")}
                </Button>
                <Button onClick={save} disabled={pending || editing.days.length === 0 || editing.items.length === 0}>
                  {pending && <Loader2 className="animate-spin" />} {tc("save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
