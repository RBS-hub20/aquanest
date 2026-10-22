export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Demo helpers (one-tap accounts, OTP 123456) — on by default when Supabase isn't configured. */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !isSupabaseConfigured;
export const DEMO_OTP = "123456";
