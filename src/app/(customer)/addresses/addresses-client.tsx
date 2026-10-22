"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Briefcase, Crosshair, Home, Loader2, MapPin, MoreVertical, Pencil, Plus, Star, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapView } from "@/components/maps/map-view";
import { FadeIn } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { computeDeliveryFee, type PricingSettings } from "@/lib/pricing";
import { estimateRoadKm } from "@/lib/geo";
import { peso } from "@/lib/utils";
import { deleteAddressAction, estimateDistanceAction, saveAddressAction, setPrimaryAddressAction } from "../actions";

interface Addr {
  id?: string;
  label: string;
  line1: string;
  barangay: string;
  city: string;
  province: string;
  landmark: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  isPrimary?: boolean;
}

const LABELS = [
  { v: "Home", icon: Home },
  { v: "Office", icon: Briefcase },
  { v: "Other", icon: MapPin },
];

export function AddressesClient({ addresses, store, pricing, maxKm }: { addresses: Addr[]; store: { lat: number; lng: number }; pricing: PricingSettings; maxKm: number }) {
  const t = useTranslations("address");
  const tc = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState<Addr | null>(null);
  const [pending, start] = useTransition();
  const [km, setKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const blank = (): Addr => ({ label: "Home", line1: "", barangay: "", city: "Pasig City", province: "Metro Manila", landmark: "", lat: store.lat + 0.006, lng: store.lng - 0.012 });

  // live distance preview while dragging the pin
  useEffect(() => {
    if (!editing) return;
    setKm(estimateRoadKm(store, editing));
    const id = setTimeout(async () => setKm(await estimateDistanceAction(editing.lat, editing.lng)), 600);
    return () => clearTimeout(id);
  }, [editing?.lat, editing?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const fee = km != null ? computeDeliveryFee(km, 0, pricing) : null;

  const save = () => {
    if (!editing) return;
    if (!editing.line1.trim() || !editing.city.trim()) return toast.error(tc("required"));
    start(async () => {
      const r = await saveAddressAction({ ...editing, isPrimary: editing.isPrimary });
      if (!r.ok) return void toast.error(r.error);
      toast.success(t("saved"));
      setEditing(null);
      router.refresh();
    });
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setEditing((e) => (e ? { ...e, lat: p.coords.latitude, lng: p.coords.longitude } : e));
        setLocating(false);
      },
      () => {
        toast.error("Location permission denied");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      <FadeIn className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
          <p className="text-sm text-navy-400">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(blank())}>
          <Plus /> {t("add")}
        </Button>
      </FadeIn>

      {addresses.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={t("empty")}
            body={t("subtitle")}
            action={
              <Button onClick={() => setEditing(blank())}>
                <Plus /> {t("add")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a, i) => {
            const Icon = LABELS.find((l) => l.v === a.label)?.icon ?? MapPin;
            const f = computeDeliveryFee(a.distanceKm ?? 0, 0, pricing);
            return (
              <FadeIn key={a.id} delay={i * 0.05}>
                <Card className="overflow-hidden">
                  <div className="h-40">
                    <MapView center={a} zoom={14} markers={[{ id: "s", kind: "store", ...store }, { id: "h", kind: "home", lat: a.lat, lng: a.lng }]} fitToMarkers className="rounded-none" />
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ocean-50 text-ocean">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-bold">
                        {a.label} {a.isPrimary && <Badge variant="success">{tc("primary")}</Badge>}
                      </p>
                      <p className="text-sm text-navy-500">
                        {a.line1}, {a.barangay && `${a.barangay}, `}
                        {a.city}
                      </p>
                      {a.landmark && <p className="text-xs text-navy-400">📍 {a.landmark}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-mist px-2 py-1 font-semibold text-ocean">{a.distanceKm} km</span>
                        <span className="flex items-center gap-1 rounded-lg bg-mist px-2 py-1 font-semibold text-navy-500">
                          <Truck className="h-3 w-3" /> {f.fee === 0 ? "FREE" : peso(f.fee)}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="grid h-9 w-9 place-items-center rounded-xl hover:bg-mist" aria-label="Actions">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(a)}>
                          <Pencil /> {tc("edit")}
                        </DropdownMenuItem>
                        {!a.isPrimary && (
                          <DropdownMenuItem
                            onSelect={() =>
                              start(async () => {
                                await setPrimaryAddressAction(a.id!);
                                router.refresh();
                              })
                            }
                          >
                            <Star /> {tc("makePrimary")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                          onSelect={() =>
                            start(async () => {
                              if (!confirm(`${tc("delete")} "${a.label}"?`)) return;
                              await deleteAddressAction(a.id!);
                              toast.success(t("deleted"));
                              router.refresh();
                            })
                          }
                        >
                          <Trash2 /> {tc("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("editTitle") : t("add")}</DialogTitle>
            <DialogDescription>{t("pinHint")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="relative h-64 overflow-hidden rounded-2xl ring-1 ring-slate-100">
                <MapView
                  center={{ lat: editing.lat, lng: editing.lng }}
                  zoom={15}
                  markers={[
                    { id: "s", kind: "store", ...store },
                    { id: "h", kind: "home", lat: editing.lat, lng: editing.lng, draggable: true },
                  ]}
                  onPick={(p) => setEditing((e) => (e ? { ...e, lat: p.lat, lng: p.lng } : e))}
                />
                <Button size="sm" variant="white" className="absolute bottom-3 left-3 z-[500]" onClick={locate} disabled={locating}>
                  {locating ? <Loader2 className="animate-spin" /> : <Crosshair />} {t("useMyLocation")}
                </Button>
              </div>
              <motion.div layout className="grid grid-cols-2 gap-3 rounded-2xl bg-mist p-3 text-sm">
                <div>
                  <p className="text-xs text-navy-400">{t("distance")}</p>
                  <p className="font-bold">{km != null ? `${km} km` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-400">{t("fee")}</p>
                  <p className="font-bold">{km != null && km > maxKm ? <span className="text-rose-600">{t("tooFar", { max: maxKm })}</span> : fee ? (fee.fee === 0 ? "FREE" : peso(fee.fee)) : "—"}</p>
                </div>
              </motion.div>
              <div>
                <Label>{t("label")}</Label>
                <div className="flex gap-2">
                  {LABELS.map(({ v, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditing({ ...editing, label: v })}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${editing.label === v ? "bg-ocean text-white ring-ocean" : "ring-slate-200"}`}
                    >
                      <Icon className="h-4 w-4" /> {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="line1">{t("line1")}</Label>
                  <Input id="line1" value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} placeholder="Blk 4 Lot 12, Sampaguita St." />
                </div>
                <div>
                  <Label htmlFor="brgy">{t("barangay")}</Label>
                  <Input id="brgy" value={editing.barangay} onChange={(e) => setEditing({ ...editing, barangay: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input id="city" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="prov">{t("province")}</Label>
                  <Input id="prov" value={editing.province} onChange={(e) => setEditing({ ...editing, province: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lm">{t("landmark")}</Label>
                  <Input id="lm" value={editing.landmark} onChange={(e) => setEditing({ ...editing, landmark: e.target.value })} placeholder="Near 7-Eleven" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  {tc("cancel")}
                </Button>
                <Button onClick={save} disabled={pending || (km != null && km > maxKm)}>
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
