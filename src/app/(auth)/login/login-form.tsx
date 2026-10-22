"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bike, Loader2, ShieldCheck, Smartphone, Store, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayPhone, isValidPhPhone, normalizePhone } from "@/lib/utils";
import { completeProfileAction, demoLoginAction, sendOtpAction, verifyOtpAction } from "./actions";

type Step = "phone" | "code" | "profile";

export function LoginForm({ demo, demoCode }: { demo: boolean; demoCode: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [referral, setReferral] = useState("");
  const [pending, start] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const go = (r: { ok: boolean; redirect?: string; needsProfile?: boolean; error?: string }) => {
    if (!r.ok) {
      toast.error(r.error === "INVALID_CODE" ? t("invalidCode") : r.error === "INVALID_PHONE" ? t("invalidPhone") : r.error);
      return;
    }
    if (r.needsProfile) return setStep("profile");
    if (r.redirect) {
      router.replace(r.redirect);
      router.refresh();
    }
  };

  const send = () => {
    if (!isValidPhPhone(phone)) return toast.error(t("invalidPhone"));
    start(async () => {
      const r = await sendOtpAction(phone);
      if (!r.ok) return go(r);
      setStep("code");
      setTimeout(() => refs.current[0]?.focus(), 50);
    });
  };

  const verify = (digits = code) => {
    const c = digits.join("");
    if (c.length !== 6) return;
    start(async () => go(await verifyOtpAction(phone, c)));
  };

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      const filled = [...next, ...Array(6 - next.length).fill("")];
      setCode(filled);
      refs.current[Math.min(5, next.length)]?.focus();
      if (next.length === 6) verify(filled);
      return;
    }
    const next = [...code];
    next[i] = clean;
    setCode(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) verify(next);
  };

  return (
    <div className="w-full max-w-md">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[28px] p-7 shadow-lift sm:p-9">
        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="icon-bubble mb-5 h-14 w-14">
                <Smartphone className="h-6 w-6" />
              </div>
              <h1 className="text-[28px] leading-tight">{t("welcome")}</h1>
              <p className="mt-2 text-sm text-navy-400">{t("subtitle")}</p>
              <form
                className="mt-7 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <div>
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <div className="flex gap-2">
                    <span className="flex h-12 items-center gap-1.5 rounded-xl border border-slate-200 bg-mist px-3 text-sm font-semibold">🇵🇭 +63</span>
                    <Input
                      id="phone"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="917 123 4567"
                      className="h-12 text-base tracking-wide"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : null}
                  {pending ? t("sending") : t("sendCode")}
                  {!pending && <ArrowRight />}
                </Button>
              </form>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-navy-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {t("terms")}
              </p>
            </motion.div>
          )}

          {step === "code" && (
            <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setStep("phone")} className="mb-5 flex items-center gap-1 text-sm font-semibold text-ocean">
                <ArrowLeft className="h-4 w-4" /> {t("changeNumber")}
              </button>
              <h1 className="text-[28px] leading-tight">{t("enterCode")}</h1>
              <p className="mt-2 text-sm text-navy-400">{t("codeSent", { phone: displayPhone(normalizePhone(phone)) })}</p>
              <div className="mt-7 flex justify-between gap-2">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    value={d}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={6}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs.current[i - 1]?.focus()}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white text-center text-2xl font-extrabold text-navy shadow-sm outline-none transition focus:border-ocean focus:ring-4 focus:ring-ocean/10"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              <Button size="lg" className="mt-6 w-full" disabled={pending || code.join("").length !== 6} onClick={() => verify()}>
                {pending && <Loader2 className="animate-spin" />}
                {pending ? t("verifying") : t("verify")}
              </Button>
              <button className="mt-4 w-full text-center text-sm font-semibold text-ocean" onClick={send} disabled={pending}>
                {t("resend")}
              </button>
              {demo && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">{t("demoHint", { code: demoCode })}</p>}
            </motion.div>
          )}

          {step === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="icon-bubble mb-5 h-14 w-14">
                <User className="h-6 w-6" />
              </div>
              <h1 className="text-[28px] leading-tight">{t("almostThere")}</h1>
              <p className="mt-2 text-sm text-navy-400">{t("profileSubtitle")}</p>
              <form
                className="mt-7 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => go(await completeProfileAction({ name, referral: referral || undefined })));
                }}
              >
                <div>
                  <Label htmlFor="name">{t("fullName")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" required autoFocus className="h-12" />
                </div>
                <div>
                  <Label htmlFor="ref">
                    {t("referral")} <span className="font-normal text-navy-400">(optional)</span>
                  </Label>
                  <Input id="ref" value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="ANNA2024" className="h-12 uppercase" />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={pending || name.trim().length < 2}>
                  {pending && <Loader2 className="animate-spin" />} {t("createAccount")}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {demo && step === "phone" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-5 rounded-3xl border border-dashed border-sky-200 bg-white/60 p-4 backdrop-blur">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-navy-400">{t("demoTitle")}</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["CUSTOMER", t("demoCustomer"), User],
                ["ADMIN", t("demoAdmin"), Store],
                ["RIDER", t("demoRider"), Bike],
              ] as const
            ).map(([role, label, Icon]) => (
              <button
                key={role}
                disabled={pending}
                onClick={() => start(async () => go(await demoLoginAction(role)))}
                className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-xs font-semibold text-navy ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-sky-200"
              >
                <span className="icon-bubble h-9 w-9 group-hover:bg-ocean group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-navy-400">{t("demoHint", { code: demoCode })}</p>
        </motion.div>
      )}
    </div>
  );
}
