import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PaymentClient } from "./payment-client";

export const metadata: Metadata = { title: "Payment" };

export default async function PaymentPage() {
  const user = await requireUser("CUSTOMER");
  const [settings, unpaid] = await Promise.all([
    getSettings(),
    prisma.order.findMany({
      where: { customerId: user.id, paymentStatus: { in: ["UNPAID", "FOR_VERIFICATION"] }, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, code: true, total: true, paymentStatus: true, paymentMethod: true, status: true },
    }),
  ]);
  return (
    <PaymentClient
      preferred={user.preferredPayment}
      balance={user.balance}
      deposit={user.depositBalance}
      store={{ gcashName: settings.gcashName, gcashNumber: settings.gcashNumber, gcashQrUrl: settings.gcashQrUrl, mayaName: settings.mayaName, mayaNumber: settings.mayaNumber, mayaQrUrl: settings.mayaQrUrl }}
      unpaid={unpaid}
    />
  );
}
