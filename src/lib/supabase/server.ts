import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig, hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/config";

export function getServerSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createClient(appConfig.supabaseUrl!, appConfig.supabasePublishableKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// For trusted backend-only operations where RLS-bypass/admin access is required.
// Never expose this key in browser bundles.
export function getServerSupabaseAdminClient(): SupabaseClient | null {
  if (!appConfig.supabaseUrl || !hasSupabaseSecretKey) {
    return null;
  }

  return createClient(appConfig.supabaseUrl, appConfig.supabaseSecretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
