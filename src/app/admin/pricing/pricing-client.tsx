"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Save, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import type { ContainerType, WaterType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/brand/product-image";
import { PageHeader } from "@/components/admin/page-header";
import { CONTAINER_LABEL, CONTAINERS, WATER_TYPES } from "@/lib/constants";
import { computeDeliveryFee } from "@/lib/pricing";
import { peso } from "@/lib/utils";
import { deleteProductAction, saveFeesAction, saveProductAction } from "../actions";

type Product = {
  id?: string;
  name: string;
  nameTl: string;
  container: ContainerType;
  sizeLabel: string;
  liters: number;
  waterType: WaterType;
  price: number;
  containerPrice: number;
  depositPrice: number;
  isReturnable: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};
type Fees = {
  baseDeliveryFee: number;
  deliveryFeePerKm: number;
  freeDeliveryRadiusKm: number;
  freeDeliveryThreshold: number;
  maxDeliveryKm: number;
  gallonDepositFee: number;
  loyaltyRefillsForFree: number;
  referralRewardPoints: number;
};

export function PricingClient({ products, fees: initialFees }: { products: Product[]; fees: Fees }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Product | null>(null);
  const [fees, setFees] = useState(initialFees);
  const [applyAll, setApplyAll] = useState(false);
  const [pending, start] = useTransition();
  const matrix = CONTAINERS.map((c) => ({ c, row: WATER_TYPES.map((w) => products.find((p) => p.container === c && p.waterType === w)) }));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(msg);
      after?.();
      router.refresh();
    });

  const blank = (c: ContainerType = "ROUND_19L", w: WaterType = "PURIFIED"): Product => ({
    name: "",
    nameTl: "",
    container: c,
    sizeLabel: CONTAINER_LABEL[c],
    liters: c === "GALLON_10L" ? 10 : c === "GALLON_6L" ? 6 : c === "BOTTLED_CASE" ? 12 : 19,
    waterType: w,
    price: 30,
    containerPrice: c === "BOTTLED_CASE" ? 0 : 180,
    depositPrice: c === "BOTTLED_CASE" ? 0 : fees.gallonDepositFee,
    isReturnable: c !== "BOTTLED_CASE",
    isPopular: false,
    isActive: true,
    sortOrder: products.length + 1,
  });

  const num = (k: keyof Fees) => (
    <Input type="number" min={0} step="0.5" value={fees[k]} onChange={(e) => setFees({ ...fees, [k]: Number(e.target.value) })} />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Settings"
        subtitle="Price per size × water type, delivery fees and deposits — changes apply to new orders instantly"
        actions={
          <Button onClick={() => setEdit(blank())}>
            <Plus /> Product
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Price matrix</CardTitle>
          <span className="text-xs text-navy-400">Click a cell to edit · empty cell = add</span>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Size</TH>
              {WATER_TYPES.map((w) => (
                <TH key={w}>{w.charAt(0) + w.slice(1).toLowerCase()}</TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {matrix.map(({ c, row }) => (
              <TR key={c}>
                <TD>
                  <div className="flex items-center gap-3">
                    <span className="h-14 w-12 shrink-0 rounded-xl bg-mist p-1">
                      <ProductImage container={c} ground={false} sizes="48px" />
                    </span>
                    <span className="font-semibold">{CONTAINER_LABEL[c]}</span>
                  </div>
                </TD>
                {row.map((p, i) => (
                  <TD key={i}>
                    {p ? (
                      <button onClick={() => setEdit(p)} className={`group w-full rounded-xl border px-3 py-2 text-left transition hover:border-ocean ${p.isActive ? "border-slate-100" : "border-dashed border-slate-200 opacity-50"}`}>
                        <p className="flex items-center justify-between font-extrabold text-navy">
                          {peso(p.price)} <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-ocean" />
                        </p>
                        <p className="text-[11px] text-navy-400">
                          {p.containerPrice ? `new ${peso(p.containerPrice)}` : "no container"} {p.depositPrice ? `· dep ${peso(p.depositPrice)}` : ""}
                        </p>
                        <div className="mt-1 flex gap-1">
                          {p.isPopular && <Badge variant="success">Popular</Badge>}
                          {!p.isActive && <Badge variant="outline">Hidden</Badge>}
                        </div>
                      </button>
                    ) : (
                      <button onClick={() => setEdit(blank(c, WATER_TYPES[i]))} className="grid w-full place-items-center rounded-xl border border-dashed border-slate-200 py-4 text-slate-300 hover:border-ocean hover:text-ocean">
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-ocean" /> Delivery & deposits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Delivery fee per km (₱)</Label>
                {num("deliveryFeePerKm")}
              </div>
              <div>
                <Label>Base delivery fee (₱)</Label>
                {num("baseDeliveryFee")}
              </div>
              <div>
                <Label>Free delivery radius (km)</Label>
                {num("freeDeliveryRadiusKm")}
              </div>
              <div>
                <Label>Free delivery threshold (₱ order)</Label>
                {num("freeDeliveryThreshold")}
              </div>
              <div>
                <Label>Max delivery distance (km)</Label>
                {num("maxDeliveryKm")}
              </div>
              <div>
                <Label>Gallon deposit fee (₱)</Label>
                {num("gallonDepositFee")}
                <label className="mt-1.5 flex items-center gap-2 text-xs text-navy-500">
                  <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} /> Apply to all returnable products
                </label>
              </div>
              <div>
                <Label>Refills for 1 FREE refill</Label>
                {num("loyaltyRefillsForFree")}
              </div>
              <div>
                <Label>Referral reward (points)</Label>
                {num("referralRewardPoints")}
              </div>
            </div>
            <Button disabled={pending} onClick={() => run(() => saveFeesAction({ ...fees, applyDepositToAll: applyAll }), "Pricing settings saved")}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee preview</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[0.8, 1.5, 2.5, 3.5, 5, 8, 12].map((km) => {
                const f = computeDeliveryFee(km, 0, fees);
                return (
                  <li key={km} className="flex items-center justify-between rounded-xl bg-mist px-3 py-2">
                    <span>{km} km</span>
                    <span className="font-bold">{km > fees.maxDeliveryKm ? <span className="text-rose-600">Out of area</span> : f.fee === 0 ? <span className="text-emerald-600">FREE</span> : peso(f.fee)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-navy-400">Orders of {peso(fees.freeDeliveryThreshold)}+ always ship free.</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{edit?.id ? `Edit ${edit.name}` : "New product"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveProductAction(edit), "Product saved", () => setEdit(null));
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Name (EN)</Label>
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required placeholder="19L Round Refill" />
                </div>
                <div>
                  <Label>Name (TL)</Label>
                  <Input value={edit.nameTl} onChange={(e) => setEdit({ ...edit, nameTl: e.target.value })} placeholder="19L Round na Refill" />
                </div>
                <div>
                  <Label>Size</Label>
                  <Select value={edit.container} onValueChange={(v) => setEdit({ ...edit, container: v as ContainerType, isReturnable: v !== "BOTTLED_CASE", sizeLabel: CONTAINER_LABEL[v as ContainerType] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAINERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CONTAINER_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Water type</Label>
                  <Select value={edit.waterType} onValueChange={(v) => setEdit({ ...edit, waterType: v as WaterType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WATER_TYPES.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Size label</Label>
                  <Input value={edit.sizeLabel} onChange={(e) => setEdit({ ...edit, sizeLabel: e.target.value })} />
                </div>
                <div>
                  <Label>Liters</Label>
                  <Input type="number" min={0} step="0.5" value={edit.liters} onChange={(e) => setEdit({ ...edit, liters: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Water / refill price ₱</Label>
                  <Input type="number" min={0} step="0.5" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>New container price ₱</Label>
                  <Input type="number" min={0} step="0.5" value={edit.containerPrice} onChange={(e) => setEdit({ ...edit, containerPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Deposit ₱</Label>
                  <Input type="number" min={0} step="0.5" value={edit.depositPrice} onChange={(e) => setEdit({ ...edit, depositPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input type="number" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-5 rounded-2xl bg-mist p-3 text-sm font-semibold">
                <label className="flex items-center gap-2">
                  <Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Visible
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={edit.isPopular} onCheckedChange={(v) => setEdit({ ...edit, isPopular: v })} /> Popular badge
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={edit.isReturnable} onCheckedChange={(v) => setEdit({ ...edit, isReturnable: v })} /> Returnable gallon
                </label>
              </div>
              <div className="flex justify-between">
                {edit.id ? (
                  <Button type="button" variant="ghost" className="text-rose-600" onClick={() => confirm("Delete product? (Hidden if it has orders)") && run(() => deleteProductAction(edit.id!), "Product removed", () => setEdit(null))}>
                    <Trash2 /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />} Save product
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
