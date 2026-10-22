import "server-only";
import { prisma } from "@/lib/prisma";
import { getHoldings, getLoyaltyBalance } from "@/lib/orders";
import { getSettings, isStoreOpen, pricingSettings } from "@/lib/settings";

/** Everything the ordering UI needs to price a cart on the client. */
export async function getOrderingContext(userId: string) {
  const [settings, products, holdings, loyalty, addresses, gallons] = await Promise.all([
    getSettings(),
    prisma.product.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] }),
    getHoldings(userId),
    getLoyaltyBalance(userId),
    prisma.address.findMany({ where: { userId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
    prisma.customerGallon.findMany({ where: { userId } }),
  ]);
  return {
    settings: {
      ...pricingSettings(settings),
      maxDeliveryKm: settings.maxDeliveryKm,
      gallonDepositFee: settings.gallonDepositFee,
      timeSlots: settings.timeSlots,
      isOpen: isStoreOpen(settings),
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      gcashName: settings.gcashName,
      gcashNumber: settings.gcashNumber,
      gcashQrUrl: settings.gcashQrUrl,
      mayaName: settings.mayaName,
      mayaNumber: settings.mayaNumber,
      mayaQrUrl: settings.mayaQrUrl,
      store: { lat: settings.lat, lng: settings.lng },
    },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      nameTl: p.nameTl,
      container: p.container,
      sizeLabel: p.sizeLabel,
      liters: p.liters,
      waterType: p.waterType,
      price: p.price,
      containerPrice: p.containerPrice,
      depositPrice: p.depositPrice,
      isReturnable: p.isReturnable,
      isPopular: p.isPopular,
    })),
    holdings,
    loyalty,
    freeRefills: Math.floor(loyalty / Math.max(1, settings.loyaltyRefillsForFree)),
    addresses: addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1, barangay: a.barangay, city: a.city, province: a.province, landmark: a.landmark, lat: a.lat, lng: a.lng, distanceKm: a.distanceKm, isPrimary: a.isPrimary })),
    gallons: gallons.map((g) => ({ container: g.container, owned: g.owned, borrowed: g.borrowed })),
  };
}

export type OrderingContext = Awaited<ReturnType<typeof getOrderingContext>>;
