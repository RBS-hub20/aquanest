"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CreditCard, ImageIcon, Loader2, MapPin, Plus, Repeat, Save, Store, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUpload } from "@/components/shared/image-upload";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { MapView } from "@/components/maps/map-view";
import { LogoMark } from "@/components/brand/logo";
import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { runSubscriptionsNowAction, saveSettingsAction } from "../actions";

type S = {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  phone: string;
  email: string;
  website: string;
  address: string;
  lat: number;
  lng: number;
  gcashName: string;
  gcashNumber: string;
  gcashQrUrl: string | null;
  mayaName: string;
  mayaNumber: string;
  mayaQrUrl: string | null;
  openTime: string;
  closeTime: string;
  operatingDays: number[];
  autoClose: boolean;
  manualClosed: boolean;
  timeSlots: string[];
};

export function SettingsClient({ settings, openNow }: { settings: S & Record<string, unknown>; openNow: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<S>(settings);
  const [logo, setLogo] = useState<File | null>(null);
  const [gcashQr, setGcashQr] = useState<File | null>(null);
  const [mayaQr, setMayaQr] = useState<File | null>(null);
  const [clear, setClear] = useState({ gcash: false, maya: false });
  const [slot, setSlot] = useState({ from: "19:00", to: "21:00" });
  const [pending, start] = useTransition();
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));

  const save = () =>
    start(async () => {
      const fd = new FormData();
      const { logoUrl, gcashQrUrl, mayaQrUrl, ...data } = s;
      fd.set("data", JSON.stringify(data));
      if (logo) fd.set("logo", logo);
      if (gcashQr) fd.set("gcashQr", gcashQr);
      if (mayaQr) fd.set("mayaQr", mayaQr);
      if (clear.gcash) fd.set("clearGcashQr", "1");
      if (clear.maya) fd.set("clearMayaQr", "1");
      const r = await saveSettingsAction(fd);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Store settings saved");
      setLogo(null);
      setGcashQr(null);
      setMayaQr(null);
      router.refresh();
    });

  const field = (k: keyof S, label: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <Label>{label}</Label>
      <Input value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} {...props} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Settings"
        subtitle={openNow ? "🟢 Currently accepting ASAP orders" : "🔴 Currently closed — customers can only schedule"}
        actions={
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save all
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-ocean" /> Store profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl bg-mist p-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.logoUrl ? <img src={s.logoUrl} alt="Logo" className="h-12 w-12 object-contain" /> : <LogoMark size={48} />}
              </div>
              <ImageUpload value={logo} onChange={setLogo} label="Upload logo" hint="PNG with transparency works best" className="flex-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("storeName", "Store name")}
              {field("tagline", "Tagline")}
              {field("phone", "Phone")}
              {field("email", "Email", { type: "email" })}
              {field("website", "Website")}
            </div>
            {field("address", "Address")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-ocean" /> Station location
            </CardTitle>
            <span className="text-xs text-navy-400">Delivery distance is measured from here</span>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <MapView center={{ lat: s.lat, lng: s.lng }} zoom={15} markers={[{ id: "s", kind: "store", lat: s.lat, lng: s.lng, draggable: true }]} onPick={(p) => setS((x) => ({ ...x, lat: p.lat, lng: p.lng }))} />
            </div>
            <p className="mt-2 font-mono text-xs text-navy-400">
              {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-ocean" /> Operating hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field("openTime", "Opens", { type: "time" })}
              {field("closeTime", "Closes", { type: "time" })}
            </div>
            <div>
              <Label>Open days</Label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((d, i) => {
                  const on = s.operatingDays.includes(i);
                  return (
                    <button key={d} type="button" onClick={() => set("operatingDays", on ? s.operatingDays.filter((x) => x !== i) : [...s.operatingDays, i].sort())} className={cn("h-10 flex-1 rounded-xl text-xs font-bold", on ? "bg-ocean text-white" : "bg-mist text-navy-400")}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-2xl bg-mist p-3">
              <span>
                <span className="block text-sm font-bold">Auto-close</span>
                <span className="block text-xs text-navy-400">Stop ASAP orders outside operating hours</span>
              </span>
              <Switch checked={s.autoClose} onCheckedChange={(v) => set("autoClose", v)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-rose-50 p-3">
              <span>
                <span className="block text-sm font-bold text-rose-700">Close store now</span>
                <span className="block text-xs text-rose-600/80">Brownout, holiday or out of water</span>
              </span>
              <Switch checked={s.manualClosed} onCheckedChange={(v) => set("manualClosed", v)} />
            </label>
            <div>
              <Label>Delivery time slots</Label>
              <div className="flex flex-wrap gap-2">
                {s.timeSlots.map((t) => (
                  <Badge key={t} variant="default" className="gap-1.5 py-1 text-xs">
                    {t}
                    <button onClick={() => set("timeSlots", s.timeSlots.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input type="time" value={slot.from} onChange={(e) => setSlot({ ...slot, from: e.target.value })} className="w-32" />
                <span>–</span>
                <Input type="time" value={slot.to} onChange={(e) => setSlot({ ...slot, to: e.target.value })} className="w-32" />
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    const v = `${slot.from}-${slot.to}`;
                    if (slot.from >= slot.to || s.timeSlots.includes(v)) return toast.error("Invalid slot");
                    set("timeSlots", [...s.timeSlots, v].sort());
                  }}
                  aria-label="Add slot"
                >
                  <Plus />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await runSubscriptionsNowAction();
                  if (r.ok) toast.success(`Suki Mode: ${r.data?.created ?? 0} order(s) created for today`);
                })
              }
            >
              <Repeat /> Run Suki Mode for today
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-ocean" /> GCash & Maya
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["GCASH", "gcashName", "gcashNumber", "gcashQrUrl", gcashQr, setGcashQr, "gcash"],
                ["MAYA", "mayaName", "mayaNumber", "mayaQrUrl", mayaQr, setMayaQr, "maya"],
              ] as const
            ).map(([m, nameK, numK, qrK, file, setFile, ck]) => (
              <div key={m} className="space-y-3 rounded-2xl bg-mist p-4">
                <PaymentLogo method={m} />
                {field(nameK, "Account name")}
                {field(numK, "Number")}
                {s[qrK] && !clear[ck] && !file ? (
                  <div className="relative rounded-2xl bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s[qrK]!} alt={`${m} QR`} className="mx-auto h-40 object-contain" />
                    <button onClick={() => setClear({ ...clear, [ck]: true })} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-mist" aria-label="Remove QR">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <ImageUpload value={file} onChange={setFile} label={`Upload ${m === "GCASH" ? "GCash" : "Maya"} QR`} hint="Customers scan this at checkout" />
                )}
                {!s[qrK] && !file && (
                  <p className="flex items-center gap-1.5 text-[11px] text-navy-400">
                    <ImageIcon className="h-3.5 w-3.5" /> Until uploaded, a branded QR with your number is shown.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
