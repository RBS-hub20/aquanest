import { getTranslations } from "next-intl/server";
import { Droplets, Gift, Leaf, ShieldCheck } from "lucide-react";

export async function TrustBadges() {
  const t = await getTranslations("dashboard");
  const items = [
    { icon: Droplets, title: t("trust1"), body: t("trust1b") },
    { icon: ShieldCheck, title: t("trust2"), body: t("trust2b") },
    { icon: Leaf, title: t("trust3"), body: t("trust3b") },
    { icon: Gift, title: t("trust4"), body: t("trust4b") },
  ];
  return (
    <section className="card-premium grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-100">
      {items.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex items-start gap-3 lg:px-4 first:lg:pl-0">
          <span className="icon-bubble h-11 w-11 shrink-0">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold">{title}</p>
            <p className="text-xs text-navy-400">{body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
