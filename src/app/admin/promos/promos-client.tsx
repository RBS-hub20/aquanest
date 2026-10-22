"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/page-header";
import { cn, peso } from "@/lib/utils";
import { deletePromoAction, savePromoAction } from "../actions";

type Promo = { id?: string; code: string; description: string; type: "PERCENT" | "FIXED"; value: number; minOrder: number; maxUses: number | null; usedCount?: number; expiresAt: string | null; isActive: boolean; orders?: number };

export function PromosClient({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Promo | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(msg);
      after?.();
      router.refresh();
    });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promo Codes"
        subtitle="Percentage or fixed-amount discounts customers enter at checkout"
        actions={
          <Button onClick={() => setEdit({ code: "", description: "", type: "PERCENT", value: 10, minOrder: 0, maxUses: null, expiresAt: null, isActive: true })}>
            <Plus /> New promo
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {promos.map((p) => {
          const expired = p.expiresAt && p.expiresAt < today;
          const maxed = p.maxUses != null && (p.usedCount ?? 0) >= p.maxUses;
          return (
            <Card key={p.id} className={cn("relative overflow-hidden p-0", (!p.isActive || expired || maxed) && "opacity-60")}>
              <div className="flex">
                <div className="grid w-28 shrink-0 place-items-center bg-brand-gradient p-4 text-center text-white">
                  <div>
                    <p className="text-3xl font-extrabold">{p.type === "PERCENT" ? `${p.value}%` : `₱${p.value}`}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">off</p>
                  </div>
                </div>
                <div className="relative flex-1 border-l-2 border-dashed border-slate-200 p-4">
                  <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-[#F6F9FC]" />
                  <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full bg-[#F6F9FC]" />
                  <button onClick={() => setEdit(p)} className="font-mono text-lg font-extrabold tracking-wider text-navy hover:text-ocean">
                    {p.code}
                  </button>
                  <p className="line-clamp-1 text-xs text-navy-400">{p.description || "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.minOrder > 0 && <Badge variant="outline">min {peso(p.minOrder)}</Badge>}
                    <Badge variant="default">
                      {p.usedCount}
                      {p.maxUses ? `/${p.maxUses}` : ""} used
                    </Badge>
                    {expired && <Badge variant="danger">Expired</Badge>}
                    {maxed && <Badge variant="warning">Maxed</Badge>}
                    {p.expiresAt && !expired && <Badge variant="outline">until {p.expiresAt}</Badge>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Switch checked={p.isActive} onCheckedChange={(v) => run(() => savePromoAction({ ...(p as Required<Promo>), isActive: v }), v ? "Promo enabled" : "Promo paused")} />
                    <Button size="icon-sm" variant="ghost" onClick={() => confirm(`Delete ${p.code}?`) && run(() => deletePromoAction(p.id!), "Promo removed")} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? `Edit ${edit.code}` : "New promo code"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => savePromoAction({ id: edit.id, code: edit.code, description: edit.description, type: edit.type, value: edit.value, minOrder: edit.minOrder, maxUses: edit.maxUses, expiresAt: edit.expiresAt, isActive: edit.isActive }), "Promo saved", () => setEdit(null));
              }}
            >
              <div>
                <Label>Code</Label>
                <Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className="font-mono uppercase" placeholder="SUKI20" required />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["PERCENT", "FIXED"] as const).map((t) => (
                  <button type="button" key={t} onClick={() => setEdit({ ...edit, type: t })} className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ring-1", edit.type === t ? "bg-ocean text-white ring-ocean" : "ring-slate-200")}>
                    {t === "PERCENT" ? <Percent className="h-4 w-4" /> : <Tag className="h-4 w-4" />} {t === "PERCENT" ? "Percent" : "Fixed ₱"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{edit.type === "PERCENT" ? "Percent off" : "Amount off ₱"}</Label>
                  <Input type="number" min={1} step="0.5" value={edit.value} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Minimum order ₱</Label>
                  <Input type="number" min={0} value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max uses (blank = ∞)</Label>
                  <Input type="number" min={1} value={edit.maxUses ?? ""} onChange={(e) => setEdit({ ...edit, maxUses: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Expires</Label>
                  <Input type="date" value={edit.expiresAt ?? ""} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value || null })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Save promo
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
