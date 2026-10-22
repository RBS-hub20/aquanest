import "server-only";
import { prisma } from "@/lib/prisma";
import { manilaTimeHHMM, manilaWeekday } from "@/lib/utils";
import type { StoreSettings } from "@prisma/client";

export async function getSettings() {
  return prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export function isStoreOpen(s: Pick<StoreSettings, "openTime" | "closeTime" | "operatingDays" | "autoClose" | "manualClosed">, now = new Date()) {
  if (s.manualClosed) return false;
  if (!s.autoClose) return true;
  if (!s.operatingDays.includes(manilaWeekday(now))) return false;
  const t = manilaTimeHHMM(now);
  return t >= s.openTime && t < s.closeTime;
}

export function pricingSettings(s: StoreSettings) {
  return {
    baseDeliveryFee: s.baseDeliveryFee,
    deliveryFeePerKm: s.deliveryFeePerKm,
    freeDeliveryRadiusKm: s.freeDeliveryRadiusKm,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    loyaltyRefillsForFree: s.loyaltyRefillsForFree,
  };
}

export function storeInfo(s: StoreSettings) {
  return { lat: s.lat, lng: s.lng, name: s.storeName, address: s.address, phone: s.phone, website: s.website };
}
