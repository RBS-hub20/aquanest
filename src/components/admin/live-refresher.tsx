"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";
import { useLiveUpdates } from "@/hooks/use-realtime";

/** Refreshes server components on realtime events (new orders, status changes). */
export function LiveRefresher({ channel, pollMs = 15000 }: { channel: string; pollMs?: number }) {
  const router = useRouter();
  const last = useRef(0);
  useLiveUpdates(
    channel,
    (event, payload) => {
      if (event === "order:new") {
        const p = payload as { code?: string };
        toast.success("New order received! 💧", { description: p?.code });
        try {
          new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(() => {});
        } catch {}
      }
      const now = Date.now();
      if (now - last.current < 1500) return;
      last.current = now;
      router.refresh();
    },
    pollMs
  );
  return null;
}
