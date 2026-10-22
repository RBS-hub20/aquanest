"use client";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bike, Camera, Clock, Loader2, MapPin, Pencil, Phone, Plus, Star, Timer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/page-header";
import { RidersMap } from "@/components/admin/riders-map";
import { displayPhone, peso } from "@/lib/utils";
import { saveRiderAction, toggleRiderAction, uploadRiderPhotoAction } from "../actions";

type Rider = {
  id: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  area: string;
  vehicle: string;
  plateNumber: string;
  isActive: boolean;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  rating: number;
  lastSeenAt: string | null;
  active: number;
  today: number;
  month: number;
  cashToday: number;
  ewalletToday: number;
  avgMins: number | null;
};

export function RidersClient({ riders, store }: { riders: Rider[]; store: { lat: number; lng: number } }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<Rider> | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);

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
        title="Rider Management"
        subtitle={`${riders.filter((r) => r.isOnline).length} online · ${riders.filter((r) => r.isActive).length} active riders`}
        actions={
          <Button onClick={() => setEdit({ name: "", phone: "", area: "", vehicle: "Motorcycle", plateNumber: "" })}>
            <Plus /> Add rider
          </Button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f || !photoFor) return;
          const fd = new FormData();
          fd.set("file", f);
          run(() => uploadRiderPhotoAction(photoFor, fd), "Photo updated");
          e.target.value = "";
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 md:grid-cols-2">
          {riders.map((r) => (
            <Card key={r.id} className={`overflow-hidden ${!r.isActive ? "opacity-60" : ""}`}>
              <div className="relative bg-navy-gradient p-5 text-white">
                <div className="flex items-center gap-4">
                  <button
                    className="group relative h-16 w-16 overflow-hidden rounded-2xl bg-white ring-2 ring-white/40"
                    onClick={() => {
                      setPhotoFor(r.id);
                      fileRef.current?.click();
                    }}
                    aria-label="Change photo"
                  >
                    <Image src={r.photoUrl ?? "/brand/rider-ivan.svg"} alt={r.name} fill className="object-cover" />
                    <span className="absolute inset-0 hidden place-items-center bg-navy/50 group-hover:grid">
                      <Camera className="h-5 w-5" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-extrabold">{r.name}</p>
                    <p className="flex items-center gap-1 text-xs text-white/75">
                      <Phone className="h-3 w-3" /> {displayPhone(r.phone)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/75">
                      <Star className="h-3 w-3 fill-amber-300 text-amber-300" /> {r.rating.toFixed(1)} · {r.vehicle} {r.plateNumber && `· ${r.plateNumber}`}
                    </p>
                  </div>
                  <Badge variant={r.isOnline ? "solid" : "outline"} className={r.isOnline ? "" : "border-white/30 text-white/80"}>
                    {r.isOnline ? "● Online" : "Offline"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="flex items-center gap-1.5 text-sm text-navy-500">
                  <MapPin className="h-4 w-4 text-ocean" /> {r.area}
                  {r.lastSeenAt && <span className="text-xs text-navy-400">· seen {formatDistanceToNow(new Date(r.lastSeenAt), { addSuffix: true })}</span>}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    [Bike, r.active, "On road"],
                    [Clock, r.today, "Today"],
                    [Timer, r.avgMins != null ? `${r.avgMins}m` : "—", "Avg time"],
                    [Star, r.month, "30 days"],
                  ].map(([Icon, v, l], i) => {
                    const I = Icon as typeof Bike;
                    return (
                      <div key={i} className="rounded-xl bg-mist p-2">
                        <I className="mx-auto h-4 w-4 text-ocean" />
                        <p className="mt-1 text-base font-extrabold">{v as string}</p>
                        <p className="text-[10px] text-navy-400">{l as string}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <Wallet className="h-4 w-4" /> Collected today
                  </span>
                  <span className="font-bold text-emerald-800">
                    {peso(r.cashToday)} cash · {peso(r.ewalletToday)} e-wallet
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Switch checked={r.isActive} onCheckedChange={(v) => run(() => toggleRiderAction(r.id, v), v ? "Rider activated" : "Rider deactivated")} /> Active
                  </label>
                  <Button size="sm" variant="secondary" onClick={() => setEdit(r)}>
                    <Pencil /> Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-[520px] overflow-hidden p-0 xl:sticky xl:top-24">
          <RidersMap store={store} riders={riders.map((r) => ({ id: r.id, name: r.name, lat: r.lat, lng: r.lng, isOnline: r.isOnline }))} />
        </Card>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit rider" : "Add rider"}</DialogTitle>
            <DialogDescription>Riders log in at /rider with their mobile number.</DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => saveRiderAction({ id: edit.id, name: edit.name ?? "", phone: edit.phone ?? "", area: edit.area ?? "", vehicle: edit.vehicle ?? "", plateNumber: edit.plateNumber }),
                  "Rider saved",
                  () => setEdit(null)
                );
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input value={edit.phone ? displayPhone(edit.phone) || edit.phone : ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="0917 123 4567" required />
                </div>
                <div>
                  <Label>Assigned area</Label>
                  <Input value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} placeholder="Kapitolyo · Ortigas" required />
                </div>
                <div>
                  <Label>Vehicle</Label>
                  <Input value={edit.vehicle} onChange={(e) => setEdit({ ...edit, vehicle: e.target.value })} required />
                </div>
                <div>
                  <Label>Plate number</Label>
                  <Input value={edit.plateNumber} onChange={(e) => setEdit({ ...edit, plateNumber: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Save rider
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
