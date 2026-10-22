import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderInclude } from "@/lib/orders";
import { serializeOrder } from "@/lib/serialize";
import { getSettings, storeInfo } from "@/lib/settings";
import { OrderTracker } from "@/components/customer/order-tracker";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Delivery Status" };

export default async function TrackingPage({ searchParams }: { searchParams: { order?: string } }) {
  const user = await requireUser("CUSTOMER");
  const t = await getTranslations("tracking");
  const [actives, settings] = await Promise.all([
    prisma.order.findMany({ where: { customerId: user.id, status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] } }, orderBy: { createdAt: "desc" }, include: orderInclude }),
    getSettings(),
  ]);
  let current: (typeof actives)[number] | undefined = actives.find((o) => o.id === searchParams.order) ?? actives[0];
  if (!current && searchParams.order) {
    current = (await prisma.order.findFirst({ where: { id: searchParams.order, customerId: user.id }, include: orderInclude })) ?? undefined;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl">{t("title")}</h2>
        <p className="text-sm text-navy-400">{t("subtitle")}</p>
      </div>
      {actives.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {actives.map((o) => (
            <Link
              key={o.id}
              href={`/tracking?order=${o.id}`}
              className={cn("flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition", o.id === current?.id ? "border-ocean bg-ocean-50" : "border-slate-100 bg-white")}
            >
              {o.code} <StatusBadge status={o.status} />
            </Link>
          ))}
        </div>
      )}
      {current ? (
        <OrderTracker order={serializeOrder(current)} store={storeInfo(settings)} />
      ) : (
        <Card className="p-6">
          <EmptyState
            title={t("noActive")}
            body={t("noActiveBody")}
            action={
              <Button asChild>
                <Link href="/order">Order now</Link>
              </Button>
            }
          />
        </Card>
      )}
    </div>
  );
}
