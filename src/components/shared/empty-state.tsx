import { BottleSilhouette } from "@/components/brand/product-image";
import { Droplet } from "@/components/brand/water-decor";
import { cn } from "@/lib/utils";

/** Empty state built around the AquaNest bottle silhouette. */
export function EmptyState({ title, body, action, className, size = "md" }: { title: string; body?: string; action?: React.ReactNode; className?: string; size?: "sm" | "md" }) {
  return (
    <div className={cn("flex flex-col items-center text-center", size === "sm" ? "gap-2 py-6" : "gap-3 py-10", className)}>
      <div className={cn("relative", size === "sm" ? "h-24 w-16" : "h-36 w-24")}>
        <span className="absolute inset-x-1 bottom-0 h-3 rounded-[50%] bg-ocean/10 blur-sm" />
        <BottleSilhouette tone="soft" className="absolute inset-x-0 bottom-1.5 top-0 animate-float-soft" />
        <Droplet className="absolute -right-4 top-2 h-6 w-5 animate-float opacity-80" />
        <Droplet className="absolute -left-3 top-10 h-4 w-3 animate-float opacity-60 [animation-delay:1.5s]" />
      </div>
      <p className={cn("font-bold text-navy", size === "md" && "text-lg")}>{title}</p>
      {body && <p className="max-w-sm text-sm text-navy-400">{body}</p>}
      {action}
    </div>
  );
}
