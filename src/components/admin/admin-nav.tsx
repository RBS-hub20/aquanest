"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bike,
  Boxes,
  Calculator,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings,
  Tag,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Waves } from "@/components/brand/water-decor";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Operations",
    items: [
      { href: "/admin/orders", label: "Order Board", icon: KanbanSquare },
      { href: "/admin/pos", label: "POS · Walk-in", icon: Calculator },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/riders", label: "Riders", icon: Bike },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/admin/pricing", label: "Pricing", icon: Tags },
      { href: "/admin/promos", label: "Promo Codes", icon: Tag },
      { href: "/admin/expenses", label: "Expenses", icon: Wallet },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/sms", label: "SMS Log", icon: ReceiptText },
      { href: "/admin/settings", label: "Store Settings", icon: Settings },
    ],
  },
];

function NavLinks({ onNavigate, badges }: { onNavigate?: () => void; badges?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {ADMIN_NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{g.group}</p>
          <div className="space-y-1">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
              const badge = badges?.[href];
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn("relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors", active ? "text-navy" : "text-white/70 hover:bg-white/5 hover:text-white")}
                >
                  {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-2xl bg-white shadow-lg" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <Icon className={cn("relative z-10 h-[18px] w-[18px]", active && "text-ocean")} />
                  <span className="relative z-10 flex-1">{label}</span>
                  {badge ? <span className="relative z-10 rounded-full bg-aqua px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({ badges }: { badges?: Record<string, number> }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col overflow-hidden bg-navy px-3 py-6 lg:flex">
      <div className="px-3">
        <Logo light href="/admin" />
        <p className="mt-3 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-aqua-100">Station Admin</p>
      </div>
      <div className="scrollbar-none mt-6 flex-1 overflow-y-auto">
        <NavLinks badges={badges} />
      </div>
      <Waves color="#00B2E3" opacity={0.08} className="h-20" />
    </aside>
  );
}

export function AdminMobileNav({ badges }: { badges?: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="grid h-11 w-11 place-items-center rounded-2xl bg-navy text-white lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" className="max-w-xs rounded-none border-0 bg-navy p-5 text-white">
          <DialogTitle className="sr-only">Admin navigation</DialogTitle>
          <Logo light href="/admin" />
          <NavLinks onNavigate={() => setOpen(false)} badges={badges} />
        </DialogContent>
      </Dialog>
    </>
  );
}
