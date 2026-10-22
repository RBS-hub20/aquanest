import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, className }: { title: string; subtitle?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-2xl sm:text-[28px]">{title}</h2>
        {subtitle && <p className="text-sm text-navy-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "ocean",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "ocean" | "aqua" | "amber" | "rose" | "emerald" | "violet";
  className?: string;
}) {
  const tones = {
    ocean: "from-ocean to-[#1E8FE0] shadow-glow",
    aqua: "from-aqua to-sky-400 shadow-[0_10px_30px_-8px_rgb(0_178_227/0.55)]",
    amber: "from-amber-400 to-orange-400 shadow-[0_10px_30px_-8px_rgb(251_146_60/0.55)]",
    rose: "from-rose-400 to-pink-500 shadow-[0_10px_30px_-8px_rgb(244_63_94/0.5)]",
    emerald: "from-emerald-400 to-emerald-500 shadow-[0_10px_30px_-8px_rgb(16_185_129/0.5)]",
    violet: "from-violet-500 to-indigo-500 shadow-[0_10px_30px_-8px_rgb(124_58_237/0.5)]",
  };
  return (
    <div className={cn("card-premium relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold leading-none text-navy">{value}</p>
          {sub && <div className="mt-2 text-xs text-navy-400">{sub}</div>}
        </div>
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white", tones[tone])}>{icon}</span>
      </div>
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-mist" />
    </div>
  );
}
