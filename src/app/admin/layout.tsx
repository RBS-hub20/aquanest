import Link from "next/link";
import type { Metadata } from "next";
import { Calculator, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings, isStoreOpen } from "@/lib/settings";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { Button } from "@/components/ui/button";
import { LiveRefresher } from "@/components/admin/live-refresher";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · AquaNest Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");
  const [pending, settings] = await Promise.all([prisma.order.count({ where: { status: { in: ["PENDING", "PREPARING"] } } }), getSettings()]);
  const open = isStoreOpen(settings);
  const badges = { "/admin/orders": pending };
  return (
    <div className="flex min-h-screen bg-[#F6F9FC]">
      <AdminSidebar badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <AdminMobileNav badges={badges} />
              <div>
                <p className="text-xs font-semibold text-navy-400">AquaNest Station</p>
                <p className="flex items-center gap-2 text-sm font-bold">
                  <span className={`h-2 w-2 rounded-full ${open ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {open ? "Open for orders" : "Closed"} · {settings.openTime}–{settings.closeTime}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/admin/pos">
                  <Calculator /> New walk-in
                </Link>
              </Button>
              <Button asChild size="icon" variant="outline" className="hidden sm:inline-flex">
                <Link href="/" target="_blank" aria-label="Open website">
                  <ExternalLink />
                </Link>
              </Button>
              <NotificationBell userId={user.id} />
              <UserMenu name={user.name} phone={user.phone} avatarUrl={user.avatarUrl} roleLabel="Owner · Admin" />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <LiveRefresher channel="admin" />
    </div>
  );
}
