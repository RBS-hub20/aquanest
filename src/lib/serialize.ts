import type { OrderWithRelations } from "@/lib/orders";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Plain JSON shape for passing orders to client components. */
export function serializeOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    channel: o.channel,
    createdAt: o.createdAt.toISOString(),
    preparingAt: iso(o.preparingAt),
    outForDeliveryAt: iso(o.outForDeliveryAt),
    deliveredAt: iso(o.deliveredAt),
    cancelledAt: iso(o.cancelledAt),
    cancelReason: o.cancelReason,
    scheduledDate: iso(o.scheduledDate),
    timeSlot: o.timeSlot,
    isAsap: o.isAsap,
    subtotal: o.subtotal,
    depositTotal: o.depositTotal,
    deliveryFee: o.deliveryFee,
    discount: o.discount,
    total: o.total,
    freeRefillsUsed: o.freeRefillsUsed,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paymentProofUrl: o.paymentProofUrl,
    collectedAmount: o.collectedAmount,
    collectedVia: o.collectedVia,
    notes: o.notes,
    lat: o.lat,
    lng: o.lng,
    distanceKm: o.distanceKm,
    addressText: o.addressText,
    deliveryPhotoUrl: o.deliveryPhotoUrl,
    walkInName: o.walkInName,
    customer: o.customer ? { id: o.customer.id, name: o.customer.name, phone: o.customer.phone, avatarUrl: o.customer.avatarUrl } : null,
    rider: o.rider
      ? {
          id: o.rider.id,
          name: o.rider.user.name,
          phone: o.rider.user.phone,
          photoUrl: o.rider.photoUrl ?? o.rider.user.avatarUrl,
          vehicle: o.rider.vehicle,
          plateNumber: o.rider.plateNumber,
          rating: o.rider.rating,
          lat: o.rider.lat,
          lng: o.rider.lng,
          lastSeenAt: iso(o.rider.lastSeenAt),
        }
      : null,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      orderType: i.orderType,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      containerPrice: i.containerPrice,
      deposit: i.deposit,
      lineTotal: i.lineTotal,
    })),
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;
