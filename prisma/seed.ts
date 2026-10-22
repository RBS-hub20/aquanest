/* AquaNest seed — `npm run db:seed` (or automatically by `npm run dev` on an empty database) */
import { PrismaClient, type Address, type User, type ContainerType, type OrderType, type PaymentMethod, type Product, type ExpenseCategory } from "@prisma/client";
import { computeCart } from "../src/lib/pricing";

const prisma = new PrismaClient();
const ifEmpty = process.argv.includes("--if-empty");

const STORE = { lat: 14.5764, lng: 121.0851 };
const PRICING = { baseDeliveryFee: 0, deliveryFeePerKm: 10, freeDeliveryRadiusKm: 1, freeDeliveryThreshold: 300, loyaltyRefillsForFree: 10 };

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 1.3 * 10) / 10;
}

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
const code = (d: Date, i: number) =>
  `AQ-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${(i * 7919).toString(36).toUpperCase().padStart(4, "0").slice(-4)}`;

/** Promote the owner's real mobile number (ADMIN_PHONE) to admin so they can log in with OTP. */
async function ensureOwnerAdmin() {
  const raw = (process.env.ADMIN_PHONE || "").replace(/\D/g, "");
  if (!raw) return;
  const phone = raw.startsWith("63") ? `+${raw}` : raw.startsWith("0") ? `+63${raw.slice(1)}` : `+63${raw}`;
  if (!/^\+639\d{9}$/.test(phone)) return console.warn("   ADMIN_PHONE is not a valid PH mobile number — skipped.");
  await prisma.user.upsert({
    where: { phone },
    update: { role: "ADMIN", isActive: true },
    create: { phone, name: process.env.ADMIN_NAME || "Station Owner", role: "ADMIN", referralCode: `OWNER${raw.slice(-4)}` },
  });
  console.log(`   Owner admin ensured for ${phone}.`);
}

async function main() {
  if (ifEmpty && (await prisma.user.count()) > 0) {
    console.log("   Database already has data — skipping seed.");
    await ensureOwnerAdmin();
    return;
  }
  console.log("🌱 Seeding AquaNest…");

  // wipe (order matters for FKs)
  await prisma.$transaction([
    prisma.loyaltyPoint.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.customerGallon.deleteMany(),
    prisma.address.deleteMany(),
    prisma.rider.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.user.deleteMany(),
    prisma.product.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.gallon.deleteMany(),
    prisma.promoCode.deleteMany(),
    prisma.smsLog.deleteMany(),
    prisma.storeSettings.deleteMany(),
  ]);

  await prisma.storeSettings.create({ data: { id: 1, lat: STORE.lat, lng: STORE.lng } });

  // ── Products: size × water type ────────────────────────────────
  type P = { name: string; nameTl: string; container: ContainerType; sizeLabel: string; liters: number; waterType: "PURIFIED" | "MINERAL" | "ALKALINE"; price: number; containerPrice: number; isReturnable?: boolean; isPopular?: boolean; sortOrder: number };
  const productDefs: P[] = [
    // the 5 core products
    { name: "19L Round Refill", nameTl: "19L Round na Refill", container: "ROUND_19L", sizeLabel: "5 Gallon Round · 19L", liters: 19, waterType: "PURIFIED", price: 30, containerPrice: 180, isPopular: true, sortOrder: 1 },
    { name: "19L Slim Refill", nameTl: "19L Slim na Refill", container: "SLIM_19L", sizeLabel: "5 Gallon Slim · 19L", liters: 19, waterType: "PURIFIED", price: 35, containerPrice: 200, sortOrder: 2 },
    { name: "10L Refill", nameTl: "10L na Refill", container: "GALLON_10L", sizeLabel: "2.5 Gallon · 10L", liters: 10, waterType: "PURIFIED", price: 25, containerPrice: 120, sortOrder: 3 },
    { name: "6L Refill", nameTl: "6L na Refill", container: "GALLON_6L", sizeLabel: "1 Gallon · 6L", liters: 6, waterType: "PURIFIED", price: 20, containerPrice: 80, sortOrder: 4 },
    { name: "500ml Bottled Case (24s)", nameTl: "500ml na Bote (24 piraso)", container: "BOTTLED_CASE", sizeLabel: "Case · 24 × 500ml", liters: 12, waterType: "PURIFIED", price: 180, containerPrice: 0, isReturnable: false, sortOrder: 5 },
    // water-type variants (different price per type/size combo)
    { name: "19L Round Mineral", nameTl: "19L Round na Mineral", container: "ROUND_19L", sizeLabel: "5 Gallon Round · 19L", liters: 19, waterType: "MINERAL", price: 40, containerPrice: 180, sortOrder: 6 },
    { name: "19L Round Alkaline", nameTl: "19L Round na Alkaline", container: "ROUND_19L", sizeLabel: "5 Gallon Round · 19L", liters: 19, waterType: "ALKALINE", price: 50, containerPrice: 180, sortOrder: 7 },
    { name: "19L Slim Mineral", nameTl: "19L Slim na Mineral", container: "SLIM_19L", sizeLabel: "5 Gallon Slim · 19L", liters: 19, waterType: "MINERAL", price: 45, containerPrice: 200, sortOrder: 8 },
    { name: "19L Slim Alkaline", nameTl: "19L Slim na Alkaline", container: "SLIM_19L", sizeLabel: "5 Gallon Slim · 19L", liters: 19, waterType: "ALKALINE", price: 55, containerPrice: 200, sortOrder: 9 },
    { name: "10L Alkaline", nameTl: "10L na Alkaline", container: "GALLON_10L", sizeLabel: "2.5 Gallon · 10L", liters: 10, waterType: "ALKALINE", price: 35, containerPrice: 120, sortOrder: 10 },
  ];
  const products: Product[] = [];
  for (const p of productDefs) {
    products.push(await prisma.product.create({ data: { ...p, depositPrice: p.isReturnable === false ? 0 : 150, isReturnable: p.isReturnable ?? true, isPopular: p.isPopular ?? false } }));
  }
  const [round, slim, ten, six, caseP, roundMin, roundAlk] = products as [Product, Product, Product, Product, Product, Product, Product];

  // ── People ─────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: { phone: "+639170000001", name: "Maria Santos", email: "owner@aquanest.ph", role: "ADMIN", referralCode: "ADMIN0001" },
  });
  const riderUsers = await Promise.all([
    prisma.user.create({ data: { phone: "+639171110001", name: "Ivan Dela Cruz", role: "RIDER", referralCode: "IVAN1001", avatarUrl: "/brand/rider-ivan.svg" } }),
    prisma.user.create({ data: { phone: "+639171110002", name: "Jomar Reyes", role: "RIDER", referralCode: "JOMAR1002", avatarUrl: "/brand/rider-jomar.svg" } }),
  ]);
  const riders = await Promise.all([
    prisma.rider.create({ data: { userId: riderUsers[0].id, area: "Kapitolyo · Ortigas", vehicle: "Motorcycle w/ sidecar", plateNumber: "NCR 4521", isOnline: true, lat: 14.5741, lng: 121.0712, lastSeenAt: new Date(), rating: 4.9, photoUrl: "/brand/rider-ivan.svg" } }),
    prisma.rider.create({ data: { userId: riderUsers[1].id, area: "Rosario · Cainta", vehicle: "Tricycle", plateNumber: "NCR 7782", isOnline: false, lat: STORE.lat, lng: STORE.lng, rating: 4.8, photoUrl: "/brand/rider-jomar.svg" } }),
  ]);

  const customerDefs = [
    { phone: "+639171234501", name: "Anna Reyes", email: "anna.reyes@gmail.com", referralCode: "ANNA2024", preferredPayment: "GCASH" as PaymentMethod,
      addresses: [{ label: "Home", line1: "42 Brixton St., Apt. 7", barangay: "Kapitolyo", city: "Pasig City", province: "Metro Manila", landmark: "Near Kapitolyo Church", lat: 14.5715, lng: 121.0605, isPrimary: true }],
      gallons: [{ container: "ROUND_19L" as ContainerType, owned: 2, borrowed: 1 }], tags: ["Suki"], balance: 0, deposit: 150 },
    { phone: "+639171234502", name: "Juan Dela Cruz", email: "juan.dc@yahoo.com", referralCode: "JUAN3141", preferredPayment: "COD" as PaymentMethod,
      addresses: [{ label: "Home", line1: "Unit 1203, Pearl Tower, Garnet Rd.", barangay: "San Antonio", city: "Pasig City", province: "Metro Manila", landmark: "Ortigas Center", lat: 14.5869, lng: 121.0614, isPrimary: true }],
      gallons: [{ container: "SLIM_19L" as ContainerType, owned: 1, borrowed: 2 }, { container: "ROUND_19L" as ContainerType, owned: 1, borrowed: 0 }], tags: ["May Utang"], balance: 95, deposit: 300 },
    { phone: "+639171234503", name: "Liza Mendoza", email: "liza.mendoza@gmail.com", referralCode: "LIZA5512", preferredPayment: "COD" as PaymentMethod,
      addresses: [
        { label: "Home", line1: "18 Sampaguita St.", barangay: "Rosario", city: "Pasig City", province: "Metro Manila", landmark: "Across Rosario Elementary", lat: 14.5893, lng: 121.0904, isPrimary: true },
        { label: "Office", line1: "8th Ave. cor. 26th St.", barangay: "Fort Bonifacio", city: "Taguig City", province: "Metro Manila", landmark: "BGC High Street", lat: 14.5509, lng: 121.0503, isPrimary: false },
      ],
      gallons: [], tags: [], balance: 0, deposit: 0 },
  ];

  const customers: (User & { addresses: Address[] })[] = [];
  for (const c of customerDefs) {
    const u = await prisma.user.create({
      data: {
        phone: c.phone, name: c.name, email: c.email, referralCode: c.referralCode, preferredPayment: c.preferredPayment,
        tags: c.tags, balance: c.balance, depositBalance: c.deposit,
        addresses: { create: c.addresses.map((a) => ({ ...a, distanceKm: km(STORE, a) })) },
        gallons: { create: c.gallons },
      },
      include: { addresses: true },
    });
    customers.push(u);
  }
  // Liza was referred by Anna
  await prisma.user.update({ where: { id: customers[2]!.id }, data: { referredById: customers[0]!.id } });

  // ── Historic orders (last 45 days) ─────────────────────────────
  const now = new Date();
  const loyaltyByUser = new Map<string, number>();
  let n = 1;
  const menu: { p: Product; w: number }[] = [
    { p: round, w: 10 }, { p: slim, w: 5 }, { p: ten, w: 2 }, { p: six, w: 2 }, { p: caseP, w: 1 }, { p: roundMin, w: 2 }, { p: roundAlk, w: 2 },
  ];
  const weighted = menu.flatMap((m) => Array(m.w).fill(m.p) as Product[]);

  for (let day = 45; day >= 0; day--) {
    const perDay = day === 0 ? 4 : 2 + Math.floor(rand() * 4) + (day % 7 === 0 || day % 7 === 6 ? 2 : 0);
    for (let k = 0; k < perDay; k++) {
      let created = new Date(now.getTime() - day * 86400000);
      created.setHours(7 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
      // today's orders: spread over the last few hours so they're always in the past
      if (day === 0) created = new Date(now.getTime() - (k + 1) * 50 * 60000 - 90 * 60000);
      const isPos = rand() < 0.3;
      const customer = isPos ? null : pick(customers);
      const address = customer?.addresses[0];
      const p = pick(weighted);
      const qty = p.container === "BOTTLED_CASE" ? 1 : 1 + Math.floor(rand() * 3);
      const items = [{ product: { ...p }, orderType: "REFILL" as OrderType, quantity: qty }];
      if (rand() < 0.25) items.push({ product: { ...six }, orderType: "REFILL", quantity: 1 });
      const totals = computeCart(items, { settings: PRICING, holdings: { held: { ROUND_19L: 9, SLIM_19L: 9, GALLON_10L: 9, GALLON_6L: 9 }, borrowed: {} }, distanceKm: address?.distanceKm ?? 0, skipDelivery: isPos });
      const cancelled = !isPos && rand() < 0.05;
      const method: PaymentMethod = isPos ? pick(["CASH", "CASH", "GCASH"] as PaymentMethod[]) : pick(["COD", "COD", "GCASH", "MAYA"] as PaymentMethod[]);
      const deliveredAt = new Date(Math.min(now.getTime() - 60000, created.getTime() + (35 + rand() * 50) * 60000));
      const order = await prisma.order.create({
        data: {
          code: code(created, n++),
          customerId: customer?.id,
          walkInName: isPos ? pick(["Walk-in", "Aling Nena", "Mang Tony", "Walk-in", "Kuya Ben"]) : null,
          addressId: address?.id,
          addressText: address ? `${address.line1}, ${address.barangay}, ${address.city}` : null,
          lat: address?.lat, lng: address?.lng, distanceKm: address?.distanceKm ?? 0,
          channel: isPos ? "POS" : "ONLINE",
          status: cancelled ? "CANCELLED" : "DELIVERED",
          paymentMethod: method,
          paymentStatus: cancelled ? "UNPAID" : "PAID",
          subtotal: totals.subtotal, depositTotal: totals.depositTotal, deliveryFee: totals.deliveryFee, discount: totals.discount, total: totals.total,
          riderId: isPos ? null : pick(riders).id,
          collectedAmount: cancelled ? 0 : totals.total,
          collectedVia: cancelled ? null : method === "COD" ? "CASH" : method,
          createdAt: created, updatedAt: deliveredAt,
          preparingAt: new Date(created.getTime() + 5 * 60000),
          outForDeliveryAt: isPos ? null : new Date(created.getTime() + 20 * 60000),
          deliveredAt: cancelled ? null : isPos ? created : deliveredAt,
          cancelledAt: cancelled ? deliveredAt : null,
          cancelReason: cancelled ? "Customer not home" : null,
          items: { create: totals.lines.map((l) => ({ productId: l.productId, productName: l.productName, orderType: l.orderType, quantity: l.quantity, unitPrice: l.unitPrice, containerPrice: l.containerPrice, deposit: l.deposit, borrowQty: l.borrowQty, lineTotal: l.lineTotal })) },
        },
      });
      if (customer && !cancelled) {
        const refills = totals.lines.filter((l) => products.find((x) => x.id === l.productId)?.isReturnable).reduce((s, l) => s + l.quantity, 0);
        if (refills) {
          await prisma.loyaltyPoint.create({ data: { userId: customer.id, orderId: order.id, points: refills, type: "EARN", note: `${refills} refill(s) on ${order.code}`, createdAt: deliveredAt } });
          loyaltyByUser.set(customer.id, (loyaltyByUser.get(customer.id) ?? 0) + refills);
        }
      }
    }
  }
  // Keep loyalty balances realistic (redeemed free refills over time)
  for (const [userId, pts] of loyaltyByUser) {
    const redeemTimes = Math.floor(pts / 10) - (userId === customers[0]!.id ? 0 : 0);
    if (redeemTimes > 0) {
      const keep = userId === customers[0]!.id ? 7 : pts % 10;
      const redeem = pts - keep;
      await prisma.loyaltyPoint.create({ data: { userId, points: -redeem, type: "REDEEM", note: `${Math.round(redeem / 10)} free refill(s) redeemed`, createdAt: new Date(now.getTime() - 3 * 86400000) } });
    }
  }
  await prisma.loyaltyPoint.create({ data: { userId: customers[0]!.id, points: 2, type: "REFERRAL", note: "Referral bonus — Liza Mendoza joined", createdAt: new Date(now.getTime() - 10 * 86400000) } });

  // ── Live orders for the demo ───────────────────────────────────
  const mk = async (opts: { customer: (typeof customers)[number]; items: { p: Product; qty: number; type?: OrderType }[]; status: "PENDING" | "PREPARING" | "OUT_FOR_DELIVERY"; minsAgo: number; method: PaymentMethod; riderIdx?: number; proof?: boolean; holdings: Record<string, number>; borrowed?: Record<string, number> }) => {
    const address = opts.customer.addresses[0]!;
    const totals = computeCart(
      opts.items.map((i) => ({ product: i.p, orderType: i.type ?? "REFILL", quantity: i.qty })),
      { settings: PRICING, holdings: { held: opts.holdings, borrowed: opts.borrowed ?? {} }, distanceKm: address.distanceKm }
    );
    const created = new Date(now.getTime() - opts.minsAgo * 60000);
    return prisma.order.create({
      data: {
        code: code(created, n++), customerId: opts.customer.id, addressId: address.id,
        addressText: `${address.line1}, ${address.barangay}, ${address.city}`, lat: address.lat, lng: address.lng, distanceKm: address.distanceKm,
        status: opts.status, paymentMethod: opts.method,
        paymentStatus: opts.proof ? "FOR_VERIFICATION" : "UNPAID",
        paymentProofUrl: opts.proof ? "/brand/sample-gcash-receipt.svg" : null,
        subtotal: totals.subtotal, depositTotal: totals.depositTotal, deliveryFee: totals.deliveryFee, discount: totals.discount, total: totals.total,
        riderId: opts.riderIdx != null ? riders[opts.riderIdx]!.id : null,
        createdAt: created,
        preparingAt: opts.status !== "PENDING" ? new Date(created.getTime() + 4 * 60000) : null,
        outForDeliveryAt: opts.status === "OUT_FOR_DELIVERY" ? new Date(now.getTime() - 6 * 60000) : null,
        notes: opts.status === "OUT_FOR_DELIVERY" ? "Green gate, please call upon arrival 🙏" : null,
        items: { create: totals.lines.map((l) => ({ productId: l.productId, productName: l.productName, orderType: l.orderType, quantity: l.quantity, unitPrice: l.unitPrice, containerPrice: l.containerPrice, deposit: l.deposit, borrowQty: l.borrowQty, lineTotal: l.lineTotal })) },
      },
    });
  };
  const live = await mk({ customer: customers[0]!, items: [{ p: round, qty: 2 }], status: "OUT_FOR_DELIVERY", minsAgo: 24, method: "GCASH", riderIdx: 0, proof: true, holdings: { ROUND_19L: 3 }, borrowed: { ROUND_19L: 1 } });
  await mk({ customer: customers[1]!, items: [{ p: slim, qty: 3 }, { p: six, qty: 1, type: "NEW_GALLON" }], status: "PREPARING", minsAgo: 12, method: "COD", riderIdx: 1, holdings: { SLIM_19L: 3 } });
  await mk({ customer: customers[2]!, items: [{ p: round, qty: 2 }], status: "PENDING", minsAgo: 3, method: "COD", holdings: {} });
  await prisma.order.update({ where: { id: live.id }, data: { paymentStatus: "PAID" } });

  // ── Inventory ──────────────────────────────────────────────────
  await prisma.inventory.createMany({
    data: [
      { name: "5 Gallon Round (19L)", category: "GALLON", container: "ROUND_19L", filled: 64, empty: 28, atCustomer: 48, forCleaning: 12, damaged: 3, lowStockThreshold: 20 },
      { name: "5 Gallon Slim (19L)", category: "GALLON", container: "SLIM_19L", filled: 32, empty: 14, atCustomer: 22, forCleaning: 6, damaged: 1, lowStockThreshold: 15 },
      { name: "2.5 Gallon (10L)", category: "GALLON", container: "GALLON_10L", filled: 18, empty: 6, atCustomer: 6, forCleaning: 2, damaged: 0, lowStockThreshold: 8 },
      { name: "1 Gallon (6L)", category: "GALLON", container: "GALLON_6L", filled: 7, empty: 10, atCustomer: 4, forCleaning: 0, damaged: 1, lowStockThreshold: 8 },
      { name: "Seals & Caps", category: "SUPPLY", quantity: 850, unit: "pcs", lowStockThreshold: 200 },
      { name: "500ml Bottled Water (case)", category: "SUPPLY", quantity: 14, unit: "cases", lowStockThreshold: 20 },
      { name: "Brand Labels", category: "SUPPLY", quantity: 420, unit: "pcs", lowStockThreshold: 100 },
      { name: "Sediment Filter Cartridge", category: "SUPPLY", quantity: 3, unit: "pcs", lowStockThreshold: 4 },
    ],
  });
  const statuses = ["FILLED", "FILLED", "EMPTY", "AT_CUSTOMER", "AT_CUSTOMER", "FOR_CLEANING"] as const;
  await prisma.gallon.createMany({
    data: Array.from({ length: 18 }, (_, i) => ({
      serial: `AQN-R-${String(i + 1).padStart(4, "0")}`,
      container: (i % 3 === 2 ? "SLIM_19L" : "ROUND_19L") as ContainerType,
      status: statuses[i % statuses.length]!,
      customerId: statuses[i % statuses.length] === "AT_CUSTOMER" ? customers[i % 3]!.id : null,
    })),
  });

  // ── Expenses ───────────────────────────────────────────────────
  const exp: { category: ExpenseCategory; description: string; amount: number; date: Date }[] = [];
  for (let d = 45; d >= 0; d -= 1) {
    const date = new Date(now.getTime() - d * 86400000);
    if (d % 7 === 0) exp.push({ category: "SEAL", description: "Seals & caps (1,000 pcs)", amount: 450, date });
    if (d % 3 === 0) exp.push({ category: "FUEL", description: "Gasolina — delivery motorcycle", amount: 300 + Math.round(rand() * 120), date });
    if (d % 15 === 1) exp.push({ category: "SALARY", description: "Rider salary (kinsenas)", amount: 6500, date });
    if (d === 31 || d === 2) exp.push({ category: "ELECTRICITY", description: "Meralco bill (kuryente)", amount: 4850 + Math.round(rand() * 600), date });
    if (d === 29 || d === 3) exp.push({ category: "WATER", description: "Manila Water — raw water", amount: 2100 + Math.round(rand() * 300), date });
    if (d === 25) exp.push({ category: "RENT", description: "Station rent", amount: 12000, date });
    if (d === 18) exp.push({ category: "MAINTENANCE", description: "RO membrane + UV lamp replacement", amount: 3800, date });
  }
  await prisma.expense.createMany({ data: exp.map((e) => ({ ...e, createdById: admin.id })) });

  // ── Promos ─────────────────────────────────────────────────────
  await prisma.promoCode.createMany({
    data: [
      { code: "WELCOME20", description: "20% off your first order", type: "PERCENT", value: 20, minOrder: 60, maxUses: 500, usedCount: 37 },
      { code: "SUKI10", description: "₱10 off for our loyal suki", type: "FIXED", value: 10, minOrder: 0, usedCount: 112 },
      { code: "PASKO50", description: "₱50 off holiday bulk orders", type: "FIXED", value: 50, minOrder: 300, expiresAt: new Date(now.getFullYear(), 11, 31) },
    ],
  });

  // ── Suki Mode subscription ─────────────────────────────────────
  await prisma.subscription.create({
    data: { userId: customers[0]!.id, addressId: customers[0]!.addresses[0]!.id, days: [1, 3, 5], items: [{ productId: round.id, quantity: 2 }], timeSlot: "09:00-11:00", paymentMethod: "GCASH", lastRunDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now) },
  });

  // ── Notifications & SMS log ────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: customers[0]!.id, title: "Out for delivery!", body: `Out for delivery na si Kuya Ivan! Your AquaNest order ${live.code} is on the way. 🚚`, link: `/orders/${live.id}` },
      { userId: customers[0]!.id, title: "You're 3 refills away 🎁", body: "Collect 10 refill points to get a FREE refill.", read: true },
      { userId: admin.id, title: "Low stock: 500ml cases", body: "Only 14 cases left (threshold 20).", link: "/admin/inventory" },
    ],
  });
  await prisma.smsLog.createMany({
    data: [
      { to: customers[0]!.phone, name: customers[0]!.name, message: `Out for delivery na si Kuya Ivan! Your AquaNest order ${live.code} is on the way. 🚚`, campaign: "STATUS" },
      { to: customers[1]!.phone, name: customers[1]!.name, message: "Hi Juan! Friendly reminder: you have a ₱95.00 balance. Salamat po! — AquaNest", campaign: "UTANG REMINDER" },
    ],
  });

  await ensureOwnerAdmin();
  console.log(`✅ Seeded ${products.length} products, ${customers.length} customers, ${riders.length} riders, ${n - 1} orders.`);
  console.log("   Demo logins (OTP 123456): Admin 0917 000 0001 · Rider 0917 111 0001 · Customer 0917 123 4501");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
