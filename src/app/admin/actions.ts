"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ContainerType, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertUser } from "@/lib/auth";
import { assignRider, createOrder, syncCustomerTags, transitionOrder } from "@/lib/orders";
import { notifyUser, sendSms } from "@/lib/notify";
import { uploadImage } from "@/lib/storage";
import { broadcast } from "@/lib/realtime";
import { normalizePhone, isValidPhPhone, referralCodeFor, round2 } from "@/lib/utils";

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") : e instanceof Error ? e.message : "Something went wrong",
});
const admin = () => assertUser("ADMIN");
const done = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));

// ── Orders ──────────────────────────────────────────────────────
export async function updateOrderStatusAction(orderId: string, status: OrderStatus, opts?: { cancelReason?: string }): Promise<R> {
  try {
    await admin();
    await transitionOrder(orderId, status, opts);
    done("/admin", "/admin/orders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function assignRiderAction(orderId: string, riderId: string | null): Promise<R> {
  try {
    await admin();
    await assignRider(orderId, riderId);
    done("/admin/orders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markPaidAction(orderId: string, paid: boolean): Promise<R> {
  try {
    await admin();
    const o = await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: paid ? "PAID" : "UNPAID" } });
    if (o.customerId) await notifyUser(o.customerId, paid ? "Payment confirmed ✅" : "Payment needs attention", paid ? `We received your payment for ${o.code}. Salamat!` : `We couldn't verify the payment for ${o.code}. Please contact us.`, `/orders/${o.id}`);
    await broadcast(`order:${orderId}`, "status", {});
    done("/admin", "/admin/orders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const posSchema = z.object({
  customerId: z.string().nullable(),
  walkInName: z.string().max(80).nullable(),
  items: z.array(z.object({ productId: z.string(), orderType: z.enum(["REFILL", "NEW_GALLON", "BORROW", "RETURN"]), quantity: z.number().int().min(1).max(99) })).min(1),
  paymentMethod: z.enum(["CASH", "GCASH", "MAYA"]),
  amountTendered: z.number().min(0),
});

export async function createPosOrderAction(input: z.infer<typeof posSchema>): Promise<R<{ id: string; code: string; total: number }>> {
  try {
    await admin();
    const p = posSchema.parse(input);
    const order = await createOrder({
      customerId: p.customerId,
      walkInName: p.customerId ? null : p.walkInName || "Walk-in",
      items: p.items,
      paymentMethod: p.paymentMethod,
      channel: "POS",
      completeImmediately: true,
      amountTendered: p.amountTendered,
    });
    done("/admin", "/admin/pos", "/admin/reports");
    return { ok: true, data: { id: order.id, code: order.code, total: order.total } };
  } catch (e) {
    return fail(e);
  }
}

export async function searchCustomersAction(q: string) {
  await admin();
  const term = q.trim();
  if (term.length < 2) return [];
  const digits = term.replace(/\D/g, "");
  return prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      OR: [{ name: { contains: term, mode: "insensitive" } }, ...(digits.length >= 3 ? [{ phone: { contains: digits.replace(/^0/, "") } }] : [])],
    },
    take: 8,
    select: { id: true, name: true, phone: true, balance: true },
  });
}

// ── Customers (CRM) ─────────────────────────────────────────────
const newCustomerSchema = z.object({ name: z.string().trim().min(2).max(80), phone: z.string(), tags: z.array(z.string()).default([]) });
export async function createCustomerAction(input: z.infer<typeof newCustomerSchema>): Promise<R> {
  try {
    await admin();
    const p = newCustomerSchema.parse(input);
    const phone = normalizePhone(p.phone);
    if (!isValidPhPhone(phone)) throw new Error("Invalid PH mobile number");
    if (await prisma.user.findUnique({ where: { phone } })) throw new Error("Phone already registered");
    await prisma.user.create({ data: { name: p.name, phone, tags: p.tags, referralCode: referralCodeFor(p.name) } });
    done("/admin/customers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function recordPaymentAction(userId: string, amount: number, note?: string): Promise<R> {
  try {
    await admin();
    if (!(amount > 0)) throw new Error("Enter an amount");
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.user.update({ where: { id: userId }, data: { balance: Math.max(0, round2(u.balance - amount)) } });
      await syncCustomerTags(tx, userId);
    });
    await notifyUser(userId, "Payment received", `We recorded your payment of ₱${amount.toFixed(2)}. ${note ?? "Salamat po!"}`);
    done("/admin/customers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function adjustBalanceAction(userId: string, balance: number, depositBalance: number): Promise<R> {
  try {
    await admin();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { balance: Math.max(0, round2(balance)), depositBalance: Math.max(0, round2(depositBalance)) } });
      await syncCustomerTags(tx, userId);
    });
    done("/admin/customers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTagsAction(userId: string, tags: string[]): Promise<R> {
  await admin();
  await prisma.user.update({ where: { id: userId }, data: { tags: Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))).slice(0, 10) } });
  done("/admin/customers");
  return { ok: true };
}

export async function adjustGallonsAction(userId: string, container: ContainerType, owned: number, borrowed: number): Promise<R> {
  try {
    await admin();
    await prisma.customerGallon.upsert({
      where: { userId_container: { userId, container } },
      create: { userId, container, owned: Math.max(0, owned), borrowed: Math.max(0, borrowed) },
      update: { owned: Math.max(0, owned), borrowed: Math.max(0, borrowed) },
    });
    done("/admin/customers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleCustomerActiveAction(userId: string, isActive: boolean): Promise<R> {
  await admin();
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  done("/admin/customers");
  return { ok: true };
}

export async function smsBlastAction(input: { audience: "ALL" | "SUKI" | "UTANG" | "SELECTED"; userIds?: string[]; message: string; campaign?: string }): Promise<R<{ sent: number }>> {
  try {
    await admin();
    const message = input.message.trim();
    if (message.length < 5) throw new Error("Message is too short");
    if (message.length > 480) throw new Error("Message is too long (max 480 chars)");
    const where =
      input.audience === "SUKI"
        ? { tags: { has: "Suki" } }
        : input.audience === "UTANG"
          ? { balance: { gt: 0 } }
          : input.audience === "SELECTED"
            ? { id: { in: input.userIds ?? [] } }
            : {};
    const users = await prisma.user.findMany({ where: { role: "CUSTOMER", isActive: true, ...where }, select: { id: true, name: true, phone: true, balance: true } });
    for (const u of users) {
      const text = message
        .replaceAll("{name}", u.name.split(" ")[0] ?? u.name)
        .replaceAll("{balance}", `₱${u.balance.toFixed(2)}`);
      await sendSms(u.phone, text, { name: u.name, campaign: input.campaign || input.audience });
      await notifyUser(u.id, "AquaNest", text);
    }
    done("/admin/customers");
    return { ok: true, data: { sent: users.length } };
  } catch (e) {
    return fail(e);
  }
}

// ── Inventory ───────────────────────────────────────────────────
const invSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  category: z.enum(["GALLON", "SUPPLY"]),
  container: z.enum(["ROUND_19L", "SLIM_19L", "GALLON_10L", "GALLON_6L", "BOTTLED_CASE"]).nullable().optional(),
  filled: z.number().int().min(0).default(0),
  empty: z.number().int().min(0).default(0),
  atCustomer: z.number().int().min(0).default(0),
  forCleaning: z.number().int().min(0).default(0),
  damaged: z.number().int().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
  unit: z.string().max(20).default("pcs"),
  lowStockThreshold: z.number().int().min(0).default(10),
});

export async function saveInventoryAction(input: z.infer<typeof invSchema>): Promise<R> {
  try {
    await admin();
    const { id, ...data } = invSchema.parse(input);
    if (id) await prisma.inventory.update({ where: { id }, data });
    else await prisma.inventory.create({ data });
    done("/admin/inventory", "/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteInventoryAction(id: string): Promise<R> {
  await admin();
  await prisma.inventory.delete({ where: { id } });
  done("/admin/inventory");
  return { ok: true };
}

const BUCKETS = ["filled", "empty", "atCustomer", "forCleaning", "damaged"] as const;
export async function moveGallonsAction(id: string, from: (typeof BUCKETS)[number], to: (typeof BUCKETS)[number], qty: number): Promise<R> {
  try {
    await admin();
    if (!BUCKETS.includes(from) || !BUCKETS.includes(to) || from === to) throw new Error("Invalid move");
    const n = Math.floor(qty);
    if (n < 1) throw new Error("Quantity must be at least 1");
    const row = await prisma.inventory.findUniqueOrThrow({ where: { id } });
    if (row[from] < n) throw new Error(`Only ${row[from]} available`);
    await prisma.inventory.update({ where: { id }, data: { [from]: { decrement: n }, [to]: { increment: n } } });
    done("/admin/inventory", "/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function adjustSupplyAction(id: string, delta: number): Promise<R> {
  try {
    await admin();
    const row = await prisma.inventory.findUniqueOrThrow({ where: { id } });
    await prisma.inventory.update({ where: { id }, data: { quantity: Math.max(0, row.quantity + Math.round(delta)) } });
    done("/admin/inventory", "/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createGallonsAction(container: ContainerType, count: number): Promise<R> {
  try {
    await admin();
    const n = Math.min(100, Math.max(1, Math.floor(count)));
    const prefix = { ROUND_19L: "R", SLIM_19L: "S", GALLON_10L: "T", GALLON_6L: "G", BOTTLED_CASE: "B" }[container];
    const last = await prisma.gallon.findFirst({ where: { serial: { startsWith: `AQN-${prefix}-` } }, orderBy: { serial: "desc" } });
    let next = last ? Number(last.serial.split("-")[2]) + 1 : 1;
    await prisma.gallon.createMany({ data: Array.from({ length: n }, () => ({ serial: `AQN-${prefix}-${String(next++).padStart(4, "0")}`, container })) });
    done("/admin/inventory");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateGallonStatusAction(id: string, status: "FILLED" | "EMPTY" | "AT_CUSTOMER" | "FOR_CLEANING" | "DAMAGED"): Promise<R> {
  await admin();
  await prisma.gallon.update({ where: { id }, data: { status, customerId: status === "AT_CUSTOMER" ? undefined : null } });
  done("/admin/inventory");
  return { ok: true };
}

export async function deleteGallonAction(id: string): Promise<R> {
  await admin();
  await prisma.gallon.delete({ where: { id } });
  done("/admin/inventory");
  return { ok: true };
}

// ── Riders ──────────────────────────────────────────────────────
const riderSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  phone: z.string(),
  area: z.string().trim().min(1).max(80),
  vehicle: z.string().trim().min(1).max(40),
  plateNumber: z.string().trim().max(20).optional(),
});

export async function saveRiderAction(input: z.infer<typeof riderSchema>): Promise<R> {
  try {
    await admin();
    const p = riderSchema.parse(input);
    const phone = normalizePhone(p.phone);
    if (!isValidPhPhone(phone)) throw new Error("Invalid PH mobile number");
    if (p.id) {
      const rider = await prisma.rider.findUniqueOrThrow({ where: { id: p.id } });
      const clash = await prisma.user.findFirst({ where: { phone, NOT: { id: rider.userId } } });
      if (clash) throw new Error("Phone already used by another account");
      await prisma.$transaction([
        prisma.user.update({ where: { id: rider.userId }, data: { name: p.name, phone } }),
        prisma.rider.update({ where: { id: p.id }, data: { area: p.area, vehicle: p.vehicle, plateNumber: p.plateNumber || null } }),
      ]);
    } else {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing && existing.role !== "CUSTOMER") throw new Error("Phone already belongs to staff");
      if (existing && (await prisma.rider.findUnique({ where: { userId: existing.id } }))) throw new Error("Already a rider");
      const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { role: "RIDER", name: p.name } })
        : await prisma.user.create({ data: { name: p.name, phone, role: "RIDER", referralCode: referralCodeFor(p.name) } });
      const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
      await prisma.rider.create({ data: { userId: user.id, area: p.area, vehicle: p.vehicle, plateNumber: p.plateNumber || null, lat: settings?.lat, lng: settings?.lng } });
    }
    done("/admin/riders", "/admin/orders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleRiderAction(id: string, isActive: boolean): Promise<R> {
  await admin();
  await prisma.rider.update({ where: { id }, data: { isActive, ...(isActive ? {} : { isOnline: false }) } });
  done("/admin/riders");
  return { ok: true };
}

export async function uploadRiderPhotoAction(id: string, form: FormData): Promise<R> {
  try {
    await admin();
    const file = form.get("file");
    if (!file || typeof file === "string") throw new Error("No file");
    const url = await uploadImage(file, "riders");
    const rider = await prisma.rider.update({ where: { id }, data: { photoUrl: url } });
    await prisma.user.update({ where: { id: rider.userId }, data: { avatarUrl: url } });
    done("/admin/riders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Pricing & products ──────────────────────────────────────────
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  nameTl: z.string().trim().max(80).optional(),
  container: z.enum(["ROUND_19L", "SLIM_19L", "GALLON_10L", "GALLON_6L", "BOTTLED_CASE"]),
  sizeLabel: z.string().trim().min(1).max(60),
  liters: z.number().min(0),
  waterType: z.enum(["PURIFIED", "MINERAL", "ALKALINE"]),
  price: z.number().min(0),
  containerPrice: z.number().min(0),
  depositPrice: z.number().min(0),
  isReturnable: z.boolean(),
  isPopular: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().default(0),
});

export async function saveProductAction(input: z.infer<typeof productSchema>): Promise<R> {
  try {
    await admin();
    const { id, ...data } = productSchema.parse(input);
    const clash = await prisma.product.findFirst({ where: { container: data.container, waterType: data.waterType, NOT: id ? { id } : undefined } });
    if (clash) throw new Error(`A ${data.waterType.toLowerCase()} ${data.container} product already exists — edit it instead`);
    if (id) await prisma.product.update({ where: { id }, data });
    else await prisma.product.create({ data });
    done("/admin/pricing", "/order", "/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProductAction(id: string): Promise<R> {
  try {
    await admin();
    const used = await prisma.orderItem.count({ where: { productId: id } });
    if (used) await prisma.product.update({ where: { id }, data: { isActive: false } });
    else await prisma.product.delete({ where: { id } });
    done("/admin/pricing");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const feesSchema = z.object({
  baseDeliveryFee: z.number().min(0),
  deliveryFeePerKm: z.number().min(0),
  freeDeliveryRadiusKm: z.number().min(0),
  freeDeliveryThreshold: z.number().min(0),
  maxDeliveryKm: z.number().min(0.5),
  gallonDepositFee: z.number().min(0),
  loyaltyRefillsForFree: z.number().int().min(1).max(100),
  referralRewardPoints: z.number().int().min(0).max(50),
  applyDepositToAll: z.boolean().optional(),
});

export async function saveFeesAction(input: z.infer<typeof feesSchema>): Promise<R> {
  try {
    await admin();
    const { applyDepositToAll, ...data } = feesSchema.parse(input);
    await prisma.storeSettings.update({ where: { id: 1 }, data });
    if (applyDepositToAll) await prisma.product.updateMany({ where: { isReturnable: true }, data: { depositPrice: data.gallonDepositFee } });
    done("/admin/pricing", "/order");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Promos ──────────────────────────────────────────────────────
const promoSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3).max(20).regex(/^[A-Z0-9]+$/i, "Letters and numbers only"),
  description: z.string().max(120).optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(),
  minOrder: z.number().min(0),
  maxUses: z.number().int().positive().nullable(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
});

export async function savePromoAction(input: z.infer<typeof promoSchema>): Promise<R> {
  try {
    await admin();
    const { id, expiresAt, ...rest } = promoSchema.parse(input);
    if (rest.type === "PERCENT" && rest.value > 100) throw new Error("Percent can't exceed 100");
    const data = { ...rest, code: rest.code.toUpperCase(), expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59+08:00`) : null };
    const clash = await prisma.promoCode.findFirst({ where: { code: data.code, NOT: id ? { id } : undefined } });
    if (clash) throw new Error("Code already exists");
    if (id) await prisma.promoCode.update({ where: { id }, data });
    else await prisma.promoCode.create({ data });
    done("/admin/promos");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePromoAction(id: string): Promise<R> {
  await admin();
  const used = await prisma.order.count({ where: { promoCodeId: id } });
  if (used) await prisma.promoCode.update({ where: { id }, data: { isActive: false } });
  else await prisma.promoCode.delete({ where: { id } });
  done("/admin/promos");
  return { ok: true };
}

// ── Expenses ────────────────────────────────────────────────────
const expenseSchema = z.object({
  id: z.string().optional(),
  category: z.enum(["SEAL", "WATER", "ELECTRICITY", "FUEL", "SALARY", "MAINTENANCE", "RENT", "SUPPLIES", "OTHER"]),
  description: z.string().trim().min(2).max(160),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function saveExpenseAction(input: z.infer<typeof expenseSchema>): Promise<R> {
  try {
    const user = await admin();
    const { id, date, ...rest } = expenseSchema.parse(input);
    const data = { ...rest, date: new Date(`${date}T12:00:00+08:00`) };
    if (id) await prisma.expense.update({ where: { id }, data });
    else await prisma.expense.create({ data: { ...data, createdById: user.id } });
    done("/admin/expenses", "/admin/reports", "/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteExpenseAction(id: string): Promise<R> {
  await admin();
  await prisma.expense.delete({ where: { id } });
  done("/admin/expenses", "/admin/reports");
  return { ok: true };
}

// ── Store settings ──────────────────────────────────────────────
const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email(),
  website: z.string().trim().max(80),
  address: z.string().trim().min(5).max(200),
  lat: z.number(),
  lng: z.number(),
  gcashName: z.string().trim().max(80),
  gcashNumber: z.string().trim().max(30),
  mayaName: z.string().trim().max(80),
  mayaNumber: z.string().trim().max(30),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  operatingDays: z.array(z.number().int().min(0).max(6)),
  autoClose: z.boolean(),
  manualClosed: z.boolean(),
  timeSlots: z.array(z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)).min(1),
});

export async function saveSettingsAction(form: FormData): Promise<R> {
  try {
    await admin();
    const data = settingsSchema.parse(JSON.parse(String(form.get("data"))));
    const files: Record<string, string> = {};
    for (const key of ["logo", "gcashQr", "mayaQr"] as const) {
      const f = form.get(key);
      if (f && typeof f !== "string" && f.size > 0) files[key] = await uploadImage(f, "store");
    }
    await prisma.storeSettings.update({
      where: { id: 1 },
      data: {
        ...data,
        ...(files.logo ? { logoUrl: files.logo } : {}),
        ...(files.gcashQr ? { gcashQrUrl: files.gcashQr } : {}),
        ...(files.mayaQr ? { mayaQrUrl: files.mayaQr } : {}),
        ...(form.get("clearGcashQr") === "1" ? { gcashQrUrl: null } : {}),
        ...(form.get("clearMayaQr") === "1" ? { mayaQrUrl: null } : {}),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function runSubscriptionsNowAction(): Promise<R<{ created: number }>> {
  await admin();
  const { runDueSubscriptions } = await import("@/lib/subscriptions");
  const r = await runDueSubscriptions();
  done("/admin", "/admin/orders");
  return { ok: true, data: { created: r.created } };
}
