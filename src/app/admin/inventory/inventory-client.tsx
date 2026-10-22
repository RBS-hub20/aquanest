"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Loader2, Minus, Pencil, Plus, Printer, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ContainerType, GallonStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/brand/product-image";
import { PageHeader } from "@/components/admin/page-header";
import { CONTAINER_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { adjustSupplyAction, createGallonsAction, deleteGallonAction, deleteInventoryAction, moveGallonsAction, saveInventoryAction, updateGallonStatusAction } from "../actions";

type Row = {
  id: string;
  name: string;
  category: string;
  container: ContainerType | null;
  filled: number;
  empty: number;
  atCustomer: number;
  forCleaning: number;
  damaged: number;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  updatedAt: string;
};
type Gallon = { id: string; serial: string; container: ContainerType; status: GallonStatus; customer: string | null };

const BUCKETS = [
  { key: "filled", label: "Filled", color: "#0C6DB5" },
  { key: "empty", label: "Empty", color: "#94A3B8" },
  { key: "atCustomer", label: "At Customer", color: "#00B2E3" },
  { key: "forCleaning", label: "For Cleaning", color: "#E8890C" },
  { key: "damaged", label: "Damaged", color: "#C2417A" },
] as const;
type Bucket = (typeof BUCKETS)[number]["key"];
const STATUS_LABEL: Record<GallonStatus, string> = { FILLED: "Filled", EMPTY: "Empty", AT_CUSTOMER: "At Customer", FOR_CLEANING: "For Cleaning", DAMAGED: "Damaged" };

export function InventoryClient({ rows, gallons }: { rows: Row[]; gallons: Gallon[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const [mover, setMover] = useState<{ row: Row; from: Bucket; to: Bucket; qty: number } | null>(null);
  const [qr, setQr] = useState<Gallon | null>(null);
  const [newGallon, setNewGallon] = useState<{ container: ContainerType; count: number }>({ container: "ROUND_19L", count: 5 });
  const gallonRows = rows.filter((r) => r.category === "GALLON");
  const supplies = rows.filter((r) => r.category === "SUPPLY");
  const totals = BUCKETS.map((b) => ({ ...b, value: gallonRows.reduce((s, r) => s + r[b.key], 0) }));
  const fleet = totals.reduce((s, t) => s + t.value, 0);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(msg);
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle={`${fleet} containers in the fleet`}
        actions={
          <Button onClick={() => setEdit({ category: "SUPPLY", name: "", quantity: 0, unit: "pcs", lowStockThreshold: 10 })}>
            <Plus /> Supply item
          </Button>
        }
      />

      {/* Fleet summary */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {totals.map((t) => (
            <div key={t.key} className="flex items-center gap-3">
              <span className="h-10 w-1.5 rounded-full" style={{ background: t.color }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{t.label}</p>
                <p className="text-2xl font-extrabold">{t.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
          {totals.map((t) => (
            <div key={t.key} style={{ width: `${(t.value / (fleet || 1)) * 100}%`, background: t.color }} title={`${t.label}: ${t.value}`} />
          ))}
        </div>
      </Card>

      {/* Per container */}
      <div className="grid gap-4 md:grid-cols-2">
        {gallonRows.map((r) => {
          const total = BUCKETS.reduce((s, b) => s + r[b.key], 0);
          const low = r.filled < r.lowStockThreshold;
          return (
            <Card key={r.id} className={cn("p-5", low && "ring-2 ring-rose-200")}>
              <div className="flex items-start gap-4">
                <div className="h-28 w-24 shrink-0 rounded-2xl bg-mist p-2">
                  <ProductImage container={r.container ?? "ROUND_19L"} sizes="96px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{r.name}</p>
                    <div className="flex items-center gap-1">
                      {low && <Badge variant="danger">Low filled</Badge>}
                      <Button size="icon-sm" variant="ghost" onClick={() => setEdit(r)} aria-label="Edit">
                        <Pencil />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-navy-400">{total} total · reorder/refill below {r.lowStockThreshold} filled</p>
                  <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-slate-100">
                    {BUCKETS.map((b) => (
                      <div key={b.key} style={{ width: `${(r[b.key] / (total || 1)) * 100}%`, background: b.color }} />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                    {BUCKETS.map((b) => (
                      <div key={b.key} className="rounded-xl bg-mist/70 p-1.5">
                        <p className="text-base font-extrabold">{r[b.key]}</p>
                        <p className="text-[9px] font-semibold uppercase leading-tight text-navy-400">{b.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["empty", "forCleaning", "Send to cleaning"],
                        ["forCleaning", "filled", "Cleaned & filled"],
                        ["empty", "filled", "Refill empties"],
                        ["filled", "damaged", "Mark damaged"],
                      ] as [Bucket, Bucket, string][]
                    ).map(([from, to, label]) => (
                      <button key={label} onClick={() => setMover({ row: r, from, to, qty: Math.min(5, r[from]) || 1 })} className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-ocean ring-1 ring-sky-100 hover:bg-ocean-50">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* Supplies */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Supplies</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH>Stock</TH>
                <TH>Adjust</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {supplies.map((s) => {
                const low = s.quantity < s.lowStockThreshold;
                return (
                  <TR key={s.id}>
                    <TD>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-[11px] text-navy-400">min {s.lowStockThreshold}</p>
                    </TD>
                    <TD>
                      <span className={cn("font-bold", low && "text-rose-600")}>
                        {s.quantity} {s.unit}
                      </span>
                      {low && <Badge variant="danger" className="ml-2">Low</Badge>}
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        {[-10, -1, 1, 10, 100].map((d) => (
                          <button key={d} disabled={pending} onClick={() => run(() => adjustSupplyAction(s.id, d), `${s.name}: ${d > 0 ? "+" : ""}${d}`)} className="flex h-7 min-w-8 items-center justify-center rounded-lg bg-mist px-1.5 text-[11px] font-bold ring-1 ring-sky-100 hover:bg-ocean-50">
                            {d > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {Math.abs(d)}
                          </button>
                        ))}
                      </div>
                    </TD>
                    <TD className="text-right">
                      <Button size="icon-sm" variant="ghost" onClick={() => setEdit(s)} aria-label="Edit">
                        <Pencil />
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>

        {/* QR registry */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-ocean" /> Gallon QR registry
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={newGallon.container} onValueChange={(v) => setNewGallon({ ...newGallon, container: v as ContainerType })}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ROUND_19L", "SLIM_19L", "GALLON_10L", "GALLON_6L"] as const).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONTAINER_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min={1} max={100} value={newGallon.count} onChange={(e) => setNewGallon({ ...newGallon, count: Number(e.target.value) })} className="h-9 w-16" />
              <Button size="sm" disabled={pending} onClick={() => run(() => createGallonsAction(newGallon.container, newGallon.count), `${newGallon.count} gallon QR(s) created`)}>
                <Plus /> Add
              </Button>
            </div>
          </CardHeader>
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Serial</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {gallons.map((g) => (
                  <TR key={g.id}>
                    <TD>
                      <button onClick={() => setQr(g)} className="flex items-center gap-2 font-mono text-sm font-semibold text-ocean">
                        <QrCode className="h-4 w-4" /> {g.serial}
                      </button>
                      {g.customer && <p className="text-[11px] text-navy-400">@ {g.customer}</p>}
                    </TD>
                    <TD className="text-xs">{CONTAINER_LABEL[g.container]}</TD>
                    <TD>
                      <Select value={g.status} onValueChange={(v) => run(() => updateGallonStatusAction(g.id, v as GallonStatus), `${g.serial} → ${STATUS_LABEL[v as GallonStatus]}`)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as GallonStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TD>
                    <TD className="text-right">
                      <Button size="icon-sm" variant="ghost" onClick={() => confirm(`Delete ${g.serial}?`) && run(() => deleteGallonAction(g.id), "Deleted")} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Edit row */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? `Edit ${edit.name}` : "New supply item"}</DialogTitle>
            <DialogDescription>Counts are updated automatically as orders are delivered; adjust here after a physical count.</DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () =>
                    saveInventoryAction({
                      id: edit.id,
                      name: edit.name ?? "",
                      category: (edit.category as "GALLON" | "SUPPLY") ?? "SUPPLY",
                      container: edit.container ?? null,
                      filled: edit.filled ?? 0,
                      empty: edit.empty ?? 0,
                      atCustomer: edit.atCustomer ?? 0,
                      forCleaning: edit.forCleaning ?? 0,
                      damaged: edit.damaged ?? 0,
                      quantity: edit.quantity ?? 0,
                      unit: edit.unit ?? "pcs",
                      lowStockThreshold: edit.lowStockThreshold ?? 10,
                    }),
                  "Inventory saved",
                  () => setEdit(null)
                );
              }}
            >
              <div>
                <Label>Name</Label>
                <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
              </div>
              {edit.category === "GALLON" ? (
                <div className="grid grid-cols-3 gap-2">
                  {BUCKETS.map((b) => (
                    <div key={b.key}>
                      <Label>{b.label}</Label>
                      <Input type="number" min={0} value={edit[b.key] ?? 0} onChange={(e) => setEdit({ ...edit, [b.key]: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min={0} value={edit.quantity ?? 0} onChange={(e) => setEdit({ ...edit, quantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={edit.unit ?? "pcs"} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} />
                  </div>
                </div>
              )}
              <div>
                <Label>Low-stock threshold</Label>
                <Input type="number" min={0} value={edit.lowStockThreshold ?? 10} onChange={(e) => setEdit({ ...edit, lowStockThreshold: Number(e.target.value) })} />
              </div>
              <div className="flex justify-between gap-2">
                {edit.id && edit.category === "SUPPLY" ? (
                  <Button type="button" variant="ghost" className="text-rose-600" onClick={() => confirm("Delete item?") && run(() => deleteInventoryAction(edit.id!), "Deleted", () => setEdit(null))}>
                    <Trash2 /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />} Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Move gallons */}
      <Dialog open={!!mover} onOpenChange={(o) => !o && setMover(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move gallons</DialogTitle>
            <DialogDescription>{mover?.row.name}</DialogDescription>
          </DialogHeader>
          {mover && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm font-bold">
                <Badge variant="outline">
                  {BUCKETS.find((b) => b.key === mover.from)?.label} ({mover.row[mover.from]})
                </Badge>
                <ArrowRight className="h-4 w-4 text-ocean" />
                <Badge>{BUCKETS.find((b) => b.key === mover.to)?.label}</Badge>
              </div>
              <Input type="number" min={1} max={mover.row[mover.from]} value={mover.qty} onChange={(e) => setMover({ ...mover, qty: Number(e.target.value) })} className="text-center text-lg font-bold" />
              <Button className="w-full" disabled={pending || mover.qty < 1} onClick={() => run(() => moveGallonsAction(mover.row.id, mover.from, mover.to, mover.qty), `Moved ${mover.qty}`, () => setMover(null))}>
                Confirm move
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR */}
      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogTitle>{qr?.serial}</DialogTitle>
          {qr && (
            <div className="space-y-3">
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
                <QRCodeSVG value={`AQUANEST:${qr.serial}`} size={180} fgColor="#0A2D5D" imageSettings={{ src: "/brand/logo-icon.png", width: 36, height: 32, excavate: true }} />
              </div>
              <p className="text-sm text-navy-500">
                {CONTAINER_LABEL[qr.container]} · {STATUS_LABEL[qr.status]}
              </p>
              <Button variant="outline" className="no-print w-full" onClick={() => window.print()}>
                <Printer /> Print label
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
