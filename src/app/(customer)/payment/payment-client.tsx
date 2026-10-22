"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { FadeIn } from "@/components/shared/reveal";
import { cn, peso } from "@/lib/utils";
import { setPreferredPaymentAction } from "../actions";
import type { PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";

export function PaymentClient({
  preferred,
  balance,
  deposit,
  store,
  unpaid,
}: {
  preferred: PaymentMethod;
  balance: number;
  deposit: number;
  store: { gcashName: string; gcashNumber: string; gcashQrUrl: string | null; mayaName: string; mayaNumber: string; mayaQrUrl: string | null };
  unpaid: { id: string; code: string; total: number; paymentStatus: PaymentStatus; paymentMethod: PaymentMethod; status: OrderStatus }[];
}) {
  const t = useTranslations("payment");
  const te = useTranslations("enums");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");
  const router = useRouter();
  const [primary, setPrimary] = useState(preferred);
  const [pending, start] = useTransition();

  const methods = [
    { key: "COD" as const, body: t("codBody") },
    { key: "GCASH" as const, body: t("gcashBody") },
    { key: "MAYA" as const, body: t("mayaBody") },
  ];

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v.replace(/\s/g, ""));
    toast.success(tc("copied"));
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
        <p className="text-sm text-navy-400">{t("subtitle")}</p>
      </FadeIn>

      <div className="grid gap-4 md:grid-cols-3">
        {methods.map((m, i) => {
          const isPrimary = primary === m.key;
          return (
            <FadeIn key={m.key} delay={i * 0.05}>
              <Card className={cn("relative h-full p-5 transition", isPrimary && "ring-2 ring-ocean")}>
                <div className="flex items-start justify-between">
                  <PaymentLogo method={m.key} />
                  {isPrimary && (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" /> {tc("primary")}
                    </Badge>
                  )}
                </div>
                <p className="mt-4 font-bold">{te(`payment.${m.key}`)}</p>
                <p className="mt-1 text-sm text-navy-400">{m.body}</p>
                <Button
                  variant={isPrimary ? "secondary" : "outline"}
                  className="mt-4 w-full"
                  disabled={isPrimary || pending}
                  onClick={() =>
                    start(async () => {
                      setPrimary(m.key);
                      await setPreferredPaymentAction(m.key);
                      toast.success(t("updated"));
                      router.refresh();
                    })
                  }
                >
                  {isPrimary ? t("isPrimary") : t("setPrimary")}
                </Button>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>{t("qrTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["GCASH", store.gcashName, store.gcashNumber, store.gcashQrUrl, "#0B5AD8"],
                  ["MAYA", store.mayaName, store.mayaNumber, store.mayaQrUrl, "#0E0E0E"],
                ] as const
              ).map(([key, name, number, qr, color]) => (
                <div key={key} className="rounded-2xl bg-mist p-4 text-center">
                  <PaymentLogo method={key} className="mx-auto" />
                  <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-soft">
                    {qr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr} alt={`${key} QR`} className="h-40 w-40 object-contain" />
                    ) : (
                      <QRCodeSVG value={`${key}|${number}|${name}`} size={156} fgColor={color} imageSettings={{ src: "/brand/logo-icon.png", height: 30, width: 34, excavate: true }} />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold">{name}</p>
                  <button onClick={() => copy(number)} className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-bold text-ocean">
                    {number} <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("balances")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn("flex items-center gap-3 rounded-2xl p-4", balance > 0 ? "bg-rose-50" : "bg-emerald-50")}>
                <Wallet className={cn("h-6 w-6", balance > 0 ? "text-rose-600" : "text-emerald-600")} />
                <div className="flex-1">
                  <p className="text-xs text-navy-500">{t("utang")}</p>
                  <p className="text-xl font-extrabold">{peso(balance)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-mist p-4">
                <Landmark className="h-6 w-6 text-ocean" />
                <div className="flex-1">
                  <p className="text-xs text-navy-500">{t("depositHeld")}</p>
                  <p className="text-xl font-extrabold">{peso(deposit)}</p>
                </div>
              </div>
              {unpaid.length > 0 && (
                <ul className="space-y-2 pt-2">
                  {unpaid.map((o) => (
                    <li key={o.id}>
                      <Link href={`/orders/${o.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm hover:border-sky-200">
                        <span className="font-semibold">{o.code}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant={o.paymentStatus === "FOR_VERIFICATION" ? "warning" : "outline"}>{te(`paymentStatus.${o.paymentStatus}`)}</Badge>
                          <span className="font-bold">{peso(o.total)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <div className="flex items-center gap-3 rounded-2xl bg-mist p-4">
            <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-500" />
            <p className="text-xs text-navy-500">{td("securePaymentBody")}</p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
