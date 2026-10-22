import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/brand/logo-icon.png"
      alt="AquaNest"
      width={size}
      height={Math.round(size * 0.88)}
      priority
      className={cn("drop-shadow-[0_6px_14px_rgba(12,109,181,0.25)]", className)}
    />
  );
}

export function Wordmark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-start font-extrabold leading-none tracking-tight", className)}>
      <span className={light ? "text-white" : "text-navy"}>Aqua</span>
      <span className={light ? "text-aqua-100" : "text-ocean"}>Nest</span>
      <sup className={cn("ml-0.5 mt-0.5 text-[0.4em] font-bold", light ? "text-white/80" : "text-navy")}>™</sup>
    </span>
  );
}

export function Logo({
  className,
  href = "/",
  light = false,
  showTagline = true,
  size = "md",
}: {
  className?: string;
  href?: string | null;
  light?: boolean;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const s = { sm: { mark: 34, word: "text-xl" }, md: { mark: 44, word: "text-2xl" }, lg: { mark: 60, word: "text-4xl" } }[size];
  const inner = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={s.mark} />
      <span className="flex flex-col">
        <Wordmark className={s.word} light={light} />
        {showTagline && (
          <span className={cn("mt-1 text-[9px] font-semibold uppercase tracking-[0.14em]", light ? "text-white/70" : "text-navy-400")}>
            Pure Water. Happy Home.
          </span>
        )}
      </span>
    </span>
  );
  return href ? <Link href={href} aria-label="AquaNest home">{inner}</Link> : inner;
}
