"use client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/common";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className, dark = false }: { className?: string; dark?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (l: "en" | "tl") => {
    if (l === locale) return;
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "relative inline-flex h-9 items-center rounded-full p-1 text-xs font-bold ring-1",
        dark ? "bg-white/10 ring-white/20" : "bg-mist ring-sky-100",
        pending && "opacity-60",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {(["en", "tl"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          className={cn(
            "relative z-10 h-7 rounded-full px-3 transition-all",
            locale === l
              ? dark
                ? "bg-white text-ocean shadow"
                : "bg-white text-ocean shadow-sm"
              : dark
                ? "text-white/80 hover:text-white"
                : "text-navy-400 hover:text-navy"
          )}
          aria-pressed={locale === l}
        >
          {l === "en" ? "EN" : "TL"}
        </button>
      ))}
    </div>
  );
}
