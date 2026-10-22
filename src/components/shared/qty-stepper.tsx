"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({ value, onChange, min = 0, max = 99, size = "md", className }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: "sm" | "md"; className?: string }) {
  const s = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl bg-mist p-1 ring-1 ring-sky-100", className)}>
      <button type="button" className={cn(s, "grid place-items-center rounded-lg bg-white text-navy shadow-sm transition hover:text-ocean disabled:opacity-40")} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn("min-w-7 text-center font-bold tabular-nums", size === "sm" ? "text-sm" : "text-base")}>{value}</span>
      <button type="button" className={cn(s, "grid place-items-center rounded-lg bg-ocean text-white shadow-sm transition hover:brightness-110 disabled:opacity-40")} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
