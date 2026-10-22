"use client";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/brand/product-image";
import { useCart } from "@/components/shared/cart-provider";
import { peso } from "@/lib/utils";

export interface QuickProduct {
  id: string;
  name: string;
  sizeLabel: string;
  container: "ROUND_19L" | "SLIM_19L" | "GALLON_10L" | "GALLON_6L" | "BOTTLED_CASE";
  waterType: string;
  price: number;
  isPopular: boolean;
}

export function ProductQuickCard({ p }: { p: QuickProduct }) {
  const t = useTranslations();
  const cart = useCart();
  return (
    <motion.div whileHover={{ y: -3 }} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5">
      {p.isPopular && <span className="absolute left-2 top-2 z-10 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">{t("landing.popular")}</span>}
      <div className="h-32 rounded-xl bg-[radial-gradient(ellipse_at_50%_35%,#FFFFFF_0%,#F0F8FF_60%,#E3F2FC_100%)] px-3 pb-1.5 pt-4">
        <ProductImage container={p.container} float sizes="120px" />
      </div>
      <p className="mt-2 truncate text-[13px] font-bold">{p.name}</p>
      <p className="truncate text-[11px] text-navy-400">{p.sizeLabel}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[15px] font-extrabold text-navy">{peso(p.price)}</span>
        <button
          onClick={() => {
            cart.add({ productId: p.id, orderType: "REFILL", quantity: 1 });
            toast.success(t("dashboard.addedToCart"), { description: p.name });
          }}
          className="grid h-8 w-8 place-items-center rounded-lg bg-ocean text-white shadow-glow transition hover:brightness-110 active:scale-95"
          aria-label={`Add ${p.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
