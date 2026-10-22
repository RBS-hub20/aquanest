import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOrderingContext } from "@/lib/customer";
import { OrderClient } from "./order-client";

export const metadata: Metadata = { title: "Place Order" };

export default async function OrderPage({ searchParams }: { searchParams: { size?: string; step?: string } }) {
  const user = await requireUser("CUSTOMER");
  const ctx = await getOrderingContext(user.id);
  return <OrderClient ctx={ctx} preferredPayment={user.preferredPayment} initialSize={searchParams.size} jumpToCheckout={searchParams.step === "checkout"} />;
}
