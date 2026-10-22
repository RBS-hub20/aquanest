"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function setLocaleAction(locale: "en" | "tl") {
  const value = locale === "tl" ? "tl" : "en";
  cookies().set("NEXT_LOCALE", value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user && user.language !== value) await prisma.user.update({ where: { id: user.id }, data: { language: value } });
  revalidatePath("/", "layout");
}

export async function markNotificationsReadAction(ids?: string[]) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({ where: { userId: user.id, read: false, ...(ids ? { id: { in: ids } } : {}) }, data: { read: true } });
}

export async function getNotificationsAction() {
  const user = await getCurrentUser();
  if (!user) return { items: [], unread: 0 };
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return { items: items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })), unread };
}
