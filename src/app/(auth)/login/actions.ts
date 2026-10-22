"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearPendingPhone, clearSession, getPendingPhone, homeFor, setPendingPhone, setSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { DEMO_OTP, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { isValidPhPhone, normalizePhone, referralCodeFor } from "@/lib/utils";

type Result = { ok: true; redirect?: string; needsProfile?: boolean } | { ok: false; error: string };

/** Seeded demo accounts use the fixed demo OTP even when Supabase is configured. */
async function isDemoAccount(phone: string) {
  if (!isDemoMode) return false;
  return phone.startsWith("+63917000") || phone.startsWith("+63917111") || phone.startsWith("+63917123450");
}

export async function sendOtpAction(rawPhone: string): Promise<Result> {
  const phone = normalizePhone(rawPhone);
  if (!isValidPhPhone(phone)) return { ok: false, error: "INVALID_PHONE" };
  if (!isSupabaseConfigured || (await isDemoAccount(phone))) return { ok: true };
  const supabase = getServerSupabase()!;
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function finishLogin(phone: string, supabaseId?: string): Promise<Result> {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    setPendingPhone(phone);
    return { ok: true, needsProfile: true };
  }
  if (!user.isActive) return { ok: false, error: "Account disabled — please contact AquaNest." };
  if (supabaseId && !user.supabaseId) await prisma.user.update({ where: { id: user.id }, data: { supabaseId } });
  setSession(user.id);
  cookies().set("NEXT_LOCALE", user.language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true, redirect: homeFor(user.role) };
}

export async function verifyOtpAction(rawPhone: string, code: string): Promise<Result> {
  const phone = normalizePhone(rawPhone);
  if (!isValidPhPhone(phone) || !/^\d{6}$/.test(code)) return { ok: false, error: "INVALID_CODE" };

  if (!isSupabaseConfigured || (await isDemoAccount(phone))) {
    if (code !== DEMO_OTP) return { ok: false, error: "INVALID_CODE" };
    return finishLogin(phone);
  }
  const supabase = getServerSupabase()!;
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error || !data.user) return { ok: false, error: "INVALID_CODE" };
  return finishLogin(phone, data.user.id);
}

const profileSchema = z.object({ name: z.string().trim().min(2).max(80), referral: z.string().trim().max(20).optional() });

export async function completeProfileAction(input: { name: string; referral?: string }): Promise<Result> {
  const phone = getPendingPhone();
  if (!phone) return { ok: false, error: "Session expired — please request a new code." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please enter your full name." };

  let referredById: string | undefined;
  if (parsed.data.referral) {
    const ref = await prisma.user.findUnique({ where: { referralCode: parsed.data.referral.toUpperCase() } });
    referredById = ref?.id;
  }
  let supabaseId: string | undefined;
  const supabase = getServerSupabase();
  if (supabase) supabaseId = (await supabase.auth.getUser()).data.user?.id;

  const language = cookies().get("NEXT_LOCALE")?.value === "tl" ? "tl" : "en";
  let referralCode = referralCodeFor(parsed.data.name);
  while (await prisma.user.findUnique({ where: { referralCode } })) referralCode = referralCodeFor(parsed.data.name);

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone, name: parsed.data.name, referralCode, referredById, supabaseId, language },
  });
  clearPendingPhone();
  setSession(user.id);
  return { ok: true, redirect: homeFor(user.role) };
}

export async function demoLoginAction(role: "CUSTOMER" | "ADMIN" | "RIDER"): Promise<Result> {
  if (!isDemoMode) return { ok: false, error: "Demo mode is disabled" };
  const user = await prisma.user.findFirst({ where: { role, isActive: true }, orderBy: { createdAt: "asc" } });
  if (!user) return { ok: false, error: "Run `npm run db:seed` first" };
  setSession(user.id);
  return { ok: true, redirect: homeFor(user.role) };
}

export async function logoutAction() {
  await clearSession();
  return { ok: true as const, redirect: "/login" };
}
