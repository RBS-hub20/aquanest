import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";

/**
 * Server → client push over Supabase Realtime Broadcast.
 * Channels: `order:{id}`, `user:{id}`, `rider:{id}`, `admin`.
 * Clients also poll as a fallback, so a failed broadcast never loses data.
 */
export async function broadcast(channel: string, event: string, payload: Record<string, unknown> = {}) {
  const supabase = getAdminSupabase();
  if (!supabase) return;
  try {
    const ch = supabase.channel(`aquanest:${channel}`);
    const anyCh = ch as unknown as { httpSend?: (e: string, p: unknown) => Promise<unknown> };
    if (typeof anyCh.httpSend === "function") await anyCh.httpSend(event, payload);
    else await ch.send({ type: "broadcast", event, payload });
    await supabase.removeChannel(ch);
  } catch (e) {
    console.warn("[realtime] broadcast failed", channel, event, e);
  }
}
