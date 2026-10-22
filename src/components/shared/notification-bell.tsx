"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getNotificationsAction, markNotificationsReadAction } from "@/app/actions/common";
import { useLiveUpdates } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

type Item = Awaited<ReturnType<typeof getNotificationsAction>>["items"][number];

export function NotificationBell({ userId }: { userId: string }) {
  const t = useTranslations("common");
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const data = await getNotificationsAction();
    if (seen.current) {
      data.items.filter((n) => !seen.current!.has(n.id) && !n.read).forEach((n) => toast(n.title, { description: n.body, icon: "💧" }));
    }
    seen.current = new Set(data.items.map((n) => n.id));
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveUpdates(`user:${userId}`, () => load(), 20000);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white text-navy ring-1 ring-slate-100 transition hover:ring-sky-200" aria-label={t("notifications")}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ocean px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="font-bold">{t("notifications")}</p>
          {unread > 0 && (
            <button
              className="flex items-center gap-1 text-xs font-semibold text-ocean"
              onClick={async () => {
                await markNotificationsReadAction();
                load();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" /> {t("markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-4 py-10 text-center text-sm text-navy-400">{t("noNotifications")}</p>}
          {items.map((n) => {
            const body = (
              <div className={cn("flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-mist", !n.read && "bg-ocean-50/60")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-slate-200" : "bg-ocean")} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-navy-400">{n.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => markNotificationsReadAction([n.id]).then(load)}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
