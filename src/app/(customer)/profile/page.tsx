import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("CUSTOMER");
  const [gallons, points, settings, referrals] = await Promise.all([
    prisma.customerGallon.findMany({ where: { userId: user.id } }),
    prisma.loyaltyPoint.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    getSettings(),
    prisma.user.count({ where: { referredById: user.id } }),
  ]);
  const balance = points.length ? (await prisma.loyaltyPoint.aggregate({ where: { userId: user.id }, _sum: { points: true } }))._sum.points ?? 0 : 0;
  return (
    <ProfileClient
      user={{ name: user.name, email: user.email ?? "", phone: user.phone, referralCode: user.referralCode, referred: Boolean(user.referredById), balance: user.balance, deposit: user.depositBalance, avatarUrl: user.avatarUrl }}
      gallons={gallons.map((g) => ({ container: g.container, owned: g.owned, borrowed: g.borrowed }))}
      loyalty={{ balance, target: settings.loyaltyRefillsForFree, referralPoints: settings.referralRewardPoints, referrals }}
      history={points.map((p) => ({ id: p.id, points: p.points, type: p.type, note: p.note ?? "", createdAt: p.createdAt.toISOString() }))}
    />
  );
}
