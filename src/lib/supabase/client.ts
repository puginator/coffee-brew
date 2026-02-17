"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig, isSupabaseConfigured } from "@/lib/config";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(appConfig.supabaseUrl!, appConfig.supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}
