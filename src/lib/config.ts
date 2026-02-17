export const appConfig = {
  name: "Coffee Brew Lab",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Modern key naming: publishable key for browser/client-side usage.
  // Keep legacy anon key fallback to avoid breaking older local setups.
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // Optional: server-only secret key for privileged jobs/admin operations.
  supabaseSecretKey:
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export const isSupabaseConfigured =
  Boolean(appConfig.supabaseUrl) && Boolean(appConfig.supabasePublishableKey);

export const hasSupabaseSecretKey = Boolean(appConfig.supabaseSecretKey);

export const STORAGE_KEYS = {
  recipes: "coffee-brew.custom-recipes.v1",
  shares: "coffee-brew.share-links.v1",
  userMode: "coffee-brew.user-mode.v1",
} as const;
