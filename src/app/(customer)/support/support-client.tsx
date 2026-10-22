"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { MapView } from "@/components/maps/map-view";
import { FadeIn } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";
import { sendSupportMessageAction } from "../actions";

export function SupportClient({ store }: { store: { phone: string; email: string; address: string; lat: number; lng: number; open: string; close: string } }) {
  const t = useTranslations("support");
  const [open, setOpen] = useState<number | null>(0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const tel = store.phone.replace(/\s/g, "");
  const contacts = [
    { icon: Phone, label: t("callUs"), value: store.phone, href: `tel:${tel}` },
    { icon: MessageCircle, label: t("textUs"), value: store.phone, href: `sms:${tel}` },
    { icon: Mail, label: t("email"), value: store.email, href: `mailto:${store.email}` },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
        <p className="flex items-center gap-1.5 text-sm text-navy-400">
          <Clock className="h-4 w-4" /> {t("subtitle")}
        </p>
      </FadeIn>
      <div className="grid gap-4 sm:grid-cols-3">
        {contacts.map((c, i) => (
          <FadeIn key={c.label} delay={i * 0.05}>
            <a href={c.href} className="card-premium flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <c.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">{c.label}</p>
                <p className="text-sm text-navy-400">{c.value}</p>
              </div>
            </a>
          </FadeIn>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>{t("faq")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3, 4, 5].map((n, i) => (
                <div key={n} className="overflow-hidden rounded-2xl border border-slate-100">
                  <button className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-bold" onClick={() => setOpen(open === i ? null : i)}>
                    {t(`q${n}` as "q1")}
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open === i && "rotate-180 text-ocean")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open === i && (
                      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden px-4 text-sm text-navy-500">
                        <span className="block pb-4">{t(`a${n}` as "a1")}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
        <div className="space-y-6">
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>{t("message")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t("messagePlaceholder")} rows={4} />
                <Button
                  className="w-full"
                  disabled={pending || msg.trim().length < 3}
                  onClick={() =>
                    start(async () => {
                      const r = await sendSupportMessageAction(msg);
                      if (!r.ok) return void toast.error(r.error);
                      toast.success(t("sent"));
                      setMsg("");
                    })
                  }
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Send />} {t("send")}
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Card className="overflow-hidden">
              <div className="h-48">
                <MapView center={store} zoom={16} markers={[{ id: "s", kind: "store", lat: store.lat, lng: store.lng }]} className="rounded-none" />
              </div>
              <div className="flex gap-3 p-4">
                <MapPin className="h-5 w-5 shrink-0 text-ocean" />
                <div>
                  <p className="text-sm font-bold">{t("visit")}</p>
                  <p className="text-sm text-navy-400">{store.address}</p>
                  <p className="text-xs text-navy-400">
                    {store.open} – {store.close}
                  </p>
                </div>
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
