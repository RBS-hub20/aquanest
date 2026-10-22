"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CalendarDays, CreditCard, FileText, Headphones, Home, MapPin, ShoppingBag, Truck, User } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Droplet, Leaves } from "@/components/brand/water-decor";
import { cn } from "@/lib/utils";

export const CUSTOMER_NAV = [
  { href: "/dashboard", key: "home", icon: Home },
  { href: "/order", key: "placeOrder", icon: ShoppingBag },
  { href: "/schedule", key: "schedule", icon: CalendarDays },
  { href: "/addresses", key: "address", icon: MapPin },
  { href: "/payment", key: "payment", icon: CreditCard },
  { href: "/orders", key: "myOrders", icon: FileText },
  { href: "/tracking", key: "deliveryStatus", icon: Truck },
  { href: "/profile", key: "profile", icon: User },
  { href: "/support", key: "support", icon: Headphones },
] as const;

export function CustomerSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo href="/dashboard" />
      </div>
      <nav className="mt-8 flex-1 space-y-1">
        {CUSTOMER_NAV.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors",
                active ? "text-white" : "text-navy-500 hover:bg-mist hover:text-ocean"
              )}
            >
              {active && (
                <motion.span
                  layoutId="cust-nav"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-ocean to-[#1E8FE0] shadow-glow"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative z-10 h-[18px] w-[18px]" />
              <span className="relative z-10">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-mist via-white to-aqua-50 p-5 ring-1 ring-sky-100">
        <p className="relative z-10 text-[15px] font-extrabold leading-snug text-navy">{t("promoTitle")}</p>
        <p className="relative z-10 mt-1 text-xs text-navy-400">{t("promoBody")}</p>
        <div className="relative mt-3 h-24">
          <Droplet className="absolute left-1/2 top-1 h-20 w-16 -translate-x-1/2 animate-float" />
          <Leaves className="absolute bottom-0 left-2 w-14" />
          <svg viewBox="0 0 200 60" className="absolute -bottom-2 -left-5 w-[130%]" aria-hidden>
            <path d="M0 40c30-20 60-20 90 0s60 20 110 0v20H0z" fill="#00B2E3" opacity=".25" />
            <path d="M0 48c30-14 60-14 90 0s60 14 110 0v12H0z" fill="#0C6DB5" opacity=".25" />
          </svg>
        </div>
      </div>
    </aside>
  );
}

export function CustomerBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [CUSTOMER_NAV[0], CUSTOMER_NAV[1], CUSTOMER_NAV[6], CUSTOMER_NAV[5], CUSTOMER_NAV[7]];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/70 bg-white/90 px-2 py-1.5 shadow-lift backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link href={href} className={cn("flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold", active ? "text-ocean" : "text-navy-400")}>
                <span className={cn("grid h-8 w-12 place-items-center rounded-xl transition", active && "bg-ocean-50")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate px-1">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNavSheetLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  return (
    <div className="grid grid-cols-3 gap-2">
      {CUSTOMER_NAV.map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate} className="flex flex-col items-center gap-2 rounded-2xl bg-mist p-3 text-center text-xs font-semibold">
          <Icon className="h-5 w-5 text-ocean" />
          {t(key)}
        </Link>
      ))}
    </div>
  );
}
