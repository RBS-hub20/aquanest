import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const pesoFmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const pesoFmt0 = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

/** ₱1,234.00 */
export function peso(n: number | null | undefined, opts?: { compact?: boolean }) {
  const v = Number(n ?? 0);
  if (opts?.compact) {
    if (Math.abs(v) >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 10_000) return `₱${(v / 1000).toFixed(1)}k`;
    return pesoFmt0.format(v);
  }
  return pesoFmt.format(v);
}

/** Normalise PH mobile numbers to E.164 (+639XXXXXXXXX). */
export function normalizePhone(input: string) {
  const d = (input || "").replace(/\D/g, "");
  if (d.startsWith("63") && d.length === 12) return `+${d}`;
  if (d.startsWith("0") && d.length === 11) return `+63${d.slice(1)}`;
  if (d.startsWith("9") && d.length === 10) return `+63${d}`;
  return d ? `+${d}` : "";
}

export function isValidPhPhone(input: string) {
  return /^\+639\d{9}$/.test(normalizePhone(input));
}

/** +639171234567 → 0917 123 4567 */
export function displayPhone(e164?: string | null) {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  const local = d.startsWith("63") ? `0${d.slice(2)}` : d;
  if (local.length !== 11) return e164;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function initials(name?: string | null) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

export function firstName(name?: string | null) {
  return (name || "").split(" ")[0] || "";
}

export function orderCode(date = new Date()) {
  const [y, m, d] = manilaDateKey(date).slice(2).split("-");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AQ-${y}${m}${d}-${rand}`;
}

export function referralCodeFor(name: string) {
  const base = (name.split(" ")[0] || "SUKI").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "SUKI";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Manila-local YYYY-MM-DD */
export function manilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);
}

export function startOfManilaDay(date = new Date()) {
  return new Date(`${manilaDateKey(date)}T00:00:00+08:00`);
}

export function manilaWeekday(date = new Date()) {
  const key = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(key);
}

export function manilaTimeHHMM(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
