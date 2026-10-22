"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { cn } from "@/lib/utils";

export function LandingNavbar({ loggedInHref }: { loggedInHref?: string | null }) {
  const t = useTranslations("landing");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    ["#features", t("navFeatures")],
    ["#how", t("navHow")],
    ["#pricing", t("navPricing")],
    ["#reviews", t("navReviews")],
  ] as const;

  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-300", scrolled ? "py-2" : "py-4")}>
      <div className={cn("container flex items-center justify-between rounded-3xl px-4 transition-all duration-300", scrolled && "glass py-2 shadow-soft")}>
        <Logo size="sm" />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-xl px-4 py-2 text-sm font-semibold text-navy-500 transition hover:bg-mist hover:text-ocean">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <Button variant="ghost" asChild>
            <Link href={loggedInHref ?? "/login"}>{t("login")}</Link>
          </Button>
          <Button asChild>
            <Link href={loggedInHref ? "/order" : "/login"}>{t("orderNow")}</Link>
          </Button>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-xl bg-mist md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="container mt-2 md:hidden">
            <div className="glass space-y-1 rounded-3xl p-3 shadow-lift">
              {links.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 font-semibold hover:bg-mist">
                  {label}
                </a>
              ))}
              <div className="flex items-center justify-between gap-2 px-2 pt-2">
                <LanguageToggle />
                <Button asChild className="flex-1">
                  <Link href={loggedInHref ? "/order" : "/login"}>{t("orderNow")}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
