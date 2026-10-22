import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", {
  variants: {
    variant: {
      default: "bg-ocean-50 text-ocean",
      aqua: "bg-aqua-50 text-aqua-600",
      success: "bg-emerald-50 text-emerald-700",
      warning: "bg-amber-50 text-amber-700",
      danger: "bg-rose-50 text-rose-700",
      outline: "border border-slate-200 text-navy-500",
      solid: "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-sm",
      navy: "bg-navy text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
