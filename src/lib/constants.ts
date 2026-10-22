import type { ContainerType, OrderStatus, OrderType, PaymentMethod, WaterType, ExpenseCategory } from "@prisma/client";

export const BRAND = {
  name: "AquaNest",
  fullName: "AquaNest Water Refilling Station & Delivery",
  tagline: "Pure Water. Happy Home.",
  phone: "0917 123 4567",
  website: "www.aquanest.ph",
  colors: { ocean: "#0C6DB5", aqua: "#00B2E3", navy: "#0A2D5D", white: "#FFFFFF", mist: "#F0F8FF" },
};

export const CONTAINERS: ContainerType[] = ["ROUND_19L", "SLIM_19L", "GALLON_10L", "GALLON_6L", "BOTTLED_CASE"];
export const WATER_TYPES: WaterType[] = ["PURIFIED", "MINERAL", "ALKALINE"];
export const ORDER_TYPES: OrderType[] = ["REFILL", "NEW_GALLON", "BORROW", "RETURN"];
export const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
export const PAYMENT_METHODS: PaymentMethod[] = ["COD", "GCASH", "MAYA"];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["SEAL", "WATER", "ELECTRICITY", "FUEL", "SALARY", "MAINTENANCE", "RENT", "SUPPLIES", "OTHER"];

export const CONTAINER_LABEL: Record<ContainerType, string> = {
  ROUND_19L: "5 Gallon Round (19L)",
  SLIM_19L: "5 Gallon Slim (19L)",
  GALLON_10L: "2.5 Gallon (10L)",
  GALLON_6L: "1 Gallon (6L)",
  BOTTLED_CASE: "Bottled Case",
};

export const CONTAINER_SHORT: Record<ContainerType, string> = {
  ROUND_19L: "Round",
  SLIM_19L: "Slim",
  GALLON_10L: "10L",
  GALLON_6L: "6L",
  BOTTLED_CASE: "Case",
};

export const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  PREPARING: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  OUT_FOR_DELIVERY: { bg: "bg-ocean-50", text: "text-ocean", dot: "bg-ocean" },
  DELIVERED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  SEAL: "Seals & Caps",
  WATER: "Raw Water",
  ELECTRICITY: "Kuryente (Electricity)",
  FUEL: "Fuel / Gasolina",
  SALARY: "Salary / Sahod",
  MAINTENANCE: "Maintenance & Filters",
  RENT: "Rent / Upa",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_TL = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];
