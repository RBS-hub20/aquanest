"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { History, ListChecks, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Switch } from "@/components/ui/switch";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { Waves } from "@/components/brand/water-decor";
import { useLiveUpdates } from "@/hooks/use-realtime";
import { cn, firstName } from "@/lib/utils";
import { setOnlineAction, updateLocationAction } from "./actions";

export function RiderShell({
  user,
  rider,
  children,
}: {
  user: { id: string; name: string; phone: string; avatarUrl: string | null };
  rider: { id: string; isOnline: boolean; area: string; isActive: boolean } | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("rider");
  const router = useRouter();
  const pathname = usePathname();
  const [online, setOnline] = useState(rider?.isOnline ?? false);
  const [, start] = useTransition();
  const lastSent = useRef(0);
  useLiveUpdates(rider ? `rider:${rider.id}` : null, () => router.refresh(), 15000);

  // Live location while online
  useEffect(() => {
    if (!online || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - lastSent.current < 12000) return;
        lastSent.current = Date.now();
        updateLocationAction(pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [online]);

  const nav = [
    { href: "/rider", label: t("title"), icon: ListChecks },
    { href: "/rider/summary", label: t("summary"), icon: Wallet },
    { href: "/rider/history", label: t("history"), icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F5FAFF]">
      <header className="relative overflow-hidden bg-navy-gradient px-4 pb-16 pt-4 text-white">
        <Waves color="#00B2E3" opacity={0.15} className="h-16" />
        <div className="relative mx-auto flex max-w-2xl items-center justify-between gap-2">
          <Link href="/rider" className="shrink-0" aria-label="AquaNest rider home">
            <LogoMark size={38} className="sm:hidden" />
            <span className="hidden sm:block">
              <Logo light size="sm" href={null} showTagline={false} />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle dark />
            <NotificationBell userId={user.id} />
            <UserMenu name={firstName(user.name)} phone={user.phone} avatarUrl={user.avatarUrl} />
          </div>
        </div>
        <div className="relative mx-auto mt-5 flex max-w-2xl items-end justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">{rider?.area}</p>
            <h1 className="text-2xl font-extrabold text-white">{t("hello", { name: firstName(user.name) })}</h1>
          </div>
          <label className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold ring-1 transition", online ? "bg-emerald-500/20 ring-emerald-300/40" : "bg-white/10 ring-white/20")}>
            <span className={cn("h-2 w-2 rounded-full", online ? "animate-pulse bg-emerald-300" : "bg-white/50")} />
            {online ? t("online") : t("offline")}
            <Switch
              checked={online}
              onCheckedChange={(v) => {
                setOnline(v);
                start(async () => {
                  const r = await setOnlineAction(v);
                  if (!r.ok) {
                    setOnline(!v);
                    return void toast.error(r.error);
                  }
                  if (v) toast.success(t("shareLocation"));
                });
              }}
              className="data-[state=checked]:bg-emerald-400"
            />
          </label>
        </div>
      </header>
      <main className="relative mx-auto -mt-10 max-w-2xl px-4 pb-28">{children}</main>
      <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-3xl border border-white/70 bg-white/95 p-1.5 shadow-lift backdrop-blur-xl">
        <ul className="grid grid-cols-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link href={href} className={cn("flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold", active ? "bg-ocean-50 text-ocean" : "text-navy-400")}>
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
