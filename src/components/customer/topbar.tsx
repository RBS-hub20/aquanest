"use client";
import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { useCart } from "@/components/shared/cart-provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { firstName } from "@/lib/utils";
import { MobileNavSheetLinks } from "./sidebar";

export function CustomerTopbar({ user }: { user: { id: string; name: string; phone: string; avatarUrl: string | null } }) {
  const t = useTranslations("dashboard");
  const { count } = useCart();
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100/70 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button className="lg:hidden" onClick={() => setMenu(true)} aria-label="Menu">
            <LogoMark size={38} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold sm:text-2xl">
              {t("hello", { name: firstName(user.name) })} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span>
            </h1>
            <p className="hidden truncate text-sm text-navy-400 sm:block">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle className="hidden sm:inline-flex" />
          <Link href="/order" className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white text-navy ring-1 ring-slate-100 transition hover:ring-sky-200" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-aqua px-1 text-[10px] font-bold text-white ring-2 ring-white">{count}</span>
            )}
          </Link>
          <NotificationBell userId={user.id} />
          <UserMenu name={user.name} phone={user.phone} avatarUrl={user.avatarUrl} profileHref="/profile" />
        </div>
      </div>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent side="bottom" className="pb-10">
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-ocean" /> AquaNest
          </DialogTitle>
          <MobileNavSheetLinks onNavigate={() => setMenu(false)} />
          <div className="flex justify-center">
            <LanguageToggle />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
