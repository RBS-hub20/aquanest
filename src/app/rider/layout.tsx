import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RiderShell } from "./rider-shell";

export const metadata: Metadata = { title: { default: "Rider", template: "%s · AquaNest Rider" }, robots: { index: false } };

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("RIDER");
  const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
  return (
    <RiderShell user={{ id: user.id, name: user.name, phone: user.phone, avatarUrl: rider?.photoUrl ?? user.avatarUrl }} rider={rider ? { id: rider.id, isOnline: rider.isOnline, area: rider.area, isActive: rider.isActive } : null}>
      {children}
    </RiderShell>
  );
}
