import "server-only";
import type { ContainerType, OrderChannel, OrderStatus, OrderType, PaymentMethod, Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeCart, type Holdings, type PromoInput } from "@/lib/pricing";
import { getSettings, pricingSettings } from "@/lib/settings";
import { notifyUser, sendSms } from "@/lib/notify";
import { broadcast } from "@/lib/realtime";
import { firstName, orderCode, round2 } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

export const orderInclude = {
  items: true,
  customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
  rider: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
  address: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export async function getHoldings(userId: string | null | undefined): Promise<Holdings> {
  if (!userId) return { held: {}, borrowed: {} };
  const rows = await prisma.customerGallon.findMany({ where: { userId } });
  const held: Holdings["held"] = {};
  const borrowed: Holdings["borrowed"] = {};
  for (const r of rows) {
    held[r.container] = r.owned + r.borrowed;
    borrowed[r.container] = r.borrowed;
  }
  return { held, borrowed };
}

export async function getLoyaltyBalance(userId: string) {
  const agg = await prisma.loyaltyPoint.aggregate({ where: { userId }, _sum: { points: true } });
  return agg._sum.points ?? 0;
}

export async function findValidPromo(code: string | null | undefined) {
  if (!code) return null;
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.isActive) return null;
  if (promo.expiresAt && promo.expiresAt < new Date()) return null;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return null;
  return promo;
}

export function toPriced(p: Product) {
  return {
    id: p.id,
    name: p.name,
    container: p.container,
    price: p.price,
    containerPrice: p.containerPrice,
    depositPrice: p.depositPrice,
    isReturnable: p.isReturnable,
  };
}

export interface CreateOrderInput {
  customerId?: string | null;
  walkInName?: string | null;
  addressId?: string | null;
  items: { productId: string; orderType: OrderType; quantity: number }[];
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string | null;
  promoCode?: string | null;
  freeRefills?: number;
  notes?: string | null;
  isAsap?: boolean;
  scheduledDate?: Date | null;
  timeSlot?: string | null;
  channel?: OrderChannel;
  subscriptionId?: string | null;
  /** POS: paid & handed over at the counter */
  completeImmediately?: boolean;
  amountTendered?: number;
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) throw new Error("Cart is empty");
  const settings = await getSettings();
  const products = await prisma.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) }, isActive: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = input.items
    .filter((i) => byId.has(i.productId) && i.quantity > 0)
    .map((i) => ({ product: toPriced(byId.get(i.productId)!), orderType: i.orderType, quantity: Math.min(99, Math.floor(i.quantity)) }));
  if (!lines.length) throw new Error("No available products in cart");

  const address = input.addressId
    ? await prisma.address.findFirst({ where: { id: input.addressId, userId: input.customerId ?? undefined } })
    : null;
  if (input.channel !== "POS" && !address) throw new Error("Please choose a delivery address");
  if (address && address.distanceKm > settings.maxDeliveryKm) throw new Error(`Sorry, we only deliver within ${settings.maxDeliveryKm} km`);

  let holdings = await getHoldings(input.customerId);
  if (input.channel === "POS") {
    // Walk-ins hand over their own empties at the counter — only explicit "Borrow" lines carry a deposit.
    const all = { ROUND_19L: 99, SLIM_19L: 99, GALLON_10L: 99, GALLON_6L: 99 };
    holdings = { held: all, borrowed: input.customerId ? holdings.borrowed : all };
  }
  const promo = await findValidPromo(input.promoCode);
  const loyalty = input.customerId ? await getLoyaltyBalance(input.customerId) : 0;
  const maxFree = Math.floor(loyalty / Math.max(1, settings.loyaltyRefillsForFree));
  const totals = computeCart(lines, {
    settings: pricingSettings(settings),
    holdings,
    distanceKm: address?.distanceKm ?? 0,
    promo: promo ? ({ code: promo.code, type: promo.type, value: promo.value, minOrder: promo.minOrder } satisfies PromoInput) : null,
    freeRefillsToUse: Math.min(input.freeRefills ?? 0, maxFree),
    skipDelivery: input.channel === "POS",
  });
  const promoApplied = promo && !totals.promoError ? promo : null;
  if (input.completeImmediately && input.paymentMethod === "CASH" && input.amountTendered != null && input.amountTendered < totals.total) {
    throw new Error("Amount tendered is less than the total");
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        code: orderCode(),
        customerId: input.customerId || null,
        walkInName: input.walkInName || null,
        addressId: address?.id ?? null,
        addressText: address ? [address.line1, address.barangay, address.city].filter(Boolean).join(", ") : null,
        lat: address?.lat,
        lng: address?.lng,
        distanceKm: address?.distanceKm ?? 0,
        channel: input.channel ?? "ONLINE",
        paymentMethod: input.paymentMethod,
        paymentStatus: input.completeImmediately ? "PAID" : input.paymentProofUrl ? "FOR_VERIFICATION" : "UNPAID",
        paymentProofUrl: input.paymentProofUrl || null,
        subtotal: totals.subtotal,
        depositTotal: totals.depositTotal,
        deliveryFee: totals.deliveryFee,
        discount: totals.discount,
        total: totals.total,
        promoCodeId: promoApplied?.id ?? null,
        freeRefillsUsed: totals.freeRefillsUsed,
        notes: input.notes?.slice(0, 500) || null,
        isAsap: input.isAsap ?? true,
        scheduledDate: input.isAsap === false ? input.scheduledDate ?? null : null,
        timeSlot: input.isAsap === false ? input.timeSlot ?? null : null,
        subscriptionId: input.subscriptionId ?? null,
        items: {
          create: totals.lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            orderType: l.orderType,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            containerPrice: l.containerPrice,
            deposit: l.deposit,
            borrowQty: l.borrowQty,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });
    if (promoApplied) await tx.promoCode.update({ where: { id: promoApplied.id }, data: { usedCount: { increment: 1 } } });
    if (input.customerId && totals.freeRefillsUsed > 0) {
      await tx.loyaltyPoint.create({
        data: {
          userId: input.customerId,
          orderId: created.id,
          type: "REDEEM",
          points: -totals.freeRefillsUsed * settings.loyaltyRefillsForFree,
          note: `${totals.freeRefillsUsed} free refill(s) redeemed`,
        },
      });
    }
    if (input.completeImmediately) {
      await tx.order.update({
        where: { id: created.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          preparingAt: new Date(),
          collectedAmount: totals.total,
          collectedVia: input.paymentMethod,
        },
      });
      await applyDeliveredEffects(tx, created.id, totals.total);
    }
    return created;
  });

  await broadcast("admin", "order:new", { id: order.id, code: order.code });
  if (input.customerId && !input.completeImmediately) {
    await notifyUser(input.customerId, `Order ${order.code} received`, "Salamat! We're preparing your water. 💧", `/orders/${order.id}`);
  }
  return order;
}

const containerOf = new Map<string, ContainerType>();
async function productContainer(tx: Tx, productId: string) {
  if (!containerOf.has(productId)) {
    const p = await tx.product.findUnique({ where: { id: productId }, select: { container: true } });
    if (p) containerOf.set(productId, p.container);
  }
  return containerOf.get(productId)!;
}

async function adjustInventory(tx: Tx, container: ContainerType, data: Prisma.InventoryUpdateManyMutationInput) {
  await tx.inventory.updateMany({ where: { category: "GALLON", container }, data });
}

async function consumeSupply(tx: Tx, name: string, qty: number) {
  if (qty > 0) await tx.inventory.updateMany({ where: { category: "SUPPLY", name }, data: { quantity: { decrement: qty } } });
}

/** Gallon tracking, inventory, deposits, utang, loyalty & referral — runs once when an order is delivered. */
async function applyDeliveredEffects(tx: Tx, orderId: string, collected: number) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const settings = await tx.storeSettings.findUnique({ where: { id: 1 } });
  let sealed = 0;
  let cases = 0;
  let earn = 0;

  for (const item of order.items) {
    const container = await productContainer(tx, item.productId);
    if (container === "BOTTLED_CASE") {
      cases += item.quantity;
      continue;
    }
    if (item.orderType !== "RETURN") {
      sealed += item.quantity;
      earn += item.quantity;
    }
    // Station container stock: own-gallon refills don't touch it; sold gallons leave it;
    // lent gallons move to "at customer"; returned gallons come back for cleaning.
    if (item.orderType === "NEW_GALLON") {
      await adjustInventory(tx, container, { filled: { decrement: item.quantity } });
    } else if (item.borrowQty > 0) {
      await adjustInventory(tx, container, { filled: { decrement: item.borrowQty }, atCustomer: { increment: item.borrowQty } });
    } else if (item.orderType === "RETURN") {
      await adjustInventory(tx, container, { atCustomer: { decrement: item.quantity }, forCleaning: { increment: item.quantity } });
    }
    if (order.customerId) {
      const key = { userId_container: { userId: order.customerId, container } };
      const owned = item.orderType === "NEW_GALLON" ? item.quantity : 0;
      const borrowed = item.orderType === "RETURN" ? -item.quantity : item.borrowQty;
      if (owned || borrowed) {
        const existing = await tx.customerGallon.findUnique({ where: key });
        await tx.customerGallon.upsert({
          where: key,
          create: { userId: order.customerId, container, owned: Math.max(0, owned), borrowed: Math.max(0, borrowed) },
          update: { owned: { increment: owned }, borrowed: Math.max(0, (existing?.borrowed ?? 0) + borrowed) },
        });
      }
    }
  }
  await consumeSupply(tx, "Seals & Caps", sealed);
  await consumeSupply(tx, "500ml Bottled Water (case)", cases);

  if (order.customerId) {
    const shortBy = round2(order.total - collected);
    await tx.user.update({
      where: { id: order.customerId },
      data: {
        depositBalance: { increment: order.depositTotal },
        ...(shortBy > 0 && order.paymentMethod !== "GCASH" && order.paymentMethod !== "MAYA" ? { balance: { increment: shortBy } } : {}),
      },
    });
    const earnable = Math.max(0, earn - order.freeRefillsUsed);
    if (earnable > 0) {
      await tx.loyaltyPoint.create({ data: { userId: order.customerId, orderId, points: earnable, type: "EARN", note: `${earnable} refill(s) on ${order.code}` } });
    }
    // Referral reward on the customer's first delivered order
    const customer = await tx.user.findUnique({ where: { id: order.customerId }, select: { referredById: true, name: true } });
    if (customer?.referredById) {
      const deliveredCount = await tx.order.count({ where: { customerId: order.customerId, status: "DELIVERED" } });
      if (deliveredCount === 1) {
        await tx.loyaltyPoint.create({
          data: {
            userId: customer.referredById,
            points: settings?.referralRewardPoints ?? 2,
            type: "REFERRAL",
            note: `Referral bonus — ${customer.name}'s first order`,
          },
        });
      }
    }
    await syncCustomerTags(tx, order.customerId);
  }
}

/** Keeps CRM tags ("Suki", "May Utang") in sync with real data. */
export async function syncCustomerTags(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { tags: true, balance: true } });
  if (!user) return;
  const delivered = await tx.order.count({ where: { customerId: userId, status: "DELIVERED" } });
  const hasSub = await tx.subscription.count({ where: { userId, isActive: true } });
  const tags = new Set(user.tags.filter((t) => t !== "Suki" && t !== "May Utang"));
  if (delivered >= 5 || hasSub) tags.add("Suki");
  if (user.balance > 0) tags.add("May Utang");
  await tx.user.update({ where: { id: userId }, data: { tags: Array.from(tags) } });
}

const FINAL: OrderStatus[] = ["DELIVERED", "CANCELLED"];

export interface TransitionOpts {
  riderId?: string | null;
  deliveryPhotoUrl?: string | null;
  collectedAmount?: number;
  collectedVia?: PaymentMethod;
  cancelReason?: string;
}

export async function transitionOrder(orderId: string, to: OrderStatus, opts: TransitionOpts = {}) {
  const current = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { rider: { include: { user: true } } } });
  if (current.status === to && !opts.riderId) return current;
  if (FINAL.includes(current.status)) throw new Error(`Order is already ${current.status.toLowerCase()}`);

  let riderId = opts.riderId ?? current.riderId;
  if (to === "OUT_FOR_DELIVERY" && !riderId) {
    // auto-assign the least busy active rider
    const riders = await prisma.rider.findMany({
      where: { isActive: true },
      include: { _count: { select: { orders: { where: { status: "OUT_FOR_DELIVERY" } } } } },
    });
    riders.sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a._count.orders - b._count.orders);
    riderId = riders[0]?.id ?? null;
    if (!riderId) throw new Error("No active riders — add one in Rider Management");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.OrderUncheckedUpdateInput = { status: to, riderId };
    if (to === "PREPARING") data.preparingAt = current.preparingAt ?? now;
    if (to === "OUT_FOR_DELIVERY") data.outForDeliveryAt = now;
    if (to === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = opts.cancelReason?.slice(0, 300) || null;
      if (current.customerId && current.freeRefillsUsed > 0) {
        await tx.loyaltyPoint.deleteMany({ where: { orderId, type: "REDEEM" } });
      }
      if (current.promoCodeId) await tx.promoCode.update({ where: { id: current.promoCodeId }, data: { usedCount: { decrement: 1 } } });
    }
    if (to === "DELIVERED") {
      const collected = opts.collectedAmount ?? (current.paymentMethod === "COD" ? current.total : current.paymentStatus === "PAID" ? current.total : 0);
      data.deliveredAt = now;
      data.deliveryPhotoUrl = opts.deliveryPhotoUrl ?? current.deliveryPhotoUrl;
      data.collectedAmount = round2(collected);
      data.collectedVia = opts.collectedVia ?? (current.paymentMethod === "COD" ? "CASH" : current.paymentMethod);
      if (current.paymentMethod === "COD" || opts.collectedVia) data.paymentStatus = collected >= current.total ? "PAID" : "UNPAID";
      data.preparingAt = current.preparingAt ?? now;
      data.outForDeliveryAt = current.outForDeliveryAt ?? now;
    }
    const o = await tx.order.update({ where: { id: orderId }, data, include: orderInclude });
    if (to === "DELIVERED") await applyDeliveredEffects(tx, orderId, o.collectedAmount);
    return o;
  });

  // Notifications
  const riderName = updated.rider?.user.name;
  if (updated.customerId) {
    const link = `/orders/${updated.id}`;
    if (to === "PREPARING") await notifyUser(updated.customerId, "Preparing your order", `${updated.code} is being filled & sealed. 💧`, link);
    if (to === "OUT_FOR_DELIVERY") {
      const msg = `Out for delivery na si Kuya ${firstName(riderName)}! Your AquaNest order ${updated.code} is on the way. 🚚`;
      await notifyUser(updated.customerId, "Out for delivery!", msg, link);
      if (updated.customer?.phone) await sendSms(updated.customer.phone, msg, { name: updated.customer.name, campaign: "STATUS" });
    }
    if (to === "DELIVERED") await notifyUser(updated.customerId, "Delivered ✅", `Salamat po! ${updated.code} has been delivered. Enjoy your clean water.`, link);
    if (to === "CANCELLED") await notifyUser(updated.customerId, "Order cancelled", `${updated.code} was cancelled. ${updated.cancelReason ?? ""}`.trim(), link);
  }
  if (to === "OUT_FOR_DELIVERY" && updated.rider) {
    await notifyUser(updated.rider.userId, "New delivery assigned", `${updated.code} — ${updated.addressText ?? ""}`, "/rider");
  }
  await Promise.all([
    broadcast(`order:${orderId}`, "status", { status: to }),
    broadcast("admin", "order:update", { id: orderId, status: to }),
    updated.riderId ? broadcast(`rider:${updated.riderId}`, "order:update", { id: orderId, status: to }) : null,
  ]);
  return updated;
}

export async function assignRider(orderId: string, riderId: string | null) {
  const order = await prisma.order.update({ where: { id: orderId }, data: { riderId }, include: orderInclude });
  if (riderId && order.rider) {
    await notifyUser(order.rider.userId, "Delivery assigned", `${order.code} — ${order.addressText ?? "Walk-in"}`, "/rider");
    await broadcast(`rider:${riderId}`, "order:update", { id: orderId });
  }
  await broadcast(`order:${orderId}`, "status", { status: order.status });
  await broadcast("admin", "order:update", { id: orderId });
  return order;
}
