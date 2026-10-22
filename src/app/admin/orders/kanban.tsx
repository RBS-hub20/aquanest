"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Bike, CalendarClock, Check, ChevronRight, Clock, GripVertical, MapPin, Phone, Search, ShieldAlert, X, Zap } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/page-header";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifyPaymentButtons } from "@/components/admin/verify-payment";
import type { SerializedOrder } from "@/lib/serialize";
import { cn, displayPhone, peso } from "@/lib/utils";
import { assignRiderAction, updateOrderStatusAction } from "../actions";

const COLUMNS: { status: OrderStatus; title: string; accent: string; hint: string }[] = [
  { status: "PENDING", title: "Pending", accent: "bg-amber-400", hint: "New orders" },
  { status: "PREPARING", title: "Preparing", accent: "bg-sky-500", hint: "Filling & sealing" },
  { status: "OUT_FOR_DELIVERY", title: "For Delivery", accent: "bg-ocean", hint: "Rider on the road" },
  { status: "DELIVERED", title: "Delivered", accent: "bg-emerald-500", hint: "Today" },
  { status: "CANCELLED", title: "Cancelled", accent: "bg-rose-400", hint: "Today" },
];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { PENDING: "PREPARING", PREPARING: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED" };
const FINAL: OrderStatus[] = ["DELIVERED", "CANCELLED"];
type Rider = { id: string; name: string; isOnline: boolean };

export function KanbanBoard({ orders: initial, riders }: { orders: SerializedOrder[]; riders: Rider[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initial);
  const [q, setQ] = useState("");
  const [dragging, setDragging] = useState<SerializedOrder | null>(null);
  const [open, setOpen] = useState<SerializedOrder | null>(null);
  const [, start] = useTransition();
  useEffect(() => setOrders(initial), [initial]);
  useEffect(() => {
    if (open) setOpen(initial.find((o) => o.id === open.id) ?? null);
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) => [o.code, o.customer?.name, o.walkInName, o.addressText, o.rider?.name].filter(Boolean).some((s) => s!.toLowerCase().includes(term)));
  }, [orders, q]);

  const move = (order: SerializedOrder, to: OrderStatus) => {
    if (order.status === to) return;
    if (FINAL.includes(order.status)) return toast.error("Delivered/cancelled orders are locked");
    let cancelReason: string | undefined;
    if (to === "CANCELLED") {
      const r = prompt(`Cancel ${order.code}? Reason:`, "Customer request");
      if (r === null) return;
      cancelReason = r;
    }
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status: to } : o)));
    start(async () => {
      const r = await updateOrderStatusAction(order.id, to, { cancelReason });
      if (!r.ok) {
        setOrders(prev);
        return void toast.error(r.error);
      }
      toast.success(`${order.code} → ${COLUMNS.find((c) => c.status === to)?.title}`, {
        description: to === "OUT_FOR_DELIVERY" ? "Customer notified via SMS 📲" : undefined,
      });
      router.refresh();
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const order = orders.find((o) => o.id === e.active.id);
    const to = e.over?.id as OrderStatus | undefined;
    if (order && to) move(order, to);
  };

  const assign = (order: SerializedOrder, riderId: string) => {
    const rider = riders.find((r) => r.id === riderId);
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, rider: o.rider && rider ? { ...o.rider, id: rider.id, name: rider.name } : o.rider } : o)));
    start(async () => {
      const r = await assignRiderAction(order.id, riderId === "none" ? null : riderId);
      if (!r.ok) return void toast.error(r.error);
      toast.success(rider ? `Assigned to ${rider.name}` : "Rider unassigned");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Order Board"
        subtitle="Drag cards between columns · customers get notified automatically"
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, rider…" className="w-64 pl-9" />
          </div>
        }
      />
      <DndContext sensors={sensors} onDragStart={(e) => setDragging(orders.find((o) => o.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {COLUMNS.map((col) => {
            const list = filtered.filter((o) => o.status === col.status);
            return (
              <Column key={col.status} col={col} count={list.length} total={list.reduce((s, o) => s + o.total, 0)}>
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} riders={riders} onOpen={() => setOpen(o)} onAssign={(rid) => assign(o, rid)} onAdvance={() => NEXT[o.status] && move(o, NEXT[o.status]!)} />
                ))}
                {list.length === 0 && <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-xs text-navy-400">Drop here</p>}
              </Column>
            );
          })}
        </div>
        <DragOverlay dropAnimation={{ duration: 180 }}>{dragging ? <CardBody order={dragging} riders={riders} overlay /> : null}</DragOverlay>
      </DndContext>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent side="right">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {open.code} <StatusBadge status={open.status} />
                </DialogTitle>
                <DialogDescription>
                  {new Date(open.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })} · {open.channel}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-2xl bg-mist p-4">
                  <p className="font-bold">{open.customer?.name ?? open.walkInName}</p>
                  {open.customer && (
                    <a href={`tel:${open.customer.phone}`} className="flex items-center gap-1.5 text-sm text-ocean">
                      <Phone className="h-3.5 w-3.5" /> {displayPhone(open.customer.phone)}
                    </a>
                  )}
                  {open.addressText && (
                    <p className="mt-2 flex gap-1.5 text-sm text-navy-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {open.addressText} · {open.distanceKm} km
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-navy-500">
                    {open.isAsap ? <Zap className="h-4 w-4 text-amber-500" /> : <CalendarClock className="h-4 w-4" />}
                    {open.isAsap ? "ASAP" : `${open.scheduledDate ? new Date(open.scheduledDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }) : ""} · ${open.timeSlot}`}
                  </p>
                  {open.notes && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">📝 {open.notes}</p>}
                </div>
                <ul className="space-y-2">
                  {open.items.map((i) => (
                    <li key={i.id} className="flex justify-between text-sm">
                      <span>
                        <span className="font-semibold">
                          {i.quantity} × {i.productName}
                        </span>
                        <span className="ml-2 text-xs text-navy-400">{i.orderType.replace("_", " ").toLowerCase()}</span>
                      </span>
                      <span className="font-semibold">{peso(i.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-dashed pt-3 text-sm">
                  <p className="flex justify-between">
                    <span className="text-navy-400">Subtotal</span> {peso(open.subtotal)}
                  </p>
                  {open.depositTotal !== 0 && (
                    <p className="flex justify-between">
                      <span className="text-navy-400">Deposit</span> {peso(open.depositTotal)}
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span className="text-navy-400">Delivery</span> {peso(open.deliveryFee)}
                  </p>
                  {open.discount > 0 && (
                    <p className="flex justify-between text-emerald-600">
                      <span>Discount</span> −{peso(open.discount)}
                    </p>
                  )}
                  <p className="flex justify-between text-lg font-extrabold">
                    <span>Total</span> {peso(open.total)}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                  <PaymentLogo method={open.paymentMethod} />
                  <Badge variant={open.paymentStatus === "PAID" ? "success" : open.paymentStatus === "FOR_VERIFICATION" ? "warning" : "outline"}>{open.paymentStatus.replace("_", " ")}</Badge>
                  {open.paymentStatus === "FOR_VERIFICATION" && <VerifyPaymentButtons orderId={open.id} />}
                </div>
                {open.paymentProofUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={open.paymentProofUrl} alt="Payment proof" className="max-h-72 w-full rounded-2xl bg-mist object-contain" />
                )}
                {open.deliveryPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={open.deliveryPhotoUrl} alt="Delivery proof" className="max-h-72 w-full rounded-2xl object-cover" />
                )}
                {!FINAL.includes(open.status) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" className="text-rose-600" onClick={() => move(open, "CANCELLED")}>
                      <X /> Cancel order
                    </Button>
                    {NEXT[open.status] && (
                      <Button onClick={() => move(open, NEXT[open.status]!)}>
                        <Check /> Move to {COLUMNS.find((c) => c.status === NEXT[open.status])?.title}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Column({ col, count, total, children }: { col: (typeof COLUMNS)[number]; count: number; total: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });
  return (
    <section ref={setNodeRef} className={cn("flex w-[300px] shrink-0 flex-col rounded-3xl bg-white/70 p-3 ring-1 ring-slate-100 transition", isOver && "bg-ocean-50 ring-2 ring-ocean")}>
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", col.accent)} />
          <h3 className="text-sm font-extrabold">{col.title}</h3>
          <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-bold text-navy-500">{count}</span>
        </div>
        <span className="text-xs font-semibold text-navy-400">{peso(total, { compact: true })}</span>
      </header>
      <p className="-mt-2 mb-3 px-1 text-[11px] text-navy-400">{col.hint}</p>
      <div className="flex min-h-[200px] flex-col gap-2.5">{children}</div>
    </section>
  );
}

function OrderCard({ order, riders, onOpen, onAssign, onAdvance }: { order: SerializedOrder; riders: Rider[]; onOpen: () => void; onAssign: (id: string) => void; onAdvance: () => void }) {
  const locked = FINAL.includes(order.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id, disabled: locked });
  return (
    <motion.div layout ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <CardBody order={order} riders={riders} onOpen={onOpen} onAssign={onAssign} onAdvance={onAdvance} handle={!locked ? { ...attributes, ...listeners } : undefined} />
    </motion.div>
  );
}

function CardBody({
  order,
  riders,
  onOpen,
  onAssign,
  onAdvance,
  handle,
  overlay,
}: {
  order: SerializedOrder;
  riders: Rider[];
  onOpen?: () => void;
  onAssign?: (id: string) => void;
  onAdvance?: () => void;
  handle?: Record<string, unknown>;
  overlay?: boolean;
}) {
  const late = order.status === "PENDING" && Date.now() - new Date(order.createdAt).getTime() > 20 * 60000;
  return (
    <div className={cn("group rounded-2xl border border-slate-100 bg-white p-3 shadow-soft transition hover:shadow-lift", overlay && "rotate-2 shadow-2xl ring-2 ring-ocean")}>
      <div className="flex items-start gap-2">
        <button {...handle} className={cn("mt-0.5 cursor-grab touch-none text-slate-300 active:cursor-grabbing", !handle && "invisible")} aria-label="Drag">
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold">{order.code}</p>
            <p className="text-sm font-bold text-ocean">{peso(order.total)}</p>
          </div>
          <p className="truncate text-sm font-semibold text-navy-500">{order.customer?.name ?? order.walkInName ?? "Walk-in"}</p>
          <p className="truncate text-xs text-navy-400">{order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", late ? "bg-rose-50 text-rose-600" : "bg-mist text-navy-500")}>
              <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(order.createdAt))}
            </span>
            {!order.isAsap && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">{order.timeSlot}</span>}
            {order.channel === "SUBSCRIPTION" && <span className="rounded-md bg-aqua-50 px-1.5 py-0.5 text-[10px] font-semibold text-aqua-600">Suki</span>}
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-500">{order.paymentMethod}</span>
            {order.paymentStatus === "FOR_VERIFICATION" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                <ShieldAlert className="h-3 w-3" /> verify
              </span>
            )}
            {order.paymentStatus === "PAID" && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">paid</span>}
          </div>
        </button>
      </div>
      {!FINAL.includes(order.status) && order.channel !== "POS" && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-slate-50 pt-2.5">
          <Select value={order.rider?.id ?? "none"} onValueChange={(v) => onAssign?.(v)}>
            <SelectTrigger className="h-8 flex-1 rounded-lg text-xs">
              <Bike className="mr-1 h-3.5 w-3.5 text-ocean" />
              <SelectValue placeholder="Assign rider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {riders.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.isOnline ? "🟢" : "⚪️"} {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onAdvance && (
            <Button size="icon-sm" variant="secondary" onClick={onAdvance} aria-label="Next status">
              <ChevronRight />
            </Button>
          )}
        </div>
      )}
      {FINAL.includes(order.status) && order.rider && <p className="mt-2 text-[11px] text-navy-400">🛵 {order.rider.name}</p>}
    </div>
  );
}
