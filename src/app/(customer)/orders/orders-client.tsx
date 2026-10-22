"use client";
import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronRight, Download, FileText, MapPinned } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentLogo } from "@/components/shared/payment-logos";
import { RepeatOrderButton } from "@/components/customer/widgets";
import { FadeIn } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { downloadInvoice } from "@/lib/invoice";
import type { SerializedOrder } from "@/lib/serialize";
import type { StoreInfo } from "@/components/customer/order-tracker";
import { peso } from "@/lib/utils";

export function OrdersClient({ orders, store }: { orders: SerializedOrder[]; store: StoreInfo }) {
  const t = useTranslations("orders");
  const f = useFormatter();
  const [tab, setTab] = useState("all");
  const list = orders.filter((o) =>
    tab === "all" ? true : tab === "active" ? ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"].includes(o.status) : ["DELIVERED", "CANCELLED"].includes(o.status)
  );

  return (
    <div className="space-y-5">
      <FadeIn className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
          <p className="text-sm text-navy-400">{t("subtitle")}</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">{t("all")}</TabsTrigger>
            <TabsTrigger value="active">{t("active")}</TabsTrigger>
            <TabsTrigger value="done">{t("completed")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </FadeIn>

      {list.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={t("empty")}
            action={
              <Button asChild>
                <Link href="/order">Order now</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((o, i) => {
            const active = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"].includes(o.status);
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                <Card className="p-4 transition hover:shadow-lift sm:p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <Link href={`/orders/${o.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mist text-center leading-none">
                        <span>
                          <span className="block text-[10px] font-bold uppercase text-ocean">{f.dateTime(new Date(o.createdAt), { month: "short" })}</span>
                          <span className="block text-xl font-extrabold">{f.dateTime(new Date(o.createdAt), { day: "numeric" })}</span>
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold">
                          {o.code} <StatusBadge status={o.status} />
                        </p>
                        <p className="truncate text-sm text-navy-500">{o.items.map((it) => `${it.productName} × ${it.quantity}`).join(", ")}</p>
                        <p className="text-xs text-navy-400">
                          {t("items", { count: o.items.reduce((s, it) => s + it.quantity, 0) })} · {f.dateTime(new Date(o.createdAt), { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <PaymentLogo method={o.paymentMethod} className="hidden h-8 text-xs sm:inline-flex" />
                      <p className="text-lg font-extrabold">{peso(o.total)}</p>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      {active ? (
                        <Button size="sm" asChild className="flex-1 sm:flex-none">
                          <Link href={`/tracking?order=${o.id}`}>
                            <MapPinned /> {t("track")}
                          </Link>
                        </Button>
                      ) : (
                        <RepeatOrderButton size="sm" variant="secondary" className="flex-1 sm:flex-none" items={o.items.map((it) => ({ productId: it.productId, orderType: it.orderType, quantity: it.quantity }))} />
                      )}
                      <Button size="sm" variant="outline" onClick={() => downloadInvoice(o, store).catch(() => toast.error("PDF failed"))} aria-label={t("invoice")}>
                        <Download /> <span className="hidden sm:inline">PDF</span>
                      </Button>
                      <Button size="icon-sm" variant="ghost" asChild>
                        <Link href={`/orders/${o.id}`} aria-label={t("details")}>
                          <ChevronRight />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
