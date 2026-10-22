import type { Metadata } from "next";
import { getSettings, isStoreOpen } from "@/lib/settings";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Store Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const { id, updatedAt, ...rest } = s;
  return <SettingsClient settings={rest} openNow={isStoreOpen(s)} />;
}
