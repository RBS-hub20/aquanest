export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/**
 * Demo helpers (one-tap accounts, OTP 123456). "true" forces them on, "false" forces them off
 * (production); when unset they're on only if Supabase isn't configured (local dev).
 */
const demoFlag = process.env.NEXT_PUBLIC_DEMO_MODE;
export const isDemoMode = demoFlag === "true" || (demoFlag !== "false" && !isSupabaseConfigured);
export const DEMO_OTP = "123456";
