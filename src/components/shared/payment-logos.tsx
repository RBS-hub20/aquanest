import { Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

export function PaymentLogo({ method, className }: { method: string; className?: string }) {
  if (method === "GCASH")
    return (
      <span className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0B5AD8] px-3 text-sm font-extrabold text-white shadow-sm", className)}>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[13px] font-black text-[#0B5AD8]">G</span>
        GCash
      </span>
    );
  if (method === "MAYA")
    return (
      <span className={cn("inline-flex h-10 items-center rounded-xl bg-[#0E0E0E] px-3 text-sm font-extrabold lowercase tracking-tight text-[#3CF08A] shadow-sm", className)}>
        maya
      </span>
    );
  return (
    <span className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-sm font-extrabold text-white shadow-sm", className)}>
      <Banknote className="h-5 w-5" /> {method === "CASH" ? "Cash" : "COD"}
    </span>
  );
}
