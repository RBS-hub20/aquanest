"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderType, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertUser } from "@/lib/auth";
import { getSettings, isStoreOpen } from "@/lib/settings";
import { roadDistanceKm } from "@/lib/distance";
import { uploadImage } from "@/lib/storage";
import { createOrder, findValidPromo, syncCustomerTags, transitionOrder } from "@/lib/orders";
import { notifyUser } from "@/lib/notify";
import { round2 } from "@/lib/utils";

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong" });

// ── Preferences ─────────────────────────────────────────────────
export async function toggleRemindersAction(enabled: boolean): Promise<R> {
  const user = await assertUser("CUSTOMER");
  await prisma.user.update({ where: { id: user.id }, data: { remindersEnabled: enabled } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setPreferredPaymentAction(method: PaymentMethod): Promise<R> {
  const user = await assertUser("CUSTOMER");
  if (!["COD", "GCASH", "MAYA"].includes(method)) return { ok: false, error: "Invalid method" };
  await prisma.user.update({ where: { id: user.id }, data: { preferredPayment: method } });
  revalidatePath("/", "layout");
  return { ok: true };
}

const profileSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().or(z.literal("")).optional() });
export async function updateProfileAction(input: { name: string; email?: string }): Promise<R> {
  const user = await assertUser("CUSTOMER");
  const p = profileSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Please check your name and email." };
  await prisma.user.update({ where: { id: user.id }, data: { name: p.data.name, email: p.data.email || null } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function applyReferralAction(code: string): Promise<R> {
  const user = await assertUser("CUSTOMER");
  if (user.referredById) return { ok: false, error: "You already used a referral code." };
  const ref = await prisma.user.findUnique({ where: { referralCode: code.trim().toUpperCase() } });
  if (!ref || ref.id === user.id) return { ok: false, error: "INVALID" };
  await prisma.user.update({ where: { id: user.id }, data: { referredById: ref.id } });
  await notifyUser(ref.id, "New referral 🎉", `${user.name} joined using your code. You'll get bonus points after their first delivery!`);
  revalidatePath("/profile");
  return { ok: true };
}

// ── Addresses ───────────────────────────────────────────────────
const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(30),
  line1: z.string().trim().min(3).max(160),
  barangay: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(80),
  province: z.string().trim().max(80).optional(),
  landmark: z.string().trim().max(160).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isPrimary: z.boolean().optional(),
});

export async function saveAddressAction(input: z.infer<typeof addressSchema>): Promise<R<{ id: string; distanceKm: number }>> {
  try {
    const user = await assertUser("CUSTOMER");
    const p = addressSchema.parse(input);
    const settings = await getSettings();
    const distanceKm = await roadDistanceKm({ lat: settings.lat, lng: settings.lng }, { lat: p.lat, lng: p.lng });
    const count = await prisma.address.count({ where: { userId: user.id } });
    const makePrimary = p.isPrimary || count === 0;
    const { id, ...data } = p;
    const saved = await prisma.$transaction(async (tx) => {
      if (makePrimary) await tx.address.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
      if (id) {
        const own = await tx.address.findFirst({ where: { id, userId: user.id } });
        if (!own) throw new Error("Address not found");
        return tx.address.update({ where: { id }, data: { ...data, distanceKm, isPrimary: makePrimary || own.isPrimary } });
      }
      return tx.address.create({ data: { ...data, distanceKm, userId: user.id, isPrimary: makePrimary } });
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: saved.id, distanceKm } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAddressAction(id: string): Promise<R> {
  const user = await assertUser("CUSTOMER");
  const addr = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!addr) return { ok: false, error: "Not found" };
  await prisma.address.delete({ where: { id } });
  if (addr.isPrimary) {
    const next = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPrimaryAddressAction(id: string): Promise<R> {
  const user = await assertUser("CUSTOMER");
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isPrimary: false } }),
    prisma.address.updateMany({ where: { id, userId: user.id }, data: { isPrimary: true } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function estimateDistanceAction(lat: number, lng: number) {
  const settings = await getSettings();
  return roadDistanceKm({ lat: settings.lat, lng: settings.lng }, { lat, lng });
}

// ── Promo ───────────────────────────────────────────────────────
export async function validatePromoAction(code: string) {
  await assertUser();
  const promo = await findValidPromo(code);
  if (!promo) return { ok: false as const, error: "INVALID" };
  return { ok: true as const, data: { code: promo.code, type: promo.type, value: promo.value, minOrder: promo.minOrder, description: promo.description } };
}

// ── Orders ──────────────────────────────────────────────────────
const itemSchema = z.array(
  z.object({ productId: z.string(), orderType: z.enum(["REFILL", "NEW_GALLON", "BORROW", "RETURN"]), quantity: z.number().int().min(1).max(99) })
);

export async function placeOrderAction(form: FormData): Promise<R<{ id: string; code: string }>> {
  try {
    const user = await assertUser("CUSTOMER");
    const items = itemSchema.parse(JSON.parse(String(form.get("items") || "[]")));
    const paymentMethod = z.enum(["COD", "GCASH", "MAYA"]).parse(form.get("paymentMethod"));
    const isAsap = form.get("isAsap") === "true";
    const settings = await getSettings();
    if (isAsap && !isStoreOpen(settings)) throw new Error("We're closed right now — please schedule your delivery.");

    let scheduledDate: Date | null = null;
    let timeSlot: string | null = null;
    if (!isAsap) {
      const d = String(form.get("date") || "");
      timeSlot = String(form.get("timeSlot") || "") || null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !timeSlot) throw new Error("Please pick a delivery date and time slot");
      scheduledDate = new Date(`${d}T00:00:00+08:00`);
      const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()) + "T00:00:00+08:00");
      if (scheduledDate < today) throw new Error("Delivery date can't be in the past");
    }

    let paymentProofUrl: string | null = null;
    const proof = form.get("proof");
    if (proof && typeof proof !== "string" && proof.size > 0) paymentProofUrl = await uploadImage(proof, "payments");
    if (paymentMethod !== "COD" && !paymentProofUrl) throw new Error("Please upload your payment screenshot");

    const order = await createOrder({
      customerId: user.id,
      addressId: String(form.get("addressId") || ""),
      items: items as { productId: string; orderType: OrderType; quantity: number }[],
      paymentMethod,
      paymentProofUrl,
      promoCode: String(form.get("promoCode") || "") || null,
      freeRefills: Number(form.get("freeRefills") || 0),
      notes: String(form.get("notes") || "") || null,
      isAsap,
      scheduledDate,
      timeSlot,
      channel: "ONLINE",
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: order.id, code: order.code } };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelOrderAction(orderId: string): Promise<R> {
  try {
    const user = await assertUser("CUSTOMER");
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId: user.id } });
    if (!order) throw new Error("Order not found");
    if (order.status !== "PENDING") throw new Error("This order is already being prepared — please call us to cancel.");
    await transitionOrder(orderId, "CANCELLED", { cancelReason: "Cancelled by customer" });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Suki Mode subscriptions ─────────────────────────────────────
const subSchema = z.object({
  id: z.string().optional(),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1),
  timeSlot: z.string().min(3),
  addressId: z.string().min(1),
  paymentMethod: z.enum(["COD", "GCASH", "MAYA"]),
});

export async function saveSubscriptionAction(input: z.infer<typeof subSchema>): Promise<R> {
  try {
    const user = await assertUser("CUSTOMER");
    const p = subSchema.parse(input);
    const addr = await prisma.address.findFirst({ where: { id: p.addressId, userId: user.id } });
    if (!addr) throw new Error("Choose a valid address");
    const data = { days: Array.from(new Set(p.days)).sort(), items: p.items, timeSlot: p.timeSlot, addressId: p.addressId, paymentMethod: p.paymentMethod };
    if (p.id) {
      const own = await prisma.subscription.findFirst({ where: { id: p.id, userId: user.id } });
      if (!own) throw new Error("Not found");
      await prisma.subscription.update({ where: { id: p.id }, data });
    } else {
      await prisma.subscription.create({ data: { ...data, userId: user.id } });
    }
    await prisma.$transaction((tx) => syncCustomerTags(tx, user.id));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleSubscriptionAction(id: string, isActive: boolean): Promise<R> {
  const user = await assertUser("CUSTOMER");
  await prisma.subscription.updateMany({ where: { id, userId: user.id }, data: { isActive } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSubscriptionAction(id: string): Promise<R> {
  const user = await assertUser("CUSTOMER");
  await prisma.subscription.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Support ─────────────────────────────────────────────────────
export async function sendSupportMessageAction(message: string): Promise<R> {
  const user = await assertUser("CUSTOMER");
  const text = message.trim().slice(0, 1000);
  if (text.length < 3) return { ok: false, error: "Message is too short" };
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(admins.map((a) => notifyUser(a.id, `Support: ${user.name}`, text, "/admin/customers")));
  return { ok: true };
}

export async function getCartContextAction() {
  const user = await assertUser("CUSTOMER");
  return { balance: round2(user.balance) };
}
