import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PricingClient } from "./pricing-client";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const [products, s] = await Promise.all([prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }] }), getSettings()]);
  return (
    <PricingClient
      products={products.map(({ createdAt, updatedAt, imageUrl, ...p }) => ({ ...p, nameTl: p.nameTl ?? "" }))}
      fees={{
        baseDeliveryFee: s.baseDeliveryFee,
        deliveryFeePerKm: s.deliveryFeePerKm,
        freeDeliveryRadiusKm: s.freeDeliveryRadiusKm,
        freeDeliveryThreshold: s.freeDeliveryThreshold,
        maxDeliveryKm: s.maxDeliveryKm,
        gallonDepositFee: s.gallonDepositFee,
        loyaltyRefillsForFree: s.loyaltyRefillsForFree,
        referralRewardPoints: s.referralRewardPoints,
      }}
    />
  );
}
