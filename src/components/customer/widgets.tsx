"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart, type CartItem } from "@/components/shared/cart-provider";
import { toggleRemindersAction } from "@/app/(customer)/actions";
import { cn } from "@/lib/utils";

export function ReminderToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("dashboard");
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-mist px-4 py-3 ring-1 ring-sky-100">
      <Bell className="h-4 w-4 shrink-0 text-ocean" />
      <span className="flex-1 text-[13px] font-medium text-ocean">{t("reminders")}</span>
      <Switch
        checked={on}
        onCheckedChange={(v) => {
          setOn(v);
          start(async () => {
            await toggleRemindersAction(v);
          });
        }}
      />
    </label>
  );
}

export function RepeatOrderButton({ items, label, className, ...props }: { items: CartItem[]; label?: string } & ButtonProps) {
  const t = useTranslations("orders");
  const cart = useCart();
  const router = useRouter();
  return (
    <Button
      {...props}
      className={cn(className)}
      onClick={() => {
        cart.replace(items.filter((i) => i.orderType !== "RETURN"));
        toast.success(t("repeated"));
        router.push("/order?step=checkout");
      }}
    >
      <RotateCcw /> {label ?? t("repeat")}
    </Button>
  );
}

export function LinkRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {children}
      <ChevronRight className="h-4 w-4 text-navy-400" />
    </div>
  );
}
