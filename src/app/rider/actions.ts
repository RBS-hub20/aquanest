"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertUser } from "@/lib/auth";
import { transitionOrder } from "@/lib/orders";
import { uploadImage } from "@/lib/storage";
import { broadcast } from "@/lib/realtime";

type R = { ok: true } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong" });

async function me() {
  const user = await assertUser("RIDER");
  const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
  if (!rider || !rider.isActive) throw new Error("Rider profile inactive — contact the station");
  return rider;
}

export async function setOnlineAction(isOnline: boolean): Promise<R> {
  try {
    const rider = await me();
    await prisma.rider.update({ where: { id: rider.id }, data: { isOnline, lastSeenAt: new Date() } });
    await broadcast("admin", "rider:status", { id: rider.id, isOnline });
    revalidatePath("/rider");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLocationAction(lat: number, lng: number): Promise<R> {
  try {
    const rider = await me();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("Bad coordinates");
    await prisma.rider.update({ where: { id: rider.id }, data: { lat, lng, lastSeenAt: new Date(), isOnline: true } });
    const active = await prisma.order.findMany({ where: { riderId: rider.id, status: "OUT_FOR_DELIVERY" }, select: { id: true } });
    await Promise.all(active.map((o) => broadcast(`order:${o.id}`, "location", { lat, lng })));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function startDeliveryAction(orderId: string): Promise<R> {
  try {
    const rider = await me();
    const order = await prisma.order.findFirst({ where: { id: orderId, riderId: rider.id } });
    if (!order) throw new Error("Not your delivery");
    await transitionOrder(orderId, "OUT_FOR_DELIVERY", { riderId: rider.id });
    revalidatePath("/rider");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const doneSchema = z.object({ orderId: z.string(), collectedAmount: z.number().min(0), collectedVia: z.enum(["CASH", "GCASH", "MAYA"]) });

export async function completeDeliveryAction(form: FormData): Promise<R> {
  try {
    const rider = await me();
    const p = doneSchema.parse({
      orderId: form.get("orderId"),
      collectedAmount: Number(form.get("collectedAmount") || 0),
      collectedVia: form.get("collectedVia"),
    });
    const order = await prisma.order.findFirst({ where: { id: p.orderId, riderId: rider.id } });
    if (!order) throw new Error("Not your delivery");
    let deliveryPhotoUrl: string | null = null;
    const photo = form.get("photo");
    if (photo && typeof photo !== "string" && photo.size > 0) deliveryPhotoUrl = await uploadImage(photo, "deliveries");
    const prepaid = order.paymentStatus === "PAID";
    await transitionOrder(p.orderId, "DELIVERED", {
      deliveryPhotoUrl,
      collectedAmount: prepaid ? order.total : p.collectedAmount,
      collectedVia: prepaid ? (order.paymentMethod === "COD" ? "CASH" : order.paymentMethod) : p.collectedVia,
    });
    revalidatePath("/rider");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
