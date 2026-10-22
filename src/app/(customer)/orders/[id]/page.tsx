import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderInclude } from "@/lib/orders";
import { serializeOrder } from "@/lib/serialize";
import { getSettings, storeInfo } from "@/lib/settings";
import { OrderTracker } from "@/components/customer/order-tracker";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const o = await prisma.order.findUnique({ where: { id: params.id }, select: { code: true } });
  return { title: o ? `Order ${o.code}` : "Order" };
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser("CUSTOMER");
  const [order, settings] = await Promise.all([prisma.order.findFirst({ where: { id: params.id, customerId: user.id }, include: orderInclude }), getSettings()]);
  if (!order) notFound();
  return (
    <div className="space-y-5">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean">
        <ArrowLeft className="h-4 w-4" /> {order.code}
      </Link>
      <OrderTracker order={serializeOrder(order)} store={storeInfo(settings)} />
    </div>
  );
}
