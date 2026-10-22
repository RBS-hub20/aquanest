import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const SESSION_COOKIE = "an_session";
const PENDING_COOKIE = "an_pending_phone";
const secret = () => process.env.AUTH_SECRET || "aquanest-dev-secret";

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(token?: string) {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const value = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(value));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  return value;
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** App session (used in demo mode and as a fast-path after Supabase OTP). */
export function setSession(userId: string) {
  cookies().set(SESSION_COOKIE, `${userId}.${sign(userId)}`, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  cookies().delete(SESSION_COOKIE);
  cookies().delete(PENDING_COOKIE);
  const supabase = getServerSupabase();
  if (supabase) await supabase.auth.signOut().catch(() => {});
}

/** Phone number that passed OTP but has no profile yet. */
export function setPendingPhone(phone: string) {
  const value = `${phone}|${Date.now() + 15 * 60_000}`;
  cookies().set(PENDING_COOKIE, `${value}.${sign(value)}`, { ...cookieOpts, maxAge: 15 * 60 });
}

export function getPendingPhone() {
  const v = verify(cookies().get(PENDING_COOKIE)?.value);
  if (!v) return null;
  const [phone, exp] = v.split("|");
  if (!phone || Number(exp) < Date.now()) return null;
  return phone;
}

export function clearPendingPhone() {
  cookies().delete(PENDING_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const uid = verify(cookies().get(SESSION_COOKIE)?.value);
  if (uid) {
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (user?.isActive) return user;
  }
  if (isSupabaseConfigured) {
    const supabase = getServerSupabase();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    const sbUser = data.user;
    if (sbUser?.phone) {
      const phone = `+${sbUser.phone.replace(/^\+/, "")}`;
      const user = await prisma.user.findFirst({ where: { OR: [{ supabaseId: sbUser.id }, { phone }] } });
      if (user && !user.supabaseId) await prisma.user.update({ where: { id: user.id }, data: { supabaseId: sbUser.id } });
      if (user?.isActive) return user;
    }
  }
  return null;
});

export function homeFor(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "RIDER" ? "/rider" : "/dashboard";
}

export async function requireUser(role?: Role | Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const roles = role ? (Array.isArray(role) ? role : [role]) : null;
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertUser(role?: Role | Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const roles = role ? (Array.isArray(role) ? role : [role]) : null;
  if (roles && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
