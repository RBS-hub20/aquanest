import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SupportClient } from "./support-client";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const s = await getSettings();
  return <SupportClient store={{ phone: s.phone, email: s.email, address: s.address, lat: s.lat, lng: s.lng, open: s.openTime, close: s.closeTime }} />;
}
