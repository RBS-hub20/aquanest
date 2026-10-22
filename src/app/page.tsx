import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Droplets,
  Globe,
  HeartPulse,
  Home,
  Leaf,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { peso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ProductImage } from "@/components/brand/product-image";
import { Leaves, WaterBackdrop, WaterSplash, Waves } from "@/components/brand/water-decor";
import { LandingNavbar } from "@/components/landing/navbar";
import { Float, Reveal } from "@/components/shared/reveal";

export const dynamic = "force-dynamic";

const testimonials = [
  { name: "Carmela V.", place: "Kapitolyo, Pasig", text: "Ang bilis ng delivery! I can see exactly where Kuya Ivan is. Malinis at walang amoy ang tubig.", rating: 5 },
  { name: "Mark Anthony R.", place: "Ortigas Center", text: "Suki Mode is a lifesaver. Every Mon/Wed/Fri may tubig na kami without me texting anyone.", rating: 5 },
  { name: "Tita Baby L.", place: "Rosario, Pasig", text: "GCash payment is so easy and I got my 10th refill FREE. Highly recommended sa mga nanay!", rating: 5 },
];

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("enums");
  const [user, settings, products] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const allProducts = products;
  const waterTypesByContainer = new Map<string, string[]>();
  for (const p of allProducts) waterTypesByContainer.set(p.container, Array.from(new Set([...(waterTypesByContainer.get(p.container) ?? []), p.waterType])));
  const showcase = allProducts.filter((p) => p.waterType === "PURIFIED").slice(0, 5);
  const loggedInHref = user ? homeFor(user.role) : null;
  const orderHref = user ? "/order" : "/login";

  const quick = [
    { icon: Droplets, label: "Water" },
    { icon: Package, label: "Bottles" },
    { icon: CalendarDays, label: "Schedule" },
    { icon: MapPin, label: "Address" },
    { icon: CreditCard, label: "Payment" },
    { icon: Truck, label: "Status" },
  ];
  const features = [
    { icon: ShieldCheck, title: t("f1Title"), body: t("f1Body"), tone: "from-ocean to-aqua" },
    { icon: HeartPulse, title: t("f2Title"), body: t("f2Body"), tone: "from-rose-400 to-pink-400" },
    { icon: Home, title: t("f3Title"), body: t("f3Body"), tone: "from-aqua to-sky-400" },
    { icon: Leaf, title: t("f4Title"), body: t("f4Body"), tone: "from-emerald-400 to-leaf" },
  ];

  return (
    <div className="relative overflow-x-hidden bg-white">
      <LandingNavbar loggedInHref={loggedInHref} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-20 pt-28 sm:pt-36">
        <WaterBackdrop density={9} />
        <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="container relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ocean shadow-soft ring-1 ring-sky-100">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("heroBadge")}
            </span>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              {t("heroTitle1")}
              <br />
              <span className="text-gradient">{t("heroTitle2")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500">{t("heroBody")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="xl" asChild>
                <Link href={orderHref}>
                  {t("heroCta")} <ArrowRight />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <a href="#pricing">{t("heroCta2")}</a>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["12,400+", t("statFamilies")],
                ["45 min", t("statDelivery")],
                ["4.9 ★", t("statRating")],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/80 p-3 shadow-soft ring-1 ring-slate-100 backdrop-blur">
                  <p className="text-xl font-extrabold text-navy">{v}</p>
                  <p className="text-xs text-navy-400">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <WaterSplash className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-x-[22%] bottom-[5%] top-[2%]">
                <ProductImage container="ROUND_19L" float priority sizes="(max-width: 1024px) 60vw, 320px" />
              </div>
              <Float className="absolute left-0 top-8 w-60 sm:-left-6">
                <div className="glass rounded-2xl p-3 shadow-lift">
                  <div className="flex items-center gap-3">
                    <Image src="/brand/rider-ivan.svg" alt="" width={40} height={40} className="rounded-full" />
                    <div>
                      <p className="text-xs font-bold text-navy">Out for delivery na si Kuya Ivan!</p>
                      <p className="text-[11px] text-navy-400">ETA ~8 min · 2 × 19L</p>
                    </div>
                  </div>
                </div>
              </Float>
              <Float delay={1.2} className="absolute bottom-28 right-0 sm:-right-4">
                <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0B5AD8] text-sm font-black text-white">G</span>
                  <div>
                    <p className="flex items-center gap-1 text-xs font-bold text-navy">
                      Paid via GCash <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </p>
                    <p className="text-sm font-extrabold text-navy">{peso(60)}</p>
                  </div>
                </div>
              </Float>
              <Float delay={2} className="absolute bottom-6 left-2 sm:left-0">
                <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2 shadow-lift">
                  <span className="text-lg">🎁</span>
                  <p className="text-[11px] font-bold text-navy">10th refill FREE</p>
                </div>
              </Float>
              <Leaves className="absolute bottom-10 right-[18%] w-16" />
            </div>
          </Reveal>
        </div>

        {/* Quick icons — like the reference */}
        <div className="container relative mt-20">
          <Reveal className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:grid-cols-6">
            {quick.map(({ icon: Icon, label }) => (
              <Link
                key={label}
                href={orderHref}
                className="group flex flex-col items-center gap-2 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-ocean-50 to-aqua-50 text-ocean transition group-hover:from-ocean group-hover:to-aqua group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-aqua-600">Clean · Healthy · Delivered</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{t("featuresTitle")}</h2>
            <p className="mt-4 text-navy-400">{t("featuresBody")}</p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  <div className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${f.tone} text-white shadow-lg`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-400">{f.body}</p>
                  <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-mist transition group-hover:scale-150" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS + TRUCK */}
      <section id="how" className="relative overflow-hidden bg-navy py-24 text-white">
        <Waves color="#00B2E3" opacity={0.1} className="top-0 rotate-180" />
        <div className="container relative grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-4xl text-white sm:text-5xl">{t("howTitle")}</h2>
            <div className="mt-10 space-y-6">
              {[
                [Droplets, t("how1"), t("how1b")],
                [MapPin, t("how2"), t("how2b")],
                [Bike, t("how3"), t("how3b")],
              ].map(([Icon, title, body], i) => {
                const I = Icon as typeof Droplets;
                return (
                  <div key={i} className="flex gap-5">
                    <div className="relative">
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                        <I className="h-6 w-6 text-aqua" />
                      </span>
                      <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-aqua text-xs font-bold text-navy">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{title as string}</p>
                      <p className="text-white/70">{body as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[40px] bg-aqua/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] ring-1 ring-white/20">
                <Image src="/brand/truck.jpg" alt="AquaNest delivery truck" width={515} height={225} className="h-auto w-full" />
              </div>
              <div className="relative -mt-10 ml-auto grid w-[85%] grid-cols-2 gap-3">
                <div className="overflow-hidden rounded-3xl ring-4 ring-navy">
                  <Image src="/brand/storefront.jpg" alt="AquaNest refilling station" width={480} height={308} className="h-36 w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-3xl ring-4 ring-navy">
                  <Image src="/brand/gallons.jpg" alt="AquaNest sealed gallons" width={279} height={225} className="h-36 w-full object-cover" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-24">
        <WaterBackdrop density={5} />
        <div className="container relative">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl sm:text-5xl">{t("pricingTitle")}</h2>
            <p className="mt-4 text-navy-400">{t("pricingBody")}</p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {showcase.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-soft transition duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                  <div className="relative h-60 bg-[radial-gradient(ellipse_at_50%_35%,#FFFFFF_0%,#F0F8FF_55%,#E3F2FC_100%)] px-6 pb-4 pt-8">
                    {p.isPopular && <span className="absolute left-4 top-4 z-10 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">{t("popular")}</span>}
                    <div className="h-full transition duration-500 group-hover:scale-[1.04]">
                      <ProductImage container={p.container} float delay={i * 0.4} sizes="(max-width: 640px) 70vw, 220px" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-navy-400">{p.sizeLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(waterTypesByContainer.get(p.container) ?? ["PURIFIED"]).map((w) => (
                        <span key={w} className="rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-ocean ring-1 ring-sky-100">
                          {tc(`waterType.${w}`)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto pt-4">
                      <p className="text-2xl font-extrabold text-ocean">
                        {peso(p.price)} <span className="text-xs font-semibold text-navy-400">{p.isReturnable ? t("perRefill") : ""}</span>
                      </p>
                      {p.containerPrice > 0 && (
                        <p className="text-xs text-navy-400">
                          {t("newGallon")}: <span className="font-semibold text-navy">{peso(p.containerPrice + p.price)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-navy-500">
            {(["PURIFIED", "MINERAL", "ALKALINE"] as const).map((w) => (
              <span key={w} className="rounded-full bg-mist px-4 py-1.5 font-semibold ring-1 ring-sky-100">
                💧 {tc(`waterType.${w}`)}
              </span>
            ))}
            <span className="rounded-full bg-emerald-50 px-4 py-1.5 font-semibold text-emerald-700">🚚 Free delivery {peso(settings.freeDeliveryThreshold, { compact: true })}+</span>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="bg-mist py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl sm:text-5xl">{t("reviewsTitle")}</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((r, i) => (
              <Reveal key={r.name} delay={i * 0.08}>
                <figure className="h-full rounded-3xl bg-white p-7 shadow-soft ring-1 ring-slate-100">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: r.rating }).map((_, k) => (
                      <Star key={k} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 leading-relaxed text-navy-500">“{r.text}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{r.name[0]}</span>
                    <div>
                      <p className="text-sm font-bold">{r.name}</p>
                      <p className="text-xs text-navy-400">{r.place}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <Reveal>
            <div className="relative overflow-hidden rounded-[36px] bg-brand-gradient px-8 py-14 text-white shadow-glow sm:px-14">
              <Waves color="#ffffff" opacity={0.12} />
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="relative grid items-center gap-8 md:grid-cols-[1fr_300px]">
                <div className="max-w-xl">
                  <Sparkles className="mb-4 h-8 w-8 text-white/80" />
                  <h2 className="text-3xl text-white sm:text-4xl">{t("ctaTitle")}</h2>
                  <p className="mt-3 text-white/85">{t("ctaBody")}</p>
                  <Button size="xl" variant="white" asChild className="mt-6">
                    <Link href={orderHref}>
                      {t("orderNow")} <ArrowRight />
                    </Link>
                  </Button>
                </div>
                <div className="relative mx-auto aspect-[4/4.4] w-full max-w-[300px] overflow-hidden rounded-[28px] ring-4 ring-white/30">
                  <Image src="/brand/family-photo.jpg" alt="Happy Filipino family drinking AquaNest water" fill className="object-cover" sizes="300px" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative overflow-hidden bg-navy pb-10 pt-16 text-white/80">
        <div className="container grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo light href={null} />
            <p className="mt-4 max-w-xs text-sm text-white/60">AquaNest Water Refilling Station & Delivery. {settings.address}</p>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">Contact</p>
            <a href="tel:09171234567" className="flex items-center gap-2 py-1 text-sm hover:text-white">
              <Phone className="h-4 w-4 text-aqua" /> 0917 123 4567
            </a>
            <a href="https://www.aquanest.ph" className="flex items-center gap-2 py-1 text-sm hover:text-white">
              <Globe className="h-4 w-4 text-aqua" /> www.aquanest.ph
            </a>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">App</p>
            {[
              ["/order", "Place Order"],
              ["/tracking", "Track Delivery"],
              ["/rider", "Rider App"],
              ["/admin", "Station Admin"],
            ].map(([h, l]) => (
              <Link key={h} href={h} className="block py-1 text-sm hover:text-white">
                {l}
              </Link>
            ))}
          </div>
          <div>
            <p className="mb-3 font-bold text-white">Hours</p>
            <p className="text-sm">{t("footerHours")}</p>
            <div className="mt-4 flex gap-2">
              {["GCash", "Maya", "COD"].map((m) => (
                <span key={m} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="container mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} AquaNest™. {t("footerRights")}
          </p>
          <p className="flex items-center gap-2">
            <LogoMark size={18} /> Pure Water. Happy Home.
          </p>
        </div>
      </footer>
    </div>
  );
}
