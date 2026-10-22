import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, CreditCard, Droplets, MapPin, Package, Truck } from "lucide-react";

export async function QuickIcons() {
  const t = await getTranslations("dashboard");
  const items = [
    { href: "/order", icon: Droplets, label: t("quickWater") },
    { href: "/order?size=BOTTLED_CASE", icon: Package, label: t("quickBottles") },
    { href: "/schedule", icon: CalendarDays, label: t("quickSchedule") },
    { href: "/addresses", icon: MapPin, label: t("quickAddress") },
    { href: "/payment", icon: CreditCard, label: t("quickPayment") },
    { href: "/tracking", icon: Truck, label: t("quickStatus") },
  ];
  return (
    <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0">
      {items.map(({ href, icon: Icon, label }) => (
        <Link
          key={label}
          href={href}
          className="group flex min-w-[92px] flex-col items-center gap-2 rounded-[22px] border border-slate-100 bg-white px-3 py-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-ocean-50 to-aqua-50 text-ocean ring-1 ring-sky-100 transition group-hover:from-ocean group-hover:to-aqua group-hover:text-white">
            <Icon className="h-[22px] w-[22px]" />
          </span>
          <span className="text-[13px] font-semibold">{label}</span>
        </Link>
      ))}
    </div>
  );
}
