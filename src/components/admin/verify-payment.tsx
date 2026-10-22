"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markPaidAction } from "@/app/admin/actions";

export function VerifyPaymentButtons({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (paid: boolean) =>
    start(async () => {
      const r = await markPaidAction(orderId, paid);
      if (!r.ok) return void toast.error(r.error);
      toast.success(paid ? "Payment confirmed" : "Marked as unpaid");
      router.refresh();
    });
  return (
    <div className="flex gap-1">
      <Button size="icon-sm" variant="success" disabled={pending} onClick={() => act(true)} aria-label="Confirm payment">
        <Check />
      </Button>
      <Button size="icon-sm" variant="outline" disabled={pending} onClick={() => act(false)} aria-label="Reject payment">
        <X />
      </Button>
    </div>
  );
}
