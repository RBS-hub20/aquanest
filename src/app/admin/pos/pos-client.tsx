"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, Check, Delete, Loader2, Printer, Search, Trash2, User, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/brand/product-image";
import { QtyStepper } from "@/components/shared/qty-stepper";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { PageHeader } from "@/components/admin/page-header";
import { computeCart, type OrderTypeKey, type PricingSettings, type PricedProduct } from "@/lib/pricing";
import { cn, displayPhone, peso } from "@/lib/utils";
import { createPosOrderAction, searchCustomersAction } from "../actions";

type P = PricedProduct & { sizeLabel: string; waterType: string; isPopular: boolean };
type Line = { productId: string; orderType: OrderTypeKey; quantity: number };

const TYPES: { key: OrderTypeKey; label: string }[] = [
  { key: "REFILL", label: "Refill" },
  { key: "NEW_GALLON", label: "New + Gallon" },
  { key: "BORROW", label: "Hiram" },
  { key: "RETURN", label: "Return" },
];

export function PosClient({ products, pricing, store, today }: { products: P[]; pricing: PricingSettings; store: { name: string; address: string; phone: string }; today: { total: number; count: number } }) {
  const router = useRouter();
  const [water, setWater] = useState("PURIFIED");
  const [type, setType] = useState<OrderTypeKey>("REFILL");
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<"CASH" | "GCASH" | "MAYA">("CASH");
  const [tendered, setTendered] = useState("");
  const [walkIn, setWalkIn] = useState("");
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string; balance: number } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; phone: string; balance: number }[]>([]);
  const [receipt, setReceipt] = useState<{ code: string; total: number; tendered: number; lines: ReturnType<typeof computeCart>["lines"]; method: string; name: string } | null>(null);
  const [pending, start] = useTransition();

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const grid = products.filter((p) => (type === "REFILL" ? p.waterType === water || !p.isReturnable : p.isReturnable && p.waterType === water));
  // walk-ins bring their own gallons; deposits apply only for explicit Borrow lines
  const totals = computeCart(
    lines.map((l) => ({ product: byId.get(l.productId)!, orderType: l.orderType, quantity: l.quantity })),
    { settings: pricing, holdings: { held: { ROUND_19L: 99, SLIM_19L: 99, GALLON_10L: 99, GALLON_6L: 99 }, borrowed: { ROUND_19L: 99, SLIM_19L: 99, GALLON_10L: 99, GALLON_6L: 99 } }, skipDelivery: true }
  );
  const tenderedNum = Number(tendered || 0);
  const change = Math.max(0, tenderedNum - totals.total);

  const add = (p: P) =>
    setLines((ls) => {
      const t: OrderTypeKey = p.isReturnable ? type : "REFILL";
      const ex = ls.find((l) => l.productId === p.id && l.orderType === t);
      return ex ? ls.map((l) => (l === ex ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { productId: p.id, orderType: t, quantity: 1 }];
    });

  const search = (v: string) => {
    setQuery(v);
    if (v.trim().length < 2) return setResults([]);
    start(async () => setResults(await searchCustomersAction(v)));
  };

  const charge = () => {
    if (!lines.length) return toast.error("Add items first");
    if (method === "CASH" && tenderedNum < totals.total) return toast.error("Cash tendered is less than total");
    start(async () => {
      const r = await createPosOrderAction({
        customerId: customer?.id ?? null,
        walkInName: walkIn || null,
        items: lines,
        paymentMethod: method,
        amountTendered: method === "CASH" ? tenderedNum : totals.total,
      });
      if (!r.ok) return void toast.error(r.error);
      setReceipt({ code: r.data!.code, total: r.data!.total, tendered: method === "CASH" ? tenderedNum : r.data!.total, lines: totals.lines, method, name: customer?.name ?? (walkIn || "Walk-in") });
      setLines([]);
      setTendered("");
      setCustomer(null);
      setWalkIn("");
      router.refresh();
    });
  };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"];

  return (
    <div className="space-y-5">
      <PageHeader title="POS · Walk-in" subtitle={`Today: ${today.count} walk-in sales · ${peso(today.total)}`} />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {TYPES.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)} className={cn("rounded-xl px-4 py-2 text-sm font-bold ring-1 transition", type === t.key ? "bg-navy text-white ring-navy" : "bg-white ring-slate-200")}>
                {t.label}
              </button>
            ))}
            <span className="mx-2 h-6 w-px bg-slate-200" />
            {["PURIFIED", "MINERAL", "ALKALINE"].map((w) => (
              <button key={w} onClick={() => setWater(w)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 transition", water === w ? "bg-ocean text-white ring-ocean" : "bg-white text-navy-500 ring-slate-200")}>
                {w.charAt(0) + w.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {grid.map((p) => {
              const t: OrderTypeKey = p.isReturnable ? type : "REFILL";
              const unit = t === "RETURN" ? -p.depositPrice : p.price + (t === "NEW_GALLON" ? p.containerPrice : 0) + (t === "BORROW" ? p.depositPrice : 0);
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => add(p)}
                  className="relative flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-4 text-center shadow-soft transition hover:border-sky-200 hover:shadow-lift"
                >
                  {lines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0) > 0 && (
                    <span className="absolute right-3 top-3 grid h-6 min-w-6 place-items-center rounded-full bg-ocean px-1.5 text-xs font-bold text-white">
                      {lines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0)}
                    </span>
                  )}
                  <div className="h-32 w-full rounded-2xl bg-[radial-gradient(ellipse_at_50%_35%,#FFFFFF_0%,#F0F8FF_60%,#E3F2FC_100%)] px-4 pb-1.5 pt-4">
                    <ProductImage container={p.container} sizes="140px" />
                  </div>
                  <p className="mt-2 text-sm font-bold leading-tight">{p.name}</p>
                  <p className="text-[11px] text-navy-400">{p.sizeLabel}</p>
                  <p className="mt-1 text-lg font-extrabold text-ocean">{peso(unit)}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        <Card className="flex flex-col overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)]">
          <div className="space-y-2 border-b border-slate-100 p-4">
            {customer ? (
              <div className="flex items-center gap-3 rounded-2xl bg-ocean-50 p-3">
                <User className="h-5 w-5 text-ocean" />
                <div className="flex-1">
                  <p className="text-sm font-bold">{customer.name}</p>
                  <p className="text-xs text-navy-400">
                    {displayPhone(customer.phone)} {customer.balance > 0 && <span className="text-rose-600">· utang {peso(customer.balance)}</span>}
                  </p>
                </div>
                <button onClick={() => setCustomer(null)} aria-label="Remove customer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                  <Input value={query} onChange={(e) => search(e.target.value)} placeholder="Find suki…" className="h-10 pl-9" />
                  {results.length > 0 && (
                    <div className="absolute inset-x-0 top-11 z-20 rounded-xl border border-slate-100 bg-white p-1 shadow-xl">
                      {results.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setCustomer(r);
                            setResults([]);
                            setQuery("");
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-mist"
                        >
                          <span className="font-semibold">{r.name}</span> <span className="text-xs text-navy-400">{displayPhone(r.phone)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                  <Input value={walkIn} onChange={(e) => setWalkIn(e.target.value)} placeholder="Walk-in name" className="h-10 pl-9" />
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {totals.lines.map((l) => (
                <motion.div key={`${l.productId}-${l.orderType}`} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{l.productName}</p>
                    <p className="text-[11px] text-navy-400">
                      {TYPES.find((t) => t.key === l.orderType)?.label} · {peso(l.lineTotal / l.quantity)}
                    </p>
                  </div>
                  <QtyStepper size="sm" value={l.quantity} onChange={(v) => setLines((ls) => (v <= 0 ? ls.filter((x) => !(x.productId === l.productId && x.orderType === l.orderType)) : ls.map((x) => (x.productId === l.productId && x.orderType === l.orderType ? { ...x, quantity: v } : x))))} />
                  <p className="w-20 text-right text-sm font-bold">{peso(l.lineTotal)}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {lines.length === 0 && <p className="py-10 text-center text-sm text-navy-400">Tap a product to start a sale</p>}
          </div>
          <div className="space-y-3 border-t border-slate-100 bg-mist/50 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-navy-400">Total</p>
                <p className="text-3xl font-extrabold text-navy">{peso(totals.total)}</p>
              </div>
              {lines.length > 0 && (
                <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setLines([])}>
                  <Trash2 /> Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["CASH", "GCASH", "MAYA"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={cn("rounded-2xl border bg-white p-2 transition", method === m ? "border-ocean ring-4 ring-ocean/10" : "border-slate-100")}>
                  <PaymentLogo method={m} className="h-8 w-full justify-center text-xs" />
                </button>
              ))}
            </div>
            {method === "CASH" && (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <Label>Cash tendered</Label>
                  <div className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-xl font-extrabold">
                    <span>₱</span>
                    <span>{tendered || "0"}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {[totals.total, 50, 100, 200, 500, 1000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 5).map((v) => (
                      <button key={v} onClick={() => setTendered(String(Math.ceil(v)))} className="flex-1 rounded-lg bg-white px-1 py-1.5 text-[11px] font-bold ring-1 ring-slate-200 hover:ring-ocean">
                        {v === totals.total ? "Exact" : `₱${v}`}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm">
                    Change: <span className="text-lg font-extrabold text-emerald-600">{peso(change)}</span>
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {keypad.map((k) => (
                    <button
                      key={k}
                      onClick={() => setTendered((t) => (k === "⌫" ? t.slice(0, -1) : (t + k).replace(/^0+(?=\d)/, "").slice(0, 6)))}
                      className="grid h-10 w-11 place-items-center rounded-xl bg-white text-sm font-bold ring-1 ring-slate-200 active:bg-ocean-50"
                    >
                      {k === "⌫" ? <Delete className="h-4 w-4" /> : k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button size="xl" className="w-full" onClick={charge} disabled={pending || !lines.length}>
              {pending ? <Loader2 className="animate-spin" /> : <Banknote />} Charge {peso(totals.total)}
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="sr-only">Receipt</DialogTitle>
          {receipt && (
            <div id="pos-receipt" className="font-mono text-sm">
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-7 w-7" />
                </div>
                <p className="mt-3 font-sans text-lg font-extrabold">AquaNest™</p>
                <p className="text-[11px] text-navy-400">{store.address}</p>
                <p className="text-[11px] text-navy-400">{store.phone}</p>
                <p className="mt-2 text-xs">
                  {receipt.code} · {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                </p>
                <p className="text-xs">Customer: {receipt.name}</p>
              </div>
              <div className="my-3 border-y border-dashed py-2">
                {receipt.lines.map((l) => (
                  <p key={`${l.productId}${l.orderType}`} className="flex justify-between">
                    <span>
                      {l.quantity}× {l.productName}
                    </span>
                    <span>{peso(l.lineTotal)}</span>
                  </p>
                ))}
              </div>
              <p className="flex justify-between font-bold">
                <span>TOTAL</span> <span>{peso(receipt.total)}</span>
              </p>
              <p className="flex justify-between">
                <span>{receipt.method}</span> <span>{peso(receipt.tendered)}</span>
              </p>
              <p className="flex justify-between">
                <span>CHANGE</span> <span>{peso(Math.max(0, receipt.tendered - receipt.total))}</span>
              </p>
              <p className="mt-3 text-center text-xs">Salamat po! Pure Water. Happy Home.</p>
            </div>
          )}
          <div className="no-print grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button onClick={() => setReceipt(null)}>New sale</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
