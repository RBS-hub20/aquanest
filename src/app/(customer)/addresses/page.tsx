import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings, pricingSettings } from "@/lib/settings";
import { AddressesClient } from "./addresses-client";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("CUSTOMER");
  const [addresses, settings] = await Promise.all([
    prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
    getSettings(),
  ]);
  return (
    <AddressesClient
      addresses={addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1, barangay: a.barangay ?? "", city: a.city, province: a.province ?? "", landmark: a.landmark ?? "", lat: a.lat, lng: a.lng, distanceKm: a.distanceKm, isPrimary: a.isPrimary }))}
      store={{ lat: settings.lat, lng: settings.lng }}
      pricing={pricingSettings(settings)}
      maxKm={settings.maxDeliveryKm}
    />
  );
}
