"use client";
import { useTranslations } from "next-intl";
import type { OrderStatus } from "@prisma/client";
import { STATUS_STYLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useTranslations("enums.status");
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", s.bg, s.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, status === "OUT_FOR_DELIVERY" && "animate-pulse")} />
      {t(status)}
    </span>
  );
}
