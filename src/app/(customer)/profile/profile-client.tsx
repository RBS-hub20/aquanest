"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Copy, Gift, Loader2, Share2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/avatar";
import { ProductImage } from "@/components/brand/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { FadeIn } from "@/components/shared/reveal";
import { cn, displayPhone, peso } from "@/lib/utils";
import { applyReferralAction, updateProfileAction } from "../actions";
import type { ContainerType } from "@prisma/client";

export function ProfileClient({
  user,
  gallons,
  loyalty,
  history,
}: {
  user: { name: string; email: string; phone: string; referralCode: string; referred: boolean; balance: number; deposit: number; avatarUrl: string | null };
  gallons: { container: ContainerType; owned: number; borrowed: number }[];
  loyalty: { balance: number; target: number; referralPoints: number; referrals: number };
  history: { id: string; points: number; type: string; note: string; createdAt: string }[];
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const ts = useTranslations("support");
  const f = useFormatter();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const progress = loyalty.balance % loyalty.target;
  const free = Math.floor(loyalty.balance / loyalty.target);
  const R = 52;
  const C = 2 * Math.PI * R;

  const share = async () => {
    const text = `Order malinis na tubig from AquaNest 💧 Use my code ${user.referralCode} on sign up!`;
    if (navigator.share) await navigator.share({ title: "AquaNest", text, url: window.location.origin }).catch(() => {});
    else {
      navigator.clipboard?.writeText(text);
      toast.success(tc("copied"));
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
        <p className="text-sm text-navy-400">{t("subtitle")}</p>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account */}
        <FadeIn>
          <Card className="h-full">
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center gap-4">
                <UserAvatar src={user.avatarUrl} name={user.name} className="h-16 w-16 text-lg" />
                <div>
                  <p className="text-lg font-extrabold">{user.name}</p>
                  <p className="text-sm text-navy-400">{displayPhone(user.phone)}</p>
                </div>
              </div>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => {
                    const r = await updateProfileAction({ name, email });
                    if (!r.ok) return void toast.error(r.error);
                    toast.success(t("saved"));
                    router.refresh();
                  });
                }}
              >
                <div>
                  <Label htmlFor="n">{t("name")}</Label>
                  <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="e">{t("email")}</Label>
                  <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div>
                  <Label>{t("phone")}</Label>
                  <Input value={displayPhone(user.phone)} disabled />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />} {tc("save")}
                </Button>
              </form>
              <div className="flex items-center justify-between rounded-2xl bg-mist p-3">
                <span className="text-sm font-semibold">{t("language")}</span>
                <LanguageToggle />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={cn("rounded-2xl p-3", user.balance > 0 ? "bg-rose-50" : "bg-emerald-50")}>
                  <p className="text-xs text-navy-500">{t("utang")}</p>
                  <p className="font-extrabold">{peso(user.balance)}</p>
                </div>
                <div className="rounded-2xl bg-mist p-3">
                  <p className="text-xs text-navy-500">{t("deposit")}</p>
                  <p className="font-extrabold">{peso(user.deposit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Gallon tracker */}
        <FadeIn delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("gallonTracker")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gallons.filter((g) => g.owned + g.borrowed > 0).length === 0 && <EmptyState size="sm" title={t("noGallons")} />}
              {gallons
                .filter((g) => g.owned + g.borrowed > 0)
                .map((g) => (
                  <div key={g.container} className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-mist to-white p-3 ring-1 ring-sky-100">
                    <div className="h-24 w-20 shrink-0">
                      <ProductImage container={g.container} float sizes="80px" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{t("withYou")}</p>
                      <p className="text-xl font-extrabold">
                        {g.owned + g.borrowed} <span className="text-base">{te(`container.${g.container}`)}</span>
                      </p>
                      <div className="mt-1 flex gap-2 text-xs">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          {g.owned} {t("owned")}
                        </span>
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                          {g.borrowed} {t("borrowed")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              <p className="text-xs text-navy-400">💡 {ts("a2")}</p>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Loyalty */}
        <FadeIn delay={0.1}>
          <Card className="h-full overflow-hidden">
            <div className="relative bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-5 text-white">
              <p className="flex items-center gap-2 font-bold">
                <Gift className="h-5 w-5" /> {t("loyalty")}
              </p>
              <div className="mt-3 flex items-center gap-5">
                <svg width="124" height="124" viewBox="0 0 124 124" className="-rotate-90">
                  <circle cx="62" cy="62" r={R} stroke="rgba(255,255,255,.25)" strokeWidth="12" fill="none" />
                  <motion.circle
                    cx="62"
                    cy="62"
                    r={R}
                    stroke="white"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    initial={{ strokeDashoffset: C }}
                    animate={{ strokeDashoffset: C * (1 - progress / loyalty.target) }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div>
                  <p className="text-4xl font-extrabold">
                    {progress}
                    <span className="text-lg text-white/80">/{loyalty.target}</span>
                  </p>
                  <p className="text-sm text-white/90">{t("points")}</p>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold backdrop-blur">
                {free > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> {t("freeAvailable", { count: free })}
                  </span>
                ) : (
                  t("toFree", { left: loyalty.target - progress })
                )}
              </p>
            </div>
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-bold">{t("referral")}</p>
              <p className="text-xs text-navy-400">{t("referralBody", { points: loyalty.referralPoints })}</p>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-sky-200 bg-mist p-3">
                <span className="flex-1 font-mono text-lg font-extrabold tracking-widest text-ocean">{user.referralCode}</span>
                <Button size="icon-sm" variant="ghost" onClick={() => (navigator.clipboard?.writeText(user.referralCode), toast.success(tc("copied")))} aria-label={tc("copy")}>
                  <Copy />
                </Button>
                <Button size="icon-sm" onClick={share} aria-label="Share">
                  <Share2 />
                </Button>
              </div>
              <p className="text-xs text-navy-400">👥 {loyalty.referrals} referral(s)</p>
              {!user.referred && (
                <div className="flex gap-2">
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t("haveCode")} className="uppercase" />
                  <Button
                    variant="secondary"
                    disabled={!code || pending}
                    onClick={() =>
                      start(async () => {
                        const r = await applyReferralAction(code);
                        if (!r.ok) return void toast.error(r.error === "INVALID" ? t("codeInvalid") : r.error);
                        toast.success(t("codeApplied"));
                        router.refresh();
                      })
                    }
                  >
                    <UserPlus /> {t("applyCode")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.15}>
        <Card>
          <CardHeader>
            <CardTitle>{t("history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {history.slice(0, 12).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold">{h.note || h.type}</p>
                    <p className="text-xs text-navy-400">{f.dateTime(new Date(h.createdAt), { dateStyle: "medium" })}</p>
                  </div>
                  <span className={cn("rounded-lg px-2.5 py-1 text-sm font-bold", h.points > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                    {h.points > 0 ? "+" : ""}
                    {h.points}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
