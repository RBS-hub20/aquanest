"use client";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Subscribes to a Supabase Realtime broadcast channel and also polls as a fallback.
 * `onEvent` fires on every broadcast and on every poll tick.
 */
export function useLiveUpdates(channel: string | null, onEvent: (event: string, payload: unknown) => void, pollMs = 8000) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!channel) return;
    const supabase = getBrowserSupabase();
    const ch = supabase
      ?.channel(`aquanest:${channel}`)
      .on("broadcast", { event: "*" }, (msg) => cb.current(msg.event, msg.payload))
      .subscribe();
    const timer = pollMs > 0 ? setInterval(() => document.visibilityState === "visible" && cb.current("poll", null), pollMs) : null;
    return () => {
      if (timer) clearInterval(timer);
      if (ch && supabase) supabase.removeChannel(ch);
    };
  }, [channel, pollMs]);
}
