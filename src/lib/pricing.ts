/**
 * Pure cart pricing — shared by the client (live preview) and the server
 * (authoritative totals when an order is placed). Never trust client totals.
 */
import { round2 } from "./utils";

export type ContainerKey = "ROUND_19L" | "SLIM_19L" | "GALLON_10L" | "GALLON_6L" | "BOTTLED_CASE";
export type OrderTypeKey = "REFILL" | "NEW_GALLON" | "BORROW" | "RETURN";

export interface PricedProduct {
  id: string;
  name: string;
  container: ContainerKey;
  price: number;
  containerPrice: number;
  depositPrice: number;
  isReturnable: boolean;
}

export interface CartLineInput {
  product: PricedProduct;
  orderType: OrderTypeKey;
  quantity: number;
}

export interface PricingSettings {
  baseDeliveryFee: number;
  deliveryFeePerKm: number;
  freeDeliveryRadiusKm: number;
  freeDeliveryThreshold: number;
  loyaltyRefillsForFree: number;
}

export interface PromoInput {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number;
}

export interface Holdings {
  /** containers the customer already has at home, per type (owned + borrowed) */
  held: Partial<Record<ContainerKey, number>>;
  /** station containers currently on loan to the customer */
  borrowed: Partial<Record<ContainerKey, number>>;
}

export interface PricedLine {
  productId: string;
  productName: string;
  orderType: OrderTypeKey;
  quantity: number;
  unitPrice: number;
  containerPrice: number;
  deposit: number;
  borrowQty: number;
  lineTotal: number;
  note?: "AUTO_DEPOSIT" | "RETURN_LIMIT";
}

export interface CartTotals {
  lines: PricedLine[];
  subtotal: number;
  depositTotal: number;
  deliveryFee: number;
  promoDiscount: number;
  freeRefillDiscount: number;
  freeRefillsUsed: number;
  discount: number;
  total: number;
  promoError?: "MIN_ORDER";
  freeDelivery: boolean;
}

export function computeDeliveryFee(distanceKm: number, merchandise: number, s: PricingSettings) {
  if (distanceKm <= 0) return { fee: 0, free: true };
  if (merchandise >= s.freeDeliveryThreshold) return { fee: 0, free: true };
  if (distanceKm <= s.freeDeliveryRadiusKm) return { fee: 0, free: true };
  const billableKm = Math.ceil(distanceKm - s.freeDeliveryRadiusKm);
  return { fee: round2(s.baseDeliveryFee + billableKm * s.deliveryFeePerKm), free: false };
}

export function computeCart(
  input: CartLineInput[],
  opts: {
    settings: PricingSettings;
    holdings?: Holdings;
    distanceKm?: number;
    promo?: PromoInput | null;
    freeRefillsToUse?: number;
    skipDelivery?: boolean;
  }
): CartTotals {
  const held = { ...(opts.holdings?.held ?? {}) };
  const borrowed = { ...(opts.holdings?.borrowed ?? {}) };
  const lines: PricedLine[] = [];

  for (const { product: p, orderType, quantity } of input) {
    const qty = Math.max(0, Math.floor(quantity));
    if (!qty) continue;
    let unitPrice = p.price;
    let containerPrice = 0;
    let deposit = 0;
    let borrowQty = 0;
    let note: PricedLine["note"];
    const type: OrderTypeKey = p.isReturnable ? orderType : "REFILL";

    if (type === "REFILL" && p.isReturnable) {
      const have = held[p.container] ?? 0;
      const shortfall = Math.max(0, qty - have);
      held[p.container] = Math.max(0, have - qty);
      if (shortfall > 0) {
        borrowQty = shortfall;
        deposit = shortfall * p.depositPrice;
        note = "AUTO_DEPOSIT";
      }
    } else if (type === "NEW_GALLON") {
      containerPrice = p.containerPrice;
    } else if (type === "BORROW") {
      borrowQty = qty;
      deposit = qty * p.depositPrice;
    } else if (type === "RETURN") {
      const canReturn = borrowed[p.container] ?? 0;
      const returnQty = Math.min(qty, canReturn);
      borrowed[p.container] = canReturn - returnQty;
      unitPrice = 0;
      deposit = -returnQty * p.depositPrice;
      if (returnQty < qty) note = "RETURN_LIMIT";
    }

    const lineTotal = round2(qty * (unitPrice + containerPrice) + deposit);
    lines.push({
      productId: p.id,
      productName: p.name,
      orderType: type,
      quantity: qty,
      unitPrice,
      containerPrice,
      deposit: round2(deposit),
      borrowQty,
      lineTotal,
      note,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * (l.unitPrice + l.containerPrice), 0));
  const depositTotal = round2(lines.reduce((s, l) => s + l.deposit, 0));

  // Promo
  let promoDiscount = 0;
  let promoError: CartTotals["promoError"];
  if (opts.promo) {
    if (subtotal < opts.promo.minOrder) promoError = "MIN_ORDER";
    else promoDiscount = opts.promo.type === "PERCENT" ? (subtotal * opts.promo.value) / 100 : opts.promo.value;
  }

  // Loyalty free refills — discount the cheapest refillable units
  const refillUnits = lines
    .filter((l) => l.orderType !== "RETURN" && l.unitPrice > 0 && input.find((i) => i.product.id === l.productId)?.product.isReturnable)
    .flatMap((l) => Array.from({ length: l.quantity }, () => l.unitPrice))
    .sort((a, b) => a - b);
  const freeRefillsUsed = Math.min(Math.max(0, opts.freeRefillsToUse ?? 0), refillUnits.length);
  const freeRefillDiscount = refillUnits.slice(0, freeRefillsUsed).reduce((s, v) => s + v, 0);

  const merchandise = subtotal - promoDiscount - freeRefillDiscount;
  const { fee, free } = opts.skipDelivery || lines.length === 0
    ? { fee: 0, free: true }
    : computeDeliveryFee(opts.distanceKm ?? 0, merchandise, opts.settings);

  const discount = round2(Math.min(subtotal, promoDiscount + freeRefillDiscount));
  const total = round2(Math.max(0, subtotal + depositTotal + fee - discount));

  return {
    lines,
    subtotal,
    depositTotal,
    deliveryFee: fee,
    promoDiscount: round2(promoDiscount),
    freeRefillDiscount: round2(freeRefillDiscount),
    freeRefillsUsed,
    discount,
    total,
    promoError,
    freeDelivery: free,
  };
}
